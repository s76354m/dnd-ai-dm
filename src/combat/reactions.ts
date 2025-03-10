/**
 * Reaction System
 * 
 * This module implements the reaction system for D&D combat.
 * Reactions are special abilities or actions that can be taken outside of a combatant's turn
 * in response to specific triggers like spell casting, movement, or attacks.
 */

import { v4 as uuidv4 } from 'uuid';
import { CombatParticipant, CombatState, SpellAction } from './combat-effects';

/**
 * Types of events that can trigger reactions
 */
export enum ReactionTriggerType {
  SpellCast = 'spellCast',
  Attack = 'attack',
  Movement = 'movement',
  SaveThrow = 'saveThrow',
  AbilityCheck = 'abilityCheck',
  DamageReceived = 'damageReceived',
  TurnEnd = 'turnEnd',
  TurnStart = 'turnStart'
}

/**
 * Interface for reaction triggers
 */
export interface ReactionTrigger {
  id: string;
  type: ReactionTriggerType;
  sourceId: string;
  targetIds: string[];
  timestamp: number;
  data: any;
}

/**
 * Interface for reactions
 */
export interface Reaction {
  id: string;
  name: string;
  description: string;
  participantId: string;
  triggerType: ReactionTriggerType;
  condition: (trigger: ReactionTrigger, state: any) => boolean;
  execute: (trigger: ReactionTrigger, state: any) => boolean;
}

/**
 * Singleton manager for reactions
 */
export class ReactionManager {
  private static instance: ReactionManager;
  public reactionRegistry: Map<string, Reaction> = new Map();
  private usedReactions: Set<string> = new Set();
  private pendingTriggers: ReactionTrigger[] = [];

  /**
   * Get the singleton instance
   */
  public static getInstance(): ReactionManager {
    if (!ReactionManager.instance) {
      ReactionManager.instance = new ReactionManager();
    }
    return ReactionManager.instance;
  }

  /**
   * Private constructor for singleton
   */
  private constructor() {}

  /**
   * Register a reaction
   * 
   * @param reaction The reaction to register
   */
  public registerReaction(reaction: Reaction): void {
    this.reactionRegistry.set(reaction.id, reaction);
  }

  /**
   * Unregister a reaction
   * 
   * @param reactionId The ID of the reaction to unregister
   */
  public unregisterReaction(reactionId: string): void {
    this.reactionRegistry.delete(reactionId);
  }

  /**
   * Check if a participant has used their reaction this round
   * 
   * @param participantId The ID of the participant
   * @returns True if the participant has used their reaction
   */
  public hasUsedReaction(participantId: string): boolean {
    return this.usedReactions.has(participantId);
  }

  /**
   * Mark a participant's reaction as used
   * 
   * @param participantId The ID of the participant
   */
  public markReactionUsed(participantId: string): void {
    this.usedReactions.add(participantId);
  }

  /**
   * Reset all used reactions at the start of a new round
   */
  public resetAllReactions(): void {
    this.usedReactions.clear();
  }

  /**
   * Reset a specific participant's reaction
   * 
   * @param participantId The ID of the participant
   */
  public resetReaction(participantId: string): void {
    this.usedReactions.delete(participantId);
  }

  /**
   * Add a trigger to the pending queue
   * 
   * @param trigger The trigger to add
   */
  public addPendingTrigger(trigger: ReactionTrigger): void {
    this.pendingTriggers.push(trigger);
  }

  /**
   * Get eligible reactors for a specific trigger
   * 
   * @param trigger The trigger to check
   * @param state The current combat state
   * @returns Array of participant IDs who can react
   */
  public getEligibleReactors(trigger: ReactionTrigger, state: any): string[] {
    const eligibleReactors: string[] = [];

    for (const [reactionId, reaction] of this.reactionRegistry.entries()) {
      // Skip if participant has already used their reaction
      if (this.hasUsedReaction(reaction.participantId)) continue;

      // Skip if reaction doesn't match trigger type
      if (reaction.triggerType !== trigger.type) continue;

      // Skip if source is the same as the reactor (can't react to yourself)
      if (reaction.participantId === trigger.sourceId) continue;

      // Check if reaction condition is met
      if (reaction.condition(trigger, state)) {
        eligibleReactors.push(reaction.participantId);
      }
    }

    return eligibleReactors;
  }

