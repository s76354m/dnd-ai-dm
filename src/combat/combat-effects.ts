/**
 * Combat Effects System
 * 
 * This module integrates status effects with the combat system,
 * handling the application of effects during combat and their impact
 * on combat mechanics like initiative.
 */

import { v4 as uuidv4 } from 'uuid';
import { StatusEffectManager, StatusEffect } from '../magic/status-effects';
import { ConditionType } from '../magic/spell';
import {
  ReactionManager,
  ReactionTriggerType,
  createSpellCastTrigger,
  createAttackTrigger,
  createMovementTrigger
} from './reactions';
import {
  TargetingSystem,
  CombatEnvironment,
  CoverType,
  TargetingResult
} from './targeting';

/**
 * Interface for combat participants
 */
export interface CombatParticipant {
  id: string;
  name: string;
  initiative: number;
  initiativeModifier: number;
  isPlayer?: boolean;
  hitPoints: {
    current: number;
    maximum: number;
  };
  // Condition flags
  isParalyzed?: boolean;
  isStunned?: boolean;
  isIncapacitated?: boolean;
  isProne?: boolean;
  isRestrained?: boolean;
  isGrappled?: boolean;
  isBlinded?: boolean;
  isDeafened?: boolean;
  isCharmed?: boolean;
  isFrightened?: boolean;
  isPoisoned?: boolean;
  isInvisible?: boolean;
  // Position information
  position?: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * Interface for combat state
 */
export interface CombatState {
  participants: CombatParticipant[];
  round: number;
  currentParticipantIndex: number;
  isActive: boolean;
}

/**
 * Interface for spell actions that apply status effects
 */
export interface SpellAction {
  actionType: string; // 'spell', 'attack', 'movement', etc.
  name: string;
  description?: string;
  sourceId: string;
  targetIds: string[];
  statusEffects: StatusEffect[];
  spellLevel?: number;
  savingThrow?: {
    ability: string;
    dc: number;
  };
  movingAwayFrom?: string[]; // For movement actions
  rangeInFeet?: number; // Maximum range of the spell
  requiresLineOfSight?: boolean; // Whether the spell requires line of sight
}

/**
 * Class to manage combat effects
 */
export class CombatEffectsManager {
  private static instance: CombatEffectsManager;
  private statusEffectManager: StatusEffectManager;
  private reactionManager: ReactionManager;
  private targetingSystem: TargetingSystem;
  private environment: CombatEnvironment | null = null;

  /**
   * Private constructor for singleton
   */
  private constructor() {
    this.statusEffectManager = StatusEffectManager.getInstance();
    this.reactionManager = ReactionManager.getInstance();
    this.targetingSystem = TargetingSystem.getInstance();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): CombatEffectsManager {
    if (!CombatEffectsManager.instance) {
      CombatEffectsManager.instance = new CombatEffectsManager();
    }
    return CombatEffectsManager.instance;
  }

  /**
   * Set the combat environment
   * 
   * @param environment The combat environment to use
   */
  public setEnvironment(environment: CombatEnvironment): void {
    this.environment = environment;
  }

  /**
   * Get the current combat environment
   * 
   * @returns The current combat environment, or null if not set
   */
  public getEnvironment(): CombatEnvironment | null {
    return this.environment;
  }

  /**
   * Apply initial combat effects (start of combat)
   * 
   * @param state The current combat state
   */
  public applyInitialCombatEffects(state: CombatState): void {
    // Apply initiative modifications based on effects
    this.processInitiativeModifications(state);
    
    // Apply any start-of-combat effects
    for (const participant of state.participants) {
      this.processStartOfCombatEffects(participant, state);
    }
  }

  /**
   * Process effects at the start of a round
   * 
   * @param state The current combat state
   */
  public processRoundStartEffects(state: CombatState): void {
    console.log(`Starting round ${state.round}`);
    
    // Reset reactions at the start of each round
    this.reactionManager.resetAllReactions();
    
    // Apply round start effects to each participant
    for (const participant of state.participants) {
      this.processParticipantRoundStart(participant, state);
    }
  }

