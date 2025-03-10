import { Character, Item } from '../core/interfaces';

/**
 * Extended Item interface for equipped items with slot information
 */
interface EquippedItem extends Item {
  slot?: 'weapon' | 'armor' | 'shield' | 'accessory' | 'other';
}

/**
 * Get an item from a character's inventory by name
 * @param character The character whose inventory to search
 * @param itemName Name or partial name of the item
 * @returns The item if found, undefined otherwise
 */
export function getItemFromInventory(
  character: Character, 
  itemName: string
): Item | undefined {
  const inventory = character.inventory || [];
  
  // Try to find an exact match first
  const exactMatch = inventory.find(
    (item: Item) => item.name.toLowerCase() === itemName.toLowerCase()
  );
  
  if (exactMatch) {
    return exactMatch;
  }
  
  // If no exact match, try a partial match
  return inventory.find(
    (item: Item) => item.name.toLowerCase().includes(itemName.toLowerCase())
  );
}

/**
 * Add an item to a character's inventory
 * @param character The character receiving the item
 * @param item The item to add
 * @param quantity Quantity to add (defaults to 1)
 * @returns Updated character
 */
export function addItemToInventory(
  character: Character,
  item: Item,
  quantity: number = 1
): Character {
  // Ensure the inventory exists
  if (!character.inventory) {
    character.inventory = [];
  }
  
  // Check if the item already exists in inventory
  const existingItem = character.inventory.find(i => i.id === item.id);
  
  // Check if item can be stacked (using properties array instead of stackable property)
  if (existingItem && !existingItem.properties.includes('non-stackable')) {
    // Increment quantity for stackable items
    existingItem.quantity = (existingItem.quantity || 1) + quantity;
  } else {
    // Add as a new item
    const newItem = { ...item, quantity: quantity };
    character.inventory.push(newItem);
  }
  
  return character;
}

/**
 * Remove an item from a character's inventory
 * @param character The character losing the item
 * @param itemId ID of the item to remove
 * @param quantity Quantity to remove (defaults to 1)
 * @returns Updated character
 */
export function removeItemFromInventory(
  character: Character,
  itemId: string,
  quantity: number = 1
): Character {
  if (!character.inventory) {
    return character;
  }
  
  const itemIndex = character.inventory.findIndex(item => item.id === itemId);
  
  if (itemIndex === -1) {
    return character;
  }
  
  const item = character.inventory[itemIndex];
  
  // If the item is equipped, unequip it
  if (item.isEquipped) {
    // Handle equipment slots based on item type
    if (character.equipment) {
      // Cast to EquippedItem[] to access the slot property
      const equipment = character.equipment as EquippedItem[];
      
      if (equipment.find(eq => eq.id === item.id && eq.slot === 'weapon')) {
        character.equipment = equipment.filter(eq => !(eq.id === item.id && eq.slot === 'weapon'));
      }
      
      if (equipment.find(eq => eq.id === item.id && eq.slot === 'armor')) {
        character.equipment = equipment.filter(eq => !(eq.id === item.id && eq.slot === 'armor'));
      }
      
      if (equipment.find(eq => eq.id === item.id && eq.slot === 'shield')) {
        character.equipment = equipment.filter(eq => !(eq.id === item.id && eq.slot === 'shield'));
      }
    }
  }
  
  // Update quantity or remove entirely
  if (item.quantity > quantity) {
    item.quantity -= quantity;
  } else {
    // Remove the item
    character.inventory.splice(itemIndex, 1);
  }
  
  return character;
}

/**
 * Calculate the total weight of a character's inventory
 * @param character The character whose inventory to calculate
 * @returns Total weight in pounds
 */
export function calculateInventoryWeight(character: Character): number {
  if (!character.inventory) {
    return 0;
  }
  
  return character.inventory.reduce((total, item) => {
    return total + (item.weight * (item.quantity || 1));
  }, 0);
}

/**
 * Check if a character is encumbered by their inventory
 * @param character The character to check
 * @returns Whether the character is encumbered
 */
export function isEncumbered(character: Character): boolean {
  const totalWeight = calculateInventoryWeight(character);
  
  // Get strength score from the proper location in the character object
  const strengthScore = character.abilityScores.strength.score;
  
  // Calculate encumbrance threshold (strength score * 5)
  const encumbranceThreshold = strengthScore * 5;
  
  return totalWeight > encumbranceThreshold;
}

/**
 * Check if a character is heavily encumbered by their inventory
 * @param character The character to check
 * @returns Whether the character is heavily encumbered
 */
export function isHeavilyEncumbered(character: Character): boolean {
  const totalWeight = calculateInventoryWeight(character);
  
  // Get strength score from the proper location in the character object
  const strengthScore = character.abilityScores.strength.score;
  
  // Calculate heavy encumbrance threshold (strength score * 10)
  const heavyEncumbranceThreshold = strengthScore * 10;
  
  return totalWeight > heavyEncumbranceThreshold;
}

/**
 * Equip an item from a character's inventory
 * @param character The character equipping the item
 * @param itemId ID of the item to equip
 * @returns Updated character
 */
export function equipItem(character: Character, itemId: string): Character {
  if (!character.inventory) {
    return character;
  }
  
  const item = character.inventory.find((item: Item) => item.id === itemId);
  
  if (!item) {
    return character;
  }
  
  // Initialize equipment array if it doesn't exist
  if (!character.equipment) {
    character.equipment = [];
  }
  
  // Cast the item to EquippedItem to add slot information
  const equippedItem = item as EquippedItem;
  
  // Determine slot based on item type
  if (item.type === 'weapon') {
    equippedItem.slot = 'weapon';
  } else if (item.type === 'armor') {
    equippedItem.slot = 'armor';
  } else if (item.type === 'shield') {
    equippedItem.slot = 'shield';
  } else {
    equippedItem.slot = 'other';
  }
  
  // Add to equipment
  character.equipment.push(equippedItem);
  
  // Mark as equipped in inventory
  const inventoryItem = character.inventory.find((item: Item) => item.id === itemId);
  if (inventoryItem) {
    inventoryItem.isEquipped = true;
  }
  
  return character;
}

/**
 * Unequip an item from a character
 * @param character The character unequipping the item
 * @param itemId ID of the item to unequip
 * @returns Updated character
 */
export function unequipItem(character: Character, itemId: string): Character {
  if (!character.equipment) {
    return character;
  }
  
  // Cast to EquippedItem[] to access the slot property
  const equipment = character.equipment as EquippedItem[];
  
  // Remove from equipment
  character.equipment = equipment.filter(item => item.id !== itemId);
  
  // Mark as unequipped in inventory
  if (character.inventory) {
    const inventoryItem = character.inventory.find((item: Item) => item.id === itemId);
    if (inventoryItem) {
      inventoryItem.isEquipped = false;
    }
  }
  
  return character;
} 