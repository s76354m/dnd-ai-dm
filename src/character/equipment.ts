/**
 * Character Equipment System
 * 
 * Handles starting equipment, equipment kits, and equipment management
 */

import { Item, ItemCategory } from '../core/interfaces/item';
import { Character } from '../core/interfaces/character';
import { Class, Background } from '../core/types/index';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extend the Item interface to include quantity
 */
interface EquipmentItem extends Item {
  quantity?: number;
}

/**
 * Currency types
 */
export interface Currency {
  copper: number;
  silver: number;
  electrum: number;
  gold: number;
  platinum: number;
}

/**
 * Equipment kit options based on class choice
 */
export interface EquipmentKit {
  id: string;
  name: string;
  description: string;
  compatibleClasses: Class[];
  items: Item[];
  currency: Currency;
  value: number; // Total value in gold pieces
}

/**
 * Equipment option for character creation
 */
export interface EquipmentOption {
  id: string;
  description: string;
  choices: Item[][];  // Array of mutually exclusive item groups
}

/**
 * Basic weapon creation
 */
export function createWeapon(
  name: string,
  damage: string,
  damageType: string,
  weight: number,
  properties: string[],
  value: number
): Item {
  return {
    id: uuidv4(),
    name,
    description: `${name} - ${damage} ${damageType} damage`,
    category: ItemCategory.Weapon,
    weight,
    value,
    properties,
    damage: {
      diceCount: parseInt(damage.split('d')[0]),
      diceType: parseInt(damage.split('d')[1]),
      bonus: 0,
      type: damageType
    },
    quantity: 1,
  } as EquipmentItem;
}

/**
 * Basic armor creation
 */
export function createArmor(
  name: string,
  armorClass: number,
  weight: number,
  properties: string[],
  value: number
): Item {
  return {
    id: uuidv4(),
    name,
    description: `${name} - AC ${armorClass}`,
    category: ItemCategory.Armor,
    weight,
    value,
    properties,
    armorClass,
    quantity: 1,
  } as EquipmentItem;
}

/**
 * Basic item creation
 */
export function createItem(
  name: string,
  description: string,
  weight: number,
  properties: string[],
  value: number,
  quantity: number = 1
): Item {
  return {
    id: uuidv4(),
    name,
    description,
    category: ItemCategory.Other,
    weight,
    value,
    properties,
    quantity,
  } as EquipmentItem;
}

/**
 * Common equipment items
 */
