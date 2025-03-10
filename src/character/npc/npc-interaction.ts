/**
 * NPC Interaction System
 * 
 * Manages interactions between NPCs in the same location, creating a more
 * dynamic world where NPCs talk to each other, form relationships, and
 * react to the player's presence.
 */

import { NPC, NPCRelationship, NPCInteraction } from '../../core/interfaces/npc';
import { NPCManager } from './npc-manager';
import { NPCScheduler } from './npc-scheduler';
import { AIService } from '../../dm/ai-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Result of an NPC interaction
 */
export interface InteractionResult {
  id: string;
  npc1Id: string;
  npc2Id: string;
  type: 'conversation' | 'trade' | 'conflict' | 'collaboration';
  description: string;
  relationshipChange: number; // Positive or negative change to relationship
  timestamp: number;
  location: string;
  isVisible: boolean; // Whether the player can observe this interaction
}

/**
 * Manages interactions between NPCs
 */
export class NPCInteractionManager {
  private npcManager: NPCManager;
  private npcScheduler: NPCScheduler;
  private aiService: AIService;
  private recentInteractions: Map<string, number> = new Map(); // Maps NPC pair ID to timestamp
  private interactions: InteractionResult[] = [];
  
  constructor(npcManager: NPCManager, npcScheduler: NPCScheduler, aiService: AIService) {
    this.npcManager = npcManager;
    this.npcScheduler = npcScheduler;
    this.aiService = aiService;
  }
  
  /**
   * Process interactions between NPCs in the same location
   * @param currentTime Current game time in minutes
   * @param locationId Optional specific location to process, or all locations if not specified
   * @returns Interaction results visible to the player
   */
  public async processInteractions(currentTime: number, locationId?: string): Promise<InteractionResult[]> {
    const results: InteractionResult[] = [];
    
    // Get all NPCs or just NPCs in the specified location
    const npcs = locationId 
      ? this.npcManager.getNPCsInLocation(locationId)
      : this.npcManager.getAllNPCs();
    
    // Group NPCs by location
    const npcsByLocation = new Map<string, NPC[]>();
    
    for (const npc of npcs) {
      const loc = npc.location;
      if (!npcsByLocation.has(loc)) {
        npcsByLocation.set(loc, []);
      }
      npcsByLocation.get(loc)!.push(npc);
    }
    
    // Process interactions for each location
    for (const [loc, locNpcs] of npcsByLocation.entries()) {
      // Skip locations with fewer than 2 NPCs
      if (locNpcs.length < 2) {
        continue;
      }
      
      // Check which NPCs are available for interaction (not busy)
      const availableNpcs = locNpcs.filter(npc => {
        const activity = this.npcScheduler.getCurrentActivity(npc.id, currentTime);
        return activity && !activity.activity.toLowerCase().includes('sleep') && 
               !activity.activity.toLowerCase().includes('busy');
      });
      
      // Skip if fewer than 2 NPCs are available
      if (availableNpcs.length < 2) {
        continue;
      }
      
      // Randomly select pairs of NPCs to interact
      const interactionCount = Math.min(2, Math.floor(availableNpcs.length / 2));
      
      for (let i = 0; i < interactionCount; i++) {
        const npc1Index = Math.floor(Math.random() * availableNpcs.length);
        const npc1 = availableNpcs[npc1Index];
        
        // Remove npc1 from available list to avoid duplicates
        availableNpcs.splice(npc1Index, 1);
        
        // Find a suitable interaction partner
        let bestPartnerIndex = -1;
        let bestInteractionScore = -100;
        
        // Look for the best interaction partner based on existing relationships
        for (let j = 0; j < availableNpcs.length; j++) {
          const npc2 = availableNpcs[j];
          
          // Check if they've interacted recently to avoid repetitive interactions
          const pairKey = this.getPairKey(npc1.id, npc2.id);
          const lastInteraction = this.recentInteractions.get(pairKey) || 0;
          
          // Skip if they've interacted within the last hour of game time
          if (currentTime - lastInteraction < 60) {
            continue;
          }
          
          // Calculate interaction score based on relationship and randomness
          let interactionScore = Math.random() * 50; // Random component
          
          // Add relationship component if it exists
          const relationship = this.getRelationship(npc1, npc2);
          if (relationship) {
            interactionScore += relationship.value;
          }
          
          // Check if this is better than our current best
          if (interactionScore > bestInteractionScore) {
            bestInteractionScore = interactionScore;
            bestPartnerIndex = j;
          }
        }
        
        // If we found a suitable partner, create an interaction
        if (bestPartnerIndex >= 0) {
          const npc2 = availableNpcs[bestPartnerIndex];
          
          // Remove npc2 from available list
          availableNpcs.splice(bestPartnerIndex, 1);
          
          // Create the interaction
          const interaction = await this.createInteraction(npc1, npc2, loc, currentTime);
          
          // Record the interaction
          this.interactions.push(interaction);
          
          // Update the recent interactions map
          const pairKey = this.getPairKey(npc1.id, npc2.id);
          this.recentInteractions.set(pairKey, currentTime);
          
          // Update relationship between NPCs
          this.updateRelationship(npc1, npc2, interaction.relationshipChange);
          
          // If this interaction is visible to the player, add it to results
          if (interaction.isVisible) {
            results.push(interaction);
          }
        }
      }
    }
    
    return results;
  }
  
