/**
 * AI Provider Interface
 * 
 * This file defines the abstract base class for different AI provider implementations.
 * It allows the application to easily switch between different LLM providers
 * (OpenAI, Anthropic, etc.) while maintaining a consistent interface.
 */

import { AIResponse } from '../interfaces/ai-interfaces';

/**
 * Common options for AI completions that apply across different providers
 */
export interface AICompletionOptions {
  /** Temperature controls randomness (0-1, higher = more random) */
  temperature?: number;
  
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  
  /** System prompt to guide the AI's behavior */
  systemPrompt?: string;
  
  /** Whether to include token usage information when available */
  includeTokenUsage?: boolean;
  
  /** Custom provider-specific options */
  providerOptions?: Record<string, any>;
}

/**
 * Abstract base class for AI providers
 */
export abstract class AIProvider {
  protected apiKey: string;
  protected debug: boolean;
  
  /**
   * Creates a new AI provider instance
   * 
   * @param apiKey The API key for the provider
   * @param debug Whether to enable debug logging
   */
  constructor(apiKey: string, debug: boolean = false) {
    this.apiKey = apiKey;
    this.debug = debug;
  }
  
  /**
   * Generate a completion using the provider's API
   * 
   * @param prompt The prompt to send to the AI
   * @param model The specific model to use
   * @param options Additional options for the request
   * @returns The AI's response
   */
  public abstract generateCompletion(
    prompt: string,
    model: string,
    options?: AICompletionOptions
  ): Promise<AIResponse>;
  
  /**
   * Generate text using the provider's API (wrapper around generateCompletion)
   * 
   * @param prompt The prompt to send to the AI
   * @param options Additional options for the request
   * @returns The AI's response
   */
  public async generateText(
    prompt: string,
    options: AICompletionOptions = {}
  ): Promise<AIResponse> {
    const model = options.providerOptions?.model || this.getRecommendedModels().general;
    return this.generateCompletion(prompt, model, options);
  }
  
  /**
   * Validate that the provider is properly configured
   * 
   * @returns True if the provider is properly configured
   */
  public isValid(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }
  
  /**
   * Update the API key
   * 
   * @param apiKey The new API key
   */
  public updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
  
  /**
   * Set debug mode
   * 
   * @param debug Whether to enable debug logging
   */
  public setDebug(debug: boolean): void {
    this.debug = debug;
  }
  
  /**
   * Get the name of the provider
   * 
   * @returns The provider name
   */
  public abstract getProviderName(): string;
  
  /**
   * Get a list of available models for this provider
   * 
   * @returns Array of model names
   */
  public abstract getAvailableModels(): string[];
  
  /**
   * Get recommended models for different purposes
   * 
   * @returns Map of purpose to recommended model
   */
  public abstract getRecommendedModels(): Record<string, string>;
} 