/**
 * Game Flow Integration Test
 * 
 * Tests the complete end-to-end flow of the game, including:
 * - Character creation
 * - Game initialization
 * - World navigation
 * - NPC interaction
 * - Combat resolution with AI integration
 * - Game state persistence
 * 
 * This serves as a verification that all major systems work together correctly.
 */

import { GameState } from '../../core/interfaces/game-state';
import { Character } from '../../core/interfaces/character';
import { CharacterCreator } from '../../character/character-creator';
import { AIService } from '../../dm/ai-service';
import { createAIServiceWrapper } from '../../ai/ai-service-wrapper';
import { createApiKeyManager } from '../../ai/config/api-key-manager';
import { WorldGenerator } from '../../world/world-generator';
import { CommandProcessor } from '../../core/command-processor';
import { initializeCombatSystem } from '../../combat';
import { InventoryManager } from '../../character/inventory';
import { createGameStateManager } from '../../core/game-state-manager';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Configuration for the test
const TEST_CONFIG = {
  outputDir: path.join(__dirname, 'output'),
  saveGamePath: path.join(__dirname, 'output', 'test-save.json'),
  screenshotPath: path.join(__dirname, 'output', 'screenshots'),
  apiKeyEnvVar: 'OPENAI_API_KEY',
  verboseLogging: true
};

// Ensure output directories exist
if (!fs.existsSync(TEST_CONFIG.outputDir)) {
  fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
}

if (!fs.existsSync(TEST_CONFIG.screenshotPath)) {
  fs.mkdirSync(TEST_CONFIG.screenshotPath, { recursive: true });
}

