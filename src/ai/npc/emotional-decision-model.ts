/**
 * Emotional Decision Model
 * 
 * This system refines how emotions impact NPC behavior selection and implements emotional
 * contagion between characters, particularly within factions.
 * 
 * Key features include:
 * - Emotional state impact on behavior selection and priority
 * - Emotional contagion between NPCs based on relationship strength
 * - Faction-specific emotional responses to events
 * - Emotion-based memory formation and recall
 * - Dynamic emotional intensity scaling and decay
 */

import { NPC } from '../../character/npc';
import { EmotionType, EmotionalState } from '../../types/emotion-types';
import { Behavior, BehaviorCategory, BehaviorPriority } from './behavior-simulation';
import { FactionManager } from './social/faction-manager';
import { SocialInteractionType } from './social/social-interaction-system';
import { MemoryManager } from '../memory/memory-manager';
import { EventType, GameEvent } from '../../world/event-system';
import { RelationshipTracker } from '../memory/relationship-tracker';

// Emotion impact configurations
interface EmotionImpact {
    behaviorCategories: {
        [key in BehaviorCategory]?: number; // Modifier value for category priority
    };
    behaviorPriority: number; // General modifier to behavior priority
    riskTolerance: number; // -1 to 1, affects willingness to take risks
    socializationDrive: number; // -1 to 1, affects desire to interact with others
    decisionConfidence: number; // 0 to 1, affects confidence in decisions
}

// Configuration of how emotions affect decisions
const EMOTION_IMPACT_CONFIG: Record<EmotionType, EmotionImpact> = {
    [EmotionType.JOY]: {
        behaviorCategories: {
            [BehaviorCategory.SOCIAL]: 0.3,
            [BehaviorCategory.RECREATIONAL]: 0.4,
            [BehaviorCategory.AGGRESSIVE]: -0.3
        },
        behaviorPriority: 0.2,
        riskTolerance: 0.3,
        socializationDrive: 0.5,
        decisionConfidence: 0.7
    },
    [EmotionType.SADNESS]: {
        behaviorCategories: {
            [BehaviorCategory.SOCIAL]: -0.4,
            [BehaviorCategory.SELF_CARE]: 0.2,
            [BehaviorCategory.RECREATIONAL]: -0.3
        },
        behaviorPriority: -0.2,
        riskTolerance: -0.4,
        socializationDrive: -0.6,
        decisionConfidence: 0.4
    },
    [EmotionType.ANGER]: {
        behaviorCategories: {
            [BehaviorCategory.AGGRESSIVE]: 0.6,
            [BehaviorCategory.COOPERATIVE]: -0.5,
            [BehaviorCategory.DEFENSIVE]: 0.3
        },
        behaviorPriority: 0.3,
        riskTolerance: 0.6,
        socializationDrive: -0.3,
        decisionConfidence: 0.8
    },
    [EmotionType.FEAR]: {
        behaviorCategories: {
            [BehaviorCategory.DEFENSIVE]: 0.7,
            [BehaviorCategory.AGGRESSIVE]: -0.2,
            [BehaviorCategory.RECREATIONAL]: -0.5
        },
        behaviorPriority: 0.4,
        riskTolerance: -0.7,
        socializationDrive: -0.5,
        decisionConfidence: 0.3
    },
    [EmotionType.DISGUST]: {
        behaviorCategories: {
            [BehaviorCategory.SOCIAL]: -0.3,
            [BehaviorCategory.COOPERATIVE]: -0.4,
            [BehaviorCategory.SELF_CARE]: 0.2
        },
        behaviorPriority: -0.1,
        riskTolerance: -0.2,
        socializationDrive: -0.7,
        decisionConfidence: 0.5
    },
    [EmotionType.SURPRISE]: {
        behaviorCategories: {
            [BehaviorCategory.CURIOUS]: 0.7,
            [BehaviorCategory.ROUTINE]: -0.5
        },
        behaviorPriority: 0.3,
        riskTolerance: 0.2,
        socializationDrive: 0.1,
        decisionConfidence: 0.4
    },
    [EmotionType.TRUST]: {
        behaviorCategories: {
            [BehaviorCategory.COOPERATIVE]: 0.6,
            [BehaviorCategory.SOCIAL]: 0.4,
            [BehaviorCategory.DEFENSIVE]: -0.3
        },
        behaviorPriority: 0.2,
        riskTolerance: 0.4,
        socializationDrive: 0.6,
        decisionConfidence: 0.8
    },
    [EmotionType.ANTICIPATION]: {
        behaviorCategories: {
            [BehaviorCategory.PREPARATORY]: 0.6,
            [BehaviorCategory.CURIOUS]: 0.4
        },
        behaviorPriority: 0.2,
        riskTolerance: 0.3,
        socializationDrive: 0.2,
        decisionConfidence: 0.6
    }
};

