/**
 * Combat AI Integration System
 * 
 * This system connects the NPC personality, behavior, and faction systems with
 * the combat tactical AI to create more realistic and character-driven combat
 * decisions for NPCs based on:
 * - Personality traits (using Five Factor Model)
 * - Emotional states and character values
 * - Faction affiliations and relationships
 * - Social connections and loyalty dynamics
 * 
 * It enables:
 * - Personality-driven combat styles and decision making
 * - Faction-influenced target selection and ally prioritization
 * - Emotions affecting risk assessment and aggressive behavior
 * - Consistent character portrayal across narrative and combat
 */

import { v4 as uuidv4 } from 'uuid';
import { PersonalityTraits, EmotionalState, Emotion, CoreValues, Value } from './personality-model';
import { BehaviorSimulation, Need, NeedType, Goal } from './behavior-simulation';
import { FactionSocialIntegration } from './social/faction-social-integration';
import { FactionManager } from '../world/faction/faction-manager';
import { FactionSystem } from '../world/faction/faction-system';
import { SocialInteractionSystem } from './social/social-interaction';
import { RelationshipTracker, RelationshipStrength } from '../memory/relationship-tracker';
import { MemoryManager, MemoryType } from '../memory/memory-manager';
import { TacticalAI, TacticalContext, TacticalDecision } from '../../combat/tactical-ai';
import { CombatState, InitiativeEntry } from '../../combat/combat-types';
import { NPC } from '../../core/interfaces/npc';
import { Character } from '../../core/interfaces/character';
import { appConfig } from '../../config';

/**
 * Configuration for the combat AI integration system
 */
export interface CombatAIIntegrationConfig {
  // Personality trait impact weights
  personalityInfluenceWeight: number;
  traitWeights: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  
  // Emotional state impact
  emotionalInfluenceWeight: number;
  emotionModifiers: Map<Emotion, {
    aggressionMod: number;
    defensivenessMod: number;
    riskTakingMod: number;
  }>;
  
  // Faction influence parameters
  factionInfluenceWeight: number;
  factionLoyaltyScale: number;
  allyProtectionThreshold: number;
  rivalTargetingBonus: number;
  
  // Relationship impact
  personalRelationshipWeight: number;
  relationshipThresholds: {
    protectionThreshold: RelationshipStrength;
    assistThreshold: RelationshipStrength;
    neutralThreshold: RelationshipStrength;
    targetThreshold: RelationshipStrength;
  };
  
  // Memory influence
  memoryInfluenceWeight: number;
  recentMemoryBoost: number;
  
  // Debug options
  debugMode: boolean;
  logDecisionFactors: boolean;
}

/**
 * Combat style preferences derived from personality
 */
export interface CombatStylePreference {
  aggression: number;            // 0-100, tendency to attack vs defend
  riskTolerance: number;         // 0-100, willingness to take risks
  tacticalComplexity: number;    // 0-100, preference for complex vs simple tactics
  targetPreference: 'weak' | 'strong' | 'threatening' | 'closest' | 'random';
  selfPreservation: number;      // 0-100, tendency to protect self vs sacrifice
  allyProtection: number;        // 0-100, tendency to protect allies
  resourceConservation: number;  // 0-100, tendency to conserve resources
  adaptability: number;          // 0-100, willingness to change tactics
}

/**
 * Enhanced tactical decision that includes personality-based reasoning
 */
export interface EnhancedTacticalDecision extends TacticalDecision {
  personalityFactors: {
    traits: Record<string, number>;
    emotions: Record<string, number>;
    values: Record<string, number>;
    relationships: Record<string, number>;
    factionInfluences: Record<string, number>;
  };
  confidenceLevel: number;
  alternativeActions: {
    action: string;
    target?: string;
    reasonRejected: string;
  }[];
}

/**
 * Map of personality traits to combat style influences
 */
