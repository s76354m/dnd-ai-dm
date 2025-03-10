/**
 * Inventory Management System
 * 
 * System for organizing, tracking, and managing character inventory
 */

import { Character, Inventory } from '../core/interfaces/character';
import { Item, ItemRarity, ItemCategory } from '../core/interfaces/item';
import { MagicalItem } from '../core/interfaces/magical-item';
import { v4 as uuidv4 } from 'uuid';

// Extend the Item interface to include quantity and other inventory-specific properties
interface InventoryItem extends Item {
  quantity?: number;
  slot?: string;
  equipped?: boolean;
  consumable?: boolean;
  weapon?: boolean;
  armor?: boolean;
  tool?: boolean;
  wearable?: boolean;
  questItem?: boolean;
}

/**
 * Categories for inventory organization
 */
export type InventoryCategory = 
  | 'weapons' 
  | 'armor' 
  | 'potions' 
  | 'scrolls' 
  | 'food' 
  | 'tools' 
  | 'clothing' 
  | 'magical' 
  | 'quest' 
  | 'misc';

/**
 * Sorting options for inventory items
 */
export type ItemSort = 
  | 'alphabetical' 
  | 'value-high' 
  | 'value-low' 
  | 'weight-high' 
  | 'weight-low' 
  | 'category' 
  | 'newest' 
  | 'rarity';

/**
 * Filter options for inventory display
 */
export interface ItemFilter {
  categories?: InventoryCategory[];
  minValue?: number;
  maxValue?: number;
  minWeight?: number;
  maxWeight?: number;
  nameContains?: string;
  onlyMagical?: boolean;
  onlyEquipped?: boolean;
  onlyUnidentified?: boolean;
}

/**
 * Rules for stacking similar items
 */
export interface StackingRules {
  maxStackSize: number;
  canStack: boolean;
  stackingProperties: string[];  // Item properties that must be identical for stacking
}

/**
 * Default stacking rules by item category
 */
const DEFAULT_STACKING_RULES: Record<InventoryCategory, StackingRules> = {
  weapons: {
    maxStackSize: 1,
    canStack: false,
    stackingProperties: []
  },
  armor: {
    maxStackSize: 1,
    canStack: false,
    stackingProperties: []
  },
  potions: {
    maxStackSize: 20,
    canStack: true,
    stackingProperties: ['name', 'description', 'value']
  },
  scrolls: {
    maxStackSize: 10,
    canStack: true,
    stackingProperties: ['name', 'description', 'value']
  },
  food: {
    maxStackSize: 50,
    canStack: true,
    stackingProperties: ['name', 'description']
  },
  tools: {
    maxStackSize: 1,
    canStack: false,
    stackingProperties: []
  },
  clothing: {
    maxStackSize: 5,
    canStack: true,
    stackingProperties: ['name', 'description']
  },
  magical: {
    maxStackSize: 1,
    canStack: false,
    stackingProperties: []
  },
  quest: {
    maxStackSize: 1,
    canStack: false,
    stackingProperties: []
  },
  misc: {
    maxStackSize: 100,
    canStack: true,
    stackingProperties: ['name', 'description']
  }
};

/**
 * Carrying capacity thresholds
 */
export interface CarryingCapacity {
  light: number;  // No penalties
  medium: number; // Reduced speed
  heavy: number;  // Reduced speed and disadvantage on checks
  maximum: number; // Cannot carry more than this
}

/**
 * Weight management information
 */
export interface WeightManagement {
  currentWeight: number;
  capacity: CarryingCapacity;
}

/**
 * Class for managing character inventory
 */
