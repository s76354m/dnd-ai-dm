/**
 * AI Service Wrapper
 * 
 * This file provides a high-level wrapper around the AI provider implementation,
 * integrating configuration, prompt templates, and token management.
 */

import { AIConfigManager } from './config/ai-config-manager';
import { PromptTemplateManager, PromptType, TemplateVariables } from './prompts/prompt-template-manager';
import { ProviderFactory } from './providers/provider-factory';
import { AIProvider } from './providers/ai-provider';
import { AIRequestOptions, AIResponse } from './interfaces/ai-interfaces';
import { AIErrorHandler, getAIErrorHandler, AIError, AIErrorType } from './ai-error-handler';

/**
 * Response type with token usage information
 */
export interface AIServiceResponse<T = string> {
  /** The response content */
  content: T;
  /** Token usage information if tracking is enabled */
  tokenUsage?: {
    /** Prompt tokens used */
    promptTokens: number;
    /** Completion tokens used */
    completionTokens: number;
    /** Total tokens used */
    totalTokens: number;
  };
}

/**
 * AI service wrapper configuration
 */
export interface AIServiceConfig {
  /** Debug mode */
  debug?: boolean;
  /** Whether to enable caching */
  enableCaching?: boolean;
  /** Cache time-to-live in milliseconds */
  cacheTTL?: number;
  /** Error handling configuration */
  errorHandling?: {
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Base delay between retries in milliseconds */
    baseRetryDelayMs?: number;
    /** Use exponential backoff for retries */
    useExponentialBackoff?: boolean;
  };
}

/**
 * High-level AI service wrapper
 */
export class AIService {
  private static instance: AIService;
  private provider: AIProvider | null = null;
  private configManager: AIConfigManager;
  private templateManager: PromptTemplateManager;
  private config: AIServiceConfig;
  private cache: Map<string, { response: string; timestamp: number }> = new Map();
  private errorHandler: AIErrorHandler;
  
  /**
   * Get the singleton instance
   */
  public static async getInstance(config?: AIServiceConfig): Promise<AIService> {
    if (!AIService.instance) {
      AIService.instance = new AIService(config);
      await AIService.instance.initialize();
    }
    return AIService.instance;
  }
  
  /**
   * Private constructor - use getInstance() instead
   */
  private constructor(config?: AIServiceConfig) {
    this.config = {
      debug: false,
      enableCaching: true,
      cacheTTL: 60 * 60 * 1000, // 1 hour
      errorHandling: {
        maxRetries: 2,
        baseRetryDelayMs: 1000,
        useExponentialBackoff: true
      },
      ...config
    };
    
    this.configManager = AIConfigManager.getInstance();
    this.templateManager = PromptTemplateManager.getInstance();
    
    // Initialize error handler with our config
    this.errorHandler = getAIErrorHandler({
      maxRetries: this.config.errorHandling?.maxRetries || 2,
      baseRetryDelayMs: this.config.errorHandling?.baseRetryDelayMs || 1000,
      useExponentialBackoff: this.config.errorHandling?.useExponentialBackoff !== false,
      debug: this.config.debug
    });
  }
  
  /**
   * Initialize the AI service
   */
  private async initialize(): Promise<void> {
    try {
      // Load configuration
      const providerConfig = await this.configManager.getProviderConfig();
      
      // Create provider
      this.provider = ProviderFactory.createProvider(providerConfig);
      
      if (this.config.debug) {
        console.log(`AI service initialized with provider: ${providerConfig.provider}`);
      }
    } catch (error) {
      console.error('Error initializing AI service:', error);
      throw new Error('Failed to initialize AI service. Check your configuration and API keys.');
    }
  }
  
  /**
   * Generate a response using a template
   * 
   * @param templateType The template type to use
   * @param variables Variables for the template
   * @param options Request options
   * @returns The AI response
   */
  public async generateFromTemplate(
    templateType: PromptType,
    variables: TemplateVariables = {},
    options: Partial<AIRequestOptions> = {}
  ): Promise<AIServiceResponse> {
    // Get the template
    const template = this.templateManager.getTemplate(templateType);
    if (!template) {
      throw new AIError({
        type: AIErrorType.InvalidInputError,
        message: `Template not found for type: ${templateType}`,
        originalError: new Error(`Template not found: ${templateType}`),
        isRetryable: false
      });
    }
    
    // Fill in the template
    const prompt = template.fill(variables);
    
    // Generate with the filled template
    return this.generate(prompt, options);
  }
  
