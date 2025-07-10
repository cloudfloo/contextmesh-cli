import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { ConnectorManifest } from '../types';
import chalk from 'chalk';

export async function createManifestIfMissing(directory: string): Promise<string> {
  const manifestPath = join(directory, 'connector.mcp.json');
  
  if (existsSync(manifestPath)) {
    return manifestPath;
  }
  
  console.log(chalk.yellow('⚠️  No connector.mcp.json found, creating one...'));
  
  // Get connector ID from directory name
  const connectorId = basename(directory).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  const defaultManifest: ConnectorManifest = {
    schema: 'https://mcp.dev/schema/1.0',
    id: connectorId,
    name: connectorId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: 'A ContextMesh connector',
    tools: [
      {
        name: 'example_tool',
        description: 'An example tool - please update this',
        input_schema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          },
          required: ['input']
        },
        output_schema: {
          type: 'object',
          properties: {
            result: { type: 'string' }
          }
        }
      }
    ],
    _contextmesh: {
      version: '0.1.0',
      tags: ['example'],
      language: 'typescript',
      repo: `https://github.com/contextmesh/${connectorId}`,
      author: {
        name: 'Your Name',
        email: 'your.email@example.com'
      },
      license: 'MIT'
    }
  };
  
  writeFileSync(manifestPath, JSON.stringify(defaultManifest, null, 2));
  console.log(chalk.green(`✅ Created ${manifestPath}`));
  console.log(chalk.yellow('   Please update the manifest with your connector details before publishing.'));
  
  return manifestPath;
}

export function loadManifest(manifestPath: string): ConnectorManifest {
  const content = readFileSync(manifestPath, 'utf-8');
  return JSON.parse(content);
}