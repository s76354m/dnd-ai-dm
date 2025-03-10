/**
 * D&D AI Dungeon Master - Main Application Entry Point
 * 
 * This is the consolidated main entry point for the D&D AI Dungeon Master application.
 * It initializes core systems and starts the game loop.
 */

import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// Core system imports
import { Character } from './core/interfaces/character';
import { GameState } from './core/interfaces/game';
import { Location } from './core/interfaces/location';
import { CombatState } from './core/interfaces/combat';
import { ExtendedCombatState } from './core/interfaces/combat-extensions';
import { DMEngine } from './core/interfaces/engine';
import { CommandProcessor } from './core/command-processor';
import { EventSystem } from './core/event-system';
import { gameStateManager } from './core/state';
import { GameEvent } from './core/interfaces/events';

// Combat system imports
import { CombatManager } from './combat/combat-manager';
import targetingSystem, { TargetingSystem, CoverType, ObstacleType, LightLevel } from './combat/targeting';

// AI system imports
import { SimpleAIService } from './ai/simple-ai-service';
import { RealAIService } from './ai/real-ai-service';
import { CommandInterpreter } from './ai/command-interpreter';
import { EnhancedAIService, CommandContext } from './ai/enhanced-ai-service';
import { AIDungeonMaster as AIDMEngine } from './dm/dm-engine';
import { envLoader } from './utils/env-loader';

// Character creation
import { CharacterCreator } from './character/creation/creator';

// Persistence system
import { saveManager } from './persistence/save-manager';

// Initialize the readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// AI Service interfaces
interface AIProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  organization?: string;
  temperature?: number;
  maxTokens?: number;
}

interface AIServiceAdapter {
  generateCompletion(prompt: string, options?: any): Promise<string>;
  updateContext(newContext: string): void;
  clearContext(): void;
}

// Create a simple event handler for when game state changes
function onGameStateChanged(
  aiAdapter: AIServiceAdapter, 
  gameState: GameState, 
  reason: string
): void {
  // Update the AI context with the new game state
  const context = prepareAIContext(gameState);
  aiAdapter.updateContext(context);
  console.log(`Game state updated: ${reason}`);
}

/**
 * Prepares the context for AI based on the current game state
 */
function prepareAIContext(gameState: GameState): string {
  // Transform game state into a prompt context
  // This will be expanded as needed
  return JSON.stringify(gameState);
}

/**
 * Apply changes to the game state
 */
function applyStateChanges(
  changes: Partial<GameState>,
  aiAdapter?: AIServiceAdapter
): void {
  // Get current state
  const currentState = gameStateManager.getState();
  
  // Apply changes
  const newState = { ...currentState, ...changes };
  
  // Update state
  gameStateManager.setState(newState);
  
  // Notify AI adapter if provided
  if (aiAdapter) {
    onGameStateChanged(aiAdapter, newState, 'State changes applied');
  }
}

/**
 * Prompt the user for input
 */
function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

/**
 * Main game loop
 */
async function startGameLoop(dmEngine: AIDMEngine): Promise<void> {
  console.log('\n=== GAME STARTED ===\n');
  
  // Get initial game state
  const gameState = gameStateManager.getState();
  
  let running = true;
  
  while (running) {
    // Display current location if available
    if (gameState.currentLocation) {
      console.log(`\nLocation: ${gameState.currentLocation.name}`);
      console.log(gameState.currentLocation.description);
      
      if (gameState.currentLocation.npcs && gameState.currentLocation.npcs.length > 0) {
        console.log('\nNPCs present:');
        gameState.currentLocation.npcs.forEach(npc => {
          console.log(`- ${npc.name} (${npc.race} ${npc.occupation})`);
        });
      }
    }
    
    // Handle combat separately if in combat
    if (gameState.inCombat && gameState.combatState) {
      await handleCombatTurn(dmEngine);
      continue;
    }
    
    // Normal game loop
    const command = await prompt('\nWhat would you like to do? ');
    
    if (command.toLowerCase() === 'exit' || command.toLowerCase() === 'quit') {
      // Ask for confirmation
      const confirm = await prompt('Are you sure you want to exit? (Y/N): ');
      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        console.log('\nSaving game state...');
        await saveGameState(gameState);
        running = false;
        continue;
      } else {
        console.log('\nContinuing game...');
        continue;
      }
    }
    
    try {
      // Process the command through the DM Engine
      const response = await dmEngine.processCommand(command);
      console.log('\n' + response);
      
      // Check if game state has been updated
      const newState = gameStateManager.getState();
      if (newState !== gameState) {
        // Update our local reference
        Object.assign(gameState, newState);
      }
    } catch (error) {
      console.error(`Error processing command: ${error.message}`);
    }
  }
  
  console.log('\n=== GAME ENDED ===\n');
  rl.close();
}

