/**
 * Context Integration
 * 
 * This file provides utilities to integrate the enhanced context management system
 * with the existing AI service architecture.
 */

import { AIService } from '../ai-service-wrapper';
import { EnhancedContextManager, EnhancedContextManagerConfig } from '../enhanced-context-manager';
import { EnhancedAIService } from '../enhanced-ai-service';
import { GameState } from '../../simple-main';
import { GameScenario } from '../memory/context-optimizer';

/**
 * Integration configuration options
 */
export interface ContextIntegrationOptions {
  /**
   * Enable all enhanced context features
   */
  enableEnhancedContext: boolean;
  
  /**
   * Configuration for the enhanced context manager
   */
  contextManagerConfig?: Partial<EnhancedContextManagerConfig>;
  
  /**
   * Whether to log detailed debug information
   */
  debug?: boolean;
}

/**
 * Default integration options
 */
const DEFAULT_INTEGRATION_OPTIONS: ContextIntegrationOptions = {
  enableEnhancedContext: true,
  contextManagerConfig: {
    maxTotalTokens: 4000,
    enableMemoryPrioritization: true,
    enableRelationshipTracking: true,
    enableContextOptimization: true,
    enablePromptTemplates: true,
    debugMode: false
  },
  debug: false
};

/**
 * Integrate enhanced context management with an existing AI service
 * 
 * @param baseService The base AI service
 * @param options Integration options
 * @returns The enhanced AI service with context management
 */
export function integrateEnhancedContext(
  baseService: AIService,
  options: Partial<ContextIntegrationOptions> = {}
): EnhancedAIService {
  // Merge options with defaults
  const config: ContextIntegrationOptions = {
    ...DEFAULT_INTEGRATION_OPTIONS,
    ...options,
    contextManagerConfig: {
      ...DEFAULT_INTEGRATION_OPTIONS.contextManagerConfig,
      ...options.contextManagerConfig
    }
  };
  
  if (config.debug) {
    console.log('Integrating enhanced context management with options:', config);
  }
  
  // Create enhanced service
  const enhancedService = new EnhancedAIService(baseService, {
    enableContextManagement: config.enableEnhancedContext,
    maxTokens: config.contextManagerConfig?.maxTotalTokens || 4000,
    includeCharacterDetails: true,
    includeLocationDetails: true,
    includeActiveQuests: true,
    includeRecentEvents: true,
    validateResponses: true,
    strictnessLevel: 'medium',
    debugMode: config.debug
  });
  
  if (config.debug) {
    console.log('Enhanced AI service created with context management');
  }
  
  return enhancedService;
}

/**
 * Update the game state in all relevant context management systems
 * 
 * @param enhancedService The enhanced AI service
 * @param gameState The current game state
 * @param scenario Optional explicit scenario to set
 */
export function updateContextWithGameState(
  enhancedService: EnhancedAIService,
  gameState: GameState,
  scenario?: GameScenario
): void {
  // Set the game state in the enhanced service
  enhancedService.setGameState(gameState);
  
  // If a specific scenario was provided, set it
  if (scenario) {
    enhancedService.setScenario(scenario);
  }
  
  // Get access to the context manager for more detailed updates
  const contextManager = enhancedService.getContextManager();
  
  // Update entity tracking
  const entities = extractEntitiesFromGameState(gameState);
  contextManager.updateCurrentEntities(entities);
}

/**
 * Extract relevant entities from game state for context relevance
 * 
 * @param gameState The current game state
 * @returns Array of entity names
 */
function extractEntitiesFromGameState(gameState: GameState): string[] {
  const entities: string[] = [];
  
  // Add player character
  if (gameState.player && gameState.player.name) {
    entities.push(gameState.player.name);
  }
  
  // Add NPCs in current location
  if (gameState.npcs && gameState.currentLocation) {
    const npcsInLocation = gameState.npcs.filter(
      npc => npc.locationId === gameState.currentLocation.id
    );
    
    entities.push(...npcsInLocation.map(npc => npc.name));
  }
  
  // Add location name
  if (gameState.currentLocation && gameState.currentLocation.name) {
    entities.push(gameState.currentLocation.name);
  }
  
  // Add quest givers for active quests
  if (gameState.quests) {
    const activeQuestGivers = gameState.quests
      .filter(quest => quest.status === 'active')
      .map(quest => quest.giver);
    
    entities.push(...activeQuestGivers);
  }
  
  return entities;
}

/**
 * Record narrative events to build game history in the context manager
 * 
 * @param enhancedService The enhanced AI service
 * @param content The narrative content to record
 * @param importance The importance of this memory (1-10)
 */
export function recordNarrativeMemory(
  enhancedService: EnhancedAIService,
  content: string,
  importance: number = 5
): void {
  enhancedService.addMemory(content, importance);
}

/**
 * Record an interaction between characters
 * 
 * @param enhancedService The enhanced AI service
 * @param initiator The character initiating the interaction
 * @param target The target of the interaction
 * @param type The type of interaction
 * @param description A description of what happened
 * @param impact The emotional impact/significance (0-10)
 */
export function recordCharacterInteraction(
  enhancedService: EnhancedAIService,
  initiator: string,
  target: string,
  type: string,
  description: string,
  impact: number
): void {
  enhancedService.recordInteraction(
    initiator,
    target,
    type,
    description,
    impact
  );
}

/**
 * Apply decay to memories and relationships
 * Call this during long rests or significant time passages in the game
 * 
 * @param enhancedService The enhanced AI service
 */
export function applyContextDecay(enhancedService: EnhancedAIService): void {
  enhancedService.applyDecay();
} 