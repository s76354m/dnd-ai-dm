// src/dm/index.ts

/**
 * DM Module
 * 
 * This module exports all AI-related components for the D&D AI DM system.
 * It provides access to both the base AI service and the enhanced version
 * with improved context management, specialized prompts, and validation.
 */

// Export base AI service
export { AIService } from './ai-service';

// Export enhanced AI service components
export { default as EnhancedAIService } from './enhanced-ai-service';
export { default as AIServiceAdapter } from './ai-service-adapter';

// Export AI integration utilities
export {
  createEnhancedAIService,
  enhanceDMEngine,
  syncAIServiceWithGameState,
  onGameStateChanged,
  DEFAULT_ENHANCEMENT_OPTIONS,
  AIEnhancementOptions
} from './ai-integration';

// Export context management
export { NarrativeContext } from './context/narrative-context';

// Export prompt templates
export { 
  PromptTemplate, 
  PROMPT_TEMPLATES 
} from './prompts/prompt-templates';

// Export validation
export { 
  ResponseValidator,
  ValidationOptions,
  ValidationResult,
  ValidationIssue,
  ValidationIssueType,
  DEFAULT_VALIDATION_OPTIONS
} from './validation/response-validator';

/**
 * Create a new enhanced AI service with default options
 * 
 * This is a convenience function to quickly create an enhanced
 * AI service with reasonable default options.
 * 
 * @returns A new enhanced AI service
 */
export function createDefaultEnhancedAIService(): EnhancedAIService {
  const { AIService } = require('./ai-service');
  const { default: EnhancedAIService } = require('./enhanced-ai-service');
  
  const baseService = new AIService();
  return new EnhancedAIService(baseService);
}

// Default export for convenience
export default {
  createDefaultEnhancedAIService,
  AIService: require('./ai-service').AIService,
  EnhancedAIService: require('./enhanced-ai-service').default,
  AIServiceAdapter: require('./ai-service-adapter').default,
  ResponseValidator: require('./validation/response-validator').ResponseValidator
};

/**
 * DM Module
 * 
 * The DM module provides AI-powered dungeon master functionality for text-based
 * D&D campaigns. It leverages advanced language models to generate responsive
 * narrative content, dialogue, and game elements.
 * 
 * Key components:
 * 
 * - AIService: Service for generating AI responses using either OpenAI or Anthropic
 *   models. The service is configurable to use different models for different
 *   game components (narrative, NPC dialogue, combat, quests).
 * 
 * - AIDungeonMaster: The core DM engine that implements the DMEngine interface.
 *   Manages game state, processes player commands, and orchestrates the overall
 *   game experience.
 * 
 * Features:
 * - Natural language command processing
 * - Dynamic narrative generation
 * - NPC interaction with contextual awareness
 * - Quest generation and management
 * - Location descriptions
 * - Combat narration
 * 
 * The module is designed to be configurable through environment variables,
 * allowing selection of AI providers and models for different aspects of the game.
 */ 