"use strict";
/**
 * Configuration Module
 *
 * This module exports configuration components for the application,
 * particularly focusing on AI services configuration and implementation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = exports.converters = exports.AIService = exports.validateAIConfig = exports.getModelForComponent = exports.loadAIConfig = exports.defaultAIConfig = void 0;
exports.getEnv = getEnv;
// Export AI configuration types and functions
var ai_config_1 = require("./ai-config");
Object.defineProperty(exports, "defaultAIConfig", { enumerable: true, get: function () { return ai_config_1.defaultAIConfig; } });
Object.defineProperty(exports, "loadAIConfig", { enumerable: true, get: function () { return ai_config_1.loadAIConfig; } });
Object.defineProperty(exports, "getModelForComponent", { enumerable: true, get: function () { return ai_config_1.getModelForComponent; } });
Object.defineProperty(exports, "validateAIConfig", { enumerable: true, get: function () { return ai_config_1.validateAIConfig; } });
// Export AI service
var ai_service_1 = require("./ai-service");
Object.defineProperty(exports, "AIService", { enumerable: true, get: function () { return ai_service_1.AIService; } });
/**
 * Environment configuration helper
 * Safely gets environment variables with type conversion and defaults
 */
function getEnv(key, defaultValue, converter) {
    const value = process.env[key];
    if (value === undefined) {
        return defaultValue;
    }
    if (converter) {
        try {
            return converter(value);
        }
        catch (e) {
            console.warn(`Failed to convert environment variable ${key}: ${e.message}`);
            return defaultValue;
        }
    }
    return value;
}
// Helper converters for environment variables
exports.converters = {
    toBoolean: (value) => {
        return value.toLowerCase() === 'true' || value === '1';
    },
    toNumber: (value) => {
        const num = Number(value);
        if (isNaN(num)) {
            throw new Error(`Cannot convert "${value}" to a number`);
        }
        return num;
    },
    toJson: (value) => {
        return JSON.parse(value);
    }
};
/**
 * Application configuration defaults
 */
exports.appConfig = {
    // Port for server mode (if implemented)
    port: getEnv('PORT', 3000, exports.converters.toNumber),
    // Log level
    logLevel: getEnv('LOG_LEVEL', 'info'),
    // Default API settings
    useCache: getEnv('USE_CACHE', true, exports.converters.toBoolean),
    cacheExpiry: getEnv('CACHE_EXPIRY', 3600, exports.converters.toNumber), // seconds
    // DM settings
    storyComplexity: getEnv('STORY_COMPLEXITY', 'medium'),
    aiCreativity: getEnv('AI_CREATIVITY', 0.7, exports.converters.toNumber),
    // Development mode
    isDev: process.env.NODE_ENV !== 'production'
};
//# sourceMappingURL=index.js.map