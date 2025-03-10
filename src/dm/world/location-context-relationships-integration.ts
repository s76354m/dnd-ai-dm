/**
 * Location Context and Relationships Integration
 * 
 * This module integrates the Location Context Manager with the Location Relationships
 * System to provide enhanced location interactions and travel mechanics.
 */

import { LocationContext } from '../context/location-context';
import LocationRelationshipManager, { 
  LocationRelationship, 
  LocationRelationshipType,
  TravelDifficulty,
  TravelPossibilityResult
} from './location-relationships';
import { Location } from '../../core/interfaces/location';
import { GameState } from '../../core/interfaces/game';
import { Character } from '../../core/interfaces/character';

/**
 * Options for the integrated location system
 */
export interface LocationIntegrationOptions {
  enhanceLocationDescriptions: boolean;
  trackTravelHistory: boolean;
  generateTravelNarration: boolean;
  automaticRelationshipDiscovery: boolean;
  discoverNearbyOnVisit: boolean;
  maxTravelDistance: number; // Maximum travel distance for automatic pathfinding
}

/**
 * Default options for the integrated location system
 */
const DEFAULT_INTEGRATION_OPTIONS: LocationIntegrationOptions = {
  enhanceLocationDescriptions: true,
  trackTravelHistory: true,
  generateTravelNarration: true,
  automaticRelationshipDiscovery: true,
  discoverNearbyOnVisit: true,
  maxTravelDistance: 5 // Maximum number of steps for pathfinding
};

/**
 * Travel history entry for tracking player movement between locations
 */
export interface TravelHistoryEntry {
  fromId: string;
  toId: string;
  timestamp: Date;
  relationshipId: string;
  travelTime: number; // In minutes
  narrative: string;
  discoveries: string[];
}

/**
 * Enhanced location information combining context and relationships
 */
export interface EnhancedLocationInfo {
  location: Location;
  knownExits: LocationRelationship[];
  visitCount: number;
  lastVisited: Date | null;
  containedLocations: string[];
  visibleLocations: string[];
  connectedLocations: string[];
  description: string;
  travelHistory: TravelHistoryEntry[];
}

/**
 * Integrated location system combining context and relationships
 */
export class LocationSystem {
  private locationContext: LocationContext;
  private relationshipManager: LocationRelationshipManager;
  private travelHistory: TravelHistoryEntry[] = [];
  private options: LocationIntegrationOptions;
  
  /**
   * Create a new integrated location system
   * 
   * @param locationContext The location context manager
   * @param relationshipManager The location relationship manager
   * @param options Configuration options
   */
  constructor(
    locationContext: LocationContext,
    relationshipManager: LocationRelationshipManager,
    options: Partial<LocationIntegrationOptions> = {}
  ) {
    this.locationContext = locationContext;
    this.relationshipManager = relationshipManager;
    this.options = { ...DEFAULT_INTEGRATION_OPTIONS, ...options };
  }
  
  /**
   * Get the location context manager
   */
  public getLocationContext(): LocationContext {
    return this.locationContext;
  }
  
  /**
   * Get the location relationship manager
   */
  public getRelationshipManager(): LocationRelationshipManager {
    return this.relationshipManager;
  }
  
