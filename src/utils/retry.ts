import { NetworkError } from '../errors';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  factor?: number;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable = error instanceof NetworkError && error.isRetryable();
      
      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay = baseDelay * Math.pow(factor, attempt - 1);
      
      // Use retry-after header if available
      if (error instanceof NetworkError && error.getRetryDelay) {
        delay = error.getRetryDelay() * 1000; // Convert to milliseconds
      }
      
      // Cap at maximum delay
      delay = Math.min(delay, maxDelay);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, error, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}