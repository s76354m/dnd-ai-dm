/**
 * Magical Items Data File
 * 
 * Contains detailed magical item information including effects, charges,
 * and usage mechanics for the D&D AI DM system.
 */

import { v4 as uuidv4 } from 'uuid';
import { UsableItem, ItemEffectType, ItemUseContext } from '../character/item-usage-manager';

/**
 * Rarity levels for magical items
 */
export enum ItemRarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  VeryRare = 'very_rare',
  Legendary = 'legendary',
  Artifact = 'artifact'
}

/**
 * Base magical item interface with common properties
 */
export interface MagicalItem extends UsableItem {
  id: string;
  rarity: ItemRarity;
  attunement: boolean;
  limitedUses?: {
    perDay?: number;
    perRest?: number;
    charges?: number;
    recharge?: 'dawn' | 'dusk' | 'short_rest' | 'long_rest' | 'never';
  };
  category: 'potion' | 'scroll' | 'wand' | 'ring' | 'weapon' | 'armor' | 'wondrous' | 'rod' | 'staff';
  bonus?: {
    attack?: number;
    damage?: number;
    ac?: number;
    savingThrows?: number;
  };
}

/**
 * Comprehensive magical items list
 */
export const MAGICAL_ITEMS: MagicalItem[] = [
  // POTIONS -----------------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Potion of Healing",
    description: "A red liquid that restores hit points to the drinker.",
    weight: 0.5,
    value: 50,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: true,
    effectType: ItemEffectType.Healing,
    useContext: [ItemUseContext.Combat, ItemUseContext.Exploration, ItemUseContext.Rest],
    useDescription: "Drink the potion to restore 2d4+2 hit points",
    effectFormula: "2d4+2",
    rarity: ItemRarity.Common,
    attunement: false,
    category: 'potion',
    properties: ['consumable', 'magical']
  },
  {
    id: uuidv4(),
    name: "Potion of Greater Healing",
    description: "A vibrant red liquid that restores a significant amount of hit points to the drinker.",
    weight: 0.5,
    value: 100,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: true,
    effectType: ItemEffectType.Healing,
    useContext: [ItemUseContext.Combat, ItemUseContext.Exploration, ItemUseContext.Rest],
    useDescription: "Drink the potion to restore 4d4+4 hit points",
    effectFormula: "4d4+4",
    rarity: ItemRarity.Uncommon,
    attunement: false,
    category: 'potion',
    properties: ['consumable', 'magical']
  },
  {
    id: uuidv4(),
    name: "Potion of Fire Breath",
    description: "After drinking this potion, you can exhale fire as an action for 1 hour.",
    weight: 0.5,
    value: 150,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: true,
    effectType: ItemEffectType.StatusEffect,
    useContext: [ItemUseContext.Combat],
    useDescription: "Drink this potion to gain the ability to breathe fire as an action for 1 hour.",
    effectDuration: 60, // 1 hour in minutes
    rarity: ItemRarity.Uncommon,
    attunement: false,
    category: 'potion',
    temporaryEffect: {
      name: "Fire Breath",
      description: "Can exhale fire in a 15-foot cone for 4d6 fire damage (DC 13 DEX save for half damage) as an action."
    },
    properties: ['consumable', 'magical']
  },
  {
    id: uuidv4(),
    name: "Potion of Invisibility",
    description: "This potion's container looks empty but feels as though it holds liquid. When you drink it, you become invisible for 1 hour.",
    weight: 0.5,
    value: 180,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: true,
    effectType: ItemEffectType.StatusEffect,
    useContext: [ItemUseContext.Combat, ItemUseContext.Exploration, ItemUseContext.Social],
    useDescription: "Drink this potion to become invisible for 1 hour",
    effectDuration: 60, // 1 hour in minutes
    rarity: ItemRarity.VeryRare,
    attunement: false,
    category: 'potion',
    properties: ['consumable', 'magical']
  },

  // SCROLLS ----------------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Scroll of Fireball",
    description: "A scroll containing the Fireball spell.",
    weight: 0.1,
    value: 200,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: true,
    effectType: ItemEffectType.SpellCast,
    useContext: [ItemUseContext.Combat],
    useDescription: "Read the scroll to cast Fireball at level 3",
    spellEffect: "Fireball",
    rarity: ItemRarity.Uncommon,
    attunement: false,
    category: 'scroll',
    properties: ['consumable', 'magical', 'scroll']
  },
  {
    id: uuidv4(),
    name: "Scroll of Revivify",
    description: "A scroll containing the Revivify spell.",
    weight: 0.1,
    value: 500,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: true,
    effectType: ItemEffectType.SpellCast,
    useContext: [ItemUseContext.Combat, ItemUseContext.Rest],
    useDescription: "Read the scroll to cast Revivify at level 3",
    spellEffect: "Revivify",
    requiresTarget: true,
    rarity: ItemRarity.Rare,
    attunement: false,
    category: 'scroll',
    properties: ['consumable', 'magical', 'scroll']
  },

  // WANDS ------------------------------------------------------------------------------- 
  {
    id: uuidv4(),
    name: "Wand of Magic Missiles",
    description: "This wand has 7 charges. While holding it, you can use an action to expend 1 or more of its charges to cast the Magic Missile spell from it.",
    weight: 1,
    value: 300,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: false,
    charges: 7,
    maxCharges: 7,
    effectType: ItemEffectType.SpellCast,
    useContext: [ItemUseContext.Combat],
    useDescription: "Use the wand to cast Magic Missile, expending 1 or more charges",
    spellEffect: "Magic Missile",
    requiresTarget: true,
    rarity: ItemRarity.Uncommon,
    attunement: false,
    category: 'wand',
    limitedUses: {
      charges: 7,
      recharge: 'dawn'
    },
    properties: ['magical', 'wand']
  },
  {
    id: uuidv4(),
    name: "Wand of Web",
    description: "This wand has 7 charges. While holding it, you can use an action to expend 1 of its charges to cast the Web spell (save DC 15) from it.",
    weight: 1,
    value: 300,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: false,
    charges: 7,
    maxCharges: 7,
    effectType: ItemEffectType.SpellCast,
    useContext: [ItemUseContext.Combat],
    useDescription: "Use the wand to cast Web, expending 1 charge",
    spellEffect: "Web",
    requiresTarget: true,
    rarity: ItemRarity.Uncommon,
    attunement: false,
    category: 'wand',
    limitedUses: {
      charges: 7,
      recharge: 'dawn'
    },
    properties: ['magical', 'wand']
  },

  // RINGS ------------------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Ring of Protection",
    description: "You gain a +1 bonus to AC and saving throws while wearing this ring.",
    weight: 0.1,
    value: 3500,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: false,
    effectType: ItemEffectType.AttributeBoost,
    useContext: [ItemUseContext.Any],
    useDescription: "Wear this ring to gain +1 to AC and saving throws",
    rarity: ItemRarity.Rare,
    attunement: true,
    category: 'ring',
    properties: ['magical', 'ring']
  },
  {
    id: uuidv4(),
    name: "Ring of Spell Storing",
    description: "This ring stores spells cast into it, holding them until the attuned wearer uses them.",
    weight: 0.1,
    value: 5000,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: false,
    effectType: ItemEffectType.Utility,
    useContext: [ItemUseContext.Any],
    useDescription: "Use to cast a spell stored in the ring",
    rarity: ItemRarity.Rare,
    attunement: true,
    category: 'ring',
    properties: ['magical', 'ring']
  },

  // WEAPONS ---------------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Flame Tongue Longsword",
    description: "You can use a bonus action to speak this magic sword's command word, causing flames to erupt from the blade. These flames shed bright light in a 40-foot radius and dim light for an additional 40 feet. While the sword is ablaze, it deals an extra 2d6 fire damage to any target it hits.",
    weight: 3,
    value: 5000,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: false,
    effectType: ItemEffectType.Utility,
    useContext: [ItemUseContext.Combat],
    useDescription: "Speak the command word to ignite or extinguish the flames on the blade",
    rarity: ItemRarity.Rare,
    attunement: true,
    category: 'weapon',
    properties: ['magical', 'weapon', 'versatile', 'slashing'],
    bonus: {
      attack: 0,
      damage: 0
    },
    temporaryEffect: {
      name: "Flaming Blade",
      description: "Deals additional 2d6 fire damage and sheds light when activated"
    }
  },
  {
    id: uuidv4(),
    name: "Dagger of Venom",
    description: "You can use an action to cause thick, black poison to coat the blade. The poison remains for 1 minute or until an attack using this weapon hits a creature. That creature must succeed on a DC 15 Constitution saving throw or take 2d10 poison damage and become poisoned for 1 minute.",
    weight: 1,
    value: 2000,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: false,
    effectType: ItemEffectType.StatusEffect,
    useContext: [ItemUseContext.Combat],
    useDescription: "Activate the dagger to coat it with poison for 1 minute",
    cooldown: 86400, // 24 hours in seconds
    rarity: ItemRarity.Rare,
    attunement: false,
    category: 'weapon',
    properties: ['magical', 'weapon', 'light', 'finesse', 'thrown', 'piercing'],
    bonus: {
      attack: 1,
      damage: 0
    },
    temporaryEffect: {
      name: "Coated with Poison",
      description: "Next hit forces a DC 15 CON save or target takes 2d10 poison damage and is poisoned for 1 minute",
      duration: 10 // 10 rounds = 1 minute
    }
  },

  // ARMOR ------------------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Cloak of Protection",
    description: "You gain a +1 bonus to AC and saving throws while wearing this cloak.",
    weight: 1,
    value: 3500,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: false,
    effectType: ItemEffectType.AttributeBoost,
    useContext: [ItemUseContext.Any],
    useDescription: "Wear this cloak to gain +1 to AC and saving throws",
    rarity: ItemRarity.Uncommon,
    attunement: true,
    category: 'armor',
    properties: ['magical', 'wearable']
  },
  {
    id: uuidv4(),
    name: "Bracers of Defense",
    description: "While wearing these bracers, you gain a +2 bonus to AC if you are wearing no armor and using no shield.",
    weight: 1,
    value: 6000,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: false,
    effectType: ItemEffectType.AttributeBoost,
    useContext: [ItemUseContext.Any],
    useDescription: "Wear these bracers to gain +2 to AC when wearing no armor and using no shield",
    rarity: ItemRarity.Rare,
    attunement: true,
    category: 'wondrous',
    properties: ['magical', 'wearable']
  },

  // WONDROUS ITEMS ---------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Bag of Holding",
    description: "This bag has an interior space considerably larger than its outside dimensions, roughly 2 feet in diameter at the mouth and 4 feet deep. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. The bag weighs 15 pounds, regardless of its contents.",
    weight: 15,
    value: 4000,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: false,
    effectType: ItemEffectType.Utility,
    useContext: [ItemUseContext.Exploration],
    useDescription: "Store items in the extradimensional space",
    rarity: ItemRarity.Uncommon,
    attunement: false,
    category: 'wondrous',
    properties: ['magical', 'container']
  },
  {
    id: uuidv4(),
    name: "Boots of Elvenkind",
    description: "While you wear these boots, your steps make no sound, regardless of the surface you are moving across. You also have advantage on Dexterity (Stealth) checks that rely on moving silently.",
    weight: 1,
    value: 2500,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: false,
    effectType: ItemEffectType.AttributeBoost,
    useContext: [ItemUseContext.Any],
    useDescription: "Wear these boots to move silently and gain advantage on stealth checks",
    rarity: ItemRarity.Uncommon,
    attunement: false,
    category: 'wondrous',
    properties: ['magical', 'wearable']
  },
  {
    id: uuidv4(),
    name: "Circlet of Blasting",
    description: "While wearing this circlet, you can use an action to cast the Scorching Ray spell with it. When you make the spell's attacks, you do so with an attack bonus of +5. The circlet can't be used this way again until the next dawn.",
    weight: 0.5,
    value: 1500,
    quantity: 1,
    isEquipped: false,
    usable: true,
    consumable: false,
    effectType: ItemEffectType.SpellCast,
    useContext: [ItemUseContext.Combat],
    useDescription: "Use the circlet to cast Scorching Ray",
    spellEffect: "Scorching Ray",
    requiresTarget: true,
    cooldown: 86400, // 24 hours in seconds
    rarity: ItemRarity.Uncommon,
    attunement: false,
    category: 'wondrous',
    limitedUses: {
      perDay: 1
    },
    properties: ['magical', 'wearable']
  }
];

