import { validateManifest } from '../utils/validator';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('validateManifest', () => {
  let testDir: string;
  
  beforeEach(() => {
    testDir = join(tmpdir(), `contextmesh-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });
  
  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });
  
  it('should validate a correct manifest', async () => {
    const manifest = {
      schema: 'https://mcp.dev/schema/1.0',
      id: 'test-connector',
      name: 'Test Connector',
      tools: [
        {
          name: 'test_tool',
          description: 'A test tool'
        }
      ],
      _contextmesh: {
        version: '1.0.0',
        tags: ['test'],
        language: 'typescript',
        repo: 'https://github.com/test/test'
      }
    };
    
    const manifestPath = join(testDir, 'connector.mcp.json');
    writeFileSync(manifestPath, JSON.stringify(manifest));
    
    const result = await validateManifest(manifestPath);
    expect(result.id).toBe('test-connector');
  });
  
  it('should fail on missing required fields', async () => {
    const manifest = {
      schema: 'https://mcp.dev/schema/1.0',
      id: 'test-connector',
      tools: []
    };
    
    const manifestPath = join(testDir, 'connector.mcp.json');
    writeFileSync(manifestPath, JSON.stringify(manifest));
    
    await expect(validateManifest(manifestPath)).rejects.toThrow('Manifest validation failed');
  });
  
  it('should fail on invalid connector ID', async () => {
    const manifest = {
      schema: 'https://mcp.dev/schema/1.0',
      id: 'Test_Connector', // Invalid: uppercase and underscore
      tools: [
        {
          name: 'test_tool',
          description: 'A test tool'
        }
      ],
      _contextmesh: {
        version: '1.0.0',
        tags: ['test'],
        language: 'typescript',
        repo: 'https://github.com/test/test'
      }
    };
    
    const manifestPath = join(testDir, 'connector.mcp.json');
    writeFileSync(manifestPath, JSON.stringify(manifest));
    
    await expect(validateManifest(manifestPath)).rejects.toThrow('Manifest validation failed');
  });
  
  it('should fail on invalid version format', async () => {
    const manifest = {
      schema: 'https://mcp.dev/schema/1.0',
      id: 'test-connector',
      tools: [
        {
          name: 'test_tool',
          description: 'A test tool'
        }
      ],
      _contextmesh: {
        version: '1.0', // Invalid: missing patch version
        tags: ['test'],
        language: 'typescript',
        repo: 'https://github.com/test/test'
      }
    };
    
    const manifestPath = join(testDir, 'connector.mcp.json');
    writeFileSync(manifestPath, JSON.stringify(manifest));
    
    await expect(validateManifest(manifestPath)).rejects.toThrow('Manifest validation failed');
  });
});