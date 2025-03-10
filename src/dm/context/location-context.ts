/**
 * Location Context Manager
 * 
 * Manages context for locations to provide rich, consistent descriptions and
 * maintain location history for narrative coherence.
 */

import { GameState } from '../../core/interfaces/game';
import { Location } from '../../core/interfaces/location';

/**
 * Represents a single visit to a location, storing contextual information
 */
export interface LocationVisit {
  timestamp: Date;
  additionalDetails: string[];
  playerActions: string[];
  discoveries: string[];
  npcsPresent: string[];
  environmentalChanges: string[];
}

/**
 * Configuration options for the location context manager
 */
export interface LocationContextConfig {
  maxLocationHistory: number;
  includeVisitHistory: boolean;
  includeNearbyLocations: boolean;
  includeNPCDetails: boolean;
  includeWeather: boolean;
  includeTimeOfDay: boolean;
  includePlayerHistory: boolean;
  maxDetailsPerLocation: number;
}

/**
 * Default configuration for the location context manager
 */
export const DEFAULT_LOCATION_CONFIG: LocationContextConfig = {
  maxLocationHistory: 5,
  includeVisitHistory: true,
  includeNearbyLocations: true,
  includeNPCDetails: true,
  includeWeather: true,
  includeTimeOfDay: true,
  includePlayerHistory: true,
  maxDetailsPerLocation: 10
};

/**
 * Location Context Manager
 * 
 * Tracks location visits and provides context for AI-generated location descriptions.
 */
export class LocationContext {
  private locationHistory: Map<string, LocationVisit[]> = new Map();
  private currentLocation?: Location;
  private config: LocationContextConfig;
  
  /**
   * Create a new location context manager
   * 
   * @param config Optional configuration overrides
   */
  constructor(config: Partial<LocationContextConfig> = {}) {
    this.config = { ...DEFAULT_LOCATION_CONFIG, ...config };
  }
  
  /**
   * Record a visit to a location
   * 
   * @param location The location being visited
   * @param gameState Current game state
   */
  public addLocationVisit(location: Location, gameState: GameState): void {
    // Store the current location
    this.currentLocation = location;
    
    // Initialize history array for this location if it doesn't exist
    if (!this.locationHistory.has(location.id)) {
      this.locationHistory.set(location.id, []);
    }
    
    // Create a new visit record
    const visit: LocationVisit = {
      timestamp: new Date(),
      additionalDetails: [],
      playerActions: [],
      discoveries: [],
      npcsPresent: this.extractNPCsPresent(gameState),
      environmentalChanges: []
    };
    
    // Get the history array for this location
    const locationVisits = this.locationHistory.get(location.id);
    
    // Add the new visit record
    locationVisits.push(visit);
    
    // Limit history size if needed
    if (locationVisits.length > this.config.maxLocationHistory) {
      // Keep only the most recent visits
      this.locationHistory.set(
        location.id,
        locationVisits.slice(-this.config.maxLocationHistory)
      );
    }
  }
  
  /**
   * Add additional details about a location that were discovered during a visit
   * 
   * @param locationId ID of the location to update
   * @param detail New detail discovered about the location
   */
  public addLocationDetail(locationId: string, detail: string): void {
    const locationVisits = this.locationHistory.get(locationId);
    
    if (locationVisits && locationVisits.length > 0) {
      const currentVisit = locationVisits[locationVisits.length - 1];
      
      // Add the detail if we haven't reached the maximum
      if (currentVisit.additionalDetails.length < this.config.maxDetailsPerLocation) {
        currentVisit.additionalDetails.push(detail);
      }
    }
  }
  
  /**
   * Record a player action performed at a location
   * 
   * @param locationId ID of the location where the action occurred
   * @param action Description of the player's action
   */
  public addPlayerAction(locationId: string, action: string): void {
    const locationVisits = this.locationHistory.get(locationId);
    
    if (locationVisits && locationVisits.length > 0) {
      const currentVisit = locationVisits[locationVisits.length - 1];
      currentVisit.playerActions.push(action);
    }
  }
  
