import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { ConnectorManifest } from '../types';
import { loadManifest } from './manifest';
import chalk from 'chalk';
import { ValidationError } from '../errors';

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
    throw ValidationError.fromAjvErrors(errors, rawContent);
  }
  
  // Additional semantic validation
  performSemanticValidation(manifest);
  
  console.log(chalk.green('✅ Manifest validation passed'));
  return manifest;
}

function performSemanticValidation(manifest: ConnectorManifest): void {
  // Validate tools array is not empty
  if (!manifest.tools || manifest.tools.length === 0) {
    throw new ValidationError('Connector must define at least one tool', {
      field: 'tools',
      suggestion: 'Add at least one tool to the "tools" array'
    });
  }
  
  // Validate tool names are unique
  const toolNames = manifest.tools.map(tool => tool.name);
  const duplicates = toolNames.filter((name: string, index: number) => toolNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    throw new ValidationError(`Duplicate tool names found: ${duplicates.join(', ')}`, {
      field: 'tools',
      suggestion: 'Each tool must have a unique name'
    });
  }
  
  // Validate _contextmesh section exists (already checked by schema)
  if (!manifest._contextmesh) {
    throw new ValidationError('Missing _contextmesh metadata section', {
      field: '_contextmesh',
      suggestion: 'Add "_contextmesh" section with version, tags, language, and repo'
    });
  }
  
  // Validate version format more strictly
  const version = manifest._contextmesh.version;
  const versionParts = version.split('.');
  if (versionParts.length !== 3 || versionParts.some(part => isNaN(Number(part)))) {
    throw new ValidationError(`Invalid version format: ${version}`, {
      field: '_contextmesh.version',
      suggestion: 'Use semantic versioning format (e.g., "1.0.0")'
    });
  }
  
  // Validate repo URL points to a valid git repository
  const repo = manifest._contextmesh.repo;
  if (!repo.includes('github.com') && !repo.includes('gitlab.com') && !repo.includes('bitbucket.org')) {
    console.warn(chalk.yellow(`⚠️  Repository URL should point to a known git hosting service: ${repo}`));
  }
}