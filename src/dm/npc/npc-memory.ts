/**
 * NPC Memory System
 * 
 * Tracks NPC interactions with the player, relationship status,
 * knowledge, and other memory aspects to create persistent, coherent NPCs.
 */

import { GameState } from '../../core/interfaces/game';
import { NPC } from '../../core/interfaces/npc';

/**
 * Represents a single interaction between the player and an NPC
 */
export interface NPCInteraction {
  timestamp: Date;
  playerDialogue: string;
  npcResponse: string;
  topics: string[];
  emotionalTone: string;
  relationshipImpact: number; // -2 to 2, where negative is harmful, positive is helpful
  location: string;
}

/**
 * Represents a fact that an NPC knows
 */
export interface NPCKnowledge {
  fact: string;
  importance: number; // 1-10, where 10 is extremely important
  isSecret: boolean; // Whether the NPC tries to keep this secret
  willingness: number; // 1-10, how willing the NPC is to share this information
  source?: string; // Where the NPC learned this fact
  subjects: string[]; // What/who this fact is about
}

/**
 * Player impression on specific topics
 */
export interface TopicImpression {
  topic: string;
  impression: number; // -10 to 10, where negative is negative, positive is positive
  lastUpdated: Date;
}

/**
 * Represents the memory and state of an NPC
 */
export interface NPCMemory {
  npcId: string;
  interactions: NPCInteraction[];
  knownFacts: NPCKnowledge[];
  topicImpressions: TopicImpression[];
  relationshipLevel: number; // -10 to 10, where negative is hostile, positive is friendly
  lastInteraction: Date | null;
  playerIntroduced: boolean; // Whether the player has introduced themselves
  questsGiven: string[];
  questsCompleted: string[];
  notableEvents: Array<{event: string, timestamp: Date}>;
  playerTraits: Record<string, string>; // NPC's perception of player traits
}

/**
 * Configuration options for the NPC Memory Manager
 */
export interface NPCMemoryConfig {
  maxInteractionHistory: number;
  maxKnownFacts: number;
  includeInteractionHistory: boolean;
  includePlayerImpressions: boolean;
  includeQuestHistory: boolean;
  relationshipDecayRate: number; // How quickly relationship decays over time (if at all)
}

/**
 * Default configuration for the NPC Memory Manager
 */
export const DEFAULT_MEMORY_CONFIG: NPCMemoryConfig = {
  maxInteractionHistory: 10,
  maxKnownFacts: 30,
  includeInteractionHistory: true,
  includePlayerImpressions: true,
  includeQuestHistory: true,
  relationshipDecayRate: 0.1 // Slight decay over time if no interactions
};

/**
 * NPC Memory Manager
 * 
 * Manages memory and knowledge for NPCs to create coherent, 
 * persistent characters with memory of player interactions.
 */
export class NPCMemoryManager {
  private npcMemories: Map<string, NPCMemory> = new Map();
  private config: NPCMemoryConfig;
  
  /**
   * Create a new NPC Memory Manager
   * 
   * @param config Optional configuration overrides
   */
  constructor(config: Partial<NPCMemoryConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }
  
  /**
   * Get the memory for a specific NPC
   * 
   * @param npcId ID of the NPC
   * @returns The NPC's memory, or undefined if not found
   */
  public getMemory(npcId: string): NPCMemory | undefined {
    return this.npcMemories.get(npcId);
  }
  
  /**
   * Create a new memory entry for an NPC
   * 
   * @param npc The NPC to create memory for
   * @returns The newly created memory
   */
  public createMemory(npc: NPC): NPCMemory {
    if (!npc || !npc.id) {
      throw new Error('Cannot create memory: NPC or NPC ID is missing');
    }
    
    const memory: NPCMemory = {
      npcId: npc.id,
      interactions: [],
      knownFacts: this.generateInitialKnowledge(npc),
      topicImpressions: [],
      relationshipLevel: this.determineInitialRelationship(npc),
      lastInteraction: null,
      playerIntroduced: false,
      questsGiven: [],
      questsCompleted: [],
      notableEvents: [],
      playerTraits: {}
    };
    
    this.npcMemories.set(npc.id, memory);
    return memory;
  }
  
