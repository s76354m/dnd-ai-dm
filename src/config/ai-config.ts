/**
 * AI Configuration
 * 
 * This file manages the configuration for AI services and models used in the application.
 * It allows for selection between different AI providers (OpenAI, Anthropic) and
 * configuring specific models for different components of the application.
 */

// Available AI providers
export type AIProvider = 'openai' | 'anthropic';

// Component types that use AI
export type AIComponent = 'dm' | 'story' | 'npc' | 'combat' | 'quest';

// Configuration interface for OpenAI
export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  models: {
    [key in AIComponent]?: string;
  };
  defaultModel: string;
}

// Configuration interface for Anthropic
export interface AnthropicConfig {
  apiKey: string;
  models: {
    [key in AIComponent]?: string;
  };
  defaultModel: string;
}

// Main AI configuration interface
export interface AIConfig {
  provider: AIProvider;
  openai: OpenAIConfig;
  anthropic: AnthropicConfig;
  temperature: number;
  maxTokens: number;
  debug: boolean;
}

/**
 * Default configuration for AI services
 * This can be overridden by environment variables or user settings
 */
export const defaultAIConfig: AIConfig = {
  // Default provider
  provider: 'openai',
  
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    organization: process.env.OPENAI_ORGANIZATION || '',
    models: {
      dm: 'gpt-4-turbo-preview',
      story: 'gpt-4-turbo-preview',
      npc: 'gpt-3.5-turbo',
      combat: 'gpt-3.5-turbo',
      quest: 'gpt-4-turbo-preview'
    },
    defaultModel: 'gpt-3.5-turbo'
  },
  
  // Anthropic configuration
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    models: {
      dm: 'claude-3.5-sonnet-latest',
      story: 'claude-3.5-sonnet-latest',
      npc: 'claude-3.5-sonnet-latest',
      combat: 'claude-3.5-sonnet-latest',
      quest: 'claude-3.5-sonnet-latest'
    },
    defaultModel: 'claude-3.5-sonnet-latest'
  },
  
  // Common AI parameters
  temperature: 0.7,
  maxTokens: 4096, // Reasonable default that works across models
  debug: process.env.NODE_ENV === 'development'
};

/**
 * Model-specific token limits
 */
export const MODEL_TOKEN_LIMITS: Record<string, number> = {
  // OpenAI models
  'gpt-3.5-turbo': 16384,
  'gpt-4-turbo-preview': 128000,
  'gpt-4': 8192,
  
  // Anthropic models
  'claude-3.5-sonnet-latest': 8192,
  'claude-3-opus': 32768,
  'claude-3-sonnet': 8192,
  'claude-3-haiku': 4096
};

/**
 * Get the token limit for a specific model
 * 
 * @param model The model name
 * @returns The maximum token limit or a safe default
 */
export function getModelTokenLimit(model: string): number {
  return MODEL_TOKEN_LIMITS[model] || 4096; // Safe default
}

/**
 * Load AI configuration from environment variables and defaults
 */
export function loadAIConfig(): AIConfig {
  const config = { ...defaultAIConfig };
  
  // Override provider if specified
  if (process.env.AI_PROVIDER && 
      (process.env.AI_PROVIDER === 'openai' || process.env.AI_PROVIDER === 'anthropic')) {
    config.provider = process.env.AI_PROVIDER;
  }
  
  // Override API keys if provided
  if (process.env.OPENAI_API_KEY) {
    config.openai.apiKey = process.env.OPENAI_API_KEY;
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    config.anthropic.apiKey = process.env.ANTHROPIC_API_KEY;
  }
  
  // Override temperature if specified
  if (process.env.AI_TEMPERATURE) {
    const temp = parseFloat(process.env.AI_TEMPERATURE);
    if (!isNaN(temp) && temp >= 0 && temp <= 2) {
      config.temperature = temp;
    }
  }
  
  // Override max tokens if specified
  if (process.env.AI_MAX_TOKENS) {
    const tokens = parseInt(process.env.AI_MAX_TOKENS, 10);
    if (!isNaN(tokens) && tokens > 0) {
      config.maxTokens = tokens;
    }
  }
  
  // Override debug mode
  if (process.env.AI_DEBUG === 'true') {
    config.debug = true;
  } else if (process.env.AI_DEBUG === 'false') {
    config.debug = false;
  }
  
  // Override specific model configurations from environment variables
  if (process.env.ANTHROPIC_DM_MODEL) {
    config.anthropic.models.dm = process.env.ANTHROPIC_DM_MODEL;
  }
  if (process.env.ANTHROPIC_STORY_MODEL) {
    config.anthropic.models.story = process.env.ANTHROPIC_STORY_MODEL;
  }
  if (process.env.ANTHROPIC_NPC_MODEL) {
    config.anthropic.models.npc = process.env.ANTHROPIC_NPC_MODEL;
  }
  if (process.env.ANTHROPIC_COMBAT_MODEL) {
    config.anthropic.models.combat = process.env.ANTHROPIC_COMBAT_MODEL;
  }
  if (process.env.ANTHROPIC_QUEST_MODEL) {
    config.anthropic.models.quest = process.env.ANTHROPIC_QUEST_MODEL;
  }
  
  return config;
}

/**
 * Get the appropriate model for a specific component
 * 
 * @param component The AI component to get a model for
 * @param config Optional custom configuration
 * @returns The model name to use
 */
export function getModelForComponent(
  component: AIComponent,
  config: AIConfig = loadAIConfig()
): string {
  const providerConfig = config.provider === 'openai' 
    ? config.openai 
    : config.anthropic;
  
  return providerConfig.models[component] || providerConfig.defaultModel;
}

/**
 * Validate the AI configuration
 * 
 * @param config The configuration to validate
 * @returns An object with validation results
 */
export function validateAIConfig(config: AIConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if API key is provided for the selected provider
  if (config.provider === 'openai' && !config.openai.apiKey) {
    errors.push('OpenAI API key is required when using OpenAI as the provider');
  }
  
  if (config.provider === 'anthropic' && !config.anthropic.apiKey) {
    errors.push('Anthropic API key is required when using Anthropic as the provider');
  }
  
  // Check temperature range
  if (config.temperature < 0 || config.temperature > 2) {
    errors.push('Temperature must be between 0 and 2');
  }
  
  // Check max tokens
  if (config.maxTokens <= 0) {
    errors.push('Max tokens must be greater than 0');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 