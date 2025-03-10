/**
 * Anthropic Provider Implementation
 * 
 * This file implements the Anthropic provider for the AI service.
 * It handles making requests to the Anthropic API (Claude) and processing responses.
 */

import axios from 'axios';
import { AIProvider, AICompletionOptions } from './ai-provider';
import { AIResponse } from '../../config/ai-service';

/**
 * Anthropic-specific configuration options
 */
export interface AnthropicConfig {
  /** API key for Anthropic */
  apiKey: string;
  
  /** Default model to use */
  defaultModel: string;
  
  /** Debug mode */
  debug?: boolean;
}

/**
 * Anthropic Provider Implementation
 */
export class AnthropicProvider extends AIProvider {
  private defaultModel: string;
  
  /**
   * Available models in Anthropic
   */
  private static readonly AVAILABLE_MODELS = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    'claude-3-5-sonnet-20240620',
    'claude-instant-1.2'
  ];
  
  /**
   * Creates a new Anthropic provider
   * 
   * @param config Anthropic configuration
   */
  constructor(config: AnthropicConfig) {
    super(config.apiKey, config.debug);
    this.defaultModel = config.defaultModel || 'claude-3-sonnet-20240229';
  }
  
  /**
   * Generate a completion using Anthropic (Claude)
   * 
   * @param prompt The prompt to send to the AI
   * @param model The specific model to use (or default if not specified)
   * @param options Additional options for the request
   * @returns The AI's response
   */
  public async generateCompletion(
    prompt: string,
    model: string = this.defaultModel,
    options: AICompletionOptions = {}
  ): Promise<AIResponse> {
    try {
      const temperature = options.temperature ?? 0.7;
      // Ensure max_tokens doesn't exceed Anthropic's limits (4096 for Claude 3 Haiku, 200k for Opus)
      const requestedTokens = options.maxTokens ?? 500;
      // Set a reasonable default limit for each model type
      let maxTokens = requestedTokens;
      if (model.includes('opus')) {
        maxTokens = Math.min(requestedTokens, 4000); // Lower than limit for safety
      } else if (model.includes('sonnet')) {
        maxTokens = Math.min(requestedTokens, 4000); // Lower than limit for safety
      } else {
        maxTokens = Math.min(requestedTokens, 1500); // For haiku and other models
      }
      
      const systemPrompt = options.systemPrompt ?? 'You are a helpful AI assistant for a D&D game.';

      // Log debug information if enabled
      if (this.debug) {
        console.log(`[Anthropic Request] Model: ${model}, Prompt length: ${prompt.length}, Max tokens: ${maxTokens}`);
      }

      // Make the API request - using the newer Messages API
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model,
          messages: [
            { role: 'user', content: prompt }
          ],
          system: systemPrompt,
          temperature,
          max_tokens: maxTokens,
          ...options.providerOptions
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );

      // Extract the response text
      const text = response.data.content[0].text;

      // Anthropic doesn't provide token usage in the same way as OpenAI
      // So we provide an estimate based on string length
      const estimatedPromptTokens = Math.ceil(prompt.length / 4);
      const estimatedCompletionTokens = Math.ceil(text.length / 4);

      return {
        text,
        tokenUsage: options.includeTokenUsage ? {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: estimatedPromptTokens + estimatedCompletionTokens
        } : undefined,
        model,
        provider: 'anthropic'
      };
    } catch (error: any) {
      // Log the error and throw a more user-friendly error
      console.error('[Anthropic Error]', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to generate completion with Anthropic: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get the name of the provider
   * 
   * @returns The provider name
   */
  public getProviderName(): string {
    return 'anthropic';
  }
  
  /**
   * Get a list of available models for Anthropic
   * 
   * @returns Array of model names
   */
  public getAvailableModels(): string[] {
    return [...AnthropicProvider.AVAILABLE_MODELS];
  }
  
  /**
   * Get recommended models for different purposes
   * 
   * @returns Map of purpose to recommended model
   */
  public getRecommendedModels(): Record<string, string> {
    return {
      dm: 'claude-3-opus-20240229', // Best for game master responses
      narrative: 'claude-3-opus-20240229', // Best for storytelling
      npc: 'claude-3-sonnet-20240229', // Good for NPC dialogue
      combat: 'claude-3-haiku-20240307', // Fastest for combat descriptions
      lore: 'claude-3-opus-20240229', // Best for generating consistent world lore
      default: this.defaultModel
    };
  }
  
  /**
   * Update the default model
   * 
   * @param model The new default model
   */
  public updateDefaultModel(model: string): void {
    if (AnthropicProvider.AVAILABLE_MODELS.includes(model)) {
      this.defaultModel = model;
    } else {
      console.warn(`Model ${model} not in known list of Anthropic models. Setting anyway, but this may cause errors.`);
      this.defaultModel = model;
    }
  }
} 