  /**
   * Get enhanced information about a location
   * 
   * @param locationId The location ID
   * @param gameState Current game state
   * @param discoveredOnly Whether to only include discovered relationships
   * @returns Enhanced location information
   */
  public getEnhancedLocationInfo(
    locationId: string,
    gameState: GameState,
    discoveredOnly: boolean = true
  ): EnhancedLocationInfo | null {
    // Get the location from game state
    const location = this.findLocation(locationId, gameState);
    if (!location) return null;
    
    // Get relationships
    const outgoing = this.relationshipManager.getOutgoingRelationships(locationId, discoveredOnly);
    
    // Group by type
    const knownExits = outgoing.filter(rel => 
      rel.type === LocationRelationshipType.CONNECTS || 
      rel.type === LocationRelationshipType.NEARBY
    );
    
    const containedLocations = outgoing
      .filter(rel => rel.type === LocationRelationshipType.CONTAINS)
      .map(rel => rel.toId);
    
    const visibleLocations = outgoing
      .filter(rel => rel.type === LocationRelationshipType.VISIBLE_FROM)
      .map(rel => rel.toId);
    
    const connectedLocations = outgoing
      .filter(rel => rel.type !== LocationRelationshipType.VISIBLE_FROM)
      .map(rel => rel.toId);
    
    // Get visit history from context
    const visitCount = this.locationContext.getVisitCount(locationId);
    const lastVisited = this.locationContext.getLastVisitTime(locationId);
    
    // Get relevant travel history
    const travelHistory = this.travelHistory.filter(
      entry => entry.toId === locationId || entry.fromId === locationId
    );
    
    // Combine data
    return {
      location,
      knownExits,
      visitCount,
      lastVisited,
      containedLocations,
      visibleLocations,
      connectedLocations,
      description: location.description,
      travelHistory
    };
  }
  
  /**
   * Find a location in the game state
   * 
   * @param locationId The location ID
   * @param gameState Current game state
   * @returns The location or null if not found
   */
  private findLocation(locationId: string, gameState: GameState): Location | null {
    if (gameState.currentLocation?.id === locationId) {
      return gameState.currentLocation;
    }
    
    if (gameState.locations) {
      // Check if locations is a Map
      if (gameState.locations instanceof Map) {
        return gameState.locations.get(locationId) || null;
      }
      
      // Check if locations is an array
      if (Array.isArray(gameState.locations)) {
        return gameState.locations.find(loc => loc.id === locationId) || null;
      }
      
      // Check if locations is an object with keys
      if (typeof gameState.locations === 'object') {
        return (gameState.locations as Record<string, Location>)[locationId] || null;
      }
    }
    
    return null;
  }
  
  /**
   * Record a player's visit to a location
   * 
   * @param location The location being visited
   * @param gameState Current game state
   * @param fromLocationId Optional previous location ID
   * @returns True if the visit was recorded
   */
  public recordLocationVisit(
    location: Location,
    gameState: GameState,
    fromLocationId?: string
  ): boolean {
    // Record the visit in the context manager
    const recorded = this.locationContext.addLocationVisit(location, gameState);
    
    // If we have a previous location and tracking is enabled, record the travel
    if (fromLocationId && this.options.trackTravelHistory) {
      this.recordTravel(fromLocationId, location.id, gameState);
    }
    
    // Auto-discover relationships if enabled
    if (this.options.automaticRelationshipDiscovery) {
      this.discoverLocationRelationships(location.id, gameState);
    }
    
    return recorded;
  }
  
  /**
   * Discover relationships for a location
   * 
   * @param locationId The location ID
   * @param gameState Current game state
   */
  private discoverLocationRelationships(locationId: string, gameState: GameState): void {
    // Auto-discover outgoing relationships
    const outgoing = this.relationshipManager.getOutgoingRelationships(locationId, false);
    
    for (const relationship of outgoing) {
      // Skip already discovered relationships
      if (relationship.discovered) continue;
      
      // Auto-discover based on relationship type
      switch (relationship.type) {
        case LocationRelationshipType.CONTAINS:
        case LocationRelationshipType.WITHIN:
          // Always discover hierarchical relationships
          this.relationshipManager.discoverRelationship(relationship.id);
          break;
          
        case LocationRelationshipType.CONNECTS:
          // Always discover direct connections
          this.relationshipManager.discoverRelationship(relationship.id);
          break;
          
        case LocationRelationshipType.VISIBLE_FROM:
          // Always discover visible locations
          this.relationshipManager.discoverRelationship(relationship.id);
          break;
          
        case LocationRelationshipType.NEARBY:
          // Discover nearby locations if the option is enabled
          if (this.options.discoverNearbyOnVisit) {
            this.relationshipManager.discoverRelationship(relationship.id);
          }
          break;
          
        case LocationRelationshipType.SECRET:
          // Secret connections are not auto-discovered
          break;
          
        default:
          // Default is not to auto-discover
          break;
      }
    }
  }
  
