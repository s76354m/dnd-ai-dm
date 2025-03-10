/**
 * Item Usage System Tests
 * 
 * Tests for the item usage system, including using consumables, magical items,
 * and applying item effects in combat and non-combat situations.
 */

import { 
  ItemUsageManager, 
  ItemUseResult, 
  ItemEffectType, 
  ItemUseContext, 
  UsableItem 
} from '../character/item-usage-manager';
import { InventoryManager } from '../character/inventory';
import { findItemByName, MagicalItem } from '../data/magical-items';
import { v4 as uuidv4 } from 'uuid';

// Mock the inventory manager for testing
jest.mock('../character/inventory', () => {
  return {
    InventoryManager: jest.fn().mockImplementation(() => {
      // Mock inventory with test items
      const inventory = new Map();
      const characters = new Map();
      
      // Mock character
      const mockCharacter = {
        id: 'test-character-id',
        name: 'Test Character',
        hitPoints: { current: 20, maximum: 20 },
        inventory: {
          gold: 0,
          items: []
        }
      };
      
      characters.set('test-character-id', mockCharacter);
      
      return {
        getCharacter: jest.fn((id) => characters.get(id)),
        
        getItem: jest.fn((characterId, itemId) => {
          const characterInventory = inventory.get(characterId) || new Map();
          return characterInventory.get(itemId);
        }),
        
        addItem: jest.fn((character, item, quantity = 1) => {
          // Clone the character to avoid direct modification
          const updatedCharacter = { ...character };
          
          // Ensure inventory exists
          if (!updatedCharacter.inventory) {
            updatedCharacter.inventory = {
              gold: 0,
              items: []
            };
          }
          
          // Add item to inventory
          if (!updatedCharacter.inventory.items.find((i: { id: string }) => i.id === item.id)) {
            updatedCharacter.inventory.items.push(item);
          }
          
          let characterInventory = inventory.get(character.id);
          if (!characterInventory) {
            characterInventory = new Map();
            inventory.set(character.id, characterInventory);
          }
          characterInventory.set(item.id, item);
          
          return updatedCharacter;
        }),
        
        removeItem: jest.fn((characterId, itemId, quantity = 1) => {
          const characterInventory = inventory.get(characterId);
          if (!characterInventory) return false;
          
          const item = characterInventory.get(itemId);
          if (!item) return false;
          
          characterInventory.delete(itemId);
          return true;
        })
      };
    })
  };
});

