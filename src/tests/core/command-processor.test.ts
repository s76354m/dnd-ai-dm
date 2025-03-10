/**
 * Tests for Command Processor
 * 
 * Tests the command processing system with a focus on error handling
 * and parameter validation.
 */

import { CommandProcessor, CommandResult } from '../../core/command-processor';
import { GameState } from '../../core/interfaces/game';
import { NPC } from '../../core/interfaces/npc';

describe('CommandProcessor', () => {
  let processor: CommandProcessor;
  
  // Create a mock game state for testing
  const mockGameState: Partial<GameState> = {
    player: {
      id: 'player-1',
      name: 'Test Player',
      inventory: {
        gold: 100,
        items: [
          { id: 'item-1', name: 'Health Potion', quantity: 3, type: 'potion', weight: 0.5 },
          { id: 'item-2', name: 'Longsword', quantity: 1, type: 'weapon', weight: 3 }
        ]
      }
    },
    currentLocation: {
      id: 'location-1',
      name: 'Test Room',
      description: 'A test room for unit tests',
      npcsPresent: ['npc-1', 'npc-2'],
      objectsPresent: ['object-1', 'object-2'],
      objects: [
        { id: 'object-1', name: 'Treasure Chest', canTake: false, description: 'A wooden chest' },
        { id: 'object-2', name: 'Gold Coin', canTake: true, description: 'A shiny gold coin' }
      ],
      exits: [
        { direction: 'north', locationId: 'location-2', description: 'A door to the north' },
        { direction: 'east', locationId: 'location-3', description: 'A passage to the east' }
      ],
      isDiscovered: true
    },
    npcs: new Map([
      ['npc-1', { id: 'npc-1', name: 'Shopkeeper', description: 'A friendly shopkeeper' } as NPC],
      ['npc-2', { id: 'npc-2', name: 'Guard', description: 'A stern-looking guard' } as NPC]
    ]),
    locations: new Map([
      ['location-1', {} as any], // Will be filled in the beforeEach
      ['location-2', {
        id: 'location-2',
        name: 'North Room',
        description: 'The north room',
        npcsPresent: [],
        objectsPresent: [],
        objects: [],
        exits: [{ direction: 'south', locationId: 'location-1' }],
        isDiscovered: false
      } as any],
      ['location-3', {
        id: 'location-3',
        name: 'East Room',
        description: 'The east room',
        npcsPresent: [],
        objectsPresent: [],
        objects: [],
        exits: [{ direction: 'west', locationId: 'location-1' }],
        isDiscovered: false
      } as any]
    ]),
    combatState: { isActive: false }
  };
  
  beforeEach(() => {
    // Clone the current location to avoid test interference
    const clonedState = JSON.parse(JSON.stringify(mockGameState));
    
    // Fix Map objects that were stringified
    clonedState.npcs = new Map([
      ['npc-1', { id: 'npc-1', name: 'Shopkeeper', description: 'A friendly shopkeeper' } as NPC],
      ['npc-2', { id: 'npc-2', name: 'Guard', description: 'A stern-looking guard' } as NPC]
    ]);
    
    clonedState.locations = new Map([
      ['location-1', clonedState.currentLocation],
      ['location-2', {
        id: 'location-2',
        name: 'North Room',
        description: 'The north room',
        npcsPresent: [],
        objectsPresent: [],
        objects: [],
        exits: [{ direction: 'south', locationId: 'location-1' }],
        isDiscovered: false
      }],
      ['location-3', {
        id: 'location-3',
        name: 'East Room',
        description: 'The east room',
        npcsPresent: [],
        objectsPresent: [],
        objects: [],
        exits: [{ direction: 'west', locationId: 'location-1' }],
        isDiscovered: false
      }]
    ]);
    
    processor = new CommandProcessor(clonedState as GameState);
  });
  
  describe('processCommand', () => {
    it('should handle undefined input', async () => {
      const result = await processor.processCommand(undefined);
      expect(result.message).toContain('Please enter a command');
    });
    
    it('should handle null input', async () => {
      const result = await processor.processCommand(null);
      expect(result.message).toContain('Please enter a command');
    });
    
    it('should handle empty input', async () => {
      const result = await processor.processCommand('');
      expect(result.message).toContain('Please enter a command');
      expect(result.message).toContain('help');
    });
    
    it('should handle whitespace input', async () => {
      const result = await processor.processCommand('   ');
      expect(result.message).toContain('Please enter a command');
    });
    
    it('should suggest similar commands for typos', async () => {
      const result = await processor.processCommand('lok');
      expect(result.message).toContain('Unknown command');
      expect(result.message).toContain('Did you mean: look');
    });
    
    it('should handle abbreviated commands', async () => {
      const result = await processor.processCommand('n');
      expect(result.message).toContain('You move north');
    });
  });
  
  describe('Command Aliases', () => {
    it('should handle multiple forms of look command', async () => {
      const result1 = await processor.processCommand('look');
      const result2 = await processor.processCommand('examine');
      const result3 = await processor.processCommand('l');
      const result4 = await processor.processCommand('x');
      
      expect(result1.message).toContain('A test room for unit tests');
      expect(result2.message).toContain('A test room for unit tests');
      expect(result3.message).toContain('A test room for unit tests');
      expect(result4.message).toContain('A test room for unit tests');
    });
    
    it('should handle multiple forms of move command', async () => {
      const result1 = await processor.processCommand('go north');
      const result2 = await processor.processCommand('move north');
      const result3 = await processor.processCommand('walk north');
      const result4 = await processor.processCommand('north');
      const result5 = await processor.processCommand('n');
      
      expect(result1.message).toContain('You move north');
      expect(result2.message).toContain('You move north');
      expect(result3.message).toContain('You move north');
      expect(result4.message).toContain('You move north');
      expect(result5.message).toContain('You move north');
    });
  });
  
  describe('Look Command', () => {
    it('should describe the current location with no arguments', async () => {
      const result = await processor.processCommand('look');
      expect(result.message).toContain('A test room for unit tests');
      expect(result.message).toContain('Exits:');
      expect(result.message).toContain('Characters:');
      expect(result.message).toContain('Objects:');
    });
    
    it('should describe an object when specified', async () => {
      const result = await processor.processCommand('look chest');
      expect(result.message).toContain('A wooden chest');
    });
    
    it('should describe an NPC when specified', async () => {
      const result = await processor.processCommand('look guard');
      expect(result.message).toContain('stern-looking guard');
    });
    
    it('should handle invalid look target', async () => {
      const result = await processor.processCommand('look unicorn');
      expect(result.message).toContain('no \'unicorn\' here');
    });
  });
  
  describe('Move Command', () => {
    it('should move the player when direction is valid', async () => {
      const result = await processor.processCommand('move north');
      expect(result.message).toContain('You move north');
      expect(result.message).toContain('North Room');
      expect(result.stateChanges?.currentLocation.id).toBe('location-2');
    });
    
    it('should handle missing direction', async () => {
      const result = await processor.processCommand('move');
      expect(result.message).toContain('Which direction');
    });
    
    it('should handle invalid direction', async () => {
      const result = await processor.processCommand('move south');
      expect(result.message).toContain('can\'t go south');
      expect(result.message).toContain('Available exits:');
      expect(result.message).toContain('north');
      expect(result.message).toContain('east');
    });
    
    it('should update discovered status of new location', async () => {
      const result = await processor.processCommand('move north');
      expect(result.stateChanges?.locations.get('location-2')?.isDiscovered).toBe(true);
    });
  });
  
  describe('Talk Command', () => {
    it('should handle missing NPC target', async () => {
      const result = await processor.processCommand('talk');
      expect(result.message).toContain('Who do you want to talk to');
    });
    
    it('should handle invalid NPC target', async () => {
      const result = await processor.processCommand('talk wizard');
      expect(result.message).toContain('no \'wizard\' here');
    });
    
    it('should list present NPCs when target is invalid', async () => {
      const result = await processor.processCommand('talk wizard');
      expect(result.message).toContain('Present characters:');
      expect(result.message).toContain('Shopkeeper');
      expect(result.message).toContain('Guard');
    });
  });
  
  describe('Take Command', () => {
    it('should handle missing object target', async () => {
      const result = await processor.processCommand('take');
      expect(result.message).toContain('What do you want to take');
    });
    
    it('should handle invalid object target', async () => {
      const result = await processor.processCommand('take sword');
      expect(result.message).toContain('no \'sword\' here');
    });
    
    it('should handle non-takeable objects', async () => {
      const result = await processor.processCommand('take chest');
      expect(result.message).toContain('can\'t take the Treasure Chest');
    });
    
    it('should add takeable objects to inventory', async () => {
      const result = await processor.processCommand('take coin');
      expect(result.message).toContain('You take the Gold Coin');
      expect(result.stateChanges?.player.inventory.items.some(i => i.name === 'Gold Coin')).toBe(true);
    });
  });
  
  describe('getSimilarCommandSuggestions', () => {
    it('should find prefix matches', () => {
      // Access private method via type casting
      const getSimilarCommandSuggestions = (processor as any).getSimilarCommandSuggestions.bind(processor);
      
      // Test prefix matches
      const invSuggestions = getSimilarCommandSuggestions('inv');
      expect(invSuggestions).toContain('inventory');
      
      const exSuggestions = getSimilarCommandSuggestions('ex');
      expect(exSuggestions).toContain('examine');
    });
    
    it('should find similar commands for typos', () => {
      // Access private method via type casting
      const getSimilarCommandSuggestions = (processor as any).getSimilarCommandSuggestions.bind(processor);
      
      // Test similarity matches
      const lookSuggestions = getSimilarCommandSuggestions('lok');
      expect(lookSuggestions).toContain('look');
      
      const inventorySuggestions = getSimilarCommandSuggestions('inevntory');
      expect(inventorySuggestions).toContain('inventory');
      
      const takeSuggestions = getSimilarCommandSuggestions('tke');
      expect(takeSuggestions).toContain('take');
    });
  });
}); 