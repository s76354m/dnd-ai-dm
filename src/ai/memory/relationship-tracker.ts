/**
 * Relationship Tracker
 * 
 * This system tracks relationships between characters and NPCs, storing
 * sentiment, trust, and interaction history to enhance narrative coherence.
 */

import { SimpleNPC, SimpleCharacter } from '../../simple-main';

/**
 * Relationship strength values
 */
export enum RelationshipStrength {
  HOSTILE = -3,       // Open hostility/hatred
  ANTAGONISTIC = -2,  // Strong dislike/opposition
  UNFRIENDLY = -1,    // Dislike/distrust
  NEUTRAL = 0,        // Neutral/indifferent
  FRIENDLY = 1,       // Positive/cordial
  TRUSTING = 2,       // Strong liking/trust
  DEVOTED = 3         // Extremely close/loyal
}

/**
 * Types of relationships that can exist
 */
export enum RelationshipType {
  PROFESSIONAL = 'professional',   // Work/business relationship
  PERSONAL = 'personal',           // Friendship/personal connection
  ROMANTIC = 'romantic',           // Romantic or intimate connection
  FAMILIAL = 'familial',           // Family ties
  MENTORSHIP = 'mentorship',       // Teacher/student relationship
  RIVALRY = 'rivalry',             // Competitive relationship
  ENMITY = 'enmity'                // Enemies/adversaries
}

/**
 * Interaction recording the nature of character interaction
 */
export interface Interaction {
  id: string;                    // Unique identifier
  timestamp: number;             // When the interaction occurred
  initiator: string;             // Who initiated the interaction
  target: string;                // Who was targeted
  type: string;                  // Type of interaction (conversation, gift, attack, etc.)
  description: string;           // Brief description of what happened
  impact: number;                // Impact on relationship (-10 to +10)
  context: string;               // Additional context (location, situation)
}

/**
 * Relationship between two entities
 */
export interface Relationship {
  id: string;                    // Unique identifier
  entity1: string;               // First entity in relationship
  entity2: string;               // Second entity in relationship
  strength: RelationshipStrength;// Current strength of relationship
  types: RelationshipType[];     // Types of relationship
  trust: number;                 // Trust level (0-100)
  respect: number;               // Respect level (0-100)
  familiarity: number;           // How well they know each other (0-100)
  lastInteraction: number;       // Timestamp of last interaction
  significantInteractions: string[]; // IDs of significant interactions
  notes: string[];               // Important notes about relationship
  history: {                     // Historical strength values
    timestamp: number;
    strength: RelationshipStrength;
  }[];
  knownSecrets: string[];        // Secrets shared between entities
}

/**
 * Configuration for relationship tracker
 */
export interface RelationshipConfig {
  defaultDecayRate: number;      // Rate at which relationships decay when not maintained
  maxInteractionsStored: number; // Maximum number of interactions to store
  significantImpactThreshold: number; // Threshold for considering an interaction significant
  minFamiliarityForTrust: number; // Minimum familiarity needed for trust to increase
}

/**
 * Manages relationships between entities in the game
 */
export class RelationshipTracker {
  private relationships: Map<string, Relationship> = new Map();
  private interactions: Map<string, Interaction> = new Map();
  private config: RelationshipConfig;
  
  constructor(config?: Partial<RelationshipConfig>) {
    // Default configuration
    this.config = {
      defaultDecayRate: 0.98,        // 2% decay per cycle
      maxInteractionsStored: 100,     // Store last 100 interactions
      significantImpactThreshold: 5,  // Impact of 5+ is significant
      minFamiliarityForTrust: 20,     // Need 20% familiarity for trust to increase
      ...config
    };
  }
  
  /**
   * Generate a unique relationship ID from two entity IDs
   */
  private getRelationshipId(entity1: string, entity2: string): string {
    // Sort to ensure consistency regardless of order
    const sortedEntities = [entity1, entity2].sort();
    return `rel_${sortedEntities[0]}_${sortedEntities[1]}`;
  }
  
  /**
   * Get or create a relationship between two entities
   */
  public getOrCreateRelationship(entity1: string, entity2: string): Relationship {
    const relationshipId = this.getRelationshipId(entity1, entity2);
    
    if (!this.relationships.has(relationshipId)) {
      const newRelationship: Relationship = {
        id: relationshipId,
        entity1: entity1,
        entity2: entity2,
        strength: RelationshipStrength.NEUTRAL,
        types: [],
        trust: 0,
        respect: 0,
        familiarity: 0,
        lastInteraction: Date.now(),
        significantInteractions: [],
        notes: [],
        history: [{
          timestamp: Date.now(),
          strength: RelationshipStrength.NEUTRAL
        }],
        knownSecrets: []
      };
      
      this.relationships.set(relationshipId, newRelationship);
    }
    
    return this.relationships.get(relationshipId)!;
  }
  
