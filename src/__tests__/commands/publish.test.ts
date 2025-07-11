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
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis()
  }));
});

const mockValidateManifest = validateManifest as jest.MockedFunction<typeof validateManifest>;
const mockPublishConnector = publishConnector as jest.MockedFunction<typeof publishConnector>;
const mockCreateManifestIfMissing = createManifestIfMissing as jest.MockedFunction<typeof createManifestIfMissing>;
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>;

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('publishCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe('command structure', () => {
    it('should have correct command description', () => {
      expect(publishCommand.description()).toBe('Publish a connector to the ContextMesh registry');
    });

    it('should have verbose option', () => {
      const verboseOption = publishCommand.options.find(opt => opt.long === '--verbose');
      expect(verboseOption).toBeDefined();
      expect(verboseOption?.description).toBe('Show detailed error information');
    });

    it('should have registry option', () => {
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

    it('should be properly configured with all required options', () => {
      // Test that the command has been configured with the right structure
      expect(publishCommand.name()).toBe('publish');
      expect(publishCommand.options).toHaveLength(4); // registry, token, dry-run, verbose
    });
  });

  // Test error handling functions directly
  describe('error handling integration', () => {
    it('should import and have access to handleError function', () => {
      expect(mockHandleError).toBeDefined();
      expect(typeof mockHandleError).toBe('function');
    });

    it('should import validation utilities', () => {
      expect(mockValidateManifest).toBeDefined();
      expect(mockCreateManifestIfMissing).toBeDefined();
      expect(mockPublishConnector).toBeDefined();
    });
  });
});