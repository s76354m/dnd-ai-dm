/**
 * Equipment Modification System
 * 
 * Handles item upgrading, customization, repair, and enhancement
 */

import { Character } from '../core/interfaces/character';
import { Item } from '../core/interfaces/item';
import { MagicalItem } from '../core/interfaces/magical-item';
import { v4 as uuidv4 } from 'uuid';
import { inventoryManager } from '../character/inventory';
import { Currency, economyManager, EMPTY_CURRENCY } from '../economy/economy-manager';

/**
 * Modification types
 */
export enum ModificationType {
  Upgrade = 'upgrade', // Increases item tier/quality
  Repair = 'repair', // Fixes damaged items
  Customize = 'customize', // Aesthetic changes, rename, descriptions
  Enchant = 'enchant', // Add magical properties
  Reinforce = 'reinforce', // Increase durability
  Reforge = 'reforge', // Change item properties/attributes
  Masterwork = 'masterwork' // Convert normal item to masterwork quality
}

/**
 * Condition of an item
 */
export enum ItemCondition {
  Broken = 'broken', // Unusable, needs repair
  Damaged = 'damaged', // Usable but with penalties
  Worn = 'worn', // Usable but degrading
  Normal = 'normal', // Standard condition
  Good = 'good', // Better than normal
  Excellent = 'excellent', // Peak condition
  Pristine = 'pristine' // Perfect condition
}

/**
 * Item quality/tier
 */
export enum ItemQuality {
  Poor = 'poor', // -1 to relevant checks/attacks
  Standard = 'standard', // Standard item
  Fine = 'fine', // Well crafted
  Superior = 'superior', // Expertly crafted
  Exceptional = 'exceptional', // Master craftsmanship
  Masterwork = 'masterwork' // +1 to relevant checks/attacks, can be enchanted
}

/**
 * Material types
 */
export enum MaterialType {
  // Basic materials
  Wood = 'wood',
  Iron = 'iron',
  Steel = 'steel',
  Leather = 'leather',
  Cloth = 'cloth',
  
  // Special materials
  Mithral = 'mithral', // Lighter weight
  Adamantine = 'adamantine', // Harder, bypasses DR
  DragonHide = 'dragonhide', // Resistant to elements
  Darkwood = 'darkwood', // Lighter wood
  ElvenSteel = 'elvenSteel', // Flexible, sharper
  ColdIron = 'coldIron', // Effective against fey
  Silver = 'silver', // Effective against were-creatures and devils
  
  // Exotic materials
  CelestialBronze = 'celestialBronze', // Harm fiends
  AbyssalIron = 'abyssalIron', // Harm celestials
  Obsidian = 'obsidian', // Razor-sharp
  AncientStone = 'ancientStone' // Nearly unbreakable
}

/**
 * Material properties
 */
export interface MaterialProperties {
  name: string;
  weight: number; // Multiplier to base weight
  hardness: number; // Resistance to damage
  hpModifier: number; // Multiplier to base HP
  costModifier: number; // Multiplier to base cost
  properties: string[]; // Special properties
  description: string;
}

/**
 * Material definitions
 */
