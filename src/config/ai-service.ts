/**
 * AI Service
 * 
 * This service handles communication with AI providers (OpenAI, Anthropic).
 * It uses the configuration from ai-config.ts to determine which provider and model to use.
 */

import { AIConfig, AIComponent, AIProvider, loadAIConfig, getModelForComponent } from './ai-config';
import axios from 'axios';

// Generic response from AI providers
export interface AIResponse {
  text: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  provider: AIProvider;
}

export class AIService {
  private config: AIConfig;

  constructor(customConfig?: Partial<AIConfig>) {
    // Load default config and merge with custom config if provided
    this.config = { ...loadAIConfig(), ...customConfig };
  }

  /**
   * Generate a completion using the configured AI provider
   * 
   * @param prompt The prompt to send to the AI
   * @param component The component requesting the completion (affects model selection)
   * @param options Additional options for the request
   * @returns The AI's response
   */
  public async generateCompletion(
    prompt: string,
    component: AIComponent = 'dm',
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<AIResponse> {
    // Get the model to use for this component
    const model = getModelForComponent(component, this.config);
    
    // Determine which provider to use and call the appropriate method
    if (this.config.provider === 'openai') {
      return this.callOpenAI(prompt, model, options);
    } else {
      return this.callAnthropic(prompt, model, options);
    }
  }

  /**
   * Make a request to the OpenAI API
   */
  private async callOpenAI(
    prompt: string,
    model: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse> {
    try {
      const temperature = options.temperature ?? this.config.temperature;
      const maxTokens = options.maxTokens ?? this.config.maxTokens;
      const systemPrompt = options.systemPrompt ?? 'You are a Dungeon Master for a D&D game.';

      // Log debug information if enabled
      if (this.config.debug) {
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
          max_tokens: maxTokens
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.openai.apiKey}`,
            ...(this.config.openai.organization ? { 'OpenAI-Organization': this.config.openai.organization } : {})
          }
        }
      );

      // Extract the response text and token usage
      const text = response.data.choices[0].message.content;
      const tokenUsage = response.data.usage;

      return {
        text,
        tokenUsage: {
          prompt: tokenUsage.prompt_tokens,
          completion: tokenUsage.completion_tokens,
          total: tokenUsage.total_tokens
        },
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
   * Make a request to the Anthropic API
   */
  private async callAnthropic(
    prompt: string,
    model: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse> {
    try {
      const temperature = options.temperature ?? this.config.temperature;
      // Ensure max_tokens doesn't exceed Anthropic's limits (8192 for Claude 3.5 Sonnet)
      const requestedTokens = options.maxTokens ?? this.config.maxTokens;
      // Limit to 8000 to provide some safety margin below the 8192 limit
      const maxTokens = Math.min(requestedTokens, 8000);
      
      const systemPrompt = options.systemPrompt ?? 'You are a Dungeon Master for a D&D game.';

      // Log debug information if enabled
      if (this.config.debug) {
        console.log(`[Anthropic Request] Model: ${model}, Prompt length: ${prompt.length}, Max tokens: ${maxTokens}`);
      }

      // Make the API request
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model,
          messages: [
            { role: 'user', content: prompt }
          ],
          system: systemPrompt,
          temperature,
          max_tokens: maxTokens
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.anthropic.apiKey,
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
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: estimatedPromptTokens + estimatedCompletionTokens
        },
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
   * Update the service configuration
   */
  public updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get the current configuration
   */
  public getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * Check if the current configuration is valid
   */
  public isConfigValid(): boolean {
    // Check for API key based on provider
    if (this.config.provider === 'openai') {
      return !!this.config.openai.apiKey;
    } else {
      return !!this.config.anthropic.apiKey;
    }
  }
} 