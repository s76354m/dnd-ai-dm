/**
 * Combat Manager
 * 
 * Manages combat encounters, including initiative tracking, turn management,
 * action resolution, and combat state.
 */

import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';
import { Monster, MonsterAction } from '../core/interfaces/monster';
import { EnemyManager } from './enemy-manager';
import { v4 as uuidv4 } from 'uuid';
import { equipmentModifier } from '../equipment/modifier';
import { inventoryManager } from '../character/inventory';
import { lootManager } from '../loot/loot-manager';
import { SpellEffectManager } from './spell-effects';
import { SpellcastingManager } from '../character/spellcasting-manager';
import { ItemUsageManager, ItemUseContext } from '../character/item-usage-manager';
import { TacticalAI } from './tactical-ai';
import { AIService } from '../dm/ai-service';
import { Location } from '../core/interfaces/location';
import { CombatValidator, ValidationResult } from './combat-validator';

/**
 * Combat participant type
 */
export type CombatParticipant = Character | NPC;

/**
 * Initiative entry for a combat participant
 */
export interface InitiativeEntry {
  participant: CombatParticipant;
  initiative: number;
  isPlayer: boolean;
  hasReaction: boolean;
  hasAction: boolean;
  hasBonusAction: boolean;
  hasMovement: boolean;
  conditions: string[];
  temporaryEffects: CombatEffect[];
}

/**
 * Combat effect (temporary)
 */
export interface CombatEffect {
  id: string;
  name: string;
  description: string;
  duration: number; // In rounds
  roundApplied: number;
  source: string;
  modifiers?: {
    type: string; // e.g., 'armor_class', 'attack', 'damage', 'saving_throw'
    value: number;
    ability?: string;
  }[];
  onTurnStart?: () => void;
  onTurnEnd?: () => void;
}

/**
 * Combat status
 */
export enum CombatStatus {
  Preparing = 'preparing',
  Active = 'active',
  Completed = 'completed'
}

/**
 * Combat action type
 */
export enum ActionType {
  Attack = 'attack',
  Cast = 'cast',
  Dash = 'dash',
  Disengage = 'disengage',
  Dodge = 'dodge',
  Help = 'help',
  Hide = 'hide',
  Ready = 'ready',
  Search = 'search',
  UseItem = 'use_item',
  UseFeature = 'use_feature',
  Other = 'other'
}

/**
 * Attack result
 */
export interface AttackResult {
  attacker: CombatParticipant;
  target: CombatParticipant;
  attackRoll: number;
  hitDC: number;
  isHit: boolean;
  isCritical: boolean;
  damage: number;
  damageType: string;
  effects: CombatEffect[];
}

/**
 * Combat state
 */
export interface CombatState {
  id: string;
  status: CombatStatus;
  round: number;
  initiativeOrder: InitiativeEntry[];
  currentTurnIndex: number;
  combatLog: string[];
  startTime: number;
  endTime?: number;
  location: string;
  encounterDifficulty: string;
  isPlayerInitiated: boolean;
  experienceAwarded: boolean;
}

/**
 * Combat Manager Class
 */
export class CombatManager {
  private enemyManager: EnemyManager;
  private spellEffectManager: SpellEffectManager;
  private spellcastingManager: SpellcastingManager;
  private itemUsageManager: ItemUsageManager;
  private combatState: CombatState | null = null;
  private tacticalAI: TacticalAI;
  private aiService: AIService;
  private validator: CombatValidator;
  
  constructor(
    enemyManager: EnemyManager,
    spellEffectManager: SpellEffectManager,
    spellcastingManager: SpellcastingManager,
    itemUsageManager: ItemUsageManager,
    aiService: AIService
  ) {
    this.enemyManager = enemyManager;
    this.spellEffectManager = spellEffectManager;
    this.spellcastingManager = spellcastingManager;
    this.itemUsageManager = itemUsageManager;
    this.aiService = aiService;
    this.tacticalAI = new TacticalAI(aiService, enemyManager);
    this.validator = new CombatValidator();
  }
  
