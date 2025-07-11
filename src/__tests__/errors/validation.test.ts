import { ValidationError } from '../../errors/validation';

describe('ValidationError', () => {
  describe('constructor', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Validation failed');
      
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should include validation details', () => {
      const error = new ValidationError('Invalid field', {
        field: 'connector.id',
        line: 5,
        column: 10,
        suggestion: 'Use lowercase only'
      });
      
      expect(error.details.field).toBe('connector.id');
      expect(error.details.line).toBe(5);
      expect(error.details.column).toBe(10);
      expect(error.details.suggestion).toBe('Use lowercase only');
    });
  });

  describe('fromAjvErrors', () => {
    const mockRawContent = `{
  "schema": "https://mcp.dev/schema/1.0",
  "id": "Test-Connector",
  "tools": []
}`;

    it('should handle required property errors', () => {
      const ajvErrors = [{
        keyword: 'required',
        instancePath: '',
        schemaPath: '#/required',
        params: { missingProperty: '_contextmesh' },
        message: 'must have required property _contextmesh'
      }];

      const error = ValidationError.fromAjvErrors(ajvErrors, mockRawContent);
      
      expect(error.message).toContain('Missing required property: _contextmesh');
      expect(error.details.field).toBe('root');
      expect(error.details.suggestion).toContain('Add "_contextmesh"');
    });

    it('should handle pattern errors', () => {
      const ajvErrors = [{
        keyword: 'pattern',
        instancePath: '/id',
        schemaPath: '#/properties/id/pattern',
        params: { pattern: '^[a-z0-9-]+$' },
        message: 'must match pattern "^[a-z0-9-]+$"',
        data: 'Test-Connector'
      }];

      const error = ValidationError.fromAjvErrors(ajvErrors, mockRawContent);
      
      expect(error.message).toContain('Invalid format');
      expect(error.details.field).toBe('id');
      expect(error.details.line).toBe(3); // Line where "id" appears
    });

    it('should handle enum errors', () => {
      const ajvErrors = [{
        keyword: 'enum',
        instancePath: '/_contextmesh/language',
        schemaPath: '#/properties/_contextmesh/properties/language/enum',
        params: { allowedValues: ['typescript', 'python', 'rust', 'go', 'java'] },
        message: 'must be equal to one of the allowed values'
      }];

      const error = ValidationError.fromAjvErrors(ajvErrors);
      
      expect(error.message).toContain('Invalid value');
      expect(error.message).toContain('Allowed values: typescript, python, rust, go, java');
    });

    it('should handle format errors', () => {
      const ajvErrors = [{
        keyword: 'format',
        instancePath: '/_contextmesh/author/email',
        schemaPath: '#/properties/_contextmesh/properties/author/properties/email/format',
        params: { format: 'email' },
        message: 'must match format "email"'
      }];

      const error = ValidationError.fromAjvErrors(ajvErrors);
      
      expect(error.message).toContain('Invalid email format');
      expect(error.details.suggestion).toContain('valid email address');
    });

    it('should handle multiple errors', () => {
      const ajvErrors = [
        {
          keyword: 'required',
          instancePath: '',
          params: { missingProperty: 'tools' },
          message: 'must have required property tools'
        },
        {
          keyword: 'pattern',
          instancePath: '/id',
          params: { pattern: '^[a-z0-9-]+$' },
          message: 'must match pattern'
        }
      ];

      const error = ValidationError.fromAjvErrors(ajvErrors);
      
      expect(error.message).toContain('Missing required property: tools');
      expect(error.details.validationErrors).toHaveLength(2);
    });

    it('should find line numbers in raw content', () => {
      const ajvErrors = [{
        keyword: 'pattern',
        instancePath: '/id',
        schemaPath: '#/properties/id/pattern',
        params: { pattern: '^[a-z0-9-]+$' },
        message: 'must match pattern'
      }];

      const error = ValidationError.fromAjvErrors(ajvErrors, mockRawContent);
      
      expect(error.details.line).toBe(3);
      expect(error.details.column).toBe(3); // Position of "id" in line
    });

    it('should handle array index paths', () => {
      const ajvErrors = [{
        keyword: 'required',
        instancePath: '/tools/0',
        params: { missingProperty: 'name' },
        message: 'must have required property name'
      }];

      const error = ValidationError.fromAjvErrors(ajvErrors);
      
      expect(error.details.field).toBe('tools/0');
    });

    it('should handle type errors', () => {
      const ajvErrors = [{
        keyword: 'type',
        instancePath: '/tools',
        schemaPath: '#/properties/tools/type',
        params: { type: 'array' },
        message: 'must be array',
        data: 'not-an-array'
      }];

      const error = ValidationError.fromAjvErrors(ajvErrors);
      
      expect(error.message).toContain('Expected array but got string');
    });
  });

  describe('format', () => {
    it('should format error with additional validation errors', () => {
      const error = new ValidationError('Main error', {
        validationErrors: [
          { path: 'field1', message: 'Error 1' },
          { path: 'field2', message: 'Error 2' },
          { path: 'field3', message: 'Error 3' }
        ]
      });

      const formatted = error.format();
      
      expect(formatted).toContain('Main error');
      expect(formatted).toContain('Additional validation errors:');
      expect(formatted).toContain('2. field2: Error 2');
      expect(formatted).toContain('3. field3: Error 3');
    });

    it('should not show additional errors section if only one error', () => {
      const error = new ValidationError('Single error', {
        validationErrors: [
          { path: 'field1', message: 'Error 1' }
        ]
      });

      const formatted = error.format();
      
      expect(formatted).toContain('Single error');
      expect(formatted).not.toContain('Additional validation errors:');
    });
  });
});