  /**
   * Record an important discovery made at a location
   * 
   * @param locationId ID of the location where the discovery occurred
   * @param discovery Description of what was discovered
   */
  public addDiscovery(locationId: string, discovery: string): void {
    const locationVisits = this.locationHistory.get(locationId);
    
    if (locationVisits && locationVisits.length > 0) {
      const currentVisit = locationVisits[locationVisits.length - 1];
      currentVisit.discoveries.push(discovery);
    }
  }
  
  /**
   * Record an environmental change at a location
   * 
   * @param locationId ID of the location where the change occurred
   * @param change Description of the environmental change
   */
  public addEnvironmentalChange(locationId: string, change: string): void {
    const locationVisits = this.locationHistory.get(locationId);
    
    if (locationVisits && locationVisits.length > 0) {
      const currentVisit = locationVisits[locationVisits.length - 1];
      currentVisit.environmentalChanges.push(change);
    }
  }
  
  /**
   * Build a context string with relevant location information
   * 
   * @param locationId ID of the location to build context for
   * @param gameState Current game state
   * @returns A formatted context string
   */
  public buildLocationContext(locationId: string, gameState: GameState): string {
    // If no game state, return minimal context
    if (!gameState) {
      return "Location Context: Insufficient information available.";
    }
    
    // Find the location in the game state
    const location = this.findLocation(locationId, gameState);
    
    if (!location) {
      return `Location Context: No information found for location ID ${locationId}.`;
    }
    
    // Start building context
    const contextParts: string[] = [];
    
    // Add basic location information
    contextParts.push(`## Location Information`);
    contextParts.push(`Name: ${location.name}`);
    
    if (location.description) {
      contextParts.push(`Description: ${location.description}`);
    }
    
    if (location.type) {
      contextParts.push(`Type: ${location.type}`);
    }
    
    // Add environmental conditions if configured
    if (this.config.includeWeather && gameState.worldState?.currentWeather) {
      contextParts.push(`\n## Environmental Conditions`);
      contextParts.push(`Weather: ${gameState.worldState.currentWeather}`);
    }
    
    if (this.config.includeTimeOfDay && gameState.gameTime?.timeOfDay) {
      if (!this.config.includeWeather) {
        contextParts.push(`\n## Environmental Conditions`);
      }
      contextParts.push(`Time of Day: ${gameState.gameTime.timeOfDay}`);
    }
    
    // Add nearby locations if configured
    if (this.config.includeNearbyLocations) {
      const nearbyLocations = this.findNearbyLocations(locationId, gameState);
      
      if (nearbyLocations.length > 0) {
        contextParts.push(`\n## Nearby Locations`);
        nearbyLocations.forEach(loc => {
          contextParts.push(`- ${loc.name}${loc.distance ? ` (${loc.distance})` : ''}`);
        });
      }
    }
    
    // Add NPCs present if configured
    if (this.config.includeNPCDetails) {
      const npcsPresent = this.extractNPCsPresent(gameState);
      
      if (npcsPresent.length > 0) {
        contextParts.push(`\n## NPCs Present`);
        npcsPresent.forEach(npc => {
          contextParts.push(`- ${npc}`);
        });
      }
    }
    
    // Add visit history if configured
    if (this.config.includeVisitHistory) {
      const visits = this.locationHistory.get(locationId) || [];
      
      if (visits.length > 0) {
        contextParts.push(`\n## Visit History`);
        
        // Add the most recent visit details
        const recentVisit = visits[visits.length - 1];
        
        if (recentVisit.additionalDetails.length > 0) {
          contextParts.push(`\nKey Details:`);
          recentVisit.additionalDetails.forEach(detail => {
            contextParts.push(`- ${detail}`);
          });
        }
        
        if (recentVisit.discoveries.length > 0) {
          contextParts.push(`\nDiscoveries:`);
          recentVisit.discoveries.forEach(discovery => {
            contextParts.push(`- ${discovery}`);
          });
        }
        
        if (recentVisit.environmentalChanges.length > 0) {
          contextParts.push(`\nEnvironmental Changes:`);
          recentVisit.environmentalChanges.forEach(change => {
            contextParts.push(`- ${change}`);
          });
        }
        
        // Include prior visits if there are any
        if (visits.length > 1 && this.config.includePlayerHistory) {
          contextParts.push(`\nPrior Visits:`);
          
          // Iterate through visits from newest to oldest, skipping the most recent
          for (let i = visits.length - 2; i >= 0; i--) {
            const visit = visits[i];
            const visitDate = visit.timestamp.toISOString().split('T')[0];
            
            if (visit.playerActions.length > 0) {
              contextParts.push(`- Visit on ${visitDate}: ${visit.playerActions.join(', ')}`);
            } else {
              contextParts.push(`- Visited on ${visitDate}`);
            }
          }
        }
      }
    }
    
    return contextParts.join('\n');
  }
  
