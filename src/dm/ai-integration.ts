/**
 * AI Integration Module
 * 
 * This module provides functions to integrate the Enhanced AI Service into
 * the application. It handles setting up the enhanced AI service with the
 * adapter pattern and updating the game's DM engine to use the enhanced service.
 */

import { AIService } from './ai-service';
import { AIServiceAdapter } from './ai-service-adapter';
import { EnhancedAIService } from './enhanced-ai-service';
import { GameState } from '../core/interfaces/game';
import { AIDMEngine } from '../core/engine';
import { AIConfig } from '../config/ai-config';

/**
 * Options for creating an enhanced AI service
 */
export interface AIEnhancementOptions {
  enableContextManagement: boolean;
  maxHistoryItems: number;
  includeCharacterDetails: boolean;
  includeLocationDetails: boolean;
  includeActiveQuests: boolean;
  includeRecentCombats: boolean;
  validateResponses: boolean;
  strictnessLevel: 'low' | 'medium' | 'high';
  debugMode: boolean;
}

/**
 * Default enhancement options
 */
export const DEFAULT_ENHANCEMENT_OPTIONS: AIEnhancementOptions = {
  enableContextManagement: true,
  maxHistoryItems: 20,
  includeCharacterDetails: true,
  includeLocationDetails: true,
  includeActiveQuests: true,
  includeRecentCombats: true,
  validateResponses: true,
  strictnessLevel: 'medium',
  debugMode: false
};

/**
 * Create an enhanced AI service using the adapter pattern
 * 
 * @param baseService The original AI service to enhance
 * @param options Options for the enhanced service
 * @returns An AI service adapter that wraps the enhanced service
 */
export function createEnhancedAIService(
  baseService: AIService, 
  options: Partial<AIEnhancementOptions> = {}
): AIServiceAdapter {
  // Merge with default options
  const enhancementOptions = { ...DEFAULT_ENHANCEMENT_OPTIONS, ...options };
  
  // Convert options to the format expected by EnhancedAIService
  const serviceOptions = {
    contextConfig: {
      maxHistoryItems: enhancementOptions.maxHistoryItems,
      includeCharacterDetails: enhancementOptions.includeCharacterDetails,
      includeLocationDetails: enhancementOptions.includeLocationDetails,
      includeActiveQuests: enhancementOptions.includeActiveQuests,
      includeRecentCombats: enhancementOptions.includeRecentCombats
    },
    validationConfig: {
      checkInconsistencies: enhancementOptions.validateResponses,
      checkRules: enhancementOptions.validateResponses,
      checkWorldConsistency: enhancementOptions.validateResponses,
      checkNarrativeTone: enhancementOptions.validateResponses,
      checkFactualAccuracy: enhancementOptions.validateResponses,
      checkCharacterConsistency: enhancementOptions.validateResponses,
      checkCompleteness: enhancementOptions.validateResponses,
      strictnessLevel: enhancementOptions.strictnessLevel
    },
    debug: enhancementOptions.debugMode
  };
  
  // Create and return the adapter
  return new AIServiceAdapter(baseService, serviceOptions);
}

/**
 * Update the DM engine to use the enhanced AI service
 * 
 * @param dmEngine The DM engine to update
 * @param config AI configuration
 * @param options Enhancement options
 * @returns The updated DM engine
 */
export async function enhanceDMEngine(
  dmEngine: AIDMEngine,
  config?: Partial<AIConfig>,
  options?: Partial<AIEnhancementOptions>
): Promise<AIDMEngine> {
  // Get the current game state
  const gameState = dmEngine.getGameState();
  
  // Create a new base AI service
  const baseService = new AIService();
  
  // If config is provided, update the service config
  if (config) {
    baseService.updateConfig(config);
  }
  
  // Create the enhanced service
  const enhancedService = createEnhancedAIService(baseService, options);
  
  // Set the game state in the adapter
  enhancedService.setGameState(gameState);
  
  // Replace the AI service in the DM engine
  // This assumes there's a setAIService method or similar in the DM engine
  // If not, this would need to be adjusted based on how the DM engine uses the AI service
  if ('setAIService' in dmEngine) {
    (dmEngine as any).setAIService(enhancedService);
  } else {
    // Alternative approach if no setter exists
    // This is a more invasive approach that directly modifies the engine's private property
    // Only use if necessary
    (dmEngine as any)['aiService'] = enhancedService;
  }
  
  return dmEngine;
}

/**
 * Keep the AI service adapter in sync with game state changes
 * 
 * @param adapter The AI service adapter
 * @param gameState The current game state
 */
export function syncAIServiceWithGameState(
  adapter: AIServiceAdapter,
  gameState: GameState
): void {
  adapter.setGameState(gameState);
}

/**
 * Hook to call when the game state changes to keep AI context up to date
 * 
 * @param adapter The AI service adapter
 * @param gameState The current game state
 * @param reason Description of what changed (for debugging)
 */
export function onGameStateChanged(
  adapter: AIServiceAdapter,
  gameState: GameState,
  reason: string
): void {
  // Update the game state in the adapter
  adapter.setGameState(gameState);
  
  // If we want to log state changes when debugging
  const enhancedService = adapter.getEnhancedService();
  if (enhancedService['options']?.debug) {
    console.log(`[AIIntegration] Game state updated: ${reason}`);
  }
}

export default {
  createEnhancedAIService,
  enhanceDMEngine,
  syncAIServiceWithGameState,
  onGameStateChanged,
  DEFAULT_ENHANCEMENT_OPTIONS
}; 