  /**
   * Start a new combat encounter
   */
  public startCombat(
    players: Character[],
    enemies: NPC[],
    location: string,
    isPlayerInitiated: boolean,
    difficulty: 'easy' | 'medium' | 'hard' | 'deadly' = 'medium'
  ): CombatState {
    // Initialize combat state
    this.combatState = {
      id: uuidv4(),
      status: CombatStatus.Preparing,
      round: 0,
      initiativeOrder: [],
      currentTurnIndex: -1,
      combatLog: [`Combat started at ${location}.`],
      startTime: Date.now(),
      location,
      encounterDifficulty: difficulty,
      isPlayerInitiated,
      experienceAwarded: false
    };
    
    // Roll initiative for all participants
    const initiativeEntries: InitiativeEntry[] = [];
    
    // Add players to initiative
    for (const player of players) {
      initiativeEntries.push({
        participant: player,
        initiative: this.rollInitiative(player),
        isPlayer: true,
        hasReaction: true,
        hasAction: true,
        hasBonusAction: true,
        hasMovement: true,
        conditions: [...(player.conditions || [])],
        temporaryEffects: []
      });
    }
    
    // Add enemies to initiative
    for (const enemy of enemies) {
      initiativeEntries.push({
        participant: enemy,
        initiative: this.rollInitiative(enemy),
        isPlayer: false,
        hasReaction: true,
        hasAction: true,
        hasBonusAction: true,
        hasMovement: true,
        conditions: [],
        temporaryEffects: []
      });
    }
    
    // Sort by initiative (highest first)
    initiativeEntries.sort((a, b) => b.initiative - a.initiative);
    
    // Set initiative order
    this.combatState.initiativeOrder = initiativeEntries;
    
    // Add surprise effects if applicable
    if (isPlayerInitiated) {
      // Players ambushed the enemies
      this.combatState.combatLog.push('Players initiated combat with surprise!');
      this.combatState.initiativeOrder.forEach(entry => {
        if (!entry.isPlayer) {
          entry.conditions.push('surprised');
        }
      });
    } else {
      // Check which players were surprised
      const surprisedPlayers = players.filter(p => p.skills.perception.bonus < 10); // Simple check
      for (const player of surprisedPlayers) {
        const playerEntry = this.combatState.initiativeOrder.find(
          e => e.isPlayer && e.participant.id === player.id
        );
        if (playerEntry) {
          playerEntry.conditions.push('surprised');
        }
      }
      
      if (surprisedPlayers.length > 0) {
        this.combatState.combatLog.push(`${surprisedPlayers.map(p => p.name).join(', ')} were surprised!`);
      }
    }
    
    return this.combatState;
  }
  
  /**
   * Roll initiative for a participant
   */
  private rollInitiative(participant: CombatParticipant): number {
    const dexMod = 
      'abilityScores' in participant
        ? participant.abilityScores.dexterity.modifier
        : Math.floor((participant.stats.abilityScores.dexterity.score - 10) / 2);
    
    const initiativeMod = dexMod + 
      ('initiative' in participant ? participant.initiative : 0);
    
    // Roll d20 + initiative modifier
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + initiativeMod;
    
    return total;
  }
  
  /**
   * Start the next round of combat
   */
  public startNextRound(): CombatState | null {
    if (!this.combatState) {
      throw new Error('No active combat encounter');
    }
    
    if (this.combatState.status === CombatStatus.Completed) {
      return null;
    }
    
    // If first round, change status to active
    if (this.combatState.status === CombatStatus.Preparing) {
      this.combatState.status = CombatStatus.Active;
    }
    
    // Increment round counter
    this.combatState.round++;
    
    // Reset to first participant
    this.combatState.currentTurnIndex = 0;
    
    // Reset actions for all participants
    this.combatState.initiativeOrder.forEach(entry => {
      entry.hasAction = true;
      entry.hasBonusAction = true;
      entry.hasMovement = true;
      entry.hasReaction = true;
      
      // Process effects that trigger at the start of a round
      entry.temporaryEffects.forEach(effect => {
        if (effect.onTurnStart) {
          effect.onTurnStart();
        }
      });
      
      // Remove 'surprised' condition after first round
      if (this.combatState!.round > 1) {
        entry.conditions = entry.conditions.filter(c => c !== 'surprised');
      }
    });
    
    // Log round start
    this.combatState.combatLog.push(`Round ${this.combatState.round} started.`);
    
    return this.combatState;
  }
  
  /**
   * Get the current combat state
   */
  public getCombatState(): CombatState | null {
    return this.combatState;
  }
  
  /**
   * Get the current participant whose turn it is
   */
  public getCurrentParticipant(): InitiativeEntry | null {
    if (!this.combatState || this.combatState.currentTurnIndex < 0) {
      return null;
    }
    
    return this.combatState.initiativeOrder[this.combatState.currentTurnIndex];
  }
  
  /**
   * End the current participant's turn and move to the next
   */
  public endTurn(): InitiativeEntry | null {
    if (!this.combatState || this.combatState.status !== CombatStatus.Active) {
      return null;
    }
    
    const currentEntry = this.getCurrentParticipant();
    if (!currentEntry) {
      return null;
    }
    
    // Process effects that trigger at end of turn
    currentEntry.temporaryEffects.forEach(effect => {
      if (effect.onTurnEnd) {
        effect.onTurnEnd();
      }
    });
    
    // Decrement duration of temporary effects and remove expired ones
    currentEntry.temporaryEffects = currentEntry.temporaryEffects.filter(effect => {
      const remaining = effect.duration - (this.combatState!.round - effect.roundApplied);
      return remaining > 0;
    });
    
    // Move to next turn
    this.combatState.currentTurnIndex++;
    
    // If we've gone through all participants, start a new round
    if (this.combatState.currentTurnIndex >= this.combatState.initiativeOrder.length) {
      this.startNextRound();
    }
    
    const nextParticipant = this.getCurrentParticipant();
    
    if (nextParticipant) {
      this.combatState.combatLog.push(`${nextParticipant.participant.name}'s turn started.`);
    }
    
    return nextParticipant;
  }
  