  /**
   * Create an interaction between two NPCs
   */
  private async createInteraction(npc1: NPC, npc2: NPC, location: string, currentTime: number): Promise<InteractionResult> {
    // Determine the interaction type based on relationships and occupations
    const relationship = this.getRelationship(npc1, npc2);
    const relationshipValue = relationship ? relationship.value : 0;
    
    // Possible interaction types
    const types: ('conversation' | 'trade' | 'conflict' | 'collaboration')[] = ['conversation'];
    
    // Add possible trade if they have compatible occupations
    if (this.areOccupationsCompatible(npc1.occupation, npc2.occupation)) {
      types.push('trade');
    }
    
    // Add possible conflict if relationship is negative
    if (relationshipValue < -20) {
      types.push('conflict');
    }
    
    // Add possible collaboration if relationship is positive
    if (relationshipValue > 20) {
      types.push('collaboration');
    }
    
    // Select a random type with weighting based on relationship
    let selectedType: 'conversation' | 'trade' | 'conflict' | 'collaboration';
    
    if (relationshipValue < -50) {
      // High chance of conflict for very negative relationships
      selectedType = Math.random() < 0.7 ? 'conflict' : 'conversation';
    } else if (relationshipValue > 50) {
      // High chance of collaboration for very positive relationships
      selectedType = Math.random() < 0.7 ? 'collaboration' : 'conversation';
    } else {
      // Otherwise, random selection from available types
      selectedType = types[Math.floor(Math.random() * types.length)];
    }
    
    // Generate a description of the interaction using AI
    let description: string;
    try {
      const prompt = `${npc1.name} (${npc1.occupation || 'resident'}) and ${npc2.name} (${npc2.occupation || 'resident'}) are interacting in ${location}. They are having a ${selectedType}. Their relationship is ${this.describeRelationship(relationshipValue)}. Describe their interaction in 1-2 sentences.`;
      
      description = await this.aiService.generateText(prompt);
    } catch (error) {
      // Fallback description if AI generation fails
      description = `${npc1.name} and ${npc2.name} are having a ${selectedType}.`;
    }
    
    // Determine relationship change based on interaction type
    let relationshipChange = 0;
    
    switch (selectedType) {
      case 'conversation':
        relationshipChange = Math.floor(Math.random() * 5) - 2; // -2 to +2
        break;
      case 'trade':
        relationshipChange = Math.floor(Math.random() * 7) + 1; // +1 to +7
        break;
      case 'conflict':
        relationshipChange = Math.floor(Math.random() * 10) - 15; // -15 to -6
        break;
      case 'collaboration':
        relationshipChange = Math.floor(Math.random() * 10) + 5; // +5 to +14
        break;
    }
    
    // Determine if this interaction is visible to the player based on the current location
    // In a real game, you would check if the player is in the same location
    const isVisible = Math.random() < 0.7; // 70% chance for demo purposes
    
    // Create and return the interaction result
    return {
      id: uuidv4(),
      npc1Id: npc1.id,
      npc2Id: npc2.id,
      type: selectedType,
      description,
      relationshipChange,
      timestamp: currentTime,
      location,
      isVisible
    };
  }
  
  /**
   * Check if two occupations are compatible for trade
   */
  private areOccupationsCompatible(occupation1?: string, occupation2?: string): boolean {
    if (!occupation1 || !occupation2) {
      return false;
    }
    
    // Define occupation compatibility for trade
    const tradeCompatibility: Record<string, string[]> = {
      'merchant': ['blacksmith', 'farmer', 'tailor', 'jeweler', 'merchant'],
      'blacksmith': ['merchant', 'miner', 'adventurer', 'guard'],
      'farmer': ['merchant', 'innkeeper', 'baker'],
      'innkeeper': ['farmer', 'merchant', 'brewer', 'hunter'],
      'guard': ['blacksmith', 'merchant', 'armorer'],
      'priest': ['merchant', 'noble', 'pilgrim'],
      'noble': ['merchant', 'priest', 'artist'],
    };
    
    const norm1 = occupation1.toLowerCase().trim();
    const norm2 = occupation2.toLowerCase().trim();
    
    // Check compatibility in both directions
    return (tradeCompatibility[norm1] && tradeCompatibility[norm1].includes(norm2)) ||
           (tradeCompatibility[norm2] && tradeCompatibility[norm2].includes(norm1));
  }
  
