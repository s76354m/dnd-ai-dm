/**
 * Dynamic NPC Dialogue System
 * 
 * This system provides a rich dialogue model for NPCs, supporting:
 * - Dialogue generation based on NPC personality
 * - Memory-informed responses that recall past player interactions
 * - Emotional state influencing dialogue tone and content
 * - Topic tracking to maintain conversation coherence
 * - Relationship-aware responses that evolve over time
 */

import { MemoryManager, MemoryType, MemoryItem } from '../memory/memory-manager';
import { RelationshipTracker, Relationship } from '../memory/relationship-tracker';
import { PersonalityModel, NPCPersonality, Emotion, Value, Flaw } from './personality-model';
import { EnhancedContextManager } from '../enhanced-context-manager';

/**
 * Dialogue context containing information needed to generate appropriate responses
 */
export interface DialogueContext {
  npcId: string;
  playerId: string;
  currentLocation: string;
  recentEvents: MemoryItem[];
  activeTopics: DialogueTopic[];
  previousExchanges: DialogueExchange[];
  situation: DialogueSituation;
  playerQuery?: string;
}

/**
 * Dialogue topic representing a conversation thread
 */
export interface DialogueTopic {
  id: string;
  subject: string;
  importance: number; // 0-100
  introduced: number; // timestamp when introduced
  lastDiscussed: number; // timestamp when last discussed
  exhausted: boolean; // whether the topic has been fully discussed
  relatedTopics: string[]; // IDs of related topics
  knowledgeLevel: number; // 0-100, how much the NPC knows about this
  npcInterest: number; // -100 to 100, negative means the NPC wants to avoid it
  playerInterest: number; // -100 to 100, estimated player interest
}

/**
 * A single exchange in a dialogue
 */
export interface DialogueExchange {
  timestamp: number;
  playerDialogue?: string;
  npcDialogue: string;
  emotion: Emotion;
  topicsDiscussed: string[]; // Topic IDs
  newInformationRevealed: boolean;
}

/**
 * The situation surrounding a dialogue
 */
export enum DialogueSituation {
  CASUAL_GREETING = 'casual_greeting',
  FIRST_MEETING = 'first_meeting',
  TENSE_CONFRONTATION = 'tense_confrontation',
  NEGOTIATION = 'negotiation',
  INFORMATION_SEEKING = 'information_seeking',
  STORYTELLING = 'storytelling',
  TRADE_HAGGLING = 'trade_haggling',
  QUEST_BRIEFING = 'quest_briefing',
  QUEST_FOLLOWUP = 'quest_followup',
  INTIMIDATION = 'intimidation',
  PERSUASION = 'persuasion',
  DECEPTION = 'deception',
  FLIRTATION = 'flirtation',
  WARNING = 'warning',
  FAREWELL = 'farewell'
}

/**
 * Configuration for the dialogue system
 */
export interface DialogueSystemConfig {
  maxPreviousExchanges: number;
  maxActiveTopics: number;
  topicExhaustionThreshold: number;
  maxDialogueMemories: number;
  emotionalInfluenceFactor: number; // 0-1, how much emotions affect dialogue
  memoryInfluenceFactor: number; // 0-1, how much memories affect dialogue
  relationshipInfluenceFactor: number; // 0-1, how much relationship affects dialogue
  debugMode: boolean;
}

/**
 * Default dialogue system configuration
 */
const DEFAULT_CONFIG: DialogueSystemConfig = {
  maxPreviousExchanges: 5,
  maxActiveTopics: 3,
  topicExhaustionThreshold: 3,
  maxDialogueMemories: 20,
  emotionalInfluenceFactor: 0.7,
  memoryInfluenceFactor: 0.8,
  relationshipInfluenceFactor: 0.6,
  debugMode: false
};

/**
 * Manages dynamic NPC dialogue generation
 */
export class DialogueSystem {
  private personalityModel: PersonalityModel;
  private memoryManager: MemoryManager;
  private relationshipTracker: RelationshipTracker;
  private contextManager: EnhancedContextManager;
  private config: DialogueSystemConfig;
  
