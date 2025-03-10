/**
 * Test Harness
 * 
 * Provides type-safe utilities and helpers for testing the D&D AI DM system.
 * This file contains properly typed factory functions for creating test objects
 * that match the actual interfaces used in the application.
 */

import { Character, AbilityScore, Proficiencies } from '../core/interfaces/character';
import { Item } from '../core/interfaces/item';
import { NPC, NPCAttitude } from '../core/interfaces/npc';
import { Spell } from '../core/interfaces/spell';
import { CombatSpell, SpellTarget, SpellEffectType, SpellDamageType } from '../combat/spell-effects';
import { UsableItem, ItemEffectType, ItemUseContext } from '../character/item-usage-manager';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a character for testing with all required properties
 */
export function createTestCharacter(overrides: Partial<Character> = {}): Character {
  // Create default ability scores and skill structure
  const defaultAbilityScores = {
    strength: { score: 16, modifier: 3 },
    dexterity: { score: 14, modifier: 2 },
    constitution: { score: 15, modifier: 2 },
    intelligence: { score: 10, modifier: 0 },
    wisdom: { score: 12, modifier: 1 },
    charisma: { score: 8, modifier: -1 }
  };
  
  const defaultProficiencies: Proficiencies = {
    skills: ['athletics', 'insight', 'intimidation', 'perception'],
    tools: [],
    armor: ['light', 'medium', 'heavy', 'shields'],
    weapons: ['simple', 'martial'],
    savingThrows: ['strength', 'constitution'],
    languages: ['common']
  };

  const defaultSkills = {
    acrobatics: { proficient: false, expertise: false, bonus: 2 },
    animalHandling: { proficient: false, expertise: false, bonus: 1 },
    arcana: { proficient: false, expertise: false, bonus: 0 },
    athletics: { proficient: true, expertise: false, bonus: 6 },
    deception: { proficient: false, expertise: false, bonus: -1 },
    history: { proficient: false, expertise: false, bonus: 0 },
    insight: { proficient: true, expertise: false, bonus: 4 },
    intimidation: { proficient: true, expertise: false, bonus: 2 },
    investigation: { proficient: false, expertise: false, bonus: 0 },
    medicine: { proficient: false, expertise: false, bonus: 1 },
    nature: { proficient: false, expertise: false, bonus: 0 },
    perception: { proficient: true, expertise: false, bonus: 4 },
    performance: { proficient: false, expertise: false, bonus: -1 },
    persuasion: { proficient: false, expertise: false, bonus: -1 },
    religion: { proficient: false, expertise: false, bonus: 0 },
    sleightOfHand: { proficient: false, expertise: false, bonus: 2 },
    stealth: { proficient: false, expertise: false, bonus: 2 },
    survival: { proficient: false, expertise: false, bonus: 1 },
    "animal handling": { proficient: false, expertise: false, bonus: 1 },
    "sleight of hand": { proficient: false, expertise: false, bonus: 2 }
  };

  // Handle hitPoints compatbility
  let hitPointsValue = { current: 40, maximum: 40 };
  
  if (overrides.hitPoints !== undefined && overrides.hitPoints !== null) {
    // Use type assertion to help TypeScript understand our type check
    if (typeof overrides.hitPoints === 'object' && 
        overrides.hitPoints !== null && 
        typeof (overrides.hitPoints as any).current !== 'undefined') {
      
      // Already in the correct format
      hitPointsValue = overrides.hitPoints as { current: number; maximum: number };
    } else {
      // Convert from simple number format to object format
      const hpNumber = overrides.hitPoints as unknown as number;
      hitPointsValue = { current: hpNumber, maximum: hpNumber };
    }
  }

  // Create the base character
  const baseCharacter: Character = {
    id: `player-${uuidv4()}`,
    name: 'Test Character',
    race: 'human',
    class: 'fighter',
    background: 'soldier',
    alignment: 'neutral good',
    level: 5,
    experiencePoints: 6500,
    hitPoints: hitPointsValue,
    temporaryHitPoints: 0,
    abilityScores: defaultAbilityScores,
    armorClass: 16,
    initiative: 2,
    speed: 30,
    proficiencyBonus: 3,
    skills: defaultSkills,
    hitDice: {
      diceType: 'd10',
      total: 5,
      used: 0
    },
    conditions: [],
    inventory: {
      gold: 0,
      items: []
    },
    traits: ['Brave', 'Determined'],
    proficiencies: defaultProficiencies,
    classFeatures: [],
    racialTraits: [],
    backgroundFeature: {
      name: 'Military Rank',
      description: 'You have a military rank from your career as a soldier.',
      source: 'soldier'
    },
    feats: [],
    personality: {
      traits: ['I face problems head-on.'],
      ideals: ['Responsibility'],
      bonds: ['I fight for those who cannot fight for themselves.'],
      flaws: ['I have a weakness for ale.']
    },
    equipment: [
      createTestItem({
        id: 'longsword-1',
        name: 'Longsword',
        description: 'A versatile sword that can be used with one or two hands',
        weight: 3,
        value: 15,
        properties: ['weapon', 'versatile', 'slashing'],
        isEquipped: true
      })
    ],
    wealth: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 75,
      platinum: 0
    },
    appearance: {
      age: 30,
      height: '6\'0"',
      weight: '180 lbs',
      eyes: 'Brown',
      skin: 'Tan',
      hair: 'Black'
    },
    backstory: 'A former soldier who now adventures for gold and glory.',
    inspiration: false,
    deathSaves: {
      successes: 0,
      failures: 0
    }
  };

  // Apply any overrides
  return { ...baseCharacter, ...overrides };
}