export class InventoryManager {
  /**
   * Add an item to a character's inventory
   */
  public addItem(character: Character, item: Item, quantity: number = 1): Character {
    // Create a deep copy of the character to avoid direct state modification
    const updatedCharacter = { ...character };
    
    // Initialize inventory if it doesn't exist
    if (!updatedCharacter.inventory) {
      updatedCharacter.inventory = {
        gold: 0,
        items: []
      };
    }
    
    // Assign a unique ID to the item if it doesn't have one
    const newItem: InventoryItem = { 
      ...item,
      id: item.id || uuidv4()
    };
    
    // Set quantity if it's a stackable item
    if (this.canBeStacked(newItem)) {
      newItem.quantity = quantity;
    }
    
    // Check if we already have a similar item that can be stacked
    const existingItemIndex = updatedCharacter.inventory.items.findIndex(
      existingItem => this.areStackable(existingItem, item)
    );
    
    if (existingItemIndex !== -1 && this.canBeStacked(item)) {
      // Get a copy of the existing item
      const existingItem = { ...updatedCharacter.inventory.items[existingItemIndex] } as InventoryItem;
      
      // Increase the quantity
      existingItem.quantity = (existingItem.quantity || 1) + quantity;
      updatedCharacter.inventory.items[existingItemIndex] = existingItem;
    } else {
      // Add as a new item
      if (this.canBeStacked(newItem) && !newItem.quantity) {
        newItem.quantity = quantity;
      }
      updatedCharacter.inventory.items.push(newItem);
    }
    
    return updatedCharacter;
  }
  
  /**
   * Remove an item from a character's inventory
   */
  public removeItem(character: Character, itemId: string, quantity: number = 1): Character {
    // Create a deep copy of the character to avoid direct state modification
    const updatedCharacter = { ...character };
    
    // Initialize inventory if it doesn't exist
    if (!updatedCharacter.inventory) {
      updatedCharacter.inventory = {
        gold: 0,
        items: []
      };
    }
    
    // Find the item in the inventory
    const itemIndex = updatedCharacter.inventory.items.findIndex(item => item.id === itemId);
    
    // If the item doesn't exist, return the character unchanged
    if (itemIndex === -1) {
      return character;
    }
    
    // Get the item
    const item = updatedCharacter.inventory.items[itemIndex] as InventoryItem;
    
    // If the item is stackable and the quantity is greater than the requested removal
    if (this.canBeStacked(item) && (item.quantity || 1) > quantity) {
      const updatedItem = { ...item, quantity: (item.quantity || 1) - quantity } as InventoryItem;
      updatedCharacter.inventory.items = updatedCharacter.inventory.items.filter((_, index) => index !== itemIndex);
      updatedCharacter.inventory.items.push(updatedItem);
    } else {
      // Otherwise, remove the item entirely
      updatedCharacter.inventory.items = updatedCharacter.inventory.items.filter((_, index) => index !== itemIndex);
    }
    
    return updatedCharacter;
  }
  
  /**
   * Equip an item from a character's inventory
   */
  public equipItem(character: Character, itemId: string): Character {
    // Create a deep copy of the character to avoid direct state modification
    const updatedCharacter = { ...character };
    
    // Initialize inventory if it doesn't exist
    if (!updatedCharacter.inventory) {
      updatedCharacter.inventory = {
        gold: 0,
        items: []
      };
    }
    
    // Find the item in the inventory
    const itemIndex = updatedCharacter.inventory.items.findIndex(item => item.id === itemId);
    
    // If the item doesn't exist, return the character unchanged
    if (itemIndex === -1) {
      return character;
    }
    
    // Get a copy of the item
    const item = { ...updatedCharacter.inventory.items[itemIndex] } as InventoryItem;
    
    // If item is already equipped, no change needed
    if ((updatedCharacter.inventory.items[itemIndex] as InventoryItem).equipped) {
      return character;
    }
    
    // Unequip any items that would conflict with this one
    if ((item as InventoryItem).slot) {
      updatedCharacter.inventory.items = updatedCharacter.inventory.items.map(inventoryItem => {
        // If the item occupies the same slot or has a conflicting property
        const invItem = inventoryItem as InventoryItem;
        if (invItem.equipped && 
            ((invItem.slot === (item as InventoryItem).slot) || 
             (inventoryItem.properties && item.properties && 
              inventoryItem.properties.some(prop => item.properties?.includes(prop))))) {
          return { ...inventoryItem, equipped: false };
        }
        return inventoryItem;
      });
    }
    
    // Equip the item
    updatedCharacter.inventory.items[itemIndex] = { ...item, equipped: true };
    
    return updatedCharacter;
  }
  
