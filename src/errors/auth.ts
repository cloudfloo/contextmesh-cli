import { ContextMeshError, ErrorDetails } from './base';

export interface AuthErrorDetails extends ErrorDetails {
  tokenSource?: 'environment' | 'flag' | 'file';
  tokenPresent?: boolean;
}

export class AuthenticationError extends ContextMeshError {
  constructor(message: string, details: Partial<AuthErrorDetails> = {}) {
    super(message, 'AUTH_ERROR', details);
  }

  static missingToken(): AuthenticationError {
    return new AuthenticationError(
      'No authentication token provided',
      {
        tokenPresent: false,
        suggestion: 'Set CONTEXTMESH_TOKEN environment variable or use --token flag\n' +
                   '  Example: export CONTEXTMESH_TOKEN="your-token-here"\n' +
                   '  Or: contextmesh publish --token "your-token-here"'
      }
    );
  }

  static invalidToken(source: 'environment' | 'flag' | 'file' = 'environment'): AuthenticationError {
    return new AuthenticationError(
      'Invalid authentication token',
      {
        tokenSource: source,
        tokenPresent: true,
        suggestion: 'Your token may be expired or invalid. To get a new token:\n' +
                   '  1. Visit https://app.contextmesh.io/settings/tokens\n' +
                   '  2. Generate a new API token\n' +
                   '  3. Update your CONTEXTMESH_TOKEN environment variable'
      }
    );
  }

  static expiredToken(): AuthenticationError {
    return new AuthenticationError(
      'Authentication token has expired',
      {
        tokenPresent: true,
        suggestion: 'Your token has expired. Generate a new one:\n' +
                   '  1. Visit https://app.contextmesh.io/settings/tokens\n' +
                   '  2. Generate a new API token\n' +
                   '  3. Update your CONTEXTMESH_TOKEN environment variable'
      }
    );
  }

  static insufficientPermissions(action: string): AuthenticationError {
    return new AuthenticationError(
      `Insufficient permissions to ${action}`,
      {
        tokenPresent: true,
        suggestion: 'Your token does not have the required permissions.\n' +
                   '  Ensure your token has "write:connectors" scope for publishing.\n' +
                   '  Generate a new token with proper permissions at:\n' +
                   '  https://app.contextmesh.io/settings/tokens'
      }
    );
  }

  format(verbose: boolean = false): string {
    let output = super.format(verbose);

    if (this.details.tokenSource) {
      output += `\n  Token source: ${this.details.tokenSource}`;
    }

    if (this.details.tokenPresent !== undefined) {
      output += `\n  Token present: ${this.details.tokenPresent ? 'Yes' : 'No'}`;
    }

    return output;
  }
}