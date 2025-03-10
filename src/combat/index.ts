/**
 * Combat System Index
 * 
 * Exports all combat-related components and provides integration between
 * the combat system, enhanced AI narration, tactical decision-making,
 * spellcasting system, and item usage system.
 */

import { createCombatManager, CombatManager } from './combat-manager';
import { createEncounterManager, EncounterManager } from './encounter-manager';
import { createEnemyManager, EnemyManager } from './enemy-manager';
import { SpellEffectManager } from './spell-effects';
import { createSpellcastingManager, SpellcastingManager } from '../character/spellcasting-manager';
import { createItemUsageManager, ItemUsageManager } from '../character/item-usage-manager';
import { InventoryManager } from '../character/inventory';
import { EnhancedCombatNarration } from './enhanced-combat-narration';
import { createTacticalAI, TacticalAI } from './tactical-ai';
import { AIService } from '../dm/ai-service';
import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';

/**
 * Integrated combat system with AI enhancements
 */
export interface CombatSystem {
  combatManager: CombatManager;
  encounterManager: EncounterManager;
  enemyManager: EnemyManager;
  spellEffectManager: SpellEffectManager;
  spellcastingManager: SpellcastingManager;
  itemUsageManager: ItemUsageManager;
  enhancedNarration: EnhancedCombatNarration;
  tacticalAI: TacticalAI;
}

/**
 * Initialize the combat system with all required managers and AI components
 * @param inventoryManager Inventory manager instance
 * @param aiService AI service for enhanced narration and tactical decision-making
 */
export function initializeCombatSystem(
  inventoryManager: InventoryManager,
  aiService: AIService
): CombatSystem {
  // Create the spell effect manager
  const spellEffectManager = new SpellEffectManager();
  
  // Create the spellcasting manager
  const spellcastingManager = createSpellcastingManager(spellEffectManager);
  
  // Create the item usage manager
  const itemUsageManager = createItemUsageManager(inventoryManager);
  
  // Create enemy manager
  const enemyManager = createEnemyManager();
  
  // Create enhanced combat narration
  const enhancedNarration = new EnhancedCombatNarration(aiService);
  
  // Create tactical AI for enemy decision-making
  const tacticalAI = createTacticalAI(aiService, enemyManager);
  
  // Create encounter manager
  const encounterManager = createEncounterManager(enemyManager);
  
  // Create combat manager with all dependencies
  const combatManager = createCombatManager(
    enemyManager, 
    spellEffectManager,
    spellcastingManager,
    itemUsageManager,
    aiService
  );
  
  return {
    combatManager,
    encounterManager,
    enemyManager,
    spellEffectManager,
    spellcastingManager,
    itemUsageManager,
    enhancedNarration,
    tacticalAI
  };
}

/**
 * Creates a simplified combat system with just the core components
 * Useful for basic testing and minimal implementations
 * 
 * @param player The player character
 * @param aiService The AI service for combat narration
 * @returns An object containing core combat managers
 */
export function createCombatSystem(player: Character, aiService: AIService) {
  const enemyManager = createEnemyManager();
  const encounterManager = createEncounterManager(enemyManager);
  
  // Create enhanced narration
  const enhancedNarration = new EnhancedCombatNarration(aiService);
  
  // Create tactical AI
  const tacticalAI = createTacticalAI(aiService, enemyManager);
  
  // Create item and spell managers (minimal implementations)
  const inventoryManager = new InventoryManager();
  const spellEffectManager = new SpellEffectManager();
  const spellcastingManager = createSpellcastingManager(spellEffectManager);
  const itemUsageManager = createItemUsageManager(inventoryManager);
  
  const combatManager = createCombatManager(
    enemyManager,
    spellEffectManager,
    spellcastingManager,
    itemUsageManager,
    aiService
  );
  
  return {
    combatManager,
    enemyManager,
    encounterManager,
    enhancedNarration,
    tacticalAI
  };
}

// Export individual managers and types
export * from './combat-manager';
export * from './encounter-manager';
export * from './enemy-manager';
export * from './spell-effects';
export { SpellcastingManager } from '../character/spellcasting-manager';
export { ItemUsageManager } from '../character/item-usage-manager';

