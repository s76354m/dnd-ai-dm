/**
 * Narrative Context Manager
 * 
 * Manages context windows for narrative generation to maintain coherent
 * storytelling across multiple AI interactions.
 */

import { GameState } from '../../core/interfaces/game';
import { Character } from '../../core/interfaces/character';
import { DialogueHistoryEntry } from '../../core/interfaces/npc';

/**
 * Represents a narrative exchange between the player and DM
 */
export interface NarrativeExchange {
  timestamp: Date;
  playerInput: string;
  dmResponse: string;
  location: string;
  situationContext?: string;
}

/**
 * Configuration options for the narrative context
 */
export interface NarrativeContextConfig {
  maxHistoryItems: number;
  includeCharacterDetails: boolean;
  includeLocationDetails: boolean;
  includeActiveQuests: boolean;
  includeRecentCombats: boolean;
  tokenBudget?: number;
}

/**
 * Default configuration for narrative context
 */
export const DEFAULT_NARRATIVE_CONFIG: NarrativeContextConfig = {
  maxHistoryItems: 10,
  includeCharacterDetails: true,
  includeLocationDetails: true,
  includeActiveQuests: true,
  includeRecentCombats: true,
  tokenBudget: 2000
};

/**
 * Manages narrative context for AI-generated storytelling
 */
export class NarrativeContext {
  private history: NarrativeExchange[] = [];
  private config: NarrativeContextConfig;
  private recentCombatSummaries: string[] = [];
  
  constructor(config: Partial<NarrativeContextConfig> = {}) {
    this.config = { ...DEFAULT_NARRATIVE_CONFIG, ...config };
  }
  
  /**
   * Add a new narrative exchange to the history
   * 
   * @param exchange The narrative exchange to add
   */
  public addExchange(exchange: NarrativeExchange): void {
    this.history.push(exchange);
    
    // Maintain maximum history size
    if (this.history.length > this.config.maxHistoryItems) {
      this.history = this.history.slice(-this.config.maxHistoryItems);
    }
  }
  
  /**
   * Add a combat summary to recent combats
   * 
   * @param summary The combat summary to add
   */
  public addCombatSummary(summary: string): void {
    this.recentCombatSummaries.unshift(summary);
    
    // Keep only the 3 most recent combat summaries
    if (this.recentCombatSummaries.length > 3) {
      this.recentCombatSummaries = this.recentCombatSummaries.slice(0, 3);
    }
  }
  
  /**
   * Build a context string for AI narrative generation
   * 
   * @param gameState The current game state
   * @returns A formatted context string
   */
  public buildContextString(gameState: GameState): string {
    const contextParts: string[] = [];
    
    // Add character information if configured
    if (this.config.includeCharacterDetails) {
      contextParts.push(this.formatCharacterContext(gameState.player));
    }
    
    // Add location information if configured
    if (this.config.includeLocationDetails) {
      contextParts.push(this.formatLocationContext(gameState));
    }
    
    // Add active quests if configured
    if (this.config.includeActiveQuests && gameState.activeQuests?.length > 0) {
      contextParts.push(this.formatQuestContext(gameState));
    }
    
    // Add recent combat summaries if configured and available
    if (this.config.includeRecentCombats && this.recentCombatSummaries.length > 0) {
      contextParts.push(this.formatCombatContext());
    }
    
    // Add narrative history (always included)
    contextParts.push(this.formatNarrativeHistory());
    
    return contextParts.join('\n\n');
  }
  
  /**
   * Format character information for context
   * 
   * @param character The player character
   * @returns Formatted character context
   */
  private formatCharacterContext(character: Character): string {
    return `CHARACTER INFORMATION:
Name: ${character.name}
Race: ${character.race.name}
Class: ${character.class.map(c => c.name).join('/')}
Level: ${character.level}
HP: ${character.hitPoints.current}/${character.hitPoints.maximum}`;
  }
  
  /**
   * Format location information for context
   * 
   * @param gameState The current game state
   * @returns Formatted location context
   */
  private formatLocationContext(gameState: GameState): string {
    const location = gameState.currentLocation;
    const npcs = gameState.npcs?.size > 0 
      ? Array.from(gameState.npcs.values()).map(npc => npc.name).join(', ')
      : 'None';
    
    return `CURRENT LOCATION:
Name: ${location.name}
Description: ${location.description}
NPCs present: ${npcs}`;
  }
  
  /**
   * Format active quests for context
   * 
   * @param gameState The current game state
   * @returns Formatted quest context
   */
  private formatQuestContext(gameState: GameState): string {
    const quests = gameState.activeQuests?.map(q => `- ${q.title}: ${q.description.substring(0, 100)}...`).join('\n') || 'None';
    
    return `ACTIVE QUESTS:
${quests}`;
  }
  
  /**
   * Format recent combat summaries for context
   * 
   * @returns Formatted combat context
   */
  private formatCombatContext(): string {
    return `RECENT COMBAT EVENTS:
${this.recentCombatSummaries.join('\n')}`;
  }
  
  /**
   * Format narrative history for context
   * 
   * @returns Formatted narrative history
   */
  private formatNarrativeHistory(): string {
    if (this.history.length === 0) {
      return 'NARRATIVE HISTORY:\nNo previous interactions.';
    }
    
    const historyText = this.history.map(exchange => 
      `Player: ${exchange.playerInput}\nDM: ${exchange.dmResponse}`
    ).join('\n\n');
    
    return `NARRATIVE HISTORY:
${historyText}`;
  }
  
  /**
   * Get the current configuration
   * 
   * @returns The current configuration
   */
  public getConfig(): NarrativeContextConfig {
    return { ...this.config };
  }
  
  /**
   * Update the configuration
   * 
   * @param config The new configuration options
   */
  public updateConfig(config: Partial<NarrativeContextConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Clear the narrative history
   */
  public clearHistory(): void {
    this.history = [];
    this.recentCombatSummaries = [];
  }
  
  /**
   * Get the narrative history
   * 
   * @returns The narrative history
   */
  public getHistory(): NarrativeExchange[] {
    return [...this.history];
  }
}

export default NarrativeContext; 