// Emotional contagion factors by relationship type
const EMOTIONAL_CONTAGION_FACTORS = {
    FAMILY: 0.7,
    CLOSE_FRIEND: 0.6,
    FRIEND: 0.4,
    ALLY: 0.3,
    ACQUAINTANCE: 0.2,
    STRANGER: 0.1,
    RIVAL: 0.15,
    ENEMY: 0.05
};

// Faction emotional amplification factors
const FACTION_EMOTIONAL_AMPLIFICATION = {
    SAME_FACTION: 0.3, // Additional amplification for same faction
    ALLIED_FACTION: 0.15, // Additional amplification for allied factions
    RIVAL_FACTION: -0.1, // Reduction for rival factions
    ENEMY_FACTION: -0.2 // Reduction for enemy factions
};

/**
 * Main class that handles how emotions affect NPC decisions and behaviors
 */
export class EmotionalDecisionModel {
    private factionManager: FactionManager;
    private memoryManager: MemoryManager;
    private relationshipTracker: RelationshipTracker;
    
    constructor(
        factionManager: FactionManager,
        memoryManager: MemoryManager,
        relationshipTracker: RelationshipTracker
    ) {
        this.factionManager = factionManager;
        this.memoryManager = memoryManager;
        this.relationshipTracker = relationshipTracker;
    }

    /**
     * Apply emotional modifiers to a set of behaviors
     * @param npc The NPC whose emotions are affecting behaviors
     * @param behaviors List of available behaviors
     * @returns Modified behaviors with adjusted priorities
     */
    public modifyBehaviorsByEmotion(npc: NPC, behaviors: Behavior[]): Behavior[] {
        // Clone the behaviors to avoid modifying the originals
        const modifiedBehaviors = behaviors.map(b => ({ ...b }));
        
        // Apply emotional impacts to each behavior
        modifiedBehaviors.forEach(behavior => {
            // Get the combined emotional impact on this behavior
            let priorityModifier = 0;
            let confidenceModifier = 0;
            
            // Process each active emotion
            npc.emotionalState.activeEmotions.forEach(emotion => {
                const impact = EMOTION_IMPACT_CONFIG[emotion.type];
                if (!impact) return;
                
                // Apply category-specific modifiers
                if (impact.behaviorCategories[behavior.category]) {
                    priorityModifier += impact.behaviorCategories[behavior.category] * emotion.intensity;
                }
                
                // Apply general priority modifier
                priorityModifier += impact.behaviorPriority * emotion.intensity;
                
                // Accumulate confidence modifier
                confidenceModifier += impact.decisionConfidence * emotion.intensity;
            });
            
            // Apply the calculated modifiers
            behavior.priority = this.adjustPriority(behavior.priority, priorityModifier);
            
            // Add decision confidence to the behavior (metadata for reasoning)
            behavior.metadata = behavior.metadata || {};
            behavior.metadata.emotionalConfidence = this.normalizeValue(confidenceModifier, 0, 1);
            behavior.metadata.emotionallyModified = true;
        });
        
        return modifiedBehaviors;
    }
    
    /**
     * Get risk tolerance modifier based on current emotional state
     * @param npc The NPC to evaluate
     * @returns Risk tolerance modifier (-1 to 1)
     */
    public getEmotionalRiskTolerance(npc: NPC): number {
        let riskModifier = 0;
        
        npc.emotionalState.activeEmotions.forEach(emotion => {
            const impact = EMOTION_IMPACT_CONFIG[emotion.type];
            if (impact) {
                riskModifier += impact.riskTolerance * emotion.intensity;
            }
        });
        
        return this.normalizeValue(riskModifier, -1, 1);
    }
    
    /**
     * Get socialization drive modifier based on current emotional state
     * @param npc The NPC to evaluate
     * @returns Socialization drive modifier (-1 to 1)
     */
    public getEmotionalSocializationDrive(npc: NPC): number {
        let socialModifier = 0;
        
        npc.emotionalState.activeEmotions.forEach(emotion => {
            const impact = EMOTION_IMPACT_CONFIG[emotion.type];
            if (impact) {
                socialModifier += impact.socializationDrive * emotion.intensity;
            }
        });
        
        return this.normalizeValue(socialModifier, -1, 1);
    }
    