export const MATERIAL_PROPERTIES: Record<MaterialType, MaterialProperties> = {
  [MaterialType.Wood]: {
    name: 'Wood',
    weight: 1.0,
    hardness: 5,
    hpModifier: 1.0,
    costModifier: 1.0,
    properties: ['flammable', 'light'],
    description: 'Common wood, used for many items and handles.'
  },
  [MaterialType.Iron]: {
    name: 'Iron',
    weight: 1.0,
    hardness: 10,
    hpModifier: 1.0,
    costModifier: 1.0,
    properties: ['metal', 'ferrous'],
    description: 'Common iron, the standard metal for many items.'
  },
  [MaterialType.Steel]: {
    name: 'Steel',
    weight: 1.0,
    hardness: 15,
    hpModifier: 1.2,
    costModifier: 1.5,
    properties: ['metal', 'ferrous', 'durable'],
    description: 'Refined iron with carbon, stronger and more durable.'
  },
  [MaterialType.Leather]: {
    name: 'Leather',
    weight: 0.8,
    hardness: 2,
    hpModifier: 0.8,
    costModifier: 1.0,
    properties: ['flexible', 'light'],
    description: 'Treated animal hide, used for armor and bindings.'
  },
  [MaterialType.Cloth]: {
    name: 'Cloth',
    weight: 0.5,
    hardness: 1,
    hpModifier: 0.5,
    costModifier: 1.0,
    properties: ['flexible', 'flammable', 'very light'],
    description: 'Woven fabric, used for clothing and light items.'
  },
  [MaterialType.Mithral]: {
    name: 'Mithral',
    weight: 0.5,
    hardness: 15,
    hpModifier: 1.0,
    costModifier: 10.0,
    properties: ['metal', 'light', 'rare', 'magical'],
    description: 'Extremely light and durable metal, prized for armor.'
  },
  [MaterialType.Adamantine]: {
    name: 'Adamantine',
    weight: 1.5,
    hardness: 25,
    hpModifier: 2.0,
    costModifier: 15.0,
    properties: ['metal', 'heavy', 'rare', 'magical', 'bypass hardness'],
    description: 'Incredibly hard metal that can cut through almost anything.'
  },
  [MaterialType.DragonHide]: {
    name: 'Dragon Hide',
    weight: 0.8,
    hardness: 15,
    hpModifier: 1.5,
    costModifier: 12.0,
    properties: ['scales', 'rare', 'elemental resistance'],
    description: 'Scales from dragons, resistant to elemental damage.'
  },
  [MaterialType.Darkwood]: {
    name: 'Darkwood',
    weight: 0.5,
    hardness: 10,
    hpModifier: 1.2,
    costModifier: 8.0,
    properties: ['wood', 'light', 'rare', 'magical'],
    description: 'Magical wood that is as strong as metal but lighter.'
  },
  [MaterialType.ElvenSteel]: {
    name: 'Elven Steel',
    weight: 0.8,
    hardness: 17,
    hpModifier: 1.3,
    costModifier: 7.0,
    properties: ['metal', 'light', 'sharp', 'flexible'],
    description: 'Metal alloy crafted by elves, remarkably light and sharp.'
  },
  [MaterialType.ColdIron]: {
    name: 'Cold Iron',
    weight: 1.2,
    hardness: 12,
    hpModifier: 1.1,
    costModifier: 4.0,
    properties: ['metal', 'ferrous', 'fey bane'],
    description: 'Iron forged with special techniques, effective against fey creatures.'
  },
  [MaterialType.Silver]: {
    name: 'Silver',
    weight: 1.0,
    hardness: 8,
    hpModifier: 0.9,
    costModifier: 5.0,
    properties: ['metal', 'precious', 'lycanthrope bane', 'devil bane'],
    description: 'Pure silver, effective against werewolves and certain fiends.'
  },
  [MaterialType.CelestialBronze]: {
    name: 'Celestial Bronze',
    weight: 0.9,
    hardness: 18,
    hpModifier: 1.4,
    costModifier: 18.0,
    properties: ['metal', 'rare', 'magical', 'glowing', 'fiend bane'],
    description: 'Divine metal that harms fiends and evil outsiders.'
  },
  [MaterialType.AbyssalIron]: {
    name: 'Abyssal Iron',
    weight: 1.1,
    hardness: 18,
    hpModifier: 1.4,
    costModifier: 18.0,
    properties: ['metal', 'rare', 'magical', 'dark', 'celestial bane'],
    description: 'Demonic metal that harms celestials and good outsiders.'
  },
  [MaterialType.Obsidian]: {
    name: 'Obsidian',
    weight: 1.3,
    hardness: 14,
    hpModifier: 0.8,
    costModifier: 9.0,
    properties: ['stone', 'brittle', 'sharp', 'magical'],
    description: 'Volcanic glass, extremely sharp but somewhat brittle.'
  },
  [MaterialType.AncientStone]: {
    name: 'Ancient Stone',
    weight: 1.8,
    hardness: 22,
    hpModifier: 1.7,
    costModifier: 14.0,
    properties: ['stone', 'heavy', 'magical', 'indestructible'],
    description: 'Stone imbued with ancient magic, nearly indestructible.'
  }
};

/**
 * Item durability
 */
export interface Durability {
  current: number;
  maximum: number;
  condition: ItemCondition;
}

/**
 * Requirement for a modification
 */
export interface ModificationRequirement {
  requiredMaterials?: { itemId: string; quantity: number }[];
  requiredCurrency?: Currency;
  requiredSkill?: string;
  minimumSkillValue?: number;
  requiredTool?: string;
  requiredLocation?: string; // e.g., "forge", "enchanting table"
  requiredTime?: number; // in minutes
}

/**
 * Modification result
 */
export interface ModificationResult {
  success: boolean;
  message: string;
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
  item?: Item; // Updated item if successful
  materialsConsumed?: { itemId: string; quantity: number }[];
  currencyConsumed?: Currency;
}

/**
 * Custom visual effect for an item
 */