  // Track active conversations by NPC ID
  private activeConversations: Map<string, DialogueContext> = new Map();
  
  // Track known topics for each NPC
  private npcTopics: Map<string, Map<string, DialogueTopic>> = new Map();
  
  /**
   * Create a new dialogue system
   */
  constructor(
    personalityModel: PersonalityModel,
    memoryManager: MemoryManager,
    relationshipTracker: RelationshipTracker,
    contextManager: EnhancedContextManager,
    config?: Partial<DialogueSystemConfig>
  ) {
    this.personalityModel = personalityModel;
    this.memoryManager = memoryManager;
    this.relationshipTracker = relationshipTracker;
    this.contextManager = contextManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Generate an NPC response based on dialogue context
   */
  public async generateDialogue(
    npcId: string,
    playerId: string,
    playerQuery: string,
    situation: DialogueSituation,
    currentLocation: string
  ): Promise<string> {
    // Get or initialize dialogue context
    let context = this.getOrCreateDialogueContext(
      npcId, 
      playerId,
      currentLocation,
      situation
    );
    
    // Update the context with the new player query
    context.playerQuery = playerQuery;
    
    // Update active topics based on the query
    this.updateActiveTopics(context, playerQuery);
    
    // Get NPC personality
    const personality = this.personalityModel.getPersonality(npcId);
    if (!personality) {
      return this.generateGenericResponse(playerQuery);
    }
    
    // Get relationship between NPC and player
    const relationship = this.relationshipTracker.getOrCreateRelationship(npcId, playerId);
    
    // Build prompt for AI to generate dialogue
    const prompt = this.buildDialoguePrompt(context, personality, relationship);
    
    try {
      // Use enhanced context manager to generate response
      const dialogueResponse = await this.contextManager.generateNPCDialogue(
        npcId,
        playerId,
        prompt,
        context.situation
      );
      
      // Process and record the dialogue exchange
      return this.processDialogueResponse(context, dialogueResponse, personality);
    } catch (error) {
      console.error(`Error generating dialogue for NPC ${npcId}:`, error);
      return this.generateFallbackResponse(personality);
    }
  }
  
  /**
   * Add a known topic for an NPC
   */
  public addNPCTopic(
    npcId: string,
    topic: string,
    importance: number,
    knowledgeLevel: number,
    npcInterest: number
  ): DialogueTopic {
    // Get or create topic map for this NPC
    if (!this.npcTopics.has(npcId)) {
      this.npcTopics.set(npcId, new Map<string, DialogueTopic>());
    }
    
    const npcTopicMap = this.npcTopics.get(npcId)!;
    
    // Create a new topic
    const topicId = `topic_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = Date.now();
    
    const newTopic: DialogueTopic = {
      id: topicId,
      subject: topic,
      importance: Math.max(0, Math.min(100, importance)),
      introduced: now,
      lastDiscussed: now,
      exhausted: false,
      relatedTopics: [],
      knowledgeLevel: Math.max(0, Math.min(100, knowledgeLevel)),
      npcInterest: Math.max(-100, Math.min(100, npcInterest)),
      playerInterest: 0 // Initially unknown
    };
    
    npcTopicMap.set(topicId, newTopic);
    
    return newTopic;
  }
  
  /**
   * Connect two topics as related
   */
  public connectRelatedTopics(npcId: string, topicId1: string, topicId2: string): boolean {
    const npcTopicMap = this.npcTopics.get(npcId);
    if (!npcTopicMap) return false;
    
    const topic1 = npcTopicMap.get(topicId1);
    const topic2 = npcTopicMap.get(topicId2);
    
    if (!topic1 || !topic2) return false;
    
    // Add as related if not already related
    if (!topic1.relatedTopics.includes(topicId2)) {
      topic1.relatedTopics.push(topicId2);
    }
    
    if (!topic2.relatedTopics.includes(topicId1)) {
      topic2.relatedTopics.push(topicId1);
    }
    
    return true;
  }
  
  /**
   * Start a new conversation with an NPC
   */
  public startConversation(
    npcId: string, 
    playerId: string,
    location: string,
    situation: DialogueSituation
  ): DialogueContext {
    return this.getOrCreateDialogueContext(npcId, playerId, location, situation);
  }
  
  /**
   * End the current conversation with an NPC
   */
  public endConversation(npcId: string): void {
    const context = this.activeConversations.get(npcId);
    if (!context) return;
    
    // Record the conversation summary in memory
    if (context.previousExchanges.length > 0) {
      const summary = this.generateConversationSummary(context);
      
      // Store in memory manager
      this.memoryManager.addMemory({
        id: `dialogue_${Date.now()}`,
        type: MemoryType.DIALOGUE,
        content: summary,
        entities: [context.npcId, context.playerId],
        timestamp: Date.now(),
        importance: this.calculateConversationImportance(context),
        location: context.currentLocation,
        recency: 1.0
      });
    }
    
    // Remove from active conversations
    this.activeConversations.delete(npcId);
  }
  
  /**
   * Update player interest in a topic based on conversation
   */
  public updatePlayerTopicInterest(
    npcId: string,
    topicId: string,
    interestChange: number
  ): void {
    const npcTopicMap = this.npcTopics.get(npcId);
    if (!npcTopicMap) return;
    
    const topic = npcTopicMap.get(topicId);
    if (!topic) return;
    
    topic.playerInterest = Math.max(-100, Math.min(100, 
      topic.playerInterest + interestChange
    ));
  }
  
  /**
   * Mark a topic as exhausted (fully discussed)
   */
  public markTopicExhausted(npcId: string, topicId: string): void {
    const npcTopicMap = this.npcTopics.get(npcId);
    if (!npcTopicMap) return;
    
    const topic = npcTopicMap.get(topicId);
    if (!topic) return;
    
    topic.exhausted = true;
  }
  
  /**
   * Get recommended topics for an NPC to discuss based on the current context
   */
  public getRecommendedTopics(
    npcId: string,
    playerId: string,
    currentSituation: DialogueSituation
  ): DialogueTopic[] {
    const npcTopicMap = this.npcTopics.get(npcId);
    if (!npcTopicMap || npcTopicMap.size === 0) {
      return [];
    }
    
    const personality = this.personalityModel.getPersonality(npcId);
    if (!personality) return [];
    
    const relationship = this.relationshipTracker.getOrCreateRelationship(npcId, playerId);
    
    // Filter to non-exhausted topics
    const availableTopics = Array.from(npcTopicMap.values())
      .filter(topic => !topic.exhausted);
    
    if (availableTopics.length === 0) return [];
    
    // Calculate a score for each topic based on its relevance to the current situation,
    // the NPC's personality, and the relationship
    const scoredTopics = availableTopics.map(topic => {
      let score = topic.importance;
      
      // Adjust based on NPC interest
      score += topic.npcInterest * 0.5;
      
      // Adjust based on player interest
      score += topic.playerInterest * 0.3;
      
      // Adjust based on how recently it was discussed (decay factor)
      const recency = (Date.now() - topic.lastDiscussed) / (1000 * 60 * 60 * 24); // Days
      score -= Math.min(recency * 5, 50); // Reduce score up to 50 points for old topics
      
      // Adjust based on relationship
      if (relationship.strength <= -2) {
        // In hostile relationships, NPCs might bring up sensitive topics
        score += Math.abs(topic.playerInterest) * 0.2; 
      } else if (relationship.strength >= 2) {
        // In friendly relationships, NPCs will focus on topics the player likes
        score += Math.max(0, topic.playerInterest) * 0.4;
      }
      
      // Adjust based on personality
      if (personality.values.primary === Value.KNOWLEDGE) {
        score += topic.knowledgeLevel * 0.3;
      }
      
      if (personality.traits.extraversion > 70) {
        score += Math.abs(topic.playerInterest) * 0.2; // Extraverts discuss emotionally charged topics
      }
      
      return { topic, score };
    });
    
    // Sort by score
    scoredTopics.sort((a, b) => b.score - a.score);
    
    // Return top topics
    return scoredTopics.slice(0, this.config.maxActiveTopics).map(item => item.topic);
  }
  
  /**
   * Generate a greeting appropriate to the NPC's personality and relationship
   */
  public generateGreeting(npcId: string, playerId: string): string {
    const personality = this.personalityModel.getPersonality(npcId);
    if (!personality) {
      return "Hello there.";
    }
    
    const relationship = this.relationshipTracker.getOrCreateRelationship(npcId, playerId);
    
    // Base greeting on relationship strength and emotional state
    let greeting = "";
    
    // Relationship-based greeting
    if (relationship.strength <= -2) {
      greeting = "What do you want?";
    } else if (relationship.strength === -1) {
      greeting = "Yes?";
    } else if (relationship.strength === 0) {
      greeting = "Hello.";
    } else if (relationship.strength === 1) {
      greeting = "Good to see you.";
    } else if (relationship.strength >= 2) {
      greeting = "Ah! It's wonderful to see you!";
    }
    
    // Adjust based on emotional state
    switch (personality.currentEmotionalState.dominantEmotion) {
      case Emotion.JOY:
        greeting = relationship.strength >= 0 ? 
          "Hello there! Wonderful day, isn't it?" : "Oh... it's you. I was having such a good day.";
        break;
      case Emotion.SADNESS:
        greeting = "Oh... hello.";
        break;
      case Emotion.ANGER:
        greeting = relationship.strength >= 0 ? 
          "Hmph. Hello." : "You again? What now?";
        break;
      case Emotion.FEAR:
        greeting = "*nervously* H-hello there...";
        break;
    }
    
    return greeting;
  }
  
  /**
   * Get or create a dialogue context for an NPC
   */
  private getOrCreateDialogueContext(
    npcId: string,
    playerId: string,
    location: string,
    situation: DialogueSituation
  ): DialogueContext {
    // Check if there's already an active conversation
    if (this.activeConversations.has(npcId)) {
      const context = this.activeConversations.get(npcId)!;
      
      // Update the location and situation
      context.currentLocation = location;
      context.situation = situation;
      
      return context;
    }
    
    // Create a new dialogue context
    const relevantMemories = this.retrieveRelevantMemories(npcId, playerId);
    
    const newContext: DialogueContext = {
      npcId,
      playerId,
      currentLocation: location,
      recentEvents: relevantMemories,
      activeTopics: [],
      previousExchanges: [],
      situation
    };
    
    // Store in active conversations
    this.activeConversations.set(npcId, newContext);
    
    return newContext;
  }
  
  /**
   * Retrieve memories relevant to a conversation
   */
  private retrieveRelevantMemories(npcId: string, playerId: string): MemoryItem[] {
    // Get all memories involving both the NPC and player
    const relevantMemories = this.memoryManager.getMemoriesByEntities([npcId, playerId]);
    
    // Sort by importance and recency
    relevantMemories.sort((a, b) => {
      const scoreA = a.importance * 0.7 + a.recency * 0.3;
      const scoreB = b.importance * 0.7 + b.recency * 0.3;
      return scoreB - scoreA;
    });
    
    // Limit to max number of dialogue memories
    return relevantMemories.slice(0, this.config.maxDialogueMemories);
  }
  
  /**
   * Update active topics based on player query
   */
  private updateActiveTopics(context: DialogueContext, playerQuery: string): void {
    if (!playerQuery) return;
    
    const npcTopicMap = this.npcTopics.get(context.npcId);
    if (!npcTopicMap) return;
    
    // This is a simplified implementation
    // In a full implementation, this would use natural language processing
    // to identify topics in the player query
    
    // For now, check if any known topics are mentioned in the query
    const lowerQuery = playerQuery.toLowerCase();
    const mentionedTopics: DialogueTopic[] = [];
    
    npcTopicMap.forEach(topic => {
      if (lowerQuery.includes(topic.subject.toLowerCase())) {
        mentionedTopics.push(topic);
        
        // Update last discussed
        topic.lastDiscussed = Date.now();
      }
    });
    
    // Add any mentioned topics to active topics
    mentionedTopics.forEach(topic => {
      if (!context.activeTopics.some(t => t.id === topic.id)) {
        // Only add if we're below the max active topics
        if (context.activeTopics.length < this.config.maxActiveTopics) {
          context.activeTopics.push(topic);
        } else {
          // Replace the oldest topic
          context.activeTopics.sort((a, b) => a.lastDiscussed - b.lastDiscussed);
          context.activeTopics[0] = topic;
        }
      }
    });
  }
  
  /**
   * Build a prompt for dialogue generation
   */
  private buildDialoguePrompt(
    context: DialogueContext,
    personality: NPCPersonality,
    relationship: Relationship
  ): string {
    // Get conversation style guide based on personality
    const styleGuide = this.personalityModel.generateConversationStyleGuide(context.npcId);
    
    // Start building the prompt
    let prompt = `Generate a dialogue response for an NPC with the following characteristics:\n\n`;
    
    // Add personality information
    prompt += `Personality: ${this.describePersonality(personality)}\n\n`;
    
    // Add current emotional state
    prompt += `Current Emotional State: ${personality.currentEmotionalState.dominantEmotion} ` +
      `(intensity: ${personality.currentEmotionalState.intensity}/100)\n\n`;
    
    // Add relationship information
    prompt += `Relationship with Player: ${this.describeRelationship(relationship)}\n\n`;
    
    // Add conversation style guide
    prompt += `Conversation Style: ${styleGuide}\n\n`;
    
    // Add situation
    prompt += `Current Situation: ${this.describeSituation(context.situation)}\n\n`;
    
    // Add active topics
    if (context.activeTopics.length > 0) {
      prompt += `Active Topics:\n`;
      context.activeTopics.forEach(topic => {
        prompt += `- ${topic.subject} (Knowledge: ${topic.knowledgeLevel}/100, Interest: ${topic.npcInterest})\n`;
      });
      prompt += `\n`;
    }
    
    // Add recent conversation history
    if (context.previousExchanges.length > 0) {
      prompt += `Recent Conversation:\n`;
      const recentExchanges = context.previousExchanges.slice(-this.config.maxPreviousExchanges);
      recentExchanges.forEach(exchange => {
        if (exchange.playerDialogue) {
          prompt += `Player: ${exchange.playerDialogue}\n`;
        }
        prompt += `NPC: ${exchange.npcDialogue}\n`;
      });
      prompt += `\n`;
    }
    
    // Add relevant memories
    if (context.recentEvents.length > 0) {
      prompt += `Important Memories:\n`;
      const topMemories = context.recentEvents.slice(0, 3);
      topMemories.forEach(memory => {
        prompt += `- ${memory.content}\n`;
      });
      prompt += `\n`;
    }
    
    // Add the player's current query
    if (context.playerQuery) {
      prompt += `Player's Current Statement: "${context.playerQuery}"\n\n`;
    }
    
    // Add instruction for response
    prompt += `Respond as this NPC would, considering their personality, emotional state, ` +
      `and relationship with the player. Keep the response concise and in-character.`;
    
    return prompt;
  }
  
