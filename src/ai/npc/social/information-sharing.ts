/**
 * information-sharing.ts
 * 
 * This module manages how information spreads between NPCs in the game world.
 * It models the organic propagation of knowledge, rumors, and secrets through 
 * social networks, creating a realistic flow of information based on 
 * relationships, personality traits, and social dynamics.
 */

import { NPCPersonality } from '../personality-model';
import { RelationshipTracker } from '../../core/relationship-tracker';
import { MemoryManager } from '../../core/memory-manager';
import { SocialInteractionSystem, SocialNPC } from './social-interaction';

/**
 * Types of information that can be shared between NPCs
 */
export enum InformationType {
  FACT = 'fact',           // Objectively true information
  OPINION = 'opinion',     // Subjective viewpoint 
  RUMOR = 'rumor',         // Unverified information that may be true or false
  SECRET = 'secret',       // Information intentionally kept hidden
  QUEST_HINT = 'quest_hint', // Information relevant to a quest
  LOCATION = 'location',   // Information about a place
  THREAT = 'threat',       // Information about a danger
  OPPORTUNITY = 'opportunity', // Information about a beneficial possibility
  GOSSIP = 'gossip',       // Information about other NPCs
  HISTORY = 'history'      // Historical information
}

/**
 * Represents a piece of information that can be shared between NPCs
 */
export interface Information {
  id: string;
  content: string;
  type: InformationType;
  sourceNpcId?: string;    // Who originated this information
  truthValue: number;      // 0-100, how factually true it is
  importance: number;      // 0-100, how significant this information is
  relevantEntities: string[]; // IDs of NPCs, locations, items etc. this relates to
  visibilityRestriction?: {    // If this is restricted information
    minRelationship: number;   // Minimum relationship needed to share
    factionsOnly?: string[];   // Only share within these factions
  };
  timestamp: number;       // When this information was created
  expiryTime?: number;     // When this information becomes obsolete/irrelevant
  tags: string[];          // Search tags for this information
}

/**
 * Configuration for the information sharing system
 */
export interface InformationSharingConfig {
  baseSharingProbability: number;       // Base chance of sharing any information (0-1)
  relationshipInfluence: number;        // How much relationship affects sharing (0-1)
  personalityInfluence: number;         // How much personality affects sharing (0-1)
  importanceInfluence: number;          // How much importance affects sharing (0-1)
  truthDistortionFactor: number;        // How much rumors get distorted (0-1)
  factionLoyaltyThreshold: number;      // Relationship value for faction loyalty (0-100) 
  secretLeakageProbability: number;     // Base chance of leaking secrets (0-1)
  gossipNetworkSize: number;            // Max network distance for gossip propagation
  propagationDepth: number;             // How many "hops" information can travel
  maxInformationAge: number;            // Max age in days before information expires
  debugMode: boolean;                   // Whether to output detailed logs
}

/**
 * System for managing how information spreads through NPC social networks
 */
export class InformationSharingSystem {
  private memoryManager: MemoryManager;
  private relationshipTracker: RelationshipTracker;
  private socialInteractionSystem: SocialInteractionSystem;
  private config: InformationSharingConfig;
  
  // Store of all known information items
  private knownInformation: Map<string, Information> = new Map();
  
  // Which NPCs know which information
  private npcKnowledge: Map<string, Set<string>> = new Map(); // NPC ID → Set of info IDs
  
  // Queue of information to propagate on next update
  private propagationQueue: {npcId: string, infoId: string, timestamp: number}[] = [];
  
