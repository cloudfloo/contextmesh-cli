import { validateManifest } from '../utils/validator';
import { ValidationError } from '../errors';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock console methods to avoid cluttering test output
const originalConsole = global.console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };
});

afterAll(() => {
  global.console = originalConsole;
});

describe('Enhanced Manifest Validation', () => {
  let testDir: string;
  
  beforeEach(() => {
    testDir = join(tmpdir(), `contextmesh-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });
  
  describe('Valid Manifests', () => {
    it('should validate a correct manifest', async () => {
      const manifest = {
        schema: 'https://mcp.dev/schema/1.0',
        id: 'test-connector',
        name: 'Test Connector',
        description: 'A test connector for validation',
        tools: [
          {
            name: 'test_tool',
            description: 'A test tool',
            input_schema: {
              type: 'object',
              properties: {
                input: { type: 'string' }
              }
            }
          }
        ],
        _contextmesh: {
          version: '1.0.0',
          tags: ['test', 'validation'],
          language: 'typescript',
          repo: 'https://github.com/test/test-connector',
          author: {
            name: 'Test Author',
            email: 'test@example.com'
          },
          license: 'MIT'
        }
      };
      
      const manifestPath = join(testDir, 'connector.mcp.json');
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      
      const result = await validateManifest(manifestPath);
      expect(result.id).toBe('test-connector');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Validating connector manifest'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Manifest validation passed'));
    });

    it('should validate manifest with minimal required fields', async () => {
      const manifest = {
        schema: 'https://mcp.dev/schema/1.0',
        id: 'minimal-connector',
        tools: [
          {
            name: 'minimal_tool',
            description: 'A minimal tool'
          }
        ],
        _contextmesh: {
          version: '0.1.0',
          tags: ['minimal'],
          language: 'python',
          repo: 'https://github.com/test/minimal'
        }
      };
      
      const manifestPath = join(testDir, 'connector.mcp.json');
      writeFileSync(manifestPath, JSON.stringify(manifest));
      
      const result = await validateManifest(manifestPath);
      expect(result.id).toBe('minimal-connector');
    });
  });

  describe('Schema Validation Errors', () => {
    it('should fail on missing required fields with helpful messages', async () => {
      const manifest = {
        schema: 'https://mcp.dev/schema/1.0',
        id: 'test-connector',
        tools: []
      };
      
      const manifestPath = join(testDir, 'connector.mcp.json');
      writeFileSync(manifestPath, JSON.stringify(manifest));
      
      await expect(validateManifest(manifestPath)).rejects.toThrow(ValidationError);
      
      try {
        await validateManifest(manifestPath);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Missing required property: _contextmesh');
        expect((error as ValidationError).details.field).toBe('root');
      }
    });
    
    it('should fail on invalid connector ID with suggestion', async () => {
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
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      
      await expect(validateManifest(manifestPath)).rejects.toThrow(ValidationError);
      
      try {
        await validateManifest(manifestPath);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Invalid format');
        expect((error as ValidationError).details.field).toBe('id');
        expect((error as ValidationError).details.line).toBe(3); // Line where "id" appears
      }
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
      
      await expect(validateManifest(manifestPath)).rejects.toThrow(ValidationError);
    });

    it('should fail on invalid email format', async () => {
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
          version: '1.0.0',
          tags: ['test'],
          language: 'typescript',
          repo: 'https://github.com/test/test',
          author: {
            name: 'Test Author',
            email: 'invalid-email' // Invalid email format
          }
        }
      };
      
      const manifestPath = join(testDir, 'connector.mcp.json');
      writeFileSync(manifestPath, JSON.stringify(manifest));
      
      await expect(validateManifest(manifestPath)).rejects.toThrow(ValidationError);
    });

    it('should fail on invalid URL format', async () => {
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
          version: '1.0.0',
          tags: ['test'],
          language: 'typescript',
          repo: 'not-a-url' // Invalid URL format
        }
      };
      
      const manifestPath = join(testDir, 'connector.mcp.json');
      writeFileSync(manifestPath, JSON.stringify(manifest));
      
      await expect(validateManifest(manifestPath)).rejects.toThrow(ValidationError);
    });
  });

  describe('Semantic Validation', () => {
    it('should fail on empty tools array', async () => {
      const manifest = {
        schema: 'https://mcp.dev/schema/1.0',
        id: 'test-connector',
        tools: [], // Empty tools array
        _contextmesh: {
          version: '1.0.0',
          tags: ['test'],
          language: 'typescript',
          repo: 'https://github.com/test/test'
        }
      };
      
      const manifestPath = join(testDir, 'connector.mcp.json');
      writeFileSync(manifestPath, JSON.stringify(manifest));
      
      await expect(validateManifest(manifestPath)).rejects.toThrow(ValidationError);
      
      try {
        await validateManifest(manifestPath);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Connector must define at least one tool');
      }
    });

    it('should fail on duplicate tool names', async () => {
      const manifest = {
        schema: 'https://mcp.dev/schema/1.0',
        id: 'test-connector',
        tools: [
          {
            name: 'duplicate_tool',
            description: 'First tool'
          },
          {
            name: 'duplicate_tool', // Duplicate name
            description: 'Second tool'
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
      
      await expect(validateManifest(manifestPath)).rejects.toThrow(ValidationError);
      
      try {
        await validateManifest(manifestPath);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Duplicate tool names found: duplicate_tool');
      }
    });

    it('should warn on non-standard repository URL', async () => {
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
          version: '1.0.0',
          tags: ['test'],
          language: 'typescript',
          repo: 'https://example.com/repo' // Non-standard git hosting
        }
      };
      
      const manifestPath = join(testDir, 'connector.mcp.json');
      writeFileSync(manifestPath, JSON.stringify(manifest));
      
      const result = await validateManifest(manifestPath);
      expect(result.id).toBe('test-connector');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Repository URL should point to a known git hosting service'));
    });
  });

  describe('Error Reporting', () => {
    it('should provide line numbers and suggestions for validation errors', async () => {
      const invalidManifest = `{
  "schema": "https://mcp.dev/schema/1.0",
  "id": "Invalid_ID",
  "tools": [],
  "_contextmesh": {
    "version": "invalid-version",
    "tags": [],
    "language": "unknown",
    "repo": "not-a-url"
  }
}`;
      
      const manifestPath = join(testDir, 'connector.mcp.json');
      writeFileSync(manifestPath, invalidManifest);
      
      await expect(validateManifest(manifestPath)).rejects.toThrow(ValidationError);
      
      try {
        await validateManifest(manifestPath);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details.line).toBeDefined();
        expect(validationError.details.field).toBeDefined();
      }
    });
  });
});