  /**
   * Record travel between locations
   * 
   * @param fromId The source location ID
   * @param toId The destination location ID
   * @param gameState Current game state
   * @param narrative Optional travel narrative
   * @returns True if travel was recorded
   */
  private recordTravel(
    fromId: string,
    toId: string,
    gameState: GameState,
    narrative: string = ""
  ): boolean {
    // Find the relationship used for travel
    const relationships = this.relationshipManager.getOutgoingRelationships(fromId)
      .filter(rel => rel.toId === toId);
    
    if (relationships.length === 0) {
      console.warn(`No relationship found for travel from ${fromId} to ${toId}`);
      return false;
    }
    
    // Use the easiest relationship
    const relationship = relationships[0];
    
    // Mark the relationship as discovered
    this.relationshipManager.discoverRelationship(relationship.id);
    
    // Create travel history entry
    const entry: TravelHistoryEntry = {
      fromId,
      toId,
      timestamp: new Date(),
      relationshipId: relationship.id,
      travelTime: relationship.travelTime || 0,
      narrative: narrative || `Traveled from ${fromId} to ${toId} via ${relationship.description}`,
      discoveries: []
    };
    
    // Add to travel history
    this.travelHistory.push(entry);
    
    // Limit history size if needed
    if (this.travelHistory.length > 100) {
      this.travelHistory = this.travelHistory.slice(-100);
    }
    
    return true;
  }
  
  /**
   * Check if travel is possible between two locations
   * 
   * @param fromId The source location ID
   * @param toId The destination location ID
   * @param character The character attempting travel
   * @param gameState Current game state
   * @returns Result of the travel possibility check
   */
  public checkTravelPossibility(
    fromId: string,
    toId: string,
    character: Character,
    gameState: GameState
  ): TravelPossibilityResult {
    return this.relationshipManager.checkTravelPossibility(fromId, toId, character, gameState);
  }
  
  /**
   * Generate an enhanced location description
   * 
   * @param locationId The location ID
   * @param gameState Current game state
   * @param includeExits Whether to include exit descriptions
   * @param includeHistory Whether to include visit history
   * @returns Enhanced description
   */
  public generateEnhancedDescription(
    locationId: string,
    gameState: GameState,
    includeExits: boolean = true,
    includeHistory: boolean = true
  ): string {
    // Get location info
    const info = this.getEnhancedLocationInfo(locationId, gameState);
    if (!info) return "Location not found.";
    
    // Start with the base description
    let description = info.location.description;
    
    // Add context from the location context
    const contextString = this.locationContext.buildLocationContext(locationId, gameState);
    
    // Add known exits if requested
    if (includeExits && info.knownExits.length > 0) {
      description += "\n\nExits:";
      
      for (const exit of info.knownExits) {
        const targetLocation = this.findLocation(exit.toId, gameState);
        const exitName = exit.name || targetLocation?.name || exit.toId;
        
        description += `\n- ${exitName}: ${exit.description}`;
        
        // Add difficulty if known
        if (exit.travelDifficulty) {
          description += ` (${exit.travelDifficulty} difficulty)`;
        }
      }
    }
    
    // Add visit history if requested
    if (includeHistory && info.visitCount > 0) {
      description += `\n\nYou have visited this location ${info.visitCount} time${info.visitCount !== 1 ? 's' : ''}.`;
      
      if (info.lastVisited) {
        const lastVisit = info.lastVisited;
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastVisit.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          description += " You were here earlier today.";
        } else if (diffDays === 1) {
          description += " You were here yesterday.";
        } else {
          description += ` Your last visit was ${diffDays} days ago.`;
        }
      }
    }
    
    // Include context information
    description += "\n\n" + contextString;
    