export const COMMON_ITEMS = {
  // Weapons
  longsword: createWeapon('Longsword', '1d8', 'slashing', 3, ['versatile', 'metal'], 15),
  shortsword: createWeapon('Shortsword', '1d6', 'piercing', 2, ['finesse', 'light', 'metal'], 10),
  rapier: createWeapon('Rapier', '1d8', 'piercing', 2.5, ['finesse', 'metal'], 25),
  dagger: createWeapon('Dagger', '1d4', 'piercing', 1, ['finesse', 'light', 'thrown'], 2),
  mace: createWeapon('Mace', '1d6', 'bludgeoning', 4, ['metal'], 5),
  staff: createWeapon('Quarterstaff', '1d6', 'bludgeoning', 4, ['versatile', 'wood'], 0.2),
  greataxe: createWeapon('Greataxe', '1d12', 'slashing', 7, ['heavy', 'two-handed', 'metal'], 30),
  greatsword: createWeapon('Greatsword', '2d6', 'slashing', 6, ['heavy', 'two-handed', 'metal'], 50),
  handaxe: createWeapon('Handaxe', '1d6', 'slashing', 2, ['light', 'thrown', 'metal'], 5),
  javelin: createWeapon('Javelin', '1d6', 'piercing', 2, ['thrown'], 0.5),
  lightcrossbow: createWeapon('Light Crossbow', '1d8', 'piercing', 5, ['ammunition', 'loading', 'two-handed'], 25),
  shortbow: createWeapon('Shortbow', '1d6', 'piercing', 2, ['ammunition', 'two-handed'], 25),
  longbow: createWeapon('Longbow', '1d8', 'piercing', 2, ['ammunition', 'heavy', 'two-handed'], 50),
  scimitar: createWeapon('Scimitar', '1d6', 'slashing', 3, ['finesse', 'light', 'metal'], 25),
  
  // Armor
  padded: createArmor('Padded Armor', 11, 8, ['light'], 5),
  leather: createArmor('Leather Armor', 11, 10, ['light'], 10),
  studdedleather: createArmor('Studded Leather', 12, 13, ['light'], 45),
  hide: createArmor('Hide Armor', 12, 12, ['medium'], 10),
  chainshirt: createArmor('Chain Shirt', 13, 20, ['medium', 'metal'], 50),
  scalemail: createArmor('Scale Mail', 14, 45, ['medium', 'metal'], 50),
  breastplate: createArmor('Breastplate', 14, 20, ['medium', 'metal'], 400),
  halfplate: createArmor('Half Plate', 15, 40, ['medium', 'metal'], 750),
  ringmail: createArmor('Ring Mail', 14, 40, ['heavy', 'metal'], 30),
  chainmail: createArmor('Chain Mail', 16, 55, ['heavy', 'metal'], 75),
  splint: createArmor('Splint', 17, 60, ['heavy', 'metal'], 200),
  plate: createArmor('Plate', 18, 65, ['heavy', 'metal'], 1500),
  shield: createArmor('Shield', 2, 6, ['shield'], 10),
  
  // Adventuring gear
  backpack: createItem('Backpack', 'A sturdy backpack for carrying equipment.', 5, ['container'], 2),
  bedroll: createItem('Bedroll', 'A portable sleeping roll.', 7, ['comfort'], 1),
  rationsDays5: createItem('Rations (5 days)', 'Preserved food suitable for travel.', 10, ['food'], 5, 5),
  rope50ft: createItem('Rope (50 ft)', 'Sturdy hemp rope.', 10, ['tool'], 1),
  tinderbox: createItem('Tinderbox', 'Fire-starting gear.', 1, ['tool'], 0.5),
  torch: createItem('Torch', 'A wooden torch that burns for 1 hour.', 1, ['light'], 0.01, 10),
  waterskin: createItem('Waterskin', 'A container that holds 4 pints of liquid.', 5, ['container'], 0.2),
  holySymbol: createItem('Holy Symbol', 'A divine focus for spellcasting.', 1, ['focus'], 5),
  spellbook: createItem('Spellbook', 'A book for recording spells.', 3, ['spellcasting'], 50),
  herbalism: createItem('Herbalism Kit', 'Tools for gathering and preparing herbs.', 3, ['tool'], 5),
  healers: createItem('Healer\'s Kit', 'Bandages and herbs for treating wounds.', 3, ['medical'], 5),
  arcane: createItem('Arcane Focus', 'A special item for channeling arcane magic.', 1, ['focus'], 10),
  druidic: createItem('Druidic Focus', 'A special item for channeling nature magic.', 1, ['focus'], 10),
  thieves: createItem('Thieves\' Tools', 'Tools for picking locks and disarming traps.', 1, ['tool'], 25),
  potion: createItem('Potion of Healing', 'A potion that restores 2d4+2 hit points.', 0.5, ['potion', 'healing'], 50),
  arrows20: createItem('Arrows (20)', 'Arrows for a bow.', 1, ['ammunition'], 1, 20),
  bolts20: createItem('Bolts (20)', 'Bolts for a crossbow.', 1.5, ['ammunition'], 1, 20),
  component: createItem('Component Pouch', 'A small pouch for spell components.', 2, ['spellcasting'], 25),
  lantern: createItem('Lantern', 'A hooded lantern that burns oil.', 2, ['light'], 5),
  oil: createItem('Oil (flask)', 'A flask of oil for lanterns or other uses.', 1, ['consumable'], 0.1, 3)
};

/**
 * Class starting equipment kits
 */
