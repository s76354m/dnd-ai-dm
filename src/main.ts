/**
 * D&D AI Dungeon Master - Main Entry Point
 * 
 * This file serves as the primary entry point for the D&D AI DM application.
 * It integrates all built components to provide a complete D&D experience.
 */

import { main, start } from './index';
import chalk from 'chalk';
import * as readline from 'readline';
import inquirer from 'inquirer';
import * as path from 'path';
import { CharacterCreator } from './character/creation/creator';
import { validateAIConfig, loadAIConfig } from './config/ai-config';
import { ensureEnvironmentLoaded } from './config/setup-env';

// Import core components
import { GameStateManager, gameStateManager } from './core/state';
import { CommandProcessor } from './core/command-processor';
import { EventSystem, EventHandler } from './core/event-system';
import { AIDMEngine } from './core/engine';
import { GameState } from './core/interfaces/game';
import { GameEvent } from './core/interfaces/events';
import { Location } from './core/interfaces/location';
import { Character, Inventory } from './core/interfaces/character';
import { AIService } from './dm/ai-service';

// Import persistence components
import { saveManager } from './persistence/save-manager';

// Create a basic readline interface for legacy code that requires it
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false // Disable terminal features to prevent echoing
});

/**
 * Helper function to delay execution
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Prompts the user with a question and returns their response using inquirer
 * which has better handling of terminal input
 */
async function promptUser(question: string): Promise<string> {
  console.log("Asking user:", question);
  const { answer } = await inquirer.prompt([
    {
      type: 'input',
      name: 'answer',
      message: question
    }
  ]);
  
  return answer.trim();
}

// Update the ActiveDialogue interface to support free-form dialogue
interface ActiveDialogue {
  npcId: string;
  npcName: string;
  options?: string[]; // Make options optional
  mode: 'structured' | 'freeform'; // Add a mode to identify dialogue type
  history?: { speaker: 'player' | 'npc', text: string }[]; // Add dialogue history
}

/**
 * Initialize game systems with a character
 * @param character The player character
 * @returns Initialized game systems
 */
async function initializeGameSystems(character: Character) {
  // Initialize the DM Engine
  const dmEngine = new AIDMEngine();
  
  // Set the player character
  dmEngine.setPlayerCharacter(character);
  
  // Initialize the game state
  gameStateManager.setState(dmEngine.getGameState());
  
  // Initialize the Command Processor
  const commandProcessor = new CommandProcessor(gameStateManager.getState());
  
  // Initialize the Event System
  const eventSystem = new EventSystem(dmEngine);
  
  // Initialize the AI Service
  const aiService = new AIService();
  
  // Initialize the Save Manager
  await saveManager.initialize(path.join(process.cwd(), 'saves'));
  
  // Register basic event handlers
  registerEventHandlers(eventSystem);
  
  return {
    dmEngine,
    commandProcessor,
    eventSystem,
    aiService
  };
}

/**
 * Register event handlers for the event system
 * @param eventSystem The event system to register handlers with
 */
function registerEventHandlers(eventSystem: EventSystem) {
  // Example event handler for player movement
  const playerMovementHandler: EventHandler = {
    handleEvent: async (event: GameEvent, engine: AIDMEngine) => {
      if (event.type === 'PLAYER_MOVED') {
        console.log(`Player moved to ${event.data.location.name}`);
      }
    }
  };
  
  // Register the handler for the PLAYER_MOVED event
  eventSystem.registerHandler('PLAYER_MOVED', playerMovementHandler);
}

/**
 * Process a player command using a simplified command processor
 * @param command The command string entered by the player
 * @param gameState The current game state
 * @param dmEngine The DM engine instance
 * @param aiService The AI service for dialogue generation
 */