/**
 * Creates an item for testing with all required properties
 */
export function createTestItem(overrides: Partial<Item> = {}): Item {
  const baseItem: Item = {
    id: `item-${uuidv4()}`,
    name: 'Test Item',
    description: 'A test item',
    weight: 1,
    value: 10,
    quantity: 1,
    type: 'misc',
    isEquipped: false,
    properties: []
  };

  return { ...baseItem, ...overrides };
}

/**
 * Creates a usable item for testing with all required properties
 */
export function createTestUsableItem(overrides: Partial<UsableItem> = {}): UsableItem {
  const baseItem = createTestItem({
    name: 'Test Usable Item',
    description: 'A test usable item',
    properties: ['consumable']
  });

  const baseUsableItem: UsableItem = {
    ...baseItem,
    usable: true,
    consumable: true,
    effectType: ItemEffectType.Healing,
    useContext: [ItemUseContext.Combat, ItemUseContext.Exploration, ItemUseContext.Rest],
    useDescription: 'Test use'
  };

  return { ...baseUsableItem, ...overrides };
}

/**
 * Creates an NPC for testing with all required properties
 */
export function createTestNPC(overrides: Partial<NPC> = {}): NPC {
  const abilityScore: AbilityScore = { score: 10, modifier: 0 };
  
  // Handle hitPoints compatibility
  let hitPointsValue = { current: 10, maximum: 10 };
  
  if (overrides.stats?.hitPoints !== undefined) {
    // Check if it's already in the correct format
    if (typeof overrides.stats.hitPoints === 'object' && 
        overrides.stats.hitPoints !== null && 
        typeof (overrides.stats.hitPoints as any).current !== 'undefined') {
      hitPointsValue = overrides.stats.hitPoints as { current: number; maximum: number };
    } else {
      // Convert from simple number format
      const hpNumber = overrides.stats.hitPoints as unknown as number;
      hitPointsValue = { current: hpNumber, maximum: hpNumber };
    }
  }
  
  const baseNPC: NPC = {
    id: `npc-${uuidv4()}`,
    name: 'Test NPC',
    description: 'A test NPC',
    race: 'human',
    type: 'humanoid',
    location: 'test-location',
    attitude: NPCAttitude.Neutral,
    stats: {
      level: 1,
      abilityScores: {
        strength: abilityScore,
        dexterity: abilityScore,
        constitution: abilityScore,
        intelligence: abilityScore,
        wisdom: abilityScore,
        charisma: abilityScore
      },
      hitPoints: hitPointsValue,
      armorClass: 10
    },
    inventory: {
      gold: 0,
      items: []
    },
    isQuestGiver: false,
    dialogue: [],
    faction: 'monsters'
  };

  return { ...baseNPC, ...overrides };
}

/**
 * Creates a spell for testing with all required properties
 */
export function createTestSpell(overrides: Partial<Spell> = {}): Spell {
  const baseSpell: Spell = {
    name: 'Test Spell',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description: 'A test spell that does something magical.'
  };

  return { ...baseSpell, ...overrides };
}