  /**
   * Create a new information sharing system
   */
  constructor(
    memoryManager: MemoryManager,
    relationshipTracker: RelationshipTracker,
    socialInteractionSystem: SocialInteractionSystem,
    config?: Partial<InformationSharingConfig>
  ) {
    this.memoryManager = memoryManager;
    this.relationshipTracker = relationshipTracker;
    this.socialInteractionSystem = socialInteractionSystem;
    
    // Default configuration with reasonable values
    const defaultConfig: InformationSharingConfig = {
      baseSharingProbability: 0.6,
      relationshipInfluence: 0.7,
      personalityInfluence: 0.5,
      importanceInfluence: 0.8,
      truthDistortionFactor: 0.2,
      factionLoyaltyThreshold: 70,
      secretLeakageProbability: 0.1,
      gossipNetworkSize: 3,
      propagationDepth: 5,
      maxInformationAge: 30, // days
      debugMode: false
    };
    
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Create a new piece of information in the system
   */
  public createInformation(
    content: string,
    type: InformationType,
    importance: number,
    truthValue: number = 100,
    sourceNpcId?: string,
    relevantEntities: string[] = [],
    visibilityRestriction?: { minRelationship: number, factionsOnly?: string[] },
    tags: string[] = []
  ): Information {
    const infoId = `info_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    const info: Information = {
      id: infoId,
      content,
      type,
      sourceNpcId,
      truthValue,
      importance,
      relevantEntities,
      visibilityRestriction,
      timestamp: Date.now(),
      tags
    };
    
    // Add to known information store
    this.knownInformation.set(infoId, info);
    
    // If there's a source NPC, they know this information
    if (sourceNpcId) {
      this.addInformationToNPC(sourceNpcId, infoId);
    }
    
    if (this.config.debugMode) {
      console.log(`[InformationSharingSystem] Created new information: "${content.substring(0, 30)}..." (ID: ${infoId})`);
    }
    
    return info;
  }

  /**
   * Add information to an NPC's knowledge base
   */
  public addInformationToNPC(npcId: string, infoId: string): boolean {
    // Get the information
    const info = this.knownInformation.get(infoId);
    if (!info) {
      if (this.config.debugMode) {
        console.warn(`[InformationSharingSystem] Cannot add unknown information ID ${infoId} to NPC ${npcId}`);
      }
      return false;
    }
    
    // Initialize knowledge set for this NPC if needed
    if (!this.npcKnowledge.has(npcId)) {
      this.npcKnowledge.set(npcId, new Set());
    }
    
    // Add the information to the NPC's knowledge
    const knowledgeSet = this.npcKnowledge.get(npcId)!;
    const isNewKnowledge = !knowledgeSet.has(infoId);
    
    knowledgeSet.add(infoId);
    
    // Add to propagation queue if this is new knowledge
    if (isNewKnowledge) {
      this.propagationQueue.push({
        npcId,
        infoId,
        timestamp: Date.now()
      });
      
      if (this.config.debugMode) {
        console.log(`[InformationSharingSystem] NPC ${npcId} learned information ${infoId}`);
      }
    }
    
    return isNewKnowledge;
  }

  /**
   * Check if an NPC knows a specific piece of information
   */
  public npcKnowsInformation(npcId: string, infoId: string): boolean {
    const knowledgeSet = this.npcKnowledge.get(npcId);
    return knowledgeSet ? knowledgeSet.has(infoId) : false;
  }

  /**
   * Get all information known by an NPC
   */
  public getNPCKnowledge(npcId: string): Information[] {
    const knowledgeSet = this.npcKnowledge.get(npcId);
    if (!knowledgeSet) {
      return [];
    }
    
    return Array.from(knowledgeSet)
      .map(infoId => this.knownInformation.get(infoId))
      .filter((info): info is Information => info !== undefined);
  }

  /**
   * Update the information sharing system, processing information propagation
   * between NPCs based on social interactions and relationships.
   * 
   * @param gameTimeMinutes Minutes of game time that have passed since last update
   */
  public updateSystem(gameTimeMinutes: number, allNpcs: SocialNPC[]): void {
    // Process the propagation queue
    this.processInformationPropagation(allNpcs);
    
    // Clean up expired information
    this.cleanupExpiredInformation();
    
    if (this.config.debugMode) {
      console.log(`[InformationSharingSystem] Updated information sharing, ${this.propagationQueue.length} items in propagation queue`);
    }
  }

  /**
   * Process information propagation through the NPC social network
   */
  private processInformationPropagation(allNpcs: SocialNPC[]): void {
    // Map of NPCs by ID for quick access
    const npcsById = new Map(allNpcs.map(npc => [npc.id, npc]));
    
    // Only process items that have been in the queue for long enough
    // This simulates the delay in information spreading
    const currentTime = Date.now();
    const itemsToProcess = this.propagationQueue.filter(
      item => currentTime - item.timestamp > 1000 * 60 * 60 * 2 // 2 hours real time
    );
    
    // Process each item
    for (const item of itemsToProcess) {
      const { npcId, infoId } = item;
      const info = this.knownInformation.get(infoId);
      const npc = npcsById.get(npcId);
      
      if (!info || !npc) {
        continue; // Skip if info or NPC is missing
      }
      
      // Find potential recipients of this information
      const potentialRecipients = this.findPotentialRecipients(npcId, info, allNpcs);
      
      // For each potential recipient, determine if they learn this information
      for (const recipientId of potentialRecipients) {
        const recipient = npcsById.get(recipientId);
        if (!recipient) continue;
        
        const sharingProbability = this.calculateSharingProbability(npc, recipient, info);
        
        if (Math.random() < sharingProbability) {
          // The information is shared!
          
          // Check if it's a rumor or gossip that might get distorted
          let sharedInfo = info;
          if (info.type === InformationType.RUMOR || info.type === InformationType.GOSSIP) {
            sharedInfo = this.possiblyDistortInformation(info, npc, recipient);
          }
          
          // Add the information to the recipient's knowledge
          this.addInformationToNPC(recipientId, sharedInfo.id);
          
          if (this.config.debugMode) {
            console.log(`[InformationSharingSystem] NPC ${npcId} shared information ${infoId} with NPC ${recipientId}`);
          }
        }
      }
      
      // Remove the processed item from the queue
      this.propagationQueue = this.propagationQueue.filter(
        queueItem => !(queueItem.npcId === npcId && queueItem.infoId === infoId)
      );
    }
  }

  /**
   * Find NPCs who might receive information from the source NPC
   */
  private findPotentialRecipients(
    sourceNpcId: string,
    info: Information,
    allNpcs: SocialNPC[]
  ): string[] {
    const recipients: string[] = [];
    
    // Check each NPC
    for (const npc of allNpcs) {
      // Skip the source NPC
      if (npc.id === sourceNpcId) {
        continue;
      }
      
      // Skip if the NPC already knows this information
      if (this.npcKnowsInformation(npc.id, info.id)) {
        continue;
      }
      
      // Get relationship between source and potential recipient
      const relationship = this.relationshipTracker.getRelationship(sourceNpcId, npc.id);
      const relationshipValue = relationship ? relationship.value : 0;
      
      // Check visibility restrictions
      if (info.visibilityRestriction) {
        // Skip if relationship is below minimum
        if (relationshipValue < info.visibilityRestriction.minRelationship) {
          continue;
        }
        
        // Skip if faction-restricted and recipient is not in the right faction
        if (info.visibilityRestriction.factionsOnly && 
            !(npc.faction && info.visibilityRestriction.factionsOnly.includes(npc.faction))) {
          continue;
        }
      }
      
      // For secrets, only share with very close relationships or same faction
      if (info.type === InformationType.SECRET) {
        const isCloseFriend = relationshipValue > 80;
        const isSameFaction = npc.faction && 
                             info.sourceNpcId && 
                             allNpcs.find(n => n.id === info.sourceNpcId)?.faction === npc.faction;
        
        if (!isCloseFriend && !isSameFaction) {
          continue;
        }
      }
      
      // Add to potential recipients
      recipients.push(npc.id);
    }
    
    return recipients;
  }

  /**
   * Calculate the probability of information being shared between two NPCs
   */
  private calculateSharingProbability(
    sourceNpc: SocialNPC,
    targetNpc: SocialNPC,
    info: Information
  ): number {
    // Start with base probability
    let probability = this.config.baseSharingProbability;
    
    // Adjust based on relationship
    const relationship = this.relationshipTracker.getRelationship(sourceNpc.id, targetNpc.id);
    const relationshipValue = relationship ? relationship.value : 0;
    const normalizedRelationship = (relationshipValue + 100) / 200; // Convert -100..100 to 0..1
    
    probability += (normalizedRelationship - 0.5) * this.config.relationshipInfluence;
    
    // Adjust based on personality
    // Extraverts share more information
    const extraversion = sourceNpc.personality.traits.extraversion / 100;
    probability += (extraversion - 0.5) * 0.2 * this.config.personalityInfluence;
    
    // Adjust based on information importance
    const normalizedImportance = info.importance / 100;
    probability += (normalizedImportance - 0.5) * this.config.importanceInfluence;
    
    // Secrets are less likely to be shared
    if (info.type === InformationType.SECRET) {
      probability *= this.config.secretLeakageProbability;
    }
    
    // Very important threats and opportunities are more likely to be shared
    if ((info.type === InformationType.THREAT || info.type === InformationType.OPPORTUNITY) && 
        info.importance > 70) {
      probability += 0.2;
    }
    
    // Clamp to valid probability range
    return Math.max(0.01, Math.min(0.99, probability));
  }

  /**
   * Potentially distort information as it passes through the network
   */
  private possiblyDistortInformation(
    originalInfo: Information,
    sourceNpc: SocialNPC,
    targetNpc: SocialNPC
  ): Information {
    // Determine if distortion occurs
    const distortionChance = this.config.truthDistortionFactor * 
                           (1 - sourceNpc.personality.traits.conscientiousness / 100);
    
    if (Math.random() > distortionChance) {
      return originalInfo; // No distortion
    }
    
    // Create a distorted version
    const distortedInfo: Information = {
      ...originalInfo,
      id: `info_distorted_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      content: this.distortContent(originalInfo.content, sourceNpc, targetNpc),
      truthValue: Math.max(0, originalInfo.truthValue - Math.floor(Math.random() * 30)),
      timestamp: Date.now()
    };
    
    // Store the distorted version
    this.knownInformation.set(distortedInfo.id, distortedInfo);
    
    if (this.config.debugMode) {
      console.log(`[InformationSharingSystem] Information ${originalInfo.id} was distorted to ${distortedInfo.id}`);
    }
    
    return distortedInfo;
  }

