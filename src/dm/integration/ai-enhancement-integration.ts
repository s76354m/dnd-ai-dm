/**
 * AI Enhancement Integration
 * 
 * This module integrates the advanced AI enhancement components:
 * - Combat Context Manager
 * - Advanced Prompt Templates
 * - Enhanced Response Validator
 * 
 * It provides functions to connect these components to the existing AI integration system.
 */

import { AIService } from '../ai-service';
import { AIServiceAdapter } from '../ai-service-adapter';
import { EnhancedAIService } from '../enhanced-ai-service';
import { GameState } from '../../core/interfaces/game';
import { AIDMEngine } from '../../core/engine';
import { CombatContext } from '../context/combat-context';
import { createPromptTemplate, PromptComponent } from '../prompts/advanced-prompt-templates';
import EnhancedResponseValidator, { ValidationOptions } from '../validation/enhanced-response-validator';
import { AIEnhancementOptions, DEFAULT_ENHANCEMENT_OPTIONS } from '../ai-integration';
import { LocationContext } from '../context/location-context';
import { NPCMemoryManager } from '../npc/npc-memory';
import { NPCPersonalityConsistencyTracker } from '../npc/personality-consistency';

/**
 * Enhanced AI integration options
 */
export interface AdvancedAIEnhancementOptions extends AIEnhancementOptions {
  // Combat context specific options
  combatContext?: {
    maxRoundsToTrack: number;
    includeActorDetails: boolean;
    includeTargetDetails: boolean;
    includeEnvironmentDetails: boolean;
    includeTacticalSuggestions: boolean;
  };
  
  // Advanced prompt template options
  promptTemplates?: {
    useAdvancedTemplates: boolean;
    defaultStyle?: {
      tone: string;
      verbosity: number;
      language: string;
      perspective: string;
      emphasis: string;
    };
    components?: PromptComponent[];
  };
  
  // Enhanced validator options
  enhancedValidation?: {
    useEnhancedValidator: boolean;
    worldConsistencyCheck: boolean;
    characterConsistencyCheck: boolean;
    ruleAccuracyCheck: boolean;
    narrativeQualityCheck: boolean;
    toneCheck: boolean;
    minValidationScore: number;
  };
}

/**
 * Default options for advanced AI enhancements
 */
export const DEFAULT_ADVANCED_OPTIONS: AdvancedAIEnhancementOptions = {
  ...DEFAULT_ENHANCEMENT_OPTIONS,
  combatContext: {
    maxRoundsToTrack: 3,
    includeActorDetails: true,
    includeTargetDetails: true,
    includeEnvironmentDetails: true,
    includeTacticalSuggestions: true
  },
  promptTemplates: {
    useAdvancedTemplates: true,
    defaultStyle: {
      tone: 'immersive',
      verbosity: 2,
      language: 'descriptive',
      perspective: 'second-person',
      emphasis: 'balanced'
    },
    components: [
      'narrative', 'combat', 'location', 'npc', 
      'quest', 'spell', 'item', 'exploration'
    ]
  },
  enhancedValidation: {
    useEnhancedValidator: true,
    worldConsistencyCheck: true,
    characterConsistencyCheck: true,
    ruleAccuracyCheck: true,
    narrativeQualityCheck: true,
    toneCheck: true,
    minValidationScore: 70
  }
};

/**
 * Enhanced AI Service that integrates all advanced components
 */
export class AdvancedEnhancedAIService extends EnhancedAIService {
  private combatContext: CombatContext;
  private enhancedValidator: EnhancedResponseValidator;
  private advancedOptions: AdvancedAIEnhancementOptions;
  private advancedPromptTemplates: Map<PromptComponent, any> = new Map();
  