  /**
   * Process effects at the end of a round
   * 
   * @param state The current combat state
   */
  public processRoundEndEffects(state: CombatState): void {
    // Apply round end effects to each participant
    for (const participant of state.participants) {
      this.processParticipantRoundEnd(participant, state);
    }
    
    // Update conditions based on duration
    this.statusEffectManager.processEndOfRoundEffects(state.round);
  }

  /**
   * Process effects at the start of a participant's turn
   * 
   * @param participant The participant whose turn is starting
   * @param state The current combat state
   */
  public processTurnStartEffects(participant: CombatParticipant, state: CombatState): void {
    console.log(`Starting ${participant.name}'s turn`);
    
    // Process status effect durations
    this.statusEffectManager.processStartOfTurnEffects(participant.id, state.round);
    
    // Update participant condition flags based on active effects
    this.updateParticipantConditions(participant);
    
    // Check if participant can take actions
    if (this.canTakeActions(participant)) {
      console.log(`${participant.name} can take actions normally`);
    } else {
      console.log(`${participant.name} is incapacitated and cannot take actions`);
    }
  }

  /**
   * Process effects at the end of a participant's turn
   * 
   * @param participant The participant whose turn is ending
   * @param state The current combat state
   */
  public processTurnEndEffects(participant: CombatParticipant, state: CombatState): void {
    // Process end of turn saving throws
    this.statusEffectManager.processEndOfTurnEffects(participant.id, state.round);
    
    // Update participant condition flags based on active effects
    this.updateParticipantConditions(participant);
  }
  
  /**
   * Check if a participant can take actions based on their conditions
   * 
   * @param participant The participant to check
   * @returns True if the participant can take actions
   */
  public canTakeActions(participant: CombatParticipant): boolean {
    // Update condition flags just to make sure they're current
    this.updateParticipantConditions(participant);
    
    // Can't take actions if incapacitated, paralyzed, stunned, or unconscious
    return !(participant.isIncapacitated || 
             participant.isParalyzed || 
             participant.isStunned || 
             participant.hitPoints.current <= 0);
  }
  
  /**
   * Check if a participant can take reactions based on their conditions
   * 
   * @param participant The participant to check
   * @returns True if the participant can take reactions
   */
  public canTakeReactions(participant: CombatParticipant): boolean {
    // Update condition flags just to make sure they're current
    this.updateParticipantConditions(participant);
    
    // Can't take reactions if incapacitated, paralyzed, stunned, or unconscious
    return !(participant.isIncapacitated || 
             participant.isParalyzed || 
             participant.isStunned || 
             participant.hitPoints.current <= 0);
  }
  
  /**
   * Update participant condition flags based on active effects
   * 
   * @param participant The participant to update
   */
  public updateParticipantConditions(participant: CombatParticipant): void {
    // Get all active effects for this participant
    const activeEffects = this.statusEffectManager.getActiveEffects(participant.id);
    
    // Reset all condition flags
    participant.isParalyzed = false;
    participant.isStunned = false;
    participant.isIncapacitated = false;
    participant.isProne = false;
    participant.isRestrained = false;
    participant.isGrappled = false;
    participant.isBlinded = false;
    participant.isDeafened = false;
    participant.isCharmed = false;
    participant.isFrightened = false;
    participant.isPoisoned = false;
    participant.isInvisible = false;
    
    // Set flags based on active effects
    for (const effect of activeEffects) {
      switch (effect.type) {
        case ConditionType.Paralyzed:
          participant.isParalyzed = true;
          participant.isIncapacitated = true; // Paralyzed implies incapacitated
          break;
        case ConditionType.Stunned:
          participant.isStunned = true;
          participant.isIncapacitated = true; // Stunned implies incapacitated
          break;
        case ConditionType.Incapacitated:
          participant.isIncapacitated = true;
          break;
        case ConditionType.Prone:
          participant.isProne = true;
          break;
        case ConditionType.Restrained:
          participant.isRestrained = true;
          break;
        case ConditionType.Grappled:
          participant.isGrappled = true;
          break;
        case ConditionType.Blinded:
          participant.isBlinded = true;
          break;
        case ConditionType.Deafened:
          participant.isDeafened = true;
          break;
        case ConditionType.Charmed:
          participant.isCharmed = true;
          break;
        case ConditionType.Frightened:
          participant.isFrightened = true;
          break;
        case ConditionType.Poisoned:
          participant.isPoisoned = true;
          break;
        case ConditionType.Invisible:
          participant.isInvisible = true;
          break;
      }
    }
    
    // If participant is at 0 HP, they're unconscious and incapacitated
    if (participant.hitPoints.current <= 0) {
      participant.isIncapacitated = true;
    }
  }
  
