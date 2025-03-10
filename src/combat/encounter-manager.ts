/**
 * Encounter Manager
 * 
 * Manages combat encounters in the game, including creation, tracking, and resolution
 */

import { CombatManager, CombatActionResult } from './combat-manager';
import { EnemyManager } from './enemy-manager';
import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';
import { AIService } from '../dm/ai-service';
import { Location } from '../core/interfaces/world';
import { v4 as uuidv4 } from 'uuid';

/**
 * Encounter difficulty levels
 */
export type EncounterDifficulty = 'easy' | 'medium' | 'hard' | 'deadly';

/**
 * Structure to define an encounter
 */
export interface Encounter {
  id: string;
  name: string;
  description: string;
  enemies: NPC[];
  locationId: string;
  difficulty: EncounterDifficulty;
  isRandom: boolean;
  isActive: boolean;
  isCompleted: boolean;
  xpReward: number;
}

/**
 * Manages combat encounters
 */
export class EncounterManager {
  private encounters: Map<string, Encounter>;
  private activeEncounterId: string | null = null;
  private player: Character;
  private enemyManager: EnemyManager;
  private combatManager: CombatManager;
  private aiService: AIService;
  
  constructor(player: Character, aiService: AIService) {
    this.player = player;
    this.aiService = aiService;
    this.encounters = new Map();
    this.enemyManager = new EnemyManager();
    this.combatManager = new CombatManager(aiService);
  }
  
  /**
   * Create a new combat encounter
   */
  public createEncounter(
    name: string,
    description: string,
    enemies: NPC[],
    locationId: string,
    difficulty: EncounterDifficulty = 'medium',
    isRandom: boolean = false
  ): Encounter {
    const id = `encounter-${uuidv4()}`;
    
    // Calculate XP reward based on difficulty and player level
    const xpReward = this.calculateXPReward(difficulty, enemies.length);
    
    const encounter: Encounter = {
      id,
      name,
      description,
      enemies,
      locationId,
      difficulty,
      isRandom,
      isActive: false,
      isCompleted: false,
      xpReward
    };
    
    this.encounters.set(id, encounter);
    return encounter;
  }
  
  /**
   * Generate a random encounter for the current location
   */
  public generateRandomEncounter(
    locationId: string,
    difficulty: EncounterDifficulty = 'medium'
  ): Encounter {
    // Generate enemies appropriate for the player's level
    const enemies = this.enemyManager.createRandomEncounter(
      this.player.level,
      difficulty,
      locationId
    );
    
    // Generate a name and description for the encounter
    const name = this.generateEncounterName(enemies);
    const description = this.generateEncounterDescription(enemies, difficulty);
    
    return this.createEncounter(
      name,
      description,
      enemies,
      locationId,
      difficulty,
      true // isRandom
    );
  }
  
  /**
   * Generate a name for an encounter based on the enemies
   */
  private generateEncounterName(enemies: NPC[]): string {
    // Count enemy types
    const enemyCounts = new Map<string, number>();
    
    for (const enemy of enemies) {
      const baseType = enemy.name.split(' ')[0]; // Get the base name without numbers
      enemyCounts.set(baseType, (enemyCounts.get(baseType) || 0) + 1);
    }
    
    // Generate a name based on the most numerous enemy type
    let primaryType = '';
    let maxCount = 0;
    
    for (const [type, count] of enemyCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        primaryType = type;
      }
    }
    
