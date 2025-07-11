// Re-export all error classes and utilities
export * from './base';
export * from './validation';
export * from './network';
export * from './auth';
export * from './filesystem';

import { ContextMeshError, isContextMeshError } from './base';
import { ValidationError } from './validation';
import { NetworkError } from './network';
import { AuthenticationError } from './auth';
import { FileSystemError } from './filesystem';
import { AxiosError } from 'axios';
import chalk from 'chalk';

/**
 * Format any error for display to the user
 */
export function formatError(error: unknown, verbose: boolean = false): string {
  if (isContextMeshError(error)) {
    return error.format(verbose);
  }

  if (error instanceof Error) {
    let output = error.message;
    if (verbose && error.stack) {
      output += `\n\nStack trace:\n${error.stack}`;
    }
    return output;
  }

  return String(error);
}

/**
 * Handle an error and format it appropriately
 */
export function handleError(error: unknown, verbose: boolean = false): void {
  let formattedError: string;
  let exitCode = 1;

  if (isContextMeshError(error)) {
    formattedError = chalk.red(`❌ ${error.format(verbose)}`);
    
    // Set appropriate exit codes
    switch (error.code) {
      case 'AUTH_ERROR':
        exitCode = 2;
        break;
      case 'VALIDATION_ERROR':
        exitCode = 3;
        break;
      case 'NETWORK_ERROR':
        exitCode = 4;
        break;
      case 'FILESYSTEM_ERROR':
        exitCode = 5;
        break;
    }
  } else if (error instanceof Error) {
    // Try to identify and wrap known error types
    const wrappedError = identifyAndWrapError(error);
    if (wrappedError) {
      formattedError = chalk.red(`❌ ${wrappedError.format(verbose)}`);
    } else {
      formattedError = chalk.red(`❌ Error: ${error.message}`);
      if (verbose && error.stack) {
        formattedError += chalk.gray(`\n\nStack trace:\n${error.stack}`);
      }
    }
  } else {
    formattedError = chalk.red(`❌ Error: ${String(error)}`);
  }

  console.error(formattedError);
  process.exit(exitCode);
}

/**
 * Try to identify common errors and wrap them appropriately
 */
function identifyAndWrapError(error: Error): ContextMeshError | null {
  // Check for Axios errors
  if ('isAxiosError' in error && error.isAxiosError) {
    return NetworkError.fromAxiosError(error as AxiosError);
  }

  // Check for Node.js file system errors
  if ('code' in error && typeof error.code === 'string') {
    const fsErrorCodes = ['ENOENT', 'EACCES', 'EISDIR', 'ENOTDIR', 'ENOSPC', 'EMFILE', 'EEXIST', 'EROFS'];
    if (fsErrorCodes.includes(error.code)) {
      return FileSystemError.fromNodeError(error as Error & { code?: string; path?: string });
    }
  }

  // Check for validation-related errors
  if (error.message.toLowerCase().includes('validation') || error.message.toLowerCase().includes('invalid')) {
    return new ValidationError(error.message, { originalError: error });
  }

  // Check for auth-related errors
  if (error.message.toLowerCase().includes('auth') || error.message.toLowerCase().includes('token')) {
    return new AuthenticationError(error.message, { originalError: error });
  }

  return null;
}

/**
 * Create a user-friendly error message with suggestions
 */
export function createErrorMessage(
  title: string,
  details: string[],
  suggestions?: string[]
): string {
  let message = chalk.red(`❌ ${title}`);
  
  if (details.length > 0) {
    message += '\n\n' + chalk.white('Details:');
    details.forEach(detail => {
      message += '\n  • ' + detail;
    });
  }
  
  if (suggestions && suggestions.length > 0) {
    message += '\n\n' + chalk.yellow('💡 Suggestions:');
    suggestions.forEach(suggestion => {
      message += '\n  • ' + suggestion;
    });
  }
  
  return message;
}