  /**
   * Process and record the dialogue response
   */
  private processDialogueResponse(
    context: DialogueContext,
    response: string,
    personality: NPCPersonality
  ): string {
    // Create a new dialogue exchange
    const exchange: DialogueExchange = {
      timestamp: Date.now(),
      playerDialogue: context.playerQuery,
      npcDialogue: response,
      emotion: personality.currentEmotionalState.dominantEmotion,
      topicsDiscussed: context.activeTopics.map(t => t.id),
      newInformationRevealed: false // Would require NLP to determine accurately
    };
    
    // Add to previous exchanges
    context.previousExchanges.push(exchange);
    
    // Truncate if too many
    if (context.previousExchanges.length > this.config.maxPreviousExchanges * 2) {
      context.previousExchanges = context.previousExchanges.slice(-this.config.maxPreviousExchanges);
    }
    
    // Check for topic exhaustion
    this.checkTopicExhaustion(context);
    
    return response;
  }
  
  /**
   * Check if any topics have been exhausted in the conversation
   */
  private checkTopicExhaustion(context: DialogueContext): void {
    // Count how many times each topic has been discussed
    const topicDiscussionCount: Map<string, number> = new Map();
    
    context.previousExchanges.forEach(exchange => {
      exchange.topicsDiscussed.forEach(topicId => {
        const count = topicDiscussionCount.get(topicId) || 0;
        topicDiscussionCount.set(topicId, count + 1);
      });
    });
    
    // Check if any topics have reached the exhaustion threshold
    context.activeTopics.forEach(topic => {
      const count = topicDiscussionCount.get(topic.id) || 0;
      if (count >= this.config.topicExhaustionThreshold) {
        // Mark as exhausted
        const npcTopicMap = this.npcTopics.get(context.npcId);
        if (npcTopicMap) {
          const fullTopic = npcTopicMap.get(topic.id);
          if (fullTopic) {
            fullTopic.exhausted = true;
          }
        }
        
        // Remove from active topics
        context.activeTopics = context.activeTopics.filter(t => t.id !== topic.id);
      }
    });
  }
  
