/**
 * Natural Language Processing Test
 * 
 * This script tests the natural language command processing capabilities
 * of the D&D AI DM system with different types of commands.
 * It's used for development and testing purposes.
 */

import { CommandInterpreter } from '../../ai/command-interpreter';
import { EnhancedAIService, CommandContext } from '../../ai/enhanced-ai-service';
import { SimpleAIService } from '../../ai/simple-ai-service';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Mock game state and character for testing
const mockCharacter: any = {
  id: 'player1',
  name: 'Testy McTestface',
  race: 'human',
  class: 'fighter',
  level: 1,
  hitPoints: { current: 10, maximum: 10 }
};

const mockGameState: any = {
  character: mockCharacter,
  currentLocation: {
    id: 'loc1',
    name: 'Testing Area',
    description: 'A blank white room used for testing NLP capabilities.'
  },
  npcs: [
    {
      id: 'npc1',
      name: 'Test NPC',
      description: 'A generic NPC for testing interactions.'
    }
  ],
  items: [
    {
      id: 'item1',
      name: 'Test Sword',
      description: 'A generic sword for testing item interactions.'
    },
    {
      id: 'item2',
      name: 'Healing Potion',
      description: 'A generic potion for testing item use.'
    }
  ]
};

// Create instances of the AI services
const simpleAI = new SimpleAIService();
const enhancedAI = new EnhancedAIService();
const interpreter = new CommandInterpreter();

// Test commands to try
const testCommands = [
  'look around',
  'go north',
  'attack goblin',
  'talk to innkeeper',
  'pick up sword',
  'cast fireball at dragon',
  'use potion',
  'check inventory',
  'help'
];

/**
 * Prompt the user for input
 */
async function promptUser(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

/**
 * Run the NLP test
 */
async function testNLP() {
  console.log('======================================');
  console.log('|   D&D AI DM - NLP Testing Tool    |');
  console.log('======================================\n');
  
  console.log('This tool tests natural language processing for game commands.');
  console.log('Type a command or "exit" to quit.\n');
  
  console.log('Example commands to try:');
  testCommands.forEach(cmd => console.log(`- ${cmd}`));
  console.log('');
  
  let running = true;
  
  while (running) {
    const input = await promptUser('Enter a command: ');
    
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      running = false;
      continue;
    }
    
    // Process with the command interpreter
    console.log('\nInterpreting command...');
    const interpreted = await interpreter.interpretCommand(input, mockGameState);
    
    console.log('\nCommand Interpretation:');
    console.log(JSON.stringify(interpreted, null, 2));
    
    // Get response from enhanced AI
    console.log('\nEnhanced AI Response:');
    const context: CommandContext = {
      command: input,
      interpretedCommand: interpreted,
      gameState: mockGameState
    };
    
    try {
      const enhancedResponse = await enhancedAI.processCommand(context);
      console.log(enhancedResponse);
    } catch (error) {
      console.log('Error getting enhanced AI response. Using simple AI fallback.');
      const simpleResponse = await simpleAI.generateResponse(input);
      console.log(simpleResponse);
    }
    
    console.log('\n-----------------------------------\n');
  }
  
  console.log('NLP testing completed.');
  rl.close();
}

// Run the test if this file is executed directly
if (require.main === module) {
  testNLP().catch(error => {
    console.error('Error during NLP testing:', error);
    rl.close();
    process.exit(1);
  });
}

export { testNLP }; 