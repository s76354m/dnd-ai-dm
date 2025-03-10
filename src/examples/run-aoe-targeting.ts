/**
 * AOE Targeting Example Runner
 * 
 * This script imports and runs the Area of Effect targeting example.
 */

import { runAoeTargetingExample } from './aoe-targeting-example';

console.log('Starting AOE targeting example...');

// Run the example
runAoeTargetingExample()
  .then(() => {
    console.log('AOE targeting example completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running AOE targeting example:', error);
    process.exit(1);
  }); 