    return description;
  }
  
  /**
   * Get the travel history
   * 
   * @returns Array of travel history entries
   */
  public getTravelHistory(): TravelHistoryEntry[] {
    return [...this.travelHistory];
  }
  
  /**
   * Clear the travel history
   */
  public clearTravelHistory(): void {
    this.travelHistory = [];
  }
  
  /**
   * Generate a travel narrative between two locations
   * 
   * @param fromId The source location ID
   * @param toId The destination location ID
   * @param gameState Current game state
   * @param discoveredOnly Whether to only use discovered relationships
   * @returns Travel narrative or null if no path exists
   */
  public generateTravelNarrative(
    fromId: string,
    toId: string,
    gameState: GameState,
    discoveredOnly: boolean = true
  ): string | null {
    const path = this.relationshipManager.findPath(fromId, toId, discoveredOnly);
    if (!path) return null;
    
    if (path.length === 0) {
      return "You're already at your destination.";
    }
    
    // Generate a more detailed narrative
    let narrative = "You travel ";
    let totalTime = 0;
    
    for (let i = 0; i < path.length; i++) {
      const relationship = path[i];
      totalTime += relationship.travelTime || 0;
      
      if (i > 0) {
        narrative += i === path.length - 1 ? " and finally " : ", then ";
      }
      
      // Get source and destination locations
      const source = this.findLocation(relationship.fromId, gameState);
      const destination = this.findLocation(relationship.toId, gameState);
      
      if (source && destination) {
        narrative += `from ${source.name} to ${destination.name}`;
        
        if (relationship.description) {
          narrative += ` ${relationship.description}`;
        }
      } else {
        narrative += relationship.description;
      }
    }
    
    // Add time information
    if (totalTime > 0) {
      const hours = Math.floor(totalTime / 60);
      const minutes = totalTime % 60;
      
      narrative += ". The journey takes ";
      
      if (hours > 0) {
        narrative += `${hours} hour${hours !== 1 ? 's' : ''}`;
        if (minutes > 0) {
          narrative += ` and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
      } else {
        narrative += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
    }
    
    narrative += ".";
    
    return narrative;
  }
  
  /**
   * Create a connection between two locations
   * 
   * @param fromId The source location ID
   * @param toId The destination location ID
   * @param type The relationship type
   * @param description Description of the connection
   * @param bidirectional Whether the connection is bidirectional
   * @param options Additional options for the relationship
   * @returns The created relationship
   */
  public createConnection(
    fromId: string,
    toId: string,
    type: LocationRelationshipType,
    description: string,
    bidirectional: boolean = true,
    options: Partial<Omit<LocationRelationship, 'id' | 'fromId' | 'toId' | 'type' | 'bidirectional' | 'description'>> = {}
  ): LocationRelationship {
    return this.relationshipManager.addRelationship({
      fromId,
      toId,
      type,
      description,
      bidirectional,
      ...options
    });
  }
  
  /**
   * Handle player travel between locations
   * 
   * @param fromId The source location ID
   * @param toId The destination location ID
   * @param character The character traveling
   * @param gameState Current game state
   * @returns Success state and narrative
   */
  public handleTravel(
    fromId: string,
    toId: string,
    character: Character,
    gameState: GameState
  ): { success: boolean, narrative: string } {
    // Check if travel is possible
    const possibilityCheck = this.checkTravelPossibility(fromId, toId, character, gameState);
    
    if (!possibilityCheck.canTravel) {
      return {
        success: false,
        narrative: possibilityCheck.description
      };
    }
    
    // Get destination
    const destination = this.findLocation(toId, gameState);
    if (!destination) {
      return {
        success: false,
        narrative: "The destination location could not be found."
      };
    }
    
    // Get travel narrative
    let narrative: string;
    
    if (this.options.generateTravelNarration) {
      narrative = this.generateTravelNarrative(fromId, toId, gameState) || 
        `You travel from ${fromId} to ${destination.name}.`;
    } else {
      narrative = `You travel to ${destination.name}.`;
    }
    
    // Record the travel and location visit
    this.recordTravel(fromId, toId, gameState, narrative);
    this.recordLocationVisit(destination, gameState, fromId);
    
    return {
      success: true,
      narrative
    };
  }
}

export default LocationSystem; 