const TRAIT_COMBAT_MAPPING = {
  // How each Big Five trait affects combat style (positive and negative values)
  openness: {
    highImpact: {
      tacticalComplexity: 0.8,
      adaptability: 0.7,
      resourceConservation: 0.3,
    },
    lowImpact: {
      tacticalComplexity: -0.6,
      adaptability: -0.5,
      targetPreference: 'closest',
    }
  },
  conscientiousness: {
    highImpact: {
      resourceConservation: 0.7,
      allyProtection: 0.6,
      tacticalComplexity: 0.5,
    },
    lowImpact: {
      resourceConservation: -0.6,
      aggression: 0.4,
      riskTolerance: 0.3,
    }
  },
  extraversion: {
    highImpact: {
      aggression: 0.6,
      riskTolerance: 0.5,
      targetPreference: 'threatening',
    },
    lowImpact: {
      selfPreservation: 0.7,
      aggression: -0.4,
      targetPreference: 'weak',
    }
  },
  agreeableness: {
    highImpact: {
      allyProtection: 0.8,
      selfPreservation: -0.3,
      targetPreference: 'threatening',
    },
    lowImpact: {
      allyProtection: -0.5,
      aggression: 0.6,
      targetPreference: 'weak',
    }
  },
  neuroticism: {
    highImpact: {
      selfPreservation: 0.8,
      riskTolerance: -0.7,
      adaptability: -0.4,
    },
    lowImpact: {
      selfPreservation: 0.3,
      riskTolerance: 0.5,
      adaptability: 0.6,
    }
  }
};

/**
 * Map of emotions to combat behavior modifications
 */
const EMOTION_COMBAT_MAPPING = new Map<Emotion, Record<string, number>>([
  [Emotion.ANGER, { 
    aggression: 0.8, 
    riskTolerance: 0.6, 
    allyProtection: -0.3, 
    tacticalComplexity: -0.5 
  }],
  [Emotion.FEAR, { 
    selfPreservation: 0.9, 
    aggression: -0.7, 
    riskTolerance: -0.8,
    resourceConservation: 0.6 
  }],
  [Emotion.JOY, { 
    riskTolerance: 0.3, 
    adaptability: 0.4, 
    tacticalComplexity: 0.2 
  }],
  [Emotion.SADNESS, { 
    aggression: -0.4, 
    tacticalComplexity: -0.3, 
    selfPreservation: 0.2 
  }],
  [Emotion.PRIDE, { 
    aggression: 0.5, 
    riskTolerance: 0.4, 
    allyProtection: 0.3 
  }],
  [Emotion.TRUST, { 
    allyProtection: 0.7, 
    selfPreservation: -0.2,
    adaptability: 0.3 
  }],
  [Emotion.DISGUST, { 
    aggression: 0.4, 
    allyProtection: -0.2 
  }],
  [Emotion.SHAME, { 
    selfPreservation: 0.5, 
    aggression: -0.3, 
    riskTolerance: -0.4 
  }]
]);

/**
 * Map of core values to combat preferences
 */
const VALUE_COMBAT_MAPPING = new Map<Value, Record<string, number>>([
  [Value.POWER, { 
    aggression: 0.7, 
    targetPreference: 'strong', 
    riskTolerance: 0.5 
  }],
  [Value.ACHIEVEMENT, { 
    tacticalComplexity: 0.6, 
    aggression: 0.4, 
    adaptability: 0.5 
  }],
  [Value.HEDONISM, { 
    selfPreservation: 0.8, 
    allyProtection: -0.3,
    resourceConservation: -0.4 
  }],
  [Value.BENEVOLENCE, { 
    allyProtection: 0.9, 
    selfPreservation: -0.5,
    targetPreference: 'threatening' 
  }],
  [Value.SECURITY, { 
    selfPreservation: 0.7, 
    resourceConservation: 0.6,
    riskTolerance: -0.6 
  }],
  [Value.TRADITION, { 
    adaptability: -0.5, 
    tacticalComplexity: -0.3,
    allyProtection: 0.4 
  }],
  [Value.SELF_DIRECTION, { 
    adaptability: 0.7, 
    tacticalComplexity: 0.5,
    allyProtection: -0.2 
  }],
  [Value.UNIVERSALISM, { 
    aggression: -0.6, 
    selfPreservation: 0.2,
    resourceConservation: 0.5 
  }]
]);

/**
 * Integrates NPC personality, social, and faction systems with combat AI
 */
export class CombatAIIntegration {
  private tacticalAI: TacticalAI;
  private personalityProvider: Record<string, PersonalityTraits>;
  private emotionalStateProvider: Record<string, EmotionalState>;
  private coreValuesProvider: Record<string, CoreValues>;
  private behaviorSimulation: BehaviorSimulation;
  private factionSocialIntegration: FactionSocialIntegration;
  private factionManager: FactionManager;
  private relationshipTracker: RelationshipTracker;
  private memoryManager: MemoryManager;
  private config: CombatAIIntegrationConfig;
  
