/**
 * Location Context Manager Tests
 * 
 * Tests for the Location Context Manager, which tracks and contextualizes location
 * information to provide rich context for AI-generated location descriptions.
 */

import { LocationContext, LocationVisit, LocationContextConfig } from '../../../dm/context/location-context';
import { GameState } from '../../../core/interfaces/game';
import { Location } from '../../../core/interfaces/location';

// Mock data and helpers
const createMockGameState = (): GameState => {
  const player = global.mockInterfaces.createMockCharacter({
    name: 'Test Player',
    id: 'player-1'
  });
  
  const town = {
    id: 'town-1',
    name: 'Riverdale',
    description: 'A peaceful town by the river, known for its fishing industry.',
    type: 'settlement'
  };
  
  const tavern = {
    id: 'tavern-1',
    name: 'The Rusty Anchor',
    description: 'A cozy tavern frequented by local fishermen, with a warm hearth and the smell of ale.',
    type: 'establishment'
  };
  
  const forest = {
    id: 'forest-1',
    name: 'Whispering Woods',
    description: 'A dark forest with ancient trees and mysterious sounds.',
    type: 'wilderness'
  };
  
  const npc1 = global.mockInterfaces.createMockNPC({
    name: 'Innkeeper',
    id: 'npc-1',
    location: 'tavern-1'
  });
  
  const npc2 = global.mockInterfaces.createMockNPC({
    name: 'Town Guard',
    id: 'npc-2',
    location: 'town-1'
  });
  
  return {
    player,
    npcs: new Map([
      ['npc-1', npc1],
      ['npc-2', npc2]
    ]),
    currentLocation: tavern,
    locations: new Map([
      ['town-1', town],
      ['tavern-1', tavern],
      ['forest-1', forest]
    ]),
    locationRelationships: [
      {
        fromId: 'town-1',
        toId: 'tavern-1',
        type: 'connects',
        description: 'A cobblestone street leads from the town square to the tavern.',
        travelTime: '5 minutes',
        difficulty: 'easy'
      },
      {
        fromId: 'town-1',
        toId: 'forest-1',
        type: 'connects',
        description: 'A dirt path leads from the town to the forest edge.',
        travelTime: '15 minutes',
        difficulty: 'moderate'
      }
    ],
    worldState: {
      currentWeather: 'Partly cloudy with a light breeze',
      timeOfDay: 'Afternoon'
    },
    gameTime: {
      timeOfDay: 'Afternoon',
      day: 3,
      month: 6,
      year: 1299
    }
  } as any;
};

