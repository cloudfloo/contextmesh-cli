import Ajv from 'ajv';
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
      minItems: 1,
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
  const manifest = loadManifest(manifestPath);
  
  const ajv = new Ajv({ allErrors: true, verbose: true });
  const validate = ajv.compile(mcpPackageSchema);
  
  const valid = validate(manifest);
  if (!valid) {
    const errors = validate.errors || [];
    console.error(chalk.red('\n❌ Manifest validation failed:'));
    
    errors.forEach((error) => {
      const path = error.instancePath || '/';
      const message = error.message || 'Unknown error';
      console.error(chalk.red(`  ${path}: ${message}`));
      
      if (error.params) {
        console.error(chalk.gray(`    Details: ${JSON.stringify(error.params)}`));
      }
    });
    
    throw new Error('Manifest validation failed');
  }
  
  // Additional validation
  if (!manifest._contextmesh) {
    throw new Error('Missing _contextmesh metadata section');
  }
  
  return manifest;
}