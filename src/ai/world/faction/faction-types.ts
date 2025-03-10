/**
 * Type definitions for the Faction System
 */

/**
 * Represents the current state of a faction
 * All values are on a scale of 0-100
 */
export interface FactionState {
  /** Overall military and political power */
  power: number;
  
  /** Financial resources and economic strength */
  wealth: number;
  
  /** Internal unity and loyalty */
  cohesion: number;
  
  /** How the faction is perceived by others */
  reputation: number;
  
  /** Ability to affect other factions and world events */
  influence: number;
  
  /** Tendency to avoid interaction with other factions */
  isolation: number;
  
  /** Willingness to use force or confrontation */
  aggression: number;
  
  /** Level of internal moral decay or exploitation */
  corruption: number;
  
  /** Additional custom state properties can be added */
  [key: string]: number;
}

/**
 * Types of values a faction might hold
 */
export type FactionValueType = 
  | 'honor'
  | 'wealth'
  | 'power'
  | 'knowledge'
  | 'tradition'
  | 'progress'
  | 'order'
  | 'freedom'
  | 'loyalty'
  | 'justice'
  | 'mercy'
  | 'nature'
  | 'artifice'
  | 'community'
  | 'individuality'
  | 'spirituality'
  | 'practicality'
  | 'conquest'
  | 'peace'
  | 'secrecy'
  | 'openness'
  | string; // Allow for custom values

/**
 * Represents a value held by a faction
 * Strength can be positive or negative (-100 to 100)
 * Negative values represent opposition to that value
 */
export interface FactionValue {
  type: FactionValueType;
  strength: number; // -100 to 100
  description?: string;
}

/**
 * Types of goals a faction might pursue
 */
export type FactionGoalType = 
  | 'territory' // Control a specific location
  | 'resource' // Acquire or control a resource
  | 'alliance' // Form an alliance with another faction
  | 'elimination' // Destroy or severely weaken another faction
  | 'influence' // Increase general influence
  | 'wealth' // Increase wealth/resources
  | 'knowledge' // Discover or create knowledge
  | 'revenge' // Avenge a past wrong
  | 'protection' // Protect something or someone
  | 'ideology' // Spread an ideology or value
  | 'ritual' // Complete a ritual or ceremony
  | string; // Allow for custom goal types

/**
 * Represents a goal pursued by a faction
 */
export interface FactionGoal {
  id: string;
  type: FactionGoalType;
  title: string;
  description: string;
  priority: number; // 1-10, higher is more important
  progress: number; // 0-100
  targetId?: string; // ID of target territory, faction, etc.
  deadline?: number; // Timestamp for when goal should be completed
  conditions?: {
    // Additional conditions that must be met
    [key: string]: any;
  };
}

/**
 * Represents a relationship between two factions
 */
export interface FactionRelationship {
  id: string; // Composite ID of both faction IDs
  factionId1: string;
  factionId2: string;
  attitude: number; // -100 to 100 (hostile to friendly)
  status: 'allied' | 'neutral' | 'hostile';
  treaties: FactionTreaty[];
  disputes: FactionDispute[];
  history: FactionRelationshipEvent[];
}

/**
 * Represents a treaty between factions
 */
export interface FactionTreaty {
  id: string;
  type: 'peace' | 'alliance' | 'trade' | 'mutual_defense' | 'non_aggression' | string;
  title: string;
  description: string;
  terms: string;
  startDate: number; // Timestamp
  endDate?: number; // Timestamp, undefined = indefinite
  active: boolean;
}

/**
 * Represents a dispute between factions
 */
export interface FactionDispute {
  id: string;
  type: 'territory' | 'resource' | 'ideology' | 'historical' | string;
  title: string;
  description: string;
  severity: number; // 1-10
  startDate: number; // Timestamp
  resolvedDate?: number; // Timestamp if resolved
  resolved: boolean;
}

/**
 * Records an event in the history of a relationship
 */
export interface FactionRelationshipEvent {
  timestamp: number;
  event: string;
  attitudeChange: number;
}

/**
 * Represents a territory controlled by a faction
 */
export interface Territory {
  id: string;
  name: string;
  description: string;
  type: 'city' | 'fortress' | 'village' | 'wilderness' | 'dungeon' | string;
  controlLevel: number; // 0-100
  strategic_value: number; // 1-10
  economic_value: number; // 1-10
  resources: string[]; // IDs of resources in this territory
  neighbors: string[]; // IDs of adjacent territories
  position?: {
    x: number;
    y: number;
  };
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Represents a resource controlled by a faction
 */
export interface Resource {
  id: string;
  name: string;
  description: string;
  type: 'gold' | 'food' | 'lumber' | 'ore' | 'magic' | 'luxury' | string;
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
  quantity: number;
  value_per_unit: number;
  territory_id?: string; // ID of territory where resource is located
  metadata?: {
    [key: string]: any;
  };
} 