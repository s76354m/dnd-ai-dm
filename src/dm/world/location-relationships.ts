/**
 * Location Relationships System
 * 
 * This module manages the relationships between locations in the game world,
 * including hierarchical relationships (contains/within), physical connections,
 * visibility relationships, and travel requirements.
 */

import { Location } from '../../core/interfaces/location';
import { GameState } from '../../core/interfaces/game';
import { Character } from '../../core/interfaces/character';

/**
 * Types of relationships between locations
 */
export enum LocationRelationshipType {
  // Hierarchical relationships
  CONTAINS = 'contains',       // Parent location contains child (tavern contains rooms)
  WITHIN = 'within',           // Child location is within parent (room within tavern)
  
  // Physical connections
  CONNECTS = 'connects',       // Direct connection (door, path, road)
  NEARBY = 'nearby',           // Close but requires travel (neighboring buildings)
  
  // Perceptual relationships
  VISIBLE_FROM = 'visibleFrom', // Can be seen from another location (mountain from valley)
  
  // Special connections
  SECRET = 'secret',           // Hidden connection (secret door, hidden path)
  MAGICAL = 'magical',         // Magical connection (portal, teleportation circle)
  TEMPORARY = 'temporary'      // Temporary connection (drawbridge, seasonal path)
}

/**
 * Travel difficulty levels for moving between locations
 */
export enum TravelDifficulty {
  TRIVIAL = 'trivial',         // No challenge at all (walking to next room)
  EASY = 'easy',               // Simple travel (walking down a road)
  MODERATE = 'moderate',       // Some effort (hiking up a hill)
  CHALLENGING = 'challenging', // Difficult travel (climbing a steep slope)
  HARD = 'hard',               // Very difficult (scaling a cliff)
  EXTREME = 'extreme',         // Nearly impossible (crossing a lava field)
  IMPOSSIBLE = 'impossible'    // Cannot be traversed without special means
}

/**
 * Requirement for traveling between locations
 */
export interface TravelRequirement {
  type: 'item' | 'ability' | 'skill' | 'spell' | 'time' | 'quest' | 'state' | 'other';
  description: string;
  value?: string | number;    // Item ID, minimum ability score, etc.
  checkType?: 'possession' | 'check' | 'consumption';
  difficulty?: number;        // DC for skill checks
}

/**
 * Relationship between two locations
 */
export interface LocationRelationship {
  id: string;                 // Unique identifier for this relationship
  fromId: string;             // Source location ID
  toId: string;               // Destination location ID
  type: LocationRelationshipType;
  bidirectional: boolean;     // Whether relationship applies in both directions
  description: string;        // Description of the relationship
  travelTime?: number;        // Time in minutes to travel (if applicable)
  travelDifficulty?: TravelDifficulty;
  requirements?: TravelRequirement[];
  discovered: boolean;        // Whether players have discovered this relationship
  name?: string;              // Optional name for the connection (e.g., "North Door")
  tags?: string[];            // Tags for categorizing relationships
  metadata?: Record<string, any>; // Additional arbitrary data
}

/**
 * Result of a travel possibility check
 */
export interface TravelPossibilityResult {
  canTravel: boolean;
  blockedBy?: TravelRequirement[];
  difficulty?: TravelDifficulty;
  estimatedTime?: number;     // Estimated time in minutes
  description: string;        // Description of why travel is possible/impossible
}

/**
 * Options for the location relationships manager
 */
export interface LocationRelationshipsOptions {
  enforceConsistency: boolean; // Automatically create reciprocal relationships
  trackDiscovery: boolean;     // Track which relationships players have discovered
  logChanges: boolean;         // Log relationship changes to console
}

/**
 * Default options for the location relationships manager
 */
const DEFAULT_OPTIONS: LocationRelationshipsOptions = {
  enforceConsistency: true,
  trackDiscovery: true,
  logChanges: false
};

/**
 * Manager for location relationships
 */
export class LocationRelationshipManager {
  private relationships: Map<string, LocationRelationship> = new Map();
  private locationRelationshipIndex: Map<string, Set<string>> = new Map();
  private options: LocationRelationshipsOptions;
  
