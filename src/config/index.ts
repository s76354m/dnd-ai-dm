/**
 * Configuration Module
 * 
 * This module exports configuration components for the application,
 * particularly focusing on AI services configuration and implementation.
 */

// Export AI configuration types and functions
export {
  AIProvider,
  AIComponent,
  AIConfig,
  OpenAIConfig,
  AnthropicConfig,
  defaultAIConfig,
  loadAIConfig,
  getModelForComponent,
  validateAIConfig
} from './ai-config';

// Export AI service
export { AIService, AIResponse } from './ai-service';

/**
 * Environment configuration helper
 * Safely gets environment variables with type conversion and defaults
 */
export function getEnv<T>(key: string, defaultValue: T, converter?: (val: string) => T): T {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  
  if (converter) {
    try {
      return converter(value);
    } catch (e: any) {
      console.warn(`Failed to convert environment variable ${key}: ${e.message || 'Unknown error'}`);
      return defaultValue;
    }
  }
  
  return value as unknown as T;
}

// Helper converters for environment variables
export const converters = {
  toBoolean: (value: string): boolean => {
    return value.toLowerCase() === 'true' || value === '1';
  },
  toNumber: (value: string): number => {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Cannot convert "${value}" to a number`);
    }
    return num;
  },
  toJson: <T>(value: string): T => {
    return JSON.parse(value);
  }
};

/**
 * Application configuration defaults
 */
export const appConfig = {
  // Port for server mode (if implemented)
  port: getEnv('PORT', 3000, converters.toNumber),
  
  // Log level
  logLevel: getEnv('LOG_LEVEL', 'info'),
  
  // Default API settings
  useCache: getEnv('USE_CACHE', true, converters.toBoolean),
  cacheExpiry: getEnv('CACHE_EXPIRY', 3600, converters.toNumber), // seconds
  
  // DM settings
  storyComplexity: getEnv('STORY_COMPLEXITY', 'medium'),
  aiCreativity: getEnv('AI_CREATIVITY', 0.7, converters.toNumber),
  
  // Development mode
  isDev: process.env.NODE_ENV !== 'production'
}; 