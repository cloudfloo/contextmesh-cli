import { publishCommand } from '../../commands/publish';
import { handleError } from '../../errors';
import { validateManifest } from '../../utils/validator';
import { publishConnector } from '../../utils/publisher';
import { createManifestIfMissing } from '../../utils/manifest';

// Mock dependencies
jest.mock('../../utils/validator');
jest.mock('../../utils/publisher');
jest.mock('../../utils/manifest');
jest.mock('../../errors');

const mockValidateManifest = validateManifest as jest.MockedFunction<typeof validateManifest>;
const mockPublishConnector = publishConnector as jest.MockedFunction<typeof publishConnector>;
const mockCreateManifestIfMissing = createManifestIfMissing as jest.MockedFunction<typeof createManifestIfMissing>;
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>;

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((code?: number): never => {
  throw new Error(`Process exited with code ${code}`);
});

describe('publishCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockCreateManifestIfMissing.mockResolvedValue('/test/connector.mcp.json');
    mockValidateManifest.mockResolvedValue({
      id: 'test-connector',
      schema: 'https://mcp.dev/schema/1.0',
      tools: [],
      _contextmesh: {
        version: '1.0.0',
        tags: ['test'],
        language: 'typescript',
        repo: 'https://github.com/test/connector'
      }
    } as any);
    mockPublishConnector.mockResolvedValue({
      id: 'test-connector',
      version: '1.0.0',
      checksum: 'sha256:abcd1234',
      uploadUrl: 'https://upload.example.com'
    });
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockProcessExit.mockRestore();
  });

  describe('successful publish', () => {
    it('should publish connector successfully with default options', async () => {
      const mockAction = publishCommand._optionFor('action') as any;
      
      await mockAction('.', {
        registry: 'https://api.contextmesh.io',
        dryRun: false,
        verbose: false
      });

      expect(mockCreateManifestIfMissing).toHaveBeenCalledWith(expect.stringContaining('.'));
      expect(mockValidateManifest).toHaveBeenCalledWith('/test/connector.mcp.json');
      expect(mockPublishConnector).toHaveBeenCalledWith({
        directory: expect.stringContaining('.'),
        registryUrl: 'https://api.contextmesh.io',
        token: undefined
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ Published successfully!'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('contextmesh install test-connector@1.0.0'));
    });

    it('should handle dry-run mode', async () => {
      const mockAction = publishCommand._optionFor('action') as any;
      
      await mockAction('.', {
        registry: 'https://api.contextmesh.io',
        dryRun: true,
        verbose: false
      });

      expect(mockCreateManifestIfMissing).toHaveBeenCalled();
      expect(mockValidateManifest).toHaveBeenCalled();
      expect(mockPublishConnector).not.toHaveBeenCalled(); // Should skip upload in dry-run

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🚧 Dry run mode'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Would publish:'));
    });

    it('should use custom registry and token', async () => {
      const mockAction = publishCommand._optionFor('action') as any;
      
      await mockAction('./my-connector', {
        registry: 'https://custom.registry.io',
        token: 'custom-token',
        dryRun: false,
        verbose: false
      });

      expect(mockPublishConnector).toHaveBeenCalledWith({
        directory: expect.stringContaining('my-connector'),
        registryUrl: 'https://custom.registry.io',
        token: 'custom-token'
      });
    });
  });

  describe('error handling', () => {
    it('should call handleError on validation failure', async () => {
      const validationError = new Error('Validation failed');
      mockValidateManifest.mockRejectedValue(validationError);

      const mockAction = publishCommand._optionFor('action') as any;
      
      await mockAction('.', {
        registry: 'https://api.contextmesh.io',
        dryRun: false,
        verbose: false
      });

      expect(mockHandleError).toHaveBeenCalledWith(validationError, false);
    });

    it('should call handleError on publish failure', async () => {
      const publishError = new Error('Publish failed');
      mockPublishConnector.mockRejectedValue(publishError);

      const mockAction = publishCommand._optionFor('action') as any;
      
      await mockAction('.', {
        registry: 'https://api.contextmesh.io',
        dryRun: false,
        verbose: false
      });

      expect(mockHandleError).toHaveBeenCalledWith(publishError, false);
    });

    it('should pass verbose flag to handleError', async () => {
      const error = new Error('Test error');
      mockValidateManifest.mockRejectedValue(error);

      const mockAction = publishCommand._optionFor('action') as any;
      
      await mockAction('.', {
        registry: 'https://api.contextmesh.io',
        dryRun: false,
        verbose: true
      });

      expect(mockHandleError).toHaveBeenCalledWith(error, true);
    });

    it('should call handleError on manifest creation failure', async () => {
      const manifestError = new Error('Cannot create manifest');
      mockCreateManifestIfMissing.mockRejectedValue(manifestError);

      const mockAction = publishCommand._optionFor('action') as any;
      
      await mockAction('.', {
        registry: 'https://api.contextmesh.io',
        dryRun: false,
        verbose: false
      });

      expect(mockHandleError).toHaveBeenCalledWith(manifestError, false);
    });
  });

  describe('command options', () => {
    it('should have correct command description', () => {
      expect(publishCommand.description()).toBe('Publish a connector to the ContextMesh registry');
    });

    it('should have verbose option', () => {
      const verboseOption = publishCommand.options.find(opt => opt.long === '--verbose');
      expect(verboseOption).toBeDefined();
      expect(verboseOption?.description).toBe('Show detailed error information');
    });

    it('should have registry option with default', () => {
      const registryOption = publishCommand.options.find(opt => opt.long === '--registry');
      expect(registryOption).toBeDefined();
      expect(registryOption?.description).toBe('Registry URL');
    });

    it('should have token option', () => {
      const tokenOption = publishCommand.options.find(opt => opt.long === '--token');
      expect(tokenOption).toBeDefined();
      expect(tokenOption?.description).toBe('Authentication token');
    });

    it('should have dry-run option', () => {
      const dryRunOption = publishCommand.options.find(opt => opt.long === '--dry-run');
      expect(dryRunOption).toBeDefined();
      expect(dryRunOption?.description).toBe('Perform a dry run without uploading');
    });
  });

  describe('directory handling', () => {
    it('should resolve relative directory paths', async () => {
      const mockAction = publishCommand._optionFor('action') as any;
      
      await mockAction('./relative/path', {
        registry: 'https://api.contextmesh.io',
        dryRun: false,
        verbose: false
      });

      expect(mockCreateManifestIfMissing).toHaveBeenCalledWith(expect.stringContaining('relative/path'));
    });

    it('should use current directory as default', async () => {
      const mockAction = publishCommand._optionFor('action') as any;
      
      await mockAction('.', {
        registry: 'https://api.contextmesh.io',
        dryRun: false,
        verbose: false
      });

      expect(mockCreateManifestIfMissing).toHaveBeenCalledWith(expect.stringContaining('.'));
    });
  });
});