  /**
   * Generate initial knowledge for an NPC based on their background
   * 
   * @param npc The NPC to generate knowledge for
   * @returns Array of initial knowledge facts
   */
  private generateInitialKnowledge(npc: NPC): NPCKnowledge[] {
    if (!npc) {
      return [];
    }
    
    const knowledge: NPCKnowledge[] = [];
    
    // Add basic knowledge based on NPC occupation, if available
    if (npc.occupation) {
      switch (npc.occupation.toLowerCase()) {
        case 'innkeeper':
          knowledge.push({
            fact: 'Local gossip and rumors about the town',
            importance: 6,
            isSecret: false,
            willingness: 8,
            subjects: ['town', 'locals']
          });
          knowledge.push({
            fact: 'Information about recent travelers',
            importance: 4,
            isSecret: false,
            willingness: 7,
            subjects: ['travelers', 'visitors']
          });
          break;
          
        case 'merchant':
          knowledge.push({
            fact: 'Trade routes and market prices',
            importance: 8,
            isSecret: false,
            willingness: 6,
            subjects: ['trade', 'economy']
          });
          knowledge.push({
            fact: 'Quality and source of their merchandise',
            importance: 7,
            isSecret: false,
            willingness: 9,
            subjects: ['merchandise', 'goods']
          });
          break;
          
        case 'guard':
        case 'soldier':
          knowledge.push({
            fact: 'Local security concerns and threats',
            importance: 7,
            isSecret: false,
            willingness: 5,
            subjects: ['security', 'threats']
          });
          knowledge.push({
            fact: 'Layout of the area they patrol',
            importance: 6,
            isSecret: false,
            willingness: 7,
            subjects: ['location', 'layout']
          });
          break;
      }
    }
    
    // Add knowledge based on race, if relevant
    if (npc.race) {
      knowledge.push({
        fact: `Cultural information about ${npc.race}s`,
        importance: 5,
        isSecret: false,
        willingness: 7,
        subjects: [npc.race, 'culture']
      });
    }
    
    return knowledge;
  }
  
  /**
   * Determine initial relationship level based on NPC traits
   * 
   * @param npc The NPC to determine relationship for
   * @returns Initial relationship value (-10 to 10)
   */
  private determineInitialRelationship(npc: NPC): number {
    // Default neutral relationship
    let relationshipValue = 0;
    
    // If NPC has a personality trait that affects initial impressions
    if (npc.personality) {
      const personality = typeof npc.personality === 'string' 
        ? npc.personality.toLowerCase() 
        : '';
      
      if (personality.includes('friendly') || 
          personality.includes('kind') || 
          personality.includes('welcoming')) {
        relationshipValue += 2;
      }
      
      if (personality.includes('suspicious') || 
          personality.includes('wary') || 
          personality.includes('cautious')) {
        relationshipValue -= 1;
      }
      
      if (personality.includes('hostile') || 
          personality.includes('aggressive') || 
          personality.includes('unfriendly')) {
        relationshipValue -= 3;
      }
    }
    
    // Ensure value is within bounds
    return Math.max(-10, Math.min(10, relationshipValue));
  }
  
