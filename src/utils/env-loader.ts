/**
 * Environment Loader Utility
 * 
 * This utility handles loading environment variables from .env files
 * and provides a consistent interface for accessing configuration values
 * throughout the application.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Environment configuration interface
 */
export interface EnvConfig {
  // AI Provider Selection
  aiProvider: 'openai' | 'anthropic';
  
  // OpenAI Configuration
  openaiApiKey?: string;
  openaiOrganization?: string;
  
  // Anthropic Configuration
  anthropicApiKey?: string;
  
  // AI Generation Parameters
  aiTemperature: number;
  aiMaxTokens: number;
  aiDebug: boolean;
  
  // Component-Specific Model Overrides
  openaiDmModel?: string;
  openaiStoryModel?: string;
  openaiNpcModel?: string;
  openaiCombatModel?: string;
  openaiQuestModel?: string;
  
  anthropicDmModel?: string;
  anthropicStoryModel?: string;
  anthropicNpcModel?: string;
  anthropicCombatModel?: string;
  anthropicQuestModel?: string;
  
  // Application Settings
  logLevel: string;
  useCache: boolean;
  cacheExpiry: number;
  
  // DM Settings
  storyComplexity: 'simple' | 'medium' | 'complex';
  aiCreativity: number;
}

/**
 * Environment Loader class
 */
export class EnvLoader {
  private static instance: EnvLoader;
  private config: EnvConfig;
  private initialized: boolean = false;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.config = this.getDefaultConfig();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): EnvLoader {
    if (!EnvLoader.instance) {
      EnvLoader.instance = new EnvLoader();
    }
    return EnvLoader.instance;
  }
  
  /**
   * Initialize the environment loader
   * 
   * @param envPath Optional path to .env file
   * @returns The loaded configuration
   */
  public initialize(envPath?: string): EnvConfig {
    if (this.initialized) {
      return this.config;
    }
    
    // Load environment variables from .env file
    const result = dotenv.config({
      path: envPath || path.resolve(process.cwd(), '.env')
    });
    
    if (result.error) {
      console.warn(`Warning: Could not load .env file: ${result.error.message}`);
      console.warn('Using default configuration values.');
    }
    
    // Parse environment variables into config
    this.config = this.parseEnvVariables();
    this.initialized = true;
    
    return this.config;
  }
  
  /**
   * Get the current configuration
   */
  public getConfig(): EnvConfig {
    if (!this.initialized) {
      this.initialize();
    }
    return this.config;
  }
  
  /**
   * Parse environment variables into configuration object
   */
  private parseEnvVariables(): EnvConfig {
    return {
      // AI Provider Selection
      aiProvider: (process.env.AI_PROVIDER as 'openai' | 'anthropic') || this.config.aiProvider,
      
      // OpenAI Configuration
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiOrganization: process.env.OPENAI_ORGANIZATION,
      
      // Anthropic Configuration
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      
      // AI Generation Parameters
      aiTemperature: parseFloat(process.env.AI_TEMPERATURE || '') || this.config.aiTemperature,
      aiMaxTokens: parseInt(process.env.AI_MAX_TOKENS || '') || this.config.aiMaxTokens,
      aiDebug: process.env.AI_DEBUG === 'true' || this.config.aiDebug,
      
      // Component-Specific Model Overrides
      openaiDmModel: process.env.OPENAI_DM_MODEL,
      openaiStoryModel: process.env.OPENAI_STORY_MODEL,
      openaiNpcModel: process.env.OPENAI_NPC_MODEL,
      openaiCombatModel: process.env.OPENAI_COMBAT_MODEL,
      openaiQuestModel: process.env.OPENAI_QUEST_MODEL,
      
      anthropicDmModel: process.env.ANTHROPIC_DM_MODEL,
      anthropicStoryModel: process.env.ANTHROPIC_STORY_MODEL,
      anthropicNpcModel: process.env.ANTHROPIC_NPC_MODEL,
      anthropicCombatModel: process.env.ANTHROPIC_COMBAT_MODEL,
      anthropicQuestModel: process.env.ANTHROPIC_QUEST_MODEL,
      
      // Application Settings
      logLevel: process.env.LOG_LEVEL || this.config.logLevel,
      useCache: process.env.USE_CACHE === 'true' || this.config.useCache,
      cacheExpiry: parseInt(process.env.CACHE_EXPIRY || '') || this.config.cacheExpiry,
      
      // DM Settings
      storyComplexity: (process.env.STORY_COMPLEXITY as 'simple' | 'medium' | 'complex') || this.config.storyComplexity,
      aiCreativity: parseFloat(process.env.AI_CREATIVITY || '') || this.config.aiCreativity,
    };
  }
  
  /**
   * Get default configuration values
   */
  private getDefaultConfig(): EnvConfig {
    return {
      aiProvider: 'openai',
      aiTemperature: 0.7,
      aiMaxTokens: 2000,
      aiDebug: false,
      logLevel: 'info',
      useCache: true,
      cacheExpiry: 3600,
      storyComplexity: 'medium',
      aiCreativity: 0.7,
    };
  }
}

// Export a singleton instance
export const envLoader = EnvLoader.getInstance(); 