  /**
   * Distort the content of a piece of information
   * This is a placeholder - in a real implementation, this could use LLM to generate
   * believable distortions based on the NPC personalities and biases
   */
  private distortContent(
    originalContent: string,
    sourceNpc: SocialNPC,
    targetNpc: SocialNPC
  ): string {
    // Simple placeholder implementation
    // In a real system, this would use more sophisticated text generation
    
    // Example distortions
    const distortions = [
      `I heard that ${originalContent}`,
      `Someone said something about ${originalContent}`,
      `I'm pretty sure that ${originalContent}, or something like that`,
      `${originalContent}, at least that's what people are saying`,
      `${originalContent}, though I'm not entirely certain`,
      `${sourceNpc.name} mentioned that ${originalContent}`
    ];
    
    return distortions[Math.floor(Math.random() * distortions.length)];
  }

  /**
   * Clean up expired information
   */
  private cleanupExpiredInformation(): void {
    const currentTime = Date.now();
    const maxAge = this.config.maxInformationAge * 24 * 60 * 60 * 1000; // Convert days to ms
    
    // Find expired information
    const expiredInfoIds: string[] = [];
    
    for (const [infoId, info] of this.knownInformation.entries()) {
      // Check if explicitly expired
      if (info.expiryTime && currentTime > info.expiryTime) {
        expiredInfoIds.push(infoId);
        continue;
      }
      
      // Check if too old
      if (currentTime - info.timestamp > maxAge) {
        expiredInfoIds.push(infoId);
      }
    }
    
    // Remove expired information
    for (const infoId of expiredInfoIds) {
      this.knownInformation.delete(infoId);
      
      // Remove from all NPCs' knowledge
      for (const knowledgeSet of this.npcKnowledge.values()) {
        knowledgeSet.delete(infoId);
      }
      
      // Remove from propagation queue
      this.propagationQueue = this.propagationQueue.filter(item => item.infoId !== infoId);
      
      if (this.config.debugMode) {
        console.log(`[InformationSharingSystem] Removed expired information ${infoId}`);
      }
    }
  }