export const CLASS_EQUIPMENT_KITS: EquipmentKit[] = [
  {
    id: 'kit-barbarian',
    name: 'Barbarian Kit',
    description: 'Basic equipment for a barbarian adventurer.',
    compatibleClasses: ['barbarian'],
    items: [
      COMMON_ITEMS.greataxe,
      COMMON_ITEMS.handaxe,
      COMMON_ITEMS.handaxe,
      COMMON_ITEMS.javelin,
      COMMON_ITEMS.javelin,
      COMMON_ITEMS.javelin,
      COMMON_ITEMS.javelin,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.bedroll,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.rope50ft,
      COMMON_ITEMS.tinderbox,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.waterskin
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 10,
      platinum: 0
    },
    value: 80
  },
  {
    id: 'kit-bard',
    name: 'Bard Kit',
    description: 'Essential equipment for a bard adventurer.',
    compatibleClasses: ['bard'],
    items: [
      COMMON_ITEMS.rapier,
      COMMON_ITEMS.leather,
      createItem('Lute', 'A musical instrument.', 2, ['musical'], 35),
      COMMON_ITEMS.dagger,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.bedroll,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.waterskin,
      createItem('Disguise Kit', 'A kit of cosmetics and props.', 3, ['tool'], 25),
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 15,
      platinum: 0
    },
    value: 100
  },
  {
    id: 'kit-cleric',
    name: 'Cleric Kit',
    description: 'Sacred equipment for a cleric adventurer.',
    compatibleClasses: ['cleric'],
    items: [
      COMMON_ITEMS.mace,
      COMMON_ITEMS.scalemail,
      COMMON_ITEMS.shield,
      COMMON_ITEMS.holySymbol,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.bedroll,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.waterskin,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.healers
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 15,
      platinum: 0
    },
    value: 105
  },
  {
    id: 'kit-druid',
    name: 'Druid Kit',
    description: 'Nature equipment for a druid adventurer.',
    compatibleClasses: ['druid'],
    items: [
      COMMON_ITEMS.scimitar,
      COMMON_ITEMS.leather,
      COMMON_ITEMS.druidic,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.bedroll,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.waterskin,
      COMMON_ITEMS.rope50ft,
      COMMON_ITEMS.herbalism
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 10,
      platinum: 0
    },
    value: 80
  },
  {
    id: 'kit-fighter',
    name: 'Fighter Kit',
    description: 'Combat equipment for a fighter adventurer.',
    compatibleClasses: ['fighter'],
    items: [
      COMMON_ITEMS.longsword,
      COMMON_ITEMS.shield,
      COMMON_ITEMS.chainmail,
      COMMON_ITEMS.lightcrossbow,
      COMMON_ITEMS.bolts20,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.bedroll,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.waterskin,
      COMMON_ITEMS.rope50ft,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 10,
      platinum: 0
    },
    value: 140
  },
  {
    id: 'kit-monk',
    name: 'Monk Kit',
    description: 'Simple equipment for a monk adventurer.',
    compatibleClasses: ['monk'],
    items: [
      COMMON_ITEMS.shortsword,
      COMMON_ITEMS.dagger,
      COMMON_ITEMS.dagger,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.bedroll,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.waterskin,
      COMMON_ITEMS.rope50ft,
      createItem('10 Darts', 'Simple thrown weapons.', 2.5, ['weapon', 'thrown'], 0.5, 10)
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 10,
      platinum: 0
    },
    value: 35
  },
  {
    id: 'kit-paladin',
    name: 'Paladin Kit',
    description: 'Holy equipment for a paladin adventurer.',
    compatibleClasses: ['paladin'],
    items: [
      COMMON_ITEMS.longsword,
      COMMON_ITEMS.shield,
      COMMON_ITEMS.chainmail,
      COMMON_ITEMS.javelin,
      COMMON_ITEMS.javelin,
      COMMON_ITEMS.javelin,
      COMMON_ITEMS.javelin,
      COMMON_ITEMS.javelin,
      COMMON_ITEMS.holySymbol,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.bedroll,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.waterskin,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.healers
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 25,
      platinum: 0
    },
    value: 145
  },
  {
    id: 'kit-ranger',
    name: 'Ranger Kit',
    description: 'Wilderness equipment for a ranger adventurer.',
    compatibleClasses: ['ranger'],
    items: [
      COMMON_ITEMS.scalemail,
      COMMON_ITEMS.shortsword,
      COMMON_ITEMS.shortsword,
      COMMON_ITEMS.longbow,
      COMMON_ITEMS.arrows20,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.bedroll,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.waterskin,
      COMMON_ITEMS.rope50ft,
      COMMON_ITEMS.arrows20
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 10,
      platinum: 0
    },
    value: 150
  },
  {
    id: 'kit-rogue',
    name: 'Rogue Kit',
    description: 'Stealth equipment for a rogue adventurer.',
    compatibleClasses: ['rogue'],
    items: [
      COMMON_ITEMS.rapier,
      COMMON_ITEMS.shortbow,
      COMMON_ITEMS.arrows20,
      COMMON_ITEMS.leather,
      COMMON_ITEMS.dagger,
      COMMON_ITEMS.dagger,
      COMMON_ITEMS.thieves,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.waterskin,
      COMMON_ITEMS.rope50ft,
      createItem('Crowbar', 'A tool for prying open doors or containers.', 5, ['tool'], 2),
      COMMON_ITEMS.lantern,
      COMMON_ITEMS.oil,
      COMMON_ITEMS.oil
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 20,
      platinum: 0
    },
    value: 120
  },
  {
    id: 'kit-sorcerer',
    name: 'Sorcerer Kit',
    description: 'Arcane equipment for a sorcerer adventurer.',
    compatibleClasses: ['sorcerer'],
    items: [
      COMMON_ITEMS.dagger,
      COMMON_ITEMS.dagger,
      COMMON_ITEMS.lightcrossbow,
      COMMON_ITEMS.bolts20,
      COMMON_ITEMS.arcane,
      COMMON_ITEMS.component,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.waterskin,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 25,
      platinum: 0
    },
    value: 70
  },
  {
    id: 'kit-warlock',
    name: 'Warlock Kit',
    description: 'Eldritch equipment for a warlock adventurer.',
    compatibleClasses: ['warlock'],
    items: [
      COMMON_ITEMS.dagger,
      COMMON_ITEMS.dagger,
      COMMON_ITEMS.lightcrossbow,
      COMMON_ITEMS.bolts20,
      COMMON_ITEMS.arcane,
      COMMON_ITEMS.component,
      COMMON_ITEMS.leather,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.waterskin,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.rope50ft
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 20,
      platinum: 0
    },
    value: 95
  },
  {
    id: 'kit-wizard',
    name: 'Wizard Kit',
    description: 'Scholarly equipment for a wizard adventurer.',
    compatibleClasses: ['wizard'],
    items: [
      COMMON_ITEMS.staff,
      COMMON_ITEMS.component,
      COMMON_ITEMS.spellbook,
      COMMON_ITEMS.backpack,
      COMMON_ITEMS.rationsDays5,
      COMMON_ITEMS.waterskin,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch,
      COMMON_ITEMS.torch
    ],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 25,
      platinum: 0
    },
    value: 80
  }
];

