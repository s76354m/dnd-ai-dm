"use strict";
/**
 * AI Configuration
 *
 * This file manages the configuration for AI services and models used in the application.
 * It allows for selection between different AI providers (OpenAI, Anthropic) and
 * configuring specific models for different components of the application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultAIConfig = void 0;
exports.loadAIConfig = loadAIConfig;
exports.getModelForComponent = getModelForComponent;
exports.validateAIConfig = validateAIConfig;
/**
 * Default configuration for AI services
 * This can be overridden by environment variables or user settings
 */
exports.defaultAIConfig = {
    // Default provider
    provider: 'openai',
    // OpenAI configuration
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        organization: process.env.OPENAI_ORGANIZATION || '',
        models: {
            dm: 'gpt-4-turbo-preview',
            story: 'gpt-4-turbo-preview',
            npc: 'gpt-3.5-turbo',
            combat: 'gpt-3.5-turbo',
            quest: 'gpt-4-turbo-preview'
        },
        defaultModel: 'gpt-3.5-turbo'
    },
    // Anthropic configuration
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        models: {
            dm: 'claude-3-opus-20240229',
            story: 'claude-3-opus-20240229',
            npc: 'claude-3-haiku-20240307',
            combat: 'claude-3-haiku-20240307',
            quest: 'claude-3-sonnet-20240229'
        },
        defaultModel: 'claude-3-sonnet-20240229'
    },
    // Common AI parameters
    temperature: 0.7,
    maxTokens: 1024,
    debug: process.env.NODE_ENV === 'development'
};
/**
 * Load AI configuration from environment variables and defaults
 */
function loadAIConfig() {
    const config = { ...exports.defaultAIConfig };
    // Override provider if specified
    if (process.env.AI_PROVIDER &&
        (process.env.AI_PROVIDER === 'openai' || process.env.AI_PROVIDER === 'anthropic')) {
        config.provider = process.env.AI_PROVIDER;
    }
    // Override API keys if provided
    if (process.env.OPENAI_API_KEY) {
        config.openai.apiKey = process.env.OPENAI_API_KEY;
    }
    if (process.env.ANTHROPIC_API_KEY) {
        config.anthropic.apiKey = process.env.ANTHROPIC_API_KEY;
    }
    // Override temperature if specified
    if (process.env.AI_TEMPERATURE) {
        const temp = parseFloat(process.env.AI_TEMPERATURE);
        if (!isNaN(temp) && temp >= 0 && temp <= 2) {
            config.temperature = temp;
        }
    }
    // Override max tokens if specified
    if (process.env.AI_MAX_TOKENS) {
        const tokens = parseInt(process.env.AI_MAX_TOKENS, 10);
        if (!isNaN(tokens) && tokens > 0) {
            config.maxTokens = tokens;
        }
    }
    // Override debug mode
    if (process.env.AI_DEBUG === 'true') {
        config.debug = true;
    }
    else if (process.env.AI_DEBUG === 'false') {
        config.debug = false;
    }
    return config;
}
/**
 * Get the appropriate model for a specific component
 *
 * @param component The AI component to get a model for
 * @param config Optional custom configuration
 * @returns The model name to use
 */
function getModelForComponent(component, config = loadAIConfig()) {
    const providerConfig = config.provider === 'openai'
        ? config.openai
        : config.anthropic;
    return providerConfig.models[component] || providerConfig.defaultModel;
}
/**
 * Validate the AI configuration
 *
 * @param config The configuration to validate
 * @returns An object with validation results
 */
function validateAIConfig(config) {
    const errors = [];
    // Check if API key is provided for the selected provider
    if (config.provider === 'openai' && !config.openai.apiKey) {
        errors.push('OpenAI API key is required when using OpenAI as the provider');
    }
    if (config.provider === 'anthropic' && !config.anthropic.apiKey) {
        errors.push('Anthropic API key is required when using Anthropic as the provider');
    }
    // Check temperature range
    if (config.temperature < 0 || config.temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
    }
    // Check max tokens
    if (config.maxTokens <= 0) {
        errors.push('Max tokens must be greater than 0');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
//# sourceMappingURL=ai-config.js.map