  // Cache for derived combat styles
  private combatStyleCache: Map<string, CombatStylePreference> = new Map();
  
  constructor(
    tacticalAI: TacticalAI,
    behaviorSimulation: BehaviorSimulation,
    factionSocialIntegration: FactionSocialIntegration,
    factionManager: FactionManager,
    relationshipTracker: RelationshipTracker,
    memoryManager: MemoryManager,
    config?: Partial<CombatAIIntegrationConfig>
  ) {
    this.tacticalAI = tacticalAI;
    this.behaviorSimulation = behaviorSimulation;
    this.factionSocialIntegration = factionSocialIntegration;
    this.factionManager = factionManager;
    this.relationshipTracker = relationshipTracker;
    this.memoryManager = memoryManager;
    
    // Set up providers from behavior simulation
    this.personalityProvider = behaviorSimulation.getPersonalityProvider();
    this.emotionalStateProvider = behaviorSimulation.getEmotionalStateProvider();
    this.coreValuesProvider = behaviorSimulation.getCoreValuesProvider();
    
    // Initialize with default config and override with provided config
    this.config = this.getDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }
  
  /**
   * Get default configuration values
   */
  private getDefaultConfig(): CombatAIIntegrationConfig {
    return {
      personalityInfluenceWeight: 0.5,
      traitWeights: {
        openness: 0.15,
        conscientiousness: 0.2,
        extraversion: 0.2,
        agreeableness: 0.25,
        neuroticism: 0.2
      },
      
      emotionalInfluenceWeight: 0.3,
      emotionModifiers: new Map([
        [Emotion.ANGER, { aggressionMod: 0.6, defensivenessMod: -0.3, riskTakingMod: 0.4 }],
        [Emotion.FEAR, { aggressionMod: -0.5, defensivenessMod: 0.6, riskTakingMod: -0.7 }],
        [Emotion.JOY, { aggressionMod: 0.2, defensivenessMod: -0.1, riskTakingMod: 0.3 }],
        [Emotion.SADNESS, { aggressionMod: -0.3, defensivenessMod: 0.1, riskTakingMod: -0.4 }]
      ]),
      
      factionInfluenceWeight: 0.6,
      factionLoyaltyScale: 0.8,
      allyProtectionThreshold: 0.6,
      rivalTargetingBonus: 0.7,
      
      personalRelationshipWeight: 0.4,
      relationshipThresholds: {
        protectionThreshold: RelationshipStrength.CLOSE,
        assistThreshold: RelationshipStrength.FRIENDLY,
        neutralThreshold: RelationshipStrength.NEUTRAL,
        targetThreshold: RelationshipStrength.HOSTILE
      },
      
      memoryInfluenceWeight: 0.3,
      recentMemoryBoost: 1.5,
      
      debugMode: appConfig.debugMode || false,
      logDecisionFactors: appConfig.debugMode || false
    };
  }
  
  /**
   * Enhances a tactical context with personality and faction info
   */
  public enhanceTacticalContext(baseContext: TacticalContext): TacticalContext {
    const npc = baseContext.npc;
    const enhancedContext = { ...baseContext };
    
    // Retrieve personality data
    const personality = this.personalityProvider[npc.id];
    const emotionalState = this.emotionalStateProvider[npc.id];
    const coreValues = this.coreValuesProvider[npc.id];
    
    if (!personality) {
      console.warn(`No personality data found for NPC ${npc.id}, using base tactical context`);
      return baseContext;
    }
    
    // Get combat style based on personality
    const combatStyle = this.getCombatStylePreference(npc.id);
    
    // Update NPC behavior preferences based on personality and emotions
    enhancedContext.npcBehavior = {
      ...enhancedContext.npcBehavior,
      aggression: this.mapAggressionLevel(combatStyle.aggression),
      intelligence: this.mapIntelligenceLevel(personality.openness, personality.conscientiousness),
      tacticalPreference: this.determineTacticalPreference(combatStyle, npc),
      selfPreservation: this.mapSelfPreservationLevel(combatStyle.selfPreservation),
      packTactics: combatStyle.allyProtection > 65
    };
    
    // Update target preferences based on faction relationships and personal relationships
    enhancedContext.npcBehavior.preferredTargets = this.determinePreferredTargets(npc, baseContext.possibleTargets);
    enhancedContext.npcBehavior.avoidedTargets = this.determineAvoidedTargets(npc, baseContext.possibleTargets);
    
    return enhancedContext;
  }
  