/**
 * Background equipment additions
 */
export const BACKGROUND_EQUIPMENT: Record<Background, Item[]> = {
  acolyte: [
    createItem('Prayer Book', 'A book of prayers to your deity.', 1, ['religious'], 10),
    createItem('Incense Sticks (5)', 'Fragrant incense for religious ceremonies.', 0.5, ['religious'], 1, 5),
    createItem('Vestments', 'Religious clothing for ceremonies.', 4, ['clothing'], 5),
    createItem('Common Clothes', 'A set of everyday clothing.', 3, ['clothing'], 0.5)
  ],
  charlatan: [
    createItem('Fine Clothes', 'A set of high-quality clothing.', 6, ['clothing'], 15),
    createItem('Disguise Kit', 'A kit of cosmetics and props.', 3, ['tool'], 25),
    createItem('Con Tools', 'Tools of the con artist\'s trade.', 1, ['tool'], 10),
    createItem('Forgery Kit', 'Tools for creating fake documents.', 5, ['tool'], 15)
  ],
  criminal: [
    createItem('Crowbar', 'A tool for prying open doors or containers.', 5, ['tool'], 2),
    createItem('Dark Clothes', 'Clothing suitable for stealth.', 4, ['clothing'], 5),
    createItem('Hood', 'A hood to hide your face.', 0.5, ['clothing'], 0.5),
    createItem('Small Pouch', 'A small pouch for hiding small items.', 0.25, ['container'], 0.5)
  ],
  entertainer: [
    createItem('Musical Instrument', 'An instrument of your choice.', 2, ['musical'], 30),
    createItem('Costume', 'Flashy clothing for performances.', 4, ['clothing'], 5),
    createItem('Trinket', 'A memento from an admirer.', 0.1, ['trinket'], 0.1),
    createItem('Makeup', 'Face paint and cosmetics.', 0.5, ['tool'], 1)
  ],
  folkhero: [
    createItem('Shovel', 'A tool for digging.', 5, ['tool'], 2),
    createItem('Iron Pot', 'A pot for cooking meals.', 10, ['tool'], 2),
    createItem('Common Clothes', 'A set of everyday clothing.', 3, ['clothing'], 0.5),
    createItem('Hunting Trap', 'A mechanical trap for catching game.', 5, ['tool'], 5)
  ],
  guildartisan: [
    createItem('Artisan Tools', 'Tools for your trade.', 5, ['tool'], 15),
    createItem('Letter of Introduction', 'A letter from your guild.', 0.1, ['document'], 5),
    createItem('Traveler\'s Clothes', 'Clothing suitable for travel.', 4, ['clothing'], 2),
    createItem('Guild Badge', 'A symbol of your membership.', 0.1, ['trinket'], 5)
  ],
  hermit: [
    createItem('Herbalism Kit', 'Tools for gathering and preparing herbs.', 3, ['tool'], 5),
    createItem('Scroll Case', 'A case for holding scrolls.', 1, ['container'], 1),
    createItem('Winter Blanket', 'A warm blanket for cold nights.', 3, ['comfort'], 0.5),
    createItem('Common Clothes', 'A set of everyday clothing.', 3, ['clothing'], 0.5)
  ],
  noble: [
    createItem('Fine Clothes', 'A set of high-quality clothing.', 6, ['clothing'], 15),
    createItem('Signet Ring', 'A ring with your family crest.', 0.1, ['jewelry'], 5),
    createItem('Scroll of Pedigree', 'A document showing your lineage.', 0.1, ['document'], 25),
    createItem('Purse', 'A small container for coins.', 0.5, ['container'], 0.5)
  ],
  outlander: [
    createItem('Staff', 'A walking stick.', 4, ['tool'], 0.2),
    createItem('Hunting Trap', 'A mechanical trap for catching game.', 5, ['tool'], 5),
    createItem('Trophy', 'A trophy from an animal you killed.', 0.5, ['trinket'], 0.1),
    createItem('Traveler\'s Clothes', 'Clothing suitable for travel.', 4, ['clothing'], 2)
  ],
  sage: [
    createItem('Ink Bottle', 'A bottle of black ink.', 0.1, ['writing'], 10),
    createItem('Quill', 'A feather pen.', 0.1, ['writing'], 0.1),
    createItem('Small Knife', 'A knife for cutting paper or sharpening quills.', 0.5, ['tool'], 1),
    createItem('Letter from Colleague', 'A letter discussing an academic topic.', 0.1, ['document'], 0.1),
    createItem('Common Clothes', 'A set of everyday clothing.', 3, ['clothing'], 0.5)
  ],
  sailor: [
    createItem('Rope (50 ft)', 'Sturdy hemp rope.', 10, ['tool'], 1),
    createItem('Lucky Charm', 'A trinket that brings you luck at sea.', 0.1, ['trinket'], 0.1),
    createItem('Common Clothes', 'A set of everyday clothing.', 3, ['clothing'], 0.5),
    createItem('Belaying Pin', 'A wooden pin used on ships.', 2, ['tool'], 0.1)
  ],
  soldier: [
    createItem('Insignia of Rank', 'A symbol of your military rank.', 0.1, ['trinket'], 0.1),
    createItem('Trophy', 'A trophy taken from a fallen enemy.', 0.5, ['trinket'], 0.1),
    createItem('Set of Dice', 'Bone dice for playing games.', 0.1, ['gaming'], 0.1),
    createItem('Common Clothes', 'A set of everyday clothing.', 3, ['clothing'], 0.5)
  ],
  urchin: [
    createItem('Small Knife', 'A simple knife.', 0.5, ['tool'], 1),
    createItem('Map of City', 'A map of your home city.', 0.1, ['document'], 5),
    createItem('Pet Mouse', 'A trained pet mouse.', 0.1, ['pet'], 0.1),
    createItem('Token', 'A memento of your parents.', 0.1, ['trinket'], 0.1),
    createItem('Common Clothes', 'A set of everyday clothing.', 3, ['clothing'], 0.5)
  ]
};