  /**
   * Generate a fallback response for an NPC
   */
  private generateFallbackResponse(personality: NPCPersonality): string {
    // Generate a basic response based on emotional state
    switch (personality.currentEmotionalState.dominantEmotion) {
      case Emotion.JOY:
        return "I'm sorry, what was that? I was just thinking about something pleasant.";
      case Emotion.SADNESS:
        return "I... I'm sorry. I'm not really in the mood to talk right now.";
      case Emotion.ANGER:
        return "What? Speak clearly or don't waste my time.";
      case Emotion.FEAR:
        return "I'm sorry, I'm a bit... distracted right now. Could you repeat that?";
      default:
        return "I'm not sure I understand. Could you say that again?";
    }
  }
  
  /**
   * Generate a generic response when no personality is available
   */
  private generateGenericResponse(playerQuery: string): string {
    // Just acknowledge the player's statement
    return "I see. Please continue.";
  }
  
  /**
   * Generate a summary of a conversation
   */
  private generateConversationSummary(context: DialogueContext): string {
    const npcName = context.npcId; // In a real implementation, this would be the NPC's name
    const playerName = context.playerId; // In a real implementation, this would be the player's name
    
    // Build a basic summary
    let summary = `${playerName} spoke with ${npcName} in ${context.currentLocation}. `;
    
    // Add topics discussed
    if (context.activeTopics.length > 0) {
      summary += `They discussed: ${context.activeTopics.map(t => t.subject).join(", ")}. `;
    }
    
    // Add a brief overview of the conversation
    summary += `The conversation was ${this.describeSituation(context.situation)}. `;
    
    return summary;
  }
  
