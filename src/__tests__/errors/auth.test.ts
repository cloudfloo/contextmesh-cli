import { AuthenticationError } from '../../errors/auth';

describe('AuthenticationError', () => {
  describe('constructor', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Auth failed');
      
      expect(error.message).toBe('Auth failed');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should include auth details', () => {
      const error = new AuthenticationError('Token invalid', {
        tokenSource: 'environment',
        tokenPresent: true
      });
      
      expect(error.details.tokenSource).toBe('environment');
      expect(error.details.tokenPresent).toBe(true);
    });
  });

  describe('static factory methods', () => {
    describe('missingToken', () => {
      it('should create missing token error', () => {
        const error = AuthenticationError.missingToken();
        
        expect(error.message).toBe('No authentication token provided');
        expect(error.details.tokenPresent).toBe(false);
        expect(error.details.suggestion).toContain('CONTEXTMESH_TOKEN');
        expect(error.details.suggestion).toContain('--token flag');
      });
    });

    describe('invalidToken', () => {
      it('should create invalid token error with default source', () => {
        const error = AuthenticationError.invalidToken();
        
        expect(error.message).toBe('Invalid authentication token');
        expect(error.details.tokenSource).toBe('environment');
        expect(error.details.tokenPresent).toBe(true);
        expect(error.details.suggestion).toContain('expired or invalid');
        expect(error.details.suggestion).toContain('app.contextmesh.io/settings/tokens');
      });

      it('should create invalid token error with custom source', () => {
        const error = AuthenticationError.invalidToken('flag');
        
        expect(error.details.tokenSource).toBe('flag');
      });
    });

    describe('expiredToken', () => {
      it('should create expired token error', () => {
        const error = AuthenticationError.expiredToken();
        
        expect(error.message).toBe('Authentication token has expired');
        expect(error.details.tokenPresent).toBe(true);
        expect(error.details.suggestion).toContain('expired');
        expect(error.details.suggestion).toContain('Generate a new one');
      });
    });

    describe('insufficientPermissions', () => {
      it('should create insufficient permissions error', () => {
        const error = AuthenticationError.insufficientPermissions('publish connectors');
        
        expect(error.message).toBe('Insufficient permissions to publish connectors');
        expect(error.details.tokenPresent).toBe(true);
        expect(error.details.suggestion).toContain('write:connectors');
        expect(error.details.suggestion).toContain('proper permissions');
      });
    });
  });

  describe('format', () => {
    it('should format with token source', () => {
      const error = new AuthenticationError('Auth failed', {
        tokenSource: 'flag',
        tokenPresent: true
      });
      
      const formatted = error.format();
      
      expect(formatted).toContain('Auth failed');
      expect(formatted).toContain('Token source: flag');
      expect(formatted).toContain('Token present: Yes');
    });

    it('should format without token', () => {
      const error = new AuthenticationError('No token', {
        tokenPresent: false
      });
      
      const formatted = error.format();
      
      expect(formatted).toContain('Token present: No');
    });

    it('should handle verbose mode', () => {
      const error = new AuthenticationError('Auth error');
      const formatted = error.format(true);
      
      expect(formatted).toContain('Stack trace:');
    });
  });
});