/**
 * Starting currency by class for custom equipment
 */
export const STARTING_GOLD_BY_CLASS: Record<Class, number> = {
  barbarian: 50, // 2d4 x 10
  bard: 125,     // 5d4 x 10
  cleric: 125,   // 5d4 x 10
  druid: 50,     // 2d4 x 10
  fighter: 150,  // 5d4 x 10
  monk: 25,      // 5d4
  paladin: 150,  // 5d4 x 10
  ranger: 125,   // 5d4 x 10
  rogue: 100,    // 4d4 x 10
  sorcerer: 75,  // 3d4 x 10
  warlock: 100,  // 4d4 x 10
  wizard: 100    // 4d4 x 10
};

/**
 * Manages character equipment and starting kits
 */
export class EquipmentManager {
  /**
   * Get a starting equipment kit for a character class
   */
  public getEquipmentKitForClass(characterClass: Class): EquipmentKit | null {
    return CLASS_EQUIPMENT_KITS.find(kit => kit.compatibleClasses.includes(characterClass)) || null;
  }
  
  /**
   * Get background equipment for a character background
   */
  public getBackgroundEquipment(background: Background): Item[] {
    return BACKGROUND_EQUIPMENT[background] || [];
  }
  
  /**
   * Apply standard equipment kit to a character
   */
  public applyStandardEquipment(character: Character): Character {
    const updatedCharacter = { ...character };
    
    // Get equipment kit for class
    const classKit = this.getEquipmentKitForClass(character.class);
    
    if (!classKit) {
      console.error(`No equipment kit found for class: ${character.class}`);
      return character;
    }
    
    // Get background equipment
    const bgItems = this.getBackgroundEquipment(character.background);
    
    // Get class kit items
    const kitItems = classKit.items;
    
    // Combine class and background equipment
    const allItems = [...kitItems, ...bgItems];
    
    // Set equipment and inventory
    updatedCharacter.equipment = allItems;
    updatedCharacter.inventory = {
      gold: classKit.currency.gold,
      items: allItems
    };
    
    // Set starting wealth
    updatedCharacter.wealth = {
      copper: classKit.currency.copper,
      silver: classKit.currency.silver,
      electrum: classKit.currency.electrum,
      gold: classKit.currency.gold,
      platinum: classKit.currency.platinum
    };
    
    return updatedCharacter;
  }
  
