/**
 * Simple AoE Targeting Example Runner
 * 
 * This script imports and runs the simplified Area of Effect targeting example.
 */

import { run } from './simple-aoe-targeting';

console.log('Starting Simple AoE targeting example...');

// Run the example
run()
  .then(() => {
    console.log('Simple AoE targeting example completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running Simple AoE targeting example:', error);
    process.exit(1);
  }); 