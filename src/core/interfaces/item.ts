// src/core/interfaces/item.ts

/*
 * src/core/interfaces/item.ts
 * This file defines the Item interface and the ItemType type.
 */

// Define a durability object type for structured durability
export interface DurabilityInfo {
  current: number;
  maximum: number;
  condition?: string;
}

export enum ItemCategory {
  Weapon = 'weapon',
  Armor = 'armor',
  Shield = 'shield',
  Potion = 'potion',
  Scroll = 'scroll',
  Wand = 'wand',
  Ring = 'ring',
  Amulet = 'amulet',
  WonderousItem = 'wonderousItem',
  Tool = 'tool',
  Kit = 'kit',
  Consumable = 'consumable',
  Container = 'container',
  Ammunition = 'ammunition',
  Clothing = 'clothing',
  Treasure = 'treasure',
  QuestItem = 'questItem',
  Other = 'other',
  Misc = 'misc'
}

export enum ItemRarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  VeryRare = 'veryRare',
  Legendary = 'legendary',
  Artifact = 'artifact'
}

export interface ItemEffect {
  type: string;
  description: string;
  duration?: number;
  charges?: number;
  maxCharges?: number;
  rechargeable?: boolean;
  rechargeCondition?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  weight: number;
  value: number;
  rarity?: ItemRarity;
  magical?: boolean;
  requiresAttunement?: boolean;
  attuned?: boolean;
  equipped?: boolean;
  effects?: ItemEffect[];
  properties?: string[];
  lore?: string;
  
  // Weapon specific properties
  damage?: {
    diceCount: number;
    diceType: number;
    bonus: number;
    type: string;
  };
  range?: {
    normal: number;
    maximum: number;
  };
  attackBonus?: number;
  
  // Armor specific properties
  armorClass?: number;
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
  
  // Container specific properties
  capacity?: number;
  contains?: Item[];
  
  // Consumable specific properties
  charges?: number;
  uses?: number;
  consumed?: boolean;
  
  // Quest specific properties
  questId?: string;
}

export interface Attack {
  name: string;
  toHit: number;
  damage: string;  // dice notation (e.g., "2d6+3")
  damageType: string;
  range: number;
  properties: string[];
}

export type ItemType = 'weapon' | 'armor' | 'shield' | 'potion' | 'misc';