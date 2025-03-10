/**
 * Location Interface
 * 
 * Defines the structure of locations in the game world.
 */

import { NPC } from './npc';
import { Item } from './item';
import { EnvironmentalEffect } from './combat';

/**
 * Represents a location in the game world
 */
export interface Location {
  id: string;                 // Unique identifier for the location
  name: string;               // Name of the location
  description: string;        // Detailed description of the location
  connections?: Map<string, string>;  // direction -> location id
  npcs?: NPC[] | Map<string, string>;   // Either an array of NPCs or a Map of NPC ID to location within this location
  items?: Item[];              // Items present at this location
  isHostile?: boolean;         // Whether the location is inherently hostile
  lighting?: LightingLevel;  // Lighting conditions
  terrain?: TerrainType;            // Type of terrain
  effects?: EnvironmentalEffect[];  // Environmental effects active at this location
  type?: LocationType;              // Type of location
  area?: string;              // e.g., 'town', 'forest', 'mountains'
  discovered?: boolean;       // Whether the player has discovered this location
  environment?: string;       // Detailed description of the environment
  points_of_interest?: PointOfInterest[];
  detailedDescription?: LocationDescription; // Detailed atmospheric description
  
  // Legacy support
  exits?: LocationExit[];
  npcsPresent?: string[];
  objectsPresent?: string[];
  isDiscovered?: boolean;
  regions?: string[];
}

/**
 * Lighting levels for a location
 */
export type LightingLevel = 'bright' | 'dim' | 'dark';

/**
 * Types of terrain in the game world
 */
export type TerrainType = 
  'urban' | 'forest' | 'mountain' | 'desert' | 'coastal' | 
  'underground' | 'dungeon' | 'plains' | 'swamp' | 'arctic' | 
  'jungle' | 'volcanic' | 'aquatic' | 'ethereal' | 'planar';

/**
 * Types of locations in the game world
 */
export type LocationType = 
  | 'town' 
  | 'city' 
  | 'village' 
  | 'dungeon' 
  | 'forest' 
  | 'mountain' 
  | 'cave' 
  | 'desert'
  | 'coast'
  | 'tavern'
  | 'shop'
  | 'temple'
  | 'castle'
  | 'ruin'
  | 'road'
  | 'river'
  | 'lake'
  | 'island'
  | 'battlefield'
  | 'camp'
  | 'wilderness'
  | 'settlement'
  | 'planar';

/**
 * Points of interest at a location
 */
export interface PointOfInterest {
  id: string;
  name: string;
  description: string;
  itemsOfInterest?: string[];
  interactions?: string[];
}

/**
 * Represents an exit from a location
 */
export interface LocationExit {
  direction: string;
  locationId: string;
  description?: string;
  isLocked?: boolean;
  keyId?: string;
}

/**
 * Represents a region in the game world
 */
export interface Region {
  id: string;
  name: string;
  description: string;
  locations: string[]; // Array of location IDs in this region
  climate: string;
  government?: string;
  population?: number;
  dangerLevel: number; // 1-10
}

/**
 * Detailed description of a location
 */
export interface LocationDescription {
  overview: string;
  visualDetails: string;
  soundDetails?: string;
  smellDetails?: string;
  atmosphereDetails?: string;
  weatherDetails?: string;
  timeOfDayDetails?: string;
  pointsOfInterestDetails?: Record<string, string>;
  history?: string;
  specialFeatures?: string[];
}

/**
 * Represents a connection between two locations
 */
export interface LocationConnection {
  from: string;
  to: string;
  direction: string;
  description: string;
  distance?: number; // in miles or other unit
  travelTime?: number; // in hours
  difficulty?: 'easy' | 'moderate' | 'difficult' | 'treacherous';
  isSecret?: boolean;
  isLocked?: boolean;
  keyId?: string;
  requiredSkillCheck?: {
    skill: string;
    dc: number;
  };
} 