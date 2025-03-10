/**
 * Enhanced AI Service
 * 
 * An improved AI service implementation that utilizes context management,
 * specialized prompt templates, and response validation to provide
 * high-quality, consistent AI-generated content for the D&D game.
 */

import { AIService as BaseAIService } from './ai-service';
import { GameState } from '../core/interfaces/game';
import { NarrativeContext } from './context/narrative-context';
import { ResponseValidator, ValidationOptions } from './validation/response-validator';
import { PromptTemplate, PROMPT_TEMPLATES } from './prompts/prompt-templates';
import { CombatAction, ActionResult } from '../combat/interfaces/combat';
import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';
import { Location } from '../core/interfaces/location';
import { Spell } from '../magic/interfaces/spell';
import { AIComponent, AIConfig } from '../config/ai-config';
import { CombatContext } from './context/combat-context';
import { LocationContext } from './context/location-context';
import { NPCMemoryManager } from './npc/npc-memory';
import { generateEnhancedNPCDialogue } from './npc/enhanced-npc-dialogue';
import { AIServiceAdapter } from './ai-service-adapter';
import { NPCPersonalityConsistencyTracker } from './npc/personality-consistency';
import { getAIErrorHandler } from '../ai/ai-error-handler';

/**
 * Options for the enhanced AI service
 */
export interface EnhancedAIServiceOptions {
  contextConfig?: {
    maxHistoryItems?: number;
    includeCharacterDetails?: boolean;
    includeLocationDetails?: boolean;
    includeActiveQuests?: boolean;
    includeRecentCombats?: boolean;
    tokenBudget?: number;
  };
  validationConfig?: Partial<ValidationOptions>;
  promptOverrides?: Partial<Record<AIComponent, PromptTemplate>>;
  debug?: boolean;
}

/**
 * Default options for the enhanced AI service
 */
const DEFAULT_OPTIONS: EnhancedAIServiceOptions = {
  contextConfig: {
    maxHistoryItems: 20,
    includeCharacterDetails: true,
    includeLocationDetails: true,
    includeActiveQuests: true,
    includeRecentCombats: true,
  },
  validationConfig: {
    strictnessLevel: 'medium'
  },
  debug: false
};

/**
 * Enhanced AI Service implementation
 * 
 * This service extends the base AI service with advanced features:
 * - Context management for coherent narratives across sessions
 * - Specialized prompt templates for different game aspects
 * - Response validation to ensure quality and consistency
 */
export class EnhancedAIService {
  private baseService: BaseAIService;
  private narrativeContext: NarrativeContext;
  private validator: ResponseValidator;
  private options: EnhancedAIServiceOptions;
  private prompts: Record<AIComponent, PromptTemplate>;
  private errorHandler = getAIErrorHandler();
  
  // Context managers
  private combatContext: CombatContext;
  private locationContext: LocationContext;
  public npcMemoryManager: NPCMemoryManager;
  private personalityTracker?: NPCPersonalityConsistencyTracker;
  
  /**
   * Create a new enhanced AI service
   * 
   * @param baseService The underlying AI service
   * @param config Optional configuration
   */
  constructor(
    baseService: BaseAIService,
    config: Partial<EnhancedAIServiceOptions> = {}
  ) {
    this.baseService = baseService;
    this.options = { ...DEFAULT_OPTIONS, ...config };
    
    // Initialize narrative context
    this.narrativeContext = new NarrativeContext({
      maxHistoryItems: this.options.contextConfig?.maxHistoryItems,
      includeCharacterDetails: this.options.contextConfig?.includeCharacterDetails,
      includeLocationDetails: this.options.contextConfig?.includeLocationDetails,
      includeActiveQuests: this.options.contextConfig?.includeActiveQuests,
      includeRecentCombats: this.options.contextConfig?.includeRecentCombats,
      tokenBudget: this.options.contextConfig?.tokenBudget
    });
    
    // Initialize response validator
    this.validator = new ResponseValidator(this.options.validationConfig);
    
    // Initialize prompt templates
    this.prompts = { ...PROMPT_TEMPLATES };
    
    // Apply any prompt overrides
    if (this.options.promptOverrides) {
      for (const [component, promptTemplate] of Object.entries(this.options.promptOverrides)) {
        this.prompts[component as AIComponent] = {
          ...this.prompts[component as AIComponent],
          ...promptTemplate
        };
      }
    }
    
    // Initialize context managers if enabled
    if (this.options.contextConfig?.maxHistoryItems) {
      this.combatContext = new CombatContext({
        maxRoundsToTrack: 3
      });
      
      this.locationContext = new LocationContext({
        maxLocationHistory: 5,
        includePlayerHistory: true
      });
      
      this.npcMemoryManager = new NPCMemoryManager({
        maxInteractionHistory: this.options.contextConfig.maxHistoryItems
      });
    }
  }
  
