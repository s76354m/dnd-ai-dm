/**
 * Tests for AI Error Handler
 * 
 * Tests the AI error classification, retry logic, and fallback functionality
 */

import { 
  AIErrorHandler, 
  AIError, 
  AIErrorType, 
  AIErrorHandlerConfig 
} from '../../ai/ai-error-handler';

describe('AIErrorHandler', () => {
  let errorHandler: AIErrorHandler;
  
  beforeEach(() => {
    // Create a new error handler with test configuration
    errorHandler = new AIErrorHandler({
      maxRetries: 2,
      baseRetryDelayMs: 50, // Small delay for faster tests
      maxRetryDelayMs: 200,
      debug: false
    });
  });
  
  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('Network connection failed');
      networkError.name = 'NetworkError';
      
      const classifiedError = errorHandler.classifyError(networkError);
      
      expect(classifiedError.type).toBe(AIErrorType.NetworkError);
      expect(classifiedError.isRetryable).toBe(true);
    });
    
    it('should classify timeout errors correctly', () => {
      const timeoutError = new Error('Request timed out after 10s');
      timeoutError.name = 'TimeoutError';
      
      const classifiedError = errorHandler.classifyError(timeoutError);
      
      expect(classifiedError.type).toBe(AIErrorType.TimeoutError);
      expect(classifiedError.isRetryable).toBe(true);
    });
    
    it('should classify rate limit errors correctly', () => {
      const rateLimitError = {
        message: 'Too many requests, please slow down',
        response: {
          status: 429,
          headers: {
            'retry-after': '2'
          }
        }
      };
      
      const classifiedError = errorHandler.classifyError(rateLimitError);
      
      expect(classifiedError.type).toBe(AIErrorType.RateLimitError);
      expect(classifiedError.isRetryable).toBe(true);
      expect(classifiedError.suggestedRetryDelayMs).toBe(2000); // 2 seconds from header
    });
    
    it('should classify server errors correctly', () => {
      const serverError = {
        message: 'Internal server error',
        status: 500
      };
      
      const classifiedError = errorHandler.classifyError(serverError);
      
      expect(classifiedError.type).toBe(AIErrorType.ServerError);
      expect(classifiedError.isRetryable).toBe(true);
    });
    
    it('should classify authentication errors correctly', () => {
      const authError = {
        message: 'Invalid API key',
        status: 401
      };
      
      const classifiedError = errorHandler.classifyError(authError);
      
      expect(classifiedError.type).toBe(AIErrorType.AuthenticationError);
      expect(classifiedError.isRetryable).toBe(false);
    });
    
    it('should classify content filter errors correctly', () => {
      const contentFilterError = new Error('Content violates content policy');
      
      const classifiedError = errorHandler.classifyError(contentFilterError);
      
      expect(classifiedError.type).toBe(AIErrorType.ContentFilterError);
      expect(classifiedError.isRetryable).toBe(false);
    });
    
    it('should classify unknown errors as UnknownError', () => {
      const unknownError = new Error('Some unexpected error');
      
      const classifiedError = errorHandler.classifyError(unknownError);
      
      expect(classifiedError.type).toBe(AIErrorType.UnknownError);
    });
  });
  
  describe('Retry Delay Calculation', () => {
    it('should use suggested delay if available', () => {
      const error = new AIError({
        type: AIErrorType.RateLimitError,
        message: 'Rate limited',
        originalError: new Error('Rate limited'),
        isRetryable: true,
        suggestedRetryDelayMs: 5000
      });
      
      const delay = errorHandler.calculateRetryDelay(1, error);
      
      expect(delay).toBe(5000);
    });
    
    it('should apply exponential backoff', () => {
      const error = new AIError({
        type: AIErrorType.NetworkError,
        message: 'Network error',
        originalError: new Error('Network error'),
        isRetryable: true
      });
      
      // With base delay of 50ms:
      // Attempt 0: 50ms
      // Attempt 1: 100ms
      // Attempt 2: 200ms
      
      const delay0 = errorHandler.calculateRetryDelay(0, error);
      const delay1 = errorHandler.calculateRetryDelay(1, error);
      const delay2 = errorHandler.calculateRetryDelay(2, error);
      
      // Allow for some variation due to jitter
      expect(delay0).toBeGreaterThanOrEqual(25); // 50ms * 0.5 minimum with jitter
      expect(delay0).toBeLessThanOrEqual(50);    // 50ms maximum before jitter
      
      expect(delay1).toBeGreaterThanOrEqual(50); // 100ms * 0.5 minimum with jitter
      expect(delay1).toBeLessThanOrEqual(100);   // 100ms maximum before jitter
      
      expect(delay2).toBeGreaterThanOrEqual(100); // 200ms * 0.5 minimum with jitter
      expect(delay2).toBeLessThanOrEqual(200);    // 200ms maximum (capped at maxRetryDelayMs)
    });
    
    it('should respect maximum delay', () => {
      // Update handler to have a small max delay
      errorHandler.updateConfig({ maxRetryDelayMs: 75 });
      
      const error = new AIError({
        type: AIErrorType.NetworkError,
        message: 'Network error',
        originalError: new Error('Network error'),
        isRetryable: true
      });
      
      // With base delay of 50ms and max of 75ms:
      // Attempt 0: 50ms
      // Attempt 1: 75ms (capped)
      // Attempt 2: 75ms (capped)
      
      const delay0 = errorHandler.calculateRetryDelay(0, error);
      const delay1 = errorHandler.calculateRetryDelay(1, error);
      const delay2 = errorHandler.calculateRetryDelay(2, error);
      
      expect(delay0).toBeLessThanOrEqual(50); // Base delay
      expect(delay1).toBeLessThanOrEqual(75); // Capped at max
      expect(delay2).toBeLessThanOrEqual(75); // Capped at max
    });
  });
  
  describe('Retry Execution', () => {
    it('should retry retryable errors up to maxRetries', async () => {
      // Mock operation that fails with a retryable error twice, then succeeds
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error')) // First call fails
        .mockRejectedValueOnce(new Error('Network error')) // Second call fails
        .mockResolvedValueOnce('success');                 // Third call succeeds
      
      const result = await errorHandler.executeWithRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
    
    it('should not retry non-retryable errors', async () => {
      // Mock operation that fails with a non-retryable error
      const mockOperation = jest.fn()
        .mockRejectedValueOnce({
          message: 'Authentication failed',
          status: 401
        });
      
      await expect(errorHandler.executeWithRetry(mockOperation))
        .rejects
        .toHaveProperty('type', AIErrorType.AuthenticationError);
      
      expect(mockOperation).toHaveBeenCalledTimes(1); // No retries
    });
    
    it('should stop retrying after maxRetries', async () => {
      // Mock operation that always fails with a retryable error
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Network error'));
      
      await expect(errorHandler.executeWithRetry(mockOperation))
        .rejects
        .toHaveProperty('type', AIErrorType.NetworkError);
      
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
  
  describe('Fallback Execution', () => {
    it('should return operation result when successful', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const mockFallback = jest.fn().mockReturnValue('fallback');
      
      const result = await errorHandler.executeWithFallback(mockOperation, mockFallback);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockFallback).not.toHaveBeenCalled();
    });
    
    it('should use fallback when operation fails after retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      const mockFallback = jest.fn().mockReturnValue('fallback');
      
      const result = await errorHandler.executeWithFallback(mockOperation, mockFallback);
      
      expect(result).toBe('fallback');
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(mockFallback).toHaveBeenCalledTimes(1);
    });
    
    it('should use static fallback value when provided', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await errorHandler.executeWithFallback(mockOperation, 'static fallback');
      
      expect(result).toBe('static fallback');
    });
    
    it('should support async fallback functions', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      const mockFallback = jest.fn().mockResolvedValue('async fallback');
      
      const result = await errorHandler.executeWithFallback(mockOperation, mockFallback);
      
      expect(result).toBe('async fallback');
      expect(mockFallback).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Configuration', () => {
    it('should use default config when none provided', () => {
      const defaultHandler = new AIErrorHandler();
      const config = defaultHandler.getConfig();
      
      expect(config.maxRetries).toBe(3); // Default from DEFAULT_ERROR_HANDLER_CONFIG
      expect(config.baseRetryDelayMs).toBe(1000);
      expect(config.useExponentialBackoff).toBe(true);
    });
    
    it('should allow updating config', () => {
      errorHandler.updateConfig({
        maxRetries: 5,
        baseRetryDelayMs: 2000,
        debug: true
      });
      
      const config = errorHandler.getConfig();
      
      expect(config.maxRetries).toBe(5);
      expect(config.baseRetryDelayMs).toBe(2000);
      expect(config.debug).toBe(true);
    });
  });
}); 