  /**
   * Process pending triggers
   * 
   * @param state The current combat state
   * @returns Array of executed reaction IDs
   */
  public processPendingTriggers(state: any): string[] {
    const executedReactions: string[] = [];

    // Sort triggers by timestamp (process oldest first)
    this.pendingTriggers.sort((a, b) => a.timestamp - b.timestamp);

    while (this.pendingTriggers.length > 0) {
      const trigger = this.pendingTriggers.shift();
      if (!trigger) continue;

      // Find all reactions that match this trigger
      const eligibleReactions: Reaction[] = [];
      
      for (const [reactionId, reaction] of this.reactionRegistry.entries()) {
        // Skip if participant has already used their reaction
        if (this.hasUsedReaction(reaction.participantId)) continue;

        // Skip if reaction doesn't match trigger type
        if (reaction.triggerType !== trigger.type) continue;

        // Skip if source is the same as the reactor (can't react to yourself)
        if (reaction.participantId === trigger.sourceId) continue;

        // Check if reaction condition is met
        if (reaction.condition(trigger, state)) {
          eligibleReactions.push(reaction);
        }
      }

      // Sort eligible reactions (could be based on initiative or other factors)
      // Here we'll use a simple priority system - players first, then NPCs
      eligibleReactions.sort((a, b) => {
        const participantA = state.participants.find((p: any) => p.id === a.participantId);
        const participantB = state.participants.find((p: any) => p.id === b.participantId);
        
        // Players get priority
        if (participantA?.isPlayer && !participantB?.isPlayer) return -1;
        if (!participantA?.isPlayer && participantB?.isPlayer) return 1;
        
        // If both are players or both are NPCs, sort by initiative
        return (participantB?.initiative || 0) - (participantA?.initiative || 0);
      });

      // Execute reactions in order
      for (const reaction of eligibleReactions) {
        const success = reaction.execute(trigger, state);
        
        if (success) {
          // Mark participant's reaction as used
          this.markReactionUsed(reaction.participantId);
          executedReactions.push(reaction.id);
          
          // In some cases, a successful reaction might prevent others
          // For example, a successful Counterspell would prevent other Counterspells
          if (reaction.name === 'Counterspell' && trigger.type === ReactionTriggerType.SpellCast) {
            break;
          }
        }
      }
    }

    return executedReactions;
  }

  /**
   * Reset the reaction manager for testing
   */
  public static resetForTest(): void {
    ReactionManager.instance = new ReactionManager();
  }
}

/**
 * Factory function to create a Counterspell reaction
 * 
 * @param participant The participant who can cast Counterspell
 * @param spellSlot The spell slot level to use for Counterspell (default: 3)
 * @returns A Reaction object for Counterspell
 */
export function createCounterspellReaction(
  participant: { id: string; name: string },
  spellSlot: number = 3
): Reaction {
  return {
    id: uuidv4(),
    name: 'Counterspell',
    description: 'You attempt to interrupt a creature in the process of casting a spell.',
    participantId: participant.id,
    triggerType: ReactionTriggerType.SpellCast,
    condition: (trigger: ReactionTrigger) => {
      if (trigger.type !== ReactionTriggerType.SpellCast) return false;
      
      // Can't counterspell your own spells
      if (trigger.sourceId === participant.id) return false;
      
      // Must be within 60 feet (simplified - assuming all are in range)
      // Would need position data for proper distance calculation
      const spellData = trigger.data as SpellTriggerData;
      
      // Optional: Check if target has spellcasting ability
      // Optional: Check if target has spell slot available
      
      return true;
    },
    execute: (trigger: ReactionTrigger, state: any) => {
      const spellData = trigger.data as SpellTriggerData;
      console.log(`${participant.name} casts Counterspell at level ${spellSlot}!`);
      
      // Automatically succeeds if the spell's level is less than or equal to the slot level
      const automatic = spellData.spellLevel <= spellSlot;
      
      if (automatic) {
        console.log(`Counterspell automatically succeeds against the level ${spellData.spellLevel} spell!`);
        return true;
      } else {
        // For higher level spells, requires DC 10 + spell level ability check
        const dc = 10 + spellData.spellLevel;
        // Mock roll (would use actual character stats)
        const roll = Math.floor(Math.random() * 20) + 1;
        const modifier = 3; // Spellcasting ability modifier
        const total = roll + modifier;
        
        console.log(`${participant.name} rolls ${roll} + ${modifier} = ${total} against DC ${dc}`);
        
        return total >= dc;
      }
    }
  };
}

/**
 * Factory function to create a Shield spell reaction
 * 
 * @param participant The participant who can cast Shield
 * @returns A Reaction object for Shield spell
 */
