/**
 * NPC Module
 * 
 * This file provides a compatibility wrapper for the NPC interface used in examples,
 * mapping between the different NPC interfaces that exist in the codebase.
 */

import { NPC as CoreNPC } from '../core/interfaces/npc';
import { EmotionalNPC, Emotion, Relationship, Memory, BehaviorCategory } from '../types/npc-types';
import { NPCType, NPCAttitude, NPCImportance } from '../core/interfaces/npc';

/**
 * A combined NPC interface that works with both core and example patterns
 */
export interface NPC extends CoreNPC, Partial<EmotionalNPC> {
  // Override relationships to make it compatible with both interfaces
  relationships: Map<string, Relationship> | Record<string, { target: string; attitude: NPCAttitude; description: string }>;
}

/**
 * Create an NPC with default values for required properties
 */
export function createNPC(id: string, name: string, options: Partial<NPC> = {}): NPC {
  return {
    id,
    name,
    description: options.description || `An NPC named ${name}`,
    type: options.type || NPCType.Humanoid,
    level: options.level || 1,
    hitPoints: options.hitPoints || { current: 10, maximum: 10 },
    armorClass: options.armorClass || 10,
    abilities: options.abilities || {
      strength: { score: 10, modifier: 0 },
      dexterity: { score: 10, modifier: 0 },
      constitution: { score: 10, modifier: 0 },
      intelligence: { score: 10, modifier: 0 },
      wisdom: { score: 10, modifier: 0 },
      charisma: { score: 10, modifier: 0 }
    },
    speed: options.speed || 30,
    skills: options.skills || {},
    resistances: options.resistances || [],
    vulnerabilities: options.vulnerabilities || [],
    immunities: options.immunities || [],
    actions: options.actions || [],
    location: options.location || 'unknown',
    attitude: options.attitude || NPCAttitude.Neutral,
    importance: options.importance || NPCImportance.Minor,
    memories: options.memories || [],
    dialogueHistory: options.dialogueHistory || [],
    inventory: options.inventory || [],
    personalityTraits: options.personalityTraits || [],
    motivations: options.motivations || [],
    relationships: options.relationships || new Map(),
    
    // Extended properties for examples
    emotions: options.emotions || [],
    needs: options.needs || new Map([
      ['hunger', 0.2],
      ['thirst', 0.3],
      ['rest', 0.1],
      ['social', 0.2]
    ]),
    stats: options.stats || new Map([
      ['strength', 10],
      ['dexterity', 10],
      ['constitution', 10],
      ['intelligence', 10],
      ['wisdom', 10],
      ['charisma', 10]
    ]),
    faction: options.faction,
    goals: options.goals || [],
    activeBehavior: options.activeBehavior
  };
}

/**
 * Add an emotion to an NPC
 */
export function addEmotion(npc: NPC, emotion: Emotion): void {
  if (!npc.emotions) {
    npc.emotions = [];
  }
  
  // Check if emotion already exists
  const existingIndex = npc.emotions.findIndex(e => e.type === emotion.type);
  if (existingIndex >= 0) {
    // Update existing emotion
    npc.emotions[existingIndex] = {
      ...npc.emotions[existingIndex],
      intensity: Math.max(npc.emotions[existingIndex].intensity, emotion.intensity),
      timestamp: Date.now(),
      source: emotion.source || npc.emotions[existingIndex].source
    };
  } else {
    // Add new emotion
    npc.emotions.push({
      ...emotion,
      timestamp: emotion.timestamp || Date.now()
    });
  }
}

/**
 * Add or update a relationship for an NPC
 */
export function updateRelationship(npc: NPC, targetId: string, changes: Partial<Relationship>): void {
  if (npc.relationships instanceof Map) {
    // Handle Map-based relationships
    const existing = npc.relationships.get(targetId);
    if (existing) {
      npc.relationships.set(targetId, { ...existing, ...changes });
    } else {
      npc.relationships.set(targetId, {
        targetId,
        affinity: changes.affinity || 0,
        trust: changes.trust || 0,
        familiarity: changes.familiarity || 0,
        lastInteraction: changes.lastInteraction || Date.now()
      });
    }
  } else {
    // Handle Record-based relationships
    if (npc.relationships[targetId]) {
      // For Record-based relationships, we need to map between different schemas
      if (changes.trust !== undefined) {
        // Adjust the attitude based on trust
        if (changes.trust > 0.5) {
          npc.relationships[targetId].attitude = NPCAttitude.Friendly;
        } else if (changes.trust < -0.5) {
          npc.relationships[targetId].attitude = NPCAttitude.Hostile;
        } else if (changes.trust < 0) {
          npc.relationships[targetId].attitude = NPCAttitude.Unfriendly;
        } else {
          npc.relationships[targetId].attitude = NPCAttitude.Neutral;
        }
      }
    } else {
      npc.relationships[targetId] = {
        target: targetId,
        attitude: NPCAttitude.Neutral,
        description: ''
      };
    }
  }
}

/**
 * Add a memory to an NPC
 */
export function addMemory(npc: NPC, memory: Memory): void {
  if (!npc.memories) {
    npc.memories = [];
  }
  
  npc.memories.push(memory);
}

/**
 * Set the NPC's active behavior
 */
export function setActiveBehavior(npc: NPC, behaviorType: string, goalId?: string): void {
  npc.activeBehavior = {
    type: behaviorType,
    startTime: Date.now(),
    goalId
  };
}

/**
 * Get a value from an NPC's stats
 */
export function getNPCStat(npc: NPC, statName: string): number {
  if (npc.stats instanceof Map) {
    return npc.stats.get(statName) || 0;
  }
  
  // Fall back to abilities for core stats
  if (statName in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']) {
    return npc.abilities[statName as keyof typeof npc.abilities]?.score || 0;
  }
  
  return 0;
} 