// Logger helper
const logger = {
  log: (message: string) => {
    console.log(`[INTEGRATION TEST] ${message}`);
    
    if (TEST_CONFIG.verboseLogging) {
      fs.appendFileSync(
        path.join(TEST_CONFIG.outputDir, 'test-log.txt'),
        `${new Date().toISOString()} - ${message}\n`
      );
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[INTEGRATION TEST ERROR] ${message}`, error);
    fs.appendFileSync(
      path.join(TEST_CONFIG.outputDir, 'test-errors.txt'),
      `${new Date().toISOString()} - ${message} ${error ? '- ' + JSON.stringify(error) : ''}\n`
    );
  },
  saveState: (state: GameState, label: string) => {
    try {
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, `game-state-${label}.json`),
        JSON.stringify(state, null, 2)
      );
    } catch (error) {
      logger.error(`Failed to save state snapshot for ${label}`, error);
    }
  }
};

// Mock user input for testing
const mockUserInput = {
  characterCreation: {
    name: 'Thorin',
    race: 'dwarf',
    class: 'fighter',
    abilityScores: {
      strength: 15,
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 13,
      charisma: 8
    },
    background: 'soldier',
    alignment: 'lawful good'
  },
  commands: [
    'look around',
    'inventory',
    'move north',
    'talk to innkeeper',
    'ask about rumors',
    'move east',
    'examine tree',
    'move south',
    'attack goblin'
  ]
};

/**
 * Main test function that runs the complete game flow test
 */
async function runGameFlowTest() {
  logger.log('Starting game flow integration test');
  
  try {
    // STEP 1: Initialize AI Service
    logger.log('Setting up AI Service...');
    const aiService = await setupAIService();
    
    // STEP 2: Character Creation
    logger.log('Creating character...');
    const character = await createCharacter();
    logger.log(`Character created: ${character.name}, ${character.race} ${character.class[0].name}`);
    
    // STEP 3: Initialize Game State
    logger.log('Initializing game state...');
    const gameState = await initializeGameState(character, aiService);
    logger.saveState(gameState, 'initial');
    
    // STEP 4: Process Commands
    logger.log('Testing command processing...');
    const commandResults = await processCommands(gameState, aiService, mockUserInput.commands);
    
    // STEP 5: Test Combat System
    logger.log('Testing combat system...');
    const combatResult = await testCombatSystem(gameState, aiService);
    logger.saveState(gameState, 'post-combat');
    
    // STEP 6: Test Save/Load System
    logger.log('Testing save/load system...');
    const persistenceResult = await testPersistence(gameState);
    
    // STEP 7: Validate Results
    logger.log('Validating test results...');
    const validationResult = validateTestResults(
      character, 
      gameState, 
      commandResults, 
      combatResult, 
      persistenceResult
    );
    
    // Output final results
    if (validationResult.success) {
      logger.log('✅ INTEGRATION TEST PASSED!');
      logger.log(`Test completed with ${validationResult.warnings.length} warnings.`);
      
      if (validationResult.warnings.length > 0) {
        validationResult.warnings.forEach(warning => {
          logger.log(`⚠️ WARNING: ${warning}`);
        });
      }
    } else {
      logger.error('❌ INTEGRATION TEST FAILED!');
      validationResult.errors.forEach(error => {
        logger.error(`ERROR: ${error}`);
      });
    }
    
    return validationResult;
    
  } catch (error) {
    logger.error('Critical failure in integration test', error);
    return {
      success: false,
      errors: [`Critical failure: ${error.message}`],
      warnings: []
    };
  }
}

/**
 * Set up the AI service for testing
 */
async function setupAIService(): Promise<AIService> {
  try {
    // Check for API key in environment
    const apiKey = process.env[TEST_CONFIG.apiKeyEnvVar];
    if (!apiKey) {
      throw new Error(`API key not found in environment variable ${TEST_CONFIG.apiKeyEnvVar}`);
    }
    
    // Create API key manager
    const apiKeyManager = createApiKeyManager({ preferEnvVars: true });
    if (!apiKeyManager.hasApiKey('openai')) {
      apiKeyManager.setApiKey('openai', apiKey);
    }
    
    // Create AI service wrapper
    const aiServiceWrapper = createAIServiceWrapper({
      defaultProvider: 'openai',
      keyManager: apiKeyManager
    });
    
    return new AIService();
  } catch (error) {
    logger.error('Failed to set up AI service', error);
    throw error;
  }
}

/**
 * Create a character using the CharacterCreator
 */
async function createCharacter(): Promise<Character> {
  return new Promise((resolve, reject) => {
    try {
      const creator = new CharacterCreator();
      let character: Character;
      
      // Set up event handlers
      creator.on('namePrompt', () => {
        creator.updateCharacterName(mockUserInput.characterCreation.name);
      });
      
      creator.on('racePrompt', () => {
        creator.updateCharacterRace(mockUserInput.characterCreation.race);
      });
      
      creator.on('classPrompt', () => {
        creator.updateCharacterClass(mockUserInput.characterCreation.class);
      });
      
      creator.on('abilitiesPrompt', () => {
        creator.updateAbilityScores(mockUserInput.characterCreation.abilityScores);
      });
      
      creator.on('backgroundPrompt', () => {
        creator.updateCharacterBackground(mockUserInput.characterCreation.background);
      });
      
      creator.on('detailsPrompt', () => {
        creator.updateCharacterDetails({
          alignment: mockUserInput.characterCreation.alignment,
          appearance: 'Sturdy build with a thick beard',
          backstory: 'Former soldier who seeks adventure'
        });
      });
      
      creator.on('equipmentPrompt', () => {
        creator.acceptDefaultEquipment();
      });
      
      creator.on('reviewPrompt', () => {
        creator.finalizeCharacter();
      });
      
      creator.on('complete', (result) => {
        character = result;
        resolve(character);
      });
      
      creator.on('error', (error) => {
        reject(new Error(`Character creation failed: ${error.message}`));
      });
      
      // Start character creation
      creator.startCreation();
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Initialize the game state with the created character
 */
async function initializeGameState(character: Character, aiService: AIService): Promise<GameState> {
  try {
    // Create world generator
    const worldGenerator = new WorldGenerator();
    
    // Create starting location
    const startingLocation = worldGenerator.generateStartingLocation();
    
    // Create inventory manager
    const inventoryManager = new InventoryManager();
    
    // Initialize combat system
    const combatSystem = initializeCombatSystem(inventoryManager, aiService);
    
    // Create game state manager
    const gameStateManager = createGameStateManager();
    
    // Initialize new game state
    const gameState = gameStateManager.createNewGameState({
      player: character,
      world: {
        currentLocationId: startingLocation.id,
        locations: {
          [startingLocation.id]: startingLocation
        },
        npcs: {}
      }
    });
    
    return gameState;
  } catch (error) {
    logger.error('Failed to initialize game state', error);
    throw error;
  }
}

/**
 * Process a sequence of game commands
 */
async function processCommands(
  gameState: GameState, 
  aiService: AIService, 
  commands: string[]
): Promise<{
  success: boolean;
  commandResults: { command: string; result: string; success: boolean }[];
}> {
  try {
    const commandProcessor = new CommandProcessor(gameState, aiService);
    const results = [];
    
    for (const command of commands) {
      logger.log(`Processing command: ${command}`);
      
      try {
        const result = await commandProcessor.processCommand(command);
        results.push({
          command,
          result: result.message,
          success: true
        });
        logger.log(`Command result: ${result.message}`);
      } catch (error) {
        results.push({
          command,
          result: error.message,
          success: false
        });
        logger.error(`Command failed: ${command}`, error);
      }
    }
    
    return {
      success: results.some(r => r.success),
      commandResults: results
    };
  } catch (error) {
    logger.error('Failed to process commands', error);
    throw error;
  }
}

/**
 * Test the combat system
 */
async function testCombatSystem(gameState: GameState, aiService: AIService): Promise<{
  success: boolean;
  details: {
    combatStarted: boolean;
    roundsCompleted: number;
    combatEnded: boolean;
    playerSurvived: boolean;
  };
}> {
  try {
    // Create necessary managers for combat
    const inventoryManager = new InventoryManager();
    const combatSystem = initializeCombatSystem(inventoryManager, aiService);
    
    // Create test enemies
    const enemies = combatSystem.enemyManager.createEnemyGroup('goblin', 2, 1, gameState.world.currentLocationId);
    
    // Start combat
    const combatState = combatSystem.combatManager.startCombat(
      [gameState.player],
      enemies,
      gameState.world.locations[gameState.world.currentLocationId].name,
      false,
      'easy'
    );
    
    logger.log(`Combat started with ${enemies.length} enemies`);
    
    // Process 3 rounds of combat
    let roundsCompleted = 0;
    let playerSurvived = true;
    
    while (roundsCompleted < 3 && !combatSystem.combatManager.isCombatOver()) {
      logger.log(`Starting round ${combatState.round}`);
      
      // Process each participant's turn
      for (let i = 0; i < combatState.initiativeOrder.length; i++) {
        const entry = combatState.initiativeOrder[i];
        
        // Set current turn
        combatSystem.combatManager.setCurrentTurn(i);
        
        // Skip defeated participants
        if (entry.conditions.includes('defeated')) {
          continue;
        }
        
        if (entry.isPlayer) {
          // Player turn - perform attack on first available enemy
          const validTarget = combatState.initiativeOrder.find(
            e => !e.isPlayer && !e.conditions.includes('defeated')
          );
          
          if (validTarget) {
            const attackResult = combatSystem.combatManager.performAttack(
              gameState.player.id,
              validTarget.participant.id
            );
            
            logger.log(`Player attacks ${validTarget.participant.name}, hit: ${attackResult?.isHit}, damage: ${attackResult?.damage}`);
          }
        } else {
          // NPC turn
          await combatSystem.combatManager.processNPCTurn(
            entry.participant.id,
            gameState.world.locations[gameState.world.currentLocationId]
          );
          
          logger.log(`NPC ${entry.participant.name} takes a turn`);
          
          // Check if player is defeated
          const playerEntry = combatState.initiativeOrder.find(e => e.isPlayer);
          if (playerEntry?.conditions.includes('defeated')) {
            playerSurvived = false;
            logger.log('Player has been defeated!');
            break;
          }
        }
        
        // Check if combat is over
        if (combatSystem.combatManager.isCombatOver()) {
          break;
        }
      }
      
      // End the round if combat is still ongoing
      if (!combatSystem.combatManager.isCombatOver()) {
        combatSystem.combatManager.endRound();
        roundsCompleted++;
      } else {
        break;
      }
    }
    
    // End combat
    const allEnemiesDefeated = enemies.every(enemy => enemy.stats.hitPoints.current <= 0);
    combatSystem.combatManager.endCombat(allEnemiesDefeated);
    
    logger.log('Combat test completed');
    
    return {
      success: true,
      details: {
        combatStarted: true,
        roundsCompleted,
        combatEnded: true,
        playerSurvived
      }
    };
  } catch (error) {
    logger.error('Failed to test combat system', error);
    return {
      success: false,
      details: {
        combatStarted: false,
        roundsCompleted: 0,
        combatEnded: false,
        playerSurvived: false
      }
    };
  }
}

/**
 * Test the persistence system
 */
async function testPersistence(gameState: GameState): Promise<{
  success: boolean;
  details: {
    saved: boolean;
    loaded: boolean;
    dataIntegrity: boolean;
  };
}> {
  try {
    const gameStateManager = createGameStateManager();
    
    // Save the game state
    const saved = await gameStateManager.saveGameState(gameState, TEST_CONFIG.saveGamePath);
    logger.log(`Game state saved: ${saved}`);
    
    // Load the game state
    const loadedState = await gameStateManager.loadGameState(TEST_CONFIG.saveGamePath);
    logger.log('Game state loaded');
    
    // Check data integrity
    const playerId = gameState.player.id;
    const loadedPlayerId = loadedState.player.id;
    const dataIntegrity = playerId === loadedPlayerId;
    
    logger.log(`Data integrity check: ${dataIntegrity ? 'PASSED' : 'FAILED'}`);
    
    return {
      success: saved && !!loadedState && dataIntegrity,
      details: {
        saved,
        loaded: !!loadedState,
        dataIntegrity
      }
    };
  } catch (error) {
    logger.error('Failed to test persistence system', error);
    return {
      success: false,
      details: {
        saved: false,
        loaded: false,
        dataIntegrity: false
      }
    };
  }
}

/**
 * Validate all test results
 */
function validateTestResults(
  character: Character,
  gameState: GameState,
  commandResults: any,
  combatResult: any,
  persistenceResult: any
): {
  success: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check character creation
  if (!character || !character.id) {
    errors.push('Character creation failed');
  } else if (!character.name || character.name !== mockUserInput.characterCreation.name) {
    warnings.push('Character name does not match expected value');
  }
  
  // Check game state
  if (!gameState || !gameState.player) {
    errors.push('Game state initialization failed');
  }
  
  // Check command processing
  if (!commandResults.success) {
    errors.push('All commands failed to process');
  } else if (commandResults.commandResults.filter(r => !r.success).length > 0) {
    warnings.push(`${commandResults.commandResults.filter(r => !r.success).length} commands failed to process`);
  }
  
  // Check combat system
  if (!combatResult.success) {
    errors.push('Combat system test failed');
  } else if (!combatResult.details.combatEnded) {
    warnings.push('Combat did not properly end');
  }
  
  // Check persistence system
  if (!persistenceResult.success) {
    errors.push('Persistence system test failed');
  } else if (!persistenceResult.details.dataIntegrity) {
    errors.push('Data integrity check failed after save/load');
  }
  
  return {
    success: errors.length === 0,
    errors,
    warnings
  };
}

// Export the test function
export { runGameFlowTest };

// Run the test if executed directly
if (require.main === module) {
  runGameFlowTest()
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Test failed with error:', error);
      process.exit(1);
    });
} 