  /**
   * Create a new advanced enhanced AI service
   * 
   * @param baseService The underlying AI service
   * @param options Advanced enhancement options
   */
  constructor(
    baseService: AIService,
    options: Partial<AdvancedAIEnhancementOptions> = {}
  ) {
    // Initialize base enhanced service with standard options
    super(baseService, {
      contextConfig: options.contextConfig,
      validationConfig: options.validationConfig,
      debug: options.debug
    });
    
    // Store the complete options
    this.advancedOptions = { ...DEFAULT_ADVANCED_OPTIONS, ...options };
    
    // Initialize combat context
    this.combatContext = new CombatContext({
      maxRoundsToTrack: this.advancedOptions.combatContext?.maxRoundsToTrack ?? 3,
      includeActorDetails: this.advancedOptions.combatContext?.includeActorDetails ?? true,
      includeTargetDetails: this.advancedOptions.combatContext?.includeTargetDetails ?? true,
      includeEnvironmentDetails: this.advancedOptions.combatContext?.includeEnvironmentDetails ?? true,
      includeTacticalSuggestions: this.advancedOptions.combatContext?.includeTacticalSuggestions ?? true
    });
    
    // Initialize enhanced validator
    this.enhancedValidator = new EnhancedResponseValidator({
      worldConsistencyCheck: this.advancedOptions.enhancedValidation?.worldConsistencyCheck ?? true,
      characterConsistencyCheck: this.advancedOptions.enhancedValidation?.characterConsistencyCheck ?? true,
      ruleAccuracyCheck: this.advancedOptions.enhancedValidation?.ruleAccuracyCheck ?? true,
      narrativeQualityCheck: this.advancedOptions.enhancedValidation?.narrativeQualityCheck ?? true,
      toneCheck: this.advancedOptions.enhancedValidation?.toneCheck ?? true,
      minValidationScore: this.advancedOptions.enhancedValidation?.minValidationScore ?? 70
    });
    
    // Initialize advanced prompt templates if enabled
    if (this.advancedOptions.promptTemplates?.useAdvancedTemplates) {
      this.initializeAdvancedPromptTemplates();
    }
  }
  
  /**
   * Initialize advanced prompt templates for all specified components
   */
  private initializeAdvancedPromptTemplates(): void {
    const components = this.advancedOptions.promptTemplates?.components ?? [];
    const defaultStyle = this.advancedOptions.promptTemplates?.defaultStyle;
    
    for (const component of components) {
      const template = createPromptTemplate(component, {
        tone: defaultStyle?.tone,
        verbosity: defaultStyle?.verbosity,
        language: defaultStyle?.language,
        perspective: defaultStyle?.perspective,
        emphasis: defaultStyle?.emphasis
      });
      
      this.advancedPromptTemplates.set(component, template);
    }
  }
  
  /**
   * Set the game state for all components
   * 
   * @param gameState Current game state
   */
  public setGameState(gameState: GameState): void {
    super.setGameState(gameState);
    
    // Also update the enhanced validator
    if (this.advancedOptions.enhancedValidation?.useEnhancedValidator) {
      this.enhancedValidator.setGameState(gameState);
    }
  }
  
  /**
   * Add a combat action to the combat context
   * 
   * @param round Combat round
   * @param turn Turn within the round
   * @param action Combat action
   * @param result Action result
   * @param gameState Current game state
   */
  public addCombatAction(
    round: number,
    turn: number,
    action: any, // Using any here to avoid having to import all combat types
    result: any,
    gameState: GameState
  ): void {
    this.combatContext.addAction(round, turn, action, result, gameState);
  }
  
  /**
   * Generate combat narration using the enhanced combat context
   * 
   * @param action Combat action
   * @param result Action result
   * @param gameState Current game state
   * @returns Narration of the combat action
   */
  public async generateCombatNarration(
    action: any,
    result: any,
    gameState: GameState
  ): Promise<string> {
    // Add the action to our context
    this.addCombatAction(
      gameState.combatState?.round ?? 1,
      gameState.combatState?.turn ?? 1,
      action,
      result,
      gameState
    );
    
    // Build the combat context string
    const contextString = this.combatContext.buildContextString(
      gameState.combatState?.round ?? 1,
      gameState.combatState?.turn ?? 1,
      action,
      gameState
    );
    
    // Get the prompt template - use advanced if available
    const promptTemplate = this.advancedPromptTemplates.get('combat') || 
                          this.getBasePromptTemplate('combat');
    
    // Generate the response using the base service
    const response = await this.generateWithTemplate(
      'combat',
      promptTemplate,
      { action, result, context: contextString }
    );
    
    // Validate the response if enhanced validation is enabled
    if (this.advancedOptions.enhancedValidation?.useEnhancedValidator) {
      const validationResult = this.enhancedValidator.validate(
        response,
        'combat',
        contextString
      );
      
      // If invalid, try to fix it or regenerate
      if (!validationResult.isValid) {
        // For simplicity, we'll just log the issues in debug mode
        if (this.advancedOptions.debug) {
          console.log('[AdvancedEnhancedAIService] Combat narration validation issues:', 
                     validationResult.issues);
        }
        
        // In a full implementation, we'd fix or regenerate the response
        // For now, we'll return the original
      }
    }
    
    return response;
  }
  
