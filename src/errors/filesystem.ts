import { ContextMeshError, ErrorDetails } from './base';

export interface FileSystemErrorDetails extends ErrorDetails {
  path?: string;
  operation?: 'read' | 'write' | 'delete' | 'create' | 'access';
  errorCode?: string;
}

export class FileSystemError extends ContextMeshError {
  constructor(message: string, details: Partial<FileSystemErrorDetails> = {}) {
    super(message, 'FILESYSTEM_ERROR', details);
  }

  static fromNodeError(error: Error & { code?: string; path?: string }, path?: string, operation?: string): FileSystemError {
    let message = 'File system operation failed';
    let suggestion: string | undefined;

    switch (error.code) {
      case 'ENOENT':
        message = `File or directory not found: ${path || error.path}`;
        suggestion = 'Check that the file exists and the path is correct';
        break;
      case 'EACCES':
        message = `Permission denied: ${path || error.path}`;
        suggestion = 'Check file permissions or run with appropriate privileges';
        break;
      case 'EISDIR':
        message = `Expected a file but found a directory: ${path || error.path}`;
        suggestion = 'Provide a path to a file, not a directory';
        break;
      case 'ENOTDIR':
        message = `Expected a directory but found a file: ${path || error.path}`;
        suggestion = 'Provide a path to a directory, not a file';
        break;
      case 'ENOSPC':
        message = 'No space left on device';
        suggestion = 'Free up disk space and try again';
        break;
      case 'EMFILE':
        message = 'Too many open files';
        suggestion = 'Close some applications and try again';
        break;
      case 'EEXIST':
        message = `File already exists: ${path || error.path}`;
        suggestion = 'Remove the existing file or choose a different name';
        break;
      case 'EROFS':
        message = 'Read-only file system';
        suggestion = 'Cannot write to a read-only file system';
        break;
      default:
        if (error.message) {
          message = error.message;
        }
    }

    return new FileSystemError(message, {
      path: path || error.path,
      operation: operation as any,
      errorCode: error.code,
      suggestion,
      originalError: error
    });
  }

  static fileNotFound(path: string): FileSystemError {
    return new FileSystemError(
      `File not found: ${path}`,
      {
        path,
        operation: 'read',
        errorCode: 'ENOENT',
        suggestion: 'Make sure the file exists and the path is correct'
      }
    );
  }

  static directoryNotFound(path: string): FileSystemError {
    return new FileSystemError(
      `Directory not found: ${path}`,
      {
        path,
        operation: 'access',
        errorCode: 'ENOENT',
        suggestion: 'Make sure the directory exists or use "." for current directory'
      }
    );
  }

  static permissionDenied(path: string, operation: string = 'access'): FileSystemError {
    return new FileSystemError(
      `Permission denied: Cannot ${operation} ${path}`,
      {
        path,
        operation: operation as any,
        errorCode: 'EACCES',
        suggestion: 'Check file permissions or run with appropriate privileges'
      }
    );
  }

  static manifestNotFound(directory: string): FileSystemError {
    return new FileSystemError(
      'No connector.mcp.json found in directory',
      {
        path: `${directory}/connector.mcp.json`,
        operation: 'read',
        errorCode: 'ENOENT',
        suggestion: 'Run this command from a connector directory or specify the path.\n' +
                   '  The command will create a basic manifest if none exists.'
      }
    );
  }

  static cannotCreateZip(reason?: string): FileSystemError {
    return new FileSystemError(
      `Failed to create connector archive${reason ? `: ${reason}` : ''}`,
      {
        operation: 'write',
        suggestion: 'Ensure you have write permissions and sufficient disk space'
      }
    );
  }

  format(verbose: boolean = false): string {
    let output = super.format(verbose);

    if (this.details.path) {
      output += `\n  Path: ${this.details.path}`;
    }

    if (this.details.operation) {
      output += `\n  Operation: ${this.details.operation}`;
    }

    if (this.details.errorCode) {
      output += `\n  Error code: ${this.details.errorCode}`;
    }

    return output;
  }
}