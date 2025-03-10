/**
 * Extended Combat Interfaces
 * 
 * Additional interface definitions for the combat system.
 */

import { Ability } from '../types';
import { Character } from './character';
import { NPC } from './npc';
import { CombatState } from './combat';

/**
 * Status of a combatant during combat
 */
export interface CombatantStatus {
  id: string;
  name: string;
  currentHP: number;
  maxHP: number;
  temporaryHP: number;
  conditions: string[];
  activeEffects: {
    id: string;
    name: string;
    description: string;
    duration: number; // rounds remaining
    source: string;
  }[];
  position: {
    x: number;
    y: number;
  };
  isConcentrating: boolean;
  concentratingOn?: string;
  movement: {
    speed: number;
    remaining: number;
  };
  actionsUsed: {
    action: boolean;
    bonusAction: boolean;
    reaction: boolean;
    movement: boolean;
  };
}

/**
 * Initiative tracking for combat
 */
export interface Initiative {
  value: number;
  modifier: number;
  tiebreaker: number; // usually dexterity score or a random value
  participantId: string;
}

/**
 * Represents an attack roll in combat
 */
export interface AttackRoll {
  attackerId: string;
  targetId: string;
  weaponUsed?: string;
  spellUsed?: string;
  abilityUsed?: Ability;
  advantage: boolean;
  disadvantage: boolean;
  criticalThreshold: number; // usually 20, but can be lower with class features
  roll: {
    natural: number;
    total: number;
    modifier: number;
    isCritical: boolean;
    isFumble: boolean;
  };
  hits: boolean;
  targetAC: number;
}

/**
 * Represents damage dealt in combat
 */
export interface DamageRoll {
  sourceId: string;
  targetId: string;
  damageType: string;
  rolls: {
    dice: string;
    values: number[];
    modifier: number;
  }[];
  total: number;
  isCritical: boolean;
  resistances?: string[];
  vulnerabilities?: string[];
  immunities?: string[];
  reducedBy?: number;
  amplifiedBy?: number;
  finalDamage: number;
}

/**
 * Represents a saving throw in combat
 */
export interface SavingThrow {
  characterId: string;
  ability: Ability;
  DC: number;
  advantage: boolean;
  disadvantage: boolean;
  roll: {
    natural: number;
    total: number;
    modifier: number;
  };
  success: boolean;
  source: string;
  effect: string;
}

/**
 * Extend the CombatState interface to include common properties for app.ts
 */
export interface ExtendedCombatState extends CombatState {
  // Add the missing properties used in app.ts
  isActive: boolean; // Alias for active
  activeParticipantIndex: number; // Alias for currentTurn
  participants: {
    id: string;
    name: string;
    isPlayer: boolean;
    [key: string]: any;
  }[];
} 