  /**
   * Apply custom equipment to a character (for purchasing your own)
   */
  public applyCustomEquipment(character: Character, purchasedItems: Item[]): Character {
    const updatedCharacter = { ...character };
    
    // Combine all items
    const allItems = [...purchasedItems];
    
    // Set equipment and inventory
    updatedCharacter.equipment = allItems;
    updatedCharacter.inventory = {
      gold: 0,
      items: allItems
    };
    
    // Set starting wealth (minus purchases)
    const startingGold = STARTING_GOLD_BY_CLASS[character.class];
    const spentGold = purchasedItems.reduce((total, item) => {
      const quantity = (item as EquipmentItem).quantity || 1;
      return total + (item.value * quantity);
    }, 0);
    
    const remainingGold = Math.max(0, startingGold - spentGold);
    
    updatedCharacter.wealth = {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: remainingGold,
      platinum: 0
    };
    
    return updatedCharacter;
  }
  
  /**
   * Calculate total equipment value (in gold pieces)
   */
  public calculateEquipmentValue(items: Item[]): number {
    if (!items || items.length === 0) {
      return 0;
    }
    
    return items.reduce((total, item) => {
      const quantity = (item as EquipmentItem).quantity || 1;
      return total + (item.value * quantity);
    }, 0);
  }
  
