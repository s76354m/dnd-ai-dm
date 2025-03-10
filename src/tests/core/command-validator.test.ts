/**
 * Tests for Command Validator
 * 
 * Tests validation functions for command parameters with a focus on
 * handling undefined parameters and providing helpful error messages.
 */

import { CommandValidator, ValidationResult } from '../../core/command-validator';
import { GameState } from '../../core/interfaces/game';
import { NPC } from '../../core/interfaces/npc';

describe('CommandValidator', () => {
  let validator: CommandValidator;
  
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
      ['location-1', {} as any], // Not needed for these tests
      ['location-2', {} as any], 
      ['location-3', {} as any]
    ])
  };
  
  beforeEach(() => {
    validator = new CommandValidator(mockGameState as GameState);
  });
  
  describe('validateRequired', () => {
    it('should return invalid for undefined values', () => {
      const result = validator.validateRequired(undefined, 'Item');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Item is required');
    });
    
    it('should return invalid for null values', () => {
      const result = validator.validateRequired(null, 'Item');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Item is required');
    });
    
    it('should return invalid for empty strings', () => {
      const result = validator.validateRequired('', 'Item');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Item cannot be empty');
    });
    
    it('should return invalid for whitespace strings', () => {
      const result = validator.validateRequired('   ', 'Item');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Item cannot be empty');
    });
    
    it('should include suggestion in error message when provided', () => {
      const result = validator.validateRequired(undefined, 'Item', 'Try "use potion" or "use sword"');
      expect(result.errorMessage).toContain('Try "use potion" or "use sword"');
    });
    
    it('should return valid for non-empty strings', () => {
      const result = validator.validateRequired('valid', 'Item');
      expect(result.isValid).toBe(true);
    });
  });
  
  describe('normalizeValue', () => {
    it('should return empty string for undefined', () => {
      expect(validator.normalizeValue(undefined)).toBe('');
    });
    
    it('should return empty string for null', () => {
      expect(validator.normalizeValue(null)).toBe('');
    });
    
    it('should trim and lowercase values', () => {
      expect(validator.normalizeValue('  Hello World  ')).toBe('hello world');
    });
  });
  
  describe('validateString', () => {
    it('should handle undefined values with required option', () => {
      const result = validator.validateString(undefined, { required: true });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('required');
    });
    
    it('should handle undefined values with non-required option', () => {
      const result = validator.validateString(undefined, { required: false });
      expect(result.isValid).toBe(true);
    });
    
    it('should validate minimum length', () => {
      const result = validator.validateString('abc', { minLength: 5 });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('at least 5 characters');
    });
    
    it('should validate maximum length', () => {
      const result = validator.validateString('abcdefghijk', { maxLength: 5 });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('cannot exceed 5 characters');
    });
    
    it('should use custom validator if provided', () => {
      const customValidator = (value: string): ValidationResult => ({
        isValid: value === 'valid',
        errorMessage: 'Custom error'
      });
      
      const validResult = validator.validateString('valid', { customValidator });
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = validator.validateString('invalid', { customValidator });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errorMessage).toBe('Custom error');
    });
    
    it('should normalize value if autoNormalize is true', () => {
      const customValidator = jest.fn().mockReturnValue({ isValid: true });
      
      validator.validateString('  TEST  ', { 
        customValidator, 
        autoNormalize: true 
      });
      
      expect(customValidator).toHaveBeenCalledWith('test');
    });
  });
  
  describe('validateInventoryItem', () => {
    it('should handle undefined values', () => {
      const result = validator.validateInventoryItem(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Please specify which item');
    });
    
    it('should handle null values', () => {
      const result = validator.validateInventoryItem(null);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Please specify which item');
    });
    
    it('should handle empty strings', () => {
      const result = validator.validateInventoryItem('');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Please specify which item');
    });
    
    it('should validate existing items', () => {
      const result = validator.validateInventoryItem('potion');
      expect(result.isValid).toBe(true);
      expect(result.entity.name).toBe('Health Potion');
    });
    
    it('should validate non-existent items', () => {
      const result = validator.validateInventoryItem('shield');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('don\'t have a \'shield\'');
    });
    
    it('should suggest similar items', () => {
      const result = validator.validateInventoryItem('sowrd');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Did you mean: Longsword');
    });
  });
  
  describe('validateNPC', () => {
    it('should handle undefined values', () => {
      const result = validator.validateNPC(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Who do you want to talk to');
    });
    
    it('should handle null values', () => {
      const result = validator.validateNPC(null);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Who do you want to talk to');
    });
    
    it('should handle empty strings', () => {
      const result = validator.validateNPC('');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Who do you want to talk to');
    });
    
    it('should validate existing NPCs', () => {
      const result = validator.validateNPC('guard');
      expect(result.isValid).toBe(true);
      expect(result.entity.name).toBe('Guard');
    });
    
    it('should validate non-existent NPCs', () => {
      const result = validator.validateNPC('wizard');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('There\'s no \'wizard\' here');
    });
    
    it('should list present NPCs when relevant', () => {
      const result = validator.validateNPC('wizard');
      expect(result.errorMessage).toContain('Present characters:');
      expect(result.errorMessage).toContain('Shopkeeper');
      expect(result.errorMessage).toContain('Guard');
    });
  });
  
  describe('validateLocationObject', () => {
    it('should handle undefined values', () => {
      const result = validator.validateLocationObject(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('What do you want to examine');
    });
    
    it('should handle null values', () => {
      const result = validator.validateLocationObject(null);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('What do you want to examine');
    });
    
    it('should handle empty strings', () => {
      const result = validator.validateLocationObject('');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('What do you want to examine');
    });
    
    it('should validate existing objects', () => {
      const result = validator.validateLocationObject('chest');
      expect(result.isValid).toBe(true);
      expect(result.entity.name).toBe('Treasure Chest');
    });
    
    it('should validate non-existent objects', () => {
      const result = validator.validateLocationObject('book');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('There\'s no \'book\' here');
    });
    
    it('should list visible objects when relevant', () => {
      const result = validator.validateLocationObject('book');
      expect(result.errorMessage).toContain('Visible objects:');
      expect(result.errorMessage).toContain('Treasure Chest');
      expect(result.errorMessage).toContain('Gold Coin');
    });
  });
  
  describe('validateExit', () => {
    it('should handle undefined values', () => {
      const result = validator.validateExit(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Which direction do you want to go');
    });
    
    it('should handle null values', () => {
      const result = validator.validateExit(null);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Which direction do you want to go');
    });
    
    it('should handle empty strings', () => {
      const result = validator.validateExit('');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Which direction do you want to go');
    });
    
    it('should validate existing exits', () => {
      const result = validator.validateExit('north');
      expect(result.isValid).toBe(true);
      expect(result.entity.direction).toBe('north');
    });
    
    it('should validate non-existent exits', () => {
      const result = validator.validateExit('south');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('You can\'t go south');
    });
    
    it('should list available exits when relevant', () => {
      const result = validator.validateExit('south');
      expect(result.errorMessage).toContain('Available exits:');
      expect(result.errorMessage).toContain('north');
      expect(result.errorMessage).toContain('east');
    });
    
    it('should handle direction abbreviations', () => {
      const result = validator.validateExit('n');
      expect(result.isValid).toBe(true);
      expect(result.entity.direction).toBe('north');
    });
  });
  
  describe('getSimilarity', () => {
    it('should calculate similarity correctly', () => {
      // Use reflection to access private method
      const getSimilarity = (validator as any).getSimilarity.bind(validator);
      
      // Direct substring matches
      expect(getSimilarity('go', 'go north')).toBeGreaterThanOrEqual(0.8);
      
      // Identical strings
      expect(getSimilarity('north', 'north')).toBe(1);
      
      // Similar strings
      expect(getSimilarity('nort', 'north')).toBeGreaterThan(0.6);
      
      // Different strings
      expect(getSimilarity('south', 'north')).toBeLessThan(0.5);
      
      // Empty strings
      expect(getSimilarity('', '')).toBe(1);
      expect(getSimilarity('north', '')).toBe(0);
      expect(getSimilarity('', 'north')).toBe(0);
    });
  });
}); 