export function createShieldReaction(
  participant: { id: string; name: string }
): Reaction {
  return {
    id: uuidv4(),
    name: 'Shield',
    description: 'An invisible barrier of magical force appears and protects you.',
    participantId: participant.id,
    triggerType: ReactionTriggerType.Attack,
    condition: (trigger: ReactionTrigger) => {
      if (trigger.type !== ReactionTriggerType.Attack) return false;
      
      // Shield only works when you're the target
      const attackData = trigger.data as AttackTriggerData;
      return trigger.targetIds.includes(participant.id);
    },
    execute: (trigger: ReactionTrigger, state: any) => {
      console.log(`${participant.name} casts Shield!`);
      
      // Shield increases AC by 5 until the start of your next turn
      // In a real implementation, this would add a temporary effect to the character
      
      // Add the Shield effect (simplified)
      const statusEffectManager = state.statusEffectManager || { 
        addEffect: () => console.log('Status effect manager not provided, Shield effect not added') 
      };
      
      statusEffectManager.addEffect({
        targetId: participant.id,
        name: 'Shield',
        description: '+5 to AC until the start of your next turn',
        duration: { type: 'rounds', value: 1 },
        // Additional effect data would be here
      });
      
      return true;
    }
  };
}

/**
 * Factory function to create an Opportunity Attack reaction
 * 
 * @param participant The participant who can make opportunity attacks
 * @returns A Reaction object for opportunity attacks
 */
export function createOpportunityAttackReaction(
  participant: { id: string; name: string }
): Reaction {
  return {
    id: uuidv4(),
    name: 'Opportunity Attack',
    description: 'You can make an opportunity attack when a hostile creature that you can see moves out of your reach.',
    participantId: participant.id,
    triggerType: ReactionTriggerType.Movement,
    condition: (trigger: ReactionTrigger) => {
      if (trigger.type !== ReactionTriggerType.Movement) return false;
      
      const movementData = trigger.data as MovementTriggerData;
      
      // Check if the target is moving away from this participant
      return movementData.movingAwayFrom && 
            movementData.movingAwayFrom.includes(participant.id);
    },
    execute: (trigger: ReactionTrigger, state: any) => {
      const target = state.participants.find(
        (p: any) => p.id === trigger.sourceId
      );
      
      if (!target) {
        console.log(`Target for opportunity attack not found`);
        return false;
      }
      
      console.log(`${participant.name} makes an opportunity attack against ${target.name}!`);
      
      // In a real implementation, this would calculate hit and damage
      // Here we'll simulate a simple attack roll
      const roll = Math.floor(Math.random() * 20) + 1;
      const attackBonus = 5; // Example attack bonus
      const totalRoll = roll + attackBonus;
      
      // Assume AC 15 for simplicity
      const targetAC = 15;
      
      if (totalRoll >= targetAC) {
        // Hit!
        console.log(`${participant.name} hits with a ${totalRoll} against AC ${targetAC}!`);
        
        // Calculate damage (example: 1d8+3)
        const damage = Math.floor(Math.random() * 8) + 1 + 3;
        
        // Apply damage
        target.hitPoints.current = Math.max(0, target.hitPoints.current - damage);
        
        console.log(`${target.name} takes ${damage} damage from the opportunity attack!`);
        return true;
      } else {
        console.log(`${participant.name} misses with a ${totalRoll} against AC ${targetAC}!`);
        return false;
      }
    }
  };
}

// Data interfaces for specific trigger types

export interface SpellTriggerData {
  name: string;
  description: string;
  spellLevel: number;
  // Additional spell data
}

export interface AttackTriggerData {
  attackRoll: number;
  attackBonus: number;
  damage: number;
  damageType: string;
  // Additional attack data
}

export interface MovementTriggerData {
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
  movingAwayFrom?: string[]; // IDs of participants the creature is moving away from
  // Additional movement data
}

/**
 * Factory function to create a spell cast trigger
 */
export function createSpellCastTrigger(
  spellData: SpellTriggerData & { sourceId: string; targetIds: string[] },
  source: { id: string; name: string },
  targets: Array<{ id: string; name: string }>
): ReactionTrigger {
  return {
    id: uuidv4(),
    type: ReactionTriggerType.SpellCast,
    sourceId: source.id,
    targetIds: targets.map(t => t.id),
    timestamp: Date.now(),
    data: {
      name: spellData.name,
      description: spellData.description,
      spellLevel: spellData.spellLevel
    }
  };
}

/**
 * Factory function to create an attack trigger
 */
export function createAttackTrigger(
  source: { id: string; name: string },
  target: { id: string; name: string },
  attackData: AttackTriggerData
): ReactionTrigger {
  return {
    id: uuidv4(),
    type: ReactionTriggerType.Attack,
    sourceId: source.id,
    targetIds: [target.id],
    timestamp: Date.now(),
    data: attackData
  };
}

/**
 * Factory function to create a movement trigger
 */
export function createMovementTrigger(
  source: { id: string; name: string },
  affectedParticipants: Array<{ id: string; name: string }>,
  movementData: MovementTriggerData
): ReactionTrigger {
  return {
    id: uuidv4(),
    type: ReactionTriggerType.Movement,
    sourceId: source.id,
    targetIds: affectedParticipants.map(p => p.id),
    timestamp: Date.now(),
    data: movementData
  };
} 