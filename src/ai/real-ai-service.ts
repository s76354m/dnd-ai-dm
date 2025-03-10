/**
 * Real AI Service Implementation
 * 
 * This service implements the AIServiceInterface by wrapping the base AIService
 * from the project, providing a proper implementation that can be used in examples
 * and production code.
 */

import { AIServiceInterface, AIGenerationOptions } from './ai-service-interface';
import { AIService } from '../dm/ai-service';
import { appConfig } from '../config';

/**
 * Implementation of AIServiceInterface that uses the real AIService
 */
export class RealAIService implements AIServiceInterface {
  private aiService: AIService;
  
  /**
   * Create a new RealAIService
   */
  constructor() {
    this.aiService = new AIService();
    console.log(`RealAIService initialized with provider: ${appConfig.aiProvider}`);
    console.log(`Using model: ${appConfig.aiProvider === 'anthropic' ? appConfig.anthropicNpcModel : appConfig.openaiNpcModel}`);
  }
  
  /**
   * Generate text using the real AI service
   * 
   * @param prompt The prompt to send to the AI
   * @param options Optional configuration for the generation
   * @returns A Promise that resolves to the generated text
   */
  async generate(prompt: string, options?: AIGenerationOptions): Promise<string> {
    try {
      // Create a system prompt for NPC dialogue if not provided
      const systemPrompt = options?.systemPrompt || 
        'You are an NPC in a D&D world. Respond in character based on your personality, knowledge, and the current situation.';
      
      // Use the base service to generate the response
      const response = await this.aiService.generateCompletion(
        prompt,
        'npc', // Use the NPC model/context
        {
          systemPrompt,
          temperature: options?.temperature || appConfig.aiCreativity || 0.7,
          maxTokens: options?.maxTokens || 150
        }
      );
      
      return response.text;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'I need a moment to collect my thoughts... (AI service error)';
    }
  }
} 