  /**
   * Record an interaction between two entities
   */
  public recordInteraction(interaction: Omit<Interaction, 'id' | 'timestamp'>): string {
    const id = `int_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const timestamp = Date.now();
    
    const newInteraction: Interaction = {
      ...interaction,
      id,
      timestamp
    };
    
    this.interactions.set(id, newInteraction);
    
    // Update the relationship based on this interaction
    this.updateRelationship(interaction.initiator, interaction.target, newInteraction);
    
    // Prune old interactions if we exceed the maximum
    this.pruneOldInteractions();
    
    return id;
  }
  
  /**
   * Update a relationship based on an interaction
   */
  private updateRelationship(entity1: string, entity2: string, interaction: Interaction): void {
    const relationship = this.getOrCreateRelationship(entity1, entity2);
    
    // Update last interaction time
    relationship.lastInteraction = interaction.timestamp;
    
    // Increase familiarity (capped at 100)
    relationship.familiarity = Math.min(100, relationship.familiarity + 1);
    
    // Update strength based on impact
    this.updateRelationshipStrength(relationship, interaction.impact);
    
    // Add to significant interactions if impact exceeds threshold
    if (Math.abs(interaction.impact) >= this.config.significantImpactThreshold) {
      relationship.significantInteractions.push(interaction.id);
    }
    
    // Update trust if familiarity threshold is met
    if (relationship.familiarity >= this.config.minFamiliarityForTrust) {
      // Trust increases with positive impact, decreases with negative
      const trustChange = interaction.impact / 2; // Half the impact affects trust
      relationship.trust = Math.max(0, Math.min(100, relationship.trust + trustChange));
    }
    
    // Record history point if strength changed
    const currentStrength = relationship.strength;
    const lastHistoryPoint = relationship.history[relationship.history.length - 1];
    
    if (lastHistoryPoint.strength !== currentStrength) {
      relationship.history.push({
        timestamp: interaction.timestamp,
        strength: currentStrength
      });
    }
  }
  
  /**
   * Update relationship strength based on interaction impact
   */
  private updateRelationshipStrength(relationship: Relationship, impact: number): void {
    // Current numeric value
    let strengthValue = relationship.strength;
    
    // Calculate new strength value (constrained to enum values)
    let newStrengthValue = strengthValue;
    
    if (impact >= 8) newStrengthValue++; // Very significant positive impact
    else if (impact >= 5) newStrengthValue += 0.5; // Significant positive impact
    else if (impact >= 2) newStrengthValue += 0.25; // Moderate positive impact
    else if (impact <= -8) newStrengthValue--; // Very significant negative impact
    else if (impact <= -5) newStrengthValue -= 0.5; // Significant negative impact
    else if (impact <= -2) newStrengthValue -= 0.25; // Moderate negative impact
    
    // Round to nearest RelationshipStrength
    const roundedStrength = Math.round(newStrengthValue);
    
    // Constrain to valid enum values
    const constrainedStrength = Math.max(
      RelationshipStrength.HOSTILE,
      Math.min(RelationshipStrength.DEVOTED, roundedStrength)
    ) as RelationshipStrength;
    
    relationship.strength = constrainedStrength;
  }
  
  /**
   * Apply time-based decay to relationships that haven't been recently updated
   */
  public applyRelationshipDecay(): void {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // ms in a day
    
    for (const relationship of this.relationships.values()) {
      // Calculate days since last interaction
      const daysSinceLastInteraction = (now - relationship.lastInteraction) / oneDay;
      
      // Only decay if it's been at least a day and relationship isn't neutral
      if (daysSinceLastInteraction >= 1 && relationship.strength !== RelationshipStrength.NEUTRAL) {
        // Apply decay based on days passed
        for (let i = 0; i < Math.floor(daysSinceLastInteraction); i++) {
          // Move strength toward neutral
          if (relationship.strength > RelationshipStrength.NEUTRAL) {
            relationship.strength = Math.max(
              RelationshipStrength.NEUTRAL,
              relationship.strength - 0.1
            ) as RelationshipStrength;
          } else if (relationship.strength < RelationshipStrength.NEUTRAL) {
            relationship.strength = Math.min(
              RelationshipStrength.NEUTRAL,
              relationship.strength + 0.1
            ) as RelationshipStrength;
          }
        }
        
        // Record history if strength changed
        const lastHistoryPoint = relationship.history[relationship.history.length - 1];
        if (lastHistoryPoint.strength !== relationship.strength) {
          relationship.history.push({
            timestamp: now,
            strength: relationship.strength
          });
        }
      }
    }
  }
  
  /**
   * Add a note to a relationship
   */
  public addRelationshipNote(entity1: string, entity2: string, note: string): void {
    const relationship = this.getOrCreateRelationship(entity1, entity2);
    relationship.notes.push(note);
  }
  
  /**
   * Record that a secret is shared between entities
   */
  public addSharedSecret(entity1: string, entity2: string, secret: string): void {
    const relationship = this.getOrCreateRelationship(entity1, entity2);
    if (!relationship.knownSecrets.includes(secret)) {
      relationship.knownSecrets.push(secret);
    }
  }
  
  /**
   * Add a relationship type
   */
  public addRelationshipType(entity1: string, entity2: string, type: RelationshipType): void {
    const relationship = this.getOrCreateRelationship(entity1, entity2);
    if (!relationship.types.includes(type)) {
      relationship.types.push(type);
    }
  }
  
  /**
   * Get all relationships for an entity
   */
  public getRelationshipsForEntity(entityId: string): Relationship[] {
    return Array.from(this.relationships.values())
      .filter(rel => rel.entity1 === entityId || rel.entity2 === entityId);
  }
  
  /**
   * Get significant interactions for a relationship
   */
  public getSignificantInteractions(entity1: string, entity2: string): Interaction[] {
    const relationship = this.getOrCreateRelationship(entity1, entity2);
    
    return relationship.significantInteractions
      .map(id => this.interactions.get(id))
      .filter(interaction => interaction !== undefined) as Interaction[];
  }
  
  /**
   * Prune old interactions to stay within max limit
   */
  private pruneOldInteractions(): void {
    if (this.interactions.size <= this.config.maxInteractionsStored) {
      return;
    }
    
    // Convert to array for sorting
    const interactionsArray = Array.from(this.interactions.values());
    
    // Sort by timestamp (oldest first)
    interactionsArray.sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate how many to remove
    const removeCount = interactionsArray.length - this.config.maxInteractionsStored;
    
    // Get the oldest interactions to remove
    const interactionsToRemove = interactionsArray.slice(0, removeCount);
    
    // Remove them from the map
    interactionsToRemove.forEach(interaction => {
      this.interactions.delete(interaction.id);
    });
  }
  
  /**
   * Generate relationship summary for narrative context
   */
  public generateRelationshipSummary(entity1: string, entity2: string): string {
    const relationship = this.getOrCreateRelationship(entity1, entity2);
    const significantInteractions = this.getSignificantInteractions(entity1, entity2);
    
    const relationshipLabel = this.getRelationshipLabel(relationship.strength);
    const typeDescriptions = relationship.types.map(type => this.getTypeDescription(type));
    
    let summary = `${entity1} and ${entity2} have a ${relationshipLabel} relationship`;
    
    if (typeDescriptions.length > 0) {
      summary += ` that is ${typeDescriptions.join(' and ')}`;
    }
    
    summary += `.`;
    
    if (relationship.familiarity > 50) {
      summary += ` They know each other well.`;
    } else if (relationship.familiarity > 20) {
      summary += ` They are somewhat familiar with each other.`;
    } else {
      summary += ` They don't know each other very well.`;
    }
    