  /**
   * Generate a response using a raw prompt
   * 
   * @param prompt The prompt text
   * @param options Request options
   * @returns The AI response
   */
  public async generate(
    prompt: string,
    options: Partial<AIRequestOptions> = {}
  ): Promise<AIServiceResponse> {
    // Initialize if needed
    if (!this.provider) {
      await this.initialize();
      
      if (!this.provider) {
        throw new AIError({
          type: AIErrorType.ServiceUnavailableError,
          message: 'AI provider not initialized',
          originalError: new Error('Provider initialization failed'),
          isRetryable: false
        });
      }
    }
    
    // Check cache if enabled
    if (this.config.enableCaching) {
      const cacheKey = this.getCacheKey(prompt, options);
      const cachedResponse = this.getFromCache(cacheKey);
      
      if (cachedResponse) {
        if (this.config.debug) {
          console.log('Using cached response for prompt');
        }
        
        return {
          content: cachedResponse,
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        };
      }
    }
    
    // Get generation settings from config
    const generationSettings = this.configManager.getGenerationSettings();
    const trackTokens = generationSettings.trackTokenUsage;
    
    // Prepare request options
    const requestOptions: AIRequestOptions = {
      temperature: generationSettings.temperature,
      maxTokens: generationSettings.maxTokens,
      model: options.model || this.configManager.getModelForComponent('dm'),
      ...options
    };
    
    // Use our error handler to execute with retry and proper error handling
    return this.errorHandler.executeWithFallback(
      async () => {
        if (this.config.debug) {
          console.log(`Generating AI response with ${this.provider!.getProviderName()} provider`);
          console.log(`Model: ${requestOptions.model}`);
          console.log(`Temperature: ${requestOptions.temperature}`);
          console.log(`Max tokens: ${requestOptions.maxTokens}`);
        }
        
        // Generate response
        const aiResponse: AIResponse = await this.provider!.generateText(prompt, requestOptions);
        
        // Cache response if enabled
        if (this.config.enableCaching) {
          const cacheKey = this.getCacheKey(prompt, options);
          this.addToCache(cacheKey, aiResponse.text);
        }
        
        // Prepare response with token usage if available
        const response: AIServiceResponse = {
          content: aiResponse.text
        };
        
        if (trackTokens && aiResponse.tokenUsage) {
          response.tokenUsage = aiResponse.tokenUsage;
        }
        
        return response;
      },
      // Fallback response in case of error
      () => {
        // Attempt to provide a meaningful fallback response
        return {
          content: "I'm having trouble generating a response right now. Please try again in a moment.",
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        };
      },
      { prompt, options: requestOptions }
    );
  }
  
  /**
   * Generate a response using a custom template
   * 
   * @param template The template text
   * @param variables Variables for the template
   * @param options Request options
   * @returns The AI response
   */
  public async generateFromCustomTemplate(
    template: string,
    variables: TemplateVariables = {},
    options: Partial<AIRequestOptions> = {}
  ): Promise<AIServiceResponse> {
    // Render the template
    const prompt = this.templateManager.createCustomTemplate(template, variables);
    
    // Generate response
    return this.generate(prompt, options);
  }
  
  /**
   * Change the AI provider
   * 
   * @param providerType The provider type to use
   * @returns Success status
   */
  public async changeProvider(providerType: string): Promise<boolean> {
    try {
      // Update config
      this.configManager.updateConfig({ provider: providerType as any });
      
      // Re-initialize provider
      await this.initialize();
      
      return !!this.provider;
    } catch (error) {
      console.error('Error changing provider:', error);
      return false;
    }
  }
  
  /**
   * Clear the response cache
   */
  public clearCache(): void {
    this.cache.clear();
    
    if (this.config.debug) {
      console.log('AI response cache cleared');
    }
  }
  
  /**
   * Get a key for caching
   * 
   * @param prompt The prompt text
   * @param options The request options
   * @returns Cache key
   */
  private getCacheKey(prompt: string, options: Partial<AIRequestOptions>): string {
    const relevantOptions = {
      model: options.model,
      temperature: options.temperature
    };
    
    return `${prompt}::${JSON.stringify(relevantOptions)}`;
  }
  
  /**
   * Get a response from cache
   * 
   * @param key Cache key
   * @returns Cached response or null if not found/expired
   */
  private getFromCache(key: string): string | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.config.cacheTTL!) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.response;
  }
  
  /**
   * Add a response to cache
   * 
   * @param key Cache key
   * @param response Response text
   */
  private addToCache(key: string, response: string): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 1000) {
      // Remove oldest entries
      const keys = Array.from(this.cache.keys());
      const oldestKeys = keys.slice(0, 100);
      
      for (const oldKey of oldestKeys) {
        this.cache.delete(oldKey);
      }
    }
  }
  
  /**
   * Get the current provider name
   * 
   * @returns Provider name
   */
  public getProviderName(): string {
    return this.provider ? this.provider.getProviderName() : 'none';
  }
  
  /**
   * Check if the service is initialized
   * 
   * @returns True if initialized
   */
  public isInitialized(): boolean {
    return !!this.provider;
  }
  
  /**
   * Set API key for a provider
   * 
   * @param provider Provider type
   * @param apiKey API key
   * @returns Success status
   */
  public async setApiKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      await this.configManager.setApiKey(provider as any, apiKey);
      return true;
    } catch (error) {
      console.error('Error setting API key:', error);
      return false;
    }
  }
  
  /**
   * Update AI configuration
   * 
   * @param config New configuration
   */
  public updateConfig(config: Partial<AIServiceConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      errorHandling: {
        ...this.config.errorHandling,
        ...config.errorHandling
      }
    };
    
    // Update error handler if needed
    if (config.errorHandling) {
      this.errorHandler.updateConfig({
        maxRetries: this.config.errorHandling.maxRetries,
        baseRetryDelayMs: this.config.errorHandling.baseRetryDelayMs,
        useExponentialBackoff: this.config.errorHandling.useExponentialBackoff,
        debug: this.config.debug
      });
    }
    
    if (config.debug !== undefined) {
      this.errorHandler.updateConfig({ debug: config.debug });
    }
  }
  
  /**
   * Get the error handler
   */
  public getErrorHandler(): AIErrorHandler {
    return this.errorHandler;
  }
} 