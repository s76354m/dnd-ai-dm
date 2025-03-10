/**
 * Game Modes and Settings Interfaces
 * 
 * Provides type definitions for game modes, settings, and events.
 */

/**
 * Game modes available in the application
 */
export type GameMode = 'exploration' | 'combat' | 'dialogue' | 'rest' | 'travel' | 'shopping' | 'character_creation';

/**
 * Game settings that control various aspects of the game
 */
export interface GameSettings {
  difficulty: 'easy' | 'normal' | 'hard';
  narrativeStyle: 'descriptive' | 'concise' | 'dramatic';
  combatComplexity: 'simple' | 'standard' | 'tactical';
  autosaveFrequency: number; // in minutes
  enableTutorials: boolean;
  showDiceRolls: boolean;
  enablePermadeath: boolean;
  autoRest: boolean;
  aiVerbosity: 'minimal' | 'standard' | 'detailed';
  enableAmbientSounds: boolean;
  customRules?: Record<string, any>;
}

/**
 * Represents a significant event that occurred during gameplay
 */
export interface GameEvent {
  type: 'combat' | 'quest' | 'discovery' | 'dialogue' | 'item' | 'level_up' | 'rest' | 'travel' | 'death' | 'custom';
  subtype?: string;
  timestamp: number;
  description: string;
  location?: string;
  involvedEntities?: string[];
  outcomes?: string[];
  xpGained?: number;
  itemsGained?: string[];
  itemsLost?: string[];
  data?: Record<string, any>;
} 