  /**
   * Get the relationship between two NPCs
   */
  private getRelationship(npc1: NPC, npc2: NPC): NPCRelationship | undefined {
    if (!npc1.relationships) return undefined;
    
    return npc1.relationships.find(r => r.npcId === npc2.id);
  }
  
  /**
   * Update the relationship between two NPCs
   */
  private updateRelationship(npc1: NPC, npc2: NPC, change: number): void {
    // Initialize relationships array if it doesn't exist
    if (!npc1.relationships) {
      npc1.relationships = [];
    }
    
    if (!npc2.relationships) {
      npc2.relationships = [];
    }
    
    // Update or create relationship for npc1 -> npc2
    let relationship1 = npc1.relationships.find(r => r.npcId === npc2.id);
    
    if (relationship1) {
      // Update existing relationship
      relationship1.value = Math.max(-100, Math.min(100, relationship1.value + change));
      relationship1.lastInteraction = Date.now();
    } else {
      // Create new relationship
      relationship1 = {
        npcId: npc2.id,
        value: Math.max(-100, Math.min(100, change)),
        type: this.determineRelationshipType(change),
        lastInteraction: Date.now()
      };
      npc1.relationships.push(relationship1);
    }
    
    // Update or create relationship for npc2 -> npc1 (slightly different to add realism)
    let relationship2 = npc2.relationships.find(r => r.npcId === npc1.id);
    
    // Add slight randomness to reciprocal relationship
    const reciprocalChange = change + Math.floor(Math.random() * 5) - 2; // -2 to +2
    
    if (relationship2) {
      // Update existing relationship
      relationship2.value = Math.max(-100, Math.min(100, relationship2.value + reciprocalChange));
      relationship2.lastInteraction = Date.now();
    } else {
      // Create new relationship
      relationship2 = {
        npcId: npc1.id,
        value: Math.max(-100, Math.min(100, reciprocalChange)),
        type: this.determineRelationshipType(reciprocalChange),
        lastInteraction: Date.now()
      };
      npc2.relationships.push(relationship2);
    }
    
    // Persist the updated NPCs
    this.npcManager.updateNPC(npc1);
    this.npcManager.updateNPC(npc2);
  }
  
  /**
   * Determine relationship type based on value
   */
  private determineRelationshipType(value: number): string {
    if (value <= -75) return 'enemy';
    if (value <= -30) return 'disliked';
    if (value <= -10) return 'unfriendly';
    if (value < 10) return 'neutral';
    if (value < 30) return 'friendly';
    if (value < 75) return 'friend';
    return 'close friend';
  }
  
  /**
   * Describe relationship in words based on value
   */
  private describeRelationship(value: number): string {
    if (value <= -75) return 'extremely hostile';
    if (value <= -50) return 'hostile';
    if (value <= -30) return 'unfriendly';
    if (value <= -10) return 'slightly negative';
    if (value < 10) return 'neutral';
    if (value < 30) return 'slightly positive';
    if (value < 50) return 'friendly';
    if (value < 75) return 'good friends';
    return 'very close friends';
  }
  
  /**
   * Get a unique key for a pair of NPCs
   */
  private getPairKey(id1: string, id2: string): string {
    // Sort IDs to ensure consistent keys regardless of parameter order
    return [id1, id2].sort().join('_');
  }
  
  /**
   * Get recent interactions in a specific location
   * @param locationId The location ID
   * @param limit Maximum number of interactions to return
   */
  public getRecentLocationInteractions(locationId: string, limit: number = 5): InteractionResult[] {
    return this.interactions
      .filter(i => i.location === locationId && i.isVisible)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  /**
   * Get interactions between two specific NPCs
   */
  public getInteractionsBetweenNPCs(npc1Id: string, npc2Id: string): InteractionResult[] {
    return this.interactions
      .filter(i => (i.npc1Id === npc1Id && i.npc2Id === npc2Id) || 
                   (i.npc1Id === npc2Id && i.npc2Id === npc1Id))
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Get all relationships for an NPC
   */
  public getNPCRelationships(npcId: string): {npc: NPC, relationship: NPCRelationship}[] {
    const npc = this.npcManager.getNPC(npcId);
    if (!npc || !npc.relationships) {
      return [];
    }
    
    return npc.relationships
      .map(r => {
        const otherNpc = this.npcManager.getNPC(r.npcId);
        return otherNpc ? { npc: otherNpc, relationship: r } : null;
      })
      .filter((r): r is {npc: NPC, relationship: NPCRelationship} => r !== null);
  }
} 