    if (enemyCounts.size === 1) {
      // Only one type of enemy
      if (maxCount === 1) {
        return `Lone ${primaryType}`;
      } else {
        return `Band of ${primaryType}s`;
      }
    } else {
      // Multiple types of enemies
      return `${primaryType} Ambush`;
    }
  }
  
  /**
   * Generate a description for an encounter based on the enemies and difficulty
   */
  private generateEncounterDescription(enemies: NPC[], difficulty: EncounterDifficulty): string {
    // Count enemy types
    const enemyCounts = new Map<string, number>();
    
    for (const enemy of enemies) {
      const baseType = enemy.name.split(' ')[0]; // Get the base name without numbers
      enemyCounts.set(baseType, (enemyCounts.get(baseType) || 0) + 1);
    }
    
    // Create a description of the enemies
    const enemyDescriptions: string[] = [];
    
    for (const [type, count] of enemyCounts.entries()) {
      if (count === 1) {
        enemyDescriptions.push(`a ${type.toLowerCase()}`);
      } else {
        enemyDescriptions.push(`${count} ${type.toLowerCase()}s`);
      }
    }
    
    // Join the enemy descriptions
    let enemyDescription = '';
    
    if (enemyDescriptions.length === 1) {
      enemyDescription = enemyDescriptions[0];
    } else if (enemyDescriptions.length === 2) {
      enemyDescription = `${enemyDescriptions[0]} and ${enemyDescriptions[1]}`;
    } else {
      const lastDescription = enemyDescriptions.pop();
      enemyDescription = `${enemyDescriptions.join(', ')}, and ${lastDescription}`;
    }
    
    // Add a difficulty description
    let difficultyDescription = '';
    
    switch (difficulty) {
      case 'easy':
        difficultyDescription = 'They look like they could be handled without much trouble.';
        break;
      case 'medium':
        difficultyDescription = 'They look like a moderate challenge.';
        break;
      case 'hard':
        difficultyDescription = 'They look quite dangerous.';
        break;
      case 'deadly':
        difficultyDescription = 'They look extremely dangerous. This could be a deadly encounter.';
        break;
    }
    
    return `You encounter ${enemyDescription}. ${difficultyDescription}`;
  }
  
  /**
   * Start a combat encounter
   */
  public startEncounter(encounterId: string): string {
    const encounter = this.encounters.get(encounterId);
    
    if (!encounter) {
      return `Encounter ${encounterId} not found.`;
    }
    
    if (encounter.isActive) {
      return `Encounter ${encounter.name} is already active.`;
    }
    
    if (encounter.isCompleted) {
      return `Encounter ${encounter.name} has already been completed.`;
    }
    
    // Combine player and enemies into participants
    const participants: (Character | NPC)[] = [this.player, ...encounter.enemies];
    
    // Start the combat
    const combatState = this.combatManager.initiateCombat(participants);
    
    // Mark the encounter as active
    encounter.isActive = true;
    this.activeEncounterId = encounterId;
    
    return `Combat with ${encounter.name} has begun!\n\n${this.combatManager.describeCombatState()}`;
  }
  
  /**
   * Process a combat action
   */
  public async processCombatAction(
    action: string,
    targetId?: string,
    actionDetail?: string
  ): Promise<string> {
    if (!this.combatManager.isCombatActive()) {
      return 'No active combat.';
    }
    
    // Get the current entity
    const currentEntity = this.combatManager.getCurrentEntity();
    
    if (!currentEntity) {
      return 'Unknown entity\'s turn.';
    }
    
    // Process different action types
    switch (action.toLowerCase()) {
      case 'attack':
        if (!targetId) {
          return 'No target specified for attack.';
        }
        
        const attackResult = await this.combatManager.processAttack(
          currentEntity.id,
          targetId,
          actionDetail // Optional weapon name
        );
        
        // Return the result
        return attackResult.message;
      
      case 'cast':
        if (!actionDetail) {
          // If no spell is specified, list available spells
          if ('class' in currentEntity) {
            const availableSpells = this.combatManager.getAvailableSpells(currentEntity.id);
            if (availableSpells.length === 0) {
              return `${currentEntity.name} doesn't have any spells available.`;
            }
            
            let spellList = `Available spells for ${currentEntity.name}:\n`;
            spellList += availableSpells.map(spell => 
              `- ${spell.name} (Level ${spell.level}): ${spell.description.substring(0, 50)}...`
            ).join('\n');
            
            return spellList;
          } else {
            return `${currentEntity.name} cannot cast spells.`;
          }
        }
        
        // Find the spell by name (simplified - in a full implementation, we'd match by ID)
        const availableSpells = this.combatManager.getAvailableSpells(currentEntity.id);
        const spell = availableSpells.find(s => 
          s.name.toLowerCase() === actionDetail.toLowerCase()
        );
        
        if (!spell) {
          return `${currentEntity.name} doesn't know the spell "${actionDetail}".`;
        }
        
        // Handle targeting
        let targets: string[] = [];
        if (targetId) {
          targets = [targetId];
        } else if (spell.target === 'self') {
          targets = []; // Self-targeting spells don't need explicit targets
        } else if (spell.target === 'area') {
          // For simplicity, area spells without a target will target all enemies
          const enemies = this.combatState?.participantEntities.filter(entity => 
            entity.id !== currentEntity.id && 
            (!('class' in entity) && (entity as NPC).attitude === 'hostile')
          ) || [];
          
          targets = enemies.map(e => e.id);
          
          if (targets.length === 0) {
            return `No valid targets for area spell ${spell.name}.`;
          }
        } else {
          return `Please specify a target for ${spell.name}.`;
        }
        
        // Cast the spell
        const spellResult = await this.combatManager.processSpellCast(
          currentEntity.id,
          spell.id,
          targets
        );
        
        // Generate a narration if it was successful
        if (spellResult.success) {
          return await this.generateCombatNarration(
            `${currentEntity.name} casts ${spell.name}`,
            spellResult.message
          );
        }
        
        return spellResult.message;
        
      case 'next':
      case 'end':
      case 'end turn':
        // End the current turn
        const nextTurnMessage = this.combatManager.nextTurn();
        
        // Check if combat is still active
        if (!this.combatManager.isCombatActive() && this.activeEncounterId) {
          // Combat has ended
          this.completeEncounter(this.activeEncounterId);
        }
        
        // After NPC's turn, automatically process their action
        const newCurrentEntity = this.combatManager.getCurrentEntity();
        if (newCurrentEntity && !('class' in newCurrentEntity)) {
          // This is an NPC, process their turn automatically
          const npcActionResult = await this.processNPCTurn(newCurrentEntity as NPC);
          return `${nextTurnMessage}\n\n${npcActionResult}`;
        }
        
        return nextTurnMessage;
        
      case 'status':
      case 'look':
        // Show the current combat state
        return this.combatManager.describeCombatState();
        
      default:
        return `Unknown action: ${action}. Valid actions are: attack, cast, next, status.`;
    }
  }
  
  /**
   * Process an NPC's turn automatically
   */
  private async processNPCTurn(npc: NPC): Promise<string> {
    // Simple AI: Attack the player if possible
    const combatState = this.combatManager.getCombatState();
    
    if (!combatState) {
      return '';
    }
    
    // Find the player
    const player = combatState.participantEntities.find(entity => 'class' in entity);
    
    if (!player) {
      // No player found, end turn
      const nextTurnMessage = this.combatManager.nextTurn();
      return nextTurnMessage;
    }
    
    // Attack the player
    const attackResult = await this.combatManager.processAttack(npc.id, player.id);
    
    // Check if combat has ended
    if (!this.combatManager.isCombatActive() && this.activeEncounterId) {
      // Combat has ended
      this.completeEncounter(this.activeEncounterId);
    }
    
    // If the NPC still has a turn (attack failed), end it
    if (this.combatManager.isCombatActive()) {
      const currentEntity = this.combatManager.getCurrentEntity();
      if (currentEntity && currentEntity.id === npc.id) {
        this.combatManager.nextTurn();
      }
    }
    
    return attackResult.message;
  }
  
  /**
   * Complete an encounter
   */
  private completeEncounter(encounterId: string): void {
    const encounter = this.encounters.get(encounterId);
    
    if (!encounter) {
      return;
    }
    
    encounter.isActive = false;
    encounter.isCompleted = true;
    this.activeEncounterId = null;
    
    // Award XP to the player
    this.player.experiencePoints += encounter.xpReward;
  }
  
  /**
   * Calculate XP reward based on difficulty and enemy count
   */
  private calculateXPReward(difficulty: EncounterDifficulty, enemyCount: number): number {
    const baseXP = this.player.level * 50;
    
    // Adjust for difficulty
    let difficultyMultiplier = 1;
    
    switch (difficulty) {
      case 'easy':
        difficultyMultiplier = 0.5;
        break;
      case 'medium':
        difficultyMultiplier = 1;
        break;
      case 'hard':
        difficultyMultiplier = 1.5;
        break;
      case 'deadly':
        difficultyMultiplier = 2;
        break;
    }
    
    // Adjust for enemy count
    const countMultiplier = 1 + (enemyCount - 1) * 0.2; // 20% bonus per additional enemy
    
    // Calculate final XP
    return Math.floor(baseXP * difficultyMultiplier * countMultiplier);
  }
  
  /**
   * Get all available encounters in a location
   */
  public getEncountersInLocation(locationId: string): Encounter[] {
    return Array.from(this.encounters.values())
      .filter(encounter => 
        encounter.locationId === locationId && 
        !encounter.isCompleted && 
        !encounter.isActive
      );
  }
  
  /**
   * Get the active encounter, if any
   */
  public getActiveEncounter(): Encounter | null {
    if (!this.activeEncounterId) {
      return null;
    }
    
    return this.encounters.get(this.activeEncounterId) || null;
  }
  
  /**
   * Check if there is an active encounter
   */
  public hasActiveEncounter(): boolean {
    return this.activeEncounterId !== null;
  }
  
  /**
   * Get the combat manager
   */
  public getCombatManager(): CombatManager {
    return this.combatManager;
  }
  
  /**
   * Process narration from the combat manager
   */
  public getCombatNarration(): string {
    return this.combatManager.getNarration();
  }
  
  /**
   * Generate AI-narrated description of a combat turn
   */
  public async generateCombatNarration(action: string, result: string): Promise<string> {
    // Ensure there is an active combat
    if (!this.combatManager.isCombatActive()) {
      return result;
    }
    
    try {
      // Get the active encounter
      const activeEncounter = this.getActiveEncounter();
      if (!activeEncounter) {
        return result;
      }
      
      // Get the current combat state
      const combatState = this.combatManager.getCombatState();
      if (!combatState) {
        return result;
      }
      
      // Generate a narration using the AI
      const context = `Combat round ${combatState.round}. ${this.player.name} is fighting against ${activeEncounter.enemies.map(e => e.name).join(', ')}.`;
      
      const narration = await this.aiService.generateCombatNarration(
        action,
        result,
        context
      );
      
      return narration;
    } catch (error) {
      console.error('Error generating combat narration:', error);
      return result;
    }
  }
} 