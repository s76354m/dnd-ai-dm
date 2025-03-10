/**
 * social-interaction.ts
 * 
 * This module provides a system for managing and simulating interactions between NPCs 
 * in the D&D AI DM application. It extends the NPC system to enable NPCs to form 
 * relationships, share information, and engage in social activities independent 
 * of player interaction.
 */

import { NPCPersonality } from '../personality-model';
import { Emotion, EmotionalState } from '../personality-model';
import { RelationshipTracker, RelationshipData } from '../../core/relationship-tracker';
import { MemoryManager, Memory } from '../../core/memory-manager';
import { BehaviorSimulation, Behavior, Goal, NeedType } from '../behavior-simulation';
import { DialogueSystem } from '../dialogue-system';

/**
 * Types of social interactions that can occur between NPCs
 */
export enum SocialInteractionType {
  CONVERSATION = 'conversation',
  TRADE = 'trade',
  COOPERATION = 'cooperation',
  COMPETITION = 'competition',
  CONFLICT = 'conflict',
  ASSISTANCE = 'assistance',
  GIFT_GIVING = 'gift_giving',
  INTIMIDATION = 'intimidation',
  PERSUASION = 'persuasion',
  DECEPTION = 'deception',
  ENTERTAINMENT = 'entertainment',
  MENTORING = 'mentoring',
  ROMANCE = 'romance',
  RELIGIOUS_ACTIVITY = 'religious_activity',
  SHARED_MEAL = 'shared_meal'
}

/**
 * Outcome of a social interaction
 */
export interface SocialInteractionOutcome {
  primaryNpcId: string;
  secondaryNpcId: string;
  interactionType: SocialInteractionType;
  relationshipChange: number; // Positive or negative change to relationship
  emotionalImpact: { emotion: Emotion; intensity: number }[];
  knowledgeShared: string[]; // Information shared during interaction
  resourcesExchanged?: Map<string, number>; // For trade or gift interactions
  goalProgress?: Map<string, number>; // Goals that were advanced by this interaction
  memoryCreated: boolean; // Whether this interaction was memorable enough to create a memory
  timestamp: number; // When the interaction occurred
}

/**
 * Configuration options for the social interaction system
 */
export interface SocialInteractionConfig {
  interactionFrequency: number; // How often NPCs attempt to interact (minutes)
  relationshipChangeScale: number; // Multiplier for relationship changes (0.1-2.0)
  personalityImpactWeight: number; // How much personality affects interaction outcomes (0-1)
  memoryImportanceThreshold: number; // Threshold for creating memories (0-100)
  emotionalVolatility: number; // How easily emotions change from interactions (0-1)
  knowledgeSharingThreshold: number; // Relationship level needed to share information (0-100)
  maxInteractionsPerUpdate: number; // Maximum interactions processed per update
  debugMode: boolean; // Whether to output detailed logs
}

/**
 * Interface for an NPC with social information
 */
export interface SocialNPC {
  id: string;
  name: string;
  personality: NPCPersonality;
  knowledge: string[]; // Things the NPC knows
  emotionalState: EmotionalState;
  currentLocation: string;
  occupation?: string;
  faction?: string;
  goals: Map<string, Goal>;
  schedule: any[]; // Using any temporarily, would be replaced with proper type
}

/**
 * System for managing social interactions between NPCs
 */
export class SocialInteractionSystem {
  private memoryManager: MemoryManager;
  private relationshipTracker: RelationshipTracker;
  private behaviorSimulation: BehaviorSimulation;
  private dialogueSystem: DialogueSystem;
  private config: SocialInteractionConfig;
  
  // Cache of NPCs for quick access
  private npcCache: Map<string, SocialNPC> = new Map();
  
  // Tracks ongoing interactions
  private activeInteractions: Map<string, SocialInteractionType> = new Map();
  
  // Track when NPCs last interacted with each other
  private lastInteractionTime: Map<string, number> = new Map();

