/**
 * Quest Module
 * 
 * Provides functionality for quest management, generation, and tracking.
 * Integrates with NPCs for quest giving and completion.
 */

// Export the QuestManager class and related interfaces
export { QuestManager, QuestCreationResult, QuestUpdateResult } from './quest-manager';

// Re-export core quest interfaces for convenience
export { Quest, QuestObjective, QuestReward } from '../core/interfaces/quest';

/**
 * Quest Module Documentation
 * 
 * The Quest Module provides a complete system for managing quests in the D&D AI DM
 * application. It integrates with the NPC system to create a cohesive quest experience.
 * 
 * Core Features:
 * 
 * - AI-powered quest generation based on NPC characteristics
 * - Quest tracking and progress updates
 * - Quest completion and reward handling
 * - Integration with NPCs for quest giving and completion recognition
 * - Objective tracking for different quest types (kill, collect, interact, explore)
 * 
 * Usage Example:
 * 
 * ```typescript
 * // Initialize the quest manager
 * const questManager = new QuestManager(player, aiService);
 * 
 * // Connect with NPC manager for integrated functionality
 * questManager.connectNPCManager(npcManager);
 * 
 * // Accept a quest from an NPC
 * const questResult = await questManager.acceptQuestFromNPC(npcId);
 * if (questResult.success) {
 *   console.log(`New quest accepted: ${questResult.quest.title}`);
 *   
 *   // Later, update quest progress
 *   questManager.updateQuestProgress(
 *     questResult.quest.id,
 *     questResult.quest.objectives[0].id,
 *     1
 *   );
 * }
 * ```
 */ 