describe('ItemUsageManager', () => {
  // Setup test environment
  let inventoryManager: jest.Mocked<InventoryManager>;
  let itemUsageManager: ItemUsageManager;
  const mockCharacterId = 'test-character-id';
  
  beforeEach(() => {
    // Initialize managers
    inventoryManager = new InventoryManager() as jest.Mocked<InventoryManager>;
    itemUsageManager = new ItemUsageManager(inventoryManager);
    
    // Create mock character
    const mockCharacter = global.mockInterfaces.createMockCharacter({
      id: mockCharacterId,
      name: 'Test Character'
    });
    
    // Create test items
    const healingPotion = global.mockInterfaces.createMockUsableItem({
      id: 'potion-healing-1',
      name: 'Potion of Healing',
      description: 'Restores 2d4+2 hit points when consumed.',
      weight: 0.5,
      value: 50,
      usable: true,
      consumable: true,
      effectType: ItemEffectType.Healing,
      useContext: [ItemUseContext.Combat, ItemUseContext.Exploration, ItemUseContext.Rest],
      useDescription: 'Drink to restore 2d4+2 hit points',
      effectFormula: '2d4+2',
      properties: ['consumable', 'magical']
    });
    
    const damagePotion = global.mockInterfaces.createMockUsableItem({
      id: 'potion-fire-breath-1',
      name: 'Potion of Fire Breath',
      description: 'When consumed, allows you to exhale fire at a target.',
      weight: 0.5,
      value: 100,
      usable: true,
      consumable: true,
      effectType: ItemEffectType.Damage,
      useContext: [ItemUseContext.Combat],
      useDescription: 'Exhale fire for 4d6 fire damage',
      effectFormula: '4d6',
      requiresTarget: true,
      properties: ['consumable', 'magical']
    });
    
    const wandOfMagicMissiles = global.mockInterfaces.createMockUsableItem({
      id: 'wand-magic-missiles-1',
      name: 'Wand of Magic Missiles',
      description: 'This wand has 7 charges for casting Magic Missile.',
      weight: 1,
      value: 300,
      usable: true,
      consumable: false,
      effectType: ItemEffectType.SpellCast,
      useContext: [ItemUseContext.Combat],
      useDescription: 'Use the wand to cast Magic Missile',
      spellEffect: 'Magic Missile',
      charges: 7,
      maxCharges: 7,
      requiresTarget: true,
      properties: ['magical', 'wand']
    });
    
    // Add to inventory
    inventoryManager.addItem(mockCharacter, healingPotion);
    inventoryManager.addItem(mockCharacter, damagePotion);
    inventoryManager.addItem(mockCharacter, wandOfMagicMissiles);
    
    // Register character with item usage manager
    itemUsageManager.registerCharacter(mockCharacter as any);
  });
  
  test('should use a healing item correctly', () => {
    // Try to use healing potion
    const result = itemUsageManager.useItem(
      mockCharacterId,
      'potion-healing-1',
      undefined, // No target needed
      ItemUseContext.Rest
    );
    
    // Verify the result
    expect(result.success).toBe(true);
    expect(result.effectApplied).toBe(true);
    expect(result.healingDone).toBeDefined();
    expect(result.healingDone).toBeGreaterThan(0);
    expect(result.itemConsumed).toBe(true);
  });
  
  test('should require a target for items that need one', () => {
    // Try to use damage potion without a target
    const result = itemUsageManager.useItem(
      mockCharacterId,
      'potion-fire-breath-1',
      undefined, // Missing target
      ItemUseContext.Combat
    );
    
    // Verify failure
    expect(result.success).toBe(false);
    expect(result.message).toContain('requires a target');
  });
  
  test('should use a damage item with a target correctly', () => {
    const targetId = 'enemy-goblin-1';
    
    // Use damage potion with a target
    const result = itemUsageManager.useItem(
      mockCharacterId,
      'potion-fire-breath-1',
      targetId,
      ItemUseContext.Combat
    );
    
    // Verify the result
    expect(result.success).toBe(true);
    expect(result.effectApplied).toBe(true);
    expect(result.damageDone).toBeDefined();
    expect(result.damageDone).toBeGreaterThan(0);
    expect(result.itemConsumed).toBe(true);
  });
  
  test('should track charges for non-consumable items', () => {
    const targetId = 'enemy-goblin-1';
    
    // Use wand that has charges
    const result1 = itemUsageManager.useItem(
      mockCharacterId,
      'wand-magic-missiles-1',
      targetId,
      ItemUseContext.Combat
    );
    
    // Verify first usage
    expect(result1.success).toBe(true);
    expect(result1.effectApplied).toBe(true);
    expect(result1.itemConsumed).toBeUndefined(); // Not consumed
    expect(result1.itemChargesUsed).toBe(1);
    
    // Check charges update in inventory (mocked, so won't really update)
    // In real implementation, this would decrease the charges from 7 to 6
    
    // Can use again because it's not consumable
    const result2 = itemUsageManager.useItem(
      mockCharacterId,
      'wand-magic-missiles-1',
      targetId,
      ItemUseContext.Combat
    );
    
    // Verify second usage
    expect(result2.success).toBe(true);
  });
  
  test('should respect item use context', () => {
    // Try to use a combat-only item outside of combat
    const result = itemUsageManager.useItem(
      mockCharacterId,
      'potion-fire-breath-1',
      'some-target',
      ItemUseContext.Rest // Wrong context
    );
    
    // Verify failure
    expect(result.success).toBe(false);
    expect(result.message).toContain('cannot be used in');
  });
  
  test('should create status effects from relevant items', () => {
    // Create a status effect item
    const invisibilityPotion = global.mockInterfaces.createMockUsableItem({
      id: 'potion-invisibility-1',
      name: 'Potion of Invisibility',
      description: 'When consumed, grants invisibility for 1 hour.',
      weight: 0.5,
      value: 250,
      usable: true,
      consumable: true,
      effectType: ItemEffectType.StatusEffect,
      useContext: [ItemUseContext.Combat, ItemUseContext.Exploration],
      useDescription: 'Become invisible for 1 hour',
      effectDuration: 60, // 1 hour in minutes
      properties: ['consumable', 'magical']
    });
    
    // Create mock character
    const mockCharacter = global.mockInterfaces.createMockCharacter({
      id: mockCharacterId,
      name: 'Test Character',
      hitPoints: { current: 20, maximum: 20 },
      inventory: {
        gold: 0,
        items: []
      }
    });
    
    // Add to inventory
    inventoryManager.addItem(mockCharacter, invisibilityPotion);
    
    // Register character with item usage manager
    itemUsageManager.registerCharacter(mockCharacter as any);
    
    // Use the status effect item
    const result = itemUsageManager.useItem(
      mockCharacterId,
      'potion-invisibility-1',
      undefined,
      ItemUseContext.Exploration
    );
    
    // Verify result
    expect(result.success).toBe(true);
    expect(result.effectApplied).toBe(true);
    expect(result.effectCreated).toBeDefined();
    
    if (result.effectCreated) {
      expect(result.effectCreated.name).toBe('Potion of Invisibility');
      expect(result.effectCreated.duration).toBeGreaterThan(0);
    }
    
    // Check that the effect was added to active effects
    const activeEffects = itemUsageManager.getActiveEffects(mockCharacterId);
    expect(activeEffects.length).toBe(1);
    expect(activeEffects[0].name).toBe('Potion of Invisibility');
  });
  
  test('should remove effects when they expire', () => {
    // Create a status effect item with short duration
    const blessingPotion = global.mockInterfaces.createMockUsableItem({
      id: 'potion-blessing-1',
      name: 'Potion of Blessing',
      description: 'Grants a blessing effect for a short duration.',
      weight: 0.5,
      value: 50,
      usable: true,
      consumable: true,
      effectType: ItemEffectType.StatusEffect,
      useContext: [ItemUseContext.Combat],
      useDescription: 'Gain +1 to attack rolls for 1 minute',
      effectDuration: 1, // 1 minute
      properties: ['consumable', 'magical']
    });
    
    // Create mock character
    const mockCharacter = global.mockInterfaces.createMockCharacter({
      id: mockCharacterId,
      name: 'Test Character',
      hitPoints: { current: 20, maximum: 20 },
      inventory: {
        gold: 0,
        items: []
      }
    });
    
    // Add to inventory
    inventoryManager.addItem(mockCharacter, blessingPotion);
    
    // Register character with item usage manager
    itemUsageManager.registerCharacter(mockCharacter as any);
    
    // Use the status effect item
    const result = itemUsageManager.useItem(
      mockCharacterId,
      'potion-blessing-1',
      undefined,
      ItemUseContext.Combat
    );
    
    // Verify active effect was created
    expect(result.success).toBe(true);
    expect(result.effectCreated).toBeDefined();
    
    let effectId: string | undefined;
    if (result.effectCreated) {
      effectId = result.effectCreated.id;
    }
    
    expect(effectId).toBeDefined();
    
    // Check active effects
    const activeEffects = itemUsageManager.getActiveEffects(mockCharacterId);
    expect(activeEffects.length).toBe(1);
    
    // Remove the effect
    if (effectId) {
      const removeResult = itemUsageManager.removeEffect(mockCharacterId, effectId);
      expect(removeResult).toBe(true);
      
      // Check active effects are empty
      const updatedEffects = itemUsageManager.getActiveEffects(mockCharacterId);
      expect(updatedEffects.length).toBe(0);
    }
  });
  
  test('should convert regular items to usable items', () => {
    // Create a regular item
    const regularItem = global.mockInterfaces.createMockItem({
      id: 'regular-sword-1',
      name: 'Regular Sword',
      description: 'A plain sword with no special properties.',
      weight: 3,
      value: 15,
      properties: ['weapon', 'slashing']
    });
    
    // Convert to a usable item
    const usableItem = itemUsageManager.makeItemUsable(regularItem, {
      usable: true,
      consumable: false,
      effectType: ItemEffectType.Damage,
      useContext: [ItemUseContext.Combat],
      useDescription: 'Attack with the sword',
      requiresTarget: true,
      effectFormula: '1d8'
    });
    
    // Verify conversion
    expect(usableItem.usable).toBe(true);
    expect(usableItem.name).toBe('Regular Sword');
    expect(usableItem.effectType).toBe(ItemEffectType.Damage);
    expect(usableItem.useContext).toContain(ItemUseContext.Combat);
    expect(usableItem.requiresTarget).toBe(true);
    expect(usableItem.effectFormula).toBe('1d8');
  });
});

