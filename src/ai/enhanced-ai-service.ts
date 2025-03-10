/**
 * Enhanced AI Service
 * 
 * This service extends the base AI service with advanced features including:
 * - Enhanced context management and optimization
 * - Memory prioritization with decay
 * - Relationship tracking with impact assessment
 * - Scenario-specific prompt templates
 * - Token budget optimization
 */

import { AIService } from './ai-service';
import { EnhancedContextManager } from './enhanced-context-manager';
import { GameScenario } from './memory/context-optimizer';
import { GameState } from '../simple-main';

/**
 * Enhanced AI service configuration
 */
export interface EnhancedAIServiceConfig {
  enableContextManagement: boolean;
  maxTokens: number;
  includeCharacterDetails: boolean;
  includeLocationDetails: boolean;
  includeActiveQuests: boolean;
  includeRecentEvents: boolean;
  validateResponses: boolean;
  strictnessLevel: 'low' | 'medium' | 'high';
  debugMode: boolean;
}

/**
 * Default enhanced service configuration
 */
const DEFAULT_CONFIG: EnhancedAIServiceConfig = {
  enableContextManagement: true,
  maxTokens: 4000,
  includeCharacterDetails: true,
  includeLocationDetails: true,
  includeActiveQuests: true,
  includeRecentEvents: true,
  validateResponses: true,
  strictnessLevel: 'medium',
  debugMode: false
};

/**
 * Enhanced AI service that provides advanced context management
 * and improved narrative capabilities
 */
export class EnhancedAIService {
  private baseService: AIService;
  private config: EnhancedAIServiceConfig;
  private contextManager: EnhancedContextManager;
  private gameState?: GameState;
  private currentScenario: GameScenario = GameScenario.EXPLORATION;
  
  /**
   * Create a new enhanced AI service
   * 
   * @param baseService The base AI service to enhance
   * @param config Configuration options
   */
  constructor(baseService: AIService, config: Partial<EnhancedAIServiceConfig> = {}) {
    this.baseService = baseService;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize the context manager
    this.contextManager = new EnhancedContextManager({
      maxTotalTokens: this.config.maxTokens,
      enableMemoryPrioritization: this.config.enableContextManagement,
      enableRelationshipTracking: this.config.enableContextManagement,
      enableContextOptimization: this.config.enableContextManagement,
      enablePromptTemplates: this.config.enableContextManagement,
      debugMode: this.config.debugMode
    });
    
    if (this.config.debugMode) {
      console.log('Enhanced AI Service initialized with config:', this.config);
    }
  }
  
  /**
   * Set the current game state
   * 
   * @param gameState The current game state
   */
  public setGameState(gameState: GameState): void {
    this.gameState = gameState;
    
    // Detect current scenario
    if (this.config.enableContextManagement && gameState) {
      this.currentScenario = this.contextManager.getContextOptimizer().detectScenario(gameState);
      
      if (this.config.debugMode) {
        console.log(`Updated game state, current scenario: ${this.currentScenario}`);
      }
    }
  }
  
  /**
   * Get the current scenario
   */
  public getCurrentScenario(): GameScenario {
    return this.currentScenario;
  }
  
  /**
   * Set the current scenario explicitly
   */
  public setScenario(scenario: GameScenario): void {
    this.currentScenario = scenario;
    
    // Update context optimizer
    if (this.config.enableContextManagement) {
      this.contextManager.getContextOptimizer().setScenario(scenario);
      
      if (this.config.debugMode) {
        console.log(`Manually set scenario to: ${scenario}`);
      }
    }
  }
  
  /**
   * Get the underlying context manager
   */
  public getContextManager(): EnhancedContextManager {
    return this.contextManager;
  }
  
  /**
   * Add a narrative memory to the system
   */
  public addMemory(content: string, importance: number = 1): void {
    if (!this.config.enableContextManagement) return;
    
    this.contextManager.addNarrativeMemory(content, importance);
  }
  
  /**
   * Record an interaction between characters
   */
  public recordInteraction(
    initiator: string,
    target: string,
    interactionType: string,
    description: string,
    impact: number
  ): void {
    if (!this.config.enableContextManagement) return;
    
    this.contextManager.addInteraction(
      initiator,
      target,
      interactionType,
      description,
      impact
    );
  }
  
  /**
   * Generate enhanced narrative response
   * 
   * @param playerInput The player's input
   * @param forceScenario Optional scenario to use (otherwise detected from game state)
   * @returns The narrative response
   */
  public async generateNarrative(playerInput: string, forceScenario?: GameScenario): Promise<string> {
    // If we don't have a game state, fall back to the base service
    if (!this.gameState || !this.config.enableContextManagement) {
      return this.baseService.generateNarrative(playerInput);
    }
    
    // Build optimized prompt
    const scenario = forceScenario || this.currentScenario;
    const { systemPrompt, userPrompt } = this.contextManager.buildOptimizedPrompt(
      this.gameState,
      playerInput,
      scenario
    );
    
    if (this.config.debugMode) {
      console.log('Enhanced narrative generation with:');
      console.log(`- Scenario: ${scenario}`);
      console.log(`- System prompt length: ${systemPrompt.length} chars`);
      console.log(`- User prompt: ${userPrompt.substring(0, 50)}...`);
    }
    
    // Use the enhanced prompts with the base service
    try {
      // Pass the optimized prompts to the base service
      // The implementation depends on the actual base service interface
      // This is a generic approach that should work with most AI service implementations
      const narrative = await this.baseService.generateWithSystemPrompt(
        systemPrompt,
        userPrompt
      );
      
      // Add this exchange to memory if context management is enabled
      if (this.config.enableContextManagement) {
        // Add player input and AI response to memory
        this.contextManager.addNarrativeMemory(`Player: ${playerInput}`, 1);
        this.contextManager.addNarrativeMemory(`DM: ${narrative}`, 1);
      }
      
      return narrative;
    } catch (error) {
      console.error('Error generating enhanced narrative:', error);
      
      // Fall back to base service if enhanced generation fails
      return this.baseService.generateNarrative(playerInput);
    }
  }
  
