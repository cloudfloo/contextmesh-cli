import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { ConnectorManifest } from '../types';
import { loadManifest } from './manifest';
import chalk from 'chalk';

// Inline schema for now - in production, this would be loaded from contextmesh-core/schema
const mcpPackageSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['schema', 'id', 'tools', '_contextmesh'],
  properties: {
    schema: {
      type: 'string',
      const: 'https://mcp.dev/schema/1.0'
    },
    id: {
      type: 'string',
      pattern: '^[a-z0-9-]+$'
    },
    name: { type: 'string' },
    description: { type: 'string' },
    tools: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'description'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          input_schema: { type: 'object' },
          output_schema: { type: 'object' }
        }
      }
    },
    auth: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['oauth2', 'api_key', 'basic']
        }
      }
    },
    _contextmesh: {
      type: 'object',
      required: ['version', 'tags', 'language', 'repo'],
      properties: {
        version: {
          type: 'string',
          pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+$'
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^[a-z0-9-]+$'
          },
          minItems: 1,
          maxItems: 10
        },
        language: {
          type: 'string',
          enum: ['typescript', 'python', 'rust', 'go', 'java']
        },
        repo: {
          type: 'string',
          format: 'uri'
        },
        checksum: {
          type: 'string',
          pattern: '^sha256:[a-f0-9]{64}$'
        },
        tested_with: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        author: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            url: { type: 'string', format: 'uri' }
          }
        },
        license: { type: 'string' }
      }
    }
  }
};