async function processPlayerCommand(command: string, gameState: GameState, dmEngine: AIDMEngine, aiService: AIService): Promise<{
  message: string;
  stateChanges?: Partial<GameState>;
  triggeredEvents?: GameEvent[];
}> {
  // Convert to lowercase and trim
  const input = command.trim().toLowerCase();
  
  // Handle empty input
  if (!input) {
    return { message: "Please enter a command. Type 'help' for available commands." };
  }
  
  // Check if we're in an active dialogue
  if (gameState.activeDialogue && gameState.currentLocation?.npcs) {
    console.log("Processing dialogue response:", input);
    
    let npc: any = null;
    
    // Find the NPC we're talking to
    if (gameState.currentLocation.npcs instanceof Map) {
      npc = gameState.currentLocation.npcs.get(gameState.activeDialogue.npcId);
    } else if (Array.isArray(gameState.currentLocation.npcs)) {
      npc = gameState.currentLocation.npcs.find(n => n.id === gameState.activeDialogue.npcId);
    }
    
    if (!npc) {
      console.log("Could not find NPC:", gameState.activeDialogue.npcId);
      return {
        message: "The conversation has ended.",
        stateChanges: { activeDialogue: undefined }
      };
    }
    
    // Handle structured dialogue with predefined options
    if (gameState.activeDialogue.mode === 'structured' && gameState.activeDialogue.options) {
      console.log("Available options:", gameState.activeDialogue.options);
      
      // Try to find a matching dialogue option, with varying levels of tolerance
      let matchedOption = null;
      
      // First try: exact match
      matchedOption = gameState.activeDialogue.options.find(option => 
        input.toLowerCase() === option.toLowerCase()
      );
      
      // Second try: input contains the option (if still no match)
      if (!matchedOption) {
        matchedOption = gameState.activeDialogue.options.find(option => 
          input.toLowerCase().includes(option.toLowerCase())
        );
      }
      
      // Third try: option contains the input (if still no match)
      if (!matchedOption) {
        matchedOption = gameState.activeDialogue.options.find(option => 
          option.toLowerCase().includes(input.toLowerCase())
        );
      }
      
      if (matchedOption) {
        console.log("Matched dialogue option:", matchedOption);
        
        if (npc && npc.dialogue && npc.dialogue.length > 0) {
          const dialogue = npc.dialogue[0];
          
          // Get the response for this option
          const response = dialogue.options?.[matchedOption];
          
          console.log(`Dialogue response for "${matchedOption}":`, response);
          
          // Clear the active dialogue
          const newState = {
            activeDialogue: undefined
          };
          
          if (response) {
            return {
              message: `${npc.name}: "${response}"`,
              stateChanges: newState,
              triggeredEvents: [{
                type: 'PLAYER_DIALOGUE_RESPONSE',
                timestamp: Date.now(),
                description: `Player responded to ${npc.name} with "${matchedOption}"`,
                data: { npc, playerResponse: matchedOption, npcResponse: response }
              }]
            };
          } else {
            console.log("No response found for this option");
          }
        } else {
          console.log("NPC doesn't have dialogue data:", npc?.id);
        }
      } else {
        console.log("No matching dialogue option found");
        return {
          message: `You can respond with one of the dialogue options shown.`,
          stateChanges: {} // Keep the active dialogue
        };
      }
    } 
    // Handle free-form dialogue with AI-generated responses
    else if (gameState.activeDialogue.mode === 'freeform') {
      try {
        console.log("Processing free-form dialogue...");
        
        // Check if the player wants to end the conversation
        if (input === 'goodbye' || input === 'bye' || input === 'leave' || input === 'exit conversation') {
          return {
            message: `${gameState.activeDialogue.npcName} nods as you take your leave.`,
            stateChanges: { activeDialogue: undefined },
            triggeredEvents: [{
              type: 'PLAYER_ENDED_DIALOGUE',
              timestamp: Date.now(),
              description: `Player ended conversation with ${gameState.activeDialogue.npcName}`,
              data: { npcId: gameState.activeDialogue.npcId }
            }]
          };
        }
        
        // Check for more natural exit phrases
        const exitPhrases = [
          'need to go', 'have to go', 'must be going', 
          'farewell', 'see you later', 'thanks, goodbye',
          'good day', 'take care', 'until next time',
          'we\'ll talk later'
        ];
        
        if (exitPhrases.some(phrase => input.includes(phrase))) {
          return {
            message: `${gameState.activeDialogue.npcName}: "Farewell for now, safe travels!"`,
            stateChanges: { activeDialogue: undefined },
            triggeredEvents: [{
              type: 'PLAYER_ENDED_DIALOGUE',
              timestamp: Date.now(),
              description: `Player ended conversation with ${gameState.activeDialogue.npcName}`,
              data: { npcId: gameState.activeDialogue.npcId }
            }]
          };
        }
        
        // Create context from dialogue history if available
        let context = "The player is having a conversation with an NPC.";
        
        // Add history to context if available
        if (gameState.activeDialogue.history && gameState.activeDialogue.history.length > 0) {
          context = "Previous conversation:\n";
          for (const entry of gameState.activeDialogue.history) {
            context += `${entry.speaker === 'npc' ? npc.name : 'Player'}: ${entry.text}\n`;
          }
        }
        
        // Add current location details
        if (gameState.currentLocation) {
          context += `\nCurrent location: ${gameState.currentLocation.name}`;
          if (gameState.currentLocation.description) {
            context += ` - ${gameState.currentLocation.description}`;
          }
        }
        
        // Add the player character details
        if (gameState.player) {
          context += `\nPlayer character: ${gameState.player.name}, a level ${gameState.player.level} ${gameState.player.race} ${gameState.player.class}`;
        }
        
        // Generate NPC response using AI
        const npcDialogue = await aiService.generateNPCDialogue(npc, 
          `You are ${npc.name}, ${npc.description || 'an NPC in a fantasy world'}.
           Race: ${npc.race || 'unknown'}
           Attitude: ${npc.attitude || 'neutral'}
           
           ${context}
           
           The player just said: "${input}"
           
           Respond naturally in character as ${npc.name}. Keep your response concise (2-3 sentences).`);
        
        // Update dialogue history
        const history = gameState.activeDialogue.history || [];
        history.push({ speaker: 'player', text: input });
        history.push({ speaker: 'npc', text: npcDialogue });
        
        // Limit history length to prevent context overflow
        const limitedHistory = history.slice(-6); // Keep last 6 exchanges (3 turns)
        
        // Update the active dialogue
        const newState = {
          activeDialogue: {
            ...gameState.activeDialogue,
            history: limitedHistory
          }
        };
        
        return {
          message: `${npc.name}: "${npcDialogue}"`,
          stateChanges: newState,
          triggeredEvents: [{
            type: 'NPC_DIALOGUE_RESPONSE',
            timestamp: Date.now(),
            description: `${npc.name} responded to the player`,
            data: { npc, playerInput: input, npcResponse: npcDialogue }
          }]
        };
      } catch (error) {
        console.error("Error generating dialogue:", error);
        return {
          message: `${npc.name} seems at a loss for words...`,
          stateChanges: {} // Keep the active dialogue
        };
      }
    }
  }
  
  // Parse command and arguments
  const parts = input.split(/\s+/);
  const cmd = parts[0];
  let args = parts.slice(1).join(' ');
  
  // Process commands
  switch (cmd) {
    case 'look':
    case 'l':
      return handleLook(args, gameState);
      
    case 'go':
    case 'move':
    case 'north':
    case 'south':
    case 'east':
    case 'west':
      // If command is a direction, use that as the argument
      const direction = (cmd === 'go' || cmd === 'move') ? args : cmd;
      return handleMove(direction, gameState);
      
    case 'talk':
    case 'speak':
    case 't':
      // Clean up talk targets by removing common prepositions
      if (args.startsWith('to the ')) {
        args = args.substring(7);
      } else if (args.startsWith('to ')) {
        args = args.substring(3);
      } else if (args.startsWith('with ')) {
        args = args.substring(5);
      } else if (args.startsWith('the ')) {
        args = args.substring(4);
      }
      return handleTalk(args, gameState, aiService);
      
    case 'inventory':
    case 'i':
      return handleInventory(gameState);
      
    case 'help':
    case '?':
      return handleHelp(gameState);
      
    case 'exit':
    case 'quit':
      return { message: "Thank you for playing!" };
      
    default:
      return { message: `I don't understand '${cmd}'. Type 'help' for available commands.` };
  }
}

