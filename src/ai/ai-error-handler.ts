/**
 * AI Error Handler
 * 
 * Provides utilities for handling AI service errors, implementing retry logic,
 * and providing fallback responses when needed.
 */

/**
 * Configuration for AI error handling and retry logic
 */
export interface AIErrorHandlerConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  
  /** Base delay between retries in milliseconds */
  baseRetryDelayMs: number;
  
  /** Maximum delay between retries in milliseconds */
  maxRetryDelayMs: number;
  
  /** Whether to use exponential backoff */
  useExponentialBackoff: boolean;
  
  /** Whether to add jitter to retry timing */
  useJitter: boolean;
  
  /** Debug mode */
  debug: boolean;
  
  /** Error types that should trigger a retry attempt */
  retryableErrorTypes: string[];
  
  /** Error types that should be considered network-related */
  networkErrorTypes: string[];
  
  /** Error messages that indicate rate limiting */
  rateLimitErrorPatterns: string[];
}

/**
 * Default configuration for AI error handling
 */
export const DEFAULT_ERROR_HANDLER_CONFIG: AIErrorHandlerConfig = {
  maxRetries: 3,
  baseRetryDelayMs: 1000,
  maxRetryDelayMs: 15000,
  useExponentialBackoff: true,
  useJitter: true,
  debug: false,
  retryableErrorTypes: [
    'NetworkError', 
    'TimeoutError', 
    'RateLimitError', 
    'ServerError',
    'TemporaryError'
  ],
  networkErrorTypes: [
    'NetworkError',
    'FetchError',
    'ConnectionError',
    'TimeoutError'
  ],
  rateLimitErrorPatterns: [
    'rate limit',
    'rate_limit',
    'too many requests',
    'too_many_requests',
    'throttle',
    'quota exceeded'
  ]
};

/**
 * Error types specific to AI service operations
 */
export enum AIErrorType {
  NetworkError = 'NetworkError',
  TimeoutError = 'TimeoutError',
  RateLimitError = 'RateLimitError',
  ServerError = 'ServerError',
  AuthenticationError = 'AuthenticationError',
  InvalidInputError = 'InvalidInputError',
  ContentFilterError = 'ContentFilterError',
  ServiceUnavailableError = 'ServiceUnavailableError',
  TemporaryError = 'TemporaryError',
  UnknownError = 'UnknownError'
}

/**
 * Error information with enhanced details
 */
export interface AIErrorInfo {
  /** Type of error */
  type: AIErrorType;
  
  /** Original error message */
  message: string;
  
  /** Original error object */
  originalError: any;
  
  /** Status code if from HTTP response */
  statusCode?: number;
  
  /** Whether this type of error is retryable */
  isRetryable: boolean;
  
  /** Suggested delay before next retry in milliseconds */
  suggestedRetryDelayMs?: number;
  
  /** Additional error context */
  context?: Record<string, any>;
}

/**
 * AI Error class for handling AI service errors with enhanced information
 */
export class AIError extends Error {
  type: AIErrorType;
  originalError: any;
  statusCode?: number;
  isRetryable: boolean;
  suggestedRetryDelayMs?: number;
  context?: Record<string, any>;
  
  constructor(info: AIErrorInfo) {
    super(info.message);
    this.type = info.type;
    this.originalError = info.originalError;
    this.statusCode = info.statusCode;
    this.isRetryable = info.isRetryable;
    this.suggestedRetryDelayMs = info.suggestedRetryDelayMs;
    this.context = info.context;
    this.name = `AIError[${info.type}]`;
    
    // Ensure prototype chain works correctly
    Object.setPrototypeOf(this, AIError.prototype);
  }
}

/**
 * AI Error Handler for classifying and handling AI service errors
 */
export class AIErrorHandler {
  private config: AIErrorHandlerConfig;
  
