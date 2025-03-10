/**
 * Loot Manager
 * 
 * Manages loot generation from various sources including combat, exploration, and quests
 */

import { Item } from '../core/interfaces/item';
import { 
  MagicalItem, 
  Enchantment, 
  LootTable, 
  LootTableEntry 
} from '../core/interfaces/magical-item';
import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';
import { Monster } from '../core/interfaces/monster';
import { v4 as uuidv4 } from 'uuid';

// Import data
import enchantmentsData from './data/enchantments.json';
import magicalItemsData from './data/magical-items.json';
import lootTablesData from './data/loot-tables.json';

/**
 * Loot context provides information about the loot generation scenario
 */
export interface LootContext {
  sourceType: 'combat' | 'exploration' | 'quest' | 'purchase' | 'reward';
  playerLevel: number;
  location?: string;
  enemyType?: string;
  isBoss?: boolean;
  questId?: string;
  difficultyMultiplier?: number; // 0.5-2.0 to adjust drop rates
}

// Change from private to public (or export it separately)
export const rarityValues = {
  common: 1,
  uncommon: 2,
  rare: 3,
  veryRare: 4,
  legendary: 5,
  artifact: 6
} as const;

/**
 * Manager class for loot generation and handling
 */
export class LootManager {
  private enchantments: Enchantment[] = [];
  private magicalItems: MagicalItem[] = [];
  private lootTables: LootTable[] = [];
  
  constructor() {
    this.loadData();
  }
  
  /**
   * Load loot data from JSON files
   */
  private loadData(): void {
    try {
      this.enchantments = enchantmentsData as Enchantment[];
      
      // Fix the type casting issue with magicalItemsData
      // First cast to unknown, then to the target type
      this.magicalItems = (magicalItemsData as unknown) as MagicalItem[];
      
      this.lootTables = lootTablesData as LootTable[];
      
      console.log(`Loaded ${this.enchantments.length} enchantments`);
      console.log(`Loaded ${this.magicalItems.length} magical items`);
      console.log(`Loaded ${this.lootTables.length} loot tables`);
    } catch (error) {
      console.error('Error loading loot data:', error);
    }
  }
  
  /**
   * Generate loot from combat with an enemy
   */
  public generateCombatLoot(
    enemy: NPC,
    playerLevel: number,
    location: string,
    isBoss: boolean = false
  ): Item[] {
    const lootContext: LootContext = {
      sourceType: 'combat',
      playerLevel,
      location,
      enemyType: enemy.race,
      isBoss,
      difficultyMultiplier: isBoss ? 1.5 : 1.0
    };
    
    // Determine which loot table to use
    const tableId = isBoss ? 'loot_table_boss_rewards' : 'loot_table_basic_combat';
    
    return this.generateLootFromTable(tableId, lootContext);
  }
  
  /**
   * Generate loot from exploring a location
   */
  public generateExplorationLoot(
    location: string,
    playerLevel: number,
    isHiddenTreasure: boolean = false
  ): Item[] {
    const lootContext: LootContext = {
      sourceType: 'exploration',
      playerLevel,
      location,
      difficultyMultiplier: isHiddenTreasure ? 1.3 : 1.0
    };
    
    // Determine which loot table to use
    const tableId = isHiddenTreasure 
      ? 'loot_table_hidden_treasures' 
      : 'loot_table_dungeon_exploration';
    
    return this.generateLootFromTable(tableId, lootContext);
  }
  
  /**
   * Generate loot as a quest reward
   */
  public generateQuestReward(
    questId: string,
    playerLevel: number,
    rewardTier: 'minor' | 'standard' | 'major' = 'standard'
  ): Item[] {
    const lootContext: LootContext = {
      sourceType: 'quest',
      playerLevel,
      questId,
      difficultyMultiplier: rewardTier === 'minor' ? 0.7 : rewardTier === 'major' ? 1.5 : 1.0
    };
    
    return this.generateLootFromTable('loot_table_quest_rewards', lootContext);
  }
  
