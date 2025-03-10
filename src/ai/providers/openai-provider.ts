/**
 * OpenAI Provider Implementation
 * 
 * This file implements the OpenAI provider for the AI service.
 * It handles making requests to the OpenAI API and processing responses.
 */

import axios from 'axios';
import { AIProvider, AICompletionOptions } from './ai-provider';
import { AIResponse } from '../../config/ai-service';

/**
 * OpenAI-specific configuration options
 */
export interface OpenAIConfig {
  /** API key for OpenAI */
  apiKey: string;
  
  /** Optional organization ID */
  organization?: string;
  
  /** Default model to use */
  defaultModel: string;
  
  /** Debug mode */
  debug?: boolean;
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider extends AIProvider {
  private organization?: string;
  private defaultModel: string;
  
  /**
   * Available models in OpenAI
   */
  private static readonly AVAILABLE_MODELS = [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
  ];
  
  /**
   * Creates a new OpenAI provider
   * 
   * @param config OpenAI configuration
   */
  constructor(config: OpenAIConfig) {
    super(config.apiKey, config.debug);
    this.organization = config.organization;
    this.defaultModel = config.defaultModel || 'gpt-3.5-turbo';
  }
  
  /**
   * Generate a completion using OpenAI
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
      const maxTokens = options.maxTokens ?? 500;
      const systemPrompt = options.systemPrompt ?? 'You are a helpful AI assistant for a D&D game.';

      // Log debug information if enabled
      if (this.debug) {
        console.log(`[OpenAI Request] Model: ${model}, Prompt length: ${prompt.length}`);
      }

      // Make the API request
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature,
          max_tokens: maxTokens,
          ...options.providerOptions
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            ...(this.organization ? { 'OpenAI-Organization': this.organization } : {})
          }
        }
      );

      // Extract the response text and token usage
      const text = response.data.choices[0].message.content;
      const tokenUsage = response.data.usage;

      return {
        text,
        tokenUsage: options.includeTokenUsage ? {
          prompt: tokenUsage.prompt_tokens,
          completion: tokenUsage.completion_tokens,
          total: tokenUsage.total_tokens
        } : undefined,
        model,
        provider: 'openai'
      };
    } catch (error: any) {
      // Log the error and throw a more user-friendly error
      console.error('[OpenAI Error]', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to generate completion with OpenAI: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get the name of the provider
   * 
   * @returns The provider name
   */
  public getProviderName(): string {
    return 'openai';
  }
  
  /**
   * Get a list of available models for OpenAI
   * 
   * @returns Array of model names
   */
  public getAvailableModels(): string[] {
    return [...OpenAIProvider.AVAILABLE_MODELS];
  }
  
  /**
   * Get recommended models for different purposes
   * 
   * @returns Map of purpose to recommended model
   */
  public getRecommendedModels(): Record<string, string> {
    return {
      dm: 'gpt-4o', // Best for game master responses
      narrative: 'gpt-4o', // Best for storytelling
      npc: 'gpt-3.5-turbo', // Good enough for NPC dialogue
      combat: 'gpt-3.5-turbo', // Good for combat descriptions
      lore: 'gpt-4', // Best for generating consistent world lore
      default: this.defaultModel
    };
  }
  
  /**
   * Update the organization ID
   * 
   * @param organization The new organization ID
   */
  public updateOrganization(organization?: string): void {
    this.organization = organization;
  }
  
  /**
   * Update the default model
   * 
   * @param model The new default model
   */
  public updateDefaultModel(model: string): void {
    if (OpenAIProvider.AVAILABLE_MODELS.includes(model)) {
      this.defaultModel = model;
    } else {
      console.warn(`Model ${model} not in known list of OpenAI models. Setting anyway, but this may cause errors.`);
      this.defaultModel = model;
    }
  }
} 