  /**
   * Calculate the importance of a conversation
   */
  private calculateConversationImportance(context: DialogueContext): number {
    // Base importance on the situation
    let importance = 5; // Default medium importance
    
    switch (context.situation) {
      case DialogueSituation.QUEST_BRIEFING:
      case DialogueSituation.QUEST_FOLLOWUP:
        importance = 8; // High importance
        break;
      case DialogueSituation.TENSE_CONFRONTATION:
      case DialogueSituation.NEGOTIATION:
      case DialogueSituation.WARNING:
        importance = 7; // Moderately high importance
        break;
      case DialogueSituation.CASUAL_GREETING:
      case DialogueSituation.FAREWELL:
        importance = 3; // Low importance
        break;
    }
    
    // Adjust based on topics discussed
    if (context.activeTopics.length > 0) {
      const topicImportance = context.activeTopics.reduce(
        (sum, topic) => sum + topic.importance, 
        0
      ) / context.activeTopics.length;
      
      importance = (importance * 0.7) + (topicImportance * 0.3 / 100 * 10);
    }
    
    // Cap at 10
    return Math.min(10, importance);
  }
  
  /**
   * Describe an NPC's personality concisely
   */
  private describePersonality(personality: NPCPersonality): string {
    // Create a concise description of personality traits
    let description = "";
    
    // Big Five traits
    if (personality.traits.openness > 70) description += "open to new experiences, ";
    else if (personality.traits.openness < 30) description += "traditional and conventional, ";
    
    if (personality.traits.conscientiousness > 70) description += "organized and reliable, ";
    else if (personality.traits.conscientiousness < 30) description += "spontaneous and careless, ";
    
    if (personality.traits.extraversion > 70) description += "outgoing and energetic, ";
    else if (personality.traits.extraversion < 30) description += "reserved and solitary, ";
    
    if (personality.traits.agreeableness > 70) description += "compassionate and cooperative, ";
    else if (personality.traits.agreeableness < 30) description += "challenging and detached, ";
    
    if (personality.traits.neuroticism > 70) description += "anxious and easily upset, ";
    else if (personality.traits.neuroticism < 30) description += "confident and calm, ";
    
    // Core values
    description += `values ${personality.values.primary.toLowerCase()} above all, `;
    
    // Flaws
    description += `has a tendency toward ${personality.flaws.primary.toLowerCase()}`;
    
    return description;
  }
  
