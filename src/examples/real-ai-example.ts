/**
 * Real AI Service Example
 * 
 * This example demonstrates how to use the real AI service with OpenAI or Anthropic.
 * It shows how to initialize the service, generate descriptions, and interpret commands.
 */

import { RealAIService } from '../ai/real-ai-service';
import { CommandInterpreter } from '../ai/command-interpreter';
import { SimpleCharacter, SimpleNPC } from '../simple-main';
import { envLoader } from '../utils/env-loader';
import { NarrativeContext, CommandContext } from '../ai/enhanced-ai-service';
import * as readline from 'readline';

/**
 * Create a readline interface for user input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt the user for input
 * 
 * @param prompt The prompt to display
 * @returns The user's input
 */
function promptUser(prompt: string): Promise<string> {
  const rl = createReadlineInterface();
  
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Create a mock character for testing
 */
function createMockCharacter(): SimpleCharacter {
  return {
    id: 'player-1',
    name: 'Thorn',
    race: 'elf',
    class: 'ranger',
    level: 3,
    experiencePoints: 900,
    hitPoints: {
      current: 24,
      maximum: 24
    },
    armorClass: 15,
    initiative: 3,
    speed: 30,
    proficiencyBonus: 2,
    abilityScores: {
      strength: { score: 12, modifier: 1 },
      dexterity: { score: 16, modifier: 3 },
      constitution: { score: 14, modifier: 2 },
      intelligence: { score: 10, modifier: 0 },
      wisdom: { score: 14, modifier: 2 },
      charisma: { score: 8, modifier: -1 }
    },
    attacks: [
      { name: 'Longbow', damage: '1d8+3', range: 150 },
      { name: 'Shortsword', damage: '1d6+3', range: 5 }
    ],
    inventory: {
      gold: 75,
      items: [
        { id: 'item-1', name: 'Healing Potion', description: 'Restores 2d4+2 hit points when consumed', weight: 0.5, value: 50, quantity: 2, category: 'potion' },
        { id: 'item-2', name: 'Arrows', description: 'Standard arrows for a bow', weight: 0.05, value: 1, quantity: 20, category: 'ammunition' },
        { id: 'item-3', name: 'Rations', description: 'Dried food for travel', weight: 2, value: 5, quantity: 5, category: 'food' }
      ]
    },
    conditions: []
  };
}

/**
 * Create mock NPCs for testing
 */
function createMockNPCs(): SimpleNPC[] {
  return [
    { id: 'npc-1', name: 'Eliza', race: 'human', profession: 'innkeeper', trait: 'friendly', location: 'village' },
    { id: 'npc-2', name: 'Durgan', race: 'dwarf', profession: 'blacksmith', trait: 'gruff', location: 'village' },
    { id: 'npc-3', name: 'Marcus', race: 'human', profession: 'guard', trait: 'suspicious', location: 'village' }
  ];
}

/**
 * Run the real AI service example
 */
async function runRealAIExample(): Promise<void> {
  console.log("=== Real AI Service Example ===\n");
  
  // Initialize environment
  const config = envLoader.initialize();
  console.log(`Using AI provider: ${config.aiProvider}`);
  
  // Create a mock character and NPCs
  const character = createMockCharacter();
  const npcs = createMockNPCs();
  
  try {
    // Initialize the real AI service
    console.log("Initializing Real AI Service...");
    const realAI = new RealAIService();
    
    // Initialize the command interpreter with the real AI service
    const commandInterpreter = new CommandInterpreter(realAI);
    
    // Generate a location description
    console.log("\n=== Location Description ===");
    const locationContext: NarrativeContext = {
      location: 'village',
      characters: [character],
      npcs: npcs.filter(npc => npc.location === 'village'),
      recentEvents: ['A merchant caravan arrived yesterday', 'There are rumors of goblin activity in the nearby hills'],
      weather: 'partly cloudy',
      timeOfDay: 'afternoon'
    };
    
    const locationDescription = await realAI.generateLocationDescription('village', locationContext);
    console.log(locationDescription);
    
    // Generate NPC dialogue
    console.log("\n=== NPC Dialogue ===");
    const npc = npcs[0]; // Eliza the innkeeper
    const npcDialogue = await realAI.generateNPCDialogue(npc, character, locationContext);
    console.log(`${npc.name}: "${npcDialogue}"`);
    
    // Interactive command interpretation
    console.log("\n=== Command Interpretation ===");
    console.log("Enter commands to see how they are interpreted by the AI.");
    console.log("Type 'exit' to quit the example.");
    
    let running = true;
    while (running) {
      const input = await promptUser("> ");
      
      if (input.toLowerCase() === 'exit') {
        running = false;
        continue;
      }
      
      // Create command context
      const commandContext: CommandContext = {
        originalCommand: input,
        currentLocation: 'village',
        character: character,
        npcsPresent: npcs.filter(npc => npc.location === 'village'),
        gameState: {
          character,
          currentLocation: 'village',
          visited: new Set(['village']),
          enemies: [],
          npcs,
          aiService: null as any, // Not needed for this example
          enhancedAI: null as any, // Not needed for this example
          commandInterpreter,
          inCombat: false,
          realAI
        }
      };
      
      // Interpret the command
      console.log("Interpreting command...");
      const interpretedCommand = await commandInterpreter.interpret(input, commandContext);
      
      // Display the interpretation
      console.log("\nCommand Interpretation:");
      console.log(`Type: ${interpretedCommand.type}`);
      console.log(`Action: ${interpretedCommand.action}`);
      if (interpretedCommand.target) {
        console.log(`Target: ${interpretedCommand.target}`);
      }
      if (interpretedCommand.parameters && Object.keys(interpretedCommand.parameters).length > 0) {
        console.log("Parameters:", interpretedCommand.parameters);
      }
      console.log(`Confidence: ${interpretedCommand.confidence}`);
      
      // Generate a narrative response
      console.log("\nNarrative Response:");
      const narrativeResponse = await realAI.generateActionNarrative(input, locationContext);
      console.log(narrativeResponse);
    }
    
    console.log("\nExample completed. Thank you for trying the Real AI Service!");
    
  } catch (error) {
    console.error("Error running Real AI example:", error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runRealAIExample().catch(console.error);
}

export { runRealAIExample }; 