  constructor(config: Partial<AIErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_HANDLER_CONFIG, ...config };
  }
  
  /**
   * Classify an error into a specific AIErrorType and create an AIError
   */
  public classifyError(error: any, context: Record<string, any> = {}): AIError {
    let type = AIErrorType.UnknownError;
    let message = error?.message || 'Unknown error';
    let statusCode: number | undefined;
    let isRetryable = false;
    
    // Extract status code if available
    if (error?.status || error?.statusCode) {
      statusCode = error.status || error.statusCode;
    } else if (error?.response?.status) {
      statusCode = error.response.status;
    }
    
    // Check if error is a network error
    if (this.isNetworkError(error)) {
      type = AIErrorType.NetworkError;
      isRetryable = true;
    }
    // Check if error is a timeout
    else if (this.isTimeoutError(error)) {
      type = AIErrorType.TimeoutError;
      isRetryable = true;
    }
    // Check if error is rate limiting
    else if (this.isRateLimitError(error)) {
      type = AIErrorType.RateLimitError;
      isRetryable = true;
      
      // Calculate suggested delay from headers if available
      if (error?.response?.headers) {
        const retryAfter = error.response.headers['retry-after'];
        if (retryAfter) {
          const retrySeconds = parseInt(retryAfter, 10);
          if (!isNaN(retrySeconds)) {
            context.suggestedRetryDelayMs = retrySeconds * 1000;
          }
        }
      }
    }
    // Server errors (5xx)
    else if (statusCode && statusCode >= 500) {
      type = AIErrorType.ServerError;
      isRetryable = true;
    }
    // Authentication errors (401, 403)
    else if (statusCode === 401 || statusCode === 403) {
      type = AIErrorType.AuthenticationError;
      isRetryable = false;
    }
    // Invalid input (400)
    else if (statusCode === 400) {
      type = AIErrorType.InvalidInputError;
      isRetryable = false;
    }
    // Content filter triggered
    else if (message.toLowerCase().includes('content filter') || 
             message.toLowerCase().includes('content policy') ||
             message.toLowerCase().includes('moderation')) {
      type = AIErrorType.ContentFilterError;
      isRetryable = false;
    }
    // Service unavailable
    else if (statusCode === 503 || 
             message.toLowerCase().includes('unavailable') ||
             message.toLowerCase().includes('down for maintenance')) {
      type = AIErrorType.ServiceUnavailableError;
      isRetryable = true;
    }
    
    return new AIError({
      type,
      message,
      originalError: error,
      statusCode,
      isRetryable,
      suggestedRetryDelayMs: context.suggestedRetryDelayMs,
      context
    });
  }
  
  /**
   * Helper method to check if an error is a network error
   */
  private isNetworkError(error: any): boolean {
    // Check error type/name
    if (error?.name && this.config.networkErrorTypes.includes(error.name)) {
      return true;
    }
    
    // Check error message
    const message = error?.message?.toLowerCase() || '';
    return message.includes('network') ||
           message.includes('connection') ||
           message.includes('internet') ||
           message.includes('offline') ||
           message.includes('unreachable') ||
           message.includes('fetch failed') ||
           message.includes('socket');
  }
  
  /**
   * Helper method to check if an error is a timeout error
   */
  private isTimeoutError(error: any): boolean {
    // Check error name
    if (error?.name === 'TimeoutError') {
      return true;
    }
    
    // Check error message
    const message = error?.message?.toLowerCase() || '';
    return message.includes('timeout') ||
           message.includes('timed out') ||
           message.includes('deadline exceeded');
  }
  
  /**
   * Helper method to check if an error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    // Check status code
    if (error?.status === 429 || error?.statusCode === 429 || 
        error?.response?.status === 429) {
      return true;
    }
    
    // Check error message against patterns
    const message = error?.message?.toLowerCase() || '';
    return this.config.rateLimitErrorPatterns.some(pattern => 
      message.includes(pattern.toLowerCase())
    );
  }
  
  /**
   * Calculate a retry delay with exponential backoff and jitter
   */
  public calculateRetryDelay(attempt: number, error: AIError): number {
    // Use suggested delay if available
    if (error.suggestedRetryDelayMs) {
      return error.suggestedRetryDelayMs;
    }
    
    let delay = this.config.baseRetryDelayMs;
    
    // Apply exponential backoff if enabled
    if (this.config.useExponentialBackoff) {
      delay = this.config.baseRetryDelayMs * Math.pow(2, attempt);
    }
    
    // Apply jitter if enabled
    if (this.config.useJitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    // Ensure delay doesn't exceed maximum
    return Math.min(delay, this.config.maxRetryDelayMs);
  }
  
  /**
   * Execute an operation with automatic retries for transient errors
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    let lastError: AIError | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        // Classify the error
        const aiError = this.classifyError(error, context);
        lastError = aiError;
        
        // Log the error if debug is enabled
        if (this.config.debug) {
          console.warn(
            `AI operation failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}):`,
            {
              type: aiError.type,
              message: aiError.message,
              statusCode: aiError.statusCode,
              isRetryable: aiError.isRetryable
            }
          );
        }
        
        // Don't retry if this is the last attempt or the error is not retryable
        if (attempt >= this.config.maxRetries || !aiError.isRetryable) {
          break;
        }
        
        // Calculate delay for the next retry
        const delay = this.calculateRetryDelay(attempt, aiError);
        
        if (this.config.debug) {
          console.log(`Retrying in ${Math.round(delay / 1000)} seconds...`);
        }
        
        // Wait before the next retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we reach here, all retries failed
    if (lastError) {
      throw lastError;
    } else {
      // This should never happen, but just in case
      throw new AIError({
        type: AIErrorType.UnknownError,
        message: 'Operation failed after all retry attempts',
        originalError: new Error('Unknown error'),
        isRetryable: false
      });
    }
  }
  
  /**
   * Execute an operation with a fallback response for handling errors gracefully
   */
  public async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: T | (() => T | Promise<T>),
    context: Record<string, any> = {}
  ): Promise<T> {
    try {
      return await this.executeWithRetry(operation, context);
    } catch (error: any) {
      // Log detailed error info in debug mode
      if (this.config.debug) {
        console.error('AI operation failed with all retries, using fallback:', error);
      } else {
        console.error('AI operation failed, using fallback:', error.message);
      }
      
      // Use fallback response
      if (typeof fallback === 'function') {
        return await Promise.resolve(fallback());
      } else {
        return fallback;
      }
    }
  }
  
  /**
   * Get the current configuration
   */
  public getConfig(): AIErrorHandlerConfig {
    return { ...this.config };
  }
  
  /**
   * Update the error handler configuration
   */
  public updateConfig(config: Partial<AIErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Singleton instance for global use
 */
let instance: AIErrorHandler | null = null;

/**
 * Get the singleton instance of AIErrorHandler
 */
export function getAIErrorHandler(config?: Partial<AIErrorHandlerConfig>): AIErrorHandler {
  if (!instance) {
    instance = new AIErrorHandler(config);
  } else if (config) {
    instance.updateConfig(config);
  }
  
  return instance;
} 