    /**
     * Process emotional contagion between NPCs
     * @param sourceNPC The NPC whose emotions might spread
     * @param targetNPC The NPC who might receive emotional contagion
     * @param proximity How close they are (0-1)
     */
    public processEmotionalContagion(sourceNPC: NPC, targetNPC: NPC, proximity: number = 1): void {
        // Skip if source has no active emotions
        if (sourceNPC.emotionalState.activeEmotions.length === 0) return;
        
        // Get relationship strength
        const relationshipType = this.relationshipTracker.getRelationshipType(sourceNPC.id, targetNPC.id);
        const relationshipStrength = this.relationshipTracker.getRelationshipStrength(sourceNPC.id, targetNPC.id);
        
        // Get contagion factor based on relationship
        let contagionFactor = EMOTIONAL_CONTAGION_FACTORS[relationshipType] || EMOTIONAL_CONTAGION_FACTORS.STRANGER;
        
        // Modify contagion based on faction relationships
        const sourceFaction = this.factionManager.getNPCFaction(sourceNPC.id);
        const targetFaction = this.factionManager.getNPCFaction(targetNPC.id);
        
        if (sourceFaction && targetFaction) {
            if (sourceFaction.id === targetFaction.id) {
                contagionFactor += FACTION_EMOTIONAL_AMPLIFICATION.SAME_FACTION;
            } else {
                const factionRelationship = this.factionManager.getFactionRelationship(sourceFaction.id, targetFaction.id);
                if (factionRelationship === 'ally') {
                    contagionFactor += FACTION_EMOTIONAL_AMPLIFICATION.ALLIED_FACTION;
                } else if (factionRelationship === 'rival') {
                    contagionFactor += FACTION_EMOTIONAL_AMPLIFICATION.RIVAL_FACTION;
                } else if (factionRelationship === 'enemy') {
                    contagionFactor += FACTION_EMOTIONAL_AMPLIFICATION.ENEMY_FACTION;
                }
            }
        }
        
        // Apply proximity factor
        contagionFactor *= proximity;
        
        // Apply relationship strength
        contagionFactor *= relationshipStrength;
        
        // Process each emotion for contagion
        sourceNPC.emotionalState.activeEmotions.forEach(sourceEmotion => {
            // Some emotions are more contagious than others
            let emotionContagiousness = 1.0;
            if (sourceEmotion.type === EmotionType.FEAR) emotionContagiousness = 1.5;
            if (sourceEmotion.type === EmotionType.JOY) emotionContagiousness = 1.3;
            
            // Calculate final intensity to transfer
            const transferIntensity = sourceEmotion.intensity * contagionFactor * emotionContagiousness;
            
            // Only transfer if it meets minimum threshold
            if (transferIntensity > 0.1) {
                this.addOrUpdateEmotion(targetNPC, sourceEmotion.type, transferIntensity, 'contagion');
            }
        });
    }
    