  public unequipItem(character: Character, itemId: string): Character {
    // Create a deep copy of the character to avoid direct state modification
    const updatedCharacter = { ...character };
    
    // Initialize inventory if it doesn't exist
    if (!updatedCharacter.inventory) {
      updatedCharacter.inventory = {
        gold: 0,
        items: []
      };
    }
    
    // Find the item in the inventory
    const itemIndex = updatedCharacter.inventory.items.findIndex(item => item.id === itemId);
    
    // If the item doesn't exist, return the character unchanged
    if (itemIndex === -1) {
      return character;
    }
    
    // If the item is not equipped, no change needed
    if (!updatedCharacter.inventory.items[itemIndex].equipped) {
      return character;
    }
    
    // Unequip the item
    updatedCharacter.inventory.items[itemIndex] = {
      ...updatedCharacter.inventory.items[itemIndex],
      equipped: false
    };
    
    return updatedCharacter;
  }
  
  /**
   * Use an item from a character's inventory (e.g., consume a potion)
   */
  public useItem(character: Character, itemId: string): Character {
    // Create a deep copy of the character to avoid direct state modification
    const updatedCharacter = { ...character };
    
    // Find the item in the inventory
    const itemIndex = updatedCharacter.inventory.items.findIndex(item => item.id === itemId);
    
    // If the item doesn't exist, return the character unchanged
    if (itemIndex === -1) {
      return character;
    }
    
    // Get the item
    const item = updatedCharacter.inventory.items[itemIndex] as InventoryItem;
    
    // Different handling based on item type will go here
    // For now, just implement basic consumption logic
    
    // If it's a consumable item, reduce its quantity or remove it
    if ((item as InventoryItem).consumable || item.category === ItemCategory.Consumable) {
      return this.removeItem(updatedCharacter, itemId, 1);
    }
    
    // For non-consumable items, just return the character unchanged
    return updatedCharacter;
  }
  
  /**
   * Get filtered and sorted inventory
   */
  public getFilteredInventory(
    character: Character,
    filter?: ItemFilter,
    sort: ItemSort = 'alphabetical'
  ): Item[] {
    // Check if inventory exists and has items
    if (!character.inventory || character.inventory.items.length === 0) {
      return [];
    }
    
    // Start with all items
    let filteredItems = [...character.inventory.items];
    
    // Apply filters if provided
    if (filter) {
      if (filter.categories?.length) {
        filteredItems = filteredItems.filter(item => {
          const category = this.getCategoryForItem(item);
          return filter.categories?.includes(category);
        });
      }
      
      if (filter.minValue !== undefined) {
        filteredItems = filteredItems.filter(item => (item.value || 0) >= (filter.minValue || 0));
      }
      
      if (filter.maxValue !== undefined) {
        filteredItems = filteredItems.filter(item => (item.value || 0) <= (filter.maxValue || Infinity));
      }
      
      if (filter.minWeight !== undefined) {
        filteredItems = filteredItems.filter(item => (item.weight || 0) >= (filter.minWeight || 0));
      }
      
      if (filter.maxWeight !== undefined) {
        filteredItems = filteredItems.filter(item => (item.weight || 0) <= (filter.maxWeight || Infinity));
      }
      
      if (filter.nameContains) {
        const searchTerm = filter.nameContains.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item.name.toLowerCase().includes(searchTerm) || 
          item.description?.toLowerCase().includes(searchTerm)
        );
      }
      
      if (filter.onlyMagical) {
        filteredItems = filteredItems.filter(item => 
          (item as MagicalItem).isMagical || 
          (item.rarity && item.rarity !== ItemRarity.Common)
        );
      }
      
      if (filter.onlyEquipped) {
        filteredItems = filteredItems.filter(item => (item as InventoryItem).equipped);
      }
      
      if (filter.onlyUnidentified) {
        filteredItems = filteredItems.filter(item => 
          (item as MagicalItem).isIdentified === false
        );
      }
    }
    