  /**
   * Create a new social interaction system
   */
  constructor(
    memoryManager: MemoryManager,
    relationshipTracker: RelationshipTracker,
    behaviorSimulation: BehaviorSimulation,
    dialogueSystem: DialogueSystem,
    config?: Partial<SocialInteractionConfig>
  ) {
    this.memoryManager = memoryManager;
    this.relationshipTracker = relationshipTracker;
    this.behaviorSimulation = behaviorSimulation;
    this.dialogueSystem = dialogueSystem;
    
    // Default configuration with reasonable values
    const defaultConfig: SocialInteractionConfig = {
      interactionFrequency: 60, // One hour in game time
      relationshipChangeScale: 1.0,
      personalityImpactWeight: 0.7,
      memoryImportanceThreshold: 30,
      emotionalVolatility: 0.5,
      knowledgeSharingThreshold: 40,
      maxInteractionsPerUpdate: 20,
      debugMode: false
    };
    
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Register an NPC with the social interaction system
   */
  public registerNPC(npc: SocialNPC): void {
    this.npcCache.set(npc.id, npc);
    
    if (this.config.debugMode) {
      console.log(`[SocialInteractionSystem] Registered NPC: ${npc.name} (${npc.id})`);
    }
  }

  /**
   * Update NPC information in the cache
   */
  public updateNPC(npcId: string, updatedData: Partial<SocialNPC>): boolean {
    const npc = this.npcCache.get(npcId);
    if (!npc) {
      if (this.config.debugMode) {
        console.warn(`[SocialInteractionSystem] Cannot update NPC ${npcId}: not found`);
      }
      return false;
    }
    
    // Update the NPC data
    Object.assign(npc, updatedData);
    this.npcCache.set(npcId, npc);
    
    if (this.config.debugMode) {
      console.log(`[SocialInteractionSystem] Updated NPC: ${npc.name} (${npc.id})`);
    }
    
    return true;
  }

  /**
   * Remove an NPC from the system
   */
  public removeNPC(npcId: string): boolean {
    const success = this.npcCache.delete(npcId);
    
    if (this.config.debugMode && success) {
      console.log(`[SocialInteractionSystem] Removed NPC: ${npcId}`);
    }
    
    return success;
  }

  /**
   * Update the social interaction system, processing potential interactions
   * between NPCs based on their location, relationships, and current activities.
   * 
   * @param gameTimeMinutes Minutes of game time that have passed since last update
   */
  public updateSystem(gameTimeMinutes: number): void {
    if (this.npcCache.size < 2) {
      // Need at least 2 NPCs to have social interactions
      return;
    }
    
    // Find NPCs who could potentially interact
    const potentialInteractions = this.identifyPotentialInteractions();
    
    // Limit the number of interactions processed
    const interactionsToProcess = potentialInteractions.slice(0, this.config.maxInteractionsPerUpdate);
    
    // Process each potential interaction
    for (const [npc1Id, npc2Id] of interactionsToProcess) {
      this.processInteraction(npc1Id, npc2Id);
    }
    
    // Update tracked interaction times
    this.updateInteractionTimes(gameTimeMinutes);
    
    if (this.config.debugMode) {
      console.log(`[SocialInteractionSystem] Processed ${interactionsToProcess.length} social interactions`);
    }
  }

  /**
   * Identify pairs of NPCs who could potentially interact
   * based on proximity, relationship, and availability
   */
  private identifyPotentialInteractions(): [string, string][] {
    const potentialInteractions: [string, string][] = [];
    const npcs = Array.from(this.npcCache.values());
    
    // Check each unique pair of NPCs
    for (let i = 0; i < npcs.length - 1; i++) {
      for (let j = i + 1; j < npcs.length; j++) {
        const npc1 = npcs[i];
        const npc2 = npcs[j];
        
        // Skip if either NPC is already in an interaction
        if (this.isInActiveInteraction(npc1.id) || this.isInActiveInteraction(npc2.id)) {
          continue;
        }
        
        // Only NPCs in the same location can interact
        if (npc1.currentLocation !== npc2.currentLocation) {
          continue;
        }
        
        // Check if enough time has passed since their last interaction
        const interactionKey = this.getInteractionKey(npc1.id, npc2.id);
        const lastTime = this.lastInteractionTime.get(interactionKey) || 0;
        const currentTime = Date.now();
        
        if (currentTime - lastTime < this.config.interactionFrequency * 60 * 1000) {
          // Not enough time has passed
          continue;
        }
        
        // Add this pair as a potential interaction
        potentialInteractions.push([npc1.id, npc2.id]);
      }
    }
    
    // Sort by relationship strength, so NPCs with stronger relationships
    // are more likely to interact
    potentialInteractions.sort((a, b) => {
      const relationshipA = this.getRelationshipStrength(a[0], a[1]);
      const relationshipB = this.getRelationshipStrength(b[0], b[1]);
      
      // Higher relationship strength first
      return relationshipB - relationshipA;
    });
    
    return potentialInteractions;
  }

  /**
   * Process an interaction between two NPCs
   */
  private processInteraction(npc1Id: string, npc2Id: string): SocialInteractionOutcome | null {
    const npc1 = this.npcCache.get(npc1Id);
    const npc2 = this.npcCache.get(npc2Id);
    
    if (!npc1 || !npc2) {
      if (this.config.debugMode) {
        console.warn(`[SocialInteractionSystem] Cannot process interaction: NPC not found`);
      }
      return null;
    }
    
    // Mark both NPCs as in an active interaction
    const interactionKey = this.getInteractionKey(npc1Id, npc2Id);
    
    // Determine the type of interaction based on relationships and personalities
    const interactionType = this.determineInteractionType(npc1, npc2);
    this.activeInteractions.set(npc1Id, interactionType);
    this.activeInteractions.set(npc2Id, interactionType);
    
    // Generate the interaction outcome
    const outcome = this.generateInteractionOutcome(npc1, npc2, interactionType);
    
    // Apply the effects of the interaction
    this.applyInteractionEffects(outcome);
    
    // Reset active interaction status
    this.activeInteractions.delete(npc1Id);
    this.activeInteractions.delete(npc2Id);
    
    // Update last interaction time
    this.lastInteractionTime.set(interactionKey, Date.now());
    
    if (this.config.debugMode) {
      console.log(`[SocialInteractionSystem] Interaction between ${npc1.name} and ${npc2.name}: ${interactionType}`);
    }
    
    return outcome;
  }

  /**
   * Determine what type of interaction would occur between two NPCs
   * based on their personalities and existing relationship
   */
  private determineInteractionType(npc1: SocialNPC, npc2: SocialNPC): SocialInteractionType {
    const relationship = this.getRelationshipStrength(npc1.id, npc2.id);
    
    // Get key personality traits that influence interaction types
    const npc1Extraversion = npc1.personality.traits.extraversion;
    const npc2Extraversion = npc2.personality.traits.extraversion;
    const npc1Agreeableness = npc1.personality.traits.agreeableness;
    const npc2Agreeableness = npc2.personality.traits.agreeableness;
    
    // Positive relationship possibilities
    if (relationship > 70) {
      // Close friends or allies with strong positive relationship
      const options = [
        SocialInteractionType.CONVERSATION,
        SocialInteractionType.COOPERATION,
        SocialInteractionType.ASSISTANCE,
        SocialInteractionType.GIFT_GIVING,
        SocialInteractionType.SHARED_MEAL
      ];
      
      // Add romance as a possibility for certain personalities and very strong relationships
      if (relationship > 85 && 
          Math.random() < 0.3 && 
          npc1Extraversion > 60 && 
          npc2Extraversion > 50) {
        options.push(SocialInteractionType.ROMANCE);
      }
      
      // Weighted random selection
      return this.weightedRandomSelection(options);
    } 
    else if (relationship > 40) {
      // Friendly acquaintances
      const options = [
        SocialInteractionType.CONVERSATION,
        SocialInteractionType.TRADE,
        SocialInteractionType.ENTERTAINMENT,
        SocialInteractionType.SHARED_MEAL
      ];
      
      // Add cooperation for more agreeable NPCs
      if (npc1Agreeableness > 60 && npc2Agreeableness > 60) {
        options.push(SocialInteractionType.COOPERATION);
      }
      
      return this.weightedRandomSelection(options);
    }
    else if (relationship > 0) {
      // Neutral to slightly positive
      const options = [
        SocialInteractionType.CONVERSATION,
        SocialInteractionType.TRADE
      ];
      
      // Add more options for extraverted NPCs
      if (npc1Extraversion > 70 || npc2Extraversion > 70) {
        options.push(SocialInteractionType.ENTERTAINMENT);
      }
      
      return this.weightedRandomSelection(options);
    }
    else if (relationship > -40) {
      // Slightly negative to neutral
      const options = [
        SocialInteractionType.CONVERSATION, // Tense conversation
        SocialInteractionType.PERSUASION,
        SocialInteractionType.COMPETITION
      ];
      
      // Add deception for less agreeable NPCs
      if (npc1Agreeableness < 40 || npc2Agreeableness < 40) {
        options.push(SocialInteractionType.DECEPTION);
      }
      
      return this.weightedRandomSelection(options);
    }
    else {
      // Strongly negative relationship
      const options = [
        SocialInteractionType.CONFLICT,
        SocialInteractionType.INTIMIDATION
      ];
      
      // Even enemies might talk sometimes
      if (Math.random() < 0.3) {
        options.push(SocialInteractionType.CONVERSATION); // Hostile conversation
      }
      
      return this.weightedRandomSelection(options);
    }
  }

  /**
   * Generate the outcome of an interaction between two NPCs
   */
  private generateInteractionOutcome(
    npc1: SocialNPC, 
    npc2: SocialNPC, 
    interactionType: SocialInteractionType
  ): SocialInteractionOutcome {
    // Base values
    let relationshipChange = 0;
    const emotionalImpact: { emotion: Emotion; intensity: number }[] = [];
    const knowledgeShared: string[] = [];
    const resourcesExchanged = new Map<string, number>();
    const goalProgress = new Map<string, number>();
    
    // Adjust based on interaction type
    switch (interactionType) {
      case SocialInteractionType.CONVERSATION:
        relationshipChange = this.calculateConversationOutcome(npc1, npc2);
        this.determineKnowledgeSharing(npc1, npc2, knowledgeShared);
        break;
        
      case SocialInteractionType.COOPERATION:
        relationshipChange = 5 + Math.random() * 10;
        this.determineCooperationOutcome(npc1, npc2, goalProgress);
        emotionalImpact.push({ 
          emotion: Emotion.TRUST, 
          intensity: 10 + Math.random() * 30 
        });
        break;
        
      case SocialInteractionType.CONFLICT:
        relationshipChange = -10 - Math.random() * 20;
        emotionalImpact.push({ 
          emotion: Emotion.ANGER, 
          intensity: 20 + Math.random() * 50 
        });
        break;
        
      case SocialInteractionType.TRADE:
        relationshipChange = 2 + Math.random() * 5;
        this.determineTradeOutcome(npc1, npc2, resourcesExchanged);
        break;
        
      // Additional interaction type outcomes would be implemented here
      
      default:
        // Default modest positive outcome
        relationshipChange = 1 + Math.random() * 3;
    }
    
    // Personality modifiers to relationship change
    relationshipChange = this.applyPersonalityModifiers(npc1, npc2, relationshipChange, interactionType);
    
    // Scale the relationship change based on config
    relationshipChange *= this.config.relationshipChangeScale;
    
    // Determine if this interaction is important enough to create a memory
    const importanceScore = Math.abs(relationshipChange) * 10 + 
                           emotionalImpact.reduce((sum, e) => sum + e.intensity, 0);
    
    const memoryCreated = importanceScore > this.config.memoryImportanceThreshold;
    
    // Create the outcome object
    const outcome: SocialInteractionOutcome = {
      primaryNpcId: npc1.id,
      secondaryNpcId: npc2.id,
      interactionType,
      relationshipChange,
      emotionalImpact,
      knowledgeShared,
      resourcesExchanged,
      goalProgress,
      memoryCreated,
      timestamp: Date.now()
    };
    
    return outcome;
  }

  /**
   * Apply the effects of an interaction to the NPCs involved
   */
  private applyInteractionEffects(outcome: SocialInteractionOutcome): void {
    // Update relationship
    this.relationshipTracker.adjustRelationship(
      outcome.primaryNpcId,
      outcome.secondaryNpcId,
      outcome.relationshipChange
    );
    
    // Get NPCs
    const npc1 = this.npcCache.get(outcome.primaryNpcId);
    const npc2 = this.npcCache.get(outcome.secondaryNpcId);
    if (!npc1 || !npc2) return;
    
    // Apply emotional changes
    for (const emotion of outcome.emotionalImpact) {
      // Apply to first NPC
      // Assuming an updateEmotionalState method exists on NPCPersonality or similar
      // This would need to be implemented or adjusted based on actual implementation
      // npc1.personality.updateEmotionalState(emotion.emotion, emotion.intensity);
      
      // Apply to second NPC (possibly with different intensity)
      // npc2.personality.updateEmotionalState(emotion.emotion, emotion.intensity * 0.8);
    }
    
    // Create memories if important enough
    if (outcome.memoryCreated) {
      this.createInteractionMemories(outcome, npc1, npc2);
    }
    
    // Process knowledge sharing
    if (outcome.knowledgeShared.length > 0) {
      this.processKnowledgeSharing(outcome, npc1, npc2);
    }
    
    // Update goal progress if applicable
    if (outcome.goalProgress && outcome.goalProgress.size > 0) {
      // This would need to interface with the goal tracking system
      // Implementation would depend on the actual goal system
    }
  }

  /**
   * Create memories of this interaction for the involved NPCs
   */
  private createInteractionMemories(
    outcome: SocialInteractionOutcome,
    npc1: SocialNPC,
    npc2: SocialNPC
  ): void {
    // Basic description of what happened
    const interactionDescription = this.generateInteractionDescription(outcome);
    
    // Create memory for first NPC
    const memory1: Memory = {
      id: `mem_${Date.now()}_${npc1.id}_${outcome.interactionType}`,
      entityId: npc1.id,
      relatedEntityIds: [npc2.id],
      content: interactionDescription,
      timestamp: outcome.timestamp,
      importance: Math.abs(outcome.relationshipChange) * 10 + 
                 outcome.emotionalImpact.reduce((sum, e) => sum + e.intensity, 0),
      emotionalValence: outcome.relationshipChange > 0 ? 'positive' : 'negative',
      tags: [
        'social', 
        outcome.interactionType,
        npc2.id
      ]
    };
    
    // Create slightly different memory for second NPC
    const memory2: Memory = {
      ...memory1,
      id: `mem_${Date.now()}_${npc2.id}_${outcome.interactionType}`,
      entityId: npc2.id,
      relatedEntityIds: [npc1.id],
      // Could adjust content for different perspective
      content: this.generateInteractionDescription(outcome, true)
    };
    
    // Add memories to memory manager
    this.memoryManager.addMemory(memory1);
    this.memoryManager.addMemory(memory2);
  }

  /**
   * Generate a description of an interaction
   */
  private generateInteractionDescription(
    outcome: SocialInteractionOutcome,
    reversed: boolean = false
  ): string {
    const npc1Id = reversed ? outcome.secondaryNpcId : outcome.primaryNpcId;
    const npc2Id = reversed ? outcome.primaryNpcId : outcome.secondaryNpcId;
    
    const npc1 = this.npcCache.get(npc1Id);
    const npc2 = this.npcCache.get(npc2Id);
    
    if (!npc1 || !npc2) {
      return "An interaction occurred but details are unclear.";
    }
    
    // Base descriptions for different interaction types
    const descriptions = {
      [SocialInteractionType.CONVERSATION]: `had a conversation with`,
      [SocialInteractionType.TRADE]: `traded goods with`,
      [SocialInteractionType.COOPERATION]: `worked together with`,
      [SocialInteractionType.COMPETITION]: `competed against`,
      [SocialInteractionType.CONFLICT]: `got into a conflict with`,
      [SocialInteractionType.ASSISTANCE]: `helped`,
      [SocialInteractionType.GIFT_GIVING]: `gave a gift to`,
      [SocialInteractionType.INTIMIDATION]: `intimidated`,
      [SocialInteractionType.PERSUASION]: `tried to persuade`,
      [SocialInteractionType.DECEPTION]: `attempted to deceive`,
      [SocialInteractionType.ENTERTAINMENT]: `shared entertainment with`,
      [SocialInteractionType.MENTORING]: `provided mentorship to`,
      [SocialInteractionType.ROMANCE]: `had a romantic moment with`,
      [SocialInteractionType.RELIGIOUS_ACTIVITY]: `shared a religious activity with`,
      [SocialInteractionType.SHARED_MEAL]: `shared a meal with`
    };
    
    const baseAction = descriptions[outcome.interactionType] || "interacted with";
    
    // Add emotional qualifiers if there were strong emotions
    let emotionalQualifier = "";
    if (outcome.emotionalImpact.length > 0) {
      const strongestEmotion = outcome.emotionalImpact.reduce(
        (prev, current) => current.intensity > prev.intensity ? current : prev,
        outcome.emotionalImpact[0]
      );
      
      if (strongestEmotion.intensity > 30) {
        const emotionDescriptions = {
          [Emotion.JOY]: "a joyful",
          [Emotion.SADNESS]: "a sad",
          [Emotion.ANGER]: "an angry",
          [Emotion.FEAR]: "a fearful",
          [Emotion.DISGUST]: "a disgusted",
          [Emotion.SURPRISE]: "a surprising",
          [Emotion.TRUST]: "a trusting",
          [Emotion.ANTICIPATION]: "an anticipatory"
        };
        
        emotionalQualifier = emotionDescriptions[strongestEmotion.emotion] || "an emotional";
      }
    }
    
    // Add relationship qualifier
    let relationshipQualifier = "";
    if (Math.abs(outcome.relationshipChange) > 10) {
      relationshipQualifier = outcome.relationshipChange > 0 ? 
        "which improved their relationship" : 
        "which worsened their relationship";
    }
    
    // Construct the description
    let description = `${npc1.name} ${baseAction} ${npc2.name}`;
    
    // Add qualifiers if they exist
    if (emotionalQualifier) {
      description = `${npc1.name} had ${emotionalQualifier} interaction where they ${baseAction} ${npc2.name}`;
    }
    
    if (relationshipQualifier) {
      description = `${description}, ${relationshipQualifier}`;
    }
    
    // Add knowledge sharing if relevant
    if (outcome.knowledgeShared.length > 0) {
      description = `${description}. Information was shared during this interaction.`;
    }
    
    return description;
  }

  /**
   * Process knowledge sharing between NPCs
   */
  private processKnowledgeSharing(
    outcome: SocialInteractionOutcome,
    npc1: SocialNPC,
    npc2: SocialNPC
  ): void {
    // This would need to be implemented based on the knowledge system
    // Generally, would transfer knowledge from the outcome.knowledgeShared array
    // to the appropriate NPC's knowledge base
  }

  /**
   * Calculate the outcome of a conversation between NPCs
   */
  private calculateConversationOutcome(npc1: SocialNPC, npc2: SocialNPC): number {
    // Base relationship change
    let relationshipChange = 0;
    
    // Personality compatibility
    const compatibilityScore = this.calculatePersonalityCompatibility(npc1, npc2);
    relationshipChange += compatibilityScore * 5; // Scale for impact
    
    // Intelligence and Openness boost meaningful conversations
    const npc1OpenIntelligent = npc1.personality.traits.openness > 60 ? 1 : 0;
    const npc2OpenIntelligent = npc2.personality.traits.openness > 60 ? 1 : 0;
    relationshipChange += (npc1OpenIntelligent + npc2OpenIntelligent) * 2;
    
    // Extraversion enhances conversation
    const npc1Extraversion = npc1.personality.traits.extraversion > 60 ? 1 : 0;
    const npc2Extraversion = npc2.personality.traits.extraversion > 60 ? 1 : 0;
    
    // Extraverts enjoy talking to other extraverts
    if (npc1Extraversion && npc2Extraversion) {
      relationshipChange += 3;
    }
    
    // Random factor to represent conversation topics and chance elements
    relationshipChange += (Math.random() * 6) - 3; // -3 to +3 random factor
    
    return relationshipChange;
  }

  /**
   * Determine what knowledge might be shared in an interaction
   */
  private determineKnowledgeSharing(
    npc1: SocialNPC,
    npc2: SocialNPC,
    knowledgeShared: string[]
  ): void {
    // Get relationship strength
    const relationship = this.getRelationshipStrength(npc1.id, npc2.id);
    
    // Only share if relationship is above threshold
    if (relationship < this.config.knowledgeSharingThreshold) {
      return;
    }
    
    // Determine how much knowledge might be shared
    const sharingProbability = relationship / 100; // Higher relationship = more sharing
    const maxItemsToShare = Math.floor(1 + (relationship / 20)); // 1-6 items based on relationship
    
    // Check each knowledge item NPC1 has that NPC2 doesn't
    // (This would need to be adapted to the actual knowledge representation)
    for (const knowledge of npc1.knowledge) {
      // Skip if NPC2 already knows this
      if (npc2.knowledge.includes(knowledge)) {
        continue;
      }
      
      // Probability check for sharing this piece of knowledge
      if (Math.random() < sharingProbability) {
        knowledgeShared.push(knowledge);
        
        // Break if we've shared enough items
        if (knowledgeShared.length >= maxItemsToShare) {
          break;
        }
      }
    }
  }

  /**
   * Determine the outcome of a cooperative interaction
   */
  private determineCooperationOutcome(
    npc1: SocialNPC,
    npc2: SocialNPC,
    goalProgress: Map<string, number>
  ): void {
    // Check for overlapping goals
    const npc1Goals = Array.from(npc1.goals.values());
    const npc2Goals = Array.from(npc2.goals.values());
    
    // Find goals that could benefit from cooperation
    for (const goal of npc1Goals) {
      // Skip goals that are already complete
      if (goal.progress >= 100) continue;
      
      // Base progress boost
      const baseProgress = 5 + Math.random() * 10; // 5-15% progress boost
      
      // Check if NPC2 has a similar goal
      const similarGoal = npc2Goals.find(g => 
        g.description.toLowerCase().includes(goal.description.toLowerCase()) ||
        g.relatedNeed === goal.relatedNeed
      );
      
      if (similarGoal) {
        // Both NPCs have similar goals, boost is higher
        const progressBoost = baseProgress * 1.5;
        
        // Record progress for both NPCs
        goalProgress.set(goal.id, progressBoost);
        goalProgress.set(similarGoal.id, progressBoost);
      } else {
        // Only NPC1 benefits
        goalProgress.set(goal.id, baseProgress);
      }
      
      // Only process one goal for simplicity
      // More complex logic could handle multiple goals
      break;
    }
  }

  /**
   * Determine the outcome of a trade interaction
   */
  private determineTradeOutcome(
    npc1: SocialNPC,
    npc2: SocialNPC,
    resourcesExchanged: Map<string, number>
  ): void {
    // Simplified trade simulation
    // In a real implementation, would check inventories, needs, and values
    
    // Placeholder for resource exchange tracking
    resourcesExchanged.set('gold_npc1_to_npc2', Math.floor(1 + Math.random() * 10));
    resourcesExchanged.set('items_npc2_to_npc1', Math.floor(1 + Math.random() * 3));
  }

  /**
   * Apply personality-based modifiers to relationship change
   */
  private applyPersonalityModifiers(
    npc1: SocialNPC,
    npc2: SocialNPC,
    baseChange: number,
    interactionType: SocialInteractionType
  ): number {
    let modifiedChange = baseChange;
    
    // Calculate personality compatibility
    const compatibilityFactor = this.calculatePersonalityCompatibility(npc1, npc2);
    
    // Apply the modifier based on config weight
    modifiedChange *= (1 + (compatibilityFactor * this.config.personalityImpactWeight));
    
    // Special case modifiers based on interaction type
    switch (interactionType) {
      case SocialInteractionType.CONFLICT:
        // Neurotic personalities take conflict harder
        if (npc1.personality.traits.neuroticism > 70 || npc2.personality.traits.neuroticism > 70) {
          modifiedChange *= 1.3; // 30% stronger effect
        }
        break;
        
      case SocialInteractionType.COOPERATION:
        // Conscientious personalities value successful cooperation more
        if (npc1.personality.traits.conscientiousness > 70 && npc2.personality.traits.conscientiousness > 70) {
          modifiedChange *= 1.2; // 20% stronger effect
        }
        break;
        
      // Additional special cases could be added here
    }
    
    return modifiedChange;
  }

  /**
   * Calculate how compatible two NPC personalities are
   * Returns a value from -1 (completely incompatible) to 1 (perfect compatibility)
   */
  private calculatePersonalityCompatibility(npc1: SocialNPC, npc2: SocialNPC): number {
    // Get the Big Five traits
    const traits1 = npc1.personality.traits;
    const traits2 = npc2.personality.traits;
    
    // Different compatibility calculations for different trait pairs
    
    // 1. Extraversion: Similar levels are more compatible
    const extraversionDiff = Math.abs(traits1.extraversion - traits2.extraversion) / 100;
    const extraversionCompat = 1 - extraversionDiff;
    
    // 2. Agreeableness: Higher values are generally more compatible
    const agreeablenessAvg = (traits1.agreeableness + traits2.agreeableness) / 200;
    
    // 3. Conscientiousness: Similar levels are more compatible
    const conscientiousnessDiff = Math.abs(traits1.conscientiousness - traits2.conscientiousness) / 100;
    const conscientiousnessCompat = 1 - conscientiousnessDiff;
    
    // 4. Neuroticism: Lower values are generally more compatible
    const neuroticismPenalty = (traits1.neuroticism + traits2.neuroticism) / 200;
    const neuroticismCompat = 1 - neuroticismPenalty;
    
    // 5. Openness: Higher openness is more accepting of differences
    const opennessBonus = (traits1.openness + traits2.openness) / 200;
    
    // Calculate overall compatibility with weighted factors
    const compatibility = (
      (extraversionCompat * 0.2) +
      (agreeablenessAvg * 0.3) +
      (conscientiousnessCompat * 0.15) +
      (neuroticismCompat * 0.25) +
      (opennessBonus * 0.1)
    ) * 2 - 1; // Scale from -1 to 1
    
    return compatibility;
  }

  /**
   * Check if an NPC is currently in an active interaction
   */
  private isInActiveInteraction(npcId: string): boolean {
    return this.activeInteractions.has(npcId);
  }

  /**
   * Get the strength of the relationship between two NPCs
   */
  private getRelationshipStrength(npc1Id: string, npc2Id: string): number {
    // Get relationship data from the relationship tracker
    const relationship = this.relationshipTracker.getRelationship(npc1Id, npc2Id);
    
    if (relationship) {
      return relationship.value;
    }
    
    // Default neutral relationship if none exists
    return 0;
  }

  /**
   * Create a consistent key for tracking interactions between NPCs
   */
  private getInteractionKey(npc1Id: string, npc2Id: string): string {
    // Sort IDs to ensure the same key regardless of parameter order
    const sortedIds = [npc1Id, npc2Id].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  /**
   * Helper method for weighted random selection
   */
  private weightedRandomSelection<T>(options: T[]): T {
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Update the tracked times for NPC interactions
   */
  private updateInteractionTimes(gameTimeMinutes: number): void {
    // In a real implementation, this would adjust the tracked times
    // based on the passage of game time
  }
} 