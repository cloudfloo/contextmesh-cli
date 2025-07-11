import { ContextMeshError, isContextMeshError, wrapError } from '../../errors/base';

describe('ContextMeshError', () => {
  describe('constructor', () => {
    it('should create error with basic properties', () => {
      const error = new ContextMeshError('Test error', 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('ContextMeshError');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should include additional details', () => {
      const error = new ContextMeshError('Test error', 'TEST_ERROR', {
        field: 'testField',
        line: 10,
        column: 5,
        suggestion: 'Try this instead'
      });
      
      expect(error.details.field).toBe('testField');
      expect(error.details.line).toBe(10);
      expect(error.details.column).toBe(5);
      expect(error.details.suggestion).toBe('Try this instead');
    });
  });

  describe('format', () => {
    it('should format basic error message', () => {
      const error = new ContextMeshError('Test error', 'TEST_ERROR');
      const formatted = error.format();
      
      expect(formatted).toBe('Test error');
    });

    it('should include field information', () => {
      const error = new ContextMeshError('Test error', 'TEST_ERROR', {
        field: 'connector.id'
      });
      const formatted = error.format();
      
      expect(formatted).toContain('Test error');
      expect(formatted).toContain('Field: connector.id');
    });

    it('should include line and column information', () => {
      const error = new ContextMeshError('Test error', 'TEST_ERROR', {
        line: 15,
        column: 8
      });
      const formatted = error.format();
      
      expect(formatted).toContain('Location: Line 15, Column 8');
    });

    it('should include suggestion', () => {
      const error = new ContextMeshError('Test error', 'TEST_ERROR', {
        suggestion: 'Use lowercase letters only'
      });
      const formatted = error.format();
      
      expect(formatted).toContain('💡 Suggestion: Use lowercase letters only');
    });

    it('should include stack trace in verbose mode', () => {
      const error = new ContextMeshError('Test error', 'TEST_ERROR');
      const formatted = error.format(true);
      
      expect(formatted).toContain('Stack trace:');
      expect(formatted).toContain('ContextMeshError');
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new ContextMeshError('Test error', 'TEST_ERROR', {
        field: 'test'
      });
      const json = error.toJSON();
      
      expect(json.name).toBe('ContextMeshError');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.message).toBe('Test error');
      expect(json.details.field).toBe('test');
      expect(json.timestamp).toBeInstanceOf(Date);
      expect(json.stack).toBeDefined();
    });
  });
});

describe('isContextMeshError', () => {
  it('should return true for ContextMeshError instances', () => {
    const error = new ContextMeshError('Test', 'TEST');
    expect(isContextMeshError(error)).toBe(true);
  });

  it('should return false for regular errors', () => {
    const error = new Error('Test');
    expect(isContextMeshError(error)).toBe(false);
  });

  it('should return false for non-error objects', () => {
    expect(isContextMeshError('string')).toBe(false);
    expect(isContextMeshError(123)).toBe(false);
    expect(isContextMeshError(null)).toBe(false);
    expect(isContextMeshError(undefined)).toBe(false);
  });
});

describe('wrapError', () => {
  it('should return existing ContextMeshError unchanged', () => {
    const original = new ContextMeshError('Original', 'ORIGINAL');
    const wrapped = wrapError(original, 'NEW_CODE');
    
    expect(wrapped).toBe(original);
    expect(wrapped.code).toBe('ORIGINAL');
  });

  it('should wrap regular Error', () => {
    const original = new Error('Regular error');
    const wrapped = wrapError(original, 'WRAPPED_ERROR');
    
    expect(wrapped).toBeInstanceOf(ContextMeshError);
    expect(wrapped.message).toBe('Regular error');
    expect(wrapped.code).toBe('WRAPPED_ERROR');
    expect(wrapped.details.originalError).toBe(original);
  });

  it('should use custom message if provided', () => {
    const original = new Error('Original');
    const wrapped = wrapError(original, 'WRAPPED', 'Custom message');
    
    expect(wrapped.message).toBe('Custom message');
  });

  it('should handle non-Error objects', () => {
    const wrapped = wrapError('String error', 'STRING_ERROR');
    
    expect(wrapped).toBeInstanceOf(ContextMeshError);
    expect(wrapped.message).toBe('String error');
    expect(wrapped.code).toBe('STRING_ERROR');
  });
});