  /**
   * Make a tactical decision enhanced by personality and faction considerations
   */
  public makePersonalityEnhancedDecision(npc: NPC, combatState: CombatState): EnhancedTacticalDecision {
    // Get base tactical context
    const baseTacticalContext = this.createBaseTacticalContext(npc, combatState);
    
    // Enhance the context with personality and faction data
    const enhancedContext = this.enhanceTacticalContext(baseTacticalContext);
    
    // Get combat style preference for this NPC
    const combatStyle = this.getCombatStylePreference(npc.id);
    
    // Record factors influencing this decision
    const personalityFactors: Record<string, number> = {};
    const emotionFactors: Record<string, number> = {};
    const valueFactors: Record<string, number> = {};
    const relationshipFactors: Record<string, number> = {};
    const factionFactors: Record<string, number> = {};
    
    // Use tactical AI to make a base decision
    const baseDecision = this.tacticalAI.makeDecision(enhancedContext);
    
    // Modify decision based on personality, emotions, values, and relationships
    const enhancedDecision: EnhancedTacticalDecision = {
      ...baseDecision,
      personalityFactors: {
        traits: personalityFactors,
        emotions: emotionFactors,
        values: valueFactors,
        relationships: relationshipFactors,
        factionInfluences: factionFactors
      },
      confidenceLevel: this.calculateConfidenceLevel(npc, baseDecision),
      alternativeActions: this.generateAlternatives(npc, enhancedContext, baseDecision)
    };
    
    // Log decision factors if debug mode is enabled
    if (this.config.logDecisionFactors) {
      this.logDecisionFactors(npc, enhancedDecision);
    }
    
    return enhancedDecision;
  }
  
  /**
   * Get or calculate the combat style preference for an NPC
   */
  public getCombatStylePreference(npcId: string): CombatStylePreference {
    // Check cache first
    if (this.combatStyleCache.has(npcId)) {
      return this.combatStyleCache.get(npcId)!;
    }
    
    const personality = this.personalityProvider[npcId];
    const emotionalState = this.emotionalStateProvider[npcId];
    const coreValues = this.coreValuesProvider[npcId];
    
    if (!personality) {
      // Return a default combat style if no personality data found
      return this.getDefaultCombatStyle();
    }
    
    // Initialize combat style based on personality traits
    const combatStyle: CombatStylePreference = {
      aggression: 50,            // Neutral baseline
      riskTolerance: 50,
      tacticalComplexity: 50,
      targetPreference: 'threatening', // Default
      selfPreservation: 50,
      allyProtection: 50,
      resourceConservation: 50,
      adaptability: 50
    };
    
    // Apply personality trait influences
    Object.entries(personality).forEach(([trait, value]) => {
      const traitKey = trait as keyof PersonalityTraits;
      const mapping = TRAIT_COMBAT_MAPPING[traitKey];
      
      if (mapping) {
        const influenceMap = value > 60 ? mapping.highImpact : mapping.lowImpact;
        
        Object.entries(influenceMap).forEach(([combatFactor, influence]) => {
          if (combatFactor === 'targetPreference') {
            combatStyle.targetPreference = influence as any;
          } else {
            // Scale the influence by trait value and apply it
            const scaledInfluence = influence * (Math.abs(value - 50) / 50) * 100;
            combatStyle[combatFactor as keyof CombatStylePreference] = 
              Math.max(0, Math.min(100, combatStyle[combatFactor as keyof CombatStylePreference] as number + scaledInfluence));
          }
        });
      }
    });
    
    // Apply emotional state influences if available
    if (emotionalState) {
      const emotionMapping = EMOTION_COMBAT_MAPPING.get(emotionalState.dominantEmotion);
      if (emotionMapping) {
        Object.entries(emotionMapping).forEach(([combatFactor, influence]) => {
          // Scale by emotional intensity
          const scaledInfluence = influence * (emotionalState.intensity / 100) * 100;
          if (typeof combatStyle[combatFactor as keyof CombatStylePreference] === 'number') {
            combatStyle[combatFactor as keyof CombatStylePreference] = 
              Math.max(0, Math.min(100, combatStyle[combatFactor as keyof CombatStylePreference] as number + scaledInfluence));
          }
        });
      }
    }
    
    // Apply core values influences if available
    if (coreValues && coreValues.primary) {
      const valueMapping = VALUE_COMBAT_MAPPING.get(coreValues.primary);
      if (valueMapping) {
        Object.entries(valueMapping).forEach(([combatFactor, influence]) => {
          if (combatFactor === 'targetPreference') {
            // Only override target preference if influence is strong enough
            if (Math.abs(influence) > 0.6) {
              combatStyle.targetPreference = influence as any;
            }
          } else if (typeof combatStyle[combatFactor as keyof CombatStylePreference] === 'number') {
            // Scale by value importance in hierarchy
            const valueStrength = coreValues.valueHierarchy.get(coreValues.primary) || 50;
            const scaledInfluence = influence * (valueStrength / 100) * 100;
            combatStyle[combatFactor as keyof CombatStylePreference] = 
              Math.max(0, Math.min(100, combatStyle[combatFactor as keyof CombatStylePreference] as number + scaledInfluence));
          }
        });
      }
    }
    
    // Cache the calculated style
    this.combatStyleCache.set(npcId, combatStyle);
    
    return combatStyle;
  }
  
