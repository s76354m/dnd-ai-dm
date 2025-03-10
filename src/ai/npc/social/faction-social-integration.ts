/**
 * faction-social-integration.ts
 * 
 * This module integrates the Faction System with the Social Dynamics System,
 * allowing faction membership to influence social interactions, information sharing,
 * and NPC behavior. It creates a more cohesive world where faction politics 
 * and social dynamics are interconnected.
 */

import { MemoryManager } from '../../memory/memory-manager';
import { RelationshipTracker } from '../../memory/relationship-tracker';
import { SocialInteractionSystem, SocialNPC, SocialInteractionType } from './social-interaction';
import { InformationSharingSystem, Information, InformationType } from './information-sharing';
import { BehaviorSimulation, Goal, NeedType } from '../behavior-simulation';
import { FactionSystem } from '../../world/faction/faction-system';
import { FactionManager } from '../../world/faction/faction-manager';
import { Faction, FactionMember, FactionGoal } from '../../world/faction/faction-types';
import { FactionEventSystem, FactionEvent } from '../../world/faction/faction-events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration options for faction-social integration
 */
export interface FactionSocialIntegrationConfig {
  factionLoyaltyInfluence: number; // How much faction loyalty affects interactions (0-1)
  rivalFactorPenalty: number; // Penalty for interactions between rival factions (-1-0)
  allyFactorBonus: number; // Bonus for interactions between allied factions (0-1)
  factionGoalSyncInterval: number; // How often (in minutes) to sync faction goals with NPC goals
  interFactionInteractionRate: number; // Rate modifier for interactions across factions (0-2)
  factionEventImpactRadius: number; // How far faction events propagate in social network
  debugMode: boolean; // Whether to output detailed logs
}

/**
 * System that integrates faction mechanics with social dynamics
 */
export class FactionSocialIntegration {
  private memoryManager: MemoryManager;
  private relationshipTracker: RelationshipTracker;
  private socialInteractionSystem: SocialInteractionSystem;
  private informationSharingSystem: InformationSharingSystem;
  private behaviorSimulation: BehaviorSimulation;
  private factionSystem: FactionSystem;
  private factionManager: FactionManager;
  private factionEventSystem: FactionEventSystem;
  private config: FactionSocialIntegrationConfig;
  
  // Maps NPCs to their faction memberships
  private npcFactionMap: Map<string, string[]> = new Map();
  
  // Maps factions to their NPC members
  private factionNpcMap: Map<string, Set<string>> = new Map();
  
  // Faction-specific goals that have been propagated to NPCs
  private propagatedFactionGoals: Map<string, Set<string>> = new Map(); // NPC ID -> Set of faction goal IDs
  
  /**
   * Create a new faction-social integration system
   */
  constructor(
    memoryManager: MemoryManager,
    relationshipTracker: RelationshipTracker,
    socialInteractionSystem: SocialInteractionSystem,
    informationSharingSystem: InformationSharingSystem,
    behaviorSimulation: BehaviorSimulation,
    factionSystem: FactionSystem,
    factionManager: FactionManager,
    factionEventSystem: FactionEventSystem,
    config?: Partial<FactionSocialIntegrationConfig>
  ) {
    this.memoryManager = memoryManager;
    this.relationshipTracker = relationshipTracker;
    this.socialInteractionSystem = socialInteractionSystem;
    this.informationSharingSystem = informationSharingSystem;
    this.behaviorSimulation = behaviorSimulation;
    this.factionSystem = factionSystem;
    this.factionManager = factionManager;
    this.factionEventSystem = factionEventSystem;
    
    // Default configuration
    const defaultConfig: FactionSocialIntegrationConfig = {
      factionLoyaltyInfluence: 0.7,
      rivalFactorPenalty: -0.5,
      allyFactorBonus: 0.3,
      factionGoalSyncInterval: 1440, // Once per day
      interFactionInteractionRate: 0.5,
      factionEventImpactRadius: 3,
      debugMode: false
    };
    
    this.config = { ...defaultConfig, ...config };
  }
  
