export interface ErrorDetails {
  code: string;
  field?: string;
  line?: number;
  column?: number;
  suggestion?: string;
  originalError?: Error;
  [key: string]: any; // Allow additional properties
}

export class ContextMeshError extends Error {
  public readonly code: string;
  public readonly details: ErrorDetails;
  public readonly timestamp: Date;

  constructor(message: string, code: string, details: Partial<ErrorDetails> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = { code, ...details };
    this.timestamp = new Date();

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Format error for display to users
   */
  public format(verbose: boolean = false): string {
    let output = this.message;

    if (this.details.field) {
      output += `\n  Field: ${this.details.field}`;
    }

    if (this.details.line) {
      output += `\n  Location: Line ${this.details.line}`;
      if (this.details.column) {
        output += `, Column ${this.details.column}`;
      }
    }

    if (this.details.suggestion) {
      output += `\n  💡 Suggestion: ${this.details.suggestion}`;
    }

    if (verbose && this.stack) {
      output += `\n\nStack trace:\n${this.stack}`;
    }

    return output;
  }

  /**
   * Convert to JSON for logging
   */
  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Check if an error is a ContextMeshError
 */
export function isContextMeshError(error: unknown): error is ContextMeshError {
  return error instanceof ContextMeshError;
}

/**
 * Wrap an unknown error in a ContextMeshError
 */
export function wrapError(error: unknown, code: string, message?: string): ContextMeshError {
  if (isContextMeshError(error)) {
    return error;
  }

  const errorMessage = message || (error instanceof Error ? error.message : String(error));
  const details: Partial<ErrorDetails> = {};

  if (error instanceof Error) {
    details.originalError = error;
  }

  return new ContextMeshError(errorMessage, code, details);
}