  /**
   * Add a new interaction between the player and an NPC
   * 
   * @param npcId ID of the NPC
   * @param playerDialogue What the player said
   * @param npcResponse How the NPC responded
   * @param topics Topics discussed in the interaction
   * @param emotionalTone Emotional tone of the interaction
   * @param relationshipImpact Impact on relationship (-2 to 2)
   * @param gameState Current game state
   */
  public addInteraction(
    npcId: string,
    playerDialogue: string,
    npcResponse: string,
    topics: string[],
    emotionalTone: string,
    relationshipImpact: number,
    gameState: GameState
  ): void {
    if (!npcId || !gameState) {
      console.error('Cannot add interaction: Missing required parameters');
      return;
    }
    
    // Get or create memory
    let memory = this.npcMemories.get(npcId);
    
    if (!memory) {
      const npc = this.findNPC(npcId, gameState);
      if (!npc) {
        console.error(`Cannot add interaction: NPC with ID ${npcId} not found`);
        return;
      }
      
      memory = this.createMemory(npc);
    }
    
    // Create the interaction
    const interaction: NPCInteraction = {
      timestamp: new Date(),
      playerDialogue: playerDialogue || '',
      npcResponse: npcResponse || '',
      topics: topics || [],
      emotionalTone: emotionalTone || 'neutral',
      relationshipImpact: relationshipImpact || 0,
      location: gameState.currentLocation?.name || 'Unknown Location'
    };
    
    // Add to interaction history
    memory.interactions.push(interaction);
    
    // Limit history size if needed
    if (memory.interactions.length > this.config.maxInteractionHistory) {
      memory.interactions = memory.interactions.slice(-this.config.maxInteractionHistory);
    }
    
    // Update relationship level
    memory.relationshipLevel = Math.max(-10, Math.min(10, 
      memory.relationshipLevel + relationshipImpact
    ));
    
    // Update topic impressions
    this.updateTopicImpressions(memory, topics, relationshipImpact);
    
    // Update last interaction time
    memory.lastInteraction = new Date();
    
    // Check for player introduction
    if (!memory.playerIntroduced) {
      // Simple check for introduction - could be more sophisticated
      const introPatterns = [
        /i am [a-z\s]+/i,
        /my name is [a-z\s]+/i,
        /call me [a-z\s]+/i,
        /i'm [a-z\s]+/i
      ];
      
      if (introPatterns.some(pattern => pattern.test(playerDialogue))) {
        memory.playerIntroduced = true;
        
        // Try to extract player name
        const nameMatch = playerDialogue.match(/(?:i am|my name is|call me|i'm) ([a-z\s]+)/i);
        if (nameMatch && nameMatch[1]) {
          const possibleName = nameMatch[1].trim();
          memory.playerTraits['name'] = possibleName;
        }
      }
    }
    
    // Extract potential player traits from dialogue
    this.extractPlayerTraits(memory, playerDialogue);
  }
  
  /**
   * Update topic impressions based on interaction
   * 
   * @param memory NPC memory to update
   * @param topics Topics discussed
   * @param impactValue Impact value to apply
   */
  private updateTopicImpressions(
    memory: NPCMemory, 
    topics: string[], 
    impactValue: number
  ): void {
    const now = new Date();
    
    topics.forEach(topic => {
      // Find existing impression if any
      const existingImpression = memory.topicImpressions.find(
        imp => imp.topic.toLowerCase() === topic.toLowerCase()
      );
      
      if (existingImpression) {
        // Update existing impression
        existingImpression.impression = Math.max(-10, Math.min(10, 
          existingImpression.impression + impactValue
        ));
        existingImpression.lastUpdated = now;
      } else {
        // Create new impression
        memory.topicImpressions.push({
          topic,
          impression: impactValue, // Initial impression
          lastUpdated: now
        });
      }
    });
  }
  
  /**
   * Extract player traits from dialogue
   * 
   * @param memory NPC memory to update
   * @param playerDialogue Player's dialogue to analyze
   */
  private extractPlayerTraits(memory: NPCMemory, playerDialogue: string): void {
    // This is a simple implementation - in a real system, you might
    // use more sophisticated NLP techniques or AI to extract traits
    
    const traitPatterns: Record<string, RegExp[]> = {
      'class': [/i am a (\w+)/i, /i'm a (\w+)/i],
      'profession': [/i work as a (\w+)/i, /i'm a (\w+) by trade/i],
      'home': [/i'm from (\w+)/i, /i come from (\w+)/i],
      'goal': [/i seek (\w+)/i, /i'm looking for (\w+)/i, /i need to find (\w+)/i]
    };
    
    // Check each trait pattern
    Object.entries(traitPatterns).forEach(([trait, patterns]) => {
      patterns.forEach(pattern => {
        const match = playerDialogue.match(pattern);
        if (match && match[1]) {
          memory.playerTraits[trait] = match[1].trim();
        }
      });
    });
  }
  
  /**
   * Add a new fact to an NPC's knowledge
   * 
   * @param npcId ID of the NPC
   * @param fact The fact to add
   * @param importance Importance of the fact (1-10)
   * @param isSecret Whether this is secret knowledge
   * @param willingness How willing the NPC is to share (1-10)
   * @param subjects What/who this fact is about
   * @param source Where the NPC learned this
   */
  public addKnowledge(
    npcId: string,
    fact: string,
    importance: number,
    isSecret: boolean,
    willingness: number,
    subjects: string[],
    source?: string
  ): void {
    const memory = this.npcMemories.get(npcId);
    
    if (!memory) {
      console.error(`Cannot add knowledge: NPC with ID ${npcId} not found in memory`);
      return;
    }
    
    // Create the knowledge entry
    const knowledge: NPCKnowledge = {
      fact,
      importance: Math.max(1, Math.min(10, importance)),
      isSecret,
      willingness: Math.max(1, Math.min(10, willingness)),
      source,
      subjects
    };
    
    // Add to known facts
    memory.knownFacts.push(knowledge);
    
    // Limit size if needed
    if (memory.knownFacts.length > this.config.maxKnownFacts) {
      // Remove least important facts first
      memory.knownFacts.sort((a, b) => a.importance - b.importance);
      memory.knownFacts = memory.knownFacts.slice(-this.config.maxKnownFacts);
    }
  }
  
  /**
   * Add a quest given by the NPC to the player
   * 
   * @param npcId ID of the NPC
   * @param questId ID of the quest
   */
  public addQuestGiven(npcId: string, questId: string): void {
    const memory = this.npcMemories.get(npcId);
    
    if (!memory) {
      console.error(`Cannot add quest: NPC with ID ${npcId} not found in memory`);
      return;
    }
    
    if (!memory.questsGiven.includes(questId)) {
      memory.questsGiven.push(questId);
    }
  }
  
  /**
   * Mark a quest as completed by the player
   * 
   * @param npcId ID of the NPC
   * @param questId ID of the completed quest
   */
  public completeQuest(npcId: string, questId: string): void {
    const memory = this.npcMemories.get(npcId);
    
    if (!memory) {
      console.error(`Cannot complete quest: NPC with ID ${npcId} not found in memory`);
      return;
    }
    
    if (memory.questsGiven.includes(questId) && !memory.questsCompleted.includes(questId)) {
      memory.questsCompleted.push(questId);
      
      // Add as notable event
      memory.notableEvents.push({
        event: `Player completed quest: ${questId}`,
        timestamp: new Date()
      });
      
      // Improve relationship for completed quest
      memory.relationshipLevel = Math.min(10, memory.relationshipLevel + 1);
    }
  }
  
  /**
   * Add a notable event to the NPC's memory
   * 
   * @param npcId ID of the NPC
   * @param event Description of the event
   */
  public addNotableEvent(npcId: string, event: string): void {
    const memory = this.npcMemories.get(npcId);
    
    if (!memory) {
      console.error(`Cannot add event: NPC with ID ${npcId} not found in memory`);
      return;
    }
    
    memory.notableEvents.push({
      event,
      timestamp: new Date()
    });
  }
  
  /**
   * Update NPC memories based on time passed
   * 
   * @param gameState Current game state
   * @param daysPassed Number of in-game days passed
   */
  public updateMemoriesWithTimePassed(gameState: GameState, daysPassed: number): void {
    if (!gameState || daysPassed <= 0) {
      return;
    }
    
    const decayAmount = daysPassed * this.config.relationshipDecayRate;
    
    this.npcMemories.forEach((memory, npcId) => {
      if (!memory) {
        return;
      }
      
      // Apply relationship decay if there's been no recent interaction
      if (memory.lastInteraction) {
        // Calculate days since last interaction
        const now = new Date();
        const daysSinceInteraction = (now.getTime() - memory.lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceInteraction > 7) { // More than a week
          // Apply decay, but don't go below -5 (complete stranger)
          memory.relationshipLevel = Math.max(-5, memory.relationshipLevel - decayAmount);
        }
      }
    });
  }
  
  /**
   * Build a context string for NPC dialogue
   * 
   * @param npcId ID of the NPC
   * @param gameState Current game state
   * @returns A formatted context string
   */
  public buildNPCContext(npcId: string, gameState: GameState): string {
    // Find the NPC
    const npc = this.findNPC(npcId, gameState);
    
    if (!npc) {
      return `NPC Context: No information found for NPC ID ${npcId}.`;
    }
    
    // Get memory or create if it doesn't exist
    let memory = this.npcMemories.get(npcId);
    
    if (!memory) {
      memory = this.createMemory(npc);
    }
    
    // Start building context
    const contextParts: string[] = [];
    
    // Add basic NPC information
    contextParts.push(`## NPC Information`);
    contextParts.push(`Name: ${npc.name || 'Unknown'}`);
    
    if (npc.race) {
      contextParts.push(`Race: ${npc.race}`);
    }
    
    if (npc.occupation) {
      contextParts.push(`Occupation: ${npc.occupation}`);
    }
    
    if (npc.personality) {
      contextParts.push(`Personality: ${npc.personality}`);
    }
    
    // Add relationship status
    contextParts.push(`\n## Relationship with Player`);
    contextParts.push(`Level: ${memory.relationshipLevel} (${this.describeRelationship(memory.relationshipLevel)})`);
    
    if (memory.playerIntroduced) {
      contextParts.push(`Player has introduced themselves.`);
    } else {
      contextParts.push(`Player has not introduced themselves.`);
    }
    
    // Add player traits as perceived by the NPC
    if (memory.playerTraits && Object.keys(memory.playerTraits).length > 0) {
      contextParts.push(`\nKnown Player Traits:`);
      Object.entries(memory.playerTraits).forEach(([trait, value]) => {
        contextParts.push(`- ${trait}: ${value}`);
      });
    }
    
    // Add topic impressions if configured
    if (this.config.includePlayerImpressions && memory.topicImpressions.length > 0) {
      contextParts.push(`\n## Topic Impressions`);
      
      memory.topicImpressions
        .sort((a, b) => Math.abs(b.impression) - Math.abs(a.impression))
        .slice(0, 5) // Top 5 strongest impressions
        .forEach(impression => {
          const sentiment = impression.impression > 0 ? 'positive' : 
                           impression.impression < 0 ? 'negative' : 'neutral';
          
          contextParts.push(`- ${impression.topic}: ${sentiment} (${impression.impression})`);
        });
    }
    
    // Add recent interactions if configured
    if (this.config.includeInteractionHistory && memory.interactions.length > 0) {
      contextParts.push(`\n## Recent Interactions`);
      
      // Include the most recent interactions, newest first
      memory.interactions.slice(-3).reverse().forEach((interaction, index) => {
        const when = this.formatTimestamp(interaction.timestamp);
        contextParts.push(`\nInteraction ${index + 1} (${when}):`);
        contextParts.push(`Player: "${interaction.playerDialogue}"`);
        contextParts.push(`${npc.name}: "${interaction.npcResponse}"`);
        contextParts.push(`Tone: ${interaction.emotionalTone}`);
      });
    }
    
    // Add relevant knowledge
    const relevantFacts = this.getRelevantKnowledge(memory, gameState);
    if (relevantFacts.length > 0) {
      contextParts.push(`\n## Relevant Knowledge`);
      
      relevantFacts.forEach(knowledge => {
        let factString = `- ${knowledge.fact}`;
        
        if (knowledge.isSecret) {
          factString += ` (secret, willingness: ${knowledge.willingness})`;
        }
        
        contextParts.push(factString);
      });
    }
    
    // Add quest information if configured
    if (this.config.includeQuestHistory && 
        (memory.questsGiven.length > 0 || memory.questsCompleted.length > 0)) {
      contextParts.push(`\n## Quest Information`);
      
      if (memory.questsGiven.length > 0) {
        contextParts.push(`Quests Given:`);
        memory.questsGiven.forEach(questId => {
          const completed = memory.questsCompleted.includes(questId);
          contextParts.push(`- ${questId} (${completed ? 'Completed' : 'Active'})`);
        });
      }
    }
    
    // Add notable events
    if (memory.notableEvents.length > 0) {
      contextParts.push(`\n## Notable Events`);
      
      memory.notableEvents
        .slice(-3) // Last 3 events
        .forEach(event => {
          const when = this.formatTimestamp(event.timestamp);
          contextParts.push(`- ${when}: ${event.event}`);
        });
    }
    
    return contextParts.join('\n');
  }
  
  /**
   * Get facts from the NPC's knowledge that are relevant to the current situation
   * 
   * @param memory NPC memory to check
   * @param gameState Current game state
   * @returns Array of relevant knowledge
   */
  private getRelevantKnowledge(memory: NPCMemory, gameState: GameState): NPCKnowledge[] {
    // This would be more sophisticated in a real implementation
    
    // For now, return facts relevant to the current location or the player
    return memory.knownFacts.filter(knowledge => {
      const locationRelevant = gameState.currentLocation && 
                              knowledge.subjects.some(subject => 
                                gameState.currentLocation.name.toLowerCase().includes(subject.toLowerCase()));
      
      const playerRelevant = knowledge.subjects.some(subject => 
                              subject.toLowerCase() === 'player' || 
                              subject.toLowerCase() === 'adventurer' ||
                              (memory.playerTraits.name && 
                               subject.toLowerCase().includes(memory.playerTraits.name.toLowerCase())));
      
      return locationRelevant || playerRelevant || knowledge.importance >= 8;
    });
  }
  
  /**
   * Format a timestamp into a human-readable string
   * 
   * @param timestamp The timestamp to format
   * @returns A formatted string
   */
  private formatTimestamp(timestamp: Date): string {
    // For a real game, this might use in-game time instead
    return timestamp.toLocaleString();
  }
  
  /**
   * Describe the relationship level in words
   * 
   * @param level Relationship level (-10 to 10)
   * @returns Description of the relationship
   */
  private describeRelationship(level: number): string {
    if (level <= -8) return 'Hostile';
    if (level <= -5) return 'Very Unfriendly';
    if (level <= -2) return 'Unfriendly';
    if (level <= 2) return 'Neutral';
    if (level <= 5) return 'Friendly';
    if (level <= 8) return 'Very Friendly';
    return 'Allied';
  }
  
  /**
   * Find an NPC by ID in the game state
   * 
   * @param npcId ID of the NPC to find
   * @param gameState Current game state
   * @returns The NPC, or undefined if not found
   */
  private findNPC(npcId: string, gameState: GameState): NPC | undefined {
    if (!npcId || !gameState || !gameState.npcs) {
      return undefined;
    }
    
    return gameState.npcs.get(npcId);
  }
  
  /**
   * Clear memory for a specific NPC
   * 
   * @param npcId ID of the NPC
   */
  public clearMemory(npcId: string): void {
    this.npcMemories.delete(npcId);
  }
  
  /**
   * Clear all NPC memories
   */
  public clearAllMemories(): void {
    this.npcMemories.clear();
  }
  
  /**
   * Get all NPCs that remember the player
   * 
   * @returns Array of NPC IDs that have memories of the player
   */
  public getNPCsWithMemory(): string[] {
    return Array.from(this.npcMemories.keys());
  }
}

export default NPCMemoryManager; 