  /**
   * Generate a context string for transitioning between locations
   * 
   * @param fromId Source location ID
   * @param toId Destination location ID
   * @param gameState Current game state
   * @returns A formatted context string for the transition
   */
  public generateLocationTransitionContext(fromId: string, toId: string, gameState: GameState): string {
    // If no game state, return minimal context
    if (!gameState) {
      return "Location Transition: Insufficient information available.";
    }
    
    // Find the locations
    const fromLocation = this.findLocation(fromId, gameState);
    const toLocation = this.findLocation(toId, gameState);
    
    if (!fromLocation || !toLocation) {
      return "Location Transition: One or both locations not found.";
    }
    
    // Start building context
    const contextParts: string[] = [];
    
    contextParts.push(`## Location Transition`);
    contextParts.push(`From: ${fromLocation.name}`);
    contextParts.push(`To: ${toLocation.name}`);
    
    // Look for a direct connection between the locations
    const connection = this.findLocationConnection(fromId, toId, gameState);
    
    if (connection) {
      if (connection.description) {
        contextParts.push(`\n## Connection Details`);
        contextParts.push(connection.description);
      }
      
      if (connection.travelTime) {
        contextParts.push(`Travel Time: ${connection.travelTime}`);
      }
      
      if (connection.difficulty) {
        contextParts.push(`Difficulty: ${connection.difficulty}`);
      }
    }
    
    // Add information about prior visits to the destination
    const visits = this.locationHistory.get(toId) || [];
    
    if (visits.length > 0) {
      contextParts.push(`\n## Destination History`);
      contextParts.push(`Previously visited: ${visits.length} times`);
      
      const lastVisit = visits[visits.length - 1];
      
      if (lastVisit.discoveries.length > 0) {
        contextParts.push(`\nPrevious Discoveries:`);
        lastVisit.discoveries.forEach(discovery => {
          contextParts.push(`- ${discovery}`);
        });
      }
    } else {
      contextParts.push(`\n## Destination History`);
      contextParts.push(`This is the first visit to this location.`);
    }
    
    return contextParts.join('\n');
  }
  
  /**
   * Get the number of times a location has been visited
   * 
   * @param locationId Location ID to check
   * @returns Number of visits, or 0 if never visited
   */
  public getVisitCount(locationId: string): number {
    const visits = this.locationHistory.get(locationId);
    return visits ? visits.length : 0;
  }
  
  /**
   * Check if a location has been visited before
   * 
   * @param locationId Location ID to check
   * @returns True if location has been visited at least once
   */
  public hasVisited(locationId: string): boolean {
    return this.getVisitCount(locationId) > 0;
  }
  
  /**
   * Clear the visit history for a specific location
   * 
   * @param locationId Location ID to clear history for
   */
  public clearLocationHistory(locationId: string): void {
    this.locationHistory.delete(locationId);
  }
  
  /**
   * Clear all location history
   */
  public clearAllHistory(): void {
    this.locationHistory.clear();
  }
  