  /**
   * Generate a narrative response based on player input and game state
   * 
   * @param input The player's input
   * @param gameState The current game state
   * @returns A narrative response from the DM
   */
  public async generateNarrative(
    input: string,
    gameState: GameState
  ): Promise<string> {
    return this.errorHandler.executeWithFallback(
      async () => {
        // Build context for the current situation
        const contextString = this.narrativeContext.buildContext(gameState);
        
        // Get the prompt template for DM responses
        const promptTemplate = this.prompts.dm;
        
        // Generate the prompt
        const prompt = promptTemplate.generatePrompt({
          playerInput: input,
          context: contextString
        });
        
        // Log the prompt if debug is enabled
        if (this.options.debug) {
          console.log('[EnhancedAIService] Generating narrative with prompt:', prompt);
        }
        
        // Generate the response
        const response = await this.baseService.generateCompletion(
          'dm',
          promptTemplate.systemPrompt,
          prompt,
          promptTemplate.temperature,
          promptTemplate.maxTokens
        );
        
        // Validate the response
        const validationResult = this.validator.validate(
          response,
          contextString,
          gameState,
          'dm'
        );
        
        // Log validation results if debug is enabled
        if (this.options.debug) {
          console.log('[EnhancedAIService] Validation result:', validationResult);
        }
        
        // If the response is not valid and we're not in debug mode, regenerate it
        if (!validationResult.isValid && !this.options.debug) {
          // This would be a more sophisticated retry strategy in a full implementation
          // For now, we'll just regenerate with a modified prompt
          const retryPrompt = `${prompt}\n\nPlease ensure your response is consistent with the game world and narrative tone. Specifically: ${validationResult.suggestions.join(', ')}`;
          
          return await this.baseService.generateCompletion(
            'dm',
            promptTemplate.systemPrompt,
            retryPrompt,
            promptTemplate.temperature,
            promptTemplate.maxTokens
          );
        }
        
        // Add the exchange to the narrative context
        this.narrativeContext.addExchange({
          timestamp: new Date(),
          playerInput: input,
          dmResponse: response,
          location: gameState.currentLocation,
          situationContext: this.buildSituationContext(gameState)
        });
        
        return response;
      },
      // Fallback response if all attempts fail
      () => {
        const defaultResponses = [
          "The Dungeon Master ponders your request for a moment, but seems distracted by something beyond your perception. Perhaps try again?",
          "The world around you continues on, but the Dungeon Master seems to be gathering their thoughts. What would you like to do?",
          "You sense a momentary pause in the flow of the narrative. The Dungeon Master appears to be considering the situation carefully.",
          "The threads of fate momentarily tangle. The Dungeon Master will return to your tale shortly."
        ];
        
        // Return a random default response
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
      },
      // Context for error handling
      { feature: 'narrative', input, gameState: { locationId: gameState.currentLocation.id } }
    );
  }
  
