/**
 * Enhanced Context Manager
 * 
 * This system integrates all context management components to provide optimized
 * AI context for game scenarios. It coordinates between memory management,
 * relationship tracking, context optimization, and prompt templates.
 */

import { GameState } from '../core/interfaces/game';
import { MemoryManager } from './memory/memory-manager';
import { RelationshipTracker } from './memory/relationship-tracker';
import { ContextOptimizer, GameScenario } from './memory/context-optimizer';
import { PromptTemplateManager } from './prompts/prompt-templates';

/**
 * Configuration for the enhanced context manager
 */
export interface EnhancedContextManagerConfig {
  maxTotalTokens: number;
  enableMemoryPrioritization: boolean;
  enableRelationshipTracking: boolean;
  enableContextOptimization: boolean;
  enablePromptTemplates: boolean;
  debugMode: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: EnhancedContextManagerConfig = {
  maxTotalTokens: 4000,
  enableMemoryPrioritization: true,
  enableRelationshipTracking: true,
  enableContextOptimization: true,
  enablePromptTemplates: true,
  debugMode: false
};

/**
 * Enhanced context manager that integrates all context optimization systems
 */
export class EnhancedContextManager {
  private memoryManager: MemoryManager;
  private relationshipTracker: RelationshipTracker;
  private contextOptimizer: ContextOptimizer;
  private promptTemplateManager: PromptTemplateManager;
  private config: EnhancedContextManagerConfig;
  
  constructor(config: Partial<EnhancedContextManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize components
    this.memoryManager = new MemoryManager();
    this.relationshipTracker = new RelationshipTracker();
    this.contextOptimizer = new ContextOptimizer(
      this.memoryManager,
      this.relationshipTracker,
      { maxTotalTokens: this.config.maxTotalTokens }
    );
    this.promptTemplateManager = new PromptTemplateManager();
    
    if (this.config.debugMode) {
      console.log('Enhanced Context Manager initialized with config:', this.config);
    }
  }
  
  /**
   * Get the memory manager instance
   */
  public getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }
  
  /**
   * Get the relationship tracker instance
   */
  public getRelationshipTracker(): RelationshipTracker {
    return this.relationshipTracker;
  }
  
  /**
   * Get the context optimizer instance
   */
  public getContextOptimizer(): ContextOptimizer {
    return this.contextOptimizer;
  }
  
  /**
   * Get the prompt template manager instance
   */
  public getPromptTemplateManager(): PromptTemplateManager {
    return this.promptTemplateManager;
  }
  
  /**
   * Add a narrative memory to the system
   */
  public addNarrativeMemory(content: string, importance: number = 1): void {
    if (!this.config.enableMemoryPrioritization) return;
    
    this.memoryManager.addMemory({
      type: 'NARRATIVE',
      content,
      importance
    });
    
    if (this.config.debugMode) {
      console.log(`Added narrative memory: ${content.substring(0, 50)}...`);
    }
  }
  
  /**
   * Add a character interaction to the relationship system
   */
  public addInteraction(
    initiator: string,
    target: string,
    interactionType: string,
    description: string,
    impact: number
  ): void {
    if (!this.config.enableRelationshipTracking) return;
    
    this.relationshipTracker.recordInteraction({
      initiator,
      target,
      type: interactionType,
      description,
      impact
    });
    
    if (this.config.debugMode) {
      console.log(`Recorded interaction between ${initiator} and ${target}: ${description.substring(0, 50)}...`);
    }
  }
  
  /**
   * Update entities present in the current context (for relevance calculations)
   */
  public updateCurrentEntities(entityNames: string[]): void {
    if (!this.config.enableMemoryPrioritization) return;
    
    this.memoryManager.updateCurrentEntities(entityNames);
    
    if (this.config.debugMode) {
      console.log(`Updated current entities: ${entityNames.join(', ')}`);
    }
  }
  
  /**
   * Build a complete optimized context and prompt for the current game state
   */
  public buildOptimizedPrompt(
    gameState: GameState,
    userInput: string,
    forceScenario?: GameScenario
  ): { systemPrompt: string; userPrompt: string } {
    // Detect scenario or use forced scenario
    const scenario = forceScenario || this.contextOptimizer.detectScenario(gameState);
    
    if (this.config.debugMode) {
      console.log(`Building optimized prompt for scenario: ${scenario}`);
    }
    
    // Update context optimizer with current scenario
    this.contextOptimizer.setScenario(scenario);
    
    // Update memory manager with current entities from game state
    const currentEntities = this.extractEntitiesFromGameState(gameState);
    this.memoryManager.updateCurrentEntities(currentEntities);
    
    // Build optimized context if enabled
    let optimizedContext = '';
    if (this.config.enableContextOptimization) {
      optimizedContext = this.contextOptimizer.buildOptimizedContext(gameState);
      
      if (this.config.debugMode) {
        console.log(`Generated optimized context (${optimizedContext.length} chars)`);
      }
    }
    
    // Format prompt based on scenario and context
    if (this.config.enablePromptTemplates) {
      return this.promptTemplateManager.formatPrompt(
        scenario,
        userInput,
        optimizedContext
      );
    } else {
      // Simple prompt without templates
      return {
        systemPrompt: `You are a D&D Dungeon Master. ${optimizedContext}`,
        userPrompt: userInput
      };
    }
  }
  
  /**
   * Extract relevant entity names from the game state for context relevance
   */
  private extractEntitiesFromGameState(gameState: GameState): string[] {
    const entities: string[] = [];
    
    // Add player character
    entities.push(gameState.player.name);
    
    // Add NPCs in current location
    const npcsInLocation = gameState.npcs.filter(
      npc => npc.locationId === gameState.currentLocation.id
    );
    
    entities.push(...npcsInLocation.map(npc => npc.name));
    
    // Add location name
    entities.push(gameState.currentLocation.name);
    
    // Add quest givers for active quests
    const activeQuestGivers = gameState.quests
      .filter(quest => quest.status === 'active')
      .map(quest => quest.giver);
    
    entities.push(...activeQuestGivers);
    
    return entities;
  }
  
  /**
   * Apply memory decay to all stored memories
   * Call this periodically (e.g., during long rests or at session start)
   */
  public applyMemoryDecay(): void {
    if (!this.config.enableMemoryPrioritization) return;
    
    this.memoryManager.applyDecay();
    
    if (this.config.debugMode) {
      console.log('Applied memory decay to all stored memories');
    }
  }
  
  /**
   * Apply relationship decay to all relationships
   * Call this periodically (e.g., after significant time passage in-game)
   */
  public applyRelationshipDecay(): void {
    if (!this.config.enableRelationshipTracking) return;
    
    this.relationshipTracker.applyDecay();
    
    if (this.config.debugMode) {
      console.log('Applied decay to all relationships');
    }
  }
} 