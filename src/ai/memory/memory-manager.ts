/**
 * Memory Manager
 * 
 * This system provides advanced memory management for AI interactions, prioritizing
 * relevant narrative events and optimizing token usage for context windows.
 */

import { GameState, SimpleNPC, SimpleCharacter, SimpleLocation } from '../../simple-main';

/**
 * Types of memory items that can be stored
 */
export enum MemoryType {
  NARRATIVE = 'narrative',       // Story events and descriptions
  DIALOGUE = 'dialogue',         // Conversations with NPCs
  COMBAT = 'combat',             // Combat events and outcomes
  DECISION = 'decision',         // Important player decisions
  DISCOVERY = 'discovery',       // World discoveries and revelations
  RELATIONSHIP = 'relationship', // NPC relationship developments
  QUEST = 'quest',               // Quest-related events
  ITEM = 'item',                 // Significant item interactions
  LOCATION = 'location',         // Location descriptions and details
  SYSTEM = 'system'              // System-level context and information
}

/**
 * A memory item with metadata for prioritization
 */
export interface MemoryItem {
  id: string;               // Unique identifier for the memory
  type: MemoryType;         // Type of memory
  content: string;          // The actual text content
  timestamp: number;        // When the memory was created
  importance: number;       // Importance score (0-10)
  recency: number;          // Recency factor (updates on access)
  relevant_entities: string[]; // Related NPCs, locations, items, quests
  token_count: number;      // Approximate token count
  context_categories: string[]; // Categories for filtering (combat, social, etc.)
  expiration?: number;      // Optional timestamp when memory should expire
}

/**
 * Configuration for memory prioritization
 */
export interface MemoryConfig {
  max_tokens: number;          // Maximum tokens for context window
  recency_weight: number;      // Weight for recency in scoring (0-1)
  importance_weight: number;   // Weight for importance in scoring (0-1)
  relevance_weight: number;    // Weight for relevance in scoring (0-1)
  type_weights: Record<MemoryType, number>; // Weights for different memory types
  decay_rate: number;          // Rate at which recency decays
  retain_top_n_per_type: number; // Number of top memories to always retain per type
}

/**
 * Manages memory prioritization for AI context windows
 */
export class MemoryManager {
  private memories: Map<string, MemoryItem> = new Map();
  private config: MemoryConfig;
  private currentEntities: Set<string> = new Set();
  
  constructor(config?: Partial<MemoryConfig>) {
    // Default configuration
    this.config = {
      max_tokens: 3000,
      recency_weight: 0.3,
      importance_weight: 0.4,
      relevance_weight: 0.3,
      type_weights: {
        [MemoryType.NARRATIVE]: 1.0,
        [MemoryType.DIALOGUE]: 0.9,
        [MemoryType.COMBAT]: 0.8,
        [MemoryType.DECISION]: 1.0,
        [MemoryType.DISCOVERY]: 0.9,
        [MemoryType.RELATIONSHIP]: 0.9,
        [MemoryType.QUEST]: 1.0,
        [MemoryType.ITEM]: 0.7,
        [MemoryType.LOCATION]: 0.8,
        [MemoryType.SYSTEM]: 1.0
      },
      decay_rate: 0.95,
      retain_top_n_per_type: 1,
      ...config
    };
  }
  
