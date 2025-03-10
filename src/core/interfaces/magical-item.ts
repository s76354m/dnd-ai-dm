/**
 * Magical Item Interfaces
 * 
 * Provides types and interfaces for magical items in the game.
 */

import { Item } from './item';

// Re-export ItemRarity enum from our own file to avoid conflicts
export enum ItemRarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  VeryRare = 'veryRare',
  Legendary = 'legendary',
  Artifact = 'artifact'
}

/**
 * Types of items in the game
 */
export type ItemType = 
  | 'weapon' 
  | 'armor' 
  | 'potion' 
  | 'scroll' 
  | 'wand' 
  | 'rod' 
  | 'ring' 
  | 'amulet'
  | 'staff'
  | 'tool'
  | 'container'
  | 'clothing'
  | 'consumable'
  | 'wondrous'
  | 'ammunition'
  | 'miscellaneous';

/**
 * Extended Item interface for magical items
 */
export interface MagicalItem extends Item {
  isMagical: true;
  rarity: ItemRarity;
  attunement: Attunement;
  charges?: number;
  maxCharges?: number;
  rechargeRate?: string;
  isIdentified: boolean;
  cursed?: boolean;
  curseEffect?: string;
  activationCondition?: string;
  deactivationCondition?: string;
  effectDescription?: string;
  school?: string;
  sourceBook?: string;
  lore?: string;
}

/**
 * Types of magical items
 */
export type MagicalItemType = 
  | 'weapon' 
  | 'armor' 
  | 'potion' 
  | 'scroll' 
  | 'wand' 
  | 'rod' 
  | 'ring' 
  | 'wondrous' 
  | 'staff'
  | 'amulet'
  | 'tome'
  | 'rune';

/**
 * Special magical properties an item can have
 */
export interface MagicalProperty {
  name: string;
  description: string;
  effect: string;
  activation?: 'command word' | 'action' | 'bonus action' | 'passive' | 'special';
  charges?: number;
  usesPerDay?: number;
}

/**
 * Attunement requirements for magical items
 */
export interface Attunement {
  required: boolean;
  restrictedTo?: {
    class?: string[];
    race?: string[];
    alignment?: string[];
    ability?: {
      name: string;
      minimumScore: number;
    }[];
    other?: string;
  };
  attuned: boolean;
  attunedTo?: string; // Character ID
}

/**
 * Attunement requirement for magical items
 */
export type AttunementRequirement = {
  required: boolean;
  restrictedTo?: string[]; // Class, race, alignment, or other restrictions
};

/**
 * Types of enchantments that can be applied to items
 */
export type EnchantmentType = 
  | 'weapon' 
  | 'armor' 
  | 'utility' 
  | 'spell' 
  | 'ability' 
  | 'resistance' 
  | 'immunity' 
  | 'special';

/**
 * Enchantment definition - a magical property that can be applied to an item
 */
export interface Enchantment {
  id: string;
  name: string;
  description: string;
  type: string;
  itemTypeRestrictions?: ItemType[]; // Which item types this can be applied to
  rarity: ItemRarity;
  modifiers?: {
    type: string;         // e.g., 'ability', 'skill', 'attack', 'damage', 'ac'
    target: string;       // What it modifies (e.g., 'strength', 'perception', 'melee')
    value: number | string; // Modifier value (number or dice formula)
  }[];
  charges?: {
    max: number;
    recharge: 'dawn' | 'dusk' | 'short rest' | 'long rest' | 'never' | string;
    depletion?: {
      threshold: number;   // Number of charges that trigger depletion roll
      chance: number;      // Percentage chance item is destroyed (1-100)
    };
  };
  spells?: {
    name: string;
    level: number;
    charges: number;      // Charges required to cast
    savedc?: number;      // Optional override for spell save DC
  }[];
  activationRequirement?: 'action' | 'bonus action' | 'reaction' | 'minute' | 'hour' | 'special';
  curseEffect?: string;   // Description of curse if the item is cursed
}

/**
 * Loot table probability entry
 */
export interface LootTableEntry {
  itemId: string;
  weight: number;        // Relative probability weight
  minLevel?: number;     // Minimum character level for this item to drop
  maxLevel?: number;     // Maximum character level for this item to drop
  dropChance: number;    // Base percentage chance (0-100)
  quantity?: {          // Optional quantity range
    min: number;
    max: number;
  };
  conditions?: {        // Additional drop conditions
    enemyTypes?: string[];
    locations?: string[];
    questRelated?: boolean;
    bossOnly?: boolean;
  };
}

/**
 * Loot table for different scenarios
 */
export interface LootTable {
  id: string;
  name: string;
  description: string;
  entries: LootTableEntry[];
  fallbackItemId?: string; // Guaranteed item if nothing else drops
} 