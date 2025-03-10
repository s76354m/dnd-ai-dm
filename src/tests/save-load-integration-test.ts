/**
 * Save/Load Integration Test
 * 
 * This script tests the integration of the save/load system with the game loop.
 * It creates a game state, saves it, modifies it, loads the original state,
 * and verifies that the loaded state matches the original.
 */

import * as path from 'path';
import * as fs from 'fs';
import { SaveManager, SaveMetadata } from '../persistence/save-manager';
import { GameState } from '../core/interfaces/game';
import { Character, AbilityScore } from '../core/interfaces/character';
import { validRaces } from '../core/types/index';
import { ItemCategory } from '../core/interfaces/item';
import { NPCType, NPCAttitude, NPCImportance } from '../core/interfaces/npc';
import { TimeOfDay, Season } from '../core/interfaces/world';

// Test directory for saves
const TEST_SAVE_DIR = path.join(process.cwd(), 'test-saves');

// Ensure test directory exists
if (!fs.existsSync(TEST_SAVE_DIR)) {
  fs.mkdirSync(TEST_SAVE_DIR, { recursive: true });
}

// Clean up any existing test saves
const cleanupTestSaves = () => {
  const files = fs.readdirSync(TEST_SAVE_DIR);
  for (const file of files) {
    fs.unlinkSync(path.join(TEST_SAVE_DIR, file));
  }
};

// Create a mock character for testing
const createMockCharacter = (): Partial<Character> => {
  return {
    id: 'test-character-id',
    name: 'Test Character',
    level: 1,
    race: 'human',
    class: 'fighter',
    background: 'soldier',
    alignment: 'lawful good',
    experiencePoints: 0,
    abilityScores: {
      strength: { score: 16, modifier: 3 },
      dexterity: { score: 14, modifier: 2 },
      constitution: { score: 15, modifier: 2 },
      intelligence: { score: 10, modifier: 0 },
      wisdom: { score: 12, modifier: 1 },
      charisma: { score: 8, modifier: -1 }
    },
    hitPoints: { current: 12, maximum: 12 },
    temporaryHitPoints: 0,
    hitDice: {
      diceType: 'd10',
      total: 1,
      used: 0
    },
    armorClass: 16,
    initiative: 2,
    speed: 30,
    proficiencyBonus: 2,
    skills: {
      acrobatics: { proficient: false, expertise: false, bonus: 2 },
      'animal handling': { proficient: false, expertise: false, bonus: 1 },
      arcana: { proficient: false, expertise: false, bonus: 0 },
      athletics: { proficient: true, expertise: false, bonus: 5 },
      deception: { proficient: false, expertise: false, bonus: -1 },
      history: { proficient: false, expertise: false, bonus: 0 },
      insight: { proficient: false, expertise: false, bonus: 1 },
      intimidation: { proficient: true, expertise: false, bonus: 1 },
      investigation: { proficient: false, expertise: false, bonus: 0 },
      medicine: { proficient: false, expertise: false, bonus: 1 },
      nature: { proficient: false, expertise: false, bonus: 0 },
      perception: { proficient: false, expertise: false, bonus: 1 },
      performance: { proficient: false, expertise: false, bonus: -1 },
      persuasion: { proficient: false, expertise: false, bonus: -1 },
      religion: { proficient: false, expertise: false, bonus: 0 },
      'sleight of hand': { proficient: false, expertise: false, bonus: 2 },
      stealth: { proficient: false, expertise: false, bonus: 2 },
      survival: { proficient: false, expertise: false, bonus: 1 }
    },
    conditions: [],
    inventory: {
      gold: 15,
      items: [
        {
          id: 'longsword',
          name: 'Longsword',
          description: 'A versatile sword',
          category: ItemCategory.Weapon,
          weight: 3,
          value: 15,
          properties: ['versatile'],
          damage: {
            diceCount: 1,
            diceType: 8,
            bonus: 0,
            type: 'slashing'
          }
        },
        {
          id: 'shield',
          name: 'Shield',
          description: 'A sturdy shield',
          category: ItemCategory.Shield,
          weight: 6,
          value: 10,
          armorClass: 2
        }
      ]
    },
    traits: [
      'I am brave in the face of danger.',
      'Honor above all else.',
      'I fight for those who cannot fight for themselves.',
      'I sometimes act without thinking.'
    ],
    proficiencies: {
      skills: ['athletics', 'intimidation'],
      tools: ['musical instrument'],
      armor: ['light', 'medium', 'heavy', 'shields'],
      weapons: ['simple', 'martial'],
      savingThrows: ['strength', 'constitution'],
      languages: ['common']
    },
    classFeatures: [],
    racialTraits: []
  };
};

