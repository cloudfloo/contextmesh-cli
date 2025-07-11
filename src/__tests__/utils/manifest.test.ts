import { loadManifest, createManifestIfMissing } from '../../utils/manifest';
import { FileSystemError } from '../../errors';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// Mock fs functions
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn()
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('loadManifest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load valid manifest successfully', () => {
    const validManifest = {
      schema: 'https://mcp.dev/schema/1.0',
      id: 'test-connector',
      tools: [],
      _contextmesh: {
        version: '1.0.0',
        tags: ['test'],
        language: 'typescript',
        repo: 'https://github.com/test/repo'
      }
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));

    const result = loadManifest('/test/connector.mcp.json');

    expect(result).toEqual(validManifest);
    expect(mockExistsSync).toHaveBeenCalledWith('/test/connector.mcp.json');
    expect(mockReadFileSync).toHaveBeenCalledWith('/test/connector.mcp.json', 'utf-8');
  });

  it('should throw FileSystemError.fileNotFound when manifest does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    expect(() => {
      loadManifest('/test/missing.json');
    }).toThrow(FileSystemError);

    const error = (() => {
      try {
        loadManifest('/test/missing.json');
      } catch (e) {
        return e as FileSystemError;
      }
    })();

    expect(error?.code).toBe('FILESYSTEM_ERROR');
    expect(error?.message).toContain('File not found: /test/missing.json');
  });

  it('should throw FileSystemError for invalid JSON syntax', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{ invalid json syntax }');

    expect(() => {
      loadManifest('/test/invalid.json');
    }).toThrow(FileSystemError);

    const error = (() => {
      try {
        loadManifest('/test/invalid.json');
      } catch (e) {
        return e as FileSystemError;
      }
    })();

    expect(error?.code).toBe('FILESYSTEM_ERROR');
    expect(error?.message).toContain('Invalid JSON in manifest file');
    expect(error?.details.path).toBe('/test/invalid.json');
    expect(error?.details.operation).toBe('read');
    expect(error?.details.suggestion).toContain('Check for syntax errors');
  });

  it('should wrap Node.js file system errors', () => {
    mockExistsSync.mockReturnValue(true);
    
    const fsError = new Error('Permission denied') as NodeJS.ErrnoException;
    fsError.code = 'EACCES';
    fsError.path = '/test/protected.json';
    
    mockReadFileSync.mockImplementation(() => {
      throw fsError;
    });

    expect(() => {
      loadManifest('/test/protected.json');
    }).toThrow(FileSystemError);

    const error = (() => {
      try {
        loadManifest('/test/protected.json');
      } catch (e) {
        return e as FileSystemError;
      }
    })();

    expect(error?.code).toBe('FILESYSTEM_ERROR');
    expect(error?.details.errorCode).toBe('EACCES');
    expect(error?.details.operation).toBe('read');
  });

  it('should re-throw FileSystemError unchanged', () => {
    mockExistsSync.mockReturnValue(true);
    
    const originalError = new FileSystemError('Custom filesystem error');
    mockReadFileSync.mockImplementation(() => {
      throw originalError;
    });

    expect(() => {
      loadManifest('/test/test.json');
    }).toThrow(originalError);
  });

  it('should pass through unknown errors', () => {
    mockExistsSync.mockReturnValue(true);
    
    const unknownError = new Error('Unknown error type');
    mockReadFileSync.mockImplementation(() => {
      throw unknownError;
    });

    expect(() => {
      loadManifest('/test/test.json');
    }).toThrow(unknownError);
  });
});

describe('createManifestIfMissing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log to avoid output during tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return existing manifest path if file exists', async () => {
    mockExistsSync.mockReturnValue(true);

    const result = await createManifestIfMissing('/test/connector');

    expect(result).toBe('/test/connector/connector.mcp.json');
    expect(mockExistsSync).toHaveBeenCalledWith('/test/connector/connector.mcp.json');
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it('should create default manifest if file does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await createManifestIfMissing('/test/my-awesome-connector');

    expect(result).toBe('/test/my-awesome-connector/connector.mcp.json');
    expect(mockWriteFileSync).toHaveBeenCalled();

    const [path, content] = mockWriteFileSync.mock.calls[0];
    expect(path).toBe('/test/my-awesome-connector/connector.mcp.json');
    
    const manifest = JSON.parse(content as string);
    expect(manifest.id).toBe('my-awesome-connector');
    expect(manifest.name).toBe('My Awesome Connector');
    expect(manifest.schema).toBe('https://mcp.dev/schema/1.0');
    expect(manifest._contextmesh.version).toBe('0.1.0');
    expect(manifest._contextmesh.language).toBe('typescript');
    expect(manifest.tools).toHaveLength(1);
  });

  it('should sanitize directory name for connector ID', async () => {
    mockExistsSync.mockReturnValue(false);

    await createManifestIfMissing('/test/My_Invalid@Connector#Name!');

    const [, content] = mockWriteFileSync.mock.calls[0];
    const manifest = JSON.parse(content as string);
    
    expect(manifest.id).toBe('my-invalid-connector-name-');
  });

  it('should create proper connector name from ID', async () => {
    mockExistsSync.mockReturnValue(false);

    await createManifestIfMissing('/test/github-api-connector');

    const [, content] = mockWriteFileSync.mock.calls[0];
    const manifest = JSON.parse(content as string);
    
    expect(manifest.name).toBe('Github Api Connector');
  });
});