  /**
   * Generate NPC dialogue based on player input and NPC personality
   * 
   * @param npc The NPC generating dialogue
   * @param playerInput What the player said to the NPC
   * @param gameState The current game state
   * @param dialogueHistory Previous exchanges with this NPC
   * @returns The NPC's dialogue response
   */
  public async generateNPCDialogue(
    npc: NPC,
    playerInput: string,
    gameState: GameState,
    dialogueHistory: Array<{ player: string, npc: string }>
  ): Promise<string> {
    try {
      // Get the prompt template for NPC dialogue
      const promptTemplate = this.prompts.npc;
      
      // Build context string with relevant information
      const contextString = this.narrativeContext.buildContext(gameState);
      
      // Format dialogue history
      const formattedHistory = dialogueHistory
        .map(entry => `Player: ${entry.player}\n${npc.name}: ${entry.npc}`)
        .join('\n\n');
      
      // Generate the prompt
      const prompt = promptTemplate.generatePrompt({
        npc,
        playerInput,
        dialogueHistory: formattedHistory,
        context: contextString
      });
      
      // Generate the response
      const response = await this.baseService.generateCompletion(
        'npc',
        promptTemplate.systemPrompt,
        prompt,
        promptTemplate.temperature,
        promptTemplate.maxTokens
      );
      
      // Validate the response
      const validationResult = this.validator.validate(
        response,
        contextString,
        gameState,
        'npc'
      );
      
      // If the response is not valid, regenerate it
      if (!validationResult.isValid && !this.options.debug) {
        const retryPrompt = `${prompt}\n\nPlease ensure your response is consistent with the character's personality and the game world. Specifically: ${validationResult.suggestions.join(', ')}`;
        
        return await this.baseService.generateCompletion(
          'npc',
          promptTemplate.systemPrompt,
          retryPrompt,
          promptTemplate.temperature,
          promptTemplate.maxTokens
        );
      }
      
      return response;
    } catch (error) {
      console.error('[EnhancedAIService] Error generating NPC dialogue:', error);
      return `${npc.name} seems unable to respond at the moment.`;
    }
  }
  
  /**
   * Generate a description for a location
   * 
   * @param location The location to describe
   * @param gameState The current game state
   * @param isFirstVisit Whether this is the player's first visit to this location
   * @returns A detailed description of the location
   */
  public async generateLocationDescription(
    location: Location,
    gameState: GameState,
    isFirstVisit: boolean
  ): Promise<string> {
    try {
      // Get the prompt template for location descriptions
      const promptTemplate = this.prompts.story;
      
      // Build context
      const contextString = this.narrativeContext.buildContext(gameState);
      
      // Generate the prompt
      const prompt = promptTemplate.generatePrompt({
        location,
        isFirstVisit,
        timeOfDay: gameState.gameTime.timeOfDay,
        weather: gameState.worldState.currentWeather,
        context: contextString
      });
      
      // Generate the response
      const response = await this.baseService.generateCompletion(
        'story',
        promptTemplate.systemPrompt,
        prompt,
        promptTemplate.temperature,
        promptTemplate.maxTokens
      );
      
      return response;
    } catch (error) {
      console.error('[EnhancedAIService] Error generating location description:', error);
      return `You find yourself in ${location.name}.`;
    }
  }
  
  /**
   * Generate a narration for a combat action
   * 
   * @param action The combat action being performed
   * @param result The result of the action
   * @param gameState The current game state
   * @returns A narration of the combat action
   */
  public async generateCombatNarration(
    action: CombatAction,
    result: ActionResult,
    gameState: GameState
  ): Promise<string> {
    return this.errorHandler.executeWithFallback(
      async () => {
        // Get the prompt template for combat narration
        const promptTemplate = this.prompts.combat;
        
        // Generate the prompt
        const prompt = promptTemplate.generatePrompt({
          action,
          result,
          situation: this.buildCombatSituation(gameState)
        });
        
        // Generate the response
        const response = await this.baseService.generateCompletion(
          'combat',
          promptTemplate.systemPrompt,
          prompt,
          promptTemplate.temperature,
          promptTemplate.maxTokens
        );
        
        // Validate the response
        const validationResult = this.validator.validate(
          response,
          prompt,
          gameState,
          'combat'
        );
        
        // If the response is not valid, regenerate it
        if (!validationResult.isValid && !this.options.debug) {
          const retryPrompt = `${prompt}\n\nPlease ensure your description is exciting and accurately reflects the combat action. Specifically: ${validationResult.suggestions.join(', ')}`;
          
          return await this.baseService.generateCompletion(
            'combat',
            promptTemplate.systemPrompt,
            retryPrompt,
            promptTemplate.temperature,
            promptTemplate.maxTokens
          );
        }
        
        // Add combat summary to narrative context
        this.narrativeContext.addCombatSummary({
          timestamp: new Date(),
          action,
          result,
          narration: response
        });
        
        return response;
      },
      // Fallback to default combat narration
      () => this.getDefaultCombatNarration(action, result),
      // Context for error handling
      { 
        feature: 'combat', 
        action: { type: action.type, attackerId: action.attacker?.id },
        result: { success: result.success, damage: result.damage }
      }
    );
  }
  
