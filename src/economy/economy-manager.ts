/**
 * Economy System
 * 
 * Manages currency, transactions, merchants, shops, and the overall economy of the game
 */

import { Character } from '../core/interfaces/character';
import { Item } from '../core/interfaces/item';
import { v4 as uuidv4 } from 'uuid';
import { inventoryManager } from '../character/inventory';

/**
 * Currency denominations in D&D
 */
export enum CurrencyType {
  Copper = 'copper',
  Silver = 'silver',
  Electrum = 'electrum',
  Gold = 'gold',
  Platinum = 'platinum'
}

/**
 * Exchange rates between currencies
 * 1 platinum = 10 gold = 20 electrum = 100 silver = 1000 copper
 */
export const CURRENCY_EXCHANGE_RATES: Record<CurrencyType, number> = {
  [CurrencyType.Copper]: 1,
  [CurrencyType.Silver]: 10,
  [CurrencyType.Electrum]: 20,
  [CurrencyType.Gold]: 100,
  [CurrencyType.Platinum]: 1000
};

/**
 * Represents a currency amount with denominations
 */
export interface Currency {
  [CurrencyType.Copper]: number;
  [CurrencyType.Silver]: number;
  [CurrencyType.Electrum]: number;
  [CurrencyType.Gold]: number;
  [CurrencyType.Platinum]: number;
}

/**
 * Empty currency object (zero of each type)
 */
export const EMPTY_CURRENCY: Currency = {
  [CurrencyType.Copper]: 0,
  [CurrencyType.Silver]: 0,
  [CurrencyType.Electrum]: 0,
  [CurrencyType.Gold]: 0,
  [CurrencyType.Platinum]: 0
};

/**
 * Transaction type
 */
export enum TransactionType {
  Purchase = 'purchase',
  Sale = 'sale',
  Trade = 'trade',
  Reward = 'reward',
  Theft = 'theft',
  Gift = 'gift'
}

/**
 * Transaction record
 */
export interface Transaction {
  id: string;
  date: number; // timestamp
  type: TransactionType;
  characterId: string;
  merchantId?: string;
  itemsGained: Item[];
  itemsLost: Item[];
  currencyGained: Currency;
  currencyLost: Currency;
  location?: string;
  description?: string;
}

/**
 * Price modifier factors
 */
export enum PriceModifierFactor {
  CharismaMod = 'charismaMod',
  Reputation = 'reputation',
  MerchantDisposition = 'merchantDisposition',
  LocationEconomy = 'locationEconomy', // boom or bust
  ItemDemand = 'itemDemand',
  BulkDiscount = 'bulkDiscount',
  Haggling = 'haggling'
}

/**
 * Merchant specialization
 */
export type MerchantSpecialization = 
  | 'blacksmith' 
  | 'armorer' 
  | 'alchemist' 
  | 'jeweler' 
  | 'general' 
  | 'magic' 
  | 'bookstore' 
  | 'tailor' 
  | 'leatherworker' 
  | 'food' 
  | 'exotic';

/**
 * Merchant quality/tier
 */
export enum MerchantTier {
  Poor = 'poor',         // -25% buy, +50% sell
  Common = 'common',     // 0% buy, +25% sell
  Fine = 'fine',         // +25% buy, 0% sell
  Superior = 'superior', // +50% buy, -10% sell
  Exceptional = 'exceptional' // +100% buy, -25% sell
}

/**
 * Merchant capacity
 */
export interface MerchantCapacity {
  maxUniqueItems: number;
  maxItemValue: number; // Maximum value of item the merchant will buy/sell
  maxTotalValue: number; // Maximum total value of all inventory
  restockTime: number; // in hours (game time)
}

/**
 * Merchant tier capabilities
 */