export interface CustomVisual {
  color?: string;
  pattern?: string;
  glow?: string;
  particleEffect?: string;
  size?: 'small' | 'normal' | 'large';
  style?: string;
}

/**
 * Equipment modifier class
 */
export class EquipmentModifier {
  /**
   * Get the condition of an item based on durability
   */
  public getItemCondition(item: Item): ItemCondition {
    if (!item.durability) {
      return ItemCondition.Normal; // Default condition
    }
    
    const ratio = item.durability.current / item.durability.maximum;
    
    if (ratio <= 0) return ItemCondition.Broken;
    if (ratio < 0.25) return ItemCondition.Damaged;
    if (ratio < 0.5) return ItemCondition.Worn;
    if (ratio < 0.75) return ItemCondition.Normal;
    if (ratio < 0.9) return ItemCondition.Good;
    if (ratio < 1) return ItemCondition.Excellent;
    return ItemCondition.Pristine;
  }
  
  /**
   * Initialize durability for an item if not present
   */
  public initializeDurability(item: Item): Item {
    if (item.durability) {
      return item; // Already has durability
    }
    
    // Calculate base durability based on item type and material
    let baseDurability = 100; // Default
    
    // Adjust based on item properties
    if (item.properties.includes('fragile')) {
      baseDurability = 50;
    } else if (item.properties.includes('robust')) {
      baseDurability = 150;
    } else if (item.properties.includes('indestructible')) {
      baseDurability = 1000;
    }
    
    // Adjust based on material if present
    if (item.material) {
      const materialProps = MATERIAL_PROPERTIES[item.material as MaterialType];
      if (materialProps) {
        baseDurability = Math.floor(baseDurability * materialProps.hpModifier);
      }
    }
    
    return {
      ...item,
      durability: {
        current: baseDurability,
        maximum: baseDurability,
        condition: ItemCondition.Normal
      }
    };
  }
  
  /**
   * Apply damage to an item
   */
  public damageItem(item: Item, damageAmount: number): Item {
    if (!item.durability) {
      item = this.initializeDurability(item);
    }
    
    const newDurability = Math.max(0, item.durability.current - damageAmount);
    const updatedItem = {
      ...item,
      durability: {
        ...item.durability,
        current: newDurability,
        condition: this.getItemCondition({
          ...item,
          durability: {
            ...item.durability,
            current: newDurability
          }
        })
      }
    };
    
    return updatedItem;
  }
  
  /**
   * Repair an item
   */
  public repairItem(
    character: Character,
    itemId: string,
    repairAmount?: number
  ): { character: Character; result: ModificationResult } {
    // Find the item in character's inventory
    const itemIndex = character.inventory?.findIndex(item => item.id === itemId);
    
    if (itemIndex === undefined || itemIndex === -1 || !character.inventory) {
      return {
        character,
        result: {
          success: false,
          message: "Item not found in inventory."
        }
      };
    }
    
    const item = character.inventory[itemIndex];
    
    // Initialize durability if not present
    if (!item.durability) {
      item.durability = {
        current: 100,
        maximum: 100,
        condition: ItemCondition.Normal
      };
    }
    
    // Check if item needs repair
    if (item.durability.current >= item.durability.maximum) {
      return {
        character,
        result: {
          success: false,
          message: "Item is already in perfect condition."
        }
      };
    }
    
    // Calculate repair amount if not specified
    if (!repairAmount) {
      // Default to 25% of maximum durability
      repairAmount = Math.ceil(item.durability.maximum * 0.25);
    }
    
    // Calculate repair cost
    const baseItemValue = item.value;
    const repairRatio = repairAmount / item.durability.maximum;
    const repairCost = Math.ceil(baseItemValue * repairRatio * 0.1); // 10% of item value for full repair
    
    // Check if character has enough currency
    const repairCostCurrency = economyManager.copperToCurrency(repairCost);
    
    if (!character.currency) {
      character.currency = { ...EMPTY_CURRENCY };
    }
    
    const characterCurrency = economyManager.currencyToCopper(character.currency);
    
    if (characterCurrency < repairCost) {
      return {
        character,
        result: {
          success: false,
          message: `Not enough currency for repair. Repair costs ${economyManager.formatCurrency(repairCostCurrency)}.`
        }
      };
    }
    
    // Perform repair
    const newDurability = Math.min(
      item.durability.maximum,
      item.durability.current + repairAmount
    );
    
    const repairedItem = {
      ...item,
      durability: {
        ...item.durability,
        current: newDurability,
        condition: this.getItemCondition({
          ...item,
          durability: {
            ...item.durability,
            current: newDurability
          }
        })
      }
    };
    
    // Deduct currency
    const updatedCurrency = economyManager.subtractCurrency(character.currency, repairCostCurrency);
    
    if (!updatedCurrency) {
      return {
        character,
        result: {
          success: false,
          message: "Failed to process currency for repair."
        }
      };
    }
    
    // Update character
    const updatedInventory = [...character.inventory];
    updatedInventory[itemIndex] = repairedItem;
    
    const updatedCharacter = {
      ...character,
      inventory: updatedInventory,
      currency: updatedCurrency
    };
    
    return {
      character: updatedCharacter,
      result: {
        success: true,
        message: `Successfully repaired ${item.name}. Durability increased by ${repairAmount}.`,
        item: repairedItem,
        currencyConsumed: repairCostCurrency
      }
    };
  }
  