  /**
   * Perform an attack action
   */
  public performAttack(
    attackerId: string,
    targetId: string,
    attackName?: string
  ): AttackResult | null {
    // Validate combat is active
    const combatValidation = this.validator.validateActiveCombat(this.combatState);
    if (!combatValidation.isValid) {
      console.error(`Attack failed: ${combatValidation.errorMessage}`);
      return null;
    }
    
    // Validate attacker exists and it's their turn
    const attackerTurnValidation = this.validator.validateParticipantTurn(
      attackerId, 
      this.combatState!
    );
    
    if (!attackerTurnValidation.isValid) {
      console.error(`Attack failed: ${attackerTurnValidation.errorMessage}`);
      return null;
    }
    
    const attackerEntry = attackerTurnValidation.entity as InitiativeEntry;
    
    // Validate target exists and can be targeted
    const targetValidation = this.validator.validateTarget(
      targetId,
      this.combatState!
    );
    
    if (!targetValidation.isValid) {
      console.error(`Attack failed: ${targetValidation.errorMessage}`);
      return null;
    }
    
    const targetEntry = targetValidation.entity as InitiativeEntry;
    
    // Validate the specific attack
    const attackValidation = this.validator.validateAttack(
      attackerEntry,
      targetEntry,
      attackName
    );
    
    if (!attackValidation.isValid) {
      console.error(`Attack failed: ${attackValidation.errorMessage}`);
      return null;
    }
    
    // From here, proceed with the actual attack logic
    const attacker = attackerEntry.participant;
    const target = targetEntry.participant;
    
    let attackBonus = 0;
    let damageFormula = '1d4';
    let damageType = 'bludgeoning';
    let effects: CombatEffect[] = [];
    
    // If attacker is Player
    if (attackerEntry.isPlayer) {
      const player = attacker as Character;
      let weapon = player.equipment?.find(item => 
        item.isEquipped && item.properties.includes('weapon')
      );
      
      if (!weapon && attackName) {
        // Try to find specific weapon by name
        weapon = player.equipment?.find(item => 
          item.isEquipped && item.properties.includes('weapon') && 
          item.name.toLowerCase().includes(attackName.toLowerCase())
        );
      }
      
      if (weapon) {
        // For simplicity, we'll use fixed damage values
        if (weapon.properties.includes('heavy') || weapon.properties.includes('two-handed')) {
          damageFormula = '2d6'; // Greatsword, greataxe
        } else if (weapon.properties.includes('versatile')) {
          damageFormula = '1d10'; // Longsword two-handed
        } else if (weapon.properties.includes('light')) {
          damageFormula = '1d6'; // Shortsword, dagger
        } else {
          damageFormula = '1d8'; // Longsword, warhammer
        }
        
        // Determine damage type
        if (weapon.properties.includes('slashing')) {
          damageType = 'slashing';
        } else if (weapon.properties.includes('piercing')) {
          damageType = 'piercing';
        }
        
        // Calculate attack bonus (ability mod + proficiency + weapon bonus)
        const strMod = player.abilityScores.strength.modifier;
        const dexMod = player.abilityScores.dexterity.modifier;
        
        // Use DEX or STR based on weapon properties
        const abilityMod = weapon.properties.includes('finesse') 
          ? Math.max(strMod, dexMod) 
          : strMod;
        
        attackBonus = abilityMod + player.proficiencyBonus;
        
        // Add weapon bonus if any
        if (weapon.bonus?.attack) {
          attackBonus += weapon.bonus.attack;
        }
        
        // Apply damage to weapon
        if (weapon.durability) {
          // Small chance of weapon damage on hit
          if (Math.random() < 0.05) {
            const updatedWeapon = equipmentModifier.damageItem(weapon, 1);
            const weaponIndex = player.equipment?.findIndex(i => i.id === weapon!.id) || -1;
            
            if (weaponIndex >= 0 && player.equipment) {
              player.equipment[weaponIndex] = updatedWeapon;
            }
          }
        }
      } else {
        // Unarmed strike
        damageFormula = '1d1'; // 1 damage
        attackBonus = player.abilityScores.strength.modifier + player.proficiencyBonus;
      }
    } 
    // If attacker is NPC/monster
    else {
      const npc = attacker as NPC;
      
      // Get monster data to find attack stats
      const monsterType = npc.id.split('-')[1]; // Assumes ID format "enemy-{type}-{uuid}"
      const monsterActions = this.enemyManager.getMonsterActions(npc.id);
      
      let selectedAction: MonsterAction | undefined;
      
      if (attackName && monsterActions) {
        // Find specific attack by name
        selectedAction = monsterActions.find(
          action => action.name.toLowerCase() === attackName.toLowerCase()
        );
      }
      
      // Default to first attack if none specified or found
      if (!selectedAction && monsterActions && monsterActions.length > 0) {
        // Prefer melee attacks when adjacent
        selectedAction = monsterActions.find(action => action.type === 'melee') || 
                        monsterActions[0];
      }
      
      if (selectedAction) {
        attackBonus = selectedAction.toHit || 0;
        
        if (selectedAction.damage) {
          damageFormula = selectedAction.damage.dice;
          damageType = selectedAction.damage.type;
        }
        
        // Add any additional effects
        if (selectedAction.additionalEffects) {
          selectedAction.additionalEffects.forEach(effect => {
            if (effect.type === 'saving throw') {
              effects.push({
                id: uuidv4(),
                name: effect.effect,
                description: `DC ${effect.dc} ${effect.ability} save or ${effect.effect}`,
                duration: effect.duration || 1,
                roundApplied: this.combatState!.round,
                source: npc.id
              });
            }
          });
        }
      } else {
        // Generic attack if no actions found
        attackBonus = Math.floor((npc.stats.abilityScores.strength.score - 10) / 2) + 2;
      }
    }
    
    // Roll attack (d20 + attack bonus)
    const attackRoll = Math.floor(Math.random() * 20) + 1;
    const totalAttackRoll = attackRoll + attackBonus;
    
    // Determine target's AC
    const targetAC = 'armorClass' in target 
      ? target.armorClass 
      : target.stats.armorClass;
    
    // Check if hit
    const isHit = attackRoll === 20 || totalAttackRoll >= targetAC;
    const isCritical = attackRoll === 20;
    
    // Calculate damage if hit
    let damage = 0;
    if (isHit) {
      // Parse damage formula
      const [diceCount, diceSides] = damageFormula.split('d').map(Number);
      
      // Roll damage
      let damageRoll = 0;
      for (let i = 0; i < diceCount; i++) {
        damageRoll += Math.floor(Math.random() * diceSides) + 1;
      }
      
      // Add modifiers
      if (attackerEntry.isPlayer) {
        const player = attacker as Character;
        const weapon = player.equipment?.find(item => 
          item.isEquipped && item.properties.includes('weapon')
        );
        
        // Add ability modifier to damage
        const strMod = player.abilityScores.strength.modifier;
        const dexMod = player.abilityScores.dexterity.modifier;
        
        const abilityMod = weapon?.properties.includes('finesse') 
          ? Math.max(strMod, dexMod) 
          : strMod;
        
        damageRoll += abilityMod;
        
        // Add weapon damage bonus if any
        if (weapon?.bonus?.damage) {
          damageRoll += weapon.bonus.damage;
        }
      } else {
        // For monsters, damage bonus is already in the formula
        const npc = attacker as NPC;
        const monsterActions = this.enemyManager.getMonsterActions(npc.id);
        const selectedAction = monsterActions?.find(
          action => action.name.toLowerCase() === (attackName?.toLowerCase() || '')
        ) || monsterActions?.[0];
        
        if (selectedAction?.damage?.bonus) {
          damageRoll += selectedAction.damage.bonus;
        }
      }
      
      // Double damage on critical hit
      if (isCritical) {
        damageRoll *= 2;
      }
      
      damage = damageRoll;
    }
    
    // Apply damage to target
    if (isHit && damage > 0) {
      if (targetEntry.isPlayer) {
        const player = target as Character;
        player.hitPoints.current = Math.max(0, player.hitPoints.current - damage);
        
        // Check if player was knocked unconscious
        if (player.hitPoints.current === 0) {
          targetEntry.conditions.push('unconscious');
          this.combatState.combatLog.push(`${player.name} was knocked unconscious!`);
        }
      } else {
        const npc = target as NPC;
        if (!npc.stats.hitPoints) {
          npc.stats.hitPoints = { 
            current: npc.stats.hitPoints?.maximum || 10, 
            maximum: npc.stats.hitPoints?.maximum || 10 
          };
        }
        
        npc.stats.hitPoints.current = Math.max(0, npc.stats.hitPoints.current - damage);
        
        // Check if NPC was defeated
        if (npc.stats.hitPoints.current === 0) {
          targetEntry.conditions.push('defeated');
          this.combatState.combatLog.push(`${npc.name} was defeated!`);
          
          // Check if all enemies are defeated
          const allEnemiesDefeated = this.combatState.initiativeOrder
            .filter(e => !e.isPlayer)
            .every(e => e.conditions.includes('defeated'));
          
          if (allEnemiesDefeated) {
            this.endCombat(true);
          }
        }
      }
    }
    
    // Mark action as used
    attackerEntry.hasAction = false;
    
    // Create attack result
    const result: AttackResult = {
      attacker,
      target,
      attackRoll: totalAttackRoll,
      hitDC: targetAC,
      isHit,
      isCritical,
      damage,
      damageType,
      effects
    };
    
    // Apply any additional effects if hit
    if (isHit && effects.length > 0) {
      targetEntry.temporaryEffects.push(...effects);
    }
    
    // Log the attack
    this.combatState.combatLog.push(
      `${attacker.name} ${attackName ? `used ${attackName} to` : ''} attack${isHit ? 'ed' : ' missed'} ${target.name}${isHit ? ` for ${damage} ${damageType} damage` : ''}.${isCritical ? ' Critical hit!' : ''}`
    );
    
    return result;
  }
  