  /**
   * Generate NPC dialogue with enhanced context
   * 
   * @param npc The NPC speaking
   * @param playerInput What the player said
   * @param dialogueHistory Previous conversation history
   * @returns The NPC's response
   */
  public async generateNPCDialogue(
    npc: any, 
    playerInput: string, 
    dialogueHistory: Array<{ player: string; npc: string }>
  ): Promise<string> {
    // If context management is disabled, fall back to base service
    if (!this.gameState || !this.config.enableContextManagement) {
      return this.baseService.generateNPCDialogue(npc, playerInput, dialogueHistory);
    }
    
    // Force social scenario for NPC dialogue
    const { systemPrompt, userPrompt } = this.contextManager.buildOptimizedPrompt(
      this.gameState,
      playerInput,
      GameScenario.SOCIAL
    );
    
    try {
      // Generate dialogue with optimized context
      const dialogue = await this.baseService.generateWithSystemPrompt(
        systemPrompt,
        userPrompt
      );
      
      // Record the interaction in the relationship tracker
      this.contextManager.addInteraction(
        this.gameState.player.name,
        npc.name,
        'DIALOGUE',
        `${this.gameState.player.name} said to ${npc.name}: "${playerInput}". ${npc.name} responded: "${dialogue}"`,
        0.5 // Default impact for dialogue
      );
      
      return dialogue;
    } catch (error) {
      console.error('Error generating enhanced NPC dialogue:', error);
      
      // Fall back to base service
      return this.baseService.generateNPCDialogue(npc, playerInput, dialogueHistory);
    }
  }
  
  /**
   * Generate a combat narrative with enhanced context
   * 
   * @param action The combat action
   * @param result The result of the action
   * @returns Narrative description of the combat action
   */
  public async generateCombatNarrative(action: any, result: any): Promise<string> {
    // If context management is disabled, fall back to base service
    if (!this.gameState || !this.config.enableContextManagement) {
      return this.baseService.generateCombatNarrative(action, result);
    }
    
    // Use a custom prompt for combat
    const actionDescription = `${action.actor.name} uses ${action.type} ${action.target ? 'on ' + action.target.name : ''}`;
    
    // Force combat scenario
    const { systemPrompt, userPrompt } = this.contextManager.buildOptimizedPrompt(
      this.gameState,
      actionDescription,
      GameScenario.COMBAT
    );
    
    try {
      // Generate combat narrative with optimized context
      const narrative = await this.baseService.generateWithSystemPrompt(
        systemPrompt,
        userPrompt
      );
      
      // Add this combat action to memory
      if (action.actor && action.target) {
        let impactValue = 0.7; // Default impact for combat
        
        // Increase impact for significant combat events
        if (result.damage && result.damage > action.actor.hitPoints / 2) {
          impactValue = 1.0; // High impact for major damage
        }
        
        if (result.success === false) {
          impactValue = 0.3; // Lower impact for missed attacks
        }
        
        this.contextManager.addInteraction(
          action.actor.name,
          action.target.name,
          'COMBAT',
          narrative,
          impactValue
        );
      }
      
      return narrative;
    } catch (error) {
      console.error('Error generating enhanced combat narrative:', error);
      
      // Fall back to base service
      return this.baseService.generateCombatNarrative(action, result);
    }
  }
  
  /**
   * Generate a description of a location with enhanced context
   * 
   * @param location The location to describe
   * @param firstVisit Whether this is the player's first visit
   * @returns A narrative description of the location
   */
  public async generateLocationDescription(location: any, firstVisit: boolean = false): Promise<string> {
    // If context management is disabled, fall back to base service
    if (!this.gameState || !this.config.enableContextManagement) {
      return this.baseService.generateLocationDescription(location, firstVisit);
    }
    
    const prompt = firstVisit
      ? `Describe the location ${location.name} as I am seeing it for the first time.`
      : `Describe the location ${location.name} as I return to it.`;
    
    // Force exploration scenario
    const { systemPrompt, userPrompt } = this.contextManager.buildOptimizedPrompt(
      this.gameState,
      prompt,
      GameScenario.EXPLORATION
    );
    
    try {
      // Generate location description with optimized context
      const description = await this.baseService.generateWithSystemPrompt(
        systemPrompt,
        userPrompt
      );
      
      // Add memory of visiting this location
      this.contextManager.addNarrativeMemory(
        `Visited location: ${location.name}. ${description.substring(0, 100)}...`,
        firstVisit ? 1.0 : 0.5
      );
      
      return description;
    } catch (error) {
      console.error('Error generating enhanced location description:', error);
      
      // Fall back to base service
      return this.baseService.generateLocationDescription(location, firstVisit);
    }
  }
  
  /**
   * Apply decay to memory and relationships
   * Call this periodically (e.g., on long rests or major time skips)
   */
  public applyDecay(): void {
    if (!this.config.enableContextManagement) return;
    
    this.contextManager.applyMemoryDecay();
    this.contextManager.applyRelationshipDecay();
    
    if (this.config.debugMode) {
      console.log('Applied decay to memory and relationships');
    }
  }
} 