  /**
   * Get all information about a particular entity
   */
  public getInformationAboutEntity(entityId: string): Information[] {
    return Array.from(this.knownInformation.values())
      .filter(info => info.relevantEntities.includes(entityId));
  }

  /**
   * Get all information of a particular type
   */
  public getInformationByType(type: InformationType): Information[] {
    return Array.from(this.knownInformation.values())
      .filter(info => info.type === type);
  }

  /**
   * Get information by tags
   */
  public getInformationByTags(tags: string[], matchAll: boolean = false): Information[] {
    return Array.from(this.knownInformation.values())
      .filter(info => {
        if (matchAll) {
          // Must match all provided tags
          return tags.every(tag => info.tags.includes(tag));
        } else {
          // Match any of the provided tags
          return tags.some(tag => info.tags.includes(tag));
        }
      });
  }

  /**
   * Find NPCs who would know a specific piece of information
   */
  public findNPCsWithInformation(infoId: string): string[] {
    const knowers: string[] = [];
    
    for (const [npcId, knowledgeSet] of this.npcKnowledge.entries()) {
      if (knowledgeSet.has(infoId)) {
        knowers.push(npcId);
      }
    }
    
    return knowers;
  }

  /**
   * Find NPCs who might know information relevant to a query
   */
  public findNPCsWithRelevantInformation(relevantEntityId: string, type?: InformationType): string[] {
    // Find information about this entity
    const relevantInfo = Array.from(this.knownInformation.values())
      .filter(info => {
        const matchesEntity = info.relevantEntities.includes(relevantEntityId);
        const matchesType = type ? info.type === type : true;
        return matchesEntity && matchesType;
      });
    
    // Find NPCs who know any of this information
    const relevantInfoIds = relevantInfo.map(info => info.id);
    const knowers = new Set<string>();
    
    for (const [npcId, knowledgeSet] of this.npcKnowledge.entries()) {
      for (const infoId of relevantInfoIds) {
        if (knowledgeSet.has(infoId)) {
          knowers.add(npcId);
          break;
        }
      }
    }
    
    return Array.from(knowers);
  }
} 