/**
 * Handle the look command
 */
function handleLook(target: string, gameState: GameState) {
  // Debug logging
  console.log("handleLook - gameState:", JSON.stringify({
    hasState: !!gameState,
    hasLocation: !!gameState?.currentLocation,
    locationId: gameState?.currentLocation?.id,
    locationName: gameState?.currentLocation?.name,
    target: target
  }, null, 2));
  
  // Check if gameState or currentLocation is undefined
  if (!gameState || !gameState.currentLocation) {
    return { message: "You can't see anything clearly. (Error: Location not defined)" };
  }
  
  const location = gameState.currentLocation;
  
  // If no target specified or target is "around", describe the current location
  if (!target || target === "around") {
    // Describe the current location
    let description = location.name ? (location.name + "\n\n") : "";
    description += location.description || "You are in an unremarkable place.";
    
    // Add exits
    const exits = [];
    if (location.connections) {
      for (const [direction, _] of location.connections) {
        exits.push(direction);
      }
    }
    
    if (exits.length > 0) {
      description += "\n\nExits: " + exits.join(", ");
    }
    
    // Debug the npcs property
    console.log("location.npcs:", location.npcs);
    console.log("typeof location.npcs:", typeof location.npcs);
    console.log("Array.isArray(location.npcs):", Array.isArray(location.npcs));
    console.log("location.npcs instanceof Map:", location.npcs instanceof Map);
    
    // Add NPCs if they exist
    if (location.npcs) {
      // Check for array of NPCs
      if (Array.isArray(location.npcs) && location.npcs.length > 0) {
        description += "\n\nPeople here:";
        for (const npc of location.npcs) {
          description += `\n- ${npc.name}: ${npc.description}`;
        }
      } 
      // Check for Map of strings to NPC objects
      else if (location.npcs instanceof Map && location.npcs.size > 0) {
        description += "\n\nPeople here:";
        for (const [_, npc] of location.npcs) {
          // Check if the value is an NPC object (has name and description)
          if (npc && typeof npc === 'object' && 'name' in npc && 'description' in npc) {
            description += `\n- ${npc.name}: ${npc.description}`;
          }
        }
      }
    }
    
    return { message: description };
  }
  
  // Looking at a specific target
  target = target.toLowerCase();
  
  // Looking at an NPC
  if (location.npcs) {
    // Handle both Map and Array types
    if (location.npcs instanceof Map) {
      for (const [id, npc] of location.npcs) {
        if (id.toLowerCase() === target || (npc.name && npc.name.toLowerCase() === target)) {
          return { message: npc.description || `You see ${npc.name}.` };
        }
      }
    } else if (Array.isArray(location.npcs)) {
      for (const npc of location.npcs) {
        if (npc.name && npc.name.toLowerCase() === target) {
          return { message: npc.description || `You see ${npc.name}.` };
        }
      }
    }
  }
  
  // Looking at items
  if (location.items) {
    // Handle both Map and Array types
    if (location.items instanceof Map) {
      for (const [id, item] of location.items) {
        if (id.toLowerCase() === target || (item.name && item.name.toLowerCase() === target)) {
          return { message: item.description || `You see a ${item.name}.` };
        }
      }
    } else if (Array.isArray(location.items)) {
      for (const item of location.items) {
        if (item.name && item.name.toLowerCase() === target) {
          return { message: item.description || `You see a ${item.name}.` };
        }
      }
    }
  }
  
  // Looking at exits
  if (location.connections && location.connections instanceof Map) {
    for (const [direction, _] of location.connections) {
      if (direction.toLowerCase() === target) {
        return { message: `You look ${direction}. There seems to be a path leading that way.` };
      }
    }
  }
  
  return { message: `You don't see ${target} here.` };
}