  /**
   * Helper to get the base prompt template for a component
   * 
   * @param component Component type
   * @returns Base prompt template
   */
  private getBasePromptTemplate(component: string): any {
    // This would normally access your base templates
    // For now, return a minimal template
    return {
      systemPrompt: "You are a Dungeon Master narrating a D&D 5e game.",
      generatePrompt: (data: any) => JSON.stringify(data),
      temperature: 0.7
    };
  }
  
  /**
   * Generate a response using a template
   * 
   * @param component Component type
   * @param template Prompt template
   * @param data Template data
   * @returns Generated response
   */
  private async generateWithTemplate(
    component: string,
    template: any,
    data: any
  ): Promise<string> {
    // This would normally call your base AI service
    // For now, return a placeholder
    return `[Generated ${component} response based on the provided data]`;
  }
}

/**
 * Create an advanced enhanced AI service
 * 
 * @param baseService Base AI service
 * @param options Advanced enhancement options
 * @returns AI service adapter with all enhancements
 */
export function createAdvancedEnhancedAIService(
  baseService: AIService,
  options: Partial<AdvancedAIEnhancementOptions> = {}
): AIServiceAdapter {
  // Create the advanced enhanced service
  const advancedService = new AdvancedEnhancedAIService(baseService, options);
  
  // Create and return an adapter that wraps it
  return new AIServiceAdapter(baseService, {
    enhancedService: advancedService,
    ...options
  });
}

/**
 * Update the DM engine to use the advanced enhanced AI service
 * 
 * @param dmEngine DM engine to update
 * @param options Advanced enhancement options
 * @returns Updated DM engine
 */
export function enhanceDMEngineWithAdvancedAI(
  dmEngine: AIDMEngine,
  options: Partial<AdvancedAIEnhancementOptions> = {}
): AIDMEngine {
  // Get the current AI service
  const currentService = (dmEngine as any).aiService as AIService;
  
  // Create the advanced enhanced service
  const enhancedAdapter = createAdvancedEnhancedAIService(currentService, options);
  
  // Set the game state in the adapter
  enhancedAdapter.setGameState(dmEngine.getGameState());
  
  // Replace the AI service in the DM engine
  if ('setAIService' in dmEngine) {
    (dmEngine as any).setAIService(enhancedAdapter);
  } else {
    (dmEngine as any)['aiService'] = enhancedAdapter;
  }
  
  return dmEngine;
}

/**
 * Create an enhanced AI service using the adapter pattern
 * 
 * @param baseService Base AI service to enhance
 * @param options Enhancement options
 * @returns Enhanced AI service adapter
 */
export function createEnhancedAIService(
  baseService: AIService,
  options: Partial<AIEnhancementOptions> = {}
): AIServiceAdapter {
  // Merge provided options with defaults
  const enhancementOptions = { ...DEFAULT_ENHANCEMENT_OPTIONS, ...options };
  
  // Create the adapter with the base service
  const adapter = new AIServiceAdapter(baseService, {
    enhancementOptions
  });
  
  // Initialize context modules if enabled
  if (enhancementOptions.enableContextManagement) {
    if (enhancementOptions.useCombatContext) {
      const combatContext = new CombatContext();
      adapter.getEnhancedService().setContext('combat', combatContext);
    }
    
    if (enhancementOptions.useLocationContext) {
      const locationContext = new LocationContext();
      adapter.getEnhancedService().setLocationContext(locationContext);
    }
    
    if (enhancementOptions.useNPCMemory) {
      const npcMemoryManager = new NPCMemoryManager();
      adapter.getEnhancedService().setNPCMemoryManager(npcMemoryManager);
    }
    
    if (enhancementOptions.usePersonalityConsistency) {
      const personalityTracker = new NPCPersonalityConsistencyTracker(
        enhancementOptions.personalityConsistencyOptions
      );
      adapter.getEnhancedService().setPersonalityTracker(personalityTracker);
    }
  }
  
  return adapter;
}