  /**
   * Extract the names of NPCs present at the current location
   * 
   * @param gameState Current game state
   * @returns Array of NPC names
   */
  private extractNPCsPresent(gameState: GameState): string[] {
    const npcsPresent: string[] = [];
    
    // If there are no NPCs, return an empty array
    if (!gameState.npcs) {
      return npcsPresent;
    }
    
    // Iterate through all NPCs using forEach instead of for...of
    gameState.npcs.forEach((npc) => {
      // Check if the NPC is at the current location
      if (npc.location === gameState.currentLocation?.id) {
        npcsPresent.push(npc.name);
      }
    });
    
    return npcsPresent;
  }
  
  /**
   * Find a location by ID in the game state
   * 
   * @param locationId Location ID to find
   * @param gameState Current game state
   * @returns The location object, or undefined if not found
   */
  private findLocation(locationId: string, gameState: GameState): Location | undefined {
    // Check if it's the current location
    if (gameState.currentLocation?.id === locationId) {
      return gameState.currentLocation;
    }
    
    // Check in the locations map if it exists
    if (gameState.locations && gameState.locations instanceof Map) {
      return gameState.locations.get(locationId);
    }
    
    // Check in locations array if it exists
    if (gameState.locations && Array.isArray(gameState.locations)) {
      return gameState.locations.find(loc => loc.id === locationId);
    }
    
    return undefined;
  }
  
  /**
   * Find nearby locations based on the location graph
   * 
   * @param locationId ID of the location to find nearby locations for
   * @param gameState Current game state
   * @returns Array of nearby location names and distances
   */
  private findNearbyLocations(locationId: string, gameState: GameState): Array<{name: string, distance?: string}> {
    const nearbyLocations: Array<{name: string, distance?: string}> = [];
    
    // If there are no location relationships, return an empty array
    if (!gameState.locationRelationships) {
      return nearbyLocations;
    }
    
    // Get all location relationships
    let relationships: Array<{
      from: string;
      to: string;
      description?: string;
      distance?: string;
      travelTime?: string;
      difficulty?: string;
    }> = [];
    
    if (Array.isArray(gameState.locationRelationships)) {
      relationships = gameState.locationRelationships;
    } else {
      // Convert Map to Array using forEach
      gameState.locationRelationships.forEach((relationship) => {
        relationships.push(relationship);
      });
    }
    
    // Find relationships that include this location
    for (const relationship of relationships) {
      if (relationship.from === locationId) {
        // Find the destination location
        const destination = this.findLocation(relationship.to, gameState);
        if (destination) {
          nearbyLocations.push({
            name: destination.name,
            distance: relationship.distance
          });
        }
      } else if (relationship.to === locationId) {
        // Find the source location
        const source = this.findLocation(relationship.from, gameState);
        if (source) {
          nearbyLocations.push({
            name: source.name,
            distance: relationship.distance
          });
        }
      }
    }
    
    return nearbyLocations;
  }
  
  /**
   * Find the connection between two locations
   * 
   * @param fromId ID of the source location
   * @param toId ID of the destination location
   * @param gameState Current game state
   * @returns Connection details or undefined if no connection exists
   */
  private findLocationConnection(
    fromId: string, 
    toId: string, 
    gameState: GameState
  ): { description?: string, travelTime?: string, difficulty?: string } | undefined {
    // If there are no location relationships, return undefined
    if (!gameState.locationRelationships) {
      return undefined;
    }
    
    // Get all location relationships
    let relationships: Array<{
      from: string;
      to: string;
      description?: string;
      distance?: string;
      travelTime?: string;
      difficulty?: string;
    }> = [];
    
    if (Array.isArray(gameState.locationRelationships)) {
      relationships = gameState.locationRelationships;
    } else {
      // Convert Map to Array using forEach
      gameState.locationRelationships.forEach((relationship) => {
        relationships.push(relationship);
      });
    }
    
    // Find the relationship between these two locations
    for (const relationship of relationships) {
      if ((relationship.from === fromId && relationship.to === toId) ||
          (relationship.from === toId && relationship.to === fromId)) {
        return {
          description: relationship.description,
          travelTime: relationship.travelTime,
          difficulty: relationship.difficulty
        };
      }
    }
    
    return undefined;
  }
}

export default LocationContext; 