  /**
   * Generate a quest with objectives, challenges, and rewards
   * 
   * @param difficulty The difficulty level of the quest
   * @param themeKeywords Keywords to influence the quest theme
   * @param gameState The current game state
   * @returns A generated quest
   */
  public async generateQuest(
    difficulty: 'easy' | 'medium' | 'hard',
    themeKeywords: string[],
    gameState: GameState
  ): Promise<any> {
    try {
      // Get the prompt template for quest generation
      const promptTemplate = this.prompts.quest;
      
      // Get player character info
      const playerCharacter = gameState.player;
      
      // Generate the prompt
      const prompt = promptTemplate.generatePrompt({
        playerLevel: playerCharacter.level,
        playerClass: playerCharacter.class[0].name,
        difficulty,
        themeKeywords,
        currentLocation: gameState.currentLocation,
        context: this.narrativeContext.buildContext(gameState)
      });
      
      // Generate the response as a structured quest
      const response = await this.baseService.generateCompletion(
        'quest',
        promptTemplate.systemPrompt,
        prompt,
        promptTemplate.temperature,
        promptTemplate.maxTokens
      );
      
      // Parse the response to extract quest details
      // In a full implementation, this would use a more robust parsing approach
      try {
        // The response should be structured in a way that can be parsed as JSON
        return JSON.parse(response);
      } catch (parseError) {
        console.error('[EnhancedAIService] Error parsing quest JSON:', parseError);
        
        // Attempt to extract quest information manually
        const title = this.extractQuestTitle(response);
        const description = this.extractQuestDescription(response);
        const objectives = this.extractQuestObjectives(response);
        
        return {
          title: title || 'Mysterious Quest',
          description: description || 'A quest shrouded in mystery.',
          objectives: objectives || ['Investigate the mysterious circumstances.'],
          reward: 'Unknown'
        };
      }
    } catch (error) {
      console.error('[EnhancedAIService] Error generating quest:', error);
      return {
        title: 'Unexpected Discovery',
        description: 'While details are unclear, there appears to be something requiring your attention.',
        objectives: ['Investigate further to reveal the true nature of this quest.'],
        reward: 'Unknown'
      };
    }
  }
  
  /**
   * Generate a description of a spell effect
   * 
   * @param spell The spell being cast
   * @param caster The character casting the spell
   * @param targets The targets of the spell
   * @param gameState The current game state
   * @returns A vivid description of the spell effect
   */
  public async generateSpellEffect(
    spell: Spell,
    caster: Character,
    targets: Array<Character | NPC>,
    gameState: GameState
  ): Promise<string> {
    try {
      // Get the prompt template for spell effects
      const promptTemplate = this.prompts.combat; // Using combat template for spell effects
      
      // Generate the prompt
      const prompt = promptTemplate.generatePrompt({
        spell,
        caster,
        targets,
        environment: gameState.currentLocation,
        context: this.narrativeContext.buildContext(gameState)
      });
      
      // Generate the response
      const response = await this.baseService.generateCompletion(
        'combat',
        promptTemplate.systemPrompt,
        prompt,
        promptTemplate.temperature,
        promptTemplate.maxTokens
      );
      
      return response;
    } catch (error) {
      console.error('[EnhancedAIService] Error generating spell effect:', error);
      return `${caster.name} casts ${spell.name}.`;
    }
  }
  
  /**
   * Get the narrative context
   */
  public getNarrativeContext(): NarrativeContext {
    return this.narrativeContext;
  }
  
  /**
   * Get the response validator
   */
  public getValidator(): ResponseValidator {
    return this.validator;
  }
  
  /**
   * Update the configuration options
   * 
   * @param options New configuration options
   */
  public updateOptions(options: Partial<EnhancedAIServiceOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
    
    // Update error handler debug mode if debug option changed
    if (options.debug !== undefined) {
      this.errorHandler.updateConfig({ debug: options.debug });
    }
    
    // Reinitialize components if needed
    if (options.contextConfig) {
      this.narrativeContext.updateConfig(options.contextConfig);
    }
    
    if (options.validationConfig) {
      this.validator = new ResponseValidator(options.validationConfig);
    }
  }
  
  /**
   * Get the underlying AI config
   */
  public getAIConfig(): AIConfig {
    return this.baseService.getConfig();
  }
  
  /**
   * Update the underlying AI config
   * 
   * @param config New AI configuration
   */
  public updateAIConfig(config: Partial<AIConfig>): void {
    this.baseService.updateConfig(config);
  }
  
