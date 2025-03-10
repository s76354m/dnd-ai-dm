/**
 * Event Interfaces
 * 
 * Defines interfaces for the event system.
 */

/**
 * Interface for game events
 */
export interface GameEvent {
  /** Type of event */
  type: string;
  /** Timestamp when the event occurred */
  timestamp: number;
  /** Human-readable description of the event */
  description: string;
  /** Additional data associated with the event */
  data?: any;
}

// Define common event types as constants
export const EVENT_TYPES = {
  // Game flow events
  GAME_STARTED: 'GAME_STARTED',
  GAME_SAVED: 'GAME_SAVED',
  GAME_LOADED: 'GAME_LOADED',
  
  // Player events
  PLAYER_MOVED: 'PLAYER_MOVED',
  PLAYER_RESTED: 'PLAYER_RESTED',
  PLAYER_LEVELED_UP: 'PLAYER_LEVELED_UP',
  PLAYER_DIED: 'PLAYER_DIED',
  
  // Interaction events
  PLAYER_TALKED_TO_NPC: 'PLAYER_TALKED_TO_NPC',
  ITEM_PICKED_UP: 'ITEM_PICKED_UP',
  ITEM_DROPPED: 'ITEM_DROPPED',
  ITEM_USED: 'ITEM_USED',
  ITEM_EQUIPPED: 'ITEM_EQUIPPED',
  ITEM_UNEQUIPPED: 'ITEM_UNEQUIPPED',
  
  // Combat events
  COMBAT_INITIATED: 'COMBAT_INITIATED',
  COMBAT_ENDED: 'COMBAT_ENDED',
  ATTACK_HIT: 'ATTACK_HIT',
  ATTACK_MISSED: 'ATTACK_MISSED',
  CREATURE_DEFEATED: 'CREATURE_DEFEATED',
  
  // Quest events
  QUEST_STARTED: 'QUEST_STARTED',
  QUEST_UPDATED: 'QUEST_UPDATED',
  QUEST_COMPLETED: 'QUEST_COMPLETED',
  QUEST_FAILED: 'QUEST_FAILED',
  
  // Magic events
  SPELL_CAST: 'SPELL_CAST',
  MAGICAL_EFFECT_APPLIED: 'MAGICAL_EFFECT_APPLIED',
  MAGICAL_EFFECT_REMOVED: 'MAGICAL_EFFECT_REMOVED',
  
  // World events
  LOCATION_DISCOVERED: 'LOCATION_DISCOVERED',
  TIME_PASSED: 'TIME_PASSED',
  WEATHER_CHANGED: 'WEATHER_CHANGED'
}; 