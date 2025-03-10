/**
 * Configuration Module
 *
 * This module exports configuration components for the application,
 * particularly focusing on AI services configuration and implementation.
 */
export { AIProvider, AIComponent, AIConfig, OpenAIConfig, AnthropicConfig, defaultAIConfig, loadAIConfig, getModelForComponent, validateAIConfig } from './ai-config';
export { AIService, AIResponse } from './ai-service';
/**
 * Environment configuration helper
 * Safely gets environment variables with type conversion and defaults
 */
export declare function getEnv<T>(key: string, defaultValue: T, converter?: (val: string) => T): T;
export declare const converters: {
    toBoolean: (value: string) => boolean;
    toNumber: (value: string) => number;
    toJson: <T>(value: string) => T;
};
/**
 * Application configuration defaults
 */
export declare const appConfig: {
    port: number;
    logLevel: string;
    useCache: boolean;
    cacheExpiry: number;
    storyComplexity: string;
    aiCreativity: number;
    isDev: boolean;
};
