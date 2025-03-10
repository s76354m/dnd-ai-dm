/**
 * API Key Test Utility
 * 
 * This script tests the configured API keys for OpenAI and Anthropic
 * to verify that they are working correctly. It attempts to generate
 * a simple response from each configured provider.
 */

import { EnvLoader } from '../utils/env-loader';
import { RealAIService } from '../ai/real-ai-service';
import { ProviderFactory } from '../ai/providers/provider-factory';
import { ProviderType } from '../ai/providers/provider-types';
import chalk from 'chalk';

async function testApiKeys() {
  console.log(chalk.blue('D&D AI DM - API Key Test Utility'));
  console.log(chalk.blue('================================\n'));

  // Initialize environment
  console.log(chalk.yellow('Initializing environment...'));
  const envLoader = EnvLoader.getInstance();
  const config = envLoader.getConfig();
  console.log(chalk.green('Environment initialized successfully.\n'));

  // Display configuration
  console.log(chalk.yellow('Configuration:'));
  console.log(`Provider: ${config.provider}`);
  console.log(`OpenAI API Key: ${config.openai.apiKey ? chalk.green('Configured') : chalk.red('Not configured')}`);
  console.log(`OpenAI Model: ${config.openai.model || 'Not specified'}`);
  console.log(`Anthropic API Key: ${config.anthropic.apiKey ? chalk.green('Configured') : chalk.red('Not configured')}`);
  console.log(`Anthropic Model: ${config.anthropic.model || 'Not specified'}`);
  console.log();

  // Test OpenAI if configured
  if (config.openai.apiKey) {
    console.log(chalk.yellow('Testing OpenAI API key...'));
    try {
      const openaiProvider = ProviderFactory.createProvider({
        type: 'openai' as ProviderType,
        openaiConfig: {
          apiKey: config.openai.apiKey,
          model: config.openai.model,
          organization: config.openai.organization
        }
      });

      const response = await openaiProvider.generateCompletion({
        prompt: 'Generate a brief description of a fantasy tavern in 2-3 sentences.',
        maxTokens: 100,
        temperature: 0.7
      });

      console.log(chalk.green('OpenAI API key is working!'));
      console.log('Sample response:');
      console.log(chalk.cyan(response.content));
      console.log(`Tokens used: ${response.usage?.total || 'Unknown'}`);
      console.log();
    } catch (error) {
      console.log(chalk.red('Error testing OpenAI API key:'));
      console.error(error);
      console.log();
    }
  } else {
    console.log(chalk.yellow('Skipping OpenAI test (API key not configured).\n'));
  }

  // Test Anthropic if configured
  if (config.anthropic.apiKey) {
    console.log(chalk.yellow('Testing Anthropic API key...'));
    try {
      const anthropicProvider = ProviderFactory.createProvider({
        type: 'anthropic' as ProviderType,
        anthropicConfig: {
          apiKey: config.anthropic.apiKey,
          model: config.anthropic.model
        }
      });

      const response = await anthropicProvider.generateCompletion({
        prompt: 'Generate a brief description of a fantasy tavern in 2-3 sentences.',
        maxTokens: 100,
        temperature: 0.7
      });

      console.log(chalk.green('Anthropic API key is working!'));
      console.log('Sample response:');
      console.log(chalk.cyan(response.content));
      console.log(`Tokens used: ${response.usage?.total || 'Unknown'}`);
      console.log();
    } catch (error) {
      console.log(chalk.red('Error testing Anthropic API key:'));
      console.error(error);
      console.log();
    }
  } else {
    console.log(chalk.yellow('Skipping Anthropic test (API key not configured).\n'));
  }

  // Test RealAIService
  if (config.openai.apiKey || config.anthropic.apiKey) {
    console.log(chalk.yellow('Testing RealAIService integration...'));
    try {
      const realAI = new RealAIService();
      
      const narrativeResponse = await realAI.generateNarrative({
        prompt: 'Describe a mysterious forest clearing with ancient ruins.',
        context: {
          timeOfDay: 'dusk',
          weather: 'misty',
          recentEvents: ['The party heard strange whispers', 'A shadow moved between the trees']
        }
      });

      console.log(chalk.green('RealAIService is working!'));
      console.log('Sample narrative:');
      console.log(chalk.cyan(narrativeResponse));
      console.log();
    } catch (error) {
      console.log(chalk.red('Error testing RealAIService:'));
      console.error(error);
      console.log();
    }
  } else {
    console.log(chalk.yellow('Skipping RealAIService test (no API keys configured).\n'));
  }

  // Summary
  console.log(chalk.blue('Test Summary:'));
  if (config.openai.apiKey || config.anthropic.apiKey) {
    if (config.openai.apiKey && config.anthropic.apiKey) {
      console.log(chalk.green('Both OpenAI and Anthropic API keys are configured.'));
      console.log('The application will use the provider specified in your configuration.');
    } else if (config.openai.apiKey) {
      console.log(chalk.green('OpenAI API key is configured.'));
      console.log('The application will use OpenAI for AI services.');
    } else {
      console.log(chalk.green('Anthropic API key is configured.'));
      console.log('The application will use Anthropic for AI services.');
    }
  } else {
    console.log(chalk.red('No API keys are configured.'));
    console.log('The application will fall back to SimpleAIService with limited functionality.');
    console.log('To use the full AI capabilities, please configure at least one API key in your .env file.');
  }
}

// Run the test
testApiKeys().catch(error => {
  console.error('Unhandled error during API key test:');
  console.error(error);
  process.exit(1);
}); 