  /**
   * Upgrade an item's quality
   */
  public upgradeItemQuality(
    character: Character,
    itemId: string
  ): { character: Character; result: ModificationResult } {
    // Find the item in character's inventory
    const itemIndex = character.inventory?.findIndex(item => item.id === itemId);
    
    if (itemIndex === undefined || itemIndex === -1 || !character.inventory) {
      return {
        character,
        result: {
          success: false,
          message: "Item not found in inventory."
        }
      };
    }
    
    const item = character.inventory[itemIndex];
    
    // Get current quality or default to standard
    const currentQuality = item.quality as ItemQuality || ItemQuality.Standard;
    
    // Check if already at max quality
    if (currentQuality === ItemQuality.Masterwork) {
      return {
        character,
        result: {
          success: false,
          message: "Item is already at maximum quality (Masterwork)."
        }
      };
    }
    
    // Determine next quality level
    let nextQuality: ItemQuality;
    switch (currentQuality) {
      case ItemQuality.Poor:
        nextQuality = ItemQuality.Standard;
        break;
      case ItemQuality.Standard:
        nextQuality = ItemQuality.Fine;
        break;
      case ItemQuality.Fine:
        nextQuality = ItemQuality.Superior;
        break;
      case ItemQuality.Superior:
        nextQuality = ItemQuality.Exceptional;
        break;
      case ItemQuality.Exceptional:
        nextQuality = ItemQuality.Masterwork;
        break;
      default:
        nextQuality = ItemQuality.Fine; // Fallback
    }
    
    // Calculate upgrade cost (increases with higher tiers)
    const baseItemValue = item.value;
    let costMultiplier = 0;
    
    switch (nextQuality) {
      case ItemQuality.Standard:
        costMultiplier = 0.2; // 20% of item value
        break;
      case ItemQuality.Fine:
        costMultiplier = 0.5; // 50% of item value
        break;
      case ItemQuality.Superior:
        costMultiplier = 1.0; // 100% of item value
        break;
      case ItemQuality.Exceptional:
        costMultiplier = 2.0; // 200% of item value
        break;
      case ItemQuality.Masterwork:
        costMultiplier = 4.0; // 400% of item value
        break;
      default:
        costMultiplier = 0.5;
    }
    
    const upgradeCost = Math.ceil(baseItemValue * costMultiplier);
    const upgradeCostCurrency = economyManager.copperToCurrency(upgradeCost);
    
    // Check if character has enough currency
    if (!character.currency) {
      character.currency = { ...EMPTY_CURRENCY };
    }
    
    const characterCurrency = economyManager.currencyToCopper(character.currency);
    
    if (characterCurrency < upgradeCost) {
      return {
        character,
        result: {
          success: false,
          message: `Not enough currency for upgrade. Upgrade costs ${economyManager.formatCurrency(upgradeCostCurrency)}.`
        }
      };
    }
    
    // Perform upgrade
    const upgradedItem = {
      ...item,
      quality: nextQuality,
      value: Math.ceil(baseItemValue * (1 + costMultiplier * 0.5)) // Increase item value
    };
    
    // If upgrading to masterwork, add special properties
    if (nextQuality === ItemQuality.Masterwork) {
      // Add masterwork property
      const properties = Array.isArray(upgradedItem.properties) 
        ? [...upgradedItem.properties, 'masterwork'] 
        : ['masterwork'];
      
      // For weapons, add +1 to attack rolls
      // For armor, reduce armor check penalty
      // For tools, add +2 to relevant skill checks
      upgradedItem.properties = properties;
      
      // Add or improve bonus property
      if (!upgradedItem.bonus) {
        if (upgradedItem.properties.includes('weapon')) {
          upgradedItem.bonus = { attack: 1 };
        } else if (upgradedItem.properties.includes('armor')) {
          upgradedItem.bonus = { armorCheckPenalty: -1 };
        } else if (upgradedItem.properties.includes('tool')) {
          upgradedItem.bonus = { skillCheck: 2 };
        }
      }
    }
    
    // Deduct currency
    const updatedCurrency = economyManager.subtractCurrency(character.currency, upgradeCostCurrency);
    
    if (!updatedCurrency) {
      return {
        character,
        result: {
          success: false,
          message: "Failed to process currency for upgrade."
        }
      };
    }
    
    // Update character
    const updatedInventory = [...character.inventory];
    updatedInventory[itemIndex] = upgradedItem;
    
    const updatedCharacter = {
      ...character,
      inventory: updatedInventory,
      currency: updatedCurrency
    };
    
    return {
      character: updatedCharacter,
      result: {
        success: true,
        message: `Successfully upgraded ${item.name} to ${nextQuality} quality.`,
        item: upgradedItem,
        currencyConsumed: upgradeCostCurrency
      }
    };
  }
  