interface ValidationError {
  path: string;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export async function validateManifest(manifestPath: string): Promise<ConnectorManifest> {
  console.log(chalk.blue('📋 Validating connector manifest...'));
  
  // Read raw content for line number tracking
  const rawContent = readFileSync(manifestPath, 'utf-8');
  const manifest = loadManifest(manifestPath);
  
  const ajv = new Ajv({ 
    allErrors: true, 
    verbose: true,
    strict: false // Allow additional properties
  });
  addFormats(ajv); // Add format validators (email, uri, etc.)
  
  const validate = ajv.compile(mcpPackageSchema);
  
  const valid = validate(manifest);
  if (!valid) {
    const errors = validate.errors || [];
    const validationErrors = processValidationErrors(errors, rawContent);
    
    console.error(chalk.red('\n❌ Manifest validation failed:'));
    console.error(chalk.gray(`File: ${manifestPath}\n`));
    
    validationErrors.forEach((error, index) => {
      console.error(chalk.red(`${index + 1}. ${error.path}`));
      console.error(chalk.red(`   ${error.message}`));
      
      if (error.line) {
        console.error(chalk.gray(`   Line ${error.line}${error.column ? `, Column ${error.column}` : ''}`));
      }
      
      if (error.suggestion) {
        console.error(chalk.yellow(`   💡 Suggestion: ${error.suggestion}`));
      }
      console.error('');
    });
    
    console.error(chalk.red('Fix these issues and try again.'));
    throw new Error('Manifest validation failed');
  }
  
  // Additional semantic validation
  performSemanticValidation(manifest);
  
  console.log(chalk.green('✅ Manifest validation passed'));
  return manifest;
}

function processValidationErrors(errors: any[], rawContent: string): ValidationError[] {
  const lines = rawContent.split('\n');
  
  return errors.map(error => {
    const path = error.instancePath || error.schemaPath || '/';
    let message = error.message || 'Unknown error';
    let suggestion: string | undefined;
    
    // Enhance error messages with helpful suggestions
    switch (error.keyword) {
      case 'required':
        const missingProp = error.params?.missingProperty;
        message = `Missing required property: ${missingProp}`;
        suggestion = getRequiredPropertySuggestion(missingProp);
        break;
      case 'pattern':
        message = `Invalid format: ${error.message}`;
        suggestion = getPatternSuggestion(error.schemaPath);
        break;
      case 'enum':
        const allowedValues = error.params?.allowedValues;
        message = `Invalid value. Allowed values: ${allowedValues?.join(', ')}`;
        break;
      case 'format':
        message = `Invalid ${error.params?.format} format: ${error.message}`;
        suggestion = getFormatSuggestion(error.params?.format);
        break;
      case 'minItems':
        message = `Array must have at least ${error.params?.limit} items`;
        break;
      case 'maxItems':
        message = `Array can have at most ${error.params?.limit} items`;
        break;
    }
    
    // Try to find line number for this path
    const lineInfo = findLineForPath(path, lines);
    
    return {
      path: path === '/' ? 'root' : path.replace(/^\//, ''),
      message,
      line: lineInfo?.line,
      column: lineInfo?.column,
      suggestion
    };
  });
}

function findLineForPath(path: string, lines: string[]): { line: number; column: number } | null {
  if (path === '/' || path === '') return null;
  
  // Convert JSON path to property search
  const parts = path.replace(/^\//, '').split('/');
  const searchKey = parts[parts.length - 1];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(`"${searchKey}"`)) {
      const column = line.indexOf(`"${searchKey}"`) + 1;
      return { line: i + 1, column };
    }
  }
  
  return null;
}

function getRequiredPropertySuggestion(property: string): string {
  const suggestions: Record<string, string> = {
    'schema': 'Add "schema": "https://mcp.dev/schema/1.0"',
    'id': 'Add "id": "your-connector-name" (lowercase, hyphens only)',
    'tools': 'Add "tools": [] array with at least one tool definition',
    '_contextmesh': 'Add "_contextmesh": {} with version, tags, language, and repo',
    'version': 'Add "version": "1.0.0" in _contextmesh section',
    'tags': 'Add "tags": ["category"] in _contextmesh section',
    'language': 'Add "language": "typescript" in _contextmesh section',
    'repo': 'Add "repo": "https://github.com/..." in _contextmesh section',
    'name': 'Add "name": "Tool Name"',
    'description': 'Add "description": "What this tool does"'
  };
  
  return suggestions[property] || `Add the required "${property}" property`;
}

function getPatternSuggestion(schemaPath: string): string {
  if (schemaPath.includes('/id/')) {
    return 'Connector ID must be lowercase letters, numbers, and hyphens only (e.g., "my-connector")';
  }
  if (schemaPath.includes('/tags/')) {
    return 'Tags must be lowercase letters, numbers, and hyphens only (e.g., "github", "api-client")';
  }
  if (schemaPath.includes('/version/')) {
    return 'Version must follow semantic versioning (e.g., "1.0.0")';
  }
  return 'Value must match the required pattern';
}

function getFormatSuggestion(format: string): string {
  const suggestions: Record<string, string> = {
    'email': 'Must be a valid email address (e.g., "user@example.com")',
    'uri': 'Must be a valid URL (e.g., "https://github.com/user/repo")',
    'date-time': 'Must be a valid ISO 8601 date-time'
  };
  
  return suggestions[format] || `Must be a valid ${format}`;
}

function performSemanticValidation(manifest: ConnectorManifest): void {
  // Validate tools array is not empty
  if (!manifest.tools || manifest.tools.length === 0) {
    throw new Error('Connector must define at least one tool');
  }
  
  // Validate tool names are unique
  const toolNames = manifest.tools.map(tool => tool.name);
  const duplicates = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate tool names found: ${duplicates.join(', ')}`);
  }
  
  // Validate _contextmesh section exists (already checked by schema)
  if (!manifest._contextmesh) {
    throw new Error('Missing _contextmesh metadata section');
  }
  
  // Validate version format more strictly
  const version = manifest._contextmesh.version;
  const versionParts = version.split('.');
  if (versionParts.length !== 3 || versionParts.some(part => isNaN(Number(part)))) {
    throw new Error(`Invalid version format: ${version}. Must be semantic version (e.g., "1.0.0")`);
  }
  
  // Validate repo URL points to a valid git repository
  const repo = manifest._contextmesh.repo;
  if (!repo.includes('github.com') && !repo.includes('gitlab.com') && !repo.includes('bitbucket.org')) {
    console.warn(chalk.yellow(`⚠️  Repository URL should point to a known git hosting service: ${repo}`));
  }
}