/**
 * Handle the move command
 */
function handleMove(direction: string, gameState: GameState) {
  const location = gameState.currentLocation;
  
  // Check if the direction is valid
  if (!location.connections || !location.connections.has(direction)) {
    return { message: `You can't go ${direction} from here.` };
  }
  
  // Get the target location ID
  const targetLocationId = location.connections.get(direction);
  if (!targetLocationId) {
    return { message: `Error: Invalid connection.` };
  }
  
  // Get the target location
  const targetLocation = gameState.locations?.get(targetLocationId);
  if (!targetLocation) {
    return { message: `Error: Can't find location ${targetLocationId}.` };
  }
  
  // Create the event
  const event: GameEvent = {
    type: 'PLAYER_MOVED',
    timestamp: Date.now(),
    description: `Player moved ${direction} to ${targetLocation.name}`,
    data: { 
      location: targetLocation,
      direction 
    }
  };
  
  // Return result with state changes
  return {
    message: `You move ${direction} to ${targetLocation.name}.\n\n${targetLocation.description}`,
    stateChanges: { currentLocation: targetLocation },
    triggeredEvents: [event]
  };
}

/**
 * Handle the talk command
 */
function handleTalk(target: string, gameState: GameState, aiService: AIService) {
  // Debug logging
  console.log("handleTalk - gameState:", JSON.stringify({
    hasState: !!gameState,
    hasLocation: !!gameState?.currentLocation,
    locationId: gameState?.currentLocation?.id,
    locationName: gameState?.currentLocation?.name,
    hasNpcs: !!gameState?.currentLocation?.npcs,
    target: target,
    npcsType: gameState?.currentLocation?.npcs ? 
      (Array.isArray(gameState.currentLocation.npcs) ? 'Array' : 
       (gameState.currentLocation.npcs instanceof Map ? 'Map' : typeof gameState.currentLocation.npcs)) : 'undefined'
  }, null, 2));
  
  // Check if gameState or currentLocation is undefined
  if (!gameState || !gameState.currentLocation) {
    return { message: "There's no one to talk to. (Error: Location not defined)" };
  }
  
  if (!target) {
    return { message: "Who do you want to talk to?" };
  }

  target = target.toLowerCase();
  const location = gameState.currentLocation;
  
  // Check if there are NPCs in the location
  if (location.npcs) {
    // Handle Map type for npcs
    if (location.npcs instanceof Map) {
      for (const [id, npc] of location.npcs) {
        // Various matching approaches
        const nameMatches = [
          id.toLowerCase() === target,
          npc.name && npc.name.toLowerCase() === target,
          npc.name && npc.name.toLowerCase().includes(target),
          // Match parts of name (e.g., "Innkeeper" in "Eldon the Innkeeper")
          npc.name && npc.name.toLowerCase().split(' ').some(part => part === target)
        ];
        
        if (nameMatches.some(match => match)) {
          // Found the NPC to talk to
          console.log(`Found matching NPC: ${npc.name}`);
          
          let message = `${npc.name}: `;
          
          // Check if we want to use free-form dialogue
          // Add an option to use free-form dialogue for more natural conversation
          const useAI = true; // Set to true to use the AI for dialogue
          
          if (useAI) {
            // Start with a greeting from the NPC
            let greeting = "";
            
            // Check for dialogue property first
            if (npc.dialogue && npc.dialogue.length > 0) {
              // Use the first dialogue entry's greeting
              greeting = npc.dialogue[0].greeting || 'Hello there!';
            } 
            // Fallback to greeting property
            else if (npc.greeting) {
              greeting = npc.greeting;
            }
            // Default greeting if nothing else is available
            else {
              greeting = "Hello there! What can I do for you?";
            }
            
            // Set the active dialogue to free-form mode
            const stateChanges: Partial<GameState> = {
              activeDialogue: {
                npcId: id,
                npcName: npc.name,
                mode: 'freeform',
                history: [
                  { speaker: 'npc', text: greeting }
                ]
              }
            };
            
            return { 
              message: `${npc.name}: "${greeting}"`,
              stateChanges,
              triggeredEvents: [{
                type: 'PLAYER_TALKED_TO_NPC',
                timestamp: Date.now(),
                description: `Player talked to ${npc.name}`,
                data: { npc }
              }]
            };
          } 
          // Use structured dialogue with predefined options
          else {
            let dialogueOptions: string[] = [];
            
            // Check for dialogue property (array of dialogue objects with greeting and options)
            if (npc.dialogue && npc.dialogue.length > 0) {
              // Use the first dialogue entry
              const dialogue = npc.dialogue[0];
              message += `"${dialogue.greeting || 'Hello there!'}"`;
              
              // Add conversation options if available
              if (dialogue.options) {
                message += "\n\nYou can ask about:";
                for (const topic of Object.keys(dialogue.options)) {
                  message += `\n- ${topic}`;
                  dialogueOptions.push(topic);
                }
              }
            } 
            // Fallback to greeting property if dialogue isn't present
            else if (npc.greeting) {
              message += `"${npc.greeting}"`;
              
              // Add conversation options if available
              if (npc.conversationOptions && npc.conversationOptions.length > 0) {
                message += "\n\nYou can ask about:";
                for (const option of npc.conversationOptions) {
                  message += `\n- ${option.topic}`;
                  dialogueOptions.push(option.topic);
                }
              }
            }
            // Default greeting if nothing else is available
            else {
              message += `"Hello there! What can I do for you?"`;
            }
            
            // Set the active dialogue in state changes
            const stateChanges: Partial<GameState> = {
              activeDialogue: {
                npcId: id,
                npcName: npc.name,
                options: dialogueOptions,
                mode: 'structured'
              }
            };
            
            // Return the message and trigger an event for talking to the NPC
            return { 
              message,
              stateChanges,
              triggeredEvents: [{
                type: 'PLAYER_TALKED_TO_NPC',
                timestamp: Date.now(),
                description: `Player talked to ${npc.name}`,
                data: { npc }
              }]
            };
          }
        }
      }
    }
    // Handle Array type for npcs
    else if (Array.isArray(location.npcs)) {
      for (const npc of location.npcs) {
        // Various matching approaches
        const nameMatches = [
          npc.id && npc.id.toLowerCase() === target,
          npc.name && npc.name.toLowerCase() === target,
          npc.name && npc.name.toLowerCase().includes(target),
          // Match parts of name (e.g., "Innkeeper" in "Eldon the Innkeeper")
          npc.name && npc.name.toLowerCase().split(' ').some(part => part === target)
        ];
        
        if (nameMatches.some(match => match)) {
          // Found the NPC to talk to
          console.log(`Found matching NPC: ${npc.name}`);
          
          let message = `${npc.name}: `;
          
          // Check if we want to use free-form dialogue
          // Add an option to use free-form dialogue for more natural conversation
          const useAI = true; // Set to true to use the AI for dialogue
          
          if (useAI) {
            // Start with a greeting from the NPC
            let greeting = "";
            
            // Check for dialogue property first
            if (npc.dialogue && npc.dialogue.length > 0) {
              // Use the first dialogue entry's greeting
              greeting = npc.dialogue[0].greeting || 'Hello there!';
            } 
            // Fallback to greeting property
            else if (npc.greeting) {
              greeting = npc.greeting;
            }
            // Default greeting if nothing else is available
            else {
              greeting = "Hello there! What can I do for you?";
            }
            
            // Set the active dialogue to free-form mode
            const stateChanges: Partial<GameState> = {
              activeDialogue: {
                npcId: npc.id,
                npcName: npc.name,
                mode: 'freeform',
                history: [
                  { speaker: 'npc', text: greeting }
                ]
              }
            };
            
            return { 
              message: `${npc.name}: "${greeting}"`,
              stateChanges,
              triggeredEvents: [{
                type: 'PLAYER_TALKED_TO_NPC',
                timestamp: Date.now(),
                description: `Player talked to ${npc.name}`,
                data: { npc }
              }]
            };
          } 
          // Use structured dialogue with predefined options
          else {
            let dialogueOptions: string[] = [];
            
            // Check for dialogue property (array of dialogue objects with greeting and options)
            if (npc.dialogue && npc.dialogue.length > 0) {
              // Use the first dialogue entry
              const dialogue = npc.dialogue[0];
              message += `"${dialogue.greeting || 'Hello there!'}"`;
              
              // Add conversation options if available
              if (dialogue.options) {
                message += "\n\nYou can ask about:";
                for (const topic of Object.keys(dialogue.options)) {
                  message += `\n- ${topic}`;
                  dialogueOptions.push(topic);
                }
              }
            } 
            // Fallback to greeting property if dialogue isn't present
            else if (npc.greeting) {
              message += `"${npc.greeting}"`;
              
              // Add conversation options if available
              if (npc.conversationOptions && npc.conversationOptions.length > 0) {
                message += "\n\nYou can ask about:";
                for (const option of npc.conversationOptions) {
                  message += `\n- ${option.topic}`;
                  dialogueOptions.push(option.topic);
                }
              }
            }
            // Default greeting if nothing else is available
            else {
              message += `"Hello there! What can I do for you?"`;
            }
            
            // Set the active dialogue in state changes
            const stateChanges: Partial<GameState> = {
              activeDialogue: {
                npcId: npc.id,
                npcName: npc.name,
                options: dialogueOptions,
                mode: 'structured'
              }
            };
            
            // Return the message and trigger an event for talking to the NPC
            return { 
              message,
              stateChanges,
              triggeredEvents: [{
                type: 'PLAYER_TALKED_TO_NPC',
                timestamp: Date.now(),
                description: `Player talked to ${npc.name}`,
                data: { npc }
              }]
            };
          }
        }
      }
    }
  }
  
  return { message: `You don't see ${target} here.` };
}

