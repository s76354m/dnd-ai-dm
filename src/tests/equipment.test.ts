/**
 * Equipment System Tests
 * 
 * Tests for equipment management, including equipment modification,
 * durability, and class-specific equipment generation.
 */

import { equipmentModifier } from '../equipment/modifier';
import { createStartingEquipment } from '../character/equipment';
import { Character } from '../core/interfaces/character';
import { v4 as uuidv4 } from 'uuid';

// Mock character for testing
const mockCharacter = global.mockInterfaces.createMockCharacter({
  id: 'test-character',
  name: 'Test Character',
  class: 'fighter',
  level: 1,
  wealth: {
    copper: 0,
    silver: 0,
    electrum: 0,
    gold: 100,
    platinum: 0
  },
  equipment: [],
  inventory: []
});

describe('Equipment System', () => {
  // Equipment modification tests
  describe('Equipment Modifier', () => {
    test('should modify weapon damage', () => {
      // Create a test weapon
      const testWeapon = global.mockInterfaces.createMockItem({
        id: 'test-weapon',
        name: 'Test Weapon',
        description: 'A test weapon',
        weight: 2,
        value: 50,
        properties: ['weapon', 'slashing'],
        durability: { current: 100, maximum: 100, condition: 'normal' },
        bonus: {
          attack: 0,
          damage: 0
        }
      });
      
      // Apply a +1 damage modifier using the direct enhance method
      const modifiedWeapon = equipmentModifier.enhance(testWeapon, { damage: 1 });
      
      // Check the weapon was modified correctly
      expect(modifiedWeapon.id).toBe(testWeapon.id);
      expect(modifiedWeapon.bonus?.damage).toBe(1);
      expect(modifiedWeapon.value).toBeGreaterThan(testWeapon.value);
    });
    
    test('should repair damaged equipment', () => {
      // Create a damaged item
      const damagedItem = global.mockInterfaces.createMockItem({
        id: 'damaged-armor',
        name: 'Damaged Armor',
        description: 'Armor with reduced durability',
        weight: 10,
        value: 100,
        properties: ['armor', 'medium'],
        durability: { current: 50, maximum: 100, condition: 'damaged' }
      });
      
      // Repair the item using the direct repair method
      const repairedItem = equipmentModifier.repair(damagedItem, 30);
      
      // Check the item was repaired correctly
      expect(repairedItem.durability?.current).toBe(80); // 50 + 30
      expect(repairedItem.value).toBe(damagedItem.value); // Value should not change when repairing
    });
    
    test('should apply material changes', () => {
      // Create a regular item
      const regularItem = global.mockInterfaces.createMockItem({
        id: 'iron-sword',
        name: 'Iron Sword',
        description: 'A regular iron sword',
        weight: 3,
        value: 15,
        properties: ['weapon', 'slashing', 'iron'],
        durability: { current: 100, maximum: 100, condition: 'normal' }
      });
      
      // Add the item to the character's inventory
      mockCharacter.inventory = [regularItem];
      
      // Change material to silver using the simplified method for tests
      const result = equipmentModifier.changeMaterialLegacy(mockCharacter, regularItem.id, 'silver');
      const silverItem = result.result.item;
      
      // Check the material was changed correctly
      expect(silverItem.name).toContain('Silver');
      expect(silverItem.properties).toContain('silver');
      expect(silverItem.properties).not.toContain('iron');
      expect(silverItem.value).toBeGreaterThan(regularItem.value);
    });
  });
  
  // Starting equipment tests
  describe('Starting Equipment', () => {
    test('should generate fighter starting equipment', () => {
      // Create fighter equipment
      const equipment = createStartingEquipment('fighter', mockCharacter);
      
      // Check equipment was generated
      expect(equipment.length).toBeGreaterThan(0);
      
      // Check for a weapon
      const weapon = equipment.find(item => item.properties.includes('weapon'));
      expect(weapon).toBeDefined();
      
      // Check for armor
      const armor = equipment.find(item => item.properties.includes('armor'));
      expect(armor).toBeDefined();
    });
    
    test('should generate wizard starting equipment', () => {
      // Create a wizard character
      const wizardCharacter = global.mockInterfaces.createMockCharacter({
        id: 'wizard-character',
        name: 'Test Wizard',
        class: 'wizard',
        level: 1
      });
      
      // Create wizard equipment
      const equipment = createStartingEquipment('wizard', wizardCharacter);
      
      // Check equipment was generated
      expect(equipment.length).toBeGreaterThan(0);
      
      // Check for a staff or wand
      const arcaneImplement = equipment.find(item => 
        item.properties.includes('staff') || item.properties.includes('wand')
      );
      expect(arcaneImplement).toBeDefined();
      
      // Check for spellbook
      const spellbook = equipment.find(item => item.properties.includes('spellbook'));
      expect(spellbook).toBeDefined();
    });
  });
}); 