  /**
   * Generate loot from a specific loot table
   */
  private generateLootFromTable(tableId: string, context: LootContext): Item[] {
    const table = this.lootTables.find(t => t.id === tableId);
    if (!table) {
      console.error(`Loot table not found: ${tableId}`);
      return [];
    }
    
    const items: Item[] = [];
    const difficultyMultiplier = context.difficultyMultiplier || 1.0;
    
    // Filter eligible entries based on player level and conditions
    const eligibleEntries = table.entries.filter(entry => {
      // Check level requirements
      if (entry.minLevel && context.playerLevel < entry.minLevel) {
        return false;
      }
      if (entry.maxLevel && context.playerLevel > entry.maxLevel) {
        return false;
      }
      
      // Check conditions if present
      if (entry.conditions) {
        // Check enemy types
        if (entry.conditions.enemyTypes && context.enemyType) {
          if (!entry.conditions.enemyTypes.includes(context.enemyType)) {
            return false;
          }
        }
        
        // Check locations
        if (entry.conditions.locations && context.location) {
          if (!entry.conditions.locations.some(loc => 
            context.location?.toLowerCase().includes(loc.toLowerCase())
          )) {
            return false;
          }
        }
        
        // Check if boss only
        if (entry.conditions.bossOnly && !context.isBoss) {
          return false;
        }
        
        // Check if quest related
        if (entry.conditions.questRelated && context.sourceType !== 'quest') {
          return false;
        }
      }
      
      return true;
    });
    
    if (eligibleEntries.length === 0) {
      console.log(`No eligible loot entries found for table ${tableId} in context`, context);
      return [];
    }
    
    // Determine which items to drop
    for (const entry of eligibleEntries) {
      // Calculate adjusted drop chance
      const adjustedChance = entry.dropChance * difficultyMultiplier;
      
      // Roll for drop
      const roll = Math.random() * 100;
      if (roll <= adjustedChance) {
        const item = this.getItemById(entry.itemId);
        if (item) {
          // If item has quantity range, determine how many
          if (entry.quantity) {
            const quantityRoll = Math.floor(Math.random() * 
              (entry.quantity.max - entry.quantity.min + 1)) + entry.quantity.min;
            item.quantity = quantityRoll;
          }
          
          items.push(item);
        }
      }
    }
    
    // If no items were selected but there's a fallback item, add it
    if (items.length === 0 && table.fallbackItemId) {
      const fallbackItem = this.getItemById(table.fallbackItemId);
      if (fallbackItem) {
        items.push(fallbackItem);
      }
    }
    
    return items;
  }
  
  /**
   * Get an item by its ID
   */
  public getItemById(itemId: string): Item | null {
    // First check magical items
    const magicalItem = this.magicalItems.find(item => item.id === itemId);
    if (magicalItem) {
      // Create a deep copy to prevent modifying the original
      return JSON.parse(JSON.stringify(magicalItem));
    }
    
    // Could add more item types here in the future
    
    return null;
  }
  
  /**
   * Get an enchantment by its ID
   */
  public getEnchantmentById(enchantmentId: string): Enchantment | null {
    const enchantment = this.enchantments.find(e => e.id === enchantmentId);
    return enchantment ? JSON.parse(JSON.stringify(enchantment)) : null;
  }
  
  /**
   * Combine enchantments with an item
   */
  public applyEnchantments(item: Item, enchantmentIds: string[]): MagicalItem | null {
    // Base validation
    if (!item) return null;
    
    // Create a copy of the item
    const baseMagicalItem: Partial<MagicalItem> = {
      ...item,
      isMagical: true,
      rarity: 'common', // Default, will be upgraded based on enchantments
      attunement: { required: false },
      enchantments: [],
      isIdentified: false
    };
    
    // Find and apply each enchantment
    const enchantments: Enchantment[] = [];
    let highestRarity = 0;
    
    for (const enchId of enchantmentIds) {
      const enchantment = this.getEnchantmentById(enchId);
      if (enchantment) {
        // Check if this enchantment can be applied to this item type
        if (enchantment.itemTypeRestrictions && 
            !enchantment.itemTypeRestrictions.includes(item.properties[0] as any)) {
          console.warn(`Enchantment ${enchId} cannot be applied to item type ${item.properties[0]}`);
          continue;
        }
        
        enchantments.push(enchantment);
        
        // Update rarity if this enchantment is rarer
        const enchRarityValue = rarityValues[enchantment.rarity as keyof typeof rarityValues] || 0;
        if (enchRarityValue > highestRarity) {
          highestRarity = enchRarityValue;
          baseMagicalItem.rarity = enchantment.rarity;
        }
        
        // Check if item requires attunement
        if (enchantment.activationRequirement || 
            enchantment.spells || 
            enchantment.charges) {
          baseMagicalItem.attunement = { required: true };
        }
      }
    }
    
    if (enchantments.length === 0) {
      console.warn(`No valid enchantments found for ids: ${enchantmentIds.join(', ')}`);
      return null;
    }
    
    baseMagicalItem.enchantments = enchantments;
    
    // Update name and description based on enchantments
    if (enchantments.length === 1) {
      const enchant = enchantments[0];
      baseMagicalItem.name = `${enchant.name} ${item.name}`;
      baseMagicalItem.description = `${item.description} ${enchant.description}`;
    }
    
    // Set identification difficulty based on rarity
    switch (baseMagicalItem.rarity) {
      case 'common':
        baseMagicalItem.identificationDC = 10;
        break;
      case 'uncommon':
        baseMagicalItem.identificationDC = 13;
        break;
      case 'rare':
        baseMagicalItem.identificationDC = 15;
        break;
      case 'veryRare':
        baseMagicalItem.identificationDC = 18;
        break;
      case 'legendary':
        baseMagicalItem.identificationDC = 20;
        break;
      case 'artifact':
        baseMagicalItem.identificationDC = 25;
        break;
    }
    
    return baseMagicalItem as MagicalItem;
  }
  
