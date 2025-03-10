/**
 * Run Reaction Integration Examples
 * 
 * This script runs both the combat-effects example and the reaction example
 * to demonstrate the full integration between the status effect system,
 * combat mechanics, and reaction handling.
 */

import combatEffectsExample from './combat-effects-example';
import reactionExample from './reaction-example';

console.log('==================================================');
console.log('Running Combat Effects and Reaction Integration Examples');
console.log('==================================================');

console.log('\n\n===== PART 1: COMBAT EFFECTS EXAMPLE =====\n');
try {
  // Run the combat effects example
  if (typeof combatEffectsExample.run === 'function') {
    combatEffectsExample.run();
  } else {
    console.log('Combat effects example run automatically on import');
  }
} catch (error) {
  console.error('Error running combat effects example:', error);
}

console.log('\n\n===== PART 2: REACTION SYSTEM EXAMPLE =====\n');
try {
  // Run the reaction example
  if (typeof reactionExample.run === 'function') {
    reactionExample.run();
  } else {
    console.log('Reaction example run automatically on import');
  }
} catch (error) {
  console.error('Error running reaction example:', error);
}

console.log('\n==================================================');
console.log('Integration Examples Completed');
console.log('=================================================='); 