/**
 * Handle a turn in combat
 */
async function handleCombatTurn(dmEngine: DMEngine): Promise<void> {
  const gameState = gameStateManager.getState();
  const combatState = gameState.combatState;
  
  if (!combatState) {
    console.error('Combat state is undefined');
    return;
  }
  
  // Display combat status
  console.log('\n=== COMBAT ===');
  console.log(`Round: ${combatState.round}`);
  
  // Display whose turn it is
  const currentCombatant = combatState.combatants[combatState.currentTurn];
  console.log(`\nIt's ${currentCombatant.name}'s turn!`);
  
  // If it's the player's turn
  if (currentCombatant.id === gameState.player.id) {
    // Display player health
    console.log(`\nYour HP: ${gameState.player.hitPoints.current}/${gameState.player.hitPoints.maximum}`);
    
    // Display enemies and their status
    console.log('\nEnemies:');
    combatState.combatants
      .filter(c => c.isEnemy)
      .forEach(enemy => {
        console.log(`- ${enemy.name}: ${enemy.hitPoints.current}/${enemy.hitPoints.maximum} HP`);
      });
    
    // Get player combat action
    const action = await prompt('\nWhat would you like to do? (attack/spell/item/dodge/disengage/dash/help): ');
    
    // Process combat action
    try {
      const response = await dmEngine.processCombatAction(action);
      console.log('\n' + response);
    } catch (error) {
      console.error(`Error processing combat action: ${error.message}`);
    }
  } else {
    // NPC/Enemy turn - let the DM engine handle it
    try {
      const result = await dmEngine.processCombatTurn(currentCombatant.id);
      console.log('\n' + result);
      
      // Pause briefly to let the player read the result
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`Error during NPC combat turn: ${error.message}`);
    }
  }
}

/**
 * Save the current game state to a file
 */
