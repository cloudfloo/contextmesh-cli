import { NetworkError } from '../../errors/network';
import { AxiosError, AxiosHeaders } from 'axios';

describe('NetworkError', () => {
  describe('constructor', () => {
    it('should create network error', () => {
      const error = new NetworkError('Network failed');
      
      expect(error.message).toBe('Network failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
    });

    it('should include network details', () => {
      const error = new NetworkError('Request failed', {
        statusCode: 404,
        endpoint: 'https://api.example.com/test',
        method: 'POST',
        retryable: true,
        retryAfter: 30
      });
      
      expect(error.details.statusCode).toBe(404);
      expect(error.details.endpoint).toBe('https://api.example.com/test');
      expect(error.details.method).toBe('POST');
      expect(error.details.retryable).toBe(true);
      expect(error.details.retryAfter).toBe(30);
    });
  });

  describe('fromAxiosError', () => {
    const createAxiosError = (status?: number, data?: any, code?: string, headers?: any): AxiosError => {
      const error = new Error('Request failed') as AxiosError;
      error.isAxiosError = true;
      error.code = code;
      error.config = {
        url: 'https://api.contextmesh.io/v1/connectors',
        method: 'post',
        headers: new AxiosHeaders()
      };
      
      if (status) {
        error.response = {
          status,
          statusText: 'Error',
          headers: headers || {},
          config: error.config,
          data
        };
      }
      
      return error;
    };

    it('should handle 400 Bad Request', () => {
      const axiosError = createAxiosError(400, { detail: 'Invalid manifest' });
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Bad request');
      expect(error.message).toContain('Invalid manifest');
      expect(error.details.statusCode).toBe(400);
      expect(error.details.suggestion).toContain('Check your manifest format');
    });

    it('should handle 401 Unauthorized', () => {
      const axiosError = createAxiosError(401);
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Authentication failed');
      expect(error.details.statusCode).toBe(401);
      expect(error.details.suggestion).toContain('CONTEXTMESH_TOKEN');
    });

    it('should handle 403 Forbidden', () => {
      const axiosError = createAxiosError(403);
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Permission denied');
      expect(error.details.statusCode).toBe(403);
      expect(error.details.suggestion).toContain('necessary permissions');
    });

    it('should handle 404 Not Found', () => {
      const axiosError = createAxiosError(404);
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Resource not found');
      expect(error.details.statusCode).toBe(404);
      expect(error.details.suggestion).toContain('registry URL');
    });

    it('should handle 409 Conflict', () => {
      const axiosError = createAxiosError(409);
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Conflict');
      expect(error.details.statusCode).toBe(409);
      expect(error.details.suggestion).toContain('version');
    });

    it('should handle 413 Payload Too Large', () => {
      const axiosError = createAxiosError(413);
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Payload too large');
      expect(error.details.statusCode).toBe(413);
      expect(error.details.suggestion).toContain('Reduce the size');
    });

    it('should handle 422 Unprocessable Entity', () => {
      const axiosError = createAxiosError(422, { detail: 'Validation error' });
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Validation error');
      expect(error.details.statusCode).toBe(422);
    });

    it('should handle 429 Rate Limit', () => {
      const axiosError = createAxiosError(429, null, undefined, { 'retry-after': '120' });
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Rate limit exceeded');
      expect(error.details.statusCode).toBe(429);
      expect(error.details.retryable).toBe(true);
      expect(error.details.retryAfter).toBe(120);
    });

    it('should handle 5xx server errors', () => {
      const axiosError = createAxiosError(503);
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Server error');
      expect(error.details.statusCode).toBe(503);
      expect(error.details.retryable).toBe(true);
      expect(error.details.suggestion).toContain('Try again');
    });

    it('should handle ECONNREFUSED', () => {
      const axiosError = createAxiosError(undefined, undefined, 'ECONNREFUSED');
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Connection refused');
      expect(error.details.retryable).toBe(true);
    });

    it('should handle ENOTFOUND', () => {
      const axiosError = createAxiosError(undefined, undefined, 'ENOTFOUND');
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Server not found');
      expect(error.details.suggestion).toContain('registry URL');
    });

    it('should handle ETIMEDOUT', () => {
      const axiosError = createAxiosError(undefined, undefined, 'ETIMEDOUT');
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Request timeout');
      expect(error.details.retryable).toBe(true);
    });

    it('should handle ECONNRESET', () => {
      const axiosError = createAxiosError(undefined, undefined, 'ECONNRESET');
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Connection reset');
      expect(error.details.retryable).toBe(true);
    });

    it('should include response data details', () => {
      const axiosError = createAxiosError(400, { 
        detail: 'Custom error',
        message: 'Alternative message'
      });
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.message).toContain('Custom error');
      expect(error.details.responseData).toEqual({
        detail: 'Custom error',
        message: 'Alternative message'
      });
    });

    it('should preserve endpoint information', () => {
      const axiosError = createAxiosError(500);
      const error = NetworkError.fromAxiosError(axiosError, 'https://custom.api.com');
      
      expect(error.details.endpoint).toBe('https://custom.api.com');
      expect(error.details.method).toBe('POST');
    });
  });

  describe('format', () => {
    it('should format with HTTP status code', () => {
      const error = new NetworkError('Request failed', {
        statusCode: 404,
        endpoint: 'https://api.example.com/test',
        method: 'GET'
      });
      
      const formatted = error.format();
      
      expect(formatted).toContain('HTTP 404: Request failed');
      expect(formatted).toContain('Endpoint: GET https://api.example.com/test');
    });

    it('should show retry information', () => {
      const error = new NetworkError('Temporary failure', {
        retryable: true,
        retryAfter: 60
      });
      
      const formatted = error.format();
      
      expect(formatted).toContain('⟳ This error may be temporary');
      expect(formatted).toContain('Wait 60 seconds before retrying');
    });

    it('should show retry without specific delay', () => {
      const error = new NetworkError('Temporary failure', {
        retryable: true
      });
      
      const formatted = error.format();
      
      expect(formatted).toContain('⟳ This error may be temporary');
      expect(formatted).not.toContain('Wait');
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      const error = new NetworkError('Temporary', { retryable: true });
      expect(error.isRetryable()).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = new NetworkError('Permanent', { retryable: false });
      expect(error.isRetryable()).toBe(false);
    });

    it('should return false by default', () => {
      const error = new NetworkError('Unknown');
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return specified retry delay', () => {
      const error = new NetworkError('Rate limited', { retryAfter: 30 });
      expect(error.getRetryDelay()).toBe(30);
    });

    it('should return default delay if not specified', () => {
      const error = new NetworkError('Temporary');
      expect(error.getRetryDelay()).toBe(5);
    });
  });
});