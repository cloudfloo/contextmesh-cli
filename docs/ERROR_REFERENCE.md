# ContextMesh CLI Error Reference

This document provides a comprehensive guide to error messages you might encounter while using the ContextMesh CLI and how to resolve them.

## Error Types

### Validation Errors (VALIDATION_ERROR)

These errors occur when your connector manifest (`connector.mcp.json`) doesn't meet the required schema or contains invalid data.

#### Common Validation Errors

1. **Missing Required Property**
   ```
   ❌ Manifest validation failed: Missing required property: _contextmesh
     Field: root
     💡 Suggestion: Add "_contextmesh" section with version, tags, language, and repo
   ```
   **Solution**: Add the missing property to your manifest file.

2. **Invalid Format**
   ```
   ❌ Manifest validation failed: Invalid format: must match pattern "^[a-z0-9-]+$"
     Field: id
     Line: 3, Column: 3
     💡 Suggestion: Connector ID must contain only lowercase letters, numbers, and hyphens
   ```
   **Solution**: Fix the format according to the suggestion. In this case, use only lowercase letters, numbers, and hyphens.

3. **Invalid Version Format**
   ```
   ❌ Invalid version format: 1.0
     Field: _contextmesh.version
     💡 Suggestion: Use semantic versioning format (e.g., "1.0.0")
   ```
   **Solution**: Use proper semantic versioning with three parts: MAJOR.MINOR.PATCH

### Network Errors (NETWORK_ERROR)

These errors occur when the CLI cannot communicate with the ContextMesh registry.

#### HTTP Status Codes

1. **401 Unauthorized**
   ```
   ❌ HTTP 401: Authentication failed: Invalid or expired token
     Endpoint: POST https://api.contextmesh.io/v1/connectors
     💡 Suggestion: Check your CONTEXTMESH_TOKEN or use --token flag with a valid token
   ```
   **Solution**: 
   - Set a valid token: `export CONTEXTMESH_TOKEN="your-token"`
   - Or use the flag: `contextmesh publish --token "your-token"`

2. **409 Conflict**
   ```
   ❌ HTTP 409: Conflict: Resource already exists
     💡 Suggestion: This version may already be published. Try incrementing the version number
   ```
   **Solution**: Update the version number in your manifest's `_contextmesh.version` field.

3. **413 Payload Too Large**
   ```
   ❌ HTTP 413: Payload too large: Connector package exceeds size limit
     💡 Suggestion: Reduce the size of your connector package (check for large files)
   ```
   **Solution**: Check your connector directory for large files that shouldn't be included. Add them to `.gitignore`.

4. **429 Rate Limit**
   ```
   ❌ HTTP 429: Rate limit exceeded
     ⟳ This error may be temporary. You can try again. Wait 60 seconds before retrying.
   ```
   **Solution**: Wait for the specified time and try again. The CLI will automatically retry if possible.

#### Connection Errors

1. **Connection Refused**
   ```
   ❌ Connection refused: Cannot reach the registry server
     💡 Suggestion: Check your internet connection and the registry URL
   ```
   **Solution**: 
   - Check your internet connection
   - Verify the registry URL is correct
   - Check if you're behind a proxy

2. **Timeout**
   ```
   ❌ Request timeout: Server took too long to respond
     ⟳ This error may be temporary. You can try again.
   ```
   **Solution**: Try again. If the problem persists, check your network connection.

### Authentication Errors (AUTH_ERROR)

These errors relate to authentication and authorization issues.

1. **Missing Token**
   ```
   ❌ No authentication token provided
     Token present: No
     💡 Suggestion: Set CONTEXTMESH_TOKEN environment variable or use --token flag
       Example: export CONTEXTMESH_TOKEN="your-token-here"
       Or: contextmesh publish --token "your-token-here"
   ```
   **Solution**: Obtain a token from https://app.contextmesh.io/settings/tokens and set it as shown.

2. **Expired Token**
   ```
   ❌ Authentication token has expired
     Token present: Yes
     💡 Suggestion: Your token has expired. Generate a new one:
       1. Visit https://app.contextmesh.io/settings/tokens
       2. Generate a new API token
       3. Update your CONTEXTMESH_TOKEN environment variable
   ```
   **Solution**: Generate a new token and update your environment variable.

### File System Errors (FILESYSTEM_ERROR)

These errors occur when the CLI cannot access or manipulate files on your system.

1. **File Not Found**
   ```
   ❌ File not found: /path/to/connector.mcp.json
     Path: /path/to/connector.mcp.json
     Operation: read
     Error code: ENOENT
     💡 Suggestion: Make sure the file exists and the path is correct
   ```
   **Solution**: Verify the file exists or run the command from the correct directory.

2. **Permission Denied**
   ```
   ❌ Permission denied: Cannot write /protected/path
     Path: /protected/path
     Operation: write
     Error code: EACCES
     💡 Suggestion: Check file permissions or run with appropriate privileges
   ```
   **Solution**: 
   - Check file permissions: `ls -la <file>`
   - Change permissions if needed: `chmod 644 <file>`
   - Run with appropriate user privileges

3. **Invalid JSON**
   ```
   ❌ Invalid JSON in manifest file: Unexpected token } in JSON at position 245
     Path: connector.mcp.json
     Operation: read
     💡 Suggestion: Check for syntax errors in your connector.mcp.json file
   ```
   **Solution**: Use a JSON validator or editor to fix syntax errors in your manifest.

## Debugging Tips

### Verbose Mode

Use the `-v` or `--verbose` flag to get detailed error information including stack traces:

```bash
contextmesh publish -v
```

### Common Solutions

1. **Check Your Manifest**
   - Validate JSON syntax using a JSON validator
   - Ensure all required fields are present
   - Check that values match the expected format

2. **Network Issues**
   - Verify your internet connection
   - Check if you're behind a corporate proxy
   - Try using a different network

3. **Authentication**
   - Ensure your token hasn't expired
   - Verify the token has the correct permissions
   - Try generating a new token

4. **File System**
   - Run commands from the connector directory
   - Check file and directory permissions
   - Ensure you have enough disk space

## Exit Codes

The CLI uses specific exit codes for different error types:

- `0`: Success
- `1`: General error
- `2`: Authentication error
- `3`: Validation error
- `4`: Network error
- `5`: File system error

You can use these in scripts to handle specific error cases:

```bash
contextmesh publish
if [ $? -eq 2 ]; then
  echo "Authentication failed. Please check your token."
fi
```

## Getting Help

If you continue to experience issues:

1. Use verbose mode (`-v`) to get more details
2. Check the [ContextMesh documentation](https://docs.contextmesh.io)
3. Report issues at https://github.com/contextmesh/cli/issues