  /**
   * Add a new memory item
   */
  public addMemory(memory: Omit<MemoryItem, 'id' | 'timestamp' | 'recency'>): string {
    const id = `mem_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const timestamp = Date.now();
    
    const newMemory: MemoryItem = {
      ...memory,
      id,
      timestamp,
      recency: 1.0
    };
    
    this.memories.set(id, newMemory);
    return id;
  }
  
  /**
   * Update the current entities of focus (NPCs, locations, quests, etc.)
   */
  public updateCurrentEntities(entities: string[]): void {
    this.currentEntities = new Set(entities);
    
    // Apply decay to recency for all memories
    for (const memory of this.memories.values()) {
      memory.recency *= this.config.decay_rate;
    }
  }
  
  /**
   * Access a memory, updating its recency
   */
  public accessMemory(id: string): MemoryItem | undefined {
    const memory = this.memories.get(id);
    if (memory) {
      memory.recency = 1.0; // Reset recency when accessed
      return memory;
    }
    return undefined;
  }
  
  /**
   * Calculate a memory's score based on importance, recency, and relevance
   */
  private calculateScore(memory: MemoryItem): number {
    // Calculate relevance based on current entities
    const relevance = memory.relevant_entities.some(entity => 
      this.currentEntities.has(entity)) ? 1.0 : 0.2;
    
    // Calculate the weighted score
    const score = 
      (memory.importance / 10) * this.config.importance_weight +
      memory.recency * this.config.recency_weight +
      relevance * this.config.relevance_weight;
    
    // Apply type weight
    return score * this.config.type_weights[memory.type];
  }
  
  /**
   * Get the optimized context based on current state
   */
  public getOptimizedContext(gameState: GameState): string {
    // Update entities based on current game state
    this.updateEntitiesFromGameState(gameState);
    
    // Score all memories
    const scoredMemories = Array.from(this.memories.values())
      .map(memory => ({
        memory,
        score: this.calculateScore(memory)
      }))
      .sort((a, b) => b.score - a.score);
    
    // Get top memories by type to ensure diversity
    const topMemoriesByType = this.getTopMemoriesByType(scoredMemories);
    
    // Build context within token limit
    return this.buildContextWithinTokenLimit(scoredMemories, topMemoriesByType);
  }
  
  /**
   * Update entities based on game state
   */
  private updateEntitiesFromGameState(gameState: GameState): void {
    const entities: string[] = [];
    
    // Add player
    entities.push(gameState.player.name);
    
    // Add current location
    entities.push(gameState.currentLocation.name);
    
    // Add NPCs in current location
    gameState.npcs.forEach(npc => {
      if (npc.locationId === gameState.currentLocation.id) {
        entities.push(npc.name);
      }
    });
    
    // Add active quest names
    gameState.quests
      .filter(quest => quest.status === 'active')
      .forEach(quest => entities.push(quest.name));
    
    this.updateCurrentEntities(entities);
  }
  
  /**
   * Get top memories for each type to ensure context diversity
   */
  private getTopMemoriesByType(scoredMemories: Array<{memory: MemoryItem, score: number}>): Set<string> {
    const topMemories = new Set<string>();
    
    // Group memories by type
    const memoriesByType = new Map<MemoryType, Array<{memory: MemoryItem, score: number}>>();
    
    for (const scored of scoredMemories) {
      const type = scored.memory.type;
      if (!memoriesByType.has(type)) {
        memoriesByType.set(type, []);
      }
      memoriesByType.get(type)?.push(scored);
    }
    
    // Get top N from each type
    for (const [type, memories] of memoriesByType.entries()) {
      memories.slice(0, this.config.retain_top_n_per_type).forEach(scored => {
        topMemories.add(scored.memory.id);
      });
    }
    
    return topMemories;
  }
  
  /**
   * Build context string within token limit
   */
  private buildContextWithinTokenLimit(
    scoredMemories: Array<{memory: MemoryItem, score: number}>,
    priorityIds: Set<string>
  ): string {
    let contextParts: string[] = [];
    let totalTokens = 0;
    
    // First add all priority memories
    for (const scored of scoredMemories) {
      if (priorityIds.has(scored.memory.id)) {
        contextParts.push(scored.memory.content);
        totalTokens += scored.memory.token_count;
        // Remove from the main list to avoid duplication
        priorityIds.delete(scored.memory.id);
      }
    }
    
    // Then add remaining memories until we hit the token limit
    for (const scored of scoredMemories) {
      if (priorityIds.has(scored.memory.id)) continue; // Skip already added
      
      if (totalTokens + scored.memory.token_count <= this.config.max_tokens) {
        contextParts.push(scored.memory.content);
        totalTokens += scored.memory.token_count;
      } else {
        break; // Stop once we hit the token limit
      }
    }
    
    return contextParts.join('\n\n');
  }
  
  /**
   * Create a summary of memories by type
   */
  public getMemorySummary(): Record<MemoryType, number> {
    const summary: Record<MemoryType, number> = {} as Record<MemoryType, number>;
    
    // Initialize counts to zero
    Object.values(MemoryType).forEach(type => {
      summary[type as MemoryType] = 0;
    });
    
    // Count memories by type
    for (const memory of this.memories.values()) {
      summary[memory.type]++;
    }
    
    return summary;
  }
} 