  /**
   * Set the NPC Memory Manager
   * 
   * @param memoryManager The NPC Memory Manager to use
   */
  public setNPCMemoryManager(memoryManager: NPCMemoryManager): void {
    this.npcMemoryManager = memoryManager;
  }
  
  /**
   * Set the Location Context
   * 
   * @param locationContext The Location Context to use
   */
  public setLocationContext(locationContext: LocationContext): void {
    this.locationContext = locationContext;
  }
  
  /**
   * Set the Personality Consistency Tracker
   * 
   * @param personalityTracker The Personality Consistency Tracker to use
   */
  public setPersonalityTracker(personalityTracker: NPCPersonalityConsistencyTracker): void {
    this.personalityTracker = personalityTracker;
  }
  
  /**
   * Get the Personality Consistency Tracker
   * 
   * @returns The personality consistency tracker
   */
  public getPersonalityTracker(): NPCPersonalityConsistencyTracker | undefined {
    return this.personalityTracker;
  }
  
  /* Private helper methods */
  
  /**
   * Build context about the current situation
   */
  private buildSituationContext(gameState: GameState): string {
    const { player, currentLocation, npcs, combatState } = gameState;
    
    let context = `${player.name} is currently in ${currentLocation.name}.`;
    
    // Add NPCs present
    const npcsPresent = Array.from(npcs.values())
      .filter(npc => npc.currentLocation === currentLocation.id);
    
    if (npcsPresent.length > 0) {
      context += ` Present NPCs: ${npcsPresent.map(npc => npc.name).join(', ')}.`;
    }
    
    // Add combat state if in combat
    if (combatState) {
      context += ` In combat with: ${combatState.enemies.map(e => e.name).join(', ')}.`;
    }
    
    return context;
  }
  
  /**
   * Build combat situation context
   */
  private buildCombatSituation(gameState: GameState): string {
    const { player, currentLocation, combatState } = gameState;
    
    if (!combatState) {
      return 'No active combat.';
    }
    
    let situation = `Combat in ${currentLocation.name}. `;
    situation += `Round ${combatState.round}, ${combatState.currentTurn} acting. `;
    
    // Character health status
    situation += `${player.name}: ${player.hitPoints.current}/${player.hitPoints.maximum} HP. `;
    
    // Enemy health status
    situation += `Enemies: ${combatState.enemies
      .map(e => `${e.name}: ${e.hitPoints.current}/${e.hitPoints.maximum} HP`)
      .join(', ')}. `;
    
    // Environment details
    situation += `Environment: ${currentLocation.description}`;
    
    return situation;
  }
  
  /**
   * Generate a default combat narration when AI generation fails
   */
  private getDefaultCombatNarration(action: CombatAction, result: ActionResult): string {
    const { actor, target, actionType } = action;
    
    if (actionType === 'attack') {
      if (result.success) {
        return `${actor.name} attacks ${target?.name} and hits for ${result.damage} damage.`;
      } else {
        return `${actor.name} attacks ${target?.name} but misses.`;
      }
    } else if (actionType === 'cast') {
      if (result.success) {
        return `${actor.name} casts ${action.spell?.name} on ${target?.name}.`;
      } else {
        return `${actor.name} attempts to cast ${action.spell?.name} but fails.`;
      }
    } else {
      return `${actor.name} performs an action.`;
    }
  }
  
  /**
   * Extract quest title from response
   */
  private extractQuestTitle(response: string): string | null {
    const titleMatch = response.match(/title["\s:]+([^"]+)/i);
    return titleMatch ? titleMatch[1].trim() : null;
  }
  
  /**
   * Extract quest description from response
   */
  private extractQuestDescription(response: string): string | null {
    const descMatch = response.match(/description["\s:]+([^"]+)/i);
    return descMatch ? descMatch[1].trim() : null;
  }
  
  /**
   * Extract quest objectives from response
   */
  private extractQuestObjectives(response: string): string[] | null {
    // Try to find objectives section
    const objectivesMatch = response.match(/objectives["\s:]+\[(.*?)\]/is);
    
    if (objectivesMatch) {
      // Try to parse as JSON array
      try {
        return JSON.parse(`[${objectivesMatch[1]}]`);
      } catch {
        // Fallback to simple splitting
        return objectivesMatch[1]
          .split(',')
          .map(obj => obj.replace(/["']/g, '').trim())
          .filter(obj => obj.length > 0);
      }
    }
    
    return null;
  }
}

export default EnhancedAIService; 