  /**
   * Use an item in combat
   * @param userId ID of the character using the item
   * @param itemId ID of the item to use
   * @param targetId Optional target of the item effect
   */
  public useItem(
    userId: string,
    itemId: string,
    targetId?: string
  ): boolean {
    // Validate combat is active
    const combatValidation = this.validator.validateActiveCombat(this.combatState);
    if (!combatValidation.isValid) {
      console.error(`Item use failed: ${combatValidation.errorMessage}`);
      return false;
    }
    
    // Validate user exists and it's their turn
    const userTurnValidation = this.validator.validateParticipantTurn(
      userId, 
      this.combatState!
    );
    
    if (!userTurnValidation.isValid) {
      console.error(`Item use failed: ${userTurnValidation.errorMessage}`);
      return false;
    }
    
    const userEntry = userTurnValidation.entity as InitiativeEntry;
    
    // Validate the item and target (if provided)
    const itemValidation = this.validator.validateItem(
      userEntry,
      itemId,
      targetId,
      this.combatState!
    );
    
    if (!itemValidation.isValid) {
      console.error(`Item use failed: ${itemValidation.errorMessage}`);
      return false;
    }
    
    const item = itemValidation.entity;
    
    // Use the item via ItemUsageManager
    const result = this.itemUsageManager.useItem(
      userId,
      itemId,
      targetId,
      ItemUseContext.Combat
    );
    
    if (!result.success) {
      console.error(`Item usage failed: ${result.message}`);
      return false;
    }
    
    // Apply combat effects if any
    if (result.effectCreated) {
      // Find the target participant
      const targetParticipantIndex = this.combatState.initiativeOrder.findIndex(
        entry => entry.participant.id === (targetId || userId)
      );
      
      if (targetParticipantIndex >= 0) {
        // Add the effect to the target
        const targetParticipant = this.combatState.initiativeOrder[targetParticipantIndex];
        targetParticipant.temporaryEffects.push({
          ...result.effectCreated,
          description: result.effectCreated.description || `Effect from ${result.effectCreated.name}`,
          source: result.effectCreated.source || 'item_usage',
          roundApplied: this.combatState.round
        });
      }
    }
    
    // Apply healing if any
    if (result.healingDone && result.healingDone > 0) {
      const targetParticipantIndex = this.combatState.initiativeOrder.findIndex(
        entry => entry.participant.id === (targetId || userId)
      );
      
      if (targetParticipantIndex >= 0) {
        const targetParticipant = this.combatState.initiativeOrder[targetParticipantIndex];
        
        if ('hitPoints' in targetParticipant.participant) {
          // Character type
          const character = targetParticipant.participant as Character;
          character.hitPoints.current = Math.min(
            character.hitPoints.current + result.healingDone,
            character.hitPoints.maximum
          );
        } else if (targetParticipant.participant.stats?.hitPoints) {
          // NPC type
          const npc = targetParticipant.participant as NPC;
          npc.stats.hitPoints.current = Math.min(
            npc.stats.hitPoints.current + result.healingDone,
            npc.stats.hitPoints.maximum
          );
        }
      }
    }
    
    // Apply damage if any
    if (result.damageDone && result.damageDone > 0 && targetId) {
      const targetParticipantIndex = this.combatState.initiativeOrder.findIndex(
        entry => entry.participant.id === targetId
      );
      
      if (targetParticipantIndex >= 0) {
        const targetParticipant = this.combatState.initiativeOrder[targetParticipantIndex];
        
        if ('hitPoints' in targetParticipant.participant) {
          // Character type
          const character = targetParticipant.participant as Character;
          character.hitPoints.current = Math.max(
            character.hitPoints.current - result.damageDone,
            0
          );

          // Check if character is unconscious
          if (character.hitPoints.current === 0) {
            targetParticipant.conditions.push('unconscious');
          }
        } else if (targetParticipant.participant.stats?.hitPoints) {
          // NPC type
          const npc = targetParticipant.participant as NPC;
          npc.stats.hitPoints.current = Math.max(
            npc.stats.hitPoints.current - result.damageDone,
            0
          );

          // Check if NPC is defeated
          if (npc.stats.hitPoints.current === 0) {
            targetParticipant.conditions.push('defeated');
          }
        }
      }
    }
    
    // Mark action as used
    userEntry.hasAction = false;
    
    // Add to combat log
    this.combatState.combatLog.push(`${userEntry.participant.name} ${result.message}`);
    
    return true;
  }
  
