import { createManifestIfMissing, loadManifest } from '../utils/manifest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('manifest utilities', () => {
  let testDir: string;
  
  beforeEach(() => {
    testDir = join(tmpdir(), `contextmesh-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });
  
  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });
  
  describe('createManifestIfMissing', () => {
    it('should create a manifest if it does not exist', async () => {
      const manifestPath = await createManifestIfMissing(testDir);
      
      expect(existsSync(manifestPath)).toBe(true);
      expect(manifestPath).toBe(join(testDir, 'connector.mcp.json'));
      
      const content = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      expect(content.schema).toBe('https://mcp.dev/schema/1.0');
      expect(content._contextmesh).toBeDefined();
      expect(content._contextmesh.version).toBe('0.1.0');
    });
    
    it('should not overwrite existing manifest', async () => {
      const existingManifest = {
        schema: 'https://mcp.dev/schema/1.0',
        id: 'existing-connector',
        tools: []
      };
      
      const manifestPath = join(testDir, 'connector.mcp.json');
      const fs = require('fs');
      fs.writeFileSync(manifestPath, JSON.stringify(existingManifest));
      
      const result = await createManifestIfMissing(testDir);
      
      expect(result).toBe(manifestPath);
      const content = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      expect(content.id).toBe('existing-connector');
    });
    
    it('should generate connector ID from directory name', async () => {
      const customDir = join(testDir, 'My-Test_Connector');
      mkdirSync(customDir);
      
      await createManifestIfMissing(customDir);
      
      const manifestPath = join(customDir, 'connector.mcp.json');
      const content = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      expect(content.id).toBe('my-test-connector');
    });
  });
  
  describe('loadManifest', () => {
    it('should load a valid manifest', () => {
      const manifest = {
        schema: 'https://mcp.dev/schema/1.0',
        id: 'test-connector',
        tools: []
      };
      
      const manifestPath = join(testDir, 'connector.mcp.json');
      const fs = require('fs');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      
      const loaded = loadManifest(manifestPath);
      expect(loaded).toEqual(manifest);
    });
    
    it('should throw on invalid JSON', () => {
      const manifestPath = join(testDir, 'connector.mcp.json');
      const fs = require('fs');
      fs.writeFileSync(manifestPath, '{ invalid json');
      
      expect(() => loadManifest(manifestPath)).toThrow();
    });
  });
});