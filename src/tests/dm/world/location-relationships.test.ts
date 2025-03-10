/**
 * Location Relationships System Tests
 * 
 * Tests the relationship management between locations in the game world.
 */

import LocationRelationshipManager, { 
  LocationRelationshipType,
  TravelDifficulty,
  LocationRelationship
} from '../../../dm/world/location-relationships';
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
  },
  'secret-cave': {
    id: 'secret-cave',
    name: 'Secret Cave',
    description: 'A hidden cave behind a waterfall.',
    type: 'dungeon',
    area: 'mountains',
    connections: new Map(),
    npcs: [],
    items: [],
    isHostile: true,
    lighting: 'dark',
    terrain: 'underground'
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
  ]
} as GameState;

describe('LocationRelationshipManager', () => {
  let manager: LocationRelationshipManager;
  
  beforeEach(() => {
    // Create a fresh manager before each test
    manager = new LocationRelationshipManager();
  });
  
  // Basic initialization tests
  test('initializes with default options', () => {
    expect(manager).toBeDefined();
  });
  
  test('initializes with custom options', () => {
    const customManager = new LocationRelationshipManager({
      enforceConsistency: false,
      trackDiscovery: false,
      logChanges: true
    });
    
    expect(customManager).toBeDefined();
  });
  
  // Relationship management tests
  test('adds a relationship between two locations', () => {
    const relationship = manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'A short path leads to the tavern door.',
      bidirectional: true,
      discovered: true
    });
    
    expect(relationship.id).toBeDefined();
    expect(relationship.fromId).toBe('town-square');
    expect(relationship.toId).toBe('tavern');
    expect(relationship.type).toBe(LocationRelationshipType.CONNECTS);
    
    // Check that we can retrieve the relationship
    const relationships = manager.getRelationships('town-square');
    expect(relationships).toHaveLength(1);
    expect(relationships[0].toId).toBe('tavern');
  });
  
  test('creates reciprocal relationships for bidirectional connections', () => {
    manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'A short path leads to the tavern door.',
      bidirectional: true,
      discovered: true
    });
    
    // Check that reciprocal relationship was created
    const tavernRelationships = manager.getRelationships('tavern');
    expect(tavernRelationships).toHaveLength(1);
    expect(tavernRelationships[0].toId).toBe('town-square');
    expect(tavernRelationships[0].type).toBe(LocationRelationshipType.CONNECTS);
  });
  
  test('does not create reciprocal relationships for unidirectional connections', () => {
    manager.addRelationship({
      fromId: 'mountain-pass',
      toId: 'secret-cave',
      type: LocationRelationshipType.SECRET,
      description: 'A barely visible path leads to a hidden cave.',
      bidirectional: false,
      discovered: true
    });
    
    // Check that reciprocal relationship was not created
    const caveRelationships = manager.getRelationships('secret-cave');
    expect(caveRelationships).toHaveLength(0);
  });
  
  test('creates appropriate inverse relationship types', () => {
    // Test containment relationship
    manager.addRelationship({
      fromId: 'tavern',
      toId: 'tavern-room',
      type: LocationRelationshipType.CONTAINS,
      description: 'The tavern has rooms upstairs.',
      bidirectional: true,
      discovered: true
    });
    
    // Check that the inverse type is WITHIN
    const roomRelationships = manager.getRelationships('tavern-room');
    expect(roomRelationships).toHaveLength(1);
    expect(roomRelationships[0].type).toBe(LocationRelationshipType.WITHIN);
  });
  
  test('updates an existing relationship', () => {
    // Add initial relationship
    const relationship = manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'A path to the tavern.',
      bidirectional: true,
      discovered: true
    });
    
    // Update it
    const updated = manager.updateRelationship(relationship.id, {
      description: 'A cobblestone path leads to the tavern entrance.',
      travelDifficulty: TravelDifficulty.EASY
    });
    
    expect(updated).not.toBeNull();
    expect(updated!.description).toBe('A cobblestone path leads to the tavern entrance.');
    expect(updated!.travelDifficulty).toBe(TravelDifficulty.EASY);
    
    // Verify the update was persisted
    const relationships = manager.getRelationships('town-square');
    expect(relationships[0].description).toBe('A cobblestone path leads to the tavern entrance.');
  });
  
  test('removes a relationship', () => {
    // Add a relationship
    const relationship = manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'A path to the tavern.',
      bidirectional: true,
      discovered: true
    });
    
    // Check it exists
    let relationships = manager.getRelationships('town-square');
    expect(relationships).toHaveLength(1);
    
    // Remove it
    const removed = manager.removeRelationship(relationship.id);
    expect(removed).toBe(true);
    
    // Check it's gone
    relationships = manager.getRelationships('town-square');
    expect(relationships).toHaveLength(0);
  });
  
  // Discovery and filtering tests
  test('filters discovered vs. undiscovered relationships', () => {
    // Add two relationships
    const rel1 = manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'Path to tavern',
      bidirectional: true,
      discovered: true
    });
    
    const rel2 = manager.addRelationship({
      fromId: 'town-square',
      toId: 'forest-path',
      type: LocationRelationshipType.CONNECTS,
      description: 'Path to forest',
      bidirectional: true,
      discovered: true
    });
    
    // Mark one as discovered
    manager.discoverRelationship(rel1.id);
    
    // Get all relationships
    const allRelationships = manager.getRelationships('town-square');
    expect(allRelationships).toHaveLength(2);
    
    // Get only discovered relationships
    const discoveredRelationships = manager.getRelationships('town-square', true);
    expect(discoveredRelationships).toHaveLength(1);
    expect(discoveredRelationships[0].toId).toBe('tavern');
  });
  
  test('marks bidirectional relationships as discovered in both directions', () => {
    // Add a bidirectional relationship
    const rel = manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'Path to tavern',
      bidirectional: true,
      discovered: true
    });
    
    // Mark it as discovered
    manager.discoverRelationship(rel.id);
    
    // Check the reciprocal relationship is also discovered
    const tavernRelationships = manager.getRelationships('tavern', true);
    expect(tavernRelationships).toHaveLength(1);
  });
  
  // Filtering by relationship type
  test('filters relationships by type', () => {
    // Add relationships of different types
    manager.addRelationship({
      fromId: 'tavern',
      toId: 'tavern-room',
      type: LocationRelationshipType.CONTAINS,
      description: 'Upstairs rooms',
      bidirectional: true,
      discovered: true
    });
    
    manager.addRelationship({
      fromId: 'tavern',
      toId: 'town-square',
      type: LocationRelationshipType.CONNECTS,
      description: 'Door to town square',
      bidirectional: true,
      discovered: true
    });
    
    // Get only CONTAINS relationships
    const containsRelationships = manager.getRelationshipsByType(
      'tavern',
      LocationRelationshipType.CONTAINS
    );
    
    expect(containsRelationships).toHaveLength(1);
    expect(containsRelationships[0].toId).toBe('tavern-room');
    expect(containsRelationships[0].type).toBe(LocationRelationshipType.CONTAINS);
  });
  
  // Direction-based filtering
  test('filters outgoing and incoming relationships', () => {
    // Set up a network of relationships
    manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'To tavern',
      bidirectional: true,
      discovered: true
    });
    
    manager.addRelationship({
      fromId: 'town-square',
      toId: 'forest-path',
      type: LocationRelationshipType.CONNECTS,
      description: 'To forest',
      bidirectional: true,
      discovered: true
    });
    
    // Get outgoing relationships
    const outgoing = manager.getOutgoingRelationships('town-square');
    expect(outgoing).toHaveLength(2);
    
    // Get incoming relationships
    const incoming = manager.getIncomingRelationships('tavern');
    expect(incoming).toHaveLength(1);
    expect(incoming[0].fromId).toBe('town-square');
  });
  
  // Path finding tests
  test('finds a direct path between two locations', () => {
    // Create a direct connection
    manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'Path to tavern',
      bidirectional: true,
      discovered: true
    });
    
    // Find the path
    const path = manager.findPath('town-square', 'tavern');
    
    expect(path).not.toBeNull();
    expect(path!).toHaveLength(1);
    expect(path![0].fromId).toBe('town-square');
    expect(path![0].toId).toBe('tavern');
  });
  
  test('finds multi-step paths between locations', () => {
    // Create a network of connections
    manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'Path to tavern',
      bidirectional: true,
      discovered: true
    });
    
    manager.addRelationship({
      fromId: 'tavern',
      toId: 'forest-path',
      type: LocationRelationshipType.CONNECTS,
      description: 'Back door to forest',
      bidirectional: true,
      discovered: true
    });
    
    manager.addRelationship({
      fromId: 'forest-path',
      toId: 'mountain-pass',
      type: LocationRelationshipType.CONNECTS,
      description: 'Path up to mountains',
      bidirectional: true,
      discovered: true
    });
    
    // Find a multi-step path
    const path = manager.findPath('town-square', 'mountain-pass');
    
    expect(path).not.toBeNull();
    expect(path!).toHaveLength(3);
    
    // Verify the path steps
    expect(path![0].fromId).toBe('town-square');
    expect(path![0].toId).toBe('tavern');
    
    expect(path![1].fromId).toBe('tavern');
    expect(path![1].toId).toBe('forest-path');
    
    expect(path![2].fromId).toBe('forest-path');
    expect(path![2].toId).toBe('mountain-pass');
  });
  
  test('returns null when no path exists', () => {
    // Create disconnected locations
    manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'Path to tavern',
      bidirectional: true,
      discovered: true
    });
    
    manager.addRelationship({
      fromId: 'forest-path',
      toId: 'mountain-pass',
      type: LocationRelationshipType.CONNECTS,
      description: 'Path to mountains',
      bidirectional: true,
      discovered: true
    });
    
    // Try to find path between disconnected areas
    const path = manager.findPath('town-square', 'mountain-pass');
    
    expect(path).toBeNull();
  });
  
  // Travel possibility checks
  test('checks if travel is possible between locations', () => {
    // Add a connection with requirements
    manager.addRelationship({
      fromId: 'tavern',
      toId: 'tavern-room',
      type: LocationRelationshipType.CONNECTS,
      description: 'Stairs to the room',
      bidirectional: true,
      discovered: true,
      requirements: [
        {
          type: 'item',
          description: 'You need the tavern key to enter the room.',
          value: 'key-tavern'
        }
      ]
    });
    
    // Check with a character that has the key
    const result = manager.checkTravelPossibility(
      'tavern',
      'tavern-room',
      mockCharacter,
      mockGameState
    );
    
    expect(result.canTravel).toBe(true);
  });
  
  test('identifies travel requirements that are not met', () => {
    // Create a character without the key
    const characterWithoutKey: Character = {
      ...mockCharacter,
      inventory: {
        items: [{ id: 'torch', name: 'Torch', quantity: 1 }],
        gold: 5
      }
    } as Character;
    
    // Add a connection with requirements
    manager.addRelationship({
      fromId: 'tavern',
      toId: 'tavern-room',
      type: LocationRelationshipType.CONNECTS,
      description: 'Stairs to the room',
      bidirectional: true,
      discovered: true,
      requirements: [
        {
          type: 'item',
          description: 'You need the tavern key to enter the room.',
          value: 'key-tavern'
        }
      ]
    });
    
    // Check with a character that doesn't have the key
    const result = manager.checkTravelPossibility(
      'tavern',
      'tavern-room',
      characterWithoutKey,
      mockGameState
    );
    
    expect(result.canTravel).toBe(false);
    expect(result.blockedBy).toBeDefined();
    expect(result.blockedBy!.length).toBe(1);
    expect(result.blockedBy![0].type).toBe('item');
  });
  
  // Path description generation
  test('generates a description of a path between locations', () => {
    // Add connections
    manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'through the main street',
      bidirectional: true,
      discovered: true
    });
    
    manager.addRelationship({
      fromId: 'tavern',
      toId: 'forest-path',
      type: LocationRelationshipType.CONNECTS,
      description: 'through the back door',
      bidirectional: true,
      discovered: true
    });
    
    // Get path description
    const description = manager.generatePathDescription('town-square', 'forest-path');
    
    expect(description).not.toBeNull();
    expect(description).toContain('through the main street');
    expect(description).toContain('through the back door');
  });
  
  // Location hierarchy building
  test('builds a hierarchical tree of locations', () => {
    // Create a hierarchy
    manager.addRelationship({
      fromId: 'tavern',
      toId: 'tavern-room',
      type: LocationRelationshipType.CONTAINS,
      description: 'Upstairs rooms',
      bidirectional: true,
      discovered: true
    });
    
    // Build hierarchy
    const hierarchy = manager.buildLocationHierarchy('tavern');
    
    expect(hierarchy).toHaveLength(1);
    expect(hierarchy[0].id).toBe('tavern-room');
  });
  
  // Special case handling tests
  test('handles self-referential paths gracefully', () => {
    const path = manager.findPath('town-square', 'town-square');
    
    expect(path).not.toBeNull();
    expect(path!).toHaveLength(0);
  });
  
  test('handles clearing all relationships', () => {
    // Add some relationships
    manager.addRelationship({
      fromId: 'town-square',
      toId: 'tavern',
      type: LocationRelationshipType.CONNECTS,
      description: 'Path to tavern',
      bidirectional: true,
      discovered: true
    });
    
    // Clear all
    manager.clearAllRelationships();
    
    // Check that all relationships are gone
    const relationships = manager.getAllRelationships();
    expect(relationships).toHaveLength(0);
  });
}); 