  /**
   * Change the material of an item
   */
  public changeMaterial(
    character: Character,
    itemId: string,
    newMaterial: MaterialType
  ): { character: Character; result: ModificationResult } {
    // Find the item in character's inventory
    const itemIndex = character.inventory?.findIndex(item => item.id === itemId);
    
    if (itemIndex === undefined || itemIndex === -1 || !character.inventory) {
      return {
        character,
        result: {
          success: false,
          message: "Item not found in inventory."
        }
      };
    }
    
    const item = character.inventory[itemIndex];
    
    // Check if already made of this material
    if (item.material === newMaterial) {
      return {
        character,
        result: {
          success: false,
          message: `Item is already made of ${MATERIAL_PROPERTIES[newMaterial].name}.`
        }
      };
    }
    
    // Get material properties
    const materialProps = MATERIAL_PROPERTIES[newMaterial];
    
    // Check if material is compatible with item
    const isWeapon = item.properties.includes('weapon');
    const isArmor = item.properties.includes('armor');
    const isWearable = item.properties.includes('wearable');
    
    let compatible = true;
    let incompatibilityReason = '';
    
    // Check for specific incompatibilities
    if (isWearable && newMaterial === MaterialType.Obsidian) {
      compatible = false;
      incompatibilityReason = 'Obsidian is too brittle for wearable items.';
    } else if (isWeapon && newMaterial === MaterialType.Cloth) {
      compatible = false;
      incompatibilityReason = 'Cloth is not suitable for weapons.';
    }
    
    if (!compatible) {
      return {
        character,
        result: {
          success: false,
          message: `Cannot change to ${materialProps.name}: ${incompatibilityReason}`
        }
      };
    }
    
    // Calculate cost to change material
    const baseItemValue = item.value;
    const costMultiplier = materialProps.costModifier;
    const changeCost = Math.ceil(baseItemValue * (costMultiplier - 0.5));
    const changeCostCurrency = economyManager.copperToCurrency(changeCost);
    
    // Check if character has enough currency
    if (!character.currency) {
      character.currency = { ...EMPTY_CURRENCY };
    }
    
    const characterCurrency = economyManager.currencyToCopper(character.currency);
    
    if (characterCurrency < changeCost) {
      return {
        character,
        result: {
          success: false,
          message: `Not enough currency to change material. Cost: ${economyManager.formatCurrency(changeCostCurrency)}.`
        }
      };
    }
    
    // Perform material change
    const originalWeight = item.weight;
    const modifiedItem = {
      ...item,
      material: newMaterial,
      weight: Math.round(originalWeight * materialProps.weight * 100) / 100,
      value: Math.ceil(baseItemValue * costMultiplier),
      durability: item.durability ? {
        current: Math.ceil(item.durability.current * materialProps.hpModifier),
        maximum: Math.ceil(item.durability.maximum * materialProps.hpModifier),
        condition: item.durability.condition
      } : undefined
    };
    
    // Update item name to reflect material if not a magical item
    if (!(modifiedItem as MagicalItem).isMagical) {
      modifiedItem.name = `${materialProps.name} ${modifiedItem.name.replace(/^(iron|steel|wooden|leather|cloth|mithral|adamantine|silver|obsidian|cold iron|darkwood|dragon hide).+?/i, '')}`;
    }
    
    // Add material properties to item properties
    const properties = Array.isArray(modifiedItem.properties) 
      ? [...modifiedItem.properties] 
      : [];
    
    // Remove existing material properties
    const materialPropertyValues = Object.values(MaterialType);
    modifiedItem.properties = properties.filter(
      prop => !materialPropertyValues.includes(prop as MaterialType)
    );
    
    // Add new material properties
    materialProps.properties.forEach(prop => {
      if (!modifiedItem.properties.includes(prop)) {
        modifiedItem.properties.push(prop);
      }
    });
    
    // Deduct currency
    const updatedCurrency = economyManager.subtractCurrency(character.currency, changeCostCurrency);
    
    if (!updatedCurrency) {
      return {
        character,
        result: {
          success: false,
          message: "Failed to process currency for material change."
        }
      };
    }
    
    // Update character
    const updatedInventory = [...character.inventory];
    updatedInventory[itemIndex] = modifiedItem;
    
    const updatedCharacter = {
      ...character,
      inventory: updatedInventory,
      currency: updatedCurrency
    };
    
    return {
      character: updatedCharacter,
      result: {
        success: true,
        message: `Successfully changed ${item.name} material to ${materialProps.name}.`,
        item: modifiedItem,
        currencyConsumed: changeCostCurrency
      }
    };
  }
  