    if (relationship.trust > 70) {
      summary += ` ${entity1} deeply trusts ${entity2}.`;
    } else if (relationship.trust > 40) {
      summary += ` ${entity1} generally trusts ${entity2}.`;
    } else if (relationship.trust < 20 && relationship.familiarity > 30) {
      summary += ` ${entity1} is wary of ${entity2}.`;
    }
    
    if (significantInteractions.length > 0) {
      summary += ` Notable interactions: `;
      
      // Get the 3 most recent significant interactions
      const recentInteractions = [...significantInteractions]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3);
      
      summary += recentInteractions.map(i => i.description).join('; ') + '.';
    }
    
    return summary;
  }
  
  /**
   * Get a text label for a relationship strength
   */
  private getRelationshipLabel(strength: RelationshipStrength): string {
    switch (strength) {
      case RelationshipStrength.HOSTILE: return 'hostile';
      case RelationshipStrength.ANTAGONISTIC: return 'antagonistic';
      case RelationshipStrength.UNFRIENDLY: return 'unfriendly';
      case RelationshipStrength.NEUTRAL: return 'neutral';
      case RelationshipStrength.FRIENDLY: return 'friendly';
      case RelationshipStrength.TRUSTING: return 'trusting';
      case RelationshipStrength.DEVOTED: return 'devoted';
      default: return 'unknown';
    }
  }
  
  /**
   * Get a description for a relationship type
   */
  private getTypeDescription(type: RelationshipType): string {
    switch (type) {
      case RelationshipType.PROFESSIONAL: return 'professional';
      case RelationshipType.PERSONAL: return 'personal';
      case RelationshipType.ROMANTIC: return 'romantic';
      case RelationshipType.FAMILIAL: return 'familial';
      case RelationshipType.MENTORSHIP: return 'mentor/student';
      case RelationshipType.RIVALRY: return 'rivaling';
      case RelationshipType.ENMITY: return 'adversarial';
      default: return 'unspecified';
    }
  }
} 