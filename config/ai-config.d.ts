/**
 * AI Configuration
 *
 * This file manages the configuration for AI services and models used in the application.
 * It allows for selection between different AI providers (OpenAI, Anthropic) and
 * configuring specific models for different components of the application.
 */
export type AIProvider = 'openai' | 'anthropic';
export type AIComponent = 'dm' | 'story' | 'npc' | 'combat' | 'quest';
export interface OpenAIConfig {
    apiKey: string;
    organization?: string;
    models: {
        [key in AIComponent]?: string;
    };
    defaultModel: string;
}
export interface AnthropicConfig {
    apiKey: string;
    models: {
        [key in AIComponent]?: string;
    };
    defaultModel: string;
}
export interface AIConfig {
    provider: AIProvider;
    openai: OpenAIConfig;
    anthropic: AnthropicConfig;
    temperature: number;
    maxTokens: number;
    debug: boolean;
}
/**
 * Default configuration for AI services
 * This can be overridden by environment variables or user settings
 */
export declare const defaultAIConfig: AIConfig;
/**
 * Load AI configuration from environment variables and defaults
 */
export declare function loadAIConfig(): AIConfig;
/**
 * Get the appropriate model for a specific component
 *
 * @param component The AI component to get a model for
 * @param config Optional custom configuration
 * @returns The model name to use
 */
export declare function getModelForComponent(component: AIComponent, config?: AIConfig): string;
/**
 * Validate the AI configuration
 *
 * @param config The configuration to validate
 * @returns An object with validation results
 */
export declare function validateAIConfig(config: AIConfig): {
    isValid: boolean;
    errors: string[];
};
