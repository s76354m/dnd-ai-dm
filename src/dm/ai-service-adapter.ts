/**
 * AI Service Adapter
 * 
 * This adapter provides a compatibility layer between the existing AI service
 * interface and our new enhanced AI service implementation. It allows the game
 * to benefit from the enhanced AI features without requiring changes to all
 * existing code that uses the AIService.
 */

import { AIService } from './ai-service';
import { EnhancedAIService } from './enhanced-ai-service';
import { AIConfig } from '../config/ai-config';
import { GameState } from '../core/interfaces/game';
import { CombatAction, ActionResult } from '../combat/interfaces/combat';
import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';
import { Location } from '../core/interfaces/location';
import { Spell } from '../magic/interfaces/spell';

/**
 * Implementation of the AIService interface that delegates to EnhancedAIService
 */
export class AIServiceAdapter extends AIService {
  private enhancedService: EnhancedAIService;
  private gameState?: GameState;
  
  /**
   * Create a new AIServiceAdapter
   * 
   * @param baseService The original AI service to be wrapped
   * @param options Options for the enhanced AI service
   */
  constructor(baseService: AIService, options: any = {}) {
    super();
    
    // Copy configuration from the base service
    this.config = { ...baseService.getConfig() };
    
    // Create the enhanced service with the base service
    this.enhancedService = new EnhancedAIService(baseService, options);
  }
  
  /**
   * Set the current game state
   * This is important as many of the enhanced AI features require game state
   * 
   * @param gameState The current game state
   */
  public setGameState(gameState: GameState): void {
    this.gameState = gameState;
  }
  
  /**
   * Generate narrative response (overriding base class method)
   * 
   * @param playerInput The player's input
   * @param context Additional context
   * @returns A narrative response
   */
  public async generateNarrative(playerInput: string, context?: string): Promise<string> {
    // Ensure we have a game state
    if (!this.gameState) {
      // Fall back to base implementation if no game state available
      return await super.generateNarrative(playerInput, context);
    }
    
    return await this.enhancedService.generateNarrative(playerInput, this.gameState);
  }
  
  /**
   * Generate NPC dialogue (overriding base class method)
   * 
   * @param npc The NPC speaking
   * @param playerInput What the player said
   * @param dialogueHistory Previous conversation history
   * @returns The NPC's response
   */
  public async generateNPCDialogue(
    npc: NPC, 
    playerInput: string, 
    dialogueHistory: Array<{ player: string, npc: string }>
  ): Promise<string> {
    // Ensure we have a game state
    if (!this.gameState) {
      // Fall back to base implementation if no game state available
      return await super.generateNPCDialogue(npc, playerInput, dialogueHistory);
    }
    
    return await this.enhancedService.generateNPCDialogue(
      npc,
      playerInput,
      this.gameState,
      dialogueHistory
    );
  }
  
  /**
   * Generate a location description (overriding base class method)
   * 
   * @param location The location to describe
   * @param isFirstVisit Whether this is the player's first visit
   * @returns A description of the location
   */
  public async generateLocationDescription(
    location: Location, 
    isFirstVisit: boolean = false
  ): Promise<string> {
    // Ensure we have a game state
    if (!this.gameState) {
      // Fall back to base implementation if no game state available
      return await super.generateLocationDescription(location, isFirstVisit);
    }
    
    return await this.enhancedService.generateLocationDescription(
      location,
      this.gameState,
      isFirstVisit
    );
  }
  
  /**
   * Generate a combat narration (overriding base class method)
   * 
   * @param action The combat action
   * @param result The result of the action
   * @returns A narration of the combat action
   */
  public async generateCombatNarration(
    action: CombatAction, 
    result: ActionResult
  ): Promise<string> {
    // Ensure we have a game state
    if (!this.gameState) {
      // Fall back to base implementation if no game state available
      return await super.generateCombatNarration(action, result);
    }
    
    return await this.enhancedService.generateCombatNarration(
      action,
      result,
      this.gameState
    );
  }
  
  /**
   * Generate a quest (overriding base class method)
   * 
   * @param difficulty The difficulty level
   * @param themeKeywords Keywords to influence the quest
   * @returns A generated quest
   */
  public async generateQuest(
    difficulty: 'easy' | 'medium' | 'hard', 
    themeKeywords: string[]
  ): Promise<any> {
    // Ensure we have a game state
    if (!this.gameState) {
      // Fall back to base implementation if no game state available
      return await super.generateQuest(difficulty, themeKeywords);
    }
    
    return await this.enhancedService.generateQuest(
      difficulty,
      themeKeywords,
      this.gameState
    );
  }
  
  /**
   * Generate a spell effect description (overriding base class method)
   * 
   * @param spell The spell being cast
   * @param caster The character casting the spell
   * @param targets The targets of the spell
   * @returns A description of the spell effect
   */
  public async generateSpellEffect(
    spell: Spell, 
    caster: Character, 
    targets: Array<Character | NPC>
  ): Promise<string> {
    // Ensure we have a game state
    if (!this.gameState) {
      // Fall back to base implementation if no game state available
      return await super.generateSpellEffect(spell, caster, targets);
    }
    
    return await this.enhancedService.generateSpellEffect(
      spell,
      caster,
      targets,
      this.gameState
    );
  }
  
  /**
   * Update the AI configuration (overriding base class method)
   * 
   * @param config The new AI configuration
   */
  public updateConfig(config: Partial<AIConfig>): void {
    super.updateConfig(config);
    this.enhancedService.updateAIConfig(config);
  }
  
  /**
   * Get the enhanced AI service
   * This allows access to enhanced features not available in the base service
   */
  public getEnhancedService(): EnhancedAIService {
    return this.enhancedService;
  }
}

export default AIServiceAdapter; 