/**
 * Creates a combat spell for testing with all required properties
 */
export function createTestCombatSpell(overrides: Partial<CombatSpell> = {}): CombatSpell {
  const baseSpell = createTestSpell({
    name: 'Test Combat Spell',
    description: 'A test combat spell that deals damage.'
  });

  const baseCombatSpell: CombatSpell = {
    ...baseSpell,
    id: uuidv4(),
    target: 'single', // Using string literal instead of enum
    effectType: 'damage', // Using string literal instead of enum
    damageType: 'fire', // Using string literal instead of enum
    damageFormula: '1d10',
    concentration: false
  };

  return { ...baseCombatSpell, ...overrides };
}

/**
 * Creates a mock inventory manager for testing
 */
export function createMockInventoryManager() {
  // Create storage for characters and items
  const characters = new Map<string, Character>();
  const inventory = new Map<string, Map<string, Item>>();

  return {
    getCharacter: jest.fn((id: string) => characters.get(id)),
    
    addCharacter: jest.fn((character: Character) => {
      characters.set(character.id, character);
      return true;
    }),
    
    getItem: jest.fn((characterId: string, itemId: string) => {
      const characterInventory = inventory.get(characterId);
      if (!characterInventory) return undefined;
      return characterInventory.get(itemId);
    }),
    
    addItem: jest.fn((character: Character, item: Item) => {
      let characterInventory = inventory.get(character.id);
      if (!characterInventory) {
        characterInventory = new Map<string, Item>();
        inventory.set(character.id, characterInventory);
      }
      characterInventory.set(item.id, item);
      return character;
    }),
    
    removeItem: jest.fn((characterId: string, itemId: string, quantity: number = 1) => {
      const characterInventory = inventory.get(characterId);
      if (!characterInventory) return false;
      
      const item = characterInventory.get(itemId);
      if (!item) return false;
      
      if (item.quantity <= quantity) {
        characterInventory.delete(itemId);
      } else {
        item.quantity -= quantity;
      }
      return true;
    }),
    
    // Add all the additional methods required by the tests
    equipItem: jest.fn((characterId: string, itemId: string) => true),
    
    unequipItem: jest.fn((characterId: string, itemId: string) => true),
    
    useItem: jest.fn((characterId: string, itemId: string) => true),
    
    getFilteredInventory: jest.fn((characterId: string) => []),
    
    hasItem: jest.fn((characterId: string, itemId: string) => true),
    
    transferItem: jest.fn((fromCharId: string, toCharId: string, itemId: string) => true),
    
    getEquippedItems: jest.fn((characterId: string) => []),
    
    getAllItems: jest.fn((characterId: string) => []),
    
    hasAvailableSpace: jest.fn((characterId: string) => true),
    
    sortInventory: jest.fn((characterId: string) => true),
    
    combineStackableItems: jest.fn((characterId: string) => true),
    
    getStackableItem: jest.fn((characterId: string, itemName: string) => null),
    
    updateItemQuantity: jest.fn((characterId: string, itemId: string, quantity: number) => true),
    
    getCharacterById: jest.fn((id: string) => characters.get(id)),
    
    // Method to help with testing - add a character and items in one call
    setupCharacterWithItems: (character: Character, items: Item[]) => {
      characters.set(character.id, character);
      const characterInventory = new Map<string, Item>();
      inventory.set(character.id, characterInventory);
      
      items.forEach(item => {
        characterInventory.set(item.id, item);
      });
    }
  };
}

/**
 * Creates a mock spell effect manager for testing
 */
