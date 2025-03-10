/**
 * NPC Module
 * 
 * This module provides a comprehensive system for NPC management, dialogue,
 * and interactions with enhanced memory and personality features.
 */

// Export the primary classes
export { NPCManager } from './npc-manager';
export { ConversationManager, DialogueResult } from './conversation-manager';
export { DialogueGenerator } from './dialogue-generator';
export { NPCScheduler, ScheduleUpdateResult } from './npc-scheduler';
export { createDefaultSchedule, getScheduleForNPCType } from './default-schedules';

// Re-export core interfaces for convenience
export {
  NPC,
  NPCMemory,
  NPCPersonality,
  NPCMemoryEvent,
  DialogueHistoryEntry,
  PersonalityTrait,
  PersonalityFlaw,
  NPCSchedule,
  NPCStats,
  createDefaultNPCMemory,
  createDefaultPersonality
} from '../../core/interfaces/npc';

// Documentation for the NPC module
/**
 * NPC Module Documentation
 * 
 * The NPC module provides a complete system for managing non-player characters
 * in the D&D AI DM application. The system includes:
 * 
 * - NPC management and persistence
 * - Dynamic NPC dialogue generation using AI
 * - Memory system for tracking player-NPC interactions
 * - Relationship tracking and personality traits
 * - Support for dialogue trees with branching conversations
 * - Skill check integration for persuasion, intimidation, etc.
 * - Quest integration for NPCs that offer quests
 * - NPC scheduling with time-based activities and location changes
 * 
 * Core Components:
 * 
 * 1. NPCManager - Central class for managing all NPCs in the game world
 *    - Creates and stores NPCs
 *    - Manages NPC data persistence
 *    - Coordinates between NPCs and other game systems
 * 
 * 2. ConversationManager - Manages dialogue interactions with NPCs
 *    - Tracks conversation state
 *    - Handles dialogue trees and responses
 *    - Manages NPC memory and relationships
 * 
 * 3. DialogueGenerator - Generates dynamic dialogue using AI
 *    - Creates contextual NPC dialogue based on personality
 *    - Generates appropriate response options for players
 *    - Provides fallbacks for AI generation failures
 *
 * 4. NPCScheduler - Manages NPC daily routines and location changes
 *    - Updates NPC locations based on time of day
 *    - Creates realistic schedules for different NPC types
 *    - Supports special appointments and weekly schedule variations
 * 
 * Usage Example:
 * 
 * ```typescript
 * // Initialize the NPC system
 * const npcManager = new NPCManager(player, aiService);
 * 
 * // Create an NPC
 * const innkeeper = npcManager.createNPC(
 *   'Gwendolyn',
 *   'human',
 *   'A friendly innkeeper with a warm smile.',
 *   'friendly',
 *   'tavern_location_id',
 *   true, // isQuestGiver
 *   'Innkeeper'
 * );
 * 
 * // Set up NPC scheduling
 * const scheduler = new NPCScheduler(npcManager, worldManager);
 * scheduler.initializeNPCSchedule(innkeeper);
 * 
 * // When game time advances
 * worldManager.advanceTime(60); // Advance 1 hour
 * const updates = scheduler.updateNPCLocations(worldManager.getWorldTime());
 * 
 * // Start a conversation with the NPC
 * const dialogueResult = await npcManager.startConversation(innkeeper.id);
 * console.log(dialogueResult.text); // NPC's opening dialogue
 * 
 * // Select a response
 * const response = await npcManager.selectDialogueResponse(
 *   innkeeper.id,
 *   dialogueResult.availableResponses[0].id
 * );
 * ```
 */ 