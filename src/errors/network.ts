import { ContextMeshError, ErrorDetails } from './base';
import { AxiosError } from 'axios';

export interface NetworkErrorDetails extends ErrorDetails {
  statusCode?: number;
  endpoint?: string;
  method?: string;
  responseData?: unknown;
  retryable?: boolean;
  retryAfter?: number;
}

export class NetworkError extends ContextMeshError {
  constructor(message: string, details: Partial<NetworkErrorDetails> = {}) {
    super(message, 'NETWORK_ERROR', details);
  }

  static fromAxiosError(error: AxiosError, endpoint?: string): NetworkError {
    const statusCode = error.response?.status;
    const responseData = error.response?.data;
    let message = 'Network request failed';
    let suggestion: string | undefined;
    let retryable = false;
    let retryAfter: number | undefined;

    // Handle specific status codes
    if (statusCode) {
      switch (statusCode) {
        case 400:
          message = 'Bad request: Invalid data sent to server';
          suggestion = 'Check your manifest format and try again';
          break;
        case 401:
          message = 'Authentication failed: Invalid or expired token';
          suggestion = 'Check your CONTEXTMESH_TOKEN or use --token flag with a valid token';
          break;
        case 403:
          message = 'Permission denied: You do not have access to this resource';
          suggestion = 'Ensure you have the necessary permissions for this operation';
          break;
        case 404:
          message = 'Resource not found';
          suggestion = 'Check the registry URL and connector ID';
          break;
        case 409:
          message = 'Conflict: Resource already exists';
          suggestion = 'This version may already be published. Try incrementing the version number';
          break;
        case 413:
          message = 'Payload too large: Connector package exceeds size limit';
          suggestion = 'Reduce the size of your connector package (check for large files)';
          break;
        case 422:
          message = 'Validation error: Server rejected the request';
          if (responseData && typeof responseData === 'object' && 'detail' in responseData) {
            message += `: ${responseData.detail}`;
          }
          break;
        case 429:
          message = 'Rate limit exceeded';
          suggestion = 'Wait a few minutes before trying again';
          retryable = true;
          retryAfter = error.response?.headers['retry-after'] 
            ? parseInt(error.response.headers['retry-after']) 
            : 60;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message = 'Server error: The registry is experiencing issues';
          suggestion = 'Try again in a few minutes. If the problem persists, check https://status.contextmesh.io';
          retryable = true;
          break;
        default:
          message = `HTTP ${statusCode} error`;
      }
    } else if (error.code === 'ECONNREFUSED') {
      message = 'Connection refused: Cannot reach the registry server';
      suggestion = 'Check your internet connection and the registry URL';
      retryable = true;
    } else if (error.code === 'ENOTFOUND') {
      message = 'Server not found: Invalid registry URL';
      suggestion = 'Check the registry URL (default: https://api.contextmesh.io)';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      message = 'Request timeout: Server took too long to respond';
      suggestion = 'Check your internet connection and try again';
      retryable = true;
    } else if (error.code === 'ECONNRESET') {
      message = 'Connection reset: Server closed the connection unexpectedly';
      suggestion = 'Try again. This is usually a temporary issue';
      retryable = true;
    }

    // Add response details if available
    if (responseData && typeof responseData === 'object') {
      if ('detail' in responseData && typeof responseData.detail === 'string' && !message.includes(responseData.detail)) {
        message += `: ${responseData.detail}`;
      } else if ('message' in responseData && typeof responseData.message === 'string') {
        message += `: ${responseData.message}`;
      }
    }

    return new NetworkError(message, {
      statusCode,
      endpoint: endpoint || error.config?.url,
      method: error.config?.method?.toUpperCase(),
      responseData,
      suggestion,
      retryable,
      retryAfter,
      originalError: error
    });
  }

  format(verbose: boolean = false): string {
    let output = super.format(verbose);

    if (this.details.statusCode) {
      output = `HTTP ${this.details.statusCode}: ${output}`;
    }

    if (this.details.endpoint) {
      output += `\n  Endpoint: ${this.details.method || 'GET'} ${this.details.endpoint}`;
    }

    if (this.details.retryable) {
      output += '\n  ⟳ This error may be temporary. You can try again.';
      if (this.details.retryAfter) {
        output += ` Wait ${this.details.retryAfter} seconds before retrying.`;
      }
    }

    return output;
  }

  /**
   * Check if this error is potentially retryable
   */
  isRetryable(): boolean {
    return (this.details.retryable as boolean) || false;
  }

  /**
   * Get suggested retry delay in seconds
   */
  getRetryDelay(): number {
    return (this.details.retryAfter as number) || 5;
  }
}