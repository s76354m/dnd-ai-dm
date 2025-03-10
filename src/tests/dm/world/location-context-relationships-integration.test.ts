/**
 * Location Context and Relationships Integration Tests
 * 
 * Tests the integration between the Location Context Manager and
 * Location Relationships System.
 */

import { LocationContext } from '../../../dm/context/location-context';
import LocationRelationshipManager, { 
  LocationRelationshipType,
  TravelDifficulty
} from '../../../dm/world/location-relationships';
import { LocationSystem } from '../../../dm/world/location-context-relationships-integration';
import { Character } from '../../../core/interfaces/character';
import { GameState } from '../../../core/interfaces/game';
import { Location } from '../../../core/interfaces/location';

// Mock data for testing
const mockLocations: Record<string, Location> = {
  'town-square': {
    id: 'town-square',
    name: 'Town Square',
    description: 'The central square of the town.',
    type: 'outdoor',
    area: 'town',
    connections: new Map(),
    npcs: [],
    items: [],
    isHostile: false,
    lighting: 'bright',
    terrain: 'urban'
  },
  'tavern': {
    id: 'tavern',
    name: 'The Drunken Dragon Tavern',
    description: 'A lively tavern with a roaring fireplace.',
    type: 'building',
    area: 'town',
    connections: new Map(),
    npcs: [],
    items: [],
    isHostile: false,
    lighting: 'bright',
    terrain: 'urban'
  },
  'tavern-room': {
    id: 'tavern-room',
    name: 'Tavern Room',
    description: 'A small but comfortable room upstairs in the tavern.',
    type: 'room',
    area: 'town',
    connections: new Map(),
    npcs: [],
    items: [],
    isHostile: false,
    lighting: 'dim',
    terrain: 'urban'
  },
  'forest-path': {
    id: 'forest-path',
    name: 'Forest Path',
    description: 'A winding path leading into the dark forest.',
    type: 'outdoor',
    area: 'forest',
    connections: new Map(),
    npcs: [],
    items: [],
    isHostile: false,
    lighting: 'dim',
    terrain: 'forest'
  },
  'mountain-pass': {
    id: 'mountain-pass',
    name: 'Mountain Pass',
    description: 'A narrow pass through the mountains.',
    type: 'outdoor',
    area: 'mountains',
    connections: new Map(),
    npcs: [],
    items: [],
    isHostile: false,
    lighting: 'bright',
    terrain: 'mountain'
  }
};

const mockCharacter: Character = {
  id: 'player',
  name: 'Adventurer',
  level: 1,
  race: 'human',
  class: ['fighter'],
  abilities: {
    strength: 14,
    dexterity: 12,
    constitution: 13,
    intelligence: 10,
    wisdom: 8,
    charisma: 11
  },
  hitPoints: {
    current: 10,
    maximum: 10
  },
  inventory: {
    items: [
      { id: 'torch', name: 'Torch', quantity: 3 },
      { id: 'key-tavern', name: 'Tavern Key', quantity: 1 }
    ],
    gold: 10
  }
} as Character;

const mockGameState: GameState = {
  player: mockCharacter,
  currentLocation: mockLocations['town-square'],
  locations: new Map(Object.entries(mockLocations)),
  quests: [
    { id: 'find-cave', name: 'Find the Secret Cave', status: 'active' }
  ],
  gameTime: {
    day: 1,
    time: 12, // Noon
    timeOfDay: 'noon',
    daysPassed: 0
  }
} as GameState;

// Mock implementations for LocationContext methods
const mockLocationContext = {
  addLocationVisit: jest.fn().mockReturnValue(true),
  getVisitCount: jest.fn().mockReturnValue(3),
  getLastVisitTime: jest.fn().mockReturnValue(new Date()),
  buildLocationContext: jest.fn().mockReturnValue('Location context data'),
  hasVisited: jest.fn().mockReturnValue(true),
  updateLocationDescription: jest.fn()
} as unknown as LocationContext;