/**
 * Handle the inventory command
 */
function handleInventory(gameState: GameState) {
  const inventory = gameState.inventory;
  
  if (!inventory || !inventory.items || inventory.items.length === 0) {
    return { message: "Your inventory is empty." };
  }
  
  let message = "Your inventory:\n";
  
  for (const item of inventory.items) {
    message += `- ${item.name}\n`;
  }
  
  message += `\nYou have ${inventory.gold} gold.`;
  
  return { message };
}

/**
 * Handle the help command
 */
function handleHelp(gameState?: GameState) {
  let help = `
Available commands:
  look (l) [target]       - Look around or examine a specific target
  go (north/south/etc.)   - Move in a direction
  talk (t) [person]       - Talk to someone
  inventory (i)           - Check your inventory
  help (?)                - Show this help message
  quit/exit               - Exit the game
  `.trim();
  
  // Add information about dialogue if in active dialogue
  if (gameState?.activeDialogue) {
    help += `\n\nYou are currently talking with ${gameState.activeDialogue.npcName}.`;
    
    if (gameState.activeDialogue.mode === 'structured' && gameState.activeDialogue.options) {
      help += `\nYou can respond with one of the dialogue options shown.`;
    } else if (gameState.activeDialogue.mode === 'freeform') {
      help += `\nYou can talk naturally with ${gameState.activeDialogue.npcName}. Type what you want to say.`;
      help += `\nType 'goodbye' or 'leave' to end the conversation.`;
    }
  }
  
  return { message: help };
}

