/**
 * Environment Setup Script
 * 
 * This script ensures that environment variables from .env are loaded
 * before any other code runs. It's meant to be imported at the beginning
 * of entry point files.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Flag to track if environment has been loaded
let environmentLoaded = false;

// Locate and load the .env file
function setupEnvironment() {
  // If already loaded, skip
  if (environmentLoaded) {
    return;
  }

  // Try to find .env in different possible locations
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(__dirname, '../../.env')
  ];
  
  let envPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      envPath = p;
      break;
    }
  }
  
  if (!envPath) {
    console.warn('⚠️ No .env file found. Using environment variables from the system.');
    return;
  }
  
  console.log(`🔧 Loading environment variables from ${envPath}`);
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error('❌ Error loading .env file:', result.error);
  } else {
    console.log('✅ Environment variables loaded successfully.');
    
    // Log key configuration values for debugging
    console.log(`AI Provider: ${process.env.AI_PROVIDER}`);
    
    // Check which API key is available based on provider
    if (process.env.AI_PROVIDER === 'anthropic') {
      console.log(`Using Anthropic as AI provider`);
      console.log(`Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ present' : '❌ missing'}`);
      console.log(`Anthropic NPC Model: ${process.env.ANTHROPIC_NPC_MODEL || '(default)'}`);
    } else {
      console.log(`Using OpenAI as AI provider`);
      console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ present' : '❌ missing'}`);
      console.log(`OpenAI NPC Model: ${process.env.OPENAI_NPC_MODEL || '(default)'}`);
    }
  }
  
  // Mark environment as loaded
  environmentLoaded = true;
}

/**
 * Ensure that environment variables are loaded
 * This function can be called multiple times, but will only load the environment once
 */
export function ensureEnvironmentLoaded() {
  setupEnvironment();
  return environmentLoaded;
}

// Run the setup automatically when this module is imported
setupEnvironment();

export default setupEnvironment; 