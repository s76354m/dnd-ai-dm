/**
 * Monster interfaces
 * 
 * Definitions for monster data structures
 */

import { AbilityScores } from './character';

/**
 * Monster type definition
 */
export interface Monster {
  id: string;
  name: string;
  type: string;
  size: MonsterSize;
  alignment: string;
  description: string;
  stats: MonsterStats;
  traits: MonsterTrait[];
  actions: MonsterAction[];
  behavior: MonsterBehavior;
}

/**
 * Monster size classification
 */
export type MonsterSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

/**
 * Monster statistics
 */
export interface MonsterStats {
  armorClass: number;
  hitPointsBase: number;
  hitPointsPerLevel: number;
  speed: number;
  abilityScores: AbilityScores;
  savingThrows?: Record<string, number>;
  skills?: Record<string, number>;
  senses?: Record<string, number>;
  damage_vulnerabilities?: string[];
  damage_immunities?: string[];
  condition_immunities?: string[];
  languages?: string[];
  challengeRating: number;
}

/**
 * Monster trait
 */
export interface MonsterTrait {
  name: string;
  description: string;
}

/**
 * Monster action types
 */
export type ActionType = 'melee' | 'ranged' | 'spell' | 'special';

/**
 * Monster action
 */
export interface MonsterAction {
  name: string;
  type: ActionType;
  description: string;
  toHit?: number;
  reach?: number;
  range?: number[];
  damage?: {
    dice: string;
    bonus: number;
    type: string;
  };
  additionalEffects?: MonsterActionEffect[];
}

/**
 * Additional effects that can occur on actions
 */
export interface MonsterActionEffect {
  type: 'saving throw' | 'condition' | 'damage' | 'movement' | 'other';
  ability?: string;
  dc?: number;
  effect: string;
  condition?: 'on hit' | 'on fail' | 'always';
  duration?: number; // In rounds
}

/**
 * Monster behavior patterns
 */
export interface MonsterBehavior {
  preferredTactics: string[];
  retreatThreshold: number; // 0-1 percentage of HP when monster will try to flee
  aggressiveness: number;   // 0-1 scale of how aggressive the monster is
} 