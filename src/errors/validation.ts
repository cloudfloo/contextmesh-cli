import { ContextMeshError, ErrorDetails } from './base';

export interface ValidationErrorDetails extends ErrorDetails {
  validationErrors?: Array<{
    path: string;
    message: string;
    keyword?: string;
    params?: any;
  }>;
}

export class ValidationError extends ContextMeshError {
  constructor(message: string, details: Partial<ValidationErrorDetails> = {}) {
    super(message, 'VALIDATION_ERROR', details);
  }

  static fromAjvErrors(ajvErrors: any[], rawContent?: string): ValidationError {
    const errors = ajvErrors.map((error: any) => {
      const path = error.instancePath || error.schemaPath || '/';
      let message = error.message || 'Unknown validation error';
      let suggestion: string | undefined;

      // Enhance error messages
      switch (error.keyword) {
        case 'required':
          const missingProp = error.params?.missingProperty;
          message = `Missing required property: ${missingProp}`;
          suggestion = getRequiredPropertySuggestion(missingProp);
          break;
        case 'pattern':
          message = `Invalid format: ${error.message}`;
          suggestion = getPatternSuggestion(error.schemaPath, error.params);
          break;
        case 'enum':
          const allowedValues = error.params?.allowedValues;
          message = `Invalid value. Allowed values: ${allowedValues?.join(', ')}`;
          break;
        case 'format':
          message = `Invalid ${error.params?.format} format`;
          suggestion = getFormatSuggestion(error.params?.format);
          break;
        case 'minItems':
          message = `Array must have at least ${error.params?.limit} items`;
          break;
        case 'maxItems':
          message = `Array can have at most ${error.params?.limit} items`;
          break;
        case 'type':
          message = `Expected ${error.params?.type} but got ${typeof error.data}`;
          break;
      }

      return {
        path: path === '/' ? 'root' : path.replace(/^\//, ''),
        message,
        keyword: error.keyword,
        params: error.params,
        suggestion
      };
    });

    const primaryError = errors[0];
    const lineInfo = rawContent ? findLineForPath(primaryError.path, rawContent) : null;

    return new ValidationError(
      `Manifest validation failed: ${primaryError.message}`,
      {
        field: primaryError.path,
        line: lineInfo?.line,
        column: lineInfo?.column,
        suggestion: primaryError.suggestion || getSuggestionForError(primaryError),
        validationErrors: errors
      }
    );
  }

  format(verbose: boolean = false): string {
    let output = super.format(verbose);

    if (this.details.validationErrors && this.details.validationErrors.length > 1) {
      output += '\n\nAdditional validation errors:';
      this.details.validationErrors.slice(1).forEach((error: any, index: number) => {
        output += `\n${index + 2}. ${error.path}: ${error.message}`;
      });
    }

    return output;
  }
}

function findLineForPath(path: string, rawContent: string): { line: number; column: number } | null {
  if (path === '/' || path === '' || path === 'root') return null;

  const lines = rawContent.split('\n');
  const parts = path.split('/').filter(p => p !== '');
  const searchKey = parts[parts.length - 1];

  // Handle array indices
  const cleanKey = searchKey.replace(/\[\d+\]$/, '');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const keyIndex = line.indexOf(`"${cleanKey}"`);
    if (keyIndex !== -1) {
      return { line: i + 1, column: keyIndex + 1 };
    }
  }

  return null;
}

function getSuggestionForError(error: any): string | undefined {
  if (error.keyword === 'required') {
    return getRequiredPropertySuggestion(error.params?.missingProperty);
  }
  if (error.keyword === 'pattern' && error.path) {
    return getPatternSuggestion(error.path, error.params);
  }
  if (error.keyword === 'format') {
    return getFormatSuggestion(error.params?.format);
  }
  return undefined;
}

function getRequiredPropertySuggestion(property: string): string {
  const suggestions: Record<string, string> = {
    'schema': 'Add "schema": "https://mcp.dev/schema/1.0" at the root level',
    'id': 'Add "id": "your-connector-name" (lowercase, hyphens only)',
    'tools': 'Add "tools": [] array with at least one tool definition',
    '_contextmesh': 'Add "_contextmesh": { version, tags, language, repo } section',
    'version': 'Add "version": "1.0.0" in the _contextmesh section',
    'tags': 'Add "tags": ["category"] in the _contextmesh section (e.g., ["github", "api"])',
    'language': 'Add "language": "typescript" (or python, rust, go, java)',
    'repo': 'Add "repo": "https://github.com/..." with your repository URL',
    'name': 'Add "name": "Tool Name" in the tool definition',
    'description': 'Add "description": "What this tool does" in the tool definition'
  };

  return suggestions[property] || `Add the required "${property}" property`;
}

function getPatternSuggestion(path: string, _params: any): string {
  if (path.includes('/id') || path.includes('id')) {
    return 'Connector ID must contain only lowercase letters, numbers, and hyphens (e.g., "my-connector")';
  }
  if (path.includes('/tags') || path.includes('tags')) {
    return 'Tags must contain only lowercase letters, numbers, and hyphens (e.g., "github", "api-client")';
  }
  if (path.includes('/version') || path.includes('version')) {
    return 'Version must follow semantic versioning format: MAJOR.MINOR.PATCH (e.g., "1.0.0")';
  }
  if (path.includes('/checksum')) {
    return 'Checksum must be in format "sha256:64-hex-characters"';
  }
  return 'Value must match the required pattern';
}

function getFormatSuggestion(format: string): string {
  const suggestions: Record<string, string> = {
    'email': 'Use a valid email address (e.g., "user@example.com")',
    'uri': 'Use a valid URL starting with http:// or https:// (e.g., "https://github.com/user/repo")',
    'date-time': 'Use ISO 8601 format (e.g., "2024-01-01T00:00:00Z")',
    'hostname': 'Use a valid hostname (e.g., "example.com")',
    'ipv4': 'Use a valid IPv4 address (e.g., "192.168.1.1")',
    'ipv6': 'Use a valid IPv6 address'
  };

  return suggestions[format] || `Value must be a valid ${format}`;
}