  /**
   * Create a custom magical item
   */
  public createCustomMagicalItem(
    baseItem: Item,
    enchantmentIds: string[],
    name?: string,
    description?: string,
    lore?: string
  ): MagicalItem | null {
    const magicalItem = this.applyEnchantments(baseItem, enchantmentIds);
    if (!magicalItem) return null;
    
    // Apply custom properties if provided
    if (name) magicalItem.name = name;
    if (description) magicalItem.description = description;
    if (lore) magicalItem.lore = lore;
    
    return magicalItem;
  }
  
  /**
   * Identify a magical item (reveal its properties)
   */
  public identifyMagicalItem(item: MagicalItem): MagicalItem {
    const identifiedItem = { ...item, isIdentified: true };
    return identifiedItem;
  }
  
  /**
   * Generate a random magical item of a specified rarity
   */
  public generateRandomMagicalItem(
    minRarity: keyof typeof rarityValues = 'common',
    maxRarity: keyof typeof rarityValues = 'rare'
  ): MagicalItem | null {
    // Filter items by rarity range
    const eligibleItems = this.magicalItems.filter(item => {
      const itemRarityValue = rarityValues[item.rarity as keyof typeof rarityValues] || 0;
      return itemRarityValue >= rarityValues[minRarity] && 
             itemRarityValue <= rarityValues[maxRarity];
    });
    
    if (eligibleItems.length === 0) {
      console.warn(`No items found in rarity range from ${minRarity} to ${maxRarity}`);
      return null;
    }
    
    // Select a random item
    const randomIndex = Math.floor(Math.random() * eligibleItems.length);
    return JSON.parse(JSON.stringify(eligibleItems[randomIndex]));
  }

  private isEnchantmentCompatible(enchantment: Enchantment, item: Item): boolean {
    // Check if the enchantment can be applied to this item type
    if (enchantment.itemTypeRestrictions && 
        !enchantment.itemTypeRestrictions.includes(item.type)) {
      return false;
    }
    
    // Define rarity values for comparison
    const rarityValues = {
      'common': 1,
      'uncommon': 2,
      'rare': 3,
      'veryRare': 4,
      'legendary': 5,
      'artifact': 6
    };
    
    // Get the enchantment rarity value
    const enchRarityValue = rarityValues[enchantment.rarity as keyof typeof rarityValues] || 0;
    
    // Additional compatibility checks could be added here
    
    // If we've passed all checks, the enchantment is compatible
    return true;
  }

  public isItemWithinRarityRange(
    item: MagicalItem,
    minRarity: keyof typeof rarityValues = 'common',
    maxRarity: keyof typeof rarityValues = 'rare'
  ): boolean {
    const itemRarityValue = rarityValues[item.rarity as keyof typeof rarityValues] || 0;
    return itemRarityValue >= rarityValues[minRarity] &&
           itemRarityValue <= rarityValues[maxRarity];
  }
}

// Export a singleton instance
export const lootManager = new LootManager();
export default lootManager; 