  /**
   * Create a base tactical context for an NPC in the current combat state
   */
  private createBaseTacticalContext(npc: NPC, combatState: CombatState): TacticalContext {
    // This method would create the basic tactical context without personality enhancements
    // Implementation depends on the specific structure of your combat system
    // This is a placeholder that would be filled with actual implementation
    
    return {
      combatState,
      npc,
      availableActions: [], // Would be populated from NPC abilities
      possibleTargets: [], // Would be populated from combat state
      battlefield: {
        terrain: 'neutral',
        lighting: 'normal',
        specialFeatures: [],
        environmentalFactors: []
      },
      npcBehavior: {
        aggression: 'neutral',
        intelligence: 'average',
        tacticalPreference: 'mixed',
        selfPreservation: 'medium',
        packTactics: false
      },
      currentRound: combatState.round,
      npcRelativeHealth: 'healthy',
      allyStatus: {
        count: 0,
        healthStatuses: {
          healthy: 0,
          injured: 0,
          critical: 0,
          defeated: 0
        }
      }
    };
  }
  
  /**
   * Map aggression value to tactical AI expected aggression level
   */
  private mapAggressionLevel(aggressionValue: number): 'passive' | 'defensive' | 'aggressive' | 'frenzied' {
    if (aggressionValue < 25) return 'passive';
    if (aggressionValue < 50) return 'defensive';
    if (aggressionValue < 75) return 'aggressive';
    return 'frenzied';
  }
  
  /**
   * Map intelligence based on openness and conscientiousness
   */
  private mapIntelligenceLevel(openness: number, conscientiousness: number): 'animal' | 'low' | 'average' | 'high' | 'genius' {
    const intelligenceScore = (openness * 0.7 + conscientiousness * 0.3);
    if (intelligenceScore < 20) return 'animal';
    if (intelligenceScore < 40) return 'low';
    if (intelligenceScore < 65) return 'average';
    if (intelligenceScore < 85) return 'high';
    return 'genius';
  }
  
  /**
   * Determine tactical preference based on combat style and NPC capabilities
   */
  private determineTacticalPreference(style: CombatStylePreference, npc: NPC): 'melee' | 'ranged' | 'spellcasting' | 'defensive' | 'mixed' {
    // This would use NPC capabilities and combat style to determine preference
    // For now, using a simplistic implementation
    if (style.selfPreservation > 75) return 'defensive';
    
    // Would check for spellcasting ability, ranged weapons, etc.
    return 'mixed';
  }
  
  /**
   * Map self-preservation value to tactical AI expected level
   */
  private mapSelfPreservationLevel(selfPreservationValue: number): 'none' | 'low' | 'medium' | 'high' {
    if (selfPreservationValue < 25) return 'none';
    if (selfPreservationValue < 50) return 'low';
    if (selfPreservationValue < 75) return 'medium';
    return 'high';
  }
  
  /**
   * Determine preferred targets based on faction relationships and personal relationships
   */
  private determinePreferredTargets(npc: NPC, possibleTargets: TacticalContext['possibleTargets']): string[] {
    const preferredTargets: string[] = [];
    
    // Check faction relationships for each target
    possibleTargets.forEach(target => {
      // Check if target belongs to a rival faction
      const targetFactionRelationship = this.getFactionRelationship(npc.id, target.id);
      
      // Check personal relationship
      const personalRelationship = this.relationshipTracker.getRelationshipStrength(npc.id, target.id);
      
      // Add to preferred targets if from rival faction or personal enemy
      if (targetFactionRelationship === 'rival' || 
          personalRelationship <= this.config.relationshipThresholds.targetThreshold) {
        preferredTargets.push(target.id);
      }
      
      // Check any relevant memories that might make this target preferred
      const targetMemories = this.getRelevantTargetMemories(npc.id, target.id);
      if (targetMemories.negative.length > targetMemories.positive.length) {
        preferredTargets.push(target.id);
      }
    });
    
    return preferredTargets;
  }
  
