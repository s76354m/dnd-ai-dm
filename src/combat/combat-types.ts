/**
 * Combat System Type Definitions
 * 
 * This file contains all the type definitions needed for the combat system.
 */

// Attack types for weapons and abilities
export enum AttackType {
  MELEE = 'melee',
  RANGED = 'ranged',
  SPELL = 'spell',
  SPECIAL = 'special'
}

// Combat action types
export enum CombatAction {
  ATTACK = 'attack',
  CAST_SPELL = 'cast_spell',
  DASH = 'dash',
  DISENGAGE = 'disengage',
  DODGE = 'dodge',
  HELP = 'help',
  HIDE = 'hide',
  READY = 'ready',
  SEARCH = 'search',
  USE_ITEM = 'use_item',
  USE_ABILITY = 'use_ability',
  SPECIAL = 'special',
  HEAL = 'heal'
}

// Damage types
export enum DamageType {
  ACID = 'acid',
  BLUDGEONING = 'bludgeoning',
  COLD = 'cold',
  FIRE = 'fire',
  FORCE = 'force',
  LIGHTNING = 'lightning',
  NECROTIC = 'necrotic',
  PIERCING = 'piercing',
  POISON = 'poison',
  PSYCHIC = 'psychic',
  RADIANT = 'radiant',
  SLASHING = 'slashing',
  THUNDER = 'thunder'
}

// Combat effect type
export interface CombatEffect {
  id: string;
  name: string;
  description: string;
  duration: number; // in rounds
  target: string; // character ID
  effect: {
    type: string;
    value: number | string;
    property?: string;
  };
  isActive: boolean;
}

// Attack result interface
export interface AttackResult {
  success: boolean;
  critical: boolean;
  damage: number;
  damageType: DamageType;
  message: string;
  effects?: CombatEffect[];
}

// Combat participant interface
export interface CombatParticipant {
  id: string;
  name: string;
  initiative: number;
  isPlayer: boolean;
  hasActed: boolean;
}

// Combat state interface
export interface CombatState {
  active: boolean;
  round: number;
  participants: CombatParticipant[];
  currentTurn: number;
  effects: CombatEffect[];
} 