  /**
   * Customize item appearance
   */
  public customizeAppearance(
    character: Character,
    itemId: string,
    customization: {
      name?: string;
      description?: string;
      visual?: CustomVisual;
    }
  ): { character: Character; result: ModificationResult } {
    // Find the item in character's inventory
    const itemIndex = character.inventory?.findIndex(item => item.id === itemId);
    
    if (itemIndex === undefined || itemIndex === -1 || !character.inventory) {
      return {
        character,
        result: {
          success: false,
          message: "Item not found in inventory."
        }
      };
    }
    
    const item = character.inventory[itemIndex];
    
    // Calculate customization cost
    let baseCost = 5; // Base cost in silver
    
    if (customization.name) baseCost += 5;
    if (customization.description) baseCost += 5;
    if (customization.visual) {
      if (customization.visual.color) baseCost += 2;
      if (customization.visual.pattern) baseCost += 3;
      if (customization.visual.glow) baseCost += 10;
      if (customization.visual.particleEffect) baseCost += 15;
      if (customization.visual.style) baseCost += 5;
    }
    
    // Convert to copper
    const customizationCost = baseCost * 10; // Convert silver to copper
    const customizationCostCurrency = economyManager.copperToCurrency(customizationCost);
    
    // Check if character has enough currency
    if (!character.currency) {
      character.currency = { ...EMPTY_CURRENCY };
    }
    
    const characterCurrency = economyManager.currencyToCopper(character.currency);
    
    if (characterCurrency < customizationCost) {
      return {
        character,
        result: {
          success: false,
          message: `Not enough currency for customization. Cost: ${economyManager.formatCurrency(customizationCostCurrency)}.`
        }
      };
    }
    
    // Apply customizations
    const customizedItem = { ...item };
    
    if (customization.name) {
      customizedItem.name = customization.name;
    }
    
    if (customization.description) {
      customizedItem.description = customization.description;
    }
    
    if (customization.visual) {
      customizedItem.visual = {
        ...item.visual,
        ...customization.visual
      };
    }
    
    // Deduct currency
    const updatedCurrency = economyManager.subtractCurrency(character.currency, customizationCostCurrency);
    
    if (!updatedCurrency) {
      return {
        character,
        result: {
          success: false,
          message: "Failed to process currency for customization."
        }
      };
    }
    
    // Update character
    const updatedInventory = [...character.inventory];
    updatedInventory[itemIndex] = customizedItem;
    
    const updatedCharacter = {
      ...character,
      inventory: updatedInventory,
      currency: updatedCurrency
    };
    
    return {
      character: updatedCharacter,
      result: {
        success: true,
        message: `Successfully customized ${item.name}.`,
        item: customizedItem,
        currencyConsumed: customizationCostCurrency
      }
    };
  }
  