/**
 * Run the main game loop
 * @param dmEngine The DM engine instance
 * @param commandProcessor The command processor
 * @param eventSystem The event system
 * @param aiService The AI service
 */
async function runGameLoop(dmEngine: AIDMEngine, commandProcessor: CommandProcessor, eventSystem: EventSystem, aiService: AIService) {
  console.log("\n========== Welcome to D&D AI Dungeon Master ==========\n");
  
  // Get the current game state
  const gameState = gameStateManager.getState();
  
  // Debug - check if currentLocation is properly set
  console.log("Game State:", JSON.stringify({
    sessionId: gameState.sessionId,
    hasPlayer: !!gameState.player,
    playerName: gameState.player?.name,
    hasLocation: !!gameState.currentLocation,
    locationId: gameState.currentLocation?.id,
    locationName: gameState.currentLocation?.name,
    locationDesc: gameState.currentLocation?.description ? 'present' : 'missing',
    locationConnections: gameState.currentLocation?.connections ? 
      (gameState.currentLocation.connections instanceof Map ? 
        'Map with ' + [...gameState.currentLocation.connections.keys()].join(',') : 
        typeof gameState.currentLocation.connections) : 'undefined',
    locationNpcs: gameState.currentLocation?.npcs ?
      (gameState.currentLocation.npcs instanceof Map ? 
        'Map with ' + gameState.currentLocation.npcs.size + ' NPCs' : 
        (Array.isArray(gameState.currentLocation.npcs) ? 
          'Array with ' + gameState.currentLocation.npcs.length + ' NPCs' : 
          typeof gameState.currentLocation.npcs)) : 'undefined',
    inCombat: !!gameState.combatState?.isActive
  }, null, 2));
  
  // Describe the current location
  const locationDescription = await dmEngine.describeLocation();
  console.log(locationDescription);
  
  // Display available commands based on game state
  displayAvailableCommands(gameState);
  
  // Start the game loop
  let running = true;
  
  while (running) {
    const { command } = await inquirer.prompt([
      {
        type: 'input',
        name: 'command',
        message: '> ',
        prefix: ''
      }
    ]);
    
    // Process the command
    if (command.toLowerCase() === 'quit' || command.toLowerCase() === 'exit') {
      // Ask if the player wants to save before quitting
      const { saveBeforeQuit } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'saveBeforeQuit',
          message: 'Would you like to save your game before quitting?',
          default: true
        }
      ]);
      
      if (saveBeforeQuit) {
        const { saveDescription } = await inquirer.prompt([
          {
            type: 'input',
            name: 'saveDescription',
            message: 'Enter a description for your save:',
            default: `${gameState.player.name} at ${gameState.currentLocation?.name || 'Unknown'}`
          }
        ]);
        
        try {
          const result = await commandProcessor.processCommand(`save ${saveDescription}`);
          console.log(result.message);
        } catch (error) {
          console.error("Error saving game:", error);
        }
      }
      
      running = false;
      console.log("Thank you for playing!");
      break;
    }
    
    try {
      // Process the command using the command processor
      const result = await commandProcessor.processCommand(command);
      
      // Display the message
      console.log(result.message);
      
      // Apply any state changes
      if (result.stateChanges) {
        gameStateManager.updateState(result.stateChanges);
      }
      
      // Process any triggered events
      if (result.triggeredEvents && result.triggeredEvents.length > 0) {
        await eventSystem.processEvents(result.triggeredEvents);
      }
      
      // Check if combat state has changed
      const updatedGameState = gameStateManager.getState();
      const combatStateChanged = 
        (gameState.combatState?.isActive !== updatedGameState.combatState?.isActive) ||
        (gameState.combatState?.round !== updatedGameState.combatState?.round) ||
        (gameState.combatState?.activeParticipantIndex !== updatedGameState.combatState?.activeParticipantIndex);
      
      // Update our local reference to the game state
      Object.assign(gameState, updatedGameState);
      
      // If combat state changed, display updated commands
      if (combatStateChanged) {
        displayAvailableCommands(gameState);
      }
      
      // Auto-save if requested
      if (result.shouldSave) {
        try {
          const saveId = await saveManager.saveGame(gameState, `Auto-save after ${command}`);
          console.log(`Game auto-saved (ID: ${saveId})`);
        } catch (error) {
          console.error("Error auto-saving game:", error);
        }
      }
    } catch (error) {
      console.error("Error processing command:", error);
      console.log("Please try again.");
    }
  }
}

