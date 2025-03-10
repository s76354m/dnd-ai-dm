// src/core/interfaces/npc.ts

import type { Race } from '../types';
import { AbilityScores } from './character';
import { Attack } from './item';
import { Item } from './item';
import { DialogueNode } from './quest';

export enum NPCType {
  Humanoid = 'humanoid',
  Beast = 'beast',
  Undead = 'undead',
  Construct = 'construct',
  Elemental = 'elemental',
  Fey = 'fey',
  Dragon = 'dragon',
  Monstrosity = 'monstrosity',
  Celestial = 'celestial',
  Fiend = 'fiend',
  Plant = 'plant',
  Ooze = 'ooze'
}

export enum NPCAttitude {
  Friendly = 'friendly',
  Neutral = 'neutral',
  Unfriendly = 'unfriendly',
  Hostile = 'hostile'
}

export enum NPCImportance {
  Background = 'background',
  Minor = 'minor',
  Supporting = 'supporting',
  Major = 'major'
}

export interface NPCAction {
  name: string;
  description: string;
  attackBonus?: number;
  damage?: {
    diceCount: number;
    diceType: number;
    bonus: number;
    type: string;
  };
  savingThrow?: {
    ability: string;
    dc: number;
  };
  effects?: string[];
}

/**
 * Basic memory event for an NPC
 */
export interface NPCMemoryEvent {
  type: string;
  description: string;
  timestamp: number;
  importance: number;
}

/**
 * NPC Memory system to track interactions with the player
 */
export interface NPCMemorySystem {
  firstEncounter: Date;
  lastInteraction: Date;
  interactionCount: number;
  knownTopics: Map<string, number>; // Topic -> familiarity level (0-5)
  relationship: number; // Scale from -10 (hostile) to 10 (trusted ally)
  questsGiven: string[];
  questsCompleted: string[];
  playerActions: PlayerActionMemory[];
  conversationHistory: DialogueHistoryEntry[];
}

/**
 * Record of significant events the NPC remembers about the player
 */
export interface PlayerActionMemory {
  date: Date;
  type: 'quest' | 'combat' | 'gift' | 'theft' | 'help' | 'betrayal' | 'conversation';
  description: string;
  impact: number; // -5 to +5 indicating how this affected the relationship
}

/**
 * Tracks conversation history for context in dialogues
 */
export interface DialogueHistoryEntry {
  timestamp: Date;
  playerStatement: string;
  npcResponse: string;
  context?: string; // Optional context of conversation (e.g., "quest discussion", "greeting")
}

/**
 * Relationship between NPCs
 */
export interface NPCRelationship {
  npcId: string;
  value: number; // -100 (enemy) to 100 (close friend)
  type: string; // 'friend', 'enemy', 'neutral', 'family', etc.
  lastInteraction: number; // timestamp of last interaction
}

/**
 * Record of interaction between NPCs
 */
export interface NPCInteraction {
  id: string;
  npc1Id: string;
  npc2Id: string;
  type: 'conversation' | 'trade' | 'conflict' | 'collaboration';
  description: string;
  timestamp: number;
  location: string;
  relationshipChange: number;
}

/**
 * Personality traits that affect how an NPC responds and behaves
 */
export type NPCPersonality = string | {
  primaryTrait: PersonalityTrait;
  secondaryTrait: PersonalityTrait;
  flaws: PersonalityFlaw[];
  values: string[];
  speechPattern?: string; // Description of how this NPC talks
  motivations: string[];
};

export type PersonalityTrait = 
  | 'friendly' 
  | 'mysterious' 
  | 'suspicious' 
  | 'helpful' 
  | 'wise' 
  | 'aggressive'
  | 'timid'
  | 'gruff'
  | 'scholarly'
  | 'noble'
  | 'common'
  | 'eccentric'
  | 'stoic'
  | 'cautious';
  
export type PersonalityFlaw =
  | 'greedy'
  | 'cowardly'
  | 'arrogant'
  | 'naive'
  | 'dishonest'
  | 'forgetful'
  | 'temperamental'
  | 'secretive'
  | 'prejudiced'
  | 'gullible';

/**
 * Expanded NPC interface with memory and personality
 */
export interface NPC {
  id: string;
  name: string;
  description: string;
  type: NPCType;
  level: number;
  hitPoints: {
    current: number;
    maximum: number;
  };
  armorClass: number;
  abilities: AbilityScores;
  speed: number;
  skills: Record<string, number>;
  resistances: string[];
  vulnerabilities: string[];
  immunities: string[];
  actions: NPCAction[];
  location: string;
  attitude: NPCAttitude;
  importance: NPCImportance;
  memories: NPCMemoryEvent[];
  dialogueHistory: string[];
  inventory: string[];
  personalityTraits: string[];
  motivations: string[];
  relationships: Record<string, {
    target: string;
    attitude: NPCAttitude;
    description: string;
  }>;
  dialogue?: {
    greeting: string;
    topics: Map<string, string>;
  };
}

/**
 * NPC schedule for daily routines
 */
export interface NPCSchedule {
  locations: Array<{
    locationId: string;
    startHour: number; // 0-23 hours
    endHour: number;
    activity: string;
  }>;
  weeklyOverrides?: Map<number, string>; // Day of week (0-6) -> Special schedule
}

/**
 * A single entry in an NPC's schedule
 */
export interface ScheduleEntry {
  id?: string;
  location: string;
  activity: string;
  startTime: number; // Minutes from start of day (0-1439)
  endTime?: number; // Optional end time, if not specified, it's until the next entry
}

export interface NPCStats {
  level: number;
  abilityScores: AbilityScores;
  armorClass: number;
  hitPoints: { current: number; maximum: number };
  speed?: number; // Movement speed in feet
}

/**
 * Create default memory for a new NPC-player relationship
 */
export function createDefaultNPCMemory(): NPCMemorySystem {
  const now = new Date();
  return {
    firstEncounter: now,
    lastInteraction: now,
    interactionCount: 1,
    knownTopics: new Map<string, number>(),
    relationship: 0, // Neutral starting point
    questsGiven: [],
    questsCompleted: [],
    playerActions: [],
    conversationHistory: []
  };
}

/**
 * Create a default personality for an NPC based on their attitude
 */
export function createDefaultPersonality(attitude: 'friendly' | 'neutral' | 'hostile'): NPCPersonality {
  // Default personalities based on attitude
  switch (attitude) {
    case 'friendly':
      return {
        primaryTrait: 'friendly',
        secondaryTrait: 'helpful',
        flaws: ['naive'],
        values: ['community', 'kindness'],
        motivations: ['to help others', 'to make friends']
      };
    case 'hostile':
      return {
        primaryTrait: 'suspicious',
        secondaryTrait: 'aggressive',
        flaws: ['temperamental', 'prejudiced'],
        values: ['strength', 'self-preservation'],
        motivations: ['to protect territory', 'to gain power']
      };
    case 'neutral':
    default:
      return {
        primaryTrait: 'stoic',
        secondaryTrait: 'cautious',
        flaws: ['secretive'],
        values: ['balance', 'fairness'],
        motivations: ['to maintain status quo', 'to avoid trouble']
      };
  }
}