  /**
   * Cast a spell in combat
   * @param casterId ID of the spellcaster
   * @param spellName Name of the spell
   * @param level Level at which to cast the spell
   * @param targetIds IDs of the targets
   */
  public castSpell(
    casterId: string,
    spellName: string,
    level: number,
    targetIds: string[]
  ): boolean {
    // Validate combat is active
    const combatValidation = this.validator.validateActiveCombat(this.combatState);
    if (!combatValidation.isValid) {
      console.error(`Spell casting failed: ${combatValidation.errorMessage}`);
      return false;
    }
    
    // Validate caster exists and it's their turn
    const casterTurnValidation = this.validator.validateParticipantTurn(
      casterId, 
      this.combatState!
    );
    
    if (!casterTurnValidation.isValid) {
      console.error(`Spell casting failed: ${casterTurnValidation.errorMessage}`);
      return false;
    }
    
    const casterEntry = casterTurnValidation.entity as InitiativeEntry;
    
    // Validate the spell and its targets
    const spellValidation = this.validator.validateSpell(
      casterEntry,
      spellName,
      level,
      targetIds,
      this.combatState!
    );
    
    if (!spellValidation.isValid) {
      console.error(`Spell casting failed: ${spellValidation.errorMessage}`);
      return false;
    }
    
    // Find target participants
    const targets: string[] = [];
    
    for (const targetId of targetIds) {
      const targetParticipantIndex = this.combatState.initiativeOrder.findIndex(
        entry => entry.participant.id === targetId
      );
      
      if (targetParticipantIndex >= 0) {
        targets.push(targetId);
      }
    }
    
    // Cast the spell via SpellcastingManager
    const castResult = this.spellcastingManager.castSpell(
      casterId,
      spellName,
      level,
      targets
    );
    
    if (!castResult.success) {
      console.error(`Spell casting failed: ${castResult.message}`);
      return false;
    }
    
    // Apply spell effects if successful
    if (castResult.result) {
      // Process any effects from the spell
      const spellResult = castResult.result;
      
      // Add to combat log
      this.combatState.combatLog.push(`${casterEntry.participant.name} ${castResult.message}`);
      
      // Mark action as used
      casterEntry.hasAction = false;
      
      return true;
    }
    
    return false;
  }
  