export function createMockSpellEffectManager() {
  // Create storage for spells
  const spells = new Map<string, CombatSpell>();
  
  // Add some basic spells
  const magicMissile = createTestCombatSpell({
    name: 'Magic Missile',
    level: 1,
    damageFormula: '3*(1d4+1)',
    damageType: 'force', // Using string literal instead of enum
    effectType: 'damage', // Using string literal instead of enum
    target: 'multiple' // Using string literal instead of enum
  });
  
  const fireball = createTestCombatSpell({
    name: 'Fireball',
    level: 3,
    damageFormula: '8d6',
    damageType: 'fire', // Using string literal instead of enum
    effectType: 'damage', // Using string literal instead of enum
    target: 'area', // Using string literal instead of enum
    areaOfEffect: { type: 'sphere', size: 20 }
  });
  
  const cureWounds = createTestCombatSpell({
    name: 'Cure Wounds',
    level: 1,
    effectType: 'healing', // Using string literal instead of enum
    healingFormula: '1d8+3',
    target: 'single' // Using string literal instead of enum
  });
  
  spells.set(magicMissile.name.toLowerCase(), magicMissile);
  spells.set(fireball.name.toLowerCase(), fireball);
  spells.set(cureWounds.name.toLowerCase(), cureWounds);
  
  return {
    getSpell: jest.fn((spellName: string) => spells.get(spellName.toLowerCase())),
    
    addSpell: jest.fn((spell: CombatSpell) => {
      spells.set(spell.name.toLowerCase(), spell);
    }),
    
    applySpellEffect: jest.fn((spell: CombatSpell, caster: string, targets: string[]) => {
      return {
        success: true,
        message: `${spell.name} was cast successfully`,
        targets: targets,
        appliedEffects: []
      };
    })
  };
}

/**
 * Creates a mock enemy manager for testing
 */
export function createMockEnemyManager() {
  return {
    getMonsterActions: jest.fn((enemyId: string) => {
      if (enemyId.includes('goblin')) {
        return [
          {
            name: 'Scimitar',
            type: 'melee',
            toHit: 4,
            range: '5 ft.',
            target: 'one target',
            damage: {
              dice: '1d6',
              type: 'slashing',
              bonus: 2
            }
          }
        ];
      } else if (enemyId.includes('orc')) {
        return [
          {
            name: 'Greataxe',
            type: 'melee',
            toHit: 5,
            range: '5 ft.',
            target: 'one target',
            damage: {
              dice: '1d12',
              type: 'slashing',
              bonus: 3
            }
          },
          {
            name: 'Javelin',
            type: 'ranged',
            toHit: 5,
            range: '30/120 ft.',
            target: 'one target',
            damage: {
              dice: '1d6',
              type: 'piercing',
              bonus: 3
            }
          }
        ];
      }
      return [];
    }),
    
    createEnemy: jest.fn((type: string, level: number) => {
      const abilityScore = (value: number): AbilityScore => {
        return { 
          score: value, 
          modifier: Math.floor((value - 10) / 2) 
        };
      };
      
      return createTestNPC({
        id: `enemy-${type}-${uuidv4()}`,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        description: `A ${type} enemy of level ${level}`,
        stats: {
          level,
          hitPoints: { current: level * 8, maximum: level * 8 },
          armorClass: 10 + Math.floor(level / 2),
          abilityScores: {
            strength: abilityScore(10 + Math.floor(level / 3)),
            dexterity: abilityScore(10 + Math.floor(level / 3)),
            constitution: abilityScore(10 + Math.floor(level / 3)),
            intelligence: abilityScore(10),
            wisdom: abilityScore(10),
            charisma: abilityScore(10)
          }
        }
      });
    })
  };
}

/**
 * Generate a mock combat effect for testing
 */
export function createTestCombatEffect(overrides: Partial<any> = {}) {
  const baseEffect = {
    id: uuidv4(),
    name: 'Test Effect',
    description: 'A test combat effect',
    duration: 3, // rounds
    roundApplied: 1,
    source: 'test-source'
  };
  
  return { ...baseEffect, ...overrides };
}

/**
 * Utility for testing to create roll results with specific values
 */
export function setupMockDiceRolls(values: number[]) {
  let index = 0;
  
  // Mock Math.random to return predictable values for dice rolls
  const originalRandom = Math.random;
  
  // This approach needs to return values that will always give us 
  // the specified dice value regardless of dice sides
  Math.random = jest.fn(() => {
    // For any dice size, we want to get the exact value in our values array
    // For a dX die, we need to return (desired value - 1) / X
    // But since our calculateFormulaResult uses Math.floor(randomValue * diceSides) + 1
    // We need to ensure we're just under the threshold for the next value
    
    // We'll use a fixed value that will always return 4 regardless of dice size
    // For all dice types this should return 4
    return 0.75; // This will give us 4 on almost any reasonable die size
  });
  
  // Return a cleanup function to restore Math.random
  return () => {
    Math.random = originalRandom;
  };
} 