  /**
   * Register an NPC as a member of a faction
   */
  public registerNPCAsFactionMember(
    npcId: string,
    factionId: string,
    role: string = 'member',
    influence: number = 10,
    loyalty: number = 70
  ): void {
    // Get existing faction memberships for this NPC
    const factionMemberships = this.npcFactionMap.get(npcId) || [];
    
    // Add the new faction if not already a member
    if (!factionMemberships.includes(factionId)) {
      factionMemberships.push(factionId);
      this.npcFactionMap.set(npcId, factionMemberships);
      
      // Update the faction's member list
      const factionMembers = this.factionNpcMap.get(factionId) || new Set<string>();
      factionMembers.add(npcId);
      this.factionNpcMap.set(factionId, factionMembers);
      
      // Register the NPC with the faction system
      const factionMember: FactionMember = {
        id: npcId,
        role,
        influence,
        loyalty
      };
      
      this.factionManager.addMemberToFaction(factionId, factionMember);
      
      // Create relationships between faction members
      this.createFactionRelationships(npcId, factionId);
      
      // Propagate faction knowledge to the NPC
      this.propagateFactionKnowledge(npcId, factionId);
      
      // Propagate faction goals to the NPC
      this.propagateFactionGoals(npcId, factionId);
      
      if (this.config.debugMode) {
        console.log(`[FactionSocialIntegration] Registered NPC ${npcId} with faction ${factionId}`);
      }
    }
  }
  
  /**
   * Set up initial relationships between a new faction member and existing members
   */
  private createFactionRelationships(npcId: string, factionId: string): void {
    const faction = this.factionManager.getFaction(factionId);
    if (!faction) return;
    
    // Get all existing members of this faction
    const factionMembers = this.factionNpcMap.get(factionId) || new Set<string>();
    
    // Loop through other members and establish relationships
    for (const memberId of factionMembers) {
      if (memberId === npcId) continue; // Skip self
      
      // Check if relationship already exists
      const existingRelationship = this.relationshipTracker.getRelationship(npcId, memberId);
      
      if (!existingRelationship) {
        // Calculate base relationship value based on faction type
        let baseRelationship = 40; // Neutral-positive starting point
        
        // Adjust based on faction type
        switch (faction.type) {
          case 'criminal':
            baseRelationship = 20; // More suspicious
            break;
          case 'religious':
            baseRelationship = 60; // More trusting
            break;
          case 'military':
            baseRelationship = 50; // Respectful
            break;
          case 'guild':
            baseRelationship = 45; // Professional
            break;
          case 'political':
            baseRelationship = 30; // More competitive
            break;
        }
        
        // Create relationship in both directions
        this.relationshipTracker.setRelationship(npcId, memberId, baseRelationship);
        this.relationshipTracker.setRelationship(memberId, npcId, baseRelationship);
      }
    }
  }
  
  /**
   * Share faction-specific knowledge with a new member
   */
  private propagateFactionKnowledge(npcId: string, factionId: string): void {
    const faction = this.factionManager.getFaction(factionId);
    if (!faction) return;
    
    // Get faction-specific knowledge
    const factionKnowledge = faction.knowledge || [];
    
    // Add basic faction information
    const baseFactionInfo: Information = this.informationSharingSystem.createInformation(
      `The ${faction.name} is a ${faction.type} faction led by ${faction.leader?.name || 'unknown'}.`,
      InformationType.FACT,
      70, // Importance
      100, // Truth value
      npcId,
      [factionId, faction.leader?.id || ''],
      { minRelationship: 0 }, // No restrictions
      ['faction', faction.type, 'organization']
    );
    
    this.informationSharingSystem.addInformationToNPC(npcId, baseFactionInfo.id);
    
    // Add faction-specific information
    for (const knowledge of factionKnowledge) {
      // Create information with appropriate restrictions
      const info = this.informationSharingSystem.createInformation(
        knowledge.content,
        knowledge.type || InformationType.FACT,
        knowledge.importance || 50,
        knowledge.truthValue || 100,
        faction.leader?.id,
        knowledge.relevantEntities || [factionId],
        { 
          minRelationship: 30,
          factionsOnly: [factionId]
        },
        knowledge.tags || ['faction']
      );
      
      this.informationSharingSystem.addInformationToNPC(npcId, info.id);
    }
  }
  