/**
 * Display available commands based on the current game state
 * @param gameState The current game state
 */
function displayAvailableCommands(gameState: GameState) {
  console.log("\nAvailable commands:");
  
  // If in combat, show combat commands
  if (gameState.combatState?.isActive) {
    console.log("=== COMBAT MODE ===");
    console.log("- attack [target]: Attack a target");
    console.log("- cast [spell] at [target]: Cast a spell");
    console.log("- use [item] [on target]: Use an item");
    console.log("- dodge: Take the dodge action");
    console.log("- disengage: Take the disengage action");
    console.log("- help: Show combat help");
  } else {
    // Exploration commands
    console.log("- look: Examine your surroundings");
    console.log("- talk [npc]: Talk to an NPC");
    console.log("- go [direction]: Move in a direction");
    console.log("- inventory: Check your inventory");
    console.log("- attack [target]: Initiate combat with a target");
    console.log("- cast [spell]: Cast a spell");
    console.log("- use [item]: Use an item");
    console.log("- stats: View your character stats");
    console.log("- rest: Rest to recover");
  }
  
  // Always available commands
  console.log("\n=== SYSTEM COMMANDS ===");
  console.log("- save [description]: Save your game");
  console.log("- saves: List saved games");
  console.log("- load [number/id]: Load a saved game");
  console.log("- delete [number/id]: Delete a saved game");
  console.log("- help: Show all commands");
  console.log("- quit/exit: Exit the game");
  console.log("");
}