async function saveGameState(gameState: GameState): Promise<void> {
  try {
    // Create saves directory if it doesn't exist
    const savesDir = path.join(process.cwd(), 'saves');
    try {
      await fs.mkdir(savesDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // Create a filename based on character name and timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `${gameState.player.name.replace(/\s+/g, '_')}_${timestamp}.json`;
    const savePath = path.join(savesDir, filename);
    
    // Create a copy of the game state for saving
    const stateCopy = JSON.parse(JSON.stringify(gameState));
    
    // Remove circular references and non-serializable objects
    // This is a simplified approach - might need more comprehensive handling
    delete stateCopy.aiAdapter;
    delete stateCopy.dmEngine;
    
    // Save to file
    await fs.writeFile(savePath, JSON.stringify(stateCopy, null, 2), 'utf8');
    console.log(`Game saved to: ${savePath}`);
    
    return;
  } catch (error) {
    console.error(`Error saving game: ${error.message}`);
    throw error;
  }
}

/**
 * Load a game state from a save file
 */
async function loadGameState(saveFile: string): Promise<GameState> {
  const savePath = path.join(process.cwd(), 'saves', saveFile);
  const data = await fs.readFile(savePath, 'utf8');
  return JSON.parse(data) as GameState;
}

/**
 * List available save files
 */
async function listSaveFiles(characterName?: string): Promise<string[]> {
  const savesDir = path.join(process.cwd(), 'saves');
  
  try {
    // Create directory if it doesn't exist
    await fs.mkdir(savesDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
  
  // Get all save files
  const files = await fs.readdir(savesDir);
  
  // Filter by character name if provided
  let saveFiles = files.filter(file => file.endsWith('.json'));
  
  if (characterName) {
    const normalizedName = characterName.replace(/\s+/g, '_');
    saveFiles = saveFiles.filter(file => file.startsWith(normalizedName));
  }
  
  return saveFiles;
}

/**
 * Initialize a new game
 */
async function initializeGame(): Promise<void> {
  console.log('=================================================');
  console.log('|         D&D AI DUNGEON MASTER                |');
  console.log('|  An AI-powered D&D 5e adventure experience   |');
  console.log('=================================================\n');
  
  console.log('Welcome to D&D AI Dungeon Master!\n');
  
  // Check for saved games
  const saveFiles = await listSaveFiles();
  
  let gameState: GameState;
  let character: Character;
  
  if (saveFiles.length > 0) {
    console.log('Saved games found:');
    saveFiles.forEach((file, index) => {
      // Extract character name and date from filename
      const parts = file.split('_');
      const characterName = parts[0].replace(/_/g, ' ');
      const datePart = parts[1].split('.')[0];
      console.log(`${index + 1}. ${characterName} - ${datePart.replace('T', ' ')}`);
    });
    
    const loadChoice = await prompt('\nDo you want to load a saved game? (Y/N): ');
    
    if (loadChoice.toLowerCase() === 'y' || loadChoice.toLowerCase() === 'yes') {
      const saveIndex = parseInt(await prompt('Enter the number of the save to load: '), 10) - 1;
      
      if (saveIndex >= 0 && saveIndex < saveFiles.length) {
        try {
          gameState = await loadGameState(saveFiles[saveIndex]);
          console.log(`\nLoaded game for ${gameState.player.name}!`);
          
          // Initialize game with loaded state
          gameStateManager.setState(gameState);
          
          // Create AI adapter based on configuration
          const aiOptions = await promptAIOptions();
          const aiAdapter = createAIAdapter(aiOptions);
          
          // Create DM engine
          const dmEngine = new AIDMEngine(gameState, aiAdapter);
          
          // Start game loop
          await startGameLoop(dmEngine);
          return;
        } catch (error) {
          console.error(`Error loading save: ${error.message}`);
          console.log('Starting new game instead...');
        }
      } else {
        console.log('Invalid save number, starting new game...');
      }
    }
  }
  
  // Create a new character
  console.log('\n=== CHARACTER CREATION ===\n');
  const creator = new CharacterCreator();
  character = await creator.createCharacter();
  
  console.log('\nCharacter created successfully!');
  console.log(`\nName: ${character.name}`);
  console.log(`Race: ${character.race.name}`);
  console.log(`Class: ${character.class.name}`);
  
  // Initialize game state with the new character
  gameState = createInitialGameState(character);
  gameStateManager.setState(gameState);
  
  // Initialize AI
  console.log('\n=== AI CONFIGURATION ===\n');
  const aiOptions = await promptAIOptions();
  const aiAdapter = createAIAdapter(aiOptions);
  
  // Create DM engine with the game state and AI adapter
  const dmEngine = new AIDMEngine(gameState, aiAdapter);
  
  // Start the game
  await startGameLoop(dmEngine);
}

/**
 * Prompt the user for AI configuration options
 */
async function promptAIOptions(): Promise<Partial<AIProviderConfig>> {
  const options: Partial<AIProviderConfig> = {};
  
  // Load from environment variables first
  envLoader.load();
  
  // Check for API key in env
  let apiKey = process.env.AI_API_KEY;
  
  if (!apiKey) {
    apiKey = await prompt('Enter your AI provider API key: ');
  }
  
  options.apiKey = apiKey;
  
  // Select model
  console.log('\nAvailable AI models:');
  console.log('1. gpt-4-turbo');
  console.log('2. gpt-4');
  console.log('3. gpt-3.5-turbo');
  console.log('4. claude-3-opus');
  console.log('5. claude-3-sonnet');
  console.log('6. claude-3-haiku');
  console.log('7. Use mock AI (for testing, no real AI calls)');
  
  const modelChoice = await prompt('Select AI model (1-7): ');
  
  switch (modelChoice) {
    case '1':
      options.model = 'gpt-4-turbo';
      break;
    case '2':
      options.model = 'gpt-4';
      break;
    case '3':
      options.model = 'gpt-3.5-turbo';
      break;
    case '4':
      options.model = 'claude-3-opus';
      break;
    case '5':
      options.model = 'claude-3-sonnet';
      break;
    case '6':
      options.model = 'claude-3-haiku';
      break;
    case '7':
      options.model = 'mock';
      break;
    default:
      options.model = 'gpt-3.5-turbo'; // Default
      break;
  }
  
  // Temperature setting
  const temperatureStr = await prompt('Enter AI temperature (0.0-1.0, default 0.7): ');
  if (temperatureStr.trim() !== '') {
    const temperature = parseFloat(temperatureStr);
    if (!isNaN(temperature) && temperature >= 0 && temperature <= 1) {
      options.temperature = temperature;
    }
  }
  
  return options;
}

/**
 * Create the initial game state
 */
function createInitialGameState(character: Character): GameState {
  // Create the starting location
  const startingLocation: Location = {
    id: uuidv4(),
    name: 'Village of Greenfield',
    description: 'A quaint village with thatched-roof cottages and a central well. The village is surrounded by farmland and a small forest can be seen to the east.',
    type: 'settlement',
    npcs: [
      {
        id: uuidv4(),
        name: 'Mayor Thaddeus',
        race: 'human',
        occupation: 'village mayor',
        description: 'A portly man with a well-groomed mustache and formal attire.',
        dialogue: {
          greeting: `Welcome to Greenfield, traveler! What brings you to our humble village?`,
          options: [
            { text: `Ask about the village`, response: `Greenfield has been here for generations. We're primarily farmers, but we have a small market and a tavern. The Laughing Dragon Inn has the best ale in the region!` },
            { text: `Ask about troubles`, response: `Well, now that you mention it, we've had some trouble with goblins raiding our outlying farms. The village council would pay handsomely for someone to deal with the problem.` },
            { text: `Ask about nearby locations`, response: `There's a mysterious cave in the forest to the east. Some say it leads to an ancient tomb. To the north are the trade roads that lead to larger towns and cities.` }
          ]
        }
      },
      {
        id: uuidv4(),
        name: 'Elara',
        race: 'elf',
        occupation: 'herbalist',
        description: 'A slender elf with silver hair who tends a garden of strange plants.',
        dialogue: {
          greeting: `Greetings. I haven't seen you around before. Need any potions or remedies?`,
          options: [
            { text: `Ask about potions`, response: `I make healing potions, antidotes, and various tonics. My specialty is a potion that lets you see in the dark temporarily.` },
            { text: `Ask about the forest`, response: `The forest east of here is ancient and holds many secrets. If you venture there, beware of the wolves... and worse things that lurk in the shadows.` },
            { text: `Ask about her background`, response: `I came here decades ago, seeking a quiet place to study herbology. The villagers were wary at first, but now they come to me for all manner of remedies.` }
          ]
        }
      }
    ]
  };
  
  // Define possible directions from this location
  const directions = [
    { direction: 'east', destination: 'Forest Path', description: 'A narrow path leading into the dark forest.' },
    { direction: 'north', destination: 'Trade Road', description: 'A well-traveled road heading toward larger settlements.' },
    { direction: 'west', destination: 'Farmlands', description: 'Rolling fields of wheat and vegetables.' }
  ];
  
  // Create the game state
  const gameState: GameState = {
    sessionId: uuidv4(),
    player: character,
    currentLocation: startingLocation,
    visitedLocations: [startingLocation.id],
    inventory: [],
    quests: [],
    time: {
      day: 1,
      hour: 12,
      minute: 0
    },
    weather: 'clear',
    inCombat: false,
    combatState: null,
    gameProgress: 0,
    possibleDirections: directions
  };
  
  return gameState;
}

/**
 * Create an appropriate AI adapter based on the provided options
 */
function createAIAdapter(options: Partial<AIProviderConfig>): AIServiceAdapter {
  // Implementation would depend on the chosen AI provider
  if (options.model === 'mock') {
    return new SimpleAIService() as unknown as AIServiceAdapter;
  }
  
  // For real AI implementations
  return new RealAIService(options) as unknown as AIServiceAdapter;
}

/**
 * Start a new game
 */
export async function start(character?: Character): Promise<void> {
  if (character) {
    // Use provided character to start game
    const gameState = createInitialGameState(character);
    gameStateManager.setState(gameState);
    
    // Initialize AI
    const aiOptions = await promptAIOptions();
    const aiAdapter = createAIAdapter(aiOptions);
    
    // Create DM engine
    const dmEngine = new AIDMEngine(gameState, aiAdapter);
    
    // Start game loop
    await startGameLoop(dmEngine);
  } else {
    // Initialize a new game from scratch
    await initializeGame();
  }
}

/**
 * Get user input from the console
 * @param prompt The prompt to display
 * @returns A promise that resolves to the user's input
 */
function getUserInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Main application entry point
 */
export async function main(): Promise<void> {
  console.log("Welcome to DnD-AI-DM!");
  console.log("Loading game...");
  
  try {
    // Initialize the save manager
    await saveManager.initialize(path.join(process.cwd(), 'saves'));
    
    // Create a new game state
    const gameState = gameStateManager.createNewGameState();
    
    // Create a command processor
    const commandProcessor = new CommandProcessor(gameState);
    
    // Main game loop
    let running = true;
    
    // Display initial game state
    console.log("\n" + gameState.currentLocation.description);
    
    while (running) {
      // Get user input
      const input = await getUserInput("> ");
      
      // Process the command
      const result = await commandProcessor.processCommand(input);
      
      // Display the result
      console.log("\n" + result.message);
      
      // Check if we should exit
      if (result.shouldExit) {
        running = false;
      }
      
      // Check if we should save
      if (result.shouldSave) {
        try {
          const saveResult = await saveManager.saveGame(gameState);
          console.log(saveResult.message);
        } catch (error) {
          console.error("Error saving game:", error);
        }
      }
      
      // Check if we have state changes (from loading a save)
      if (result.stateChanges) {
        // Update the game state
        Object.assign(gameState, result.stateChanges);
        console.log("Game loaded successfully!");
        console.log("\n" + gameState.currentLocation.description);
      }
      
      // Process any triggered events
      if (result.triggeredEvents && result.triggeredEvents.length > 0) {
        for (const event of result.triggeredEvents) {
          // Handle the event
          console.log(`Event triggered: ${event.type}`);
          // TODO: Implement event handling
        }
      }
    }
    
    console.log("Thanks for playing DnD-AI-DM!");
    rl.close();
  } catch (error) {
    console.error("Error:", error);
    rl.close();
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

// Export for importing in other files
export default { main, start }; 