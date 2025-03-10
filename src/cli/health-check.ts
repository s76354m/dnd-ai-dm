/**
 * D&D AI Dungeon Master - Health Check Utility
 * 
 * This script performs a comprehensive health check on all major components
 * of the D&D AI Dungeon Master application, verifying that everything is
 * configured and functioning correctly.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { createApiKeyManager } from '../ai/config/api-key-manager';
import { createAIServiceWrapper } from '../ai/ai-service-wrapper';
import { AIService } from '../dm/ai-service';
import { CharacterCreator } from '../character/character-creator';
import { WorldGenerator } from '../world/world-generator';
import { initializeCombatSystem } from '../combat';
import { InventoryManager } from '../character/inventory';
import { CommandProcessor } from '../core/command-processor';
import { createGameStateManager } from '../core/game-state-manager';
import * as readline from 'readline';

// Configure the health check
const CONFIG = {
  verbose: false,
  outputFile: path.join(process.cwd(), 'health-check-results.log'),
  requiredDirectories: [
    'src/character',
    'src/combat',
    'src/core',
    'src/world',
    'src/dm',
    'src/ai'
  ],
  requiredFiles: [
    'package.json',
    'tsconfig.json',
    '.env'
  ],
  minNodeVersion: '16.0.0'
};

// Create readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility for prompting
const prompt = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Logger
const logger = {
  log: (message: string) => {
    console.log(message);
    if (CONFIG.verbose) {
      fs.appendFileSync(CONFIG.outputFile, `${message}\n`);
    }
  },
  success: (message: string) => {
    console.log(chalk.green(`✅ ${message}`));
    if (CONFIG.verbose) {
      fs.appendFileSync(CONFIG.outputFile, `SUCCESS: ${message}\n`);
    }
  },
  warning: (message: string) => {
    console.log(chalk.yellow(`⚠️ ${message}`));
    if (CONFIG.verbose) {
      fs.appendFileSync(CONFIG.outputFile, `WARNING: ${message}\n`);
    }
  },
  error: (message: string, error?: any) => {
    console.error(chalk.red(`❌ ${message}`));
    if (error) {
      console.error(chalk.red(error.message || error));
    }
    if (CONFIG.verbose) {
      fs.appendFileSync(CONFIG.outputFile, `ERROR: ${message}\n`);
      if (error) {
        fs.appendFileSync(CONFIG.outputFile, `${error.stack || error}\n`);
      }
    }
  },
  header: (message: string) => {
    const line = '='.repeat(message.length + 4);
    console.log(chalk.cyan(`\n${line}`));
    console.log(chalk.cyan(`  ${message}  `));
    console.log(chalk.cyan(`${line}\n`));
    
    if (CONFIG.verbose) {
      fs.appendFileSync(CONFIG.outputFile, `\n${line}\n`);
      fs.appendFileSync(CONFIG.outputFile, `  ${message}  \n`);
      fs.appendFileSync(CONFIG.outputFile, `${line}\n\n`);
    }
  }
};

// Function to check system requirements
async function checkSystemRequirements(): Promise<boolean> {
  logger.header('System Requirements Check');
  
  // Check Node.js version
  const nodeVersion = process.version.substring(1); // Remove 'v' prefix
  logger.log(`Node.js version: ${nodeVersion}`);
  
  if (compareVersions(nodeVersion, CONFIG.minNodeVersion) < 0) {
    logger.error(`Node.js version must be at least ${CONFIG.minNodeVersion}`);
    return false;
  } else {
    logger.success('Node.js version is sufficient');
  }
  
  // Check available memory
  const totalMemory = Math.round(os.totalmem() / (1024 * 1024 * 1024) * 10) / 10;
  const freeMemory = Math.round(os.freemem() / (1024 * 1024 * 1024) * 10) / 10;
  
  logger.log(`Total system memory: ${totalMemory}GB`);
  logger.log(`Free system memory: ${freeMemory}GB`);
  
  if (totalMemory < 4) {
    logger.warning('System has less than the recommended 4GB of RAM');
  } else {
    logger.success('System has sufficient RAM');
  }
  
  // Check disk space
  try {
    const projectDir = process.cwd();
    const tempFile = path.join(projectDir, '.temp-write-test');
    
    // Test write permissions
    fs.writeFileSync(tempFile, 'test');
    fs.unlinkSync(tempFile);
    logger.success('File system write permissions confirmed');
  } catch (error) {
    logger.error('Cannot write to file system', error);
    return false;
  }
  
  return true;
}

// Function to check file structure
async function checkFileStructure(): Promise<boolean> {
  logger.header('File Structure Check');
  
  const projectDir = process.cwd();
  let allOk = true;
  
  // Check required directories
  for (const dir of CONFIG.requiredDirectories) {
    const dirPath = path.join(projectDir, dir);
    
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      logger.success(`Directory exists: ${dir}`);
    } else {
      logger.error(`Missing required directory: ${dir}`);
      allOk = false;
    }
  }
  
  // Check required files
  for (const file of CONFIG.requiredFiles) {
    const filePath = path.join(projectDir, file);
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      logger.success(`File exists: ${file}`);
    } else {
      if (file === '.env') {
        logger.warning(`Missing file: ${file} (not critical if using environment variables)`);
      } else {
        logger.error(`Missing required file: ${file}`);
        allOk = false;
      }
    }
  }
  
  // Check package.json for required dependencies
  try {
    const packageJsonPath = path.join(projectDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = ['typescript', 'openai', 'uuid', 'inquirer'];
    const missingDeps = requiredDeps.filter(dep => 
      !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
    );
    
    if (missingDeps.length === 0) {
      logger.success('All required dependencies are present in package.json');
    } else {
      logger.error(`Missing dependencies in package.json: ${missingDeps.join(', ')}`);
      allOk = false;
    }
  } catch (error) {
    logger.error('Error reading package.json', error);
    allOk = false;
  }
  
  return allOk;
}

// Function to check AI service configuration
async function checkAIService(): Promise<boolean> {
  logger.header('AI Service Configuration Check');
  
  try {
    // Check for API keys
    const apiKeyManager = createApiKeyManager({ preferEnvVars: true });
    
    const hasOpenAI = apiKeyManager.hasApiKey('openai');
    const hasAnthropic = apiKeyManager.hasApiKey('anthropic');
    
    if (hasOpenAI) {
      logger.success('OpenAI API key is configured');
    } else {
      logger.warning('OpenAI API key is not configured');
    }
    
    if (hasAnthropic) {
      logger.success('Anthropic API key is configured');
    } else {
      logger.warning('Anthropic API key is not configured');
    }
    
    if (!hasOpenAI && !hasAnthropic) {
      logger.error('No AI provider API keys are configured');
      
      const setupNow = await prompt('Would you like to set up an API key now? (y/n) ');
      if (setupNow.toLowerCase() === 'y') {
        const provider = await prompt('Which provider? (openai/anthropic) ');
        const apiKey = await prompt('Enter your API key: ');
        
        if (provider && apiKey) {
          if (provider.toLowerCase() === 'openai' || provider.toLowerCase() === 'anthropic') {
            apiKeyManager.setApiKey(provider.toLowerCase() as 'openai' | 'anthropic', apiKey);
            logger.success(`API key for ${provider} configured successfully`);
          } else {
            logger.error('Invalid provider specified');
          }
        }
      } else {
        return false;
      }
    }
    
    // Test API connection if keys are available
    if (apiKeyManager.hasApiKey('openai') || apiKeyManager.hasApiKey('anthropic')) {
      logger.log('Testing AI service connection...');
      
      try {
        // Create AI service wrapper with default provider
        const provider = apiKeyManager.hasApiKey('openai') ? 'openai' : 'anthropic';
        
        const aiServiceWrapper = createAIServiceWrapper({
          defaultProvider: provider,
          keyManager: apiKeyManager
        });
        
        const aiService = new AIService();
        
        // Simple test completion
        const testResult = await aiService.generateCompletion(
          'Generate a greeting for a D&D game in 10 words or less.',
          'test',
          { temperature: 0.7 }
        );
        
        if (testResult && testResult.text) {
          logger.success(`AI service connection successful! Response: "${testResult.text.trim()}"`);
          return true;
        } else {
          logger.error('AI service returned empty response');
          return false;
        }
      } catch (error) {
        logger.error('Error connecting to AI service', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error checking AI service configuration', error);
    return false;
  }
}

// Function to check core game components
async function checkGameComponents(): Promise<boolean> {
  logger.header('Core Game Components Check');
  
  let allOk = true;
  
  // Check Character Creator
  try {
    const creator = new CharacterCreator();
    logger.success('Character Creator initialized successfully');
  } catch (error) {
    logger.error('Error initializing Character Creator', error);
    allOk = false;
  }
  
  // Check World Generator
  try {
    const worldGenerator = new WorldGenerator();
    const testLocation = worldGenerator.generateStartingLocation();
    
    if (testLocation && testLocation.id && testLocation.name) {
      logger.success(`World Generator created location: ${testLocation.name}`);
    } else {
      logger.error('World Generator failed to create a valid location');
      allOk = false;
    }
  } catch (error) {
    logger.error('Error with World Generator', error);
    allOk = false;
  }
  
  // Check Combat System
  try {
    const inventoryManager = new InventoryManager();
    const aiKeyManager = createApiKeyManager({ preferEnvVars: true });
    
    if (aiKeyManager.hasApiKey('openai') || aiKeyManager.hasApiKey('anthropic')) {
      const provider = aiKeyManager.hasApiKey('openai') ? 'openai' : 'anthropic';
      
      const aiServiceWrapper = createAIServiceWrapper({
        defaultProvider: provider,
        keyManager: aiKeyManager
      });
      
      const aiService = new AIService();
      
      const combatSystem = initializeCombatSystem(inventoryManager, aiService);
      
      if (combatSystem && combatSystem.combatManager && combatSystem.enemyManager) {
        logger.success('Combat System initialized successfully');
      } else {
        logger.error('Combat System initialization incomplete');
        allOk = false;
      }
    } else {
      logger.warning('Combat System check skipped (requires AI service configuration)');
    }
  } catch (error) {
    logger.error('Error initializing Combat System', error);
    allOk = false;
  }
  
  // Check Game State Manager
  try {
    const gameStateManager = createGameStateManager();
    logger.success('Game State Manager initialized successfully');
  } catch (error) {
    logger.error('Error initializing Game State Manager', error);
    allOk = false;
  }
  
  return allOk;
}

// Function to perform all checks and print a summary
async function runHealthCheck(): Promise<void> {
  logger.log('Starting D&D AI Dungeon Master Health Check...\n');
  
  if (CONFIG.verbose) {
    fs.writeFileSync(CONFIG.outputFile, `D&D AI Dungeon Master Health Check\n${new Date().toISOString()}\n\n`);
  }
  
  const systemOk = await checkSystemRequirements();
  const filesOk = await checkFileStructure();
  const aiOk = await checkAIService();
  const componentsOk = await checkGameComponents();
  
  logger.header('Health Check Summary');
  
  if (systemOk) {
    logger.success('System Requirements: PASS');
  } else {
    logger.error('System Requirements: FAIL');
  }
  
  if (filesOk) {
    logger.success('File Structure: PASS');
  } else {
    logger.error('File Structure: FAIL');
  }
  
  if (aiOk) {
    logger.success('AI Service Configuration: PASS');
  } else {
    logger.error('AI Service Configuration: FAIL');
  }
  
  if (componentsOk) {
    logger.success('Core Game Components: PASS');
  } else {
    logger.error('Core Game Components: FAIL');
  }
  
  const allOk = systemOk && filesOk && aiOk && componentsOk;
  
  if (allOk) {
    logger.header('🎉 ALL CHECKS PASSED! Your D&D AI Dungeon Master is ready to use.');
    logger.log('You can start a new game with: npm start');
  } else {
    logger.header('⚠️ SOME CHECKS FAILED. Please fix the issues before using the application.');
    logger.log('Check the documentation for troubleshooting: docs/SETUP_GUIDE.md');
  }
  
  rl.close();
}

// Version comparison utility
function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(part => parseInt(part, 10));
  const bParts = b.split('.').map(part => parseInt(part, 10));
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = i < aParts.length ? aParts[i] : 0;
    const bVal = i < bParts.length ? bParts[i] : 0;
    
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }
  
  return 0;
}

// Run health check if this file is executed directly
if (require.main === module) {
  runHealthCheck()
    .catch(error => {
      console.error('Fatal error during health check:', error);
      process.exit(1);
    });
}

export { runHealthCheck }; 