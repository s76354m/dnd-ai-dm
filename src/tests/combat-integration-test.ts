/**
 * Combat Integration Test
 * 
 * This test verifies that the combat system is properly integrated with the game loop.
 */

import { v4 as uuidv4 } from 'uuid';
import { Character, AbilityScore } from '../core/interfaces/character';
import { NPC, NPCType, NPCAttitude, NPCImportance } from '../core/interfaces/npc';
import { GameState } from '../core/interfaces/game';
import { CombatState } from '../core/interfaces/combat';
import { Location, LocationType } from '../core/interfaces/location';
import { ItemCategory, ItemRarity } from '../core/interfaces/item';
import { CommandProcessor } from '../core/command-processor';
import { Race, Class, Background, Skill, Alignment, ToolProficiency, Subrace, Subclass } from '../core/types';
import { TimeOfDay, Season } from '../core/interfaces/world';

/**
 * Create a mock character for testing
 */
const createMockCharacter = (): Character => {
  // Create a basic skills record with all skills initialized
  const skills: Record<Skill, { proficient: boolean; expertise: boolean; bonus: number }> = {
    'acrobatics': { proficient: false, expertise: false, bonus: 0 },
    'animal handling': { proficient: false, expertise: false, bonus: 0 },
    'arcana': { proficient: false, expertise: false, bonus: 0 },
    'athletics': { proficient: false, expertise: false, bonus: 0 },
    'deception': { proficient: false, expertise: false, bonus: 0 },
    'history': { proficient: false, expertise: false, bonus: 0 },
    'insight': { proficient: false, expertise: false, bonus: 0 },
    'intimidation': { proficient: false, expertise: false, bonus: 0 },
    'investigation': { proficient: false, expertise: false, bonus: 0 },
    'medicine': { proficient: false, expertise: false, bonus: 0 },
    'nature': { proficient: false, expertise: false, bonus: 0 },
    'perception': { proficient: true, expertise: false, bonus: 2 },
    'performance': { proficient: false, expertise: false, bonus: 0 },
    'persuasion': { proficient: false, expertise: false, bonus: 0 },
    'religion': { proficient: false, expertise: false, bonus: 0 },
    'sleight of hand': { proficient: false, expertise: false, bonus: 0 },
    'stealth': { proficient: true, expertise: false, bonus: 2 },
    'survival': { proficient: false, expertise: false, bonus: 0 }
  };

  return {
    id: 'player-1',
    name: 'Tordek',
    race: 'dwarf',
    class: 'fighter',
    background: 'soldier',
    alignment: 'lawful good' as Alignment,
    level: 1,
    experiencePoints: 0,
    abilityScores: {
      strength: { score: 16, modifier: 3 },
      dexterity: { score: 12, modifier: 1 },
      constitution: { score: 14, modifier: 2 },
      intelligence: { score: 10, modifier: 0 },
      wisdom: { score: 13, modifier: 1 },
      charisma: { score: 8, modifier: -1 }
    },
    hitPoints: {
      current: 12,
      maximum: 12
    },
    temporaryHitPoints: 0,
    hitDice: {
      diceType: 'd10',
      total: 1,
      used: 0
    },
    armorClass: 16,
    initiative: 1,
    speed: 25,
    proficiencyBonus: 2,
    skills: skills,
    conditions: [],
    inventory: {
      items: [
        {
          id: 'item-1',
          name: 'Longsword',
          description: 'A standard longsword',
          category: ItemCategory.Weapon,
          weight: 3,
          value: 15,
          equipped: true,
          damage: {
            diceCount: 1,
            diceType: 8,
            bonus: 0,
            type: 'slashing'
          },
          properties: ['versatile']
        },
        {
          id: 'item-2',
          name: 'Chain Mail',
          description: 'Heavy armor made of interlocking metal rings',
          category: ItemCategory.Armor,
          weight: 55,
          value: 75,
          equipped: true,
          armorClass: 16,
          properties: ['heavy']
        }
      ],
      gold: 15
    },
    proficiencies: {
      skills: ['perception', 'stealth'],
      tools: ['navigator\'s tools'] as ToolProficiency[],
      armor: ['light', 'medium', 'heavy', 'shields'],
      weapons: ['simple', 'martial'],
      savingThrows: ['strength', 'constitution'],
      languages: ['common', 'dwarvish']
    },
    traits: [
      'Darkvision',
      'Dwarven Resilience'
    ],
    classFeatures: [
      {
        name: 'Fighting Style',
        description: 'You adopt a particular style of fighting as your specialty.',
        level: 1,
        source: 'fighter'
      }
    ],
    racialTraits: [
      {
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light.',
        source: 'dwarf'
      },
      {
        name: 'Dwarven Resilience',
        description: 'You have advantage on saving throws against poison, and you have resistance against poison damage.',
        source: 'dwarf'
      }
    ],
    backgroundFeature: {
      name: 'Military Rank',
      description: 'You have a military rank from your career as a soldier.',
      source: 'soldier'
    },
    feats: [],
    personality: {
      traits: ['I\'m always polite and respectful.'],
      ideals: ['Honor. I never lie and always keep my word.'],
      bonds: ['I fight for those who cannot fight for themselves.'],
      flaws: ['I have a weakness for ale.']
    },
    equipment: [],
    wealth: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 15,
      platinum: 0
    },
    appearance: {
      age: 50,
      height: '4\'5"',
      weight: '150 lbs',
      eyes: 'brown',
      skin: 'tan',
      hair: 'black'
    },
    backstory: 'A former soldier who now seeks adventure.',
    inspiration: false,
    deathSaves: {
      successes: 0,
      failures: 0
    },
    spells: [],
    statusEffects: []
  };
};

