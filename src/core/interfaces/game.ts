// src/core/interfaces/game.ts
// Consolidated game state interfaces

import { Character, Inventory } from './character';
import { Location } from './location';
import { Quest } from './quest';
import { NPC } from './npc';
import { CombatState } from './combat';
import { GameTime, WorldState } from './world';

/**
 * Represents an event that occurred in the game
 */
export interface GameEvent {
  type: string;
  timestamp: number;
  description: string;
  data?: any;
}

/**
 * Represents the complete state of the game
 */
export interface GameState {
  sessionId?: string;
  player: Character;
  currentLocation: Location;
  visitedLocations?: string[];
  locations?: Map<string, Location>;
  quests: Quest[];
  completedQuests?: Quest[];
  npcs?: Map<string, NPC>;
  combatState?: CombatState | null;
  inventory: Inventory;
  gameTime?: GameTime;
  worldState?: WorldState;
  sessionHistory?: GameEvent[];
  inCombat?: boolean;
  gameProgress?: number;
  possibleDirections?: Array<{
    direction: string;
    destination: string;
    description: string;
  }>;
  
  // Weather conditions
  weather?: string;
  
  // Time tracking
  time?: {
    day: number;
    hour: number;
    minute: number;
  };
  
  // Legacy support for older properties
  activeQuests?: Quest[];
  locationRelationships?: Array<{
    from: string;
    to: string;
    description?: string;
    distance?: string;
    travelTime?: string;
    difficulty?: string;
  }> | Map<string, {
    from: string;
    to: string;
    description?: string;
    distance?: string;
    travelTime?: string;
    difficulty?: string;
  }>;
}

export interface Item {
  id: string;
  name: string;
  description?: string;
}

export interface EnvironmentalEffect {
  id: string;
  description: string;
}