/**
 * Simple script to run the enhanced AI demo
 * This script allows running the demo without requiring TypeScript compilation
 */

// Set up environment for API key
require('dotenv').config();

console.log('Starting Simple Enhanced AI Demo...');
console.log('Make sure you have set the OPENAI_API_KEY environment variable');

// Log environment variables for debugging
console.log('Environment variables:');
console.log(`AI_PROVIDER: ${process.env.AI_PROVIDER}`);
console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set (hidden)' : 'Not set'}`);
console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'Set (hidden)' : 'Not set'}`);
console.log(`AI_TEMPERATURE: ${process.env.AI_TEMPERATURE}`);
console.log(`AI_MAX_TOKENS: ${process.env.AI_MAX_TOKENS}`);

try {
  // Use ts-node to run the TypeScript file directly
  console.log('Loading ts-node...');
  require('ts-node/register');
  console.log('Loading demo file...');
  const demo = require('./simple-enhanced-ai-demo');
  console.log('Demo loaded successfully.');
  
  // Explicitly call the runSimpleDemo function
  console.log('Running demo function...');
  demo.runSimpleDemo().catch(error => {
    console.error('Error in demo execution:', error);
  });
} catch (error) {
  console.error('Error loading demo:', error);
} 