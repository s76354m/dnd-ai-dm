/**
 * AI Interfaces
 * 
 * This file defines shared interfaces for the AI service layer.
 */

/**
 * AI Request Options
 */
export interface AIRequestOptions {
  /** Temperature controls randomness (0-1, higher = more random) */
  temperature?: number;
  
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  
  /** Whether to include token usage information */
  includeTokenUsage?: boolean;
  
  /** System prompt to guide the AI's behavior */
  systemPrompt?: string;
  
  /** Provider-specific options */
  providerOptions?: Record<string, any>;
  
  /** The specific model to use */
  model?: string;
}

/**
 * AI Response
 */
export interface AIResponse {
  /** The generated text */
  content: string;
  
  /** Token usage information if available */
  tokenUsage?: {
    /** Prompt tokens used */
    promptTokens: number;
    /** Completion tokens used */
    completionTokens: number;
    /** Total tokens used */
    totalTokens: number;
  };
  
  /** Raw provider response for debugging */
  rawResponse?: any;
  
  /** Finish reason if provided by the API */
  finishReason?: string;
} 