/**
 * Combat Module
 * 
 * This module provides functionality for turn-based combat, including initiative tracking,
 * attack resolution, and encounter management.
 */

// Export the main combat classes
export { CombatManager, CombatActionResult } from './combat-manager';
export { EnemyManager, EnemyType } from './enemy-manager';
export { EncounterManager, Encounter, EncounterDifficulty } from './encounter-manager';
export { 
  SpellEffectManager, 
  CombatSpell, 
  SpellCastResult, 
  SpellTarget, 
  SpellEffectType, 
  SpellDamageType 
} from './spell-effects';

// Re-export core interfaces for convenience
export { CombatState, CombatParticipant, CombatEffect, EnvironmentalEffect } from '../core/interfaces/combat';

// Utility functions for combat operations
import { CombatManager } from './combat-manager';
import { EnemyManager } from './enemy-manager';
import { EncounterManager } from './encounter-manager';
import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';
import { AIService } from '../dm/ai-service';

/**
 * Quickly creates and starts a combat encounter with specified enemies
 * 
 * @param encounterManager The encounter manager instance
 * @param enemies Array of enemy NPCs
 * @param locationId Current location ID
 * @param encounterName Optional custom name for the encounter
 * @returns A string describing the start of combat
 */
export function startCombatWith(
  encounterManager: EncounterManager,
  enemies: NPC[],
  locationId: string,
  encounterName?: string
): string {
  const name = encounterName || `Battle with ${enemies.map(e => e.name).join(' and ')}`;
  const description = `You've encountered ${enemies.length === 1 ? 'an enemy' : 'a group of enemies'}.`;
  
  // Create the encounter
  const encounter = encounterManager.createEncounter(
    name,
    description,
    enemies,
    locationId,
    'medium',
    false
  );
  
  // Start the encounter
  return encounterManager.startEncounter(encounter.id);
}

/**
 * Combat Module Documentation
 * 
 * The Combat Module provides a comprehensive system for managing turn-based combat in the 
 * D&D AI DM application. It integrates with the character and NPC systems to create 
 * interactive combat experiences.
 * 
 * Core Features:
 * 
 * - Turn-based combat with initiative tracking
 * - Attack resolution with hit calculations and damage
 * - Spell casting with various effects (damage, healing, buffs, debuffs)
 * - Enemy generation with appropriate stats based on player level
 * - Encounter management with XP rewards
 * - Combat narration with AI-enhanced descriptions
 * 
 * Main Components:
 * 
 * 1. CombatManager
 *    - Handles combat state and turn mechanics
 *    - Manages initiative order and turn progression
 *    - Processes combat actions like attacks and spells
 *    - Tracks hit points and combat effects
 * 
 * 2. EnemyManager
 *    - Creates enemies with appropriate stats
 *    - Scales enemies based on player level
 *    - Provides a variety of enemy types
 * 
 * 3. EncounterManager
 *    - Creates and manages combat encounters
 *    - Handles encounter difficulty and XP rewards
 *    - Controls the flow of combat turns
 *    - Integrates AI for enhanced combat narration
 * 
 * 4. SpellEffectManager
 *    - Handles spell casting in combat
 *    - Manages various spell effects (damage, healing, buffs, debuffs)
 *    - Implements saving throws and area effects
 *    - Creates environmental effects from spells
 * 
 * Usage Example:
 * 
 * ```typescript
 * // Initialize the encounter manager
 * const encounterManager = new EncounterManager(player, aiService);
 * 
 * // Generate a random encounter
 * const encounter = encounterManager.generateRandomEncounter(
 *   currentLocation.id,
 *   'medium'
 * );
 * 
 * // Start the encounter
 * const startResult = encounterManager.startEncounter(encounter.id);
 * console.log(startResult);
 * 
 * // Process combat actions
 * const actionResult = await encounterManager.processCombatAction(
 *   'attack',
 *   enemyId
 * );
 * console.log(actionResult);
 * 
 * // Cast a spell in combat
 * const spellResult = await encounterManager.processCombatAction(
 *   'cast',
 *   enemyId,
 *   'Magic Missile'
 * );
 * console.log(spellResult);
 * ```
 */ 