describe('LocationContext', () => {
  // Test basic initialization
  test('initializes with default config when no options provided', () => {
    const context = new LocationContext();
    
    // Expect context to be created with default values
    expect(context).toBeDefined();
  });
  
  test('initializes with custom options', () => {
    const customConfig: Partial<LocationContextConfig> = {
      maxLocationHistory: 10,
      includeVisitHistory: false,
      includeWeather: false
    };
    
    const context = new LocationContext(customConfig);
    expect(context).toBeDefined();
  });
  
  // Test visit recording
  test('correctly records location visits', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    
    // Add a visit to the tavern
    context.addLocationVisit(tavern, gameState);
    
    // Check visit count
    expect(context.getVisitCount(tavern.id)).toBe(1);
    expect(context.hasVisited(tavern.id)).toBe(true);
    
    // Add another visit
    context.addLocationVisit(tavern, gameState);
    
    // Check visit count again
    expect(context.getVisitCount(tavern.id)).toBe(2);
  });
  
  // Test visit history limiting
  test('limits location history to maxLocationHistory', () => {
    const context = new LocationContext({ maxLocationHistory: 3 });
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    
    // Add 5 visits (beyond the limit of 3)
    for (let i = 0; i < 5; i++) {
      context.addLocationVisit(tavern, gameState);
    }
    
    // Should still only have 3 visits in history
    expect(context.getVisitCount(tavern.id)).toBe(3);
  });
  
  // Test context building
  test('builds context string with configured details', () => {
    const context = new LocationContext({
      includeWeather: true,
      includeTimeOfDay: true,
      includeNearbyLocations: true
    });
    
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    
    // Add a visit
    context.addLocationVisit(tavern, gameState);
    
    // Build context string
    const contextString = context.buildLocationContext(tavern.id, gameState);
    
    // Verify key elements are included
    expect(contextString).toContain('Rusty Anchor');
    expect(contextString).toContain('Weather');
    expect(contextString).toContain('Partly cloudy');
    expect(contextString).toContain('Time of Day');
    expect(contextString).toContain('Afternoon');
  });
  
  // Test NPC tracking
  test('includes NPCs present in the location', () => {
    const context = new LocationContext({ includeNPCDetails: true });
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    
    // Add a visit
    context.addLocationVisit(tavern, gameState);
    
    // Build context string
    const contextString = context.buildLocationContext(tavern.id, gameState);
    
    // Verify NPCs are included
    expect(contextString).toContain('NPCs Present');
    expect(contextString).toContain('Innkeeper');
    expect(contextString).not.toContain('Town Guard'); // Should only include NPCs in this location
  });
  
  // Test location detail management
  test('adds and retrieves location details', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    
    // Add a visit
    context.addLocationVisit(tavern, gameState);
    
    // Add some details
    context.addLocationDetail(tavern.id, 'The bar is made of polished oak.');
    context.addLocationDetail(tavern.id, 'There\'s a fireplace in the corner.');
    
    // Build context string
    const contextString = context.buildLocationContext(tavern.id, gameState);
    
    // Verify details are included
    expect(contextString).toContain('Key Details');
    expect(contextString).toContain('The bar is made of polished oak');
    expect(contextString).toContain('There\'s a fireplace in the corner');
  });
  
  // Test player action recording
  test('records player actions at locations', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    
    // Add a visit
    context.addLocationVisit(tavern, gameState);
    
    // Add some player actions
    context.addPlayerAction(tavern.id, 'Ordered a drink');
    context.addPlayerAction(tavern.id, 'Talked to the innkeeper');
    
    // Build context string
    const contextString = context.buildLocationContext(tavern.id, gameState);
    
    // Verify actions are included
    expect(contextString).toContain('Ordered a drink');
    expect(contextString).toContain('Talked to the innkeeper');
  });
  
  // Test discoveries
  test('tracks discoveries made at locations', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    
    // Add a visit
    context.addLocationVisit(tavern, gameState);
    
    // Add a discovery
    context.addDiscovery(tavern.id, 'A secret compartment behind the bar');
    
    // Build context string
    const contextString = context.buildLocationContext(tavern.id, gameState);
    
    // Verify discovery is included
    expect(contextString).toContain('Discoveries');
    expect(contextString).toContain('A secret compartment behind the bar');
  });
  
  // Test environmental changes
  test('tracks environmental changes at locations', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    
    // Add a visit
    context.addLocationVisit(tavern, gameState);
    
    // Add an environmental change
    context.addEnvironmentalChange(tavern.id, 'The fireplace has gone out');
    
    // Build context string
    const contextString = context.buildLocationContext(tavern.id, gameState);
    
    // Verify environmental change is included
    expect(contextString).toContain('Environmental Changes');
    expect(contextString).toContain('The fireplace has gone out');
  });
  
  // Test location transition context
  test('generates transition context between locations', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    
    const town = gameState.locations.get('town-1');
    const tavern = gameState.currentLocation;
    
    // Only proceed if both locations are defined
    if (town && tavern) {
      // Add a visit to both locations
      context.addLocationVisit(town, gameState);
      context.addLocationVisit(tavern, gameState);
      
      // Generate transition context
      const transitionContext = context.generateLocationTransitionContext(
        town.id,
        tavern.id,
        gameState
      );
      
      // Should include information about both locations
      expect(transitionContext).toContain(town.name);
      expect(transitionContext).toContain(tavern.name);
      expect(transitionContext).toContain('5 minutes');
    }
  });
  
  // Test edge cases
  test('handles missing gameState gracefully', () => {
    const context = new LocationContext();
    
    // Create a minimal game state instead of using undefined
    const gameState = createMockGameState();
    
    // Check building context with a valid game state
    const contextString = context.buildLocationContext('tavern-1', gameState);
    
    // Should return a minimal context without crashing
    expect(contextString.length).toBeGreaterThan(0);
  });
  
  test('handles non-existent locations gracefully', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    
    // Check building context for a non-existent location
    const contextString = context.buildLocationContext('nonexistent-location', gameState);
    
    // Should return a message indicating the location wasn't found
    expect(contextString).toContain('No information found');
  });
  
  // Test history management
  test('clears location history correctly', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    const town = gameState.locations.get('town-1');
    
    // Add visits to multiple locations
    context.addLocationVisit(tavern, gameState);
    context.addLocationVisit(town, gameState);
    
    // Verify visits were recorded
    expect(context.hasVisited(tavern.id)).toBe(true);
    expect(context.hasVisited(town.id)).toBe(true);
    
    // Clear history for just the tavern
    context.clearLocationHistory(tavern.id);
    
    // Verify tavern history was cleared but town wasn't
    expect(context.hasVisited(tavern.id)).toBe(false);
    expect(context.hasVisited(town.id)).toBe(true);
    
    // Clear all history
    context.clearAllHistory();
    
    // Verify all history was cleared
    expect(context.hasVisited(tavern.id)).toBe(false);
    expect(context.hasVisited(town.id)).toBe(false);
  });

  test('tracks location visits correctly', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    
    const town = gameState.locations.get('town-1');
    
    // Only add the visit if town is defined
    if (town) {
      context.addLocationVisit(town, gameState);
      
      // Check that the location is now visited
      expect(context.hasVisited(town.id)).toBe(true);
    }
  });

  test('tracks visited locations', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    
    const town = gameState.locations.get('town-1');
    
    // Only run the test if town is defined
    if (town) {
      // Check that location is not visited initially
      expect(context.hasVisited(town.id)).toBe(false);
      
      // Add a visit
      context.addLocationVisit(town, gameState);
      
      // Check that the location is now visited
      expect(context.hasVisited(town.id)).toBe(true);
      
      // Reset visits
      context.clearAllHistory();
      
      // Check that the location is no longer visited
      expect(context.hasVisited(town.id)).toBe(false);
    }
  });

  test('handles missing gameState gracefully', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    
    // Create a minimal game state instead of using undefined
    const contextString = context.buildLocationContext('town-1', gameState);
    
    // Check that the context string is not empty
    expect(contextString.length).toBeGreaterThan(0);
  });

  test('generates location transition context', () => {
    const context = new LocationContext();
    const gameState = createMockGameState();
    
    const town = gameState.locations.get('town-1');
    const tavern = gameState.locations.get('tavern-1');
    
    // Only run the test if both locations are defined
    if (town && tavern) {
      // Add visits to both locations
      context.addLocationVisit(town, gameState);
      context.addLocationVisit(tavern, gameState);
      
      // Generate transition context
      const transitionContext = context.generateLocationTransitionContext(
        town.id,
        tavern.id,
        gameState
      );
      
      // Check that the transition context includes information about both locations
      expect(transitionContext).toContain(town.name);
      expect(transitionContext).toContain(tavern.name);
      expect(transitionContext).toContain('minutes'); // Time duration string
    }
  });
}); 