  /**
   * Reinforce an item to improve durability
   */
  public reinforceItem(
    character: Character,
    itemId: string
  ): { character: Character; result: ModificationResult } {
    // Find the item in character's inventory
    const itemIndex = character.inventory?.findIndex(item => item.id === itemId);
    
    if (itemIndex === undefined || itemIndex === -1 || !character.inventory) {
      return {
        character,
        result: {
          success: false,
          message: "Item not found in inventory."
        }
      };
    }
    
    const item = character.inventory[itemIndex];
    
    // Initialize durability if not present
    let currentItem = item;
    if (!currentItem.durability) {
      currentItem = this.initializeDurability(currentItem);
    }
    
    // Calculate reinforcement bonus (25% increase in max durability)
    const durabilityBonus = Math.ceil(currentItem.durability.maximum * 0.25);
    
    // Calculate cost (30% of item value)
    const reinforcementCost = Math.ceil(currentItem.value * 0.3);
    const reinforcementCostCurrency = economyManager.copperToCurrency(reinforcementCost);
    
    // Check if character has enough currency
    if (!character.currency) {
      character.currency = { ...EMPTY_CURRENCY };
    }
    
    const characterCurrency = economyManager.currencyToCopper(character.currency);
    
    if (characterCurrency < reinforcementCost) {
      return {
        character,
        result: {
          success: false,
          message: `Not enough currency for reinforcement. Cost: ${economyManager.formatCurrency(reinforcementCostCurrency)}.`
        }
      };
    }
    
    // Apply reinforcement
    const newMaxDurability = currentItem.durability.maximum + durabilityBonus;
    
    const reinforcedItem = {
      ...currentItem,
      durability: {
        current: currentItem.durability.current + durabilityBonus, // Also heal the item
        maximum: newMaxDurability,
        condition: currentItem.durability.condition
      },
      properties: currentItem.properties.includes('reinforced')
        ? currentItem.properties
        : [...currentItem.properties, 'reinforced']
    };
    
    // Deduct currency
    const updatedCurrency = economyManager.subtractCurrency(character.currency, reinforcementCostCurrency);
    
    if (!updatedCurrency) {
      return {
        character,
        result: {
          success: false,
          message: "Failed to process currency for reinforcement."
        }
      };
    }
    
    // Update character
    const updatedInventory = [...character.inventory];
    updatedInventory[itemIndex] = reinforcedItem;
    
    const updatedCharacter = {
      ...character,
      inventory: updatedInventory,
      currency: updatedCurrency
    };
    
    return {
      character: updatedCharacter,
      result: {
        success: true,
        message: `Successfully reinforced ${item.name}. Maximum durability increased by ${durabilityBonus}.`,
        item: reinforcedItem,
        currencyConsumed: reinforcementCostCurrency
      }
    };
  }

  /**
   * Enhances an item with magical properties
   * @param character - The character who owns the item
   * @param itemId - The ID of the item to enhance
   * @param enhancementType - The type of enhancement to apply
   * @returns Character with enhanced item and result of enhancement
   */
  public enhanceItem(
    character: Character,
    itemId: string,
    enhancementType: string
  ): { character: Character; result: ModificationResult } {
    // Find the item in the character's inventory
    const item = character.inventory.find(i => i.id === itemId);
    
    if (!item) {
      return {
        character,
        result: {
          success: false,
          message: `Item with ID ${itemId} not found in inventory.`
        }
      };
    }
    
    // Check if item is of a type that can be enhanced
    if (!item.properties.some(p => ['weapon', 'armor', 'shield', 'wand', 'staff', 'rod'].includes(p))) {
      return {
        character,
        result: {
          success: false,
          message: `This item cannot be enhanced.`
        }
      };
    }
    
    // Check if the item is already of masterwork quality or better
    const itemIsUpgradeable = item.properties.includes('masterwork') || 
                             item.properties.some(p => p.startsWith('+'));
    
    if (!itemIsUpgradeable) {
      return {
        character,
        result: {
          success: false,
          message: `This item must be of masterwork quality or better to be enhanced.`
        }
      };
    }
    
    // Apply the enhancement
    const enhancedItem = { ...item };
    let enhancementCost = 0;
    let enhancementDescription = '';
    
    switch(enhancementType) {
      case 'fire':
        enhancedItem.properties.push('fire');
        enhancementDescription = 'flaming';
        enhancementCost = 2000;
        break;
      case 'frost':
        enhancedItem.properties.push('frost');
        enhancementDescription = 'frost';
        enhancementCost = 2000;
        break;
      case 'shock':
        enhancedItem.properties.push('shock');
        enhancementDescription = 'shocking';
        enhancementCost = 2000;
        break;
      case 'holy':
        enhancedItem.properties.push('holy');
        enhancementDescription = 'holy';
        enhancementCost = 4000;
        break;
      case 'unholy':
        enhancedItem.properties.push('unholy');
        enhancementDescription = 'unholy';
        enhancementCost = 4000;
        break;
      case 'keen':
        enhancedItem.properties.push('keen');
        enhancementDescription = 'keen';
        enhancementCost = 2000;
        break;
      default:
        return {
          character,
          result: {
            success: false,
            message: `Unknown enhancement type: ${enhancementType}`
          }
        };
    }
    
    // Check if the character has enough gold
    if (character.wealth.gold < enhancementCost) {
      return {
        character,
        result: {
          success: false,
          message: `Not enough gold. Enhancement costs ${enhancementCost} gold pieces.`
        }
      };
    }
    
    // Update item name and description
    enhancedItem.name = `${enhancedItem.name} of ${enhancementDescription}`;
    enhancedItem.description = `${enhancedItem.description} This item has been enhanced with ${enhancementDescription} properties.`;
    
    // Update character's inventory and wealth
    const updatedInventory = character.inventory.map(i => 
      i.id === itemId ? enhancedItem : i
    );
    
    const updatedCharacter = {
      ...character,
      inventory: updatedInventory,
      wealth: {
        ...character.wealth,
        gold: character.wealth.gold - enhancementCost
      }
    };
    
    return {
      character: updatedCharacter,
      result: {
        success: true,
        message: `Successfully enhanced ${item.name} with ${enhancementDescription} properties.`,
        item: enhancedItem,
        currencyConsumed: {
          ...EMPTY_CURRENCY,
          gold: enhancementCost
        }
      }
    };
  }

