/**
 * NPC Type Definitions
 * 
 * This file contains type definitions related to NPCs used throughout the application.
 */

import { NPC } from '../core/interfaces/npc';

/**
 * Emotion type definition for NPC emotional states
 */
export type EmotionType = 
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'disgust'
  | 'surprise'
  | 'anticipation'
  | 'trust'
  | 'contempt'
  | 'curiosity'
  | 'pride'
  | 'shame'
  | 'guilt'
  | 'confusion'
  | 'determination'
  | 'contentment';

/**
 * Emotion object representing an emotional state of an NPC
 */
export interface Emotion {
  type: EmotionType;
  intensity: number; // 0-1 scale
  source: string;    // What caused this emotion
  timestamp: number; // When the emotion was created/updated
  persistence: number; // How long the emotion lasts (0-1 scale)
}

/**
 * Relationship between characters
 */
export interface Relationship {
  targetId: string;
  affinity: number;  // -1 to 1 scale
  trust: number;     // -1 to 1 scale
  familiarity: number; // 0 to 1 scale
  lastInteraction: number; // Timestamp
}

/**
 * Memory object for NPCs
 */
export interface Memory {
  id: string;
  content: string;
  importance: MemoryImportance;
  created: number; // Timestamp
  lastRecalled: number; // Timestamp
  associations: string[]; // Tags or entities associated with this memory
  emotionalContext?: EmotionType[]; // Emotions associated with this memory
  strength: number; // 0-1 scale, how strong the memory is
  emotionalSignificance: number; // 0-1 scale, how emotionally significant
}

/**
 * Importance level for memories
 */
export enum MemoryImportance {
  TRIVIAL = 0,
  MINOR = 1,
  MODERATE = 2,
  SIGNIFICANT = 3,
  CRITICAL = 4
}

/**
 * Behavior category for NPC actions
 */
export enum BehaviorCategory {
  SOCIAL = 'social',
  SURVIVAL = 'survival',
  ECONOMIC = 'economic',
  RECREATIONAL = 'recreational',
  PROFESSIONAL = 'professional',
  COMBAT = 'combat',
  EXPLORATION = 'exploration',
  RESTING = 'resting'
}

/**
 * Priority levels for behaviors
 */
export enum BehaviorPriority {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  OPTIONAL = 4
}

/**
 * Behavior definition for NPC actions
 */
export interface Behavior {
  id: string;
  name: string;
  category: BehaviorCategory | string;
  priority: BehaviorPriority | number;
  requirements?: any[];
  effects?: any[];
  description?: string;
  emotionalImpact?: Record<EmotionType, number>;
  socialContext?: string[];
  duration?: number;
}

/**
 * Personality traits for NPCs
 */
export enum PersonalityTrait {
  EXTRAVERSION = 'extraversion',
  AGREEABLENESS = 'agreeableness',
  CONSCIENTIOUSNESS = 'conscientiousness',
  NEUROTICISM = 'neuroticism',
  OPENNESS = 'openness'
}

/**
 * NPC need types
 */
export enum NeedType {
  PHYSIOLOGICAL = 'physiological',
  SAFETY = 'safety',
  BELONGING = 'belonging',
  ESTEEM = 'esteem',
  SELF_ACTUALIZATION = 'self-actualization'
}

/**
 * Extended NPC interface with emotional components
 */
export interface EmotionalNPC extends NPC {
  emotions: Emotion[];
  needs: Map<string, number>;
  relationships: Map<string, Relationship>;
  memories: Memory[];
  stats: Map<string, number>;
  personality?: {
    [key in PersonalityTrait]?: number; // 0-100 scale
  };
  faction?: string;
  goals?: any[];
  activeBehavior?: {
    type: string;
    startTime: number;
    goalId?: string;
  };
} 