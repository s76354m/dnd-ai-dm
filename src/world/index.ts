/**
 * World Module
 * 
 * This module provides functionality for managing and generating the game world.
 * It includes a procedural world generator and a manager for handling navigation
 * and world state changes.
 */

export { WorldGenerator, WorldRegion, LocationTemplate, LocationType, TerrainType, LightingLevel, LocationMood, TimeOfDay, WeatherCondition } from './generator';
export { WorldManager } from './manager';

// World module constants
export const WORLD_CONFIG = {
  // Default parameters for world generation
  DEFAULT_REGION_NAME: 'Evendale',
  DEFAULT_DANGER_LEVEL: 2,
  DEFAULT_TERRAIN: 'urban' as const,
  
  // Time settings
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAWN_START: 5, // 5:00 AM
  DAWN_END: 8,   // 8:00 AM
  DUSK_START: 18, // 6:00 PM
  DUSK_END: 21,   // 9:00 PM
  
  // Travel times (in minutes)
  TRAVEL_TIME: {
    URBAN: 10,
    FOREST: 20,
    MOUNTAIN: 30,
    DESERT: 25,
    SWAMP: 35,
    PLAINS: 15,
    COASTAL: 15,
    UNDERGROUND: 20
  },
  
  // Weather change probabilities (0-1)
  WEATHER_CHANGE_PROBABILITY: 0.2,
  WEATHER_TYPES: ['clear', 'cloudy', 'rainy', 'foggy', 'stormy']
}; 