  /**
   * End the combat encounter
   */
  public endCombat(playersWon: boolean): CombatState | null {
    if (!this.combatState) {
      return null;
    }
    
    this.combatState.status = CombatStatus.Completed;
    this.combatState.endTime = Date.now();
    
    // Log end of combat
    this.combatState.combatLog.push(
      `Combat ended. ${playersWon ? 'Players were victorious!' : 'Players were defeated!'}`
    );
    
    // Award XP if players won and haven't been awarded already
    if (playersWon && !this.combatState.experienceAwarded) {
      const defeatedEnemies = this.combatState.initiativeOrder
        .filter(entry => !entry.isPlayer && entry.conditions.includes('defeated'))
        .map(entry => entry.participant as NPC);
      
      const players = this.combatState.initiativeOrder
        .filter(entry => entry.isPlayer)
        .map(entry => entry.participant as Character);
      
      if (defeatedEnemies.length > 0 && players.length > 0) {
        // Calculate total XP
        let totalXP = 0;
        
        for (const enemy of defeatedEnemies) {
          // Get monster CR from the original data
          const monsterType = enemy.id.split('-')[1];
          // Calculate XP based on some formula
          const enemyXP = (enemy.stats.level || 1) * 100; // Simplified
          totalXP += enemyXP;
        }
        
        // Divide XP among players
        const xpPerPlayer = Math.floor(totalXP / players.length);
        
        // Award XP to each player
        for (const player of players) {
          player.experiencePoints += xpPerPlayer;
        }
        
        this.combatState.combatLog.push(
          `Experience awarded: ${xpPerPlayer} XP per player.`
        );
        
        this.combatState.experienceAwarded = true;
      }
      
      // Generate loot if players won
      if (playersWon) {
        // Find any boss enemies
        const bossEnemies = defeatedEnemies.filter(enemy => 
          enemy.stats.level >= 3 || enemy.name.toLowerCase().includes('boss')
        );
        
        // For each enemy, roll for loot
        for (const enemy of defeatedEnemies) {
          const isBoss = bossEnemies.includes(enemy);
          const averagePlayerLevel = Math.floor(
            players.reduce((sum, p) => sum + p.level, 0) / players.length
          );
          
          // Generate loot for this enemy
          const loot = lootManager.generateCombatLoot(
            enemy, 
            averagePlayerLevel, 
            this.combatState.location,
            isBoss
          );
          
          // Log loot
          if (loot.length > 0) {
            this.combatState.combatLog.push(
              `${enemy.name} dropped: ${loot.map(item => item.name).join(', ')}.`
            );
          }
        }
      }
    }
    
    return this.combatState;
  }
  
  /**
   * Get available actions for the current participant
   */
  public getAvailableActions(): ActionType[] {
    const currentEntry = this.getCurrentParticipant();
    if (!currentEntry) {
      return [];
    }
    
    const actions: ActionType[] = [];
    
    // Add basic actions if the participant has an action available
    if (currentEntry.hasAction) {
      actions.push(ActionType.Attack);
      actions.push(ActionType.Dash);
      actions.push(ActionType.Disengage);
      actions.push(ActionType.Dodge);
      actions.push(ActionType.Help);
      actions.push(ActionType.Hide);
      actions.push(ActionType.Ready);
      actions.push(ActionType.Search);
      actions.push(ActionType.UseItem);
      
      // Add spell casting if applicable
      if (currentEntry.isPlayer) {
        const player = currentEntry.participant as Character;
        if (player.spells && player.spells.length > 0) {
          actions.push(ActionType.Cast);
        }
      } else {
        // Check if monster has spell actions
        const npc = currentEntry.participant as NPC;
        const monsterActions = this.enemyManager.getMonsterActions(npc.id);
        
        if (monsterActions?.some(action => action.type === 'spell')) {
          actions.push(ActionType.Cast);
        }
      }
      
      // Add class features if applicable
      if (currentEntry.isPlayer) {
        actions.push(ActionType.UseFeature);
      }
    }
    
    return actions;
  }
  