  /**
   * Apply effects from a spell action to combat participants with targeting validation
   * 
   * @param spellAction The spell action to process
   * @param state The current combat state
   */
  public applySpellActionEffects(spellAction: SpellAction, state: CombatState): void {
    // Get the spell caster
    const caster = state.participants.find(p => p.id === spellAction.sourceId);
    
    if (!caster) {
      console.error(`Caster not found for spell action`);
      return;
    }
    
    console.log(`${caster.name} attempts to cast ${spellAction.name}`);
    
    // Check for reaction opportunities first
    const reactingParticipantIds = this.checkForReactionOpportunity(spellAction, state);
    
    // If there are reactions, process them
    if (reactingParticipantIds.length > 0) {
      console.log(`Possible reactions from: ${reactingParticipantIds.map(id => 
        state.participants.find(p => p.id === id)?.name).join(', ')}`);
        
      // Process reactions
      const executedReactions = this.reactionManager.processPendingTriggers(state);
      
      // If a counterspell succeeded, don't apply the spell effects
      if (executedReactions.some(id => 
        this.reactionManager.reactionRegistry.get(id)?.name === 'Counterspell')) {
        console.log(`Spell was countered!`);
        return;
      }
    }
    
    console.log(`${caster.name} casts ${spellAction.name}`);
    
    // Use targeting system if environment is available
    if (this.environment) {
      // Validate targets based on range and line of sight
      const validTargetIds = [];
      const range = spellAction.rangeInFeet || 30; // Default range
      const requiresLineOfSight = spellAction.requiresLineOfSight !== false; // Default to true
      
      for (const targetId of spellAction.targetIds) {
        const target = state.participants.find(p => p.id === targetId);
        if (!target) continue;
        
        const targetingResult = this.targetingSystem.checkTargeting(
          caster,
          target,
          range,
          this.environment
        );
        
        if (targetingResult.isVisible && (!requiresLineOfSight || targetingResult.lineOfSight)) {
          validTargetIds.push(targetId);
          
          // Log cover information
          if (targetingResult.coverType !== CoverType.None) {
            console.log(`${target.name} has ${targetingResult.coverType} cover`);
          }
        } else {
          console.log(`${target.name} is not a valid target for ${spellAction.name}`);
        }
      }
      
      // Update target list to only include valid targets
      spellAction.targetIds = validTargetIds;
    }
    
    // Apply status effects to valid targets
    for (const targetId of spellAction.targetIds) {
      const target = state.participants.find(p => p.id === targetId);
      
      if (!target) {
        console.error(`Target ${targetId} not found for spell effect`);
        continue;
      }
      
      console.log(`Applying effects to ${target.name}`);
      
      // Check if saving throw is required
      if (spellAction.savingThrow) {
        let saveDC = spellAction.savingThrow.dc;
        let coverBonus = 0;
        
        // Apply cover bonus to saving throw if environment is available
        if (this.environment) {
          const targetingResult = this.targetingSystem.checkTargeting(
            caster,
            target,
            spellAction.rangeInFeet || 30,
            this.environment
          );
          
          coverBonus = this.targetingSystem.getCoverSavingThrowBonus(targetingResult.coverType);
          
          if (coverBonus > 0) {
            console.log(`${target.name} gets +${coverBonus} to save from cover`);
          }
        }
        
        // Simplified saving throw (would use actual character stats)
        const saveModifier = 2; // Example modifier
        const roll = Math.floor(Math.random() * 20) + 1;
        const totalSave = roll + saveModifier + coverBonus;
        
        console.log(`${target.name} rolls ${roll} + ${saveModifier} + ${coverBonus} = ${totalSave} vs DC ${saveDC}`);
        
        if (totalSave >= saveDC) {
          console.log(`${target.name} saves against ${spellAction.name}`);
          // Handle effects on successful save (typically half damage or no effect)
          continue;
        } else {
          console.log(`${target.name} fails save against ${spellAction.name}`);
        }
      }
      
      // Apply each effect to the target
      for (const effect of spellAction.statusEffects) {
        this.statusEffectManager.addEffect({
          ...effect,
          targetId
        });
        
        console.log(`Applied ${effect.name} to ${target.name}`);
      }
      
      // Update target conditions
      this.updateParticipantConditions(target);
    }
    
    // Process any reaction triggers that happened as a result of this spell
    this.processReactionTriggers(spellAction, state);
  }
  
