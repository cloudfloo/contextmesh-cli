# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in ContextMesh CLI, please report it to us through one of the following methods:

### GitHub Security Advisories (Preferred)
1. Go to our [repository](https://github.com/cloudfloo/contextmesh-cli)
2. Click on the "Security" tab
3. Click "Report a vulnerability"
4. Fill out the security advisory form

### Email
Send an email to: security@cloudfloo.io

Please include:
- A clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes or mitigations

## Security Measures

### Automated Security Checks
- **npm audit**: Runs on every CI build to check for known vulnerabilities
- **Snyk**: Daily security scans for dependency vulnerabilities
- **CodeQL**: Static analysis for security issues
- **Dependabot**: Automated dependency updates for security patches

### Secure Development Practices
- All dependencies are regularly updated
- Security patches are prioritized and released quickly
- Code is reviewed for security implications
- Secrets and tokens are managed securely

### Release Security
- All releases are signed and verified
- NPM packages are published with 2FA enabled
- Binary releases include checksums for verification

## Response Timeline

- **Critical vulnerabilities**: Patch within 24 hours
- **High severity**: Patch within 1 week
- **Medium/Low severity**: Patch in next scheduled release

## Security Updates

Security updates will be communicated through:
- GitHub Security Advisories
- Release notes
- NPM security advisories
- Project documentation

Thank you for helping keep ContextMesh CLI secure!