  /**
   * Move a participant
   */
  public moveParticipant(
    participantId: string,
    distance: number
  ): boolean {
    // Validate combat is active
    const combatValidation = this.validator.validateActiveCombat(this.combatState);
    if (!combatValidation.isValid) {
      console.error(`Movement failed: ${combatValidation.errorMessage}`);
      return false;
    }
    
    // Validate participant exists and it's their turn
    const participantTurnValidation = this.validator.validateParticipantTurn(
      participantId, 
      this.combatState!
    );
    
    if (!participantTurnValidation.isValid) {
      console.error(`Movement failed: ${participantTurnValidation.errorMessage}`);
      return false;
    }
    
    const participantEntry = participantTurnValidation.entity as InitiativeEntry;
    
    // Validate the movement
    const movementValidation = this.validator.validateMovement(
      participantEntry,
      distance
    );
    
    if (!movementValidation.isValid) {
      console.error(`Movement failed: ${movementValidation.errorMessage}`);
      return false;
    }
    
    // Get participant's speed
    const speed = 'speed' in participantEntry.participant
      ? participantEntry.participant.speed
      : participantEntry.participant.stats.speed || 30; // Default to 30 if not defined
    
    // Check if they have enough movement
    if (distance > speed) {
      return false;
    }
    
    // Mark movement as used
    participantEntry.hasMovement = false;
    
    this.combatState.combatLog.push(
      `${participantEntry.participant.name} moved ${distance} feet.`
    );
    
    return true;
  }
  
  /**
   * Add a temporary effect to a participant
   */
  public addEffect(
    targetId: string,
    effect: CombatEffect
  ): boolean {
    if (!this.combatState) {
      return false;
    }
    
    // Find target
    const targetEntry = this.combatState.initiativeOrder.find(
      entry => entry.participant.id === targetId
    );
    
    if (!targetEntry) {
      return false;
    }
    
    // Add effect
    targetEntry.temporaryEffects.push({
      ...effect,
      roundApplied: this.combatState.round
    });
    
    this.combatState.combatLog.push(
      `${targetEntry.participant.name} is affected by ${effect.name}.`
    );
    
    return true;
  }
  
  /**
   * Remove an effect from a participant
   */
  public removeEffect(
    targetId: string,
    effectId: string
  ): boolean {
    if (!this.combatState) {
      return false;
    }
    
    // Find target
    const targetEntry = this.combatState.initiativeOrder.find(
      entry => entry.participant.id === targetId
    );
    
    if (!targetEntry) {
      return false;
    }
    
    // Find and remove effect
    const effectIndex = targetEntry.temporaryEffects.findIndex(
      effect => effect.id === effectId
    );
    
    if (effectIndex === -1) {
      return false;
    }
    
    const effect = targetEntry.temporaryEffects[effectIndex];
    targetEntry.temporaryEffects.splice(effectIndex, 1);
    
    this.combatState.combatLog.push(
      `${effect.name} effect ended for ${targetEntry.participant.name}.`
    );
    
    return true;
  }
  