  /**
   * Create a new location relationship manager
   * 
   * @param options Configuration options
   */
  constructor(options: Partial<LocationRelationshipsOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Add a relationship between two locations
   * 
   * @param relationship The relationship to add
   * @returns The added relationship
   */
  public addRelationship(relationship: Omit<LocationRelationship, 'id'>): LocationRelationship {
    // Generate a unique ID if not provided
    const id = `rel_${relationship.fromId}_${relationship.toId}_${Date.now()}`;
    const newRelationship: LocationRelationship = {
      id,
      discovered: false, // Default to undiscovered
      ...relationship
    };
    
    // Add to relationships map
    this.relationships.set(id, newRelationship);
    
    // Update indices
    this.addToIndex(relationship.fromId, id);
    this.addToIndex(relationship.toId, id);
    
    // Create reciprocal relationship if needed
    if (this.options.enforceConsistency && relationship.bidirectional) {
      this.createReciprocalRelationship(newRelationship);
    }
    
    // Log change if enabled
    if (this.options.logChanges) {
      console.log(`Added relationship: ${relationship.fromId} ${relationship.type} ${relationship.toId}`);
    }
    
    return newRelationship;
  }
  
  /**
   * Create the reciprocal relationship for a bidirectional relationship
   * 
   * @param relationship The source relationship
   */
  private createReciprocalRelationship(relationship: LocationRelationship): void {
    // Skip if not bidirectional
    if (!relationship.bidirectional) return;
    
    // Get the inverse relationship type
    const inverseType = this.getInverseRelationshipType(relationship.type);
    
    // Check if reciprocal relationship already exists
    const existingRelationships = this.getRelationships(relationship.toId);
    const reciprocalExists = existingRelationships.some(rel => 
      rel.toId === relationship.fromId && rel.type === inverseType
    );
    
    // Only create if it doesn't exist
    if (!reciprocalExists) {
      const reciprocalId = `rel_${relationship.toId}_${relationship.fromId}_${Date.now()}`;
      
      const reciprocal: LocationRelationship = {
        id: reciprocalId,
        fromId: relationship.toId,
        toId: relationship.fromId,
        type: inverseType,
        bidirectional: relationship.bidirectional,
        description: this.createReciprocalDescription(relationship.description, relationship.type),
        travelTime: relationship.travelTime,
        travelDifficulty: relationship.travelDifficulty,
        requirements: relationship.requirements ? [...relationship.requirements] : undefined,
        discovered: relationship.discovered,
        name: relationship.name ? `Return to ${relationship.name}` : undefined,
        tags: relationship.tags ? [...relationship.tags] : undefined
      };
      
      // Add to relationships map but skip recursive reciprocal creation
      this.relationships.set(reciprocalId, reciprocal);
      
      // Update indices
      this.addToIndex(reciprocal.fromId, reciprocalId);
      this.addToIndex(reciprocal.toId, reciprocalId);
      
      // Log change if enabled
      if (this.options.logChanges) {
        console.log(`Added reciprocal relationship: ${reciprocal.fromId} ${reciprocal.type} ${reciprocal.toId}`);
      }
    }
  }
  
  /**
   * Get the inverse of a relationship type
   * 
   * @param type The relationship type to invert
   * @returns The inverse relationship type
   */
  private getInverseRelationshipType(type: LocationRelationshipType): LocationRelationshipType {
    switch (type) {
      case LocationRelationshipType.CONTAINS:
        return LocationRelationshipType.WITHIN;
      case LocationRelationshipType.WITHIN:
        return LocationRelationshipType.CONTAINS;
      case LocationRelationshipType.VISIBLE_FROM:
        return LocationRelationshipType.VISIBLE_FROM;
      default:
        return type; // Most types are self-reciprocal
    }
  }
  
  /**
   * Create a description for the reciprocal relationship
   * 
   * @param originalDescription The original description
   * @param originalType The original relationship type
   * @returns A description for the reciprocal relationship
   */
  private createReciprocalDescription(
    originalDescription: string,
    originalType: LocationRelationshipType
  ): string {
    // Simple replacements for common patterns
    let description = originalDescription
      .replace('leads to', 'comes from')
      .replace('connects to', 'connects from')
      .replace('visible from', 'can see');
    
    // Special handling for containment relationships
    if (originalType === LocationRelationshipType.CONTAINS) {
      description = `Located within the area described as: ${originalDescription}`;
    } else if (originalType === LocationRelationshipType.WITHIN) {
      description = `Contains the area described as: ${originalDescription}`;
    }
    
    return description;
  }
  
  /**
   * Update the location relationship index
   * 
   * @param locationId The location ID
   * @param relationshipId The relationship ID
   */
  private addToIndex(locationId: string, relationshipId: string): void {
    if (!this.locationRelationshipIndex.has(locationId)) {
      this.locationRelationshipIndex.set(locationId, new Set());
    }
    
    this.locationRelationshipIndex.get(locationId)!.add(relationshipId);
  }
  
  /**
   * Remove a relationship from the index
   * 
   * @param locationId The location ID
   * @param relationshipId The relationship ID
   */
  private removeFromIndex(locationId: string, relationshipId: string): void {
    const relationships = this.locationRelationshipIndex.get(locationId);
    if (relationships) {
      relationships.delete(relationshipId);
      
      // Clean up empty sets
      if (relationships.size === 0) {
        this.locationRelationshipIndex.delete(locationId);
      }
    }
  }
  
  /**
   * Update an existing relationship
   * 
   * @param id The relationship ID
   * @param updates The updates to apply
   * @returns The updated relationship or null if not found
   */
  public updateRelationship(
    id: string,
    updates: Partial<Omit<LocationRelationship, 'id' | 'fromId' | 'toId'>>
  ): LocationRelationship | null {
    const relationship = this.relationships.get(id);
    if (!relationship) return null;
    
    // Apply updates
    const updatedRelationship: LocationRelationship = {
      ...relationship,
      ...updates
    };
    
    // Update in map
    this.relationships.set(id, updatedRelationship);
    
    // Log change if enabled
    if (this.options.logChanges) {
      console.log(`Updated relationship: ${id}`);
    }
    
    return updatedRelationship;
  }
  
  /**
   * Remove a relationship
   * 
   * @param id The relationship ID
   * @returns True if the relationship was removed
   */
  public removeRelationship(id: string): boolean {
    const relationship = this.relationships.get(id);
    if (!relationship) return false;
    
    // Remove from maps
    this.relationships.delete(id);
    this.removeFromIndex(relationship.fromId, id);
    this.removeFromIndex(relationship.toId, id);
    
    // Log change if enabled
    if (this.options.logChanges) {
      console.log(`Removed relationship: ${id}`);
    }
    
    return true;
  }
  
  /**
   * Mark a relationship as discovered
   * 
   * @param id The relationship ID
   * @returns True if the relationship was updated
   */
  public discoverRelationship(id: string): boolean {
    const relationship = this.relationships.get(id);
    if (!relationship) return false;
    
    // Update the relationship
    relationship.discovered = true;
    
    // If bidirectional, also discover the reciprocal
    if (relationship.bidirectional) {
      this.getRelationships(relationship.toId).forEach(rel => {
        if (rel.toId === relationship.fromId) {
          rel.discovered = true;
        }
      });
    }
    
    // Log change if enabled
    if (this.options.logChanges) {
      console.log(`Discovered relationship: ${id}`);
    }
    
    return true;
  }
  
  /**
   * Get all relationships for a location
   * 
   * @param locationId The location ID
   * @param discoveredOnly Whether to only return discovered relationships
   * @returns Array of relationships
   */
  public getRelationships(locationId: string, discoveredOnly: boolean = false): LocationRelationship[] {
    const relationshipIds = this.locationRelationshipIndex.get(locationId) || new Set();
    
    // Convert to array of relationship objects
    const relationships = Array.from(relationshipIds)
      .map(id => this.relationships.get(id))
      .filter((rel): rel is LocationRelationship => !!rel && (
        !discoveredOnly || rel.discovered
      ));
    
    return relationships;
  }
  
  /**
   * Get outgoing relationships (where the location is the source)
   * 
   * @param locationId The location ID
   * @param discoveredOnly Whether to only return discovered relationships
   * @returns Array of relationships
   */
  public getOutgoingRelationships(locationId: string, discoveredOnly: boolean = false): LocationRelationship[] {
    return this.getRelationships(locationId, discoveredOnly)
      .filter(rel => rel.fromId === locationId);
  }
  
  /**
   * Get incoming relationships (where the location is the destination)
   * 
   * @param locationId The location ID
   * @param discoveredOnly Whether to only return discovered relationships
   * @returns Array of relationships
   */
  public getIncomingRelationships(locationId: string, discoveredOnly: boolean = false): LocationRelationship[] {
    return this.getRelationships(locationId, discoveredOnly)
      .filter(rel => rel.toId === locationId);
  }
  
  /**
   * Get relationships of a specific type
   * 
   * @param locationId The location ID
   * @param type The relationship type to filter by
   * @param discoveredOnly Whether to only return discovered relationships
   * @returns Array of relationships
   */
  public getRelationshipsByType(
    locationId: string, 
    type: LocationRelationshipType,
    discoveredOnly: boolean = false
  ): LocationRelationship[] {
    return this.getRelationships(locationId, discoveredOnly)
      .filter(rel => rel.type === type);
  }
  
  /**
   * Check if a direct relationship exists between two locations
   * 
   * @param fromId The source location ID
   * @param toId The destination location ID
   * @param discoveredOnly Whether to only check discovered relationships
   * @returns True if a relationship exists
   */
  public hasRelationship(fromId: string, toId: string, discoveredOnly: boolean = false): boolean {
    const relationships = this.getOutgoingRelationships(fromId, discoveredOnly);
    return relationships.some(rel => rel.toId === toId);
  }
  
  /**
   * Find connected locations (one step away)
   * 
   * @param locationId The source location ID
   * @param discoveredOnly Whether to only include discovered connections
   * @returns Array of connected location IDs
   */
  public getConnectedLocations(locationId: string, discoveredOnly: boolean = false): string[] {
    const outgoing = this.getOutgoingRelationships(locationId, discoveredOnly);
    return outgoing.map(rel => rel.toId);
  }
  
  /**
   * Find the path between two locations
   * 
   * @param fromId The source location ID
   * @param toId The destination location ID
   * @param discoveredOnly Whether to only use discovered relationships
   * @returns Array of relationships forming a path, or null if no path exists
   */
  public findPath(fromId: string, toId: string, discoveredOnly: boolean = false): LocationRelationship[] | null {
    // Early exit if locations are the same
    if (fromId === toId) return [];
    
    // Breadth-first search implementation
    const queue: {locationId: string, path: LocationRelationship[]}[] = [
      {locationId: fromId, path: []}
    ];
    const visited = new Set<string>([fromId]);
    
    while (queue.length > 0) {
      const {locationId, path} = queue.shift()!;
      
      // Get all outgoing relationships
      const relationships = this.getOutgoingRelationships(locationId, discoveredOnly);
      
      for (const relationship of relationships) {
        const nextLocation = relationship.toId;
        
        // Skip if already visited
        if (visited.has(nextLocation)) continue;
        
        // Create new path with this relationship
        const newPath = [...path, relationship];
        
        // Check if we've reached the destination
        if (nextLocation === toId) {
          return newPath;
        }
        
        // Otherwise, add to queue and mark as visited
        queue.push({locationId: nextLocation, path: newPath});
        visited.add(nextLocation);
      }
    }
    
    // No path found
    return null;
  }
  
  /**
   * Check if travel is possible between two locations
   * 
   * @param fromId The source location ID
   * @param toId The destination location ID
   * @param character The character attempting travel
   * @param gameState Current game state
   * @returns Result indicating travel possibility
   */
  public checkTravelPossibility(
    fromId: string,
    toId: string,
    character: Character,
    gameState: GameState
  ): TravelPossibilityResult {
    // Get direct relationships
    const directRelationships = this.getOutgoingRelationships(fromId)
      .filter(rel => rel.toId === toId);
    
    // If no direct relationship exists
    if (directRelationships.length === 0) {
      return {
        canTravel: false,
        description: `There is no known direct path from ${fromId} to ${toId}.`
      };
    }
    
    // Find the easiest relationship to traverse
    directRelationships.sort((a, b) => {
      // Compare by difficulty first
      const diffA = this.getDifficultyValue(a.travelDifficulty);
      const diffB = this.getDifficultyValue(b.travelDifficulty);
      
      if (diffA !== diffB) return diffA - diffB;
      
      // Then by travel time
      const timeA = a.travelTime || 0;
      const timeB = b.travelTime || 0;
      
      return timeA - timeB;
    });
    
    // Check the easiest path
    const easiestPath = directRelationships[0];
    
    // Check requirements
    if (easiestPath.requirements && easiestPath.requirements.length > 0) {
      const blockedBy = this.checkRequirements(easiestPath.requirements, character, gameState);
      
      if (blockedBy.length > 0) {
        return {
          canTravel: false,
          blockedBy,
          difficulty: easiestPath.travelDifficulty,
          estimatedTime: easiestPath.travelTime,
          description: `Travel is blocked because: ${blockedBy.map(req => req.description).join(', ')}`
        };
      }
    }
    
    // Travel is possible
    return {
      canTravel: true,
      difficulty: easiestPath.travelDifficulty,
      estimatedTime: easiestPath.travelTime,
      description: `Travel is possible via ${easiestPath.description}`
    };
  }
  
  /**
   * Check if a character meets all requirements
   * 
   * @param requirements The requirements to check
   * @param character The character to check against
   * @param gameState Current game state
   * @returns Array of requirements that are not met
   */
  private checkRequirements(
    requirements: TravelRequirement[],
    character: Character,
    gameState: GameState
  ): TravelRequirement[] {
    const unmetRequirements: TravelRequirement[] = [];
    
    for (const requirement of requirements) {
      switch (requirement.type) {
        case 'item':
          // Check if character has the item
          if (!this.hasItem(character, requirement.value as string)) {
            unmetRequirements.push(requirement);
          }
          break;
          
        case 'ability':
          // Check ability score
          if (!this.meetsAbilityRequirement(character, requirement)) {
            unmetRequirements.push(requirement);
          }
          break;
          
        case 'skill':
          // Skill check would be performed during travel, not a blocker
          break;
          
        case 'quest':
          // Check quest completion
          if (!this.hasCompletedQuest(gameState, requirement.value as string)) {
            unmetRequirements.push(requirement);
          }
          break;
          
        case 'state':
          // Check for specific game state
          if (!this.meetsStateRequirement(gameState, requirement)) {
            unmetRequirements.push(requirement);
          }
          break;
          
        default:
          // For other requirement types, assume they're not met
          unmetRequirements.push(requirement);
          break;
      }
    }
    
    return unmetRequirements;
  }
  
  /**
   * Check if a character has an item
   * 
   * @param character The character to check
   * @param itemId The item ID to look for
   * @returns True if the character has the item
   */
  private hasItem(character: Character, itemId: string): boolean {
    // This is a simplified implementation - replace with actual inventory check
    return character.inventory?.items?.some(item => item.id === itemId) || false;
  }
  
  /**
   * Check if a character meets an ability score requirement
   * 
   * @param character The character to check
   * @param requirement The ability requirement
   * @returns True if the character meets the requirement
   */
  private meetsAbilityRequirement(character: Character, requirement: TravelRequirement): boolean {
    // This is a simplified implementation - replace with actual ability check
    const [ability, scoreStr] = (requirement.value as string).split(':');
    const requiredScore = parseInt(scoreStr, 10);
    
    if (isNaN(requiredScore)) return false;
    
    // Check the ability score
    return (character.abilities as any)[ability] >= requiredScore;
  }
  
  /**
   * Check if a quest has been completed
   * 
   * @param gameState Current game state
   * @param questId The quest ID to check
   * @returns True if the quest is completed
   */
  private hasCompletedQuest(gameState: GameState, questId: string): boolean {
    // This is a simplified implementation - replace with actual quest check
    return gameState.quests?.some(q => q.id === questId && q.status === 'completed') || false;
  }
  
  /**
   * Check if a game state requirement is met
   * 
   * @param gameState Current game state
   * @param requirement The state requirement
   * @returns True if the requirement is met
   */
  private meetsStateRequirement(gameState: GameState, requirement: TravelRequirement): boolean {
    // This is a simplified implementation - replace with actual state check
    const [key, value] = (requirement.value as string).split(':');
    
    // Try to find the value in the game state
    // This uses a simplified dot notation for nested properties
    const parts = key.split('.');
    let current: any = gameState;
    
    for (const part of parts) {
      if (current === undefined || current === null) return false;
      current = current[part];
    }
    
    // Compare the value
    return current?.toString() === value;
  }
  
  /**
   * Convert difficulty to a numeric value for comparison
   * 
   * @param difficulty The difficulty level
   * @returns Numeric value
   */
  private getDifficultyValue(difficulty?: TravelDifficulty): number {
    if (!difficulty) return 0;
    
    switch (difficulty) {
      case TravelDifficulty.TRIVIAL: return 0;
      case TravelDifficulty.EASY: return 1;
      case TravelDifficulty.MODERATE: return 2;
      case TravelDifficulty.CHALLENGING: return 3;
      case TravelDifficulty.HARD: return 4;
      case TravelDifficulty.EXTREME: return 5;
      case TravelDifficulty.IMPOSSIBLE: return 6;
      default: return 0;
    }
  }
  
  /**
   * Generate a description of the path between two locations
   * 
   * @param fromId The source location ID
   * @param toId The destination location ID
   * @param discoveredOnly Whether to only use discovered paths
   * @returns Description of the path or null if no path exists
   */
  public generatePathDescription(fromId: string, toId: string, discoveredOnly: boolean = false): string | null {
    const path = this.findPath(fromId, toId, discoveredOnly);
    if (!path) return null;
    
    // Generate a description
    if (path.length === 0) {
      return "You're already there.";
    } else if (path.length === 1) {
      return path[0].description;
    } else {
      let description = "The path leads you ";
      
      for (let i = 0; i < path.length; i++) {
        if (i > 0) {
          description += i === path.length - 1 ? " and finally " : ", then ";
        }
        description += path[i].description;
      }
      
      return description;
    }
  }
  
  /**
   * Build a hierarchical location tree
   * 
   * @param rootId The root location ID
   * @param discoveredOnly Whether to only include discovered relationships
   * @returns Tree structure of locations
   */
  public buildLocationHierarchy(rootId: string, discoveredOnly: boolean = false): any {
    // Get all 'contains' relationships from this location
    const containsRelationships = this.getRelationshipsByType(
      rootId, 
      LocationRelationshipType.CONTAINS,
      discoveredOnly
    );
    
    // Build the tree
    const children: any[] = [];
    
    for (const rel of containsRelationships) {
      children.push({
        id: rel.toId,
        relationship: rel,
        children: this.buildLocationHierarchy(rel.toId, discoveredOnly)
      });
    }
    
    return children;
  }
  
  /**
   * Get all relationships in the system
   * 
   * @returns Array of all relationships
   */
  public getAllRelationships(): LocationRelationship[] {
    return Array.from(this.relationships.values());
  }
  
  /**
   * Clear all relationships
   */
  public clearAllRelationships(): void {
    this.relationships.clear();
    this.locationRelationshipIndex.clear();
    
    // Log change if enabled
    if (this.options.logChanges) {
      console.log("Cleared all location relationships");
    }
  }
}

export default LocationRelationshipManager; 