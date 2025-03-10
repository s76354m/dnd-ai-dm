/**
 * D&D AI Dungeon Master - Combat System Examples Runner
 * 
 * This script runs all the combat system examples in sequence to demonstrate
 * the functionality of the various combat subsystems including:
 * - Combat Effects
 * - Reaction System
 * - Targeting System
 * 
 * Run with: npm run run:all-examples
 */

import readline from 'readline';

// Import example modules - use * as syntax to handle modules without default exports
import * as combatEffectsExample from './combat-effects-example';
import * as reactionExample from './reaction-example';
import * as targetingExample from './targeting-example';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to run a module that might not have a run function
const runModule = (module: any, name: string): void => {
  console.log(`Running ${name}...`);
  if (typeof module.run === 'function') {
    module.run();
  } else if (typeof module.default?.run === 'function') {
    module.default.run();
  } else {
    console.log(`Note: ${name} doesn't have a run function. Running module directly.`);
    // Just importing the file should run the example
  }
};

// Function to prompt for continuing to next example
const promptToContinue = (message: string, callback: () => void): void => {
  rl.question(`\n${message} (Press Enter to continue)`, () => {
    console.log('\n' + '='.repeat(80) + '\n');
    callback();
  });
};

// Run the examples in sequence
console.log('=== D&D AI Dungeon Master - Combat System Examples ===\n');
console.log('This script will run through all the combat system examples to demonstrate the functionality.');
console.log('Each example showcases different aspects of the combat system implementation.\n');

promptToContinue('First, we will run the Combat Effects example...', () => {
  console.log('COMBAT EFFECTS EXAMPLE');
  console.log('This example demonstrates how status effects integrate with the combat system.\n');
  
  // Run the combat effects example
  runModule(combatEffectsExample, 'Combat Effects Example');
  
  promptToContinue('Next, we will run the Reaction System example...', () => {
    console.log('REACTION SYSTEM EXAMPLE');
    console.log('This example demonstrates how reactions like Counterspell and Shield function during combat.\n');
    
    // Run the reaction example
    runModule(reactionExample, 'Reaction System Example');
    
    promptToContinue('Finally, we will run the Targeting System example...', () => {
      console.log('TARGETING SYSTEM EXAMPLE');
      console.log('This example demonstrates line of sight and cover mechanics during combat.\n');
      
      // Run the targeting example
      runModule(targetingExample, 'Targeting System Example');
      
      console.log('\n' + '='.repeat(80));
      console.log('\nAll examples have been completed successfully!');
      console.log('These examples showcase the core components of the D&D AI combat system:');
      console.log('1. Status Effect Integration - Managing conditions and their effects on combat');
      console.log('2. Reaction System - Handling actions that occur outside of turn order');
      console.log('3. Targeting System - Managing line of sight, cover, and valid targets');
      console.log('\nNext steps include:');
      console.log('- Additional specialized reactions');
      console.log('- Advanced targeting for area effect spells');
      console.log('- Terrain and weather effects');
      console.log('- Stealth and perception integration');
      
      // Close the readline interface
      rl.close();
    });
  });
});

// Export the run function
export default {
  run: () => {
    console.log('Running all examples...');
  }
}; 