  /**
   * Check if combat is over
   */
  public isCombatOver(): boolean {
    if (!this.combatState) {
      return true;
    }
    
    if (this.combatState.status === CombatStatus.Completed) {
      return true;
    }
    
    // Check if all players are defeated
    const allPlayersDefeated = this.combatState.initiativeOrder
      .filter(entry => entry.isPlayer)
      .every(entry => {
        const player = entry.participant as Character;
        return player.hitPoints.current <= 0;
      });
    
    if (allPlayersDefeated) {
      this.endCombat(false);
      return true;
    }
    
    // Check if all enemies are defeated
    const allEnemiesDefeated = this.combatState.initiativeOrder
      .filter(entry => !entry.isPlayer)
      .every(entry => entry.conditions.includes('defeated'));
    
    if (allEnemiesDefeated) {
      this.endCombat(true);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get combat log
   */
  public getCombatLog(): string[] {
    if (!this.combatState) {
      return [];
    }
    
    return [...this.combatState.combatLog];
  }
  
  /**
   * Process NPC turn with AI-driven decision making
   */
  public async processNPCTurn(
    npcId: string,
    location: Location
  ): Promise<boolean> {
    // Validate combat is active
    const combatValidation = this.validator.validateActiveCombat(this.combatState);
    if (!combatValidation.isValid) {
      console.error(`NPC turn processing failed: ${combatValidation.errorMessage}`);
      return false;
    }
    
    // Validate it's the NPC's turn
    const npcTurnValidation = this.validator.validateParticipantTurn(
      npcId, 
      this.combatState!
    );
    
    if (!npcTurnValidation.isValid) {
      console.error(`NPC turn processing failed: ${npcTurnValidation.errorMessage}`);
      return false;
    }
    
    const npcEntry = npcTurnValidation.entity as InitiativeEntry;
    const npc = npcEntry.participant as NPC;
    
    // Skip turn if defeated or unconscious
    if (npcEntry.conditions.includes('defeated') || 
        npcEntry.conditions.includes('unconscious')) {
      this.combatState.combatLog.push(`${npc.name} is unable to act.`);
      this.endTurn();
      return true;
    }
    
    try {
      // Get AI-driven tactical decision
      const decision = await this.tacticalAI.decideTacticalAction(
        npcId,
        this.combatState!,
        location
      );
      
      // Log the NPC's intention (can be seen by players with high perception/insight)
      console.debug(`${npc.name}'s tactical decision: ${decision.actionName} - ${decision.reasoning}`);
      
      // Execute the decision based on action type
      let actionSuccess = false;
      
      // Process the decision with validation
      switch (decision.actionType) {
        case 'melee':
        case 'ranged':
          // Attack action with validation
          if (decision.targetId) {
            // Validate target before attempting attack
            const targetValidation = this.validator.validateTarget(
              decision.targetId,
              this.combatState!
            );
            
            if (targetValidation.isValid) {
              actionSuccess = this.performAttack(npcId, decision.targetId, decision.actionName) !== null;
            } else if (decision.fallbackTarget) {
              // Try fallback target if primary target is invalid
              const fallbackValidation = this.validator.validateTarget(
                decision.fallbackTarget,
                this.combatState!
              );
              
              if (fallbackValidation.isValid) {
                actionSuccess = this.performAttack(npcId, decision.fallbackTarget, decision.actionName) !== null;
              }
            }
          }
          break;
          
        case 'spell':
          // Spell casting
          if (decision.targetId) {
            // Implementation would involve the spell system
            this.combatState.combatLog.push(
              `${npc.name} attempts to cast ${decision.actionName}.`
            );
            actionSuccess = true; // Simplified for now
          }
          break;
          
        case 'item':
          // Item usage
          if (decision.targetId) {
            // Implementation would involve the item system
            this.combatState.combatLog.push(
              `${npc.name} uses ${decision.actionName}.`
            );
            actionSuccess = true; // Simplified for now
          }
          break;
          
        case 'movement':
          // Movement action
          switch (decision.movementIntention) {
            case 'approach':
              this.combatState.combatLog.push(
                `${npc.name} moves to engage.`
              );
              break;
            case 'retreat':
              this.combatState.combatLog.push(
                `${npc.name} retreats to a safer position.`
              );
              break;
            case 'flank':
              this.combatState.combatLog.push(
                `${npc.name} maneuvers to gain a tactical advantage.`
              );
              break;
            case 'hold':
              this.combatState.combatLog.push(
                `${npc.name} holds position.`
              );
              break;
          }
          actionSuccess = true;
          break;
          
        case 'special':
          // Special ability
          this.combatState.combatLog.push(
            `${npc.name} uses ${decision.actionName}.`
          );
          actionSuccess = true; // Simplified for now
          break;
          
        default:
          // Default to a simple attack if action type is unknown
          if (decision.targetId) {
            actionSuccess = this.performAttack(npcId, decision.targetId) !== null;
          } else {
            this.combatState.combatLog.push(
              `${npc.name} stands ready.`
            );
            actionSuccess = true;
          }
      }
      
      // If all actions failed, use the fallback action with validation
      if (!actionSuccess && decision.fallbackAction) {
        this.combatState.combatLog.push(
          `${npc.name} changes tactics.`
        );
        
        if (decision.fallbackAction === 'Retreat') {
          this.combatState.combatLog.push(
            `${npc.name} retreats to a safer position.`
          );
          actionSuccess = true;
        } else {
          // Default attack
          const validTargets = this.combatState.initiativeOrder
            .filter(entry => entry.isPlayer && !entry.conditions.includes('defeated'))
            .map(entry => entry.participant.id);
          
          if (validTargets.length > 0) {
            const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
            // Validate the random target before attacking
            const targetValidation = this.validator.validateTarget(
              randomTarget,
              this.combatState!
            );
            
            if (targetValidation.isValid) {
              actionSuccess = this.performAttack(npcId, randomTarget) !== null;
            }
          } else {
            this.combatState.combatLog.push(`${npc.name} has no valid targets.`);
            actionSuccess = true;
          }
        }
      }
      
      // End the NPC's turn
      this.endTurn();
      return true;
      
    } catch (error) {
      console.error('Error processing NPC turn:', error);
      
      try {
        // Fallback to basic attack behavior on error with validation
        const validTargets = this.combatState.initiativeOrder
          .filter(entry => 
            entry.isPlayer && 
            !entry.conditions.includes('defeated') &&
            !entry.conditions.includes('dead')
          )
          .map(entry => entry.participant.id);
        
        if (validTargets.length > 0) {
          const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
          
          // Validate the random target before attacking
          const targetValidation = this.validator.validateTarget(
            randomTarget,
            this.combatState!
          );
          
          if (targetValidation.isValid) {
            this.performAttack(npcId, randomTarget);
          } else {
            this.combatState.combatLog.push(`${npc.name} has no valid targets.`);
          }
        } else {
          this.combatState.combatLog.push(`${npc.name} has no valid targets.`);
        }
      } catch (fallbackError) {
        console.error('Critical error in NPC turn fallback:', fallbackError);
        this.combatState.combatLog.push(`${npc.name} hesitates and does nothing.`);
      }
      
      // End the turn even if there was an error
      this.endTurn();
      return true;
    }
  }
}

// Export singletons
export const createCombatManager = (
  enemyManager: EnemyManager, 
  spellEffectManager: SpellEffectManager,
  spellcastingManager: SpellcastingManager,
  itemUsageManager: ItemUsageManager,
  aiService: AIService
) => new CombatManager(
  enemyManager, 
  spellEffectManager,
  spellcastingManager,
  itemUsageManager,
  aiService
); 