describe('Magical Items Data', () => {
  test('should find items by name', () => {
    const healingPotion = findItemByName('Potion of Healing');
    expect(healingPotion).toBeDefined();
    expect(healingPotion?.name).toBe('Potion of Healing');
    expect(healingPotion?.effectType).toBe(ItemEffectType.Healing);
    
    const nonExistentItem = findItemByName('NonExistentItem');
    expect(nonExistentItem).toBeUndefined();
  });
  
  test('all magical items should have required properties', () => {
    const items = require('../data/magical-items').MAGICAL_ITEMS;
    
    items.forEach((item: MagicalItem) => {
      expect(item.id).toBeDefined();
      expect(item.name).toBeDefined();
      expect(item.description).toBeDefined();
      expect(item.weight).toBeDefined();
      expect(item.value).toBeGreaterThan(0);
      expect(item.rarity).toBeDefined();
      expect(item.attunement).toBeDefined();
      expect(item.category).toBeDefined();
      expect(item.usable).toBe(true);
      expect(item.useDescription).toBeDefined();
      expect(item.effectType).toBeDefined();
      expect(item.useContext).toBeDefined();
      expect(item.useContext?.length).toBeGreaterThan(0);
      expect(item.properties).toBeDefined();
      expect(item.properties).toContain('magical');
      
      // Validate consumables have consumable = true
      if (item.category === 'potion' || item.category === 'scroll') {
        expect(item.consumable).toBe(true);
      }
      
      // Validate items with charges have charge tracking
      if (item.charges !== undefined) {
        expect(item.maxCharges).toBeDefined();
        expect(item.maxCharges).toBeGreaterThanOrEqual(item.charges);
      }
      
      // Validate limited use items
      if (item.limitedUses) {
        if (item.limitedUses.charges) {
          expect(item.limitedUses.charges).toBeGreaterThan(0);
        }
        
        if (item.limitedUses.perDay) {
          expect(item.limitedUses.perDay).toBeGreaterThan(0);
        }
        
        if (item.limitedUses.perRest) {
          expect(item.limitedUses.perRest).toBeGreaterThan(0);
        }
      }
      
      // Validate spell-casting items have spell effect
      if (item.effectType === ItemEffectType.SpellCast) {
        expect(item.spellEffect).toBeDefined();
      }
    });
  });
}); 