  /**
   * Create NPC goals based on faction goals
   */
  private propagateFactionGoals(npcId: string, factionId: string): void {
    const faction = this.factionManager.getFaction(factionId);
    if (!faction || !faction.goals) return;
    
    // Initialize the set of propagated goals if needed
    if (!this.propagatedFactionGoals.has(npcId)) {
      this.propagatedFactionGoals.set(npcId, new Set<string>());
    }
    
    const npcPropagatedGoals = this.propagatedFactionGoals.get(npcId)!;
    
    // Convert faction goals to NPC goals
    for (const factionGoal of faction.goals) {
      // Skip goals that have already been propagated
      if (npcPropagatedGoals.has(factionGoal.id)) continue;
      
      // Create an NPC-level goal that contributes to the faction goal
      const npcGoalName = `Support ${faction.name}: ${factionGoal.name}`;
      const npcGoalDescription = `Contribute to the faction goal: ${factionGoal.description}`;
      
      // Determine which needs this goal relates to
      const relatedNeeds = this.mapFactionGoalToNeeds(factionGoal.type);
      
      // Create a condition function to determine when the goal is complete
      const completionCondition = (npcState: any) => {
        // In a real implementation, this would check specific conditions
        // For now, we'll just use a placeholder that's always false
        return false;
      };
      
      // Add the goal to the NPC with appropriate behaviors
      const goal = this.behaviorSimulation.addGoal(
        npcId,
        npcGoalName,
        npcGoalDescription,
        factionGoal.priority,
        relatedNeeds,
        completionCondition,
        [] // Relevant behaviors would be added here
      );
      
      if (goal) {
        // Track that we've propagated this goal
        npcPropagatedGoals.add(factionGoal.id);
        
        if (this.config.debugMode) {
          console.log(`[FactionSocialIntegration] Propagated faction goal ${factionGoal.name} to NPC ${npcId}`);
        }
      }
    }
  }
  
  /**
   * Map faction goal types to NPC needs
   */
  private mapFactionGoalToNeeds(goalType: string): NeedType[] {
    switch (goalType) {
      case 'expansion':
        return [NeedType.ACHIEVEMENT, NeedType.RESOURCES];
      case 'wealth':
        return [NeedType.MONEY, NeedType.RESOURCES];
      case 'influence':
        return [NeedType.RESPECT, NeedType.SOCIAL];
      case 'security':
        return [NeedType.SAFETY];
      case 'knowledge':
        return [NeedType.ACHIEVEMENT];
      case 'religious':
        return [NeedType.CUSTOM];
      default:
        return [NeedType.ACHIEVEMENT];
    }
  }
  
  /**
   * Modify relationship changes based on faction affiliations
   * This can be called by the social interaction system to adjust relationship changes
   */
  public modifyRelationshipChange(
    npc1Id: string,
    npc2Id: string,
    baseChange: number,
    interactionType: SocialInteractionType
  ): number {
    const npc1Factions = this.npcFactionMap.get(npc1Id) || [];
    const npc2Factions = this.npcFactionMap.get(npc2Id) || [];
    
    // If both NPCs have no faction affiliations, return base change
    if (npc1Factions.length === 0 || npc2Factions.length === 0) {
      return baseChange;
    }
    
    let factionModifier = 0;
    
    // Check for shared faction membership
    const sharedFactions = npc1Factions.filter(f => npc2Factions.includes(f));
    if (sharedFactions.length > 0) {
      // Shared faction membership boosts positive interactions more than negative ones
      factionModifier += this.config.factionLoyaltyInfluence * (baseChange > 0 ? 1 : 0.5);
    }
    
    // Check for rival faction relationships
    for (const faction1 of npc1Factions) {
      for (const faction2 of npc2Factions) {
        // Skip if same faction
        if (faction1 === faction2) continue;
        
        const relationshipType = this.factionManager.getFactionRelationshipType(faction1, faction2);
        
        if (relationshipType === 'rival' || relationshipType === 'enemy') {
          factionModifier += this.config.rivalFactorPenalty;
        } else if (relationshipType === 'ally') {
          factionModifier += this.config.allyFactorBonus;
        }
      }
    }
    
    // Apply faction modifier, ensuring result stays within reasonable bounds
    const modifiedChange = baseChange * (1 + factionModifier);
    return Math.max(-100, Math.min(100, modifiedChange));
  }
  