    /**
     * Process faction-wide emotional responses to events
     * @param event The event that occurred
     * @param factionId The ID of the faction to process emotions for
     */
    public processFactionEmotionalResponse(event: GameEvent, factionId: string): void {
        const faction = this.factionManager.getFaction(factionId);
        if (!faction) return;
        
        // Determine emotional response based on event type and faction values
        let emotionalResponses: {type: EmotionType, intensity: number}[] = [];
        
        // Different event types trigger different emotional responses
        switch(event.type) {
            case EventType.ATTACK:
                // If faction was attacked
                if (event.targetFactionId === factionId) {
                    emotionalResponses.push({type: EmotionType.ANGER, intensity: 0.7});
                    emotionalResponses.push({type: EmotionType.FEAR, intensity: 0.5});
                } 
                // If faction was the attacker
                else if (event.sourceFactionId === factionId) {
                    const targetRelationship = this.factionManager.getFactionRelationship(factionId, event.targetFactionId);
                    if (targetRelationship === 'enemy') {
                        emotionalResponses.push({type: EmotionType.JOY, intensity: 0.6});
                    }
                }
                break;
                
            case EventType.ALLIANCE_FORMED:
                if (event.sourceFactionId === factionId || event.targetFactionId === factionId) {
                    emotionalResponses.push({type: EmotionType.JOY, intensity: 0.5});
                    emotionalResponses.push({type: EmotionType.TRUST, intensity: 0.6});
                }
                break;
                
            case EventType.RESOURCE_GAIN:
                if (event.targetFactionId === factionId) {
                    emotionalResponses.push({type: EmotionType.JOY, intensity: 0.4});
                    emotionalResponses.push({type: EmotionType.ANTICIPATION, intensity: 0.5});
                }
                break;
                
            case EventType.RESOURCE_LOSS:
                if (event.targetFactionId === factionId) {
                    emotionalResponses.push({type: EmotionType.SADNESS, intensity: 0.5});
                    emotionalResponses.push({type: EmotionType.ANGER, intensity: 0.4});
                }
                break;
                
            case EventType.MEMBER_DEATH:
                if (event.targetFactionId === factionId) {
                    emotionalResponses.push({type: EmotionType.SADNESS, intensity: 0.8});
                    // If killed by another faction
                    if (event.sourceFactionId && event.sourceFactionId !== factionId) {
                        emotionalResponses.push({type: EmotionType.ANGER, intensity: 0.7});
                    }
                }
                break;
        }
        
        // Adjust emotional responses based on faction values
        emotionalResponses = this.adjustEmotionalResponsesByFactionValues(faction, emotionalResponses);
        
        // Apply emotions to all faction members with distance-based decay
        faction.members.forEach(memberId => {
            const member = this.getNPC(memberId);
            if (!member) return;
            
            // Get member's distance from event (placeholder - would need actual implementation)
            const distanceFromEvent = this.getDistanceFromEvent(member, event);
            const proximityFactor = Math.max(0, 1 - (distanceFromEvent * 0.1));
            
            // Apply each emotional response with proximity decay
            emotionalResponses.forEach(emotion => {
                const adjustedIntensity = emotion.intensity * proximityFactor;
                if (adjustedIntensity > 0.1) {
                    this.addOrUpdateEmotion(member, emotion.type, adjustedIntensity, 'faction_event');
                }
            });
        });
    }
    
    /**
     * Create an emotional memory based on significant emotional responses
     * @param npc The NPC experiencing the emotion
     * @param event The event that triggered the emotion
     * @param emotionType The type of emotion
     * @param intensity The intensity of the emotion
     */
    public createEmotionalMemory(npc: NPC, event: GameEvent, emotionType: EmotionType, intensity: number): void {
        // Only create memories for sufficiently intense emotions
        if (intensity < 0.5) return;
        
        const memoryImportance = Math.min(1.0, intensity * 1.5); // Emotions create more important memories
        
        this.memoryManager.addMemory({
            ownerId: npc.id,
            type: 'emotional',
            importance: memoryImportance,
            content: {
                event: event,
                emotion: emotionType,
                intensity: intensity,
                timestamp: Date.now()
            },
            metadata: {
                emotionBased: true,
                emotionType: emotionType
            }
        });
    }
    
    // UTILITY METHODS
    
    /**
     * Adjust behavior priority based on emotional modifier
     * @param currentPriority Current behavior priority
     * @param modifier Emotional priority modifier
     * @returns Adjusted priority
     */
    private adjustPriority(currentPriority: BehaviorPriority, modifier: number): BehaviorPriority {
        // Convert string priority to number for calculation
        let numericPriority: number;
        switch (currentPriority) {
            case BehaviorPriority.CRITICAL: numericPriority = 5; break;
            case BehaviorPriority.HIGH: numericPriority = 4; break;
            case BehaviorPriority.MEDIUM: numericPriority = 3; break;
            case BehaviorPriority.LOW: numericPriority = 2; break;
            case BehaviorPriority.BACKGROUND: numericPriority = 1; break;
            default: numericPriority = 0;
        }
        
        // Apply modifier
        numericPriority += modifier * 2; // Scale modifier to have meaningful impact
        
        // Clamp and convert back to enum
        numericPriority = Math.max(1, Math.min(5, Math.round(numericPriority)));
        
        switch (numericPriority) {
            case 5: return BehaviorPriority.CRITICAL;
            case 4: return BehaviorPriority.HIGH;
            case 3: return BehaviorPriority.MEDIUM;
            case 2: return BehaviorPriority.LOW;
            default: return BehaviorPriority.BACKGROUND;
        }
    }
    
