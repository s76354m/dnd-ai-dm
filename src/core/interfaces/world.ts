/**
 * World Interfaces
 * 
 * Defines interfaces for the game world, including time, weather, and global state.
 */

import { NPC } from './npc';
import { Item } from './item';
import { EnvironmentalEffect } from './combat';
import { Location } from './location';
import { Weather, TimeOfDay, Season } from '../types/world';

export type { Location };  // Re-export the Location interface from location.ts

// Export the Weather, TimeOfDay, and Season types
export { Weather, TimeOfDay, Season };

/**
 * Represents a point in game time
 */
export interface GameTime {
  day: number;
  hour?: number;
  minute?: number;
  month?: number;
  year?: number;
  timeOfDay: TimeOfDay;
  season?: Season;
  totalMinutes?: number; // Used for time-based calculations
}

/**
 * The state of the game world
 */
export interface WorldState {
  weather: Weather;
  temperature?: 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot' | 'scorching';
  season: Season;
  events: WorldEvent[];
  currentWeather?: Weather; // Legacy support
  locations?: Map<string, any>; // Legacy support
  npcs?: Map<string, any>; // Legacy support
  time?: GameTime; // Legacy support
}

/**
 * A significant event in the game world
 */
export interface WorldEvent {
  id: string;
  name: string;
  description: string;
  startTime: GameTime;
  duration?: number; // In minutes
  endTime?: GameTime;
  affectedLocations: string[]; // Location IDs
  affectedNPCs: string[]; // NPC IDs
  effects: WorldEventEffect[];
  resolution?: string;
  isActive: boolean;
}

/**
 * An effect of a world event
 */
export interface WorldEventEffect {
  type: 'weather' | 'encounter' | 'quest' | 'item' | 'dialogue' | 'other';
  description: string;
  mechanicalEffect?: string;
  duration?: number; // In minutes
  intensity: number; // 1-10 scale
}

export interface Location {
  id: string;                 // Unique identifier for the location
  name: string;
  description: string;
  connections: Map<string, string>;  // direction -> location name
  npcs: NPC[];
  items: Item[];
  isHostile: boolean;
  lighting: 'bright' | 'dim' | 'dark';
  terrain: string;
  effects?: EnvironmentalEffect[];
  type?: string;              // e.g., 'outdoor', 'building', 'room', 'dungeon'
  area?: string;              // e.g., 'town', 'forest', 'mountains'
}