  /**
   * Check for reaction opportunities based on an action
   * 
   * @param spellAction The action that might trigger reactions
   * @param state The current combat state
   * @returns An array of participant IDs who might react
   */
  public checkForReactionOpportunity(spellAction: SpellAction, state: CombatState): string[] {
    // Create a trigger based on the action type
    if (spellAction.actionType === 'spell') {
      // Create a spell cast trigger
      const spellTrigger = createSpellCastTrigger(
        {
          ...spellAction,
          spellLevel: spellAction.spellLevel || 1
        },
        state.participants.find(p => p.id === spellAction.sourceId)!,
        spellAction.targetIds.map(id => state.participants.find(p => p.id === id)!).filter(Boolean)
      );
      
      // Add the trigger to the reaction manager
      this.reactionManager.addPendingTrigger(spellTrigger);
      
      // Return eligible reactors
      return this.reactionManager.getEligibleReactors(spellTrigger, state);
    }
    
    return [];
  }
  
  /**
   * Process any reaction triggers that happen after an action
   * 
   * @param action The action that was taken
   * @param state The current combat state
   */
  public processReactionTriggers(action: SpellAction, state: CombatState): void {
    // Create appropriate triggers based on the action
    
    // For damage, check for Shield or Hellish Rebuke reactions
    if (action.actionType === 'damage') {
      // Create an attack trigger (simplified)
      const attackTrigger = createAttackTrigger(
        state.participants.find(p => p.id === action.sourceId)!,
        state.participants.find(p => p.id === action.targetIds[0])!,
        {
          attackRoll: 15, // Simplified
          attackBonus: 5, // Simplified
          damage: 10, // Simplified
          damageType: 'fire' // Simplified
        }
      );
      
      // Add the trigger to the reaction manager
      this.reactionManager.addPendingTrigger(attackTrigger);
    }
    
    // For movement, check for opportunity attacks
    if (action.actionType === 'movement' && action.movingAwayFrom && action.movingAwayFrom.length > 0) {
      // Create a movement trigger
      const movementTrigger = createMovementTrigger(
        state.participants.find(p => p.id === action.sourceId)!,
        action.movingAwayFrom.map(id => state.participants.find(p => p.id === id)!).filter(Boolean),
        {
          fromPosition: { x: 0, y: 0 }, // Simplified
          toPosition: { x: 10, y: 10 }, // Simplified
          movingAwayFrom: action.movingAwayFrom
        }
      );
      
      // Add the trigger to the reaction manager
      this.reactionManager.addPendingTrigger(movementTrigger);
    }
    
    // Process any pending triggers
    this.reactionManager.processPendingTriggers(state);
  }
  
  /**
   * Process effects at the start of a participant's turn in a round
   * 
   * @param participant The participant whose turn is starting
   * @param state The current combat state
   */
  private processParticipantRoundStart(participant: CombatParticipant, state: CombatState): void {
    // Process status effects that trigger at the start of a round
    this.statusEffectManager.processStartOfRoundEffects(participant.id, state.round);
    
    // Update participant conditions
    this.updateParticipantConditions(participant);
  }
  