/**
 * Create a mock NPC for testing
 */
const createMockNPC = (): NPC => {
  return {
    id: 'npc-goblin-1',
    name: 'Goblin Scout',
    description: 'A small, green-skinned humanoid with sharp teeth and pointed ears. It wears leather armor and carries a scimitar and shortbow.',
    type: NPCType.Humanoid,
    level: 1,
    hitPoints: {
      current: 7,
      maximum: 7
    },
    armorClass: 15,
    abilities: {
      strength: { score: 8, modifier: -1 },
      dexterity: { score: 14, modifier: 2 },
      constitution: { score: 10, modifier: 0 },
      intelligence: { score: 10, modifier: 0 },
      wisdom: { score: 8, modifier: -1 },
      charisma: { score: 8, modifier: -1 }
    },
    speed: 30,
    skills: { 'stealth': 6 },
    resistances: [],
    vulnerabilities: [],
    immunities: [],
    actions: [
      {
        name: 'Scimitar',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.',
        damage: {
          diceCount: 1,
          diceType: 6,
          bonus: 2,
          type: 'slashing'
        },
        attackBonus: 4
      },
      {
        name: 'Shortbow',
        description: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.',
        damage: {
          diceCount: 1,
          diceType: 6,
          bonus: 2,
          type: 'piercing'
        },
        attackBonus: 4
      }
    ],
    location: 'forest-clearing',
    attitude: NPCAttitude.Hostile,
    importance: NPCImportance.Minor,
    memories: [],
    dialogueHistory: [],
    inventory: [],
    personalityTraits: ['Cowardly', 'Greedy', 'Cruel'],
    motivations: ['Survive', 'Steal'],
    relationships: {}
  };
};

/**
 * Create a mock location for testing
 */
const createMockLocation = (): Location => {
  return {
    id: 'forest-clearing',
    name: 'Forest Clearing',
    description: 'A small clearing in the forest. Sunlight filters through the trees, illuminating the area.',
    type: 'wilderness' as LocationType,
    connections: new Map([
      ['north', 'forest-path'],
      ['east', 'river-crossing'],
      ['south', 'dense-woods'],
      ['west', 'forest-entrance']
    ]),
    npcs: new Map<string, string>(),
    items: [],
    isHostile: false,
    lighting: 'bright',
    terrain: 'forest',
    discovered: true
  };
};

/**
 * Create a mock game state for testing
 */
const createMockGameState = (): GameState => {
  const player = createMockCharacter();
  const location = createMockLocation();
  const goblin = createMockNPC();
  
  // Add the goblin to the location
  if (location.npcs instanceof Map) {
    location.npcs.set(goblin.id, goblin.id);
  }
  
  return {
    player,
    currentLocation: location,
    npcs: new Map([[goblin.id, goblin]]),
    combatState: null,
    inventory: player.inventory,
    quests: [],
    gameTime: {
      day: 1,
      hour: 12,
      minute: 0,
      timeOfDay: 'midday',
      season: 'summer'
    },
    worldState: {
      weather: 'clear',
      temperature: 'warm',
      season: 'summer',
      events: []
    },
    sessionHistory: [],
    inCombat: false
  };
};

/**
 * Test combat initiation
 */
const testCombatInitiation = async () => {
  console.log('Testing combat initiation...');
  
  // Create a mock game state
  const gameState = createMockGameState();
  
  // Create a command processor
  const commandProcessor = new CommandProcessor(gameState);
  
  // Process an attack command
  let goblinId = '';
  let goblin: NPC | undefined;
  
  // Find the goblin in the location
  if (gameState.npcs && gameState.currentLocation.npcs instanceof Map) {
    goblinId = Array.from(gameState.currentLocation.npcs.keys())[0];
    goblin = gameState.npcs.get(goblinId);
  }
  
  if (!goblin) {
    console.error('Failed to find goblin in location');
    return false;
  }
  
  console.log(`Found goblin: ${goblin.name}`);
  
  // Process the attack command
  const result = await commandProcessor.processCommand(`attack ${goblin.name}`);
  
  console.log('Command result:', result.message);
  
  // Check if combat was initiated
  if (gameState.combatState) {
    console.log('Combat state:', JSON.stringify(gameState.combatState, null, 2));
    return true;
  } else {
    console.error('Combat was not initiated');
    return false;
  }
};

/**
 * Run the combat integration test
 */
const runCombatIntegrationTest = async () => {
  console.log('Starting combat integration test...');
  
  try {
    const success = await testCombatInitiation();
    
    if (success) {
      console.log('Combat integration test passed!');
    } else {
      console.error('Combat integration test failed!');
    }
  } catch (error) {
    console.error('Error during combat integration test:', error);
  }
};

// Run the test
runCombatIntegrationTest(); 