    // Apply sorting
    switch (sort) {
      case 'alphabetical':
        filteredItems.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'value-high':
        filteredItems.sort((a, b) => (b.value || 0) - (a.value || 0));
        break;
      case 'value-low':
        filteredItems.sort((a, b) => (a.value || 0) - (b.value || 0));
        break;
      case 'weight-high':
        filteredItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));
        break;
      case 'weight-low':
        filteredItems.sort((a, b) => (a.weight || 0) - (b.weight || 0));
        break;
      case 'category':
        filteredItems.sort((a, b) => {
          const catA = this.getCategoryForItem(a);
          const catB = this.getCategoryForItem(b);
          return catA.localeCompare(catB);
        });
        break;
      case 'newest':
        // This assumes newer items are added to the end of the array
        // If there's a timestamp, use that instead
        filteredItems.reverse();
        break;
      case 'rarity':
        filteredItems.sort((a, b) => {
          const rarityOrder = {
            [ItemRarity.Common]: 0,
            [ItemRarity.Uncommon]: 1,
            [ItemRarity.Rare]: 2,
            [ItemRarity.VeryRare]: 3,
            [ItemRarity.Legendary]: 4,
            [ItemRarity.Artifact]: 5
          };
          
          return (rarityOrder[b.rarity || ItemRarity.Common] || 0) - 
                 (rarityOrder[a.rarity || ItemRarity.Common] || 0);
        });
        break;
    }
    
    return filteredItems;
  }
  
  /**
   * Determine inventory category for an item
   */
  private getCategoryForItem(item: Item): InventoryCategory {
    // Determine category based on item properties
    const invItem = item as InventoryItem;
    
    if (invItem.weapon || item.category === ItemCategory.Weapon) return 'weapons';
    if (invItem.armor || item.category === ItemCategory.Armor) return 'armor';
    if (invItem.consumable || item.category === ItemCategory.Consumable) {
      if (item.name.toLowerCase().includes('potion')) return 'potions';
      if (item.name.toLowerCase().includes('scroll')) return 'scrolls';
      if (item.name.toLowerCase().includes('food') || 
          item.name.toLowerCase().includes('ration') ||
          item.name.toLowerCase().includes('drink')) return 'food';
    }
    if (invItem.tool || item.category === ItemCategory.Tool) return 'tools';
    if (invItem.wearable && !invItem.armor) return 'clothing';
    if ((item as MagicalItem).isMagical || 
        (item.rarity && item.rarity !== ItemRarity.Common)) return 'magical';
    if (invItem.questItem || item.category === ItemCategory.QuestItem) return 'quest';
    
    // Default category
    return 'misc';
  }
  
  /**
   * Transfer an item from one character to another
   */
  public transferItem(
    fromCharacter: Character,
    toCharacter: Character,
    itemId: string,
    quantity: number = 1
  ): { fromCharacter: Character; toCharacter: Character } {
    // Create deep copies of the characters
    const updatedFromCharacter = { ...fromCharacter };
    const updatedToCharacter = { ...toCharacter };
    
    // Initialize inventories if they don't exist
    if (!updatedFromCharacter.inventory) {
      updatedFromCharacter.inventory = {
        gold: 0,
        items: []
      };
    }
    
    if (!updatedToCharacter.inventory) {
      updatedToCharacter.inventory = {
        gold: 0,
        items: []
      };
    }
    
    // Find the item in the source character's inventory
    const fromItemIndex = updatedFromCharacter.inventory.items.findIndex(item => item.id === itemId);
    
    // If the item doesn't exist, return the characters unchanged
    if (fromItemIndex === -1) {
      return { fromCharacter, toCharacter };
    }
    
    // Get the item
    const fromItem = updatedFromCharacter.inventory.items[fromItemIndex] as InventoryItem;
    
    // Handle stackable items
    if (this.canBeStacked(fromItem)) {
      const currentQuantity = (fromItem as InventoryItem).quantity || 1;
      
      // Ensure we don't transfer more than available
      const transferQuantity = Math.min(quantity, currentQuantity);
      
      // If transferring all items, remove from source
      if (transferQuantity >= currentQuantity) {
        updatedFromCharacter.inventory.items.splice(fromItemIndex, 1);
      } else {
        // Otherwise, reduce quantity in source
        (fromItem as InventoryItem).quantity = currentQuantity - transferQuantity;
      }
      
      // Add to destination with correct quantity
      const transferredItem = { ...fromItem, quantity: transferQuantity } as InventoryItem;
      updatedToCharacter.inventory.items.push(transferredItem);
    } else {
      // For non-stackable items, remove from source and add to destination
      updatedFromCharacter.inventory.items[fromItemIndex] = {
        ...fromItem,
        equipped: false // Unequip when transferring
      };
      
      // Add a copy to the destination
      const transferredItem = { ...fromItem, equipped: false } as InventoryItem;
      updatedToCharacter.inventory.items.push(transferredItem);
    }
    
    return { fromCharacter: updatedFromCharacter, toCharacter: updatedToCharacter };
  }
  
  public calculateInventoryWeight(character: Character): number {
    if (!character.inventory || character.inventory.items.length === 0) {
      return 0;
    }
    
    return character.inventory.items.reduce((totalWeight, item) => {
      const itemWeight = item.weight || 0;
      const quantity = (item as InventoryItem).quantity || 1;
      return totalWeight + (itemWeight * quantity);
    }, 0);
  }
  
  /**
   * Calculate carrying capacity based on strength
   */
  public calculateCarryingCapacity(character: Character): CarryingCapacity {
    // Default D&D 5e rules: carrying capacity is Strength score × 15 in pounds
    const strengthScore = character.abilityScores?.strength || 10;
    const baseCapacity = Number(strengthScore) * 15;
    
    // Define capacity thresholds according to D&D 5e
    return {
      light: baseCapacity / 3,      // Up to this weight, no penalties
      medium: (baseCapacity * 2) / 3, // Up to this weight, reduced speed
      heavy: baseCapacity,          // Up to this weight, reduced speed and disadvantage on checks
      maximum: baseCapacity * 2     // Cannot carry more than this
    };
  }
  
  /**
   * Split a stack of items
   */
  public splitStack(
    character: Character, 
    itemId: string, 
    quantityToSplit: number
  ): Character {
    // Create a deep copy of the character
    const updatedCharacter = { ...character };
    
    // Find the item in the inventory
    const itemIndex = updatedCharacter.inventory.items.findIndex(item => item.id === itemId);
    
    // If the item doesn't exist, return the character unchanged
    if (itemIndex === -1) {
      return character;
    }
    
    // Get the item
    const item = updatedCharacter.inventory.items[itemIndex] as InventoryItem;
    
    // Check if the item is stackable and has enough quantity
    if (!this.canBeStacked(item)) {
      return character; // Can't split non-stackable items
    }
    
    const currentQuantity = (item as InventoryItem).quantity || 1;
    
    if (quantityToSplit >= currentQuantity || quantityToSplit <= 0) {
      return character; // Invalid split request
    }
    
    // Update the original stack
    updatedCharacter.inventory.items[itemIndex] = {
      ...item,
      quantity: currentQuantity - quantityToSplit
    } as InventoryItem;
    
    // Create a new stack with the split quantity
    const newStack = {
      ...item,
      id: uuidv4(), // Give it a new ID
      quantity: quantityToSplit,
      equipped: false // New stack is not equipped
    } as InventoryItem;
    
    // Add the new stack to the inventory
    updatedCharacter.inventory.items.push(newStack);
    
    return updatedCharacter;
  }
  
  /**
   * Combine stacks of the same item
   */
  public combineStacks(
    character: Character, 
    itemId1: string, 
    itemId2: string
  ): Character {
    // Create a deep copy of the character
    const updatedCharacter = { ...character };
    
    // Find both items in the inventory
    const item1Index = updatedCharacter.inventory.items.findIndex(item => item.id === itemId1);
    const item2Index = updatedCharacter.inventory.items.findIndex(item => item.id === itemId2);
    
    // If either item doesn't exist, return the character unchanged
    if (item1Index === -1 || item2Index === -1) {
      return character;
    }
    
    // Get both items
    const item1 = updatedCharacter.inventory.items[item1Index] as InventoryItem;
    const item2 = updatedCharacter.inventory.items[item2Index] as InventoryItem;
    
    // Check if the items can be stacked together
    if (!this.areStackable(item1, item2)) {
      return character; // Can't combine different items
    }
    
    const quantity1 = (item1 as InventoryItem).quantity || 1;
    const quantity2 = (item2 as InventoryItem).quantity || 1;
    
    // Get the stacking rules for this item type
    const stackingRules = this.getStackingRules(item1);
    
    if (stackingRules && stackingRules.canStack) {
      // Calculate total quantity and check against max stack size
      const totalQuantity = quantity1 + quantity2;
      
      if (totalQuantity <= stackingRules.maxStackSize) {
        // Can combine into a single stack
        const combinedItem = {
          ...item1,
          quantity: totalQuantity,
          // Keep equipped state if either was equipped
          equipped: item1.equipped || item2.equipped 
        } as InventoryItem;
        
        // Update the first item and remove the second
        updatedCharacter.inventory.items[item1Index] = combinedItem;
        updatedCharacter.inventory.items.splice(item2Index, 1);
      } else {
        // Partial combination (up to max stack size)
        const transferAmount = stackingRules.maxStackSize - quantity1;
        
        if (transferAmount > 0) {
          updatedCharacter.inventory.items[item1Index] = {
            ...item1,
            quantity: stackingRules.maxStackSize
          } as InventoryItem;
          
          updatedCharacter.inventory.items[item2Index] = {
            ...item2,
            quantity: quantity2 - transferAmount
          } as InventoryItem;
        }
      }
    }
    
    return updatedCharacter;
  }
  
  private canBeStacked(item: Item): boolean {
    const stackingRules = this.getStackingRules(item);
    return stackingRules ? stackingRules.canStack : false;
  }
  
  /**
   * Check if two items can be stacked together
   */
  private areStackable(item1: Item, item2: Item): boolean {
    // Check if they're the same basic item type
    if (item1.name !== item2.name) {
      return false;
    }
    
    // Get stacking rules for this item type
    const stackingRules = this.getStackingRules(item1);
    
    if (!stackingRules || !stackingRules.canStack) {
      return false;
    }
    
    // Check if all required properties match
    for (const prop of stackingRules.stackingProperties) {
      if ((item1 as any)[prop] !== (item2 as any)[prop]) {
        return false;
      }
    }
    
    // For magical items, additional checks
    if ((item1 as MagicalItem).isMagical && (item2 as MagicalItem).isMagical) {
      if ((item1 as MagicalItem).charges !== (item2 as MagicalItem).charges) {
        return false;
      }
      
      if ((item1 as MagicalItem).isIdentified !== (item2 as MagicalItem).isIdentified) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get the stacking category for an item
   */
  private getStackingCategory(item: Item): string {
    // Determine stacking category based on item properties
    const invItem = item as InventoryItem;
    
    if (invItem.weapon || item.category === ItemCategory.Weapon) return 'weapons';
    if (invItem.armor || item.category === ItemCategory.Armor) return 'armor';
    
    if (invItem.consumable || item.category === ItemCategory.Consumable) {
      if (item.name.toLowerCase().includes('potion')) return 'potions';
      if (item.name.toLowerCase().includes('scroll')) return 'scrolls';
      if (item.name.toLowerCase().includes('food')) return 'food';
    }
    
    // More specific categorization can be added
    
    return 'misc';
  }
  
  private getStackingRules(item: Item): StackingRules | null {
    const category = this.getCategoryForItem(item);
    return DEFAULT_STACKING_RULES[category] || null;
  }
}

// Export a singleton instance
export const inventoryManager = new InventoryManager();
export default inventoryManager; 