// If this file is run directly
if (require.main === module) {
  try {
    // Plain console log for better compatibility
    console.log("===============================================");
    console.log("          D&D AI Dungeon Master - MVP          ");
    console.log("===============================================");
    console.log("");
    
    console.log("Initializing game environment...");
    
    // Load environment variables
    ensureEnvironmentLoaded();
    
    // Validate AI configuration
    const aiConfig = loadAIConfig();
    const { isValid, errors } = validateAIConfig(aiConfig);
    
    console.log("Configuration loaded successfully!");
    console.log("");
    console.log("Starting D&D AI Dungeon Master...");
    console.log("");
    
    // Start the application
    (async () => {
      try {
        if (!isValid) {
          console.log("AI Configuration is not valid:");
          errors.forEach(error => console.log(`- ${error}`));
          console.log("");
          
          console.log("Preparing AI configuration prompt...");
          await delay(500); // Add a small delay to ensure console output is displayed
          
          const { setupAI } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'setupAI',
              message: 'Would you like to set up your AI configuration now?',
              default: true
            }
          ]);
          
          if (setupAI) {
            // Import and run the AI key setup utility
            const { setupAIKeys } = await import('./cli/ai-key-setup');
            await setupAIKeys();
          } else {
            console.log("Note: Running without proper AI configuration will use placeholder responses.");
            console.log("You can set up your AI keys later by running: npm run setup-ai-keys");
            console.log("");
          }
        }
        
        // Initialize the save manager
        await saveManager.initialize(path.join(process.cwd(), 'saves'));
        
        console.log(""); 
        console.log("Ready to start a new game!");
        console.log("(Loading prompt, please wait...)");
        await delay(500); // Add a small delay to ensure console output is displayed
        
        // Directly use the readline interface for the initial prompt as a workaround
        rl.question("Start a new game or load a saved game? (new/load): ", async (answer) => {
          const startNewGame = answer.toLowerCase().startsWith('n');
          
          if (startNewGame) {
            console.log("");
            console.log("Creating a new character...");
            console.log("");
            
            // Create a new character using a modified version that uses inquirer
            const characterCreator = new CharacterCreator();
            
            try {
              // Pass the readline instance for backward compatibility
              const character = await characterCreator.createCharacterInteractive(rl);
              
              // Start the game with the new character
              console.log(`Character created: ${character.name}, a level ${character.level} ${character.race} ${character.class}`);
              
              // Initialize game systems
              const { dmEngine, commandProcessor, eventSystem, aiService } = await initializeGameSystems(character);
              
              // Run the game loop
              await runGameLoop(dmEngine, commandProcessor, eventSystem, aiService);
              
              // Clean up and exit
              rl.close();
              process.exit(0);
            } catch (error) {
              console.error("Error during character creation:", error);
              rl.close();
              process.exit(1);
            }
          } else {
            // Look for saved games
            console.log("Checking for saved games...");
            
            try {
              const saves = await saveManager.getAvailableSaves();
              
              if (saves.length === 0) {
                console.log("No saved games found. Starting a new game instead.");
                
                // Create a new character
                console.log("");
                console.log("Creating a new character...");
                console.log("");
                
                const characterCreator = new CharacterCreator();
                const character = await characterCreator.createCharacterInteractive(rl);
                
                // Start the game with the new character
                console.log(`Character created: ${character.name}, a level ${character.level} ${character.race} ${character.class}`);
                
                // Initialize game systems
                const { dmEngine, commandProcessor, eventSystem, aiService } = await initializeGameSystems(character);
                
                // Run the game loop
                await runGameLoop(dmEngine, commandProcessor, eventSystem, aiService);
              } else {
                // Display available saves
                console.log("Available saved games:");
                saves.forEach((save, index) => {
                  console.log(`${index + 1}. ${save.characterName} (Level ${save.characterLevel}) - ${save.location} - ${new Date(save.timestamp).toLocaleString()}`);
                  if (save.description) {
                    console.log(`   Description: ${save.description}`);
                  }
                });
                
                // Prompt for which save to load
                const { saveIndex } = await inquirer.prompt([
                  {
                    type: 'input',
                    name: 'saveIndex',
                    message: 'Enter the number of the save to load (or 0 for a new game):',
                    validate: (input) => {
                      const num = parseInt(input);
                      return (num >= 0 && num <= saves.length) ? true : `Please enter a number between 0 and ${saves.length}`;
                    }
                  }
                ]);
                
                const saveIndexNum = parseInt(saveIndex);
                
                if (saveIndexNum === 0) {
                  // Create a new character
                  console.log("");
                  console.log("Creating a new character...");
                  console.log("");
                  
                  const characterCreator = new CharacterCreator();
                  const character = await characterCreator.createCharacterInteractive(rl);
                  
                  // Start the game with the new character
                  console.log(`Character created: ${character.name}, a level ${character.level} ${character.race} ${character.class}`);
                  
                  // Initialize game systems
                  const { dmEngine, commandProcessor, eventSystem, aiService } = await initializeGameSystems(character);
                  
                  // Run the game loop
                  await runGameLoop(dmEngine, commandProcessor, eventSystem, aiService);
                } else {
                  // Load the selected save
                  const saveToLoad = saves[saveIndexNum - 1];
                  console.log(`Loading save: ${saveToLoad.description}`);
                  
                  const loadResult = await saveManager.loadGame(saveToLoad.id);
                  
                  if (loadResult.success && loadResult.state) {
                    // Initialize game systems with the loaded state
                    const { dmEngine, commandProcessor, eventSystem, aiService } = await initializeGameSystems(loadResult.state.player);
                    
                    // Set the loaded game state
                    gameStateManager.setState(loadResult.state);
                    dmEngine.setGameState(loadResult.state);
                    
                    // Run the game loop
                    await runGameLoop(dmEngine, commandProcessor, eventSystem, aiService);
                  } else {
                    console.error(`Failed to load save: ${loadResult.message}`);
                    rl.close();
                    process.exit(1);
                  }
                }
              }
              
              // Clean up and exit
              rl.close();
              process.exit(0);
            } catch (error) {
              console.error("Error loading saved games:", error);
              rl.close();
              process.exit(1);
            }
          }
        });
      } catch (error) {
        console.error("Fatal error:", error);
        rl.close();
        process.exit(1);
      }
    })();
  } catch (error) {
    console.error("Initialization error:", error);
    process.exit(1);
  }
}

// Export the main functions for external use
export { main, start }; 