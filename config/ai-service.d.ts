/**
 * AI Service
 *
 * This service handles communication with AI providers (OpenAI, Anthropic).
 * It uses the configuration from ai-config.ts to determine which provider and model to use.
 */
import { AIConfig, AIComponent, AIProvider } from './ai-config';
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
export declare class AIService {
    private config;
    constructor(customConfig?: Partial<AIConfig>);
    /**
     * Generate a completion using the configured AI provider
     *
     * @param prompt The prompt to send to the AI
     * @param component The component requesting the completion (affects model selection)
     * @param options Additional options for the request
     * @returns The AI's response
     */
    generateCompletion(prompt: string, component?: AIComponent, options?: {
        temperature?: number;
        maxTokens?: number;
        systemPrompt?: string;
    }): Promise<AIResponse>;
    /**
     * Make a request to the OpenAI API
     */
    private callOpenAI;
    /**
     * Make a request to the Anthropic API
     */
    private callAnthropic;
    /**
     * Update the service configuration
     */
    updateConfig(newConfig: Partial<AIConfig>): void;
    /**
     * Get the current configuration
     */
    getConfig(): AIConfig;
    /**
     * Check if the current configuration is valid
     */
    isConfigValid(): boolean;
}