/**
 * Enhance a DM engine with advanced AI capabilities
 * 
 * @param dmEngine The DM engine to enhance
 * @param config AI configuration
 * @param options Enhancement options
 * @returns The enhanced DM engine
 */
export function enhanceDMEngine(
  dmEngine: DMEngine,
  config: any,
  options: Partial<AIEnhancementOptions> = {}
): DMEngine {
  // Get the existing AI service
  const baseService = dmEngine.aiService;
  
  // Create an enhanced version
  const enhancedService = createEnhancedAIService(baseService, options);
  
  // Update the DM engine to use the enhanced service
  dmEngine.aiService = enhancedService;
  
  // Set up state change listener
  const originalSetGameState = dmEngine.setGameState;
  dmEngine.setGameState = function(gameState: GameState) {
    // Call the original method
    originalSetGameState.call(this, gameState);
    
    // Update the enhanced service
    syncAIServiceWithGameState(enhancedService, gameState);
    
    // Log state change if in debug mode
    if (options.debugMode) {
      console.log('Game state updated:', gameState);
    }
  };
  
  return dmEngine;
}

/**
 * Keep the AI service adapter in sync with changes in game state
 * 
 * @param aiService The AI service adapter
 * @param gameState Current game state
 */
export function syncAIServiceWithGameState(
  aiService: AIServiceAdapter,
  gameState: GameState
): void {
  // Update the enhanced service with the new game state
  const enhancedService = aiService.getEnhancedService();
  enhancedService.setGameState(gameState);
  
  // Trigger any necessary state-based updates
  onGameStateChanged(aiService, gameState);
}

/**
 * Hook to call when game state changes
 * 
 * @param aiService The AI service adapter
 * @param gameState Current game state
 */
export function onGameStateChanged(
  aiService: AIServiceAdapter,
  gameState: GameState
): void {
  // Log the change if in debug mode
  if (aiService.getEnhancedService().isDebugModeEnabled()) {
    console.log('Game state changed:', {
      location: gameState.currentLocation?.name,
      npcsPresent: getNPCsInCurrentLocation(gameState),
      inCombat: !!gameState.combatState,
      activeQuests: gameState.quests?.filter(q => q.status === 'active').length || 0
    });
  }
  
  // Update location context if location has changed
  const enhancedService = aiService.getEnhancedService();
  const locationContext = enhancedService.getLocationContext();
  
  if (locationContext && gameState.currentLocation) {
    // Check if this is a new location visit
    if (!locationContext.hasVisited(gameState.currentLocation.id)) {
      locationContext.addLocationVisit(gameState.currentLocation, gameState);
    }
  }
  
  // Update NPC memories if time has passed in-game
  if (gameState.gameTime?.daysPassed > 0) {
    const npcMemoryManager = enhancedService.getNPCMemoryManager();
    
    if (npcMemoryManager) {
      npcMemoryManager.updateMemoriesWithTimePassed(gameState, gameState.gameTime.daysPassed);
    }
  }
}

/**
 * Get NPCs present in the current location
 * 
 * @param gameState Current game state
 * @returns Array of NPC names
 */
function getNPCsInCurrentLocation(gameState: GameState): string[] {
  if (!gameState.npcs || !gameState.currentLocation) {
    return [];
  }
  
  const npcs: string[] = [];
  const locationId = gameState.currentLocation.id;
  
  gameState.npcs.forEach((npc) => {
    if (npc.locationId === locationId) {
      npcs.push(npc.name);
    }
  });
  
  return npcs;
}

export default {
  createAdvancedEnhancedAIService,
  enhanceDMEngineWithAdvancedAI,
  DEFAULT_ADVANCED_OPTIONS
}; 