// src/core/interfaces/combat.ts

import type { Ability } from '../types';
import type { Attack } from './item';
import type { Character } from './character';
import type { NPC } from './npc';

export type CombatantType = Character | NPC;

/**
 * Represents a combat action performed by a character or NPC
 */
export interface CombatAction {
  type: 'attack' | 'spell' | 'ability' | 'item' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'ready' | 'other';
  actor: CombatantType;
  target?: CombatantType | CombatantType[];
  details: any;
}

/**
 * Represents the result of a combat action
 */
export interface CombatResult {
  success: boolean;
  damage?: number;
  damageType?: string;
  message: string;
  effects?: string[];
}

export interface CombatState {
  active: boolean;
  initiativeOrder: Array<{
    combatant: CombatantType;
    initiative: number;
  }>;
  currentTurn: number;
  round: number;
  playerCharacters: Character[];
  hostileNPCs: NPC[];
  alliedNPCs: NPC[];
  environmentalEffects: EnvironmentalEffect[];
  log: Array<{
    action: CombatAction;
    result: CombatResult;
  }>;
}

export interface CombatParticipant {
  id: string;
  initiative: number;
  temporaryEffects: CombatEffect[];
  usedReaction: boolean;
  movement: number;
  action: boolean;
  bonusAction: boolean;
}

export interface CombatEffect {
  name: string;
  description?: string;
  source?: string;
  duration: number;  // rounds
  effect: (participant: CombatParticipant) => void;
}

export interface EnvironmentalEffect {
  name: string;
  description: string;
  effect: string;
  duration: number;
}

export interface CombatEngine {
  initiateCombat(participants: (Character | NPC)[]): CombatState;
  processTurn(action: string): Promise<string>;
  calculateDamage(attack: Attack, target: Character | NPC): number;
  endCombat(): void;
  checkConditions(): void;
}

export interface TurnAction {
  type: 'attack' | 'cast' | 'move' | 'dash' | 'disengage' | 'dodge' | 'help' | 'hide' | 'ready' | 'use' | 'other';
  targetId?: string;
  detail?: string;
  position?: { x: number; y: number }; // For movement
}

export interface AttackResult {
  hit: boolean;
  damage: number;
  critical: boolean;
  effects: string[];
}

export interface CombatPosition {
  x: number;
  y: number;
  z: number;
}

export interface CombatMap {
  width: number;
  height: number;
  terrain: string[][];
  obstacles: { x: number; y: number; type: string }[];
  positions: Map<string, CombatPosition>; // participant ID -> position
}