  /**
   * Process effects at the end of a participant's turn in a round
   * 
   * @param participant The participant whose turn is ending
   * @param state The current combat state
   */
  private processParticipantRoundEnd(participant: CombatParticipant, state: CombatState): void {
    // Nothing special to do here, as end of round effects are handled elsewhere
  }
  
  /**
   * Process effects that trigger when combat starts
   * 
   * @param participant The participant to process
   * @param state The current combat state
   */
  private processStartOfCombatEffects(participant: CombatParticipant, state: CombatState): void {
    // Apply any effects that trigger at the start of combat
    const startOfCombatEffects = this.statusEffectManager.getActiveEffects(participant.id)
      .filter(effect => effect.tags && effect.tags.includes('startOfCombat'));
    
    for (const effect of startOfCombatEffects) {
      console.log(`Applying start-of-combat effect: ${effect.name} to ${participant.name}`);
      // Apply special start-of-combat logic here
    }
    
    // Update participant conditions
    this.updateParticipantConditions(participant);
  }
  
  /**
   * Apply initiative modifications based on effects
   * 
   * @param state The current combat state
   */
  private processInitiativeModifications(state: CombatState): void {
    for (const participant of state.participants) {
      // Get effects that modify initiative
      const initiativeEffects = this.statusEffectManager.getActiveEffects(participant.id)
        .filter(effect => effect.modifiers && effect.modifiers['initiative']);
      
      // Apply initiative modifiers
      for (const effect of initiativeEffects) {
        const modifier = effect.modifiers!['initiative'] as number;
        
        // Apply the modification
        this.applyInitiativeModification(participant, state, modifier);
      }
    }
    
    // Re-sort participants by initiative
    state.participants.sort((a, b) => b.initiative - a.initiative);
  }
  
  /**
   * Apply an initiative modification to a participant
   * 
   * @param participant The participant to modify
   * @param state The current combat state
   * @param modifier The initiative modifier to apply
   */
  public applyInitiativeModification(
    participant: CombatParticipant, 
    state: CombatState, 
    modifier: number
  ): void {
    console.log(`Applying initiative modifier of ${modifier} to ${participant.name}`);
    
    // Store original initiative for reference
    const originalInitiative = participant.initiative;
    
    // Apply the modifier
    participant.initiative += modifier;
    
    console.log(`${participant.name}'s initiative changed from ${originalInitiative} to ${participant.initiative}`);
  }
}

/**
 * Function to check for reaction opportunities
 * 
 * @param spellAction The spell action to check for reactions
 * @param state The current combat state
 * @returns An array of participant IDs who might react
 */
export function checkForReactionOpportunity(spellAction: SpellAction, state: CombatState): string[] {
  const combatEffectsManager = CombatEffectsManager.getInstance();
  return combatEffectsManager.checkForReactionOpportunity(spellAction, state);
}

/**
 * Function to process reaction triggers
 * 
 * @param action The action that was taken
 * @param state The current combat state
 */
export function processReactionTriggers(action: SpellAction, state: CombatState): void {
  const combatEffectsManager = CombatEffectsManager.getInstance();
  combatEffectsManager.processReactionTriggers(action, state);
}

/**
 * Function to apply spell action effects
 * 
 * @param spellAction The spell action to process
 * @param state The current combat state
 */
export function applySpellActionEffects(spellAction: SpellAction, state: CombatState): void {
  const combatEffectsManager = CombatEffectsManager.getInstance();
  combatEffectsManager.applySpellActionEffects(spellAction, state);
}

/**
 * Function to apply an initiative modification
 * 
 * @param participant The participant to modify
 * @param state The current combat state
 * @param modifier The initiative modifier to apply
 */
export function applyInitiativeModification(
  participant: CombatParticipant, 
  state: CombatState, 
  modifier: number
): void {
  const combatEffectsManager = CombatEffectsManager.getInstance();
  combatEffectsManager.applyInitiativeModification(participant, state, modifier);
} 