describe('LocationSystem', () => {
  let relationshipManager: LocationRelationshipManager;
  let locationSystem: LocationSystem;
  
  beforeEach(() => {
    // Create fresh instances
    relationshipManager = new LocationRelationshipManager();
    locationSystem = new LocationSystem(
      mockLocationContext as any,
      relationshipManager
    );
    
    // Reset mock calls
    jest.clearAllMocks();
    
    // Set up some basic relationships for tests
    relationshipManager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'A cobblestone path leads to the tavern entrance.',
      bidirectional: true,
      discovered: true
    });
    
    relationshipManager.addRelationship({
      fromId: 'tavern',
      toId: 'tavern-room',
      type: LocationRelationshipType.CONTAINS,
      description: 'A staircase leads to the rooms upstairs.',
      bidirectional: true,
      discovered: true
    });
    
    relationshipManager.addRelationship({
      fromId: 'town-square',
      toId: 'forest-path',
      type: LocationRelationshipType.CONNECTS,
      description: 'A dirt path leads toward the forest.',
      bidirectional: true,
      discovered: true
    });
    
    relationshipManager.addRelationship({
      fromId: 'forest-path',
      toId: 'mountain-pass',
      type: LocationRelationshipType.CONNECTS,
      description: 'A steep trail climbs into the mountains.',
      bidirectional: true,
      travelDifficulty: TravelDifficulty.CHALLENGING,
      discovered: false // This path is not yet discovered
    });
  });
  
  // Basic initialization and accessor tests
  test('initializes with the context manager and relationship manager', () => {
    expect(locationSystem).toBeDefined();
    expect(locationSystem.getLocationContext()).toBe(mockLocationContext);
    expect(locationSystem.getRelationshipManager()).toBe(relationshipManager);
  });
  
  // Enhanced location info tests
  test('getEnhancedLocationInfo combines data from both systems', () => {
    const info = locationSystem.getEnhancedLocationInfo('town-square', mockGameState);
    
    expect(info).not.toBeNull();
    expect(info!.location).toEqual(mockLocations['town-square']);
    expect(info!.knownExits).toHaveLength(2); // tavern and forest-path
    expect(info!.visitCount).toBe(3); // From mock
    expect(info!.lastVisited).toBeInstanceOf(Date);
  });
  
  test('getEnhancedLocationInfo groups relationships by type', () => {
    const info = locationSystem.getEnhancedLocationInfo('tavern', mockGameState);
    
    expect(info).not.toBeNull();
    expect(info!.containedLocations).toContain('tavern-room');
    expect(info!.connectedLocations).toContain('town-square');
  });
  
  test('getEnhancedLocationInfo only includes discovered relationships by default', () => {
    // First add a new relationship
    relationshipManager.addRelationship({
      fromId: 'tavern',
      toId: 'secret-passage',
      type: LocationRelationshipType.SECRET,
      description: 'A hidden door behind the fireplace.',
      bidirectional: true,
      discovered: false
    });
    
    const info = locationSystem.getEnhancedLocationInfo('tavern', mockGameState);
    
    // Should not include undiscovered relationships
    expect(info!.knownExits).toHaveLength(1); // Just town-square, not secret-passage
    
    // But including all relationships should show it
    const infoAll = locationSystem.getEnhancedLocationInfo('tavern', mockGameState, false);
    expect(infoAll!.knownExits).toHaveLength(2); // Both town-square and secret-passage
  });
  
  // Visit recording tests
  test('recordLocationVisit records in context and handles relationships', () => {
    locationSystem.recordLocationVisit(
      mockLocations['tavern'],
      mockGameState,
      'town-square'
    );
    
    // Should have called the context manager's add method
    expect(mockLocationContext.addLocationVisit).toHaveBeenCalledWith(
      mockLocations['tavern'],
      mockGameState
    );
  });
  
  test('recordLocationVisit auto-discovers relationships when enabled', () => {
    // Add a relationship that's not discovered
    const rel = relationshipManager.addRelationship({
      fromId: 'tavern',
      toId: 'cellar',
      type: LocationRelationshipType.CONNECTS,
      description: 'A trapdoor leads to the cellar.',
      bidirectional: true,
      discovered: false
    });
    
    // Visit with auto-discovery enabled
    locationSystem.recordLocationVisit(
      mockLocations['tavern'],
      mockGameState
    );
    
    // The relationship should now be discovered
    const relationships = relationshipManager.getRelationships('tavern', true);
    const discovered = relationships.some(r => r.toId === 'cellar');
    expect(discovered).toBe(true);
  });
  
  // Travel possibility tests
  test('checkTravelPossibility delegates to the relationship manager', () => {
    // Spy on the relationship manager's method
    const spy = jest.spyOn(relationshipManager, 'checkTravelPossibility');
    
    locationSystem.checkTravelPossibility(
      'tavern',
      'tavern-room',
      mockCharacter,
      mockGameState
    );
    
    // Should have called the relationship manager's method
    expect(spy).toHaveBeenCalledWith(
      'tavern',
      'tavern-room',
      mockCharacter,
      mockGameState
    );
    
    spy.mockRestore();
  });
  
  // Description generation tests
  test('generateEnhancedDescription combines base description with context', () => {
    const description = locationSystem.generateEnhancedDescription(
      'town-square',
      mockGameState
    );
    
    // Should contain the base description
    expect(description).toContain(mockLocations['town-square'].description);
    
    // Should include context
    expect(description).toContain('Location context data');
    
    // Should include exit information
    expect(description).toContain('tavern');
    expect(description).toContain('forest-path');
  });
  
  test('generateEnhancedDescription includes visit history', () => {
    const description = locationSystem.generateEnhancedDescription(
      'town-square',
      mockGameState,
      true,
      true
    );
    
    // Should include visit count
    expect(description).toContain('visited this location 3 times');
  });
  
  // Travel narrative tests
  test('generateTravelNarrative creates a journey description', () => {
    const narrative = locationSystem.generateTravelNarrative(
      'town-square',
      'tavern-room',
      mockGameState
    );
    
    expect(narrative).not.toBeNull();
    expect(narrative).toContain('town-square');
    expect(narrative).toContain('tavern');
    expect(narrative).toContain('tavern-room');
  });
  
  test('generateTravelNarrative returns null for impossible journeys', () => {
    // Create a disconnected location
    const narrative = locationSystem.generateTravelNarrative(
      'town-square',
      'disconnected-location',
      mockGameState
    );
    
    expect(narrative).toBeNull();
  });
  
  test('generateTravelNarrative handles the case of already being at destination', () => {
    const narrative = locationSystem.generateTravelNarrative(
      'town-square',
      'town-square',
      mockGameState
    );
    
    expect(narrative).not.toBeNull();
    expect(narrative).toContain('already at your destination');
  });
  
  // Connection creation tests
  test('createConnection adds a relationship via the relationship manager', () => {
    locationSystem.createConnection(
      'tavern',
      'kitchen',
      LocationRelationshipType.CONNECTS,
      'A door leads to the kitchen.'
    );
    
    // Check that the relationship was added
    const relationships = relationshipManager.getRelationships('tavern');
    const kitchenConnection = relationships.find(r => r.toId === 'kitchen');
    
    expect(kitchenConnection).toBeDefined();
    expect(kitchenConnection!.type).toBe(LocationRelationshipType.CONNECTS);
    expect(kitchenConnection!.description).toBe('A door leads to the kitchen.');
  });
  
  // Travel handling tests
  test('handleTravel performs a successful travel operation', () => {
    // Mock a findLocation to return a location
    locationSystem['findLocation'] = jest.fn().mockImplementation(
      (id) => mockLocations[id]
    );
    
    // Mock generateTravelNarrative
    jest.spyOn(locationSystem, 'generateTravelNarrative')
      .mockReturnValue('You travel from the town square to the tavern.');
    
    const result = locationSystem.handleTravel(
      'town-square',
      'tavern',
      mockCharacter,
      mockGameState
    );
    
    expect(result.success).toBe(true);
    expect(result.narrative).toContain('travel from the town square to the tavern');
    
    // Should have recorded both the travel and location visit
    expect(mockLocationContext.addLocationVisit).toHaveBeenCalled();
  });
  
  test('handleTravel blocks travel when not possible', () => {
    // Mock checkTravelPossibility to return not possible
    jest.spyOn(locationSystem, 'checkTravelPossibility')
      .mockReturnValue({
        canTravel: false,
        description: 'The path is blocked by a fallen tree.'
      });
    
    const result = locationSystem.handleTravel(
      'town-square',
      'forest-path',
      mockCharacter,
      mockGameState
    );
    
    expect(result.success).toBe(false);
    expect(result.narrative).toContain('blocked by a fallen tree');
    
    // Should not have recorded the visit
    expect(mockLocationContext.addLocationVisit).not.toHaveBeenCalled();
  });
  
  test('handleTravel handles missing destinations', () => {
    // Mock findLocation to return null
    locationSystem['findLocation'] = jest.fn().mockReturnValue(null);
    
    const result = locationSystem.handleTravel(
      'town-square',
      'non-existent-location',
      mockCharacter,
      mockGameState
    );
    
    expect(result.success).toBe(false);
    expect(result.narrative).toContain('destination location could not be found');
  });
  
  // Travel history tests
  test('getTravelHistory returns the recorded travel history', () => {
    // Mock a private method to add a travel record
    const mockTravel = {
      fromId: 'town-square',
      toId: 'tavern',
      timestamp: new Date(),
      relationshipId: 'rel_1',
      travelTime: 5,
      narrative: 'You walked to the tavern.',
      discoveries: []
    };
    
    // @ts-ignore - Accessing private property for testing
    locationSystem.travelHistory = [mockTravel];
    
    const history = locationSystem.getTravelHistory();
    
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(mockTravel);
    
    // Make sure it's a copy, not the original reference
    expect(history).not.toBe(locationSystem['travelHistory']);
  });
  
  test('clearTravelHistory resets the travel history', () => {
    // Mock a private method to add a travel record
    const mockTravel = {
      fromId: 'town-square',
      toId: 'tavern',
      timestamp: new Date(),
      relationshipId: 'rel_1',
      travelTime: 5,
      narrative: 'You walked to the tavern.',
      discoveries: []
    };
    
    // @ts-ignore - Accessing private property for testing
    locationSystem.travelHistory = [mockTravel];
    
    // Clear the history
    locationSystem.clearTravelHistory();
    
    // Check that history is empty
    const history = locationSystem.getTravelHistory();
    expect(history).toHaveLength(0);
  });
}); 