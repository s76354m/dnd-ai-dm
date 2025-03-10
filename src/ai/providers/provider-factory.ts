/**
 * AI Provider Factory
 * 
 * This file provides a factory for creating AI provider instances.
 * It allows the application to easily switch between different provider implementations
 * based on configuration settings.
 */

import { AIProvider } from './ai-provider';
import { OpenAIProvider, OpenAIConfig } from './openai-provider';
import { AnthropicProvider, AnthropicConfig } from './anthropic-provider';

/**
 * Supported AI providers
 */
export type ProviderType = 'openai' | 'anthropic';

/**
 * Configuration for the AI provider factory
 */
export interface ProviderFactoryConfig {
  /** The provider to use */
  provider: ProviderType;
  
  /** OpenAI configuration (if using OpenAI) */
  openai?: OpenAIConfig;
  
  /** Anthropic configuration (if using Anthropic) */
  anthropic?: AnthropicConfig;
  
  /** Debug mode */
  debug?: boolean;
}

/**
 * Factory for creating AI provider instances
 */
export class ProviderFactory {
  /**
   * Create a new AI provider instance based on the provided configuration
   * 
   * @param config Provider configuration
   * @returns The appropriate AI provider instance
   */
  public static createProvider(config: ProviderFactoryConfig): AIProvider {
    switch (config.provider) {
      case 'openai':
        if (!config.openai) {
          throw new Error('OpenAI configuration is required when using the OpenAI provider');
        }
        return new OpenAIProvider(config.openai);
      
      case 'anthropic':
        if (!config.anthropic) {
          throw new Error('Anthropic configuration is required when using the Anthropic provider');
        }
        return new AnthropicProvider(config.anthropic);
      
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }
  
  /**
   * Get the default configuration for a specific provider
   * 
   * @param provider The provider type
   * @returns Default configuration for the provider
   */
  public static getDefaultConfig(provider: ProviderType): ProviderFactoryConfig {
    switch (provider) {
      case 'openai':
        return {
          provider: 'openai',
          openai: {
            apiKey: process.env.OPENAI_API_KEY || '',
            defaultModel: 'gpt-3.5-turbo',
            debug: false
          },
          debug: false
        };
      
      case 'anthropic':
        return {
          provider: 'anthropic',
          anthropic: {
            apiKey: process.env.ANTHROPIC_API_KEY || '',
            defaultModel: 'claude-3-sonnet-20240229',
            debug: false
          },
          debug: false
        };
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
} 