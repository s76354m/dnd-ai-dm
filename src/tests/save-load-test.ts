/**
 * Save/Load System Test
 * 
 * This script tests the save/load functionality by creating a sample game state,
 * saving it, and then loading it back to verify that all data is preserved correctly.
 */

import * as path from 'path';
import { saveManager } from '../persistence/save-manager';
import { GameState } from '../core/interfaces/game';
import { NPCType, NPCAttitude, NPCImportance } from '../core/interfaces/npc';

async function testSaveLoad() {
  console.log('Starting save/load system test...');
  
  try {
    // Initialize the save manager
    await saveManager.initialize(path.join(process.cwd(), 'test-saves'));
    console.log('Save manager initialized.');
    
    // Create a test game state
    const gameState = createTestGameState();
    console.log('Test game state created.');
    
    // Save the game state
    console.log('Saving game state...');
    const saveResult = await saveManager.saveGame(gameState, 'Test Save');
    
    if (!saveResult.success) {
      throw new Error(`Failed to save game: ${saveResult.message}`);
    }
    
    console.log(`Game saved successfully with ID: ${saveResult.metadata?.id}`);
    
    // List available saves
    console.log('Listing available saves:');
    const saves = await saveManager.getAvailableSaves();
    saves.forEach((save, index) => {
      console.log(`${index + 1}. ${save.characterName} (Level ${save.characterLevel}) - ${save.location} - ${new Date(save.timestamp).toLocaleString()}`);
      if (save.description) {
        console.log(`   Description: ${save.description}`);
      }
    });
    
    // Load the saved game
    const saveId = saveResult.metadata?.id;
    if (!saveId) {
      throw new Error('Save ID not found in save result');
    }
    
    console.log(`Loading game with ID: ${saveId}`);
    const loadResult = await saveManager.loadGame(saveId);
    
    if (!loadResult.success || !loadResult.state) {
      throw new Error(`Failed to load game: ${loadResult.message}`);
    }
    
    console.log('Game loaded successfully.');
    
    // Verify that the loaded state matches the original
    verifyGameState(gameState, loadResult.state);
    console.log('Game state verification passed!');
    
    // Test deleting a save
    console.log(`Deleting save with ID: ${saveId}`);
    const deleteResult = await saveManager.deleteSave(saveId);
    
    if (!deleteResult) {
      throw new Error('Failed to delete save');
    }
    
    console.log('Save deleted successfully.');
    
    // Verify the save was deleted
    const savesAfterDelete = await saveManager.getAvailableSaves();
    if (savesAfterDelete.some(save => save.id === saveId)) {
      throw new Error('Save was not deleted properly');
    }
    
    console.log('Save/load system test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

/**
 * Creates a test game state with sample data
 * @returns A test game state
 */
function createTestGameState(): GameState {
  // Create a basic game state for testing
  const gameState: GameState = {
    sessionId: 'test-session',
    player: {
      id: 'test-player',
      name: 'Test Character',
      level: 5,
      race: 'human',
      class: 'fighter',
      background: 'soldier',
      alignment: 'neutral good',
      experiencePoints: 5000,
      hitPoints: {
        maximum: 45,
        current: 30
      },
      temporaryHitPoints: 0,
      armorClass: 16,
      initiative: 2,
      speed: 30,
      proficiencyBonus: 3,
      hitDice: {
        diceType: 'd10',
        total: 5,
        used: 0
      },
      abilityScores: {
        strength: { score: 16, modifier: 3 },
        dexterity: { score: 14, modifier: 2 },
        constitution: { score: 15, modifier: 2 },
        intelligence: { score: 10, modifier: 0 },
        wisdom: { score: 12, modifier: 1 },
        charisma: { score: 8, modifier: -1 }
      },
      skills: {} as any, // We'll skip detailed skills for the test
      conditions: [],
      inventory: {
        items: [],
        gold: 100
      },
      traits: [],
      proficiencies: {
        skills: [],
        tools: [],
        armor: [],
        weapons: [],
        savingThrows: [],
        languages: []
      },
      classFeatures: [],
      racialTraits: [],
      backgroundFeature: {
        name: 'Military Rank',
        description: 'You have a military rank from your career as a soldier.',
        source: 'soldier'
      },
      feats: [],
      personality: {
        traits: [],
        ideals: [],
        bonds: [],
        flaws: []
      },
      equipment: [],
      wealth: {
        copper: 0,
        silver: 0,
        electrum: 0,
        gold: 100,
        platinum: 0
      },
      appearance: {
        age: 30,
        height: '6\'0"',
        weight: '180 lbs',
        eyes: 'blue',
        skin: 'fair',
        hair: 'brown'
      },
      backstory: 'A test character for save/load testing',
      inspiration: false,
      deathSaves: {
        successes: 0,
        failures: 0
      }
    },
    currentLocation: {
      id: 'test-dungeon',
      name: 'Test Dungeon',
      description: 'A test dungeon for save/load testing',
      type: 'dungeon',
      connections: new Map()
    },
    quests: [],
    inventory: {
      items: [],
      gold: 100
    }
  };
  
  // Add a test Map to verify serialization/deserialization
  gameState.locations = new Map();
  gameState.locations.set('test-dungeon', gameState.currentLocation);
  gameState.locations.set('test-town', {
    id: 'test-town',
    name: 'Test Town',
    description: 'A small town for testing',
    type: 'settlement',
    connections: new Map([
      ['north', 'test-dungeon']
    ])
  });
  
  // Add some NPCs
  gameState.npcs = new Map();
  gameState.npcs.set('test-npc', {
    id: 'test-npc',
    name: 'Test NPC',
    description: 'An NPC for testing',
    type: NPCType.Humanoid,
    level: 1,
    hitPoints: {
      current: 10,
      maximum: 10
    },
    armorClass: 10,
    abilities: {
      strength: { score: 10, modifier: 0 },
      dexterity: { score: 10, modifier: 0 },
      constitution: { score: 10, modifier: 0 },
      intelligence: { score: 10, modifier: 0 },
      wisdom: { score: 10, modifier: 0 },
      charisma: { score: 10, modifier: 0 }
    },
    speed: 30,
    skills: {},
    resistances: [],
    vulnerabilities: [],
    immunities: [],
    actions: [],
    location: 'test-town',
    attitude: NPCAttitude.Friendly,
    importance: NPCImportance.Minor,
    memories: [],
    dialogueHistory: [],
    inventory: [],
    personalityTraits: [],
    motivations: [],
    relationships: {},
    dialogue: {
      greeting: 'Hello, adventurer!',
      topics: new Map([
        ['test', 'This is a test dialogue.']
      ])
    }
  });
  
  return gameState;
}

/**
 * Verifies that the loaded game state matches the original
 * @param original The original game state
 * @param loaded The loaded game state
 */
function verifyGameState(original: GameState, loaded: GameState) {
  // Check player data
  console.log('Verifying player data...');
  if (original.player.name !== loaded.player.name) {
    throw new Error(`Player name mismatch: ${original.player.name} vs ${loaded.player.name}`);
  }
  
  if (original.player.level !== loaded.player.level) {
    throw new Error(`Player level mismatch: ${original.player.level} vs ${loaded.player.level}`);
  }
  
  // Check location data
  console.log('Verifying location data...');
  if (original.currentLocation.name !== loaded.currentLocation.name) {
    throw new Error(`Location name mismatch: ${original.currentLocation.name} vs ${loaded.currentLocation.name}`);
  }
  
  // Check Maps
  console.log('Verifying Map serialization/deserialization...');
  
  // Check locations Map
  if (!(loaded.locations instanceof Map)) {
    throw new Error('Locations is not a Map in loaded state');
  }
  
  if (original.locations?.size !== loaded.locations?.size) {
    throw new Error(`Locations Map size mismatch: ${original.locations?.size} vs ${loaded.locations?.size}`);
  }
  
  // Check nested Maps (connections)
  const testTown = loaded.locations?.get('test-town');
  if (!testTown) {
    throw new Error('Test town not found in loaded state');
  }
  
  if (!(testTown.connections instanceof Map)) {
    throw new Error('Connections is not a Map in loaded state');
  }
  
  const connection = testTown.connections.get('north');
  if (!connection) {
    throw new Error('North connection not found in loaded state');
  }
  
  if (connection !== 'test-dungeon') {
    throw new Error(`Connection destination mismatch: ${connection} vs test-dungeon`);
  }
  
  // Check NPCs Map
  if (!(loaded.npcs instanceof Map)) {
    throw new Error('NPCs is not a Map in loaded state');
  }
  
  const testNpc = loaded.npcs?.get('test-npc');
  if (!testNpc) {
    throw new Error('Test NPC not found in loaded state');
  }
  
  if (testNpc.name !== 'Test NPC') {
    throw new Error(`NPC name mismatch: ${testNpc.name} vs Test NPC`);
  }
  
  // Check nested Maps in NPCs (dialogue topics)
  if (!(testNpc.dialogue?.topics instanceof Map)) {
    throw new Error('Dialogue topics is not a Map in loaded state');
  }
  
  const dialogueTopic = testNpc.dialogue?.topics.get('test');
  if (dialogueTopic !== 'This is a test dialogue.') {
    throw new Error(`Dialogue topic mismatch: ${dialogueTopic} vs 'This is a test dialogue.'`);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSaveLoad().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} 