/**
 * Find a magical item by name (case insensitive)
 * @param name The name of the item to find
 * @returns The item object or undefined if not found
 */
export function findItemByName(name: string): MagicalItem | undefined {
  return MAGICAL_ITEMS.find(item => 
    item.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get all items of a specific rarity
 * @param rarity The item rarity
 * @returns Array of items of the specified rarity
 */
export function getItemsByRarity(rarity: ItemRarity): MagicalItem[] {
  return MAGICAL_ITEMS.filter(item => item.rarity === rarity);
}

/**
 * Get all items of a specific category
 * @param category The item category
 * @returns Array of items of the specified category
 */
export function getItemsByCategory(category: string): MagicalItem[] {
  return MAGICAL_ITEMS.filter(item => item.category === category);
}

/**
 * Get all items with a specific effect type
 * @param effectType The effect type to filter by
 * @returns Array of items with the specified effect type
 */
export function getItemsByEffectType(effectType: ItemEffectType): MagicalItem[] {
  return MAGICAL_ITEMS.filter(item => item.effectType === effectType);
}

/**
 * Generate a random magical item based on rarity criteria
 * @param rarityMin Minimum rarity level
 * @param rarityMax Maximum rarity level
 * @returns A random magical item within the specified rarity range
 */
export function getRandomItem(
  rarityMin: ItemRarity = ItemRarity.Common,
  rarityMax: ItemRarity = ItemRarity.Rare
): MagicalItem {
  // Convert rarity enum to numeric value for comparison
  const rarityValues = {
    [ItemRarity.Common]: 0,
    [ItemRarity.Uncommon]: 1,
    [ItemRarity.Rare]: 2,
    [ItemRarity.VeryRare]: 3,
    [ItemRarity.Legendary]: 4,
    [ItemRarity.Artifact]: 5
  };
  
  // Filter items by rarity range
  const eligibleItems = MAGICAL_ITEMS.filter(item => 
    rarityValues[item.rarity] >= rarityValues[rarityMin] && 
    rarityValues[item.rarity] <= rarityValues[rarityMax]
  );
  
  // Select a random item
  const randomIndex = Math.floor(Math.random() * eligibleItems.length);
  return eligibleItems[randomIndex];
}

export default MAGICAL_ITEMS; 