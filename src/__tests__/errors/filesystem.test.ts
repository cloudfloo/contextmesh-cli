import { FileSystemError } from '../../errors/filesystem';

describe('FileSystemError', () => {
  describe('constructor', () => {
    it('should create filesystem error', () => {
      const error = new FileSystemError('File operation failed');
      
      expect(error.message).toBe('File operation failed');
      expect(error.code).toBe('FILESYSTEM_ERROR');
      expect(error.name).toBe('FileSystemError');
    });

    it('should include filesystem details', () => {
      const error = new FileSystemError('Cannot read file', {
        path: '/tmp/test.json',
        operation: 'read',
        errorCode: 'ENOENT'
      });
      
      expect(error.details.path).toBe('/tmp/test.json');
      expect(error.details.operation).toBe('read');
      expect(error.details.errorCode).toBe('ENOENT');
    });
  });

  describe('fromNodeError', () => {
    const createNodeError = (code: string, path?: string): NodeJS.ErrnoException => {
      const error = new Error(`Mock ${code} error`) as NodeJS.ErrnoException;
      error.code = code;
      error.path = path;
      return error;
    };

    it('should handle ENOENT (file not found)', () => {
      const nodeError = createNodeError('ENOENT', '/tmp/missing.json');
      const error = FileSystemError.fromNodeError(nodeError);
      
      expect(error.message).toContain('File or directory not found: /tmp/missing.json');
      expect(error.details.errorCode).toBe('ENOENT');
      expect(error.details.suggestion).toContain('Check that the file exists');
    });

    it('should handle EACCES (permission denied)', () => {
      const nodeError = createNodeError('EACCES', '/root/protected.txt');
      const error = FileSystemError.fromNodeError(nodeError);
      
      expect(error.message).toContain('Permission denied: /root/protected.txt');
      expect(error.details.errorCode).toBe('EACCES');
      expect(error.details.suggestion).toContain('Check file permissions');
    });

    it('should handle EISDIR (is directory)', () => {
      const nodeError = createNodeError('EISDIR', '/tmp/directory');
      const error = FileSystemError.fromNodeError(nodeError);
      
      expect(error.message).toContain('Expected a file but found a directory');
      expect(error.details.errorCode).toBe('EISDIR');
    });

    it('should handle ENOTDIR (not directory)', () => {
      const nodeError = createNodeError('ENOTDIR', '/tmp/file.txt');
      const error = FileSystemError.fromNodeError(nodeError);
      
      expect(error.message).toContain('Expected a directory but found a file');
      expect(error.details.errorCode).toBe('ENOTDIR');
    });

    it('should handle ENOSPC (no space)', () => {
      const nodeError = createNodeError('ENOSPC');
      const error = FileSystemError.fromNodeError(nodeError);
      
      expect(error.message).toContain('No space left on device');
      expect(error.details.suggestion).toContain('Free up disk space');
    });

    it('should handle EMFILE (too many files)', () => {
      const nodeError = createNodeError('EMFILE');
      const error = FileSystemError.fromNodeError(nodeError);
      
      expect(error.message).toContain('Too many open files');
      expect(error.details.suggestion).toContain('Close some applications');
    });

    it('should handle EEXIST (file exists)', () => {
      const nodeError = createNodeError('EEXIST', '/tmp/existing.txt');
      const error = FileSystemError.fromNodeError(nodeError);
      
      expect(error.message).toContain('File already exists: /tmp/existing.txt');
      expect(error.details.suggestion).toContain('Remove the existing file');
    });

    it('should handle EROFS (read-only filesystem)', () => {
      const nodeError = createNodeError('EROFS');
      const error = FileSystemError.fromNodeError(nodeError);
      
      expect(error.message).toContain('Read-only file system');
      expect(error.details.suggestion).toContain('Cannot write to a read-only');
    });

    it('should handle unknown error codes', () => {
      const nodeError = createNodeError('UNKNOWN');
      nodeError.message = 'Custom error message';
      const error = FileSystemError.fromNodeError(nodeError);
      
      expect(error.message).toBe('Custom error message');
      expect(error.details.errorCode).toBe('UNKNOWN');
    });

    it('should use provided path and operation', () => {
      const nodeError = createNodeError('ENOENT');
      const error = FileSystemError.fromNodeError(nodeError, '/custom/path.txt', 'write');
      
      expect(error.message).toContain('/custom/path.txt');
      expect(error.details.path).toBe('/custom/path.txt');
      expect(error.details.operation).toBe('write');
    });
  });

  describe('static factory methods', () => {
    describe('fileNotFound', () => {
      it('should create file not found error', () => {
        const error = FileSystemError.fileNotFound('/tmp/missing.json');
        
        expect(error.message).toBe('File not found: /tmp/missing.json');
        expect(error.details.path).toBe('/tmp/missing.json');
        expect(error.details.operation).toBe('read');
        expect(error.details.errorCode).toBe('ENOENT');
      });
    });

    describe('directoryNotFound', () => {
      it('should create directory not found error', () => {
        const error = FileSystemError.directoryNotFound('/tmp/missing-dir');
        
        expect(error.message).toBe('Directory not found: /tmp/missing-dir');
        expect(error.details.path).toBe('/tmp/missing-dir');
        expect(error.details.operation).toBe('access');
        expect(error.details.suggestion).toContain('use "." for current directory');
      });
    });

    describe('permissionDenied', () => {
      it('should create permission denied error', () => {
        const error = FileSystemError.permissionDenied('/root/file.txt', 'write');
        
        expect(error.message).toBe('Permission denied: Cannot write /root/file.txt');
        expect(error.details.path).toBe('/root/file.txt');
        expect(error.details.operation).toBe('write');
        expect(error.details.errorCode).toBe('EACCES');
      });

      it('should use default operation', () => {
        const error = FileSystemError.permissionDenied('/root/file.txt');
        
        expect(error.message).toContain('Cannot access');
      });
    });

    describe('manifestNotFound', () => {
      it('should create manifest not found error', () => {
        const error = FileSystemError.manifestNotFound('/project');
        
        expect(error.message).toBe('No connector.mcp.json found in directory');
        expect(error.details.path).toBe('/project/connector.mcp.json');
        expect(error.details.suggestion).toContain('Run this command from a connector directory');
        expect(error.details.suggestion).toContain('create a basic manifest');
      });
    });

    describe('cannotCreateZip', () => {
      it('should create zip creation error', () => {
        const error = FileSystemError.cannotCreateZip();
        
        expect(error.message).toBe('Failed to create connector archive');
        expect(error.details.operation).toBe('write');
        expect(error.details.suggestion).toContain('write permissions');
      });

      it('should include reason if provided', () => {
        const error = FileSystemError.cannotCreateZip('Archive too large');
        
        expect(error.message).toBe('Failed to create connector archive: Archive too large');
      });
    });
  });

  describe('format', () => {
    it('should format with all details', () => {
      const error = new FileSystemError('Operation failed', {
        path: '/tmp/test.json',
        operation: 'write',
        errorCode: 'EACCES'
      });
      
      const formatted = error.format();
      
      expect(formatted).toContain('Operation failed');
      expect(formatted).toContain('Path: /tmp/test.json');
      expect(formatted).toContain('Operation: write');
      expect(formatted).toContain('Error code: EACCES');
    });

    it('should handle missing details gracefully', () => {
      const error = new FileSystemError('Generic error');
      const formatted = error.format();
      
      expect(formatted).toBe('Generic error');
    });
  });
});