// Create a mock game state for testing
const createMockGameState = (): Partial<GameState> => {
  return {
    sessionId: 'test-session',
    player: createMockCharacter() as Character,
    currentLocation: {
      id: 'test-tavern',
      name: 'Test Tavern',
      description: 'A cozy tavern with a warm fireplace.',
      exits: [
        { direction: 'north', locationId: 'town-square', description: 'The door leads to the town square.' },
        { direction: 'east', locationId: 'market', description: 'A window shows the market outside.' }
      ],
      npcs: [
        {
          id: 'barkeep',
          name: 'Barkeep',
          description: 'A friendly barkeep with a bushy mustache.',
          type: NPCType.Humanoid,
          level: 2,
          hitPoints: {
            current: 15,
            maximum: 15
          },
          armorClass: 10,
          abilities: {
            strength: { score: 10, modifier: 0 },
            dexterity: { score: 12, modifier: 1 },
            constitution: { score: 14, modifier: 2 },
            intelligence: { score: 10, modifier: 0 },
            wisdom: { score: 12, modifier: 1 },
            charisma: { score: 14, modifier: 2 }
          },
          speed: 30,
          skills: {
            'persuasion': 4
          },
          resistances: [],
          vulnerabilities: [],
          immunities: [],
          actions: [],
          location: 'test-tavern',
          attitude: NPCAttitude.Friendly,
          importance: NPCImportance.Minor,
          memories: [],
          dialogueHistory: [],
          inventory: [],
          personalityTraits: ['friendly', 'talkative'],
          motivations: ['run a successful tavern'],
          relationships: {},
          dialogue: {
            greeting: 'Welcome to my tavern, traveler!',
            topics: new Map([
              ['rumors', 'I heard there are goblins in the nearby hills.'],
              ['drinks', 'We have the finest ale in the region!']
            ])
          }
        }
      ],
      items: []
    },
    quests: [],
    visitedLocations: ['test-tavern'],
    gameTime: {
      day: 1,
      hour: 12,
      minute: 0,
      month: 1,
      year: 1490,
      timeOfDay: 'midday' as TimeOfDay,
      season: 'summer' as Season,
      totalMinutes: 720
    }
  };
};

// Test save and load functionality
const testSaveAndLoad = async () => {
  console.log('Starting save/load integration test...');
  
  // Clean up any existing test saves
  cleanupTestSaves();
  
  // Create a mock game state
  const gameState = createMockGameState() as GameState;
  
  // Initialize the save manager
  const saveManager = new SaveManager(TEST_SAVE_DIR);
  await saveManager.initialize(TEST_SAVE_DIR);
  
  // Test saving game state
  console.log('Testing save functionality...');
  const saveDescription = 'Test save';
  const saveResult = await saveManager.saveGame(gameState, saveDescription);
  
  if (!saveResult.success) {
    console.error(`FAIL: Could not save game: ${saveResult.message}`);
    return false;
  }
  
  console.log(`Game saved with ID: ${saveResult.metadata?.id}`);
  
  // Verify save file exists
  const saveExists = fs.existsSync(saveResult.path!);
  console.log(`Save file exists: ${saveExists}`);
  
  if (!saveExists) {
    console.error('FAIL: Save file was not created');
    return false;
  }
  
  // Modify game state to verify load works
  gameState.player.name = 'Modified Character';
  gameState.player.hitPoints.current = 5;
  gameState.currentLocation.name = 'Modified Location';
  
  // Test loading game state
  console.log('Testing load functionality...');
  const loadResult = await saveManager.loadGame(saveResult.metadata!.id);
  
  if (!loadResult.success || !loadResult.state) {
    console.error(`FAIL: Failed to load game state: ${loadResult.message}`);
    return false;
  }
  
  // Verify loaded state matches original state
  const originalName = 'Test Character';
  const originalHP = 12;
  const originalLocation = 'Test Tavern';
  
  const nameMatches = loadResult.state.player.name === originalName;
  const hpMatches = loadResult.state.player.hitPoints.current === originalHP;
  const locationMatches = loadResult.state.currentLocation.name === originalLocation;
  
  console.log(`Loaded character name matches: ${nameMatches}`);
  console.log(`Loaded character HP matches: ${hpMatches}`);
  console.log(`Loaded location name matches: ${locationMatches}`);
  
  if (!nameMatches || !hpMatches || !locationMatches) {
    console.error('FAIL: Loaded game state does not match original state');
    return false;
  }
  
  // Test listing saves
  console.log('Testing list saves functionality...');
  const saves = await saveManager.getAvailableSaves();
  console.log(`Found ${saves.length} saves`);
  
  if (saves.length !== 1 || saves[0].id !== saveResult.metadata!.id) {
    console.error('FAIL: Save listing does not match expected');
    return false;
  }
  
  // Test deleting save
  console.log('Testing delete save functionality...');
  const deleteSuccess = await saveManager.deleteSave(saveResult.metadata!.id);
  
  if (!deleteSuccess) {
    console.error('FAIL: Could not delete save');
    return false;
  }
  
  const savesAfterDelete = await saveManager.getAvailableSaves();
  console.log(`Found ${savesAfterDelete.length} saves after delete`);
  
  if (savesAfterDelete.length !== 0) {
    console.error('FAIL: Save was not deleted');
    return false;
  }
  
  // Clean up
  cleanupTestSaves();
  
  console.log('PASS: Save/load integration test completed successfully');
  return true;
};

// Run the test
testSaveAndLoad()
  .then(success => {
    if (success) {
      console.log('All tests passed!');
      process.exit(0);
    } else {
      console.error('Tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  }); 