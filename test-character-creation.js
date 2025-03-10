#!/usr/bin/env node

/**
 * Character Creation Test
 * 
 * This script runs the character creation test to verify 
 * the fixes made to the character creation system.
 */

// Make sure typescript is compiled first
require('child_process').execSync('tsc', { stdio: 'inherit' });

// Run the character creation test
require('./dist/examples/character-creation-test').testCharacterCreation().catch(err => {
  console.error('Error running character creation test:', err);
  process.exit(1);
}); 