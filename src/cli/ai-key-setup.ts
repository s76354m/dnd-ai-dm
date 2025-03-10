#!/usr/bin/env node
/**
 * AI API Key Setup CLI
 * 
 * A command-line utility for setting up API keys for AI providers.
 * This tool helps users configure their AI API keys securely.
 */

import * as readline from 'readline';
import { AIService } from '../ai/ai-service-wrapper';
import { ApiKeyManager } from '../ai/config/api-key-manager';
import { AIConfigManager } from '../ai/config/ai-config-manager';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt for user input
 * 
 * @param question Question to ask
 * @returns User input
 */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Prompt for hidden input (e.g., passwords)
 * 
 * @param question Question to ask
 * @returns User input
 */
async function promptSecret(question: string): Promise<string> {
  process.stdout.write(question);
  
  // This is a simple implementation that doesn't actually hide input on all platforms
  // For a production app, consider using a library like 'password-prompt'
  return new Promise((resolve) => {
    let input = '';
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');
    
    process.stdin.on('data', (key: Buffer) => {
      const keyStr = key.toString();
      
      // Ctrl+C or Ctrl+D
      if (keyStr === '\u0003' || keyStr === '\u0004') {
        process.stdout.write('\n');
        process.exit(0);
      }
      
      // Enter key
      if (keyStr === '\r' || keyStr === '\n') {
        process.stdout.write('\n');
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve(input);
        return;
      }
      
      // Backspace
      if (keyStr === '\u007f') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      
      // Regular character
      input += keyStr;
      process.stdout.write('*');
    });
  });
}

/**
 * Display welcome message
 */
function displayWelcome(): void {
  console.log(`
┌─────────────────────────────────────────────────┐
│                                                 │
│        D&D AI Dungeon Master - API Setup        │
│                                                 │
└─────────────────────────────────────────────────┘

This utility will help you set up API keys for AI providers.
These keys are required for the AI Dungeon Master to function.

Your API keys will be stored securely on your local machine.
  `);
}

/**
 * Display menu options
 */
function displayMenu(): void {
  console.log(`
Please select an option:

1. Set OpenAI API key
2. Set Anthropic API key
3. Test current configuration
4. Change default provider
5. View current configuration
6. Clear all API keys
0. Exit
  `);
}

/**
 * Set an API key
 * 
 * @param provider Provider type
 */