    /**
     * Add or update an emotion in an NPC's emotional state
     * @param npc The NPC to update
     * @param emotionType The type of emotion
     * @param intensity The intensity to add (will be combined with existing)
     * @param source The source of the emotion
     */
    private addOrUpdateEmotion(npc: NPC, emotionType: EmotionType, intensity: number, source: string): void {
        // Find existing emotion of this type
        const existingIndex = npc.emotionalState.activeEmotions.findIndex(e => e.type === emotionType);
        
        if (existingIndex >= 0) {
            // Update existing emotion
            const currentIntensity = npc.emotionalState.activeEmotions[existingIndex].intensity;
            const newIntensity = Math.min(1.0, currentIntensity + (intensity * 0.7)); // Diminishing returns
            
            npc.emotionalState.activeEmotions[existingIndex].intensity = newIntensity;
            npc.emotionalState.activeEmotions[existingIndex].sources.push(source);
        } else {
            // Add new emotion
            npc.emotionalState.activeEmotions.push({
                type: emotionType,
                intensity: Math.min(1.0, intensity),
                sources: [source],
                created: Date.now(),
                lastModified: Date.now()
            });
        }
    }
    
    /**
     * Adjust emotional responses based on faction values
     * @param faction The faction
     * @param responses The base emotional responses
     * @returns Adjusted emotional responses
     */
    private adjustEmotionalResponsesByFactionValues(faction: any, responses: {type: EmotionType, intensity: number}[]): {type: EmotionType, intensity: number}[] {
        // Clone responses to avoid modifying the original
        const adjustedResponses = [...responses];
        
        // Modify based on faction values
        faction.values.forEach(value => {
            switch (value.name.toLowerCase()) {
                case 'honor':
                    // Honor amplifies anger at betrayal, pride in victory
                    this.modifyResponseByEmotion(adjustedResponses, EmotionType.ANGER, 0.2);
                    this.modifyResponseByEmotion(adjustedResponses, EmotionType.JOY, 0.1);
                    break;
                case 'loyalty':
                    // Loyalty amplifies sadness at loss, joy at alliance
                    this.modifyResponseByEmotion(adjustedResponses, EmotionType.SADNESS, 0.3);
                    this.modifyResponseByEmotion(adjustedResponses, EmotionType.TRUST, 0.3);
                    break;
                case 'ambition':
                    // Ambition reduces sadness, increases anticipation
                    this.modifyResponseByEmotion(adjustedResponses, EmotionType.SADNESS, -0.2);
                    this.modifyResponseByEmotion(adjustedResponses, EmotionType.ANTICIPATION, 0.3);
                    break;
                case 'freedom':
                    // Freedom reduces fear, increases joy
                    this.modifyResponseByEmotion(adjustedResponses, EmotionType.FEAR, -0.2);
                    this.modifyResponseByEmotion(adjustedResponses, EmotionType.JOY, 0.2);
                    break;
                case 'tradition':
                    // Tradition reduces surprise, increases trust
                    this.modifyResponseByEmotion(adjustedResponses, EmotionType.SURPRISE, -0.3);
                    this.modifyResponseByEmotion(adjustedResponses, EmotionType.TRUST, 0.2);
                    break;
            }
        });
        
        return adjustedResponses;
    }
    
    /**
     * Modify a specific emotion in an array of responses
     * @param responses Array of emotional responses
     * @param emotionType The type to modify
     * @param modifier The amount to modify by
     */
    private modifyResponseByEmotion(responses: {type: EmotionType, intensity: number}[], emotionType: EmotionType, modifier: number): void {
        const existing = responses.find(r => r.type === emotionType);
        if (existing) {
            existing.intensity = this.normalizeValue(existing.intensity + modifier, 0, 1);
        } else if (modifier > 0) {
            // Only add new emotion if modifier is positive
            responses.push({
                type: emotionType,
                intensity: this.normalizeValue(modifier, 0, 1)
            });
        }
    }
    
    /**
     * Helper method to get distance between NPC and event (placeholder)
     * @param npc The NPC
     * @param event The event
     * @returns Distance value (0-10)
     */
    private getDistanceFromEvent(npc: NPC, event: GameEvent): number {
        // Placeholder - in a real implementation this would use actual position data
        // For now, return a random value between 0 and 10
        return Math.random() * 10;
    }
    
    /**
     * Helper method to get NPC by ID (placeholder)
     * @param npcId The NPC ID
     * @returns NPC object or undefined
     */
    private getNPC(npcId: string): NPC | undefined {
        // Placeholder - in a real implementation this would fetch from an NPC registry
        // For now, return undefined
        return undefined;
    }
    
    /**
     * Normalize a value to be within a specified range
     * @param value The value to normalize
     * @param min Minimum allowed value
     * @param max Maximum allowed value
     * @returns Normalized value
     */
    private normalizeValue(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
} 