  /**
   * Process a faction event, creating ripples through the social network
   */
  public processFactionEvent(event: FactionEvent): void {
    // Get all affected factions
    const affectedFactions = event.affectedFactionIds || [];
    if (event.factionId && !affectedFactions.includes(event.factionId)) {
      affectedFactions.push(event.factionId);
    }
    
    // No factions affected, nothing to do
    if (affectedFactions.length === 0) return;
    
    // Generate event information to be shared
    const eventInfo = this.informationSharingSystem.createInformation(
      event.description,
      event.public ? InformationType.FACT : InformationType.SECRET,
      event.importance || 70,
      100, // Truth value
      event.factionId, // Source
      [event.factionId, ...affectedFactions, ...(event.relevantEntities || [])],
      event.public ? undefined : { 
        minRelationship: 50,
        factionsOnly: [event.factionId]
      },
      ['faction_event', event.type, ...(event.tags || [])]
    );
    
    // Share information with faction members
    for (const factionId of affectedFactions) {
      const members = this.factionNpcMap.get(factionId) || new Set<string>();
      
      for (const npcId of members) {
        // Add to NPC's knowledge
        this.informationSharingSystem.addInformationToNPC(npcId, eventInfo.id);
        
        // If significant event, create a memory
        if (event.importance && event.importance >= 60) {
          this.memoryManager.addMemory(npcId, {
            id: `mem_faction_event_${uuidv4()}`,
            type: 'faction_event',
            content: event.description,
            emotionalResponse: event.emotionalResponse || { type: 'neutral', intensity: 5 },
            importance: event.importance,
            timestamp: Date.now(),
            entities: [event.factionId, ...affectedFactions],
            location: event.location,
            tags: ['faction', event.type]
          });
        }
      }
    }
    
    // Update faction relationships if needed
    if (event.relationshipChanges && event.relationshipChanges.length > 0) {
      for (const change of event.relationshipChanges) {
        this.factionManager.modifyFactionRelationship(
          change.factionId1,
          change.factionId2,
          change.valueChange
        );
      }
    }
  }
  
  /**
   * Update the faction-social integration system
   * This should be called periodically as part of the game world update
   */
  public updateSystem(gameTimeMinutes: number): void {
    // Sync faction goals with NPC goals if it's time
    if (gameTimeMinutes % this.config.factionGoalSyncInterval === 0) {
      this.syncFactionGoalsWithNPCs();
    }
    
    // Process any pending faction events and their social impacts
    // (This would integrate with the faction event system)
    
    // Update faction membership status for NPCs if needed
    // (This would handle NPCs joining or leaving factions based on loyalty)
    
    if (this.config.debugMode) {
      console.log(`[FactionSocialIntegration] Updated at game time ${gameTimeMinutes}`);
    }
  }
  
  /**
   * Synchronize faction goals with NPC goals
   */
  private syncFactionGoalsWithNPCs(): void {
    // For each faction
    for (const [factionId, members] of this.factionNpcMap.entries()) {
      const faction = this.factionManager.getFaction(factionId);
      if (!faction || !faction.goals) continue;
      
      // For each member
      for (const npcId of members) {
        // Propagate faction goals to the NPC
        this.propagateFactionGoals(npcId, factionId);
      }
    }
  }
  
  /**
   * Get all factions an NPC belongs to
   */
  public getNPCFactions(npcId: string): string[] {
    return this.npcFactionMap.get(npcId) || [];
  }
  
  /**
   * Get all NPCs who belong to a faction
   */
  public getFactionNPCs(factionId: string): string[] {
    const members = this.factionNpcMap.get(factionId);
    return members ? Array.from(members) : [];
  }
  
  /**
   * Check if two NPCs share any faction memberships
   */
  public npcsShareFaction(npc1Id: string, npc2Id: string): boolean {
    const npc1Factions = this.npcFactionMap.get(npc1Id) || [];
    const npc2Factions = this.npcFactionMap.get(npc2Id) || [];
    
    return npc1Factions.some(faction => npc2Factions.includes(faction));
  }
  
  /**
   * Find NPCs who belong to allied factions
   */
  public findAlliedFactionNPCs(npcId: string): string[] {
    const npcFactions = this.npcFactionMap.get(npcId) || [];
    if (npcFactions.length === 0) return [];
    
    const alliedNpcs = new Set<string>();
    
    for (const faction of npcFactions) {
      const allies = this.factionManager.getAlliedFactions(faction);
      for (const ally of allies) {
        const allyMembers = this.factionNpcMap.get(ally) || new Set<string>();
        for (const member of allyMembers) {
          alliedNpcs.add(member);
        }
      }
    }
    
    return Array.from(alliedNpcs);
  }
} 