  /**
   * Calculate total equipment weight
   */
  public calculateEquipmentWeight(items: Item[]): number {
    return items.reduce((total, item) => {
      const quantity = (item as EquipmentItem).quantity || 1;
      return total + (item.weight * quantity);
    }, 0);
  }
  
  public calculateTotalValue(character: Character): number {
    if (!character.inventory || character.inventory.items.length === 0) {
      return 0;
    }
    
    return character.inventory.items.reduce((total: number, item: Item) => {
      const quantity = (item as EquipmentItem).quantity || 1;
      return total + (item.value * quantity);
    }, 0);
  }
  
  public calculateTotalWeight(character: Character): number {
    if (!character.inventory || character.inventory.items.length === 0) {
      return 0;
    }
    
    return character.inventory.items.reduce((total: number, item: Item) => {
      const quantity = (item as EquipmentItem).quantity || 1;
      return total + (item.weight * quantity);
    }, 0);
  }
}

// Singleton instance
export const equipmentManager = new EquipmentManager();
export default equipmentManager;

/**
 * Creates starting equipment based on character class
 * 
 * @param characterClass - The character's class (e.g., 'fighter', 'wizard')
 * @param character - The character to create equipment for
 * @returns An array of items representing the starting equipment
 */
export function createStartingEquipment(characterClass: string, character: Character): Item[] {
  // Default empty equipment set
  const equipment: Item[] = [];
  
  // Generate class-specific equipment
  switch(characterClass.toLowerCase()) {
    case 'fighter':
      // Basic fighter equipment
      equipment.push(
        createWeapon('Longsword', '1d8', 'slashing', 3, ['versatile', 'martial'], 15),
        createArmor('Chain Mail', 16, 55, ['heavy', 'metal'], 75),
        createItem('Shield', 'A wooden shield reinforced with metal.', 6, ['shield'], 10),
        createItem('Adventurer\'s Pack', 'Contains basic adventuring gear.', 10, ['pack'], 12)
      );
      break;
    case 'wizard':
      // Basic wizard equipment
      equipment.push(
        createWeapon('Quarterstaff', '1d6', 'bludgeoning', 4, ['versatile', 'simple'], 2),
        createItem('Spellbook', 'A book containing your wizardly knowledge.', 3, ['focus', 'spellcasting'], 50),
        createItem('Component Pouch', 'A small pouch of spell components.', 2, ['spellcasting'], 25),
        createItem('Scholar\'s Pack', 'Contains scholarly supplies.', 10, ['pack'], 40)
      );
      break;
    case 'rogue':
      // Basic rogue equipment
      equipment.push(
        createWeapon('Shortsword', '1d6', 'piercing', 2, ['finesse', 'light', 'martial'], 10),
        createWeapon('Shortbow', '1d6', 'piercing', 2, ['ammunition', 'range', 'martial'], 25),
        createItem('Leather Armor', 'Light armor made of leather.', 10, ['light', 'armor'], 10),
        createItem('Thieves\' Tools', 'Tools for picking locks and disarming traps.', 1, ['tool'], 25),
        createItem('Burglar\'s Pack', 'Contains tools useful for burglary.', 10, ['pack'], 16)
      );
      break;
    // Add more classes as needed
    default:
      // Generic equipment for any class
      equipment.push(
        createWeapon('Dagger', '1d4', 'piercing', 1, ['finesse', 'light', 'thrown', 'simple'], 2),
        createItem('Adventurer\'s Pack', 'Contains basic adventuring gear.', 10, ['pack'], 12)
      );
  }
  
  return equipment;
} 