async function setApiKey(provider: 'openai' | 'anthropic'): Promise<void> {
  console.log(`\nSetting up ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`);
  
  // Show instructions for getting an API key
  if (provider === 'openai') {
    console.log(`
To get an OpenAI API key:
1. Go to https://platform.openai.com/
2. Sign in or create an account
3. Navigate to API keys section
4. Create a new secret key
    `);
  } else {
    console.log(`
To get an Anthropic API key:
1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Navigate to API keys section
4. Create a new API key
    `);
  }
  
  // Prompt for the API key
  const apiKey = await promptSecret(`Enter your ${provider} API key: `);
  
  if (!apiKey) {
    console.log('No API key provided. Operation cancelled.');
    return;
  }
  
  try {
    // Save the API key
    const keyManager = ApiKeyManager.getInstance();
    await keyManager.setApiKey(provider, apiKey);
    
    console.log(`\n✅ ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key saved successfully!`);
  } catch (error) {
    console.error(`\n❌ Error saving API key: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Test the current configuration
 */
async function testConfiguration(): Promise<void> {
  console.log('\nTesting AI configuration...');
  
  try {
    // Initialize AI service
    const aiService = await AIService.getInstance({ debug: true });
    
    console.log(`\nProvider: ${aiService.getProviderName()}`);
    
    // Generate a simple test response
    console.log('Generating test response...');
    const response = await aiService.generate('Say hello and identify yourself as an AI assistant for D&D.');
    
    console.log('\n=== Test Response ===');
    console.log(response.content);
    console.log('=====================');
    
    if (response.tokenUsage) {
      console.log(`\nToken usage: ${response.tokenUsage.totalTokens} tokens`);
    }
    
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error(`\n❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
    console.log('\nPlease check your API keys and try again.');
  }
}

/**
 * Change the default provider
 */
async function changeDefaultProvider(): Promise<void> {
  console.log('\nChanging default AI provider');
  
  // Get the current configuration
  const configManager = AIConfigManager.getInstance();
  const currentConfig = configManager.getConfig();
  
  console.log(`Current provider: ${currentConfig.provider}`);
  console.log('\nAvailable providers:');
  console.log('1. OpenAI');
  console.log('2. Anthropic');
  
  const choice = await prompt('\nSelect provider (1-2): ');
  
  let newProvider: 'openai' | 'anthropic';
  
  switch (choice) {
    case '1':
      newProvider = 'openai';
      break;
    case '2':
      newProvider = 'anthropic';
      break;
    default:
      console.log('Invalid selection. Operation cancelled.');
      return;
  }
  
  // Check if the API key is set for the selected provider
  const keyManager = ApiKeyManager.getInstance();
  const hasKey = await keyManager.hasApiKey(newProvider);
  
  if (!hasKey) {
    console.log(`\n⚠️ No API key found for ${newProvider === 'openai' ? 'OpenAI' : 'Anthropic'}.`);
    const setKey = await prompt('Would you like to set it now? (y/n): ');
    
    if (setKey.toLowerCase() === 'y') {
      await setApiKey(newProvider);
    } else {
      console.log('Operation cancelled.');
      return;
    }
  }
  
  // Update the configuration
  configManager.updateConfig({ provider: newProvider });
  
  console.log(`\n✅ Default provider changed to ${newProvider === 'openai' ? 'OpenAI' : 'Anthropic'}.`);
}

/**
 * View current configuration
 */
async function viewConfiguration(): Promise<void> {
  console.log('\nCurrent Configuration:');
  
  const configManager = AIConfigManager.getInstance();
  const keyManager = ApiKeyManager.getInstance();
  const config = configManager.getConfig();
  
  console.log(`\nDefault Provider: ${config.provider}`);
  
  // Check API keys
  const openaiKey = await keyManager.hasApiKey('openai');
  const anthropicKey = await keyManager.hasApiKey('anthropic');
  
  console.log(`OpenAI API Key: ${openaiKey ? '✅ Set' : '❌ Not set'}`);
  console.log(`Anthropic API Key: ${anthropicKey ? '✅ Set' : '❌ Not set'}`);
  
  // Show model settings
  console.log('\nModel Settings:');
  Object.entries(config.defaultModels).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });
  
  // Show generation settings
  console.log('\nGeneration Settings:');
  console.log(`- Temperature: ${config.generation.temperature}`);
  console.log(`- Max Tokens: ${config.generation.maxTokens}`);
  console.log(`- Track Token Usage: ${config.generation.trackTokenUsage ? 'Yes' : 'No'}`);
  
  console.log(`\nDebug Mode: ${config.debug ? 'Enabled' : 'Disabled'}`);
}

/**
 * Clear all API keys
 */
async function clearApiKeys(): Promise<void> {
  console.log('\n⚠️ Warning: This will remove all stored API keys.');
  const confirm = await prompt('Are you sure you want to continue? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Operation cancelled.');
    return;
  }
  
  try {
    const keyManager = ApiKeyManager.getInstance();
    await keyManager.clearAllKeys();
    
    console.log('\n✅ All API keys have been removed.');
  } catch (error) {
    console.error(`\n❌ Error clearing API keys: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  displayWelcome();
  
  let running = true;
  
  while (running) {
    displayMenu();
    
    const choice = await prompt('\nEnter your choice (0-6): ');
    
    switch (choice) {
      case '0':
        running = false;
        break;
      case '1':
        await setApiKey('openai');
        break;
      case '2':
        await setApiKey('anthropic');
        break;
      case '3':
        await testConfiguration();
        break;
      case '4':
        await changeDefaultProvider();
        break;
      case '5':
        await viewConfiguration();
        break;
      case '6':
        await clearApiKeys();
        break;
      default:
        console.log('\nInvalid option. Please try again.');
        break;
    }
    
    if (running) {
      await prompt('\nPress Enter to continue...');
    }
  }
  
  console.log('\nThank you for using the D&D AI Dungeon Master API Setup!\n');
  rl.close();
}

// Start the application
main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}); 