  /**
   * Describe a relationship concisely
   */
  private describeRelationship(relationship: Relationship): string {
    // Create a concise description of the relationship
    let description = "";
    
    // Relationship strength
    switch (relationship.strength) {
      case -3:
        description += "Hostile, would prefer to avoid any interaction";
        break;
      case -2:
        description += "Strongly dislikes the player";
        break;
      case -1:
        description += "Mildly dislikes the player";
        break;
      case 0:
        description += "Neutral, neither likes nor dislikes the player";
        break;
      case 1:
        description += "Mildly likes the player";
        break;
      case 2:
        description += "Strongly likes the player";
        break;
      case 3:
        description += "Devoted to the player, highly trusting";
        break;
    }
    
    // Add trust level
    description += `, trust level: ${relationship.trust}/100`;
    
    // Add relationship types if any
    if (relationship.types.length > 0) {
      description += `, relationship type: ${relationship.types.join(", ").toLowerCase()}`;
    }
    
    return description;
  }
  
  /**
   * Describe a dialogue situation
   */
  private describeSituation(situation: DialogueSituation): string {
    switch (situation) {
      case DialogueSituation.CASUAL_GREETING:
        return "a casual greeting";
      case DialogueSituation.FIRST_MEETING:
        return "a first meeting";
      case DialogueSituation.TENSE_CONFRONTATION:
        return "a tense confrontation";
      case DialogueSituation.NEGOTIATION:
        return "a negotiation";
      case DialogueSituation.INFORMATION_SEEKING:
        return "an information-seeking conversation";
      case DialogueSituation.STORYTELLING:
        return "storytelling";
      case DialogueSituation.TRADE_HAGGLING:
        return "haggling over trade or prices";
      case DialogueSituation.QUEST_BRIEFING:
        return "a quest briefing";
      case DialogueSituation.QUEST_FOLLOWUP:
        return "following up on a quest";
      case DialogueSituation.INTIMIDATION:
        return "an intimidation attempt";
      case DialogueSituation.PERSUASION:
        return "an attempt at persuasion";
      case DialogueSituation.DECEPTION:
        return "potentially deceptive";
      case DialogueSituation.FLIRTATION:
        return "flirtatious";
      case DialogueSituation.WARNING:
        return "a warning";
      case DialogueSituation.FAREWELL:
        return "a farewell";
      default:
        return "a conversation";
    }
  }
} 