  /**
   * Determine targets to avoid based on faction relationships and personal relationships
   */
  private determineAvoidedTargets(npc: NPC, possibleTargets: TacticalContext['possibleTargets']): string[] {
    const avoidedTargets: string[] = [];
    
    // Check faction relationships for each target
    possibleTargets.forEach(target => {
      // Check if target belongs to an allied faction
      const targetFactionRelationship = this.getFactionRelationship(npc.id, target.id);
      
      // Check personal relationship
      const personalRelationship = this.relationshipTracker.getRelationshipStrength(npc.id, target.id);
      
      // Add to avoided targets if from allied faction or personal friend
      if (targetFactionRelationship === 'ally' || 
          personalRelationship >= this.config.relationshipThresholds.assistThreshold) {
        avoidedTargets.push(target.id);
      }
      
      // Check any relevant memories that might make this target avoided
      const targetMemories = this.getRelevantTargetMemories(npc.id, target.id);
      if (targetMemories.positive.length > targetMemories.negative.length) {
        avoidedTargets.push(target.id);
      }
    });
    
    return avoidedTargets;
  }
  
  /**
   * Get relationship between two entities based on faction membership
   */
  private getFactionRelationship(npcId: string, targetId: string): 'ally' | 'neutral' | 'rival' | 'unknown' {
    // This would use the faction system to determine relationships
    // For now, using a placeholder implementation
    return 'unknown';
  }
  
  /**
   * Get memories relevant to targeting decisions
   */
  private getRelevantTargetMemories(npcId: string, targetId: string) {
    const memories = this.memoryManager.getMemoriesAbout(npcId, targetId);
    
    const positive = memories.filter(m => m.emotionalValence > 0);
    const negative = memories.filter(m => m.emotionalValence < 0);
    
    return { positive, negative };
  }
  
  /**
   * Calculate confidence level for a decision
   */
  private calculateConfidenceLevel(npc: NPC, decision: TacticalDecision): number {
    // This would calculate how confident the NPC is in the decision
    // based on personality, situation, etc.
    // Placeholder implementation
    return 0.75;
  }
  
  /**
   * Generate alternative actions the NPC considered
   */
  private generateAlternatives(
    npc: NPC, 
    context: TacticalContext, 
    chosenDecision: TacticalDecision
  ): { action: string; target?: string; reasonRejected: string }[] {
    // This would generate plausible alternatives that were rejected
    // Placeholder implementation
    return [
      {
        action: 'defend',
        reasonRejected: 'Aggression level too high to adopt defensive stance'
      }
    ];
  }
  
  /**
   * Get default combat style for NPCs without personality data
   */
  private getDefaultCombatStyle(): CombatStylePreference {
    return {
      aggression: 50,
      riskTolerance: 50,
      tacticalComplexity: 50,
      targetPreference: 'threatening',
      selfPreservation: 50,
      allyProtection: 50,
      resourceConservation: 50,
      adaptability: 50
    };
  }
  
  /**
   * Log detailed decision factors for debugging
   */
  private logDecisionFactors(npc: NPC, decision: EnhancedTacticalDecision): void {
    if (!this.config.debugMode) return;
    
    console.log(`[Combat AI] Decision for ${npc.name} (${npc.id}):`);
    console.log(`Action: ${decision.actionName} | Target: ${decision.targetId || 'none'}`);
    console.log(`Confidence: ${decision.confidenceLevel.toFixed(2)}`);
    console.log('Factors:');
    console.log('- Personality:', decision.personalityFactors.traits);
    console.log('- Emotions:', decision.personalityFactors.emotions);
    console.log('- Values:', decision.personalityFactors.values);
    console.log('- Relationships:', decision.personalityFactors.relationships);
    console.log('- Faction Influences:', decision.personalityFactors.factionInfluences);
    console.log(`Reasoning: ${decision.reasoning}`);
    console.log('Alternatives considered:', decision.alternativeActions);
  }
} 