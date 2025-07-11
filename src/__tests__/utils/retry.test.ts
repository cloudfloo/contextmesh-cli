import { withRetry } from '../../utils/retry';
import { NetworkError } from '../../errors/network';

describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    
    const result = await withRetry(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable network error', async () => {
    const networkError = new NetworkError('Temporary failure', { retryable: true });
    const fn = jest.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');
    
    const promise = withRetry(fn);
    
    // First attempt fails
    await jest.runAllTimersAsync();
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable error', async () => {
    const error = new NetworkError('Permanent failure', { retryable: false });
    const fn = jest.fn().mockRejectedValue(error);
    
    await expect(withRetry(fn)).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not retry on non-NetworkError', async () => {
    const error = new Error('Generic error');
    const fn = jest.fn().mockRejectedValue(error);
    
    await expect(withRetry(fn)).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect maxAttempts', async () => {
    const error = new NetworkError('Always fails', { retryable: true });
    const fn = jest.fn().mockRejectedValue(error);
    
    const promise = withRetry(fn, { maxAttempts: 3 });
    
    // Let all timers complete
    await jest.runAllTimersAsync();
    
    await expect(promise).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff', async () => {
    const error = new NetworkError('Retry me', { retryable: true });
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    
    const onRetry = jest.fn();
    
    const promise = withRetry(fn, {
      baseDelay: 1000,
      factor: 2,
      onRetry
    });
    
    // Process retries
    await jest.runAllTimersAsync();
    
    await promise;
    
    // Check delays: 1000ms for first retry, 2000ms for second retry
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, error, 1000);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, error, 2000);
  });

  it('should respect maxDelay', async () => {
    const error = new NetworkError('Retry me', { retryable: true });
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    
    const onRetry = jest.fn();
    
    const promise = withRetry(fn, {
      baseDelay: 10000,
      maxDelay: 5000,
      factor: 10,
      onRetry
    });
    
    await jest.runAllTimersAsync();
    await promise;
    
    // Both retries should be capped at maxDelay
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, error, 5000);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, error, 5000);
  });

  it('should use retry-after header from NetworkError', async () => {
    const error = new NetworkError('Rate limited', { 
      retryable: true,
      retryAfter: 10 // 10 seconds
    });
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    
    const onRetry = jest.fn();
    
    const promise = withRetry(fn, { onRetry });
    
    await jest.runAllTimersAsync();
    await promise;
    
    // Should use 10000ms (10 seconds * 1000)
    expect(onRetry).toHaveBeenCalledWith(1, error, 10000);
  });

  it('should call onRetry callback', async () => {
    const error = new NetworkError('Retry me', { retryable: true });
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    
    const onRetry = jest.fn();
    
    const promise = withRetry(fn, { onRetry });
    
    await jest.runAllTimersAsync();
    await promise;
    
    expect(onRetry).toHaveBeenCalledWith(1, error, 1000);
  });

  it('should eventually succeed after multiple retries', async () => {
    const error = new NetworkError('Flaky service', { retryable: true });
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('finally!');
    
    const promise = withRetry(fn, { maxAttempts: 3 });
    
    await jest.runAllTimersAsync();
    
    const result = await promise;
    expect(result).toBe('finally!');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use custom options', async () => {
    const error = new NetworkError('Custom retry', { retryable: true });
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    
    const onRetry = jest.fn();
    
    const promise = withRetry(fn, {
      maxAttempts: 5,
      baseDelay: 500,
      factor: 3,
      onRetry
    });
    
    await jest.runAllTimersAsync();
    await promise;
    
    expect(onRetry).toHaveBeenCalledWith(1, error, 500);
  });
});