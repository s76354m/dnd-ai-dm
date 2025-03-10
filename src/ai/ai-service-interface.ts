/**
 * AI Service Interface
 * 
 * This interface defines the minimal contract for AI services in the D&D AI DM system.
 * It allows for different implementations (like mock services for testing, or
 * real LLM-powered services for production) to be used interchangeably.
 */

export interface AIServiceInterface {
  /**
   * Generate text based on a prompt
   * 
   * @param prompt The prompt to send to the AI
   * @param options Optional configuration for the generation
   * @returns A Promise that resolves to the generated text
   */
  generate(prompt: string, options?: any): Promise<string>;
}

/**
 * Options for AI text generation
 */
export interface AIGenerationOptions {
  /**
   * The temperature to use for generation (0.0 to 1.0)
   * Higher values make output more random, lower values more deterministic
   */
  temperature?: number;
  
  /**
   * The maximum number of tokens to generate
   */
  maxTokens?: number;
  
  /**
   * System message/prompt to set the behavior of the AI
   */
  systemPrompt?: string;
  
  /**
   * Stop sequences that will end generation early
   */
  stopSequences?: string[];
  
  /**
   * Whether to include the prompt in the response
   */
  includePrompt?: boolean;
  
  /**
   * Generation mode or style ('creative', 'precise', etc.)
   */
  mode?: string;
} 