export const MERCHANT_TIER_CAPACITY: Record<MerchantTier, MerchantCapacity> = {
  [MerchantTier.Poor]: {
    maxUniqueItems: 15,
    maxItemValue: 25,
    maxTotalValue: 250,
    restockTime: 168 // 7 days
  },
  [MerchantTier.Common]: {
    maxUniqueItems: 30,
    maxItemValue: 100,
    maxTotalValue: 1000,
    restockTime: 72 // 3 days
  },
  [MerchantTier.Fine]: {
    maxUniqueItems: 50,
    maxItemValue: 500,
    maxTotalValue: 5000,
    restockTime: 48 // 2 days
  },
  [MerchantTier.Superior]: {
    maxUniqueItems: 80,
    maxItemValue: 2000,
    maxTotalValue: 15000,
    restockTime: 24 // 1 day
  },
  [MerchantTier.Exceptional]: {
    maxUniqueItems: 120,
    maxItemValue: 10000,
    maxTotalValue: 50000,
    restockTime: 12 // 12 hours
  }
};

/**
 * Merchant pricing modifiers
 */
export const MERCHANT_TIER_PRICING: Record<MerchantTier, { buyModifier: number; sellModifier: number }> = {
  [MerchantTier.Poor]: { buyModifier: 0.75, sellModifier: 1.5 },
  [MerchantTier.Common]: { buyModifier: 1.0, sellModifier: 1.25 },
  [MerchantTier.Fine]: { buyModifier: 1.25, sellModifier: 1.0 },
  [MerchantTier.Superior]: { buyModifier: 1.5, sellModifier: 0.9 },
  [MerchantTier.Exceptional]: { buyModifier: 2.0, sellModifier: 0.75 }
};

/**
 * Merchant interface
 */
export interface Merchant {
  id: string;
  name: string;
  description: string;
  location: string;
  specialization: MerchantSpecialization;
  tier: MerchantTier;
  inventory: Item[];
  currency: Currency;
  capacity: MerchantCapacity;
  buyModifier: number; // % of base price merchant pays when buying items from player
  sellModifier: number; // % of base price merchant charges when selling to player
  restockTime: number; // When merchant will restock (game timestamp)
  acceptedItemTypes?: string[]; // Item properties the merchant will buy
  disposition: number; // 0-100, how favorable merchant is to player
}

/**
 * Economy System Manager
 */
export class EconomyManager {
  private transactions: Transaction[] = [];
  private merchants: Record<string, Merchant> = {};
  
  /**
   * Create a new merchant
   */
  public createMerchant(
    name: string,
    description: string,
    location: string,
    specialization: MerchantSpecialization,
    tier: MerchantTier = MerchantTier.Common,
    startingInventory: Item[] = [],
    startingCurrency: Currency = {
      copper: 1000,
      silver: 500,
      electrum: 100,
      gold: 200,
      platinum: 10
    }
  ): Merchant {
    const capacity = MERCHANT_TIER_CAPACITY[tier];
    const pricing = MERCHANT_TIER_PRICING[tier];
    
    const merchant: Merchant = {
      id: uuidv4(),
      name,
      description,
      location,
      specialization,
      tier,
      inventory: startingInventory,
      currency: startingCurrency,
      capacity,
      buyModifier: pricing.buyModifier,
      sellModifier: pricing.sellModifier,
      restockTime: Date.now() + (capacity.restockTime * 60 * 60 * 1000), // Convert hours to milliseconds
      disposition: 50 // Neutral by default
    };
    
    // Set accepted item types based on specialization
    merchant.acceptedItemTypes = this.getAcceptedItemTypesBySpecialization(specialization);
    
    // Store the merchant
    this.merchants[merchant.id] = merchant;
    
    return merchant;
  }
  