  // Simple enhance method for backward compatibility with tests
  public enhance(item: Item, enhancements: { attack?: number; damage?: number; ac?: number }): Item {
    const result = { ...item };
    
    // Initialize bonus property if it doesn't exist
    if (!result.bonus) {
      result.bonus = {};
    }
    
    // Apply enhancements
    if (enhancements.attack !== undefined) {
      result.bonus.attack = (result.bonus.attack || 0) + enhancements.attack;
    }
    
    if (enhancements.damage !== undefined) {
      result.bonus.damage = (result.bonus.damage || 0) + enhancements.damage;
    }
    
    if (enhancements.ac !== undefined) {
      result.bonus.ac = (result.bonus.ac || 0) + enhancements.ac;
    }
    
    // Increase item value based on enhancements
    const totalBonus = (enhancements.attack || 0) + (enhancements.damage || 0) + (enhancements.ac || 0);
    result.value = item.value * (1 + (totalBonus * 0.5));
    
    return result;
  }

  // Simple repair method for backward compatibility with tests
  public repair(item: Item, repairAmount: number): Item {
    const result = { ...item };
    
    // Initialize durability if it doesn't exist
    if (!result.durability) {
      result.durability = {
        current: 50,
        maximum: 100,
        condition: 'normal'
      };
    }
    
    // Increase current durability
    if (typeof result.durability === 'object') {
      result.durability.current += repairAmount;
      
      // Cap durability at max value
      if (result.durability.current > result.durability.maximum) {
        result.durability.current = result.durability.maximum;
      }
    }
    
    return result;
  }

  // Simple changeMaterial method for backward compatibility with tests
  public changeMaterialLegacy(character: Character, itemId: string, newMaterial: string): { character: Character; result: { success: boolean, message: string, item: Item } } {
    // Find the item in the character's inventory
    const itemIndex = character.inventory.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return { 
        character,
        result: { 
          success: false, 
          message: 'Item not found', 
          item: null as unknown as Item 
        }
      };
    }
    
    const oldItem = character.inventory[itemIndex];
    
    // Create a new item with the new material
    const newItem = { ...oldItem };
    
    // Update the item name to include the material
    newItem.name = newItem.name.replace(/Iron|Steel|Wood|Leather|Silver|Gold|Mithral|Adamantine/i, '');
    newItem.name = `${newMaterial.charAt(0).toUpperCase() + newMaterial.slice(1)} ${newItem.name.trim()}`;
    
    // Update the properties
    newItem.properties = newItem.properties.filter(prop => 
      !['iron', 'steel', 'wood', 'leather', 'silver', 'gold', 'mithral', 'adamantine'].includes(prop.toLowerCase())
    );
    newItem.properties.push(newMaterial.toLowerCase());
    
    // Adjust value based on the material
    if (newMaterial.toLowerCase() === 'silver') {
      newItem.value = oldItem.value * 2;
    } else if (newMaterial.toLowerCase() === 'gold') {
      newItem.value = oldItem.value * 10;
    } else if (newMaterial.toLowerCase() === 'mithral') {
      newItem.value = oldItem.value * 50;
    } else if (newMaterial.toLowerCase() === 'adamantine') {
      newItem.value = oldItem.value * 100;
    }
    
    // Replace the old item in the inventory
    const updatedInventory = [...character.inventory];
    updatedInventory[itemIndex] = newItem;
    
    const updatedCharacter = {
      ...character,
      inventory: updatedInventory
    };
    
    return { 
      character: updatedCharacter,
      result: { 
        success: true, 
        message: `Changed material to ${newMaterial}`, 
        item: newItem 
      }
    };
  }
}

// Export singleton instance
export const equipmentModifier = new EquipmentModifier();
export default equipmentModifier; 