  /**
   * Get accepted item types based on merchant specialization
   */
  private getAcceptedItemTypesBySpecialization(specialization: MerchantSpecialization): string[] {
    switch (specialization) {
      case 'blacksmith':
        return ['weapon', 'metal', 'tool'];
      case 'armorer':
        return ['armor', 'shield'];
      case 'alchemist':
        return ['potion', 'component', 'ingredient'];
      case 'jeweler':
        return ['jewelry', 'gem', 'precious'];
      case 'magic':
        return ['scroll', 'wand', 'magical', 'component'];
      case 'bookstore':
        return ['book', 'scroll', 'paper'];
      case 'tailor':
        return ['clothing', 'fabric', 'costume'];
      case 'leatherworker':
        return ['leather', 'hide', 'boots', 'gloves'];
      case 'food':
        return ['food', 'drink', 'cooking'];
      case 'exotic':
        return ['rare', 'exotic', 'unusual'];
      case 'general':
      default:
        return []; // General merchants accept everything
    }
  }
  
  /**
   * Get all merchants
   */
  public getMerchants(): Merchant[] {
    return Object.values(this.merchants);
  }
  
  /**
   * Get a merchant by ID
   */
  public getMerchantById(id: string): Merchant | undefined {
    return this.merchants[id];
  }
  
  /**
   * Get merchants by location
   */
  public getMerchantsByLocation(location: string): Merchant[] {
    return Object.values(this.merchants).filter(
      merchant => merchant.location === location
    );
  }
  
  /**
   * Get merchants by specialization
   */
  public getMerchantsBySpecialization(specialization: MerchantSpecialization): Merchant[] {
    return Object.values(this.merchants).filter(
      merchant => merchant.specialization === specialization
    );
  }
  
  /**
   * Convert currency to copper pieces (lowest denomination)
   */
  public currencyToCopper(currency: Currency): number {
    return (
      currency.copper +
      currency.silver * CURRENCY_EXCHANGE_RATES.silver +
      currency.electrum * CURRENCY_EXCHANGE_RATES.electrum +
      currency.gold * CURRENCY_EXCHANGE_RATES.gold +
      currency.platinum * CURRENCY_EXCHANGE_RATES.platinum
    );
  }
  
  /**
   * Convert copper pieces to optimized currency (using larger denominations)
   */
  public copperToCurrency(copper: number): Currency {
    const currency: Currency = { ...EMPTY_CURRENCY };
    
    let remaining = copper;
    
    // Extract platinum
    currency.platinum = Math.floor(remaining / CURRENCY_EXCHANGE_RATES.platinum);
    remaining %= CURRENCY_EXCHANGE_RATES.platinum;
    
    // Extract gold
    currency.gold = Math.floor(remaining / CURRENCY_EXCHANGE_RATES.gold);
    remaining %= CURRENCY_EXCHANGE_RATES.gold;
    
    // Extract electrum
    currency.electrum = Math.floor(remaining / CURRENCY_EXCHANGE_RATES.electrum);
    remaining %= CURRENCY_EXCHANGE_RATES.electrum;
    
    // Extract silver
    currency.silver = Math.floor(remaining / CURRENCY_EXCHANGE_RATES.silver);
    
    // Remaining copper
    currency.copper = remaining % CURRENCY_EXCHANGE_RATES.silver;
    
    return currency;
  }
  
  /**
   * Add two currency objects
   */
  public addCurrency(currency1: Currency, currency2: Currency): Currency {
    return {
      copper: currency1.copper + currency2.copper,
      silver: currency1.silver + currency2.silver,
      electrum: currency1.electrum + currency2.electrum,
      gold: currency1.gold + currency2.gold,
      platinum: currency1.platinum + currency2.platinum
    };
  }
  
  /**
   * Subtract currency2 from currency1
   * Returns null if currency1 is less than currency2
   */
  public subtractCurrency(currency1: Currency, currency2: Currency): Currency | null {
    const copper1 = this.currencyToCopper(currency1);
    const copper2 = this.currencyToCopper(currency2);
    
    if (copper1 < copper2) {
      return null; // Not enough currency
    }
    
    return this.copperToCurrency(copper1 - copper2);
  }
  
  /**
   * Calculate the price of an item when merchant buys from player
   */
  public calculateBuyPrice(item: Item, merchant: Merchant, character: Character): number {
    let basePrice = item.value;
    let priceModifier = merchant.buyModifier;
    
    // Apply charisma modifier
    const charismaMod = Math.floor((character.abilityScores.charisma.score - 10) / 2);
    priceModifier += charismaMod * 0.05; // +/- 5% per point of charisma modifier
    
    // Apply merchant disposition
    priceModifier += (merchant.disposition - 50) * 0.002; // +/- 0.2% per point of disposition
    
    // Extra bonus for item types the merchant specializes in
    if (merchant.acceptedItemTypes?.length === 0 || 
        item.properties.some(prop => merchant.acceptedItemTypes?.includes(prop))) {
      priceModifier += 0.1; // +10% for items the merchant specializes in
    }
    
    // Calculate final price
    let finalPrice = Math.floor(basePrice * priceModifier);
    
    // Ensure minimum price of 1 copper
    return Math.max(1, finalPrice);
  }
  
  /**
   * Calculate the price of an item when merchant sells to player
   */
  public calculateSellPrice(item: Item, merchant: Merchant, character: Character): number {
    let basePrice = item.value;
    let priceModifier = merchant.sellModifier;
    
    // Apply charisma modifier
    const charismaMod = Math.floor((character.abilityScores.charisma.score - 10) / 2);
    priceModifier -= charismaMod * 0.05; // +/- 5% per point of charisma modifier
    
    // Apply merchant disposition
    priceModifier -= (merchant.disposition - 50) * 0.002; // +/- 0.2% per point of disposition
    
    // Calculate final price
    let finalPrice = Math.floor(basePrice * Math.max(1.0, priceModifier));
    
    // Ensure minimum price of 1 copper
    return Math.max(1, finalPrice);
  }
  
  /**
   * Player buys item from merchant
   */
  public buyFromMerchant(
    character: Character,
    merchant: Merchant,
    itemId: string,
    quantity: number = 1
  ): { character: Character; merchant: Merchant; transaction: Transaction | null } {
    // Find the item in merchant's inventory
    const itemIndex = merchant.inventory.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return { 
        character, 
        merchant, 
        transaction: null 
      }; // Item not found
    }
    
    const item = merchant.inventory[itemIndex];
    const availableQuantity = item.quantity || 1;
    
    if (availableQuantity < quantity) {
      return { 
        character, 
        merchant, 
        transaction: null 
      }; // Not enough items
    }
    
    // Calculate total price
    const unitPrice = this.calculateSellPrice(item, merchant, character);
    const totalPrice = unitPrice * quantity;
    
    // Convert to currency
    const totalPriceInCurrency = this.copperToCurrency(totalPrice);
    
    // Check if player has enough money
    if (!character.currency) {
      character.currency = { ...EMPTY_CURRENCY };
    }
    
    const playerCurrencyInCopper = this.currencyToCopper(character.currency);
    
    if (playerCurrencyInCopper < totalPrice) {
      return { 
        character, 
        merchant, 
        transaction: null 
      }; // Not enough money
    }
    
    // Process transaction
    
    // 1. Remove money from player
    const updatedPlayerCurrency = this.subtractCurrency(character.currency, totalPriceInCurrency);
    if (!updatedPlayerCurrency) {
      return { 
        character, 
        merchant, 
        transaction: null 
      }; // This shouldn't happen as we already checked
    }
    const updatedCharacter = {
      ...character,
      currency: updatedPlayerCurrency
    };
    
    // 2. Add money to merchant
    const updatedMerchant = {
      ...merchant,
      currency: this.addCurrency(merchant.currency, totalPriceInCurrency)
    };
    
    // 3. Remove item from merchant inventory
    const itemsToTransfer = [];
    
    // Update merchant inventory
    if (quantity >= availableQuantity) {
      // Remove the item entirely
      updatedMerchant.inventory = updatedMerchant.inventory.filter((_, index) => index !== itemIndex);
      itemsToTransfer.push({ ...item, quantity: availableQuantity });
    } else {
      // Reduce quantity
      const updatedItem = { ...item, quantity: availableQuantity - quantity };
      updatedMerchant.inventory[itemIndex] = updatedItem;
      itemsToTransfer.push({ ...item, quantity });
    }
    
    // 4. Add item to player inventory
    const finalCharacter = inventoryManager.addItem(updatedCharacter, itemsToTransfer[0], quantity);
    
    // 5. Create transaction record
    const transaction: Transaction = {
      id: uuidv4(),
      date: Date.now(),
      type: TransactionType.Purchase,
      characterId: character.id,
      merchantId: merchant.id,
      itemsGained: itemsToTransfer,
      itemsLost: [],
      currencyGained: EMPTY_CURRENCY,
      currencyLost: totalPriceInCurrency,
      location: merchant.location,
      description: `${character.name} purchased ${quantity} ${item.name} from ${merchant.name} for ${this.formatCurrency(totalPriceInCurrency)}`
    };
    
    this.transactions.push(transaction);
    this.merchants[merchant.id] = updatedMerchant;
    
    return {
      character: finalCharacter,
      merchant: updatedMerchant,
      transaction
    };
  }
  
  /**
   * Player sells item to merchant
   */
  public sellToMerchant(
    character: Character,
    merchant: Merchant,
    itemId: string,
    quantity: number = 1
  ): { character: Character; merchant: Merchant; transaction: Transaction | null } {
    // Find the item in player's inventory
    const item = character.inventory?.find(item => item.id === itemId);
    
    if (!item) {
      return { 
        character, 
        merchant, 
        transaction: null 
      }; // Item not found
    }
    
    const availableQuantity = item.quantity || 1;
    
    if (availableQuantity < quantity) {
      return { 
        character, 
        merchant, 
        transaction: null 
      }; // Not enough items
    }
    
    // Check if merchant will buy this item
    if (merchant.acceptedItemTypes?.length > 0 && 
        !item.properties.some(prop => merchant.acceptedItemTypes?.includes(prop))) {
      return { 
        character, 
        merchant, 
        transaction: null 
      }; // Merchant doesn't buy this type of item
    }
    
    // Check if item value exceeds merchant capacity
    if (item.value > merchant.capacity.maxItemValue) {
      return { 
        character, 
        merchant, 
        transaction: null 
      }; // Item too valuable for merchant
    }
    
    // Calculate total price
    const unitPrice = this.calculateBuyPrice(item, merchant, character);
    const totalPrice = unitPrice * quantity;
    
    // Convert to currency
    const totalPriceInCurrency = this.copperToCurrency(totalPrice);
    
    // Check if merchant has enough money
    const merchantCurrencyInCopper = this.currencyToCopper(merchant.currency);
    
    if (merchantCurrencyInCopper < totalPrice) {
      return { 
        character, 
        merchant, 
        transaction: null 
      }; // Merchant doesn't have enough money
    }
    
    // Process transaction
    
    // 1. Add money to player
    if (!character.currency) {
      character.currency = { ...EMPTY_CURRENCY };
    }
    
    const updatedCharacter = {
      ...character,
      currency: this.addCurrency(character.currency, totalPriceInCurrency)
    };
    
    // 2. Remove money from merchant
    const updatedMerchantCurrency = this.subtractCurrency(merchant.currency, totalPriceInCurrency);
    if (!updatedMerchantCurrency) {
      return { 
        character, 
        merchant, 
        transaction: null 
      }; // This shouldn't happen as we already checked
    }
    
    const updatedMerchant = {
      ...merchant,
      currency: updatedMerchantCurrency
    };
    
    // 3. Remove item from player inventory
    const charAfterItemRemoval = inventoryManager.removeItem(updatedCharacter, itemId, quantity);
    
    // 4. Add item to merchant inventory
    const itemToTransfer = { ...item, quantity };
    const existingItemIndex = updatedMerchant.inventory.findIndex(
      mItem => mItem.id.split('-copy-')[0] === item.id.split('-copy-')[0]
    );
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const existingItem = updatedMerchant.inventory[existingItemIndex];
      const existingQuantity = existingItem.quantity || 1;
      updatedMerchant.inventory[existingItemIndex] = {
        ...existingItem,
        quantity: existingQuantity + quantity
      };
    } else {
      // Add as new item
      updatedMerchant.inventory.push({
        ...itemToTransfer,
        id: `${item.id.split('-copy-')[0]}-copy-${uuidv4()}` // Generate a new ID
      });
    }
    
    // 5. Create transaction record
    const transaction: Transaction = {
      id: uuidv4(),
      date: Date.now(),
      type: TransactionType.Sale,
      characterId: character.id,
      merchantId: merchant.id,
      itemsGained: [],
      itemsLost: [itemToTransfer],
      currencyGained: totalPriceInCurrency,
      currencyLost: EMPTY_CURRENCY,
      location: merchant.location,
      description: `${character.name} sold ${quantity} ${item.name} to ${merchant.name} for ${this.formatCurrency(totalPriceInCurrency)}`
    };
    
    this.transactions.push(transaction);
    this.merchants[merchant.id] = updatedMerchant;
    
    return {
      character: charAfterItemRemoval,
      merchant: updatedMerchant,
      transaction
    };
  }
  
  /**
   * Format currency for display
   */
  public formatCurrency(currency: Currency): string {
    const parts = [];
    
    if (currency.platinum > 0) {
      parts.push(`${currency.platinum}pp`);
    }
    
    if (currency.gold > 0) {
      parts.push(`${currency.gold}gp`);
    }
    
    if (currency.electrum > 0) {
      parts.push(`${currency.electrum}ep`);
    }
    
    if (currency.silver > 0) {
      parts.push(`${currency.silver}sp`);
    }
    
    if (currency.copper > 0 || parts.length === 0) {
      parts.push(`${currency.copper}cp`);
    }
    
    return parts.join(', ');
  }
  
  /**
   * Restock merchant inventory
   */
  public restockMerchant(merchantId: string): Merchant | undefined {
    const merchant = this.merchants[merchantId];
    
    if (!merchant) {
      return undefined;
    }
    
    // Check if it's time to restock
    if (Date.now() < merchant.restockTime) {
      return merchant; // Not time to restock yet
    }
    
    // Implement restocking logic here
    // This is a simplified version that restores some currency
    // and potentially adds new items, but in a real implementation
    // this would likely load from item tables based on merchant type
    
    // Restore some currency
    const restoredCurrency = this.copperToCurrency(
      Math.floor(this.currencyToCopper({
        copper: Math.floor(MERCHANT_TIER_CAPACITY[merchant.tier].maxTotalValue * 0.2),
        silver: 0,
        electrum: 0,
        gold: 0,
        platinum: 0
      }))
    );
    
    const updatedMerchant = {
      ...merchant,
      currency: this.addCurrency(merchant.currency, restoredCurrency),
      restockTime: Date.now() + (merchant.capacity.restockTime * 60 * 60 * 1000) // Set next restock time
    };
    
    // Store the updated merchant
    this.merchants[merchantId] = updatedMerchant;
    
    return updatedMerchant;
  }
  
  /**
   * Get player transaction history
   */
  public getCharacterTransactions(characterId: string): Transaction[] {
    return this.transactions.filter(
      transaction => transaction.characterId === characterId
    );
  }
  
  /**
   * Adjust merchant disposition towards player
   */
  public adjustMerchantDisposition(
    merchantId: string, 
    adjustment: number
  ): Merchant | undefined {
    const merchant = this.merchants[merchantId];
    
    if (!merchant) {
      return undefined;
    }
    
    const newDisposition = Math.max(0, Math.min(100, merchant.disposition + adjustment));
    
    const updatedMerchant = {
      ...merchant,
      disposition: newDisposition
    };
    
    // Store the updated merchant
    this.merchants[merchantId] = updatedMerchant;
    
    return updatedMerchant;
  }
}

// Export singleton instance
export const economyManager = new EconomyManager();
export default economyManager; 