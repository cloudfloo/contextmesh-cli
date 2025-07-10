# ContextMesh CLI

The official CLI tool for ContextMesh - an npm-like package manager for Model Context Protocol (MCP) connectors.

## Installation

```bash
npm install -g @contextmesh/cli
```

## Quick Start

### Publishing a Connector

```bash
# From your connector directory
contextmesh publish

# Or specify a directory
contextmesh publish ./my-connector

# Dry run to see what would be published
contextmesh publish --dry-run
```

## Commands

### `publish [directory]`

Publish a connector to the ContextMesh registry.

**Arguments:**
- `directory` - Directory containing the connector (defaults to current directory)

**Options:**
- `-r, --registry <url>` - Registry URL (default: https://api.contextmesh.io)
- `-t, --token <token>` - Authentication token (can also use CONTEXTMESH_TOKEN env var)
- `--dry-run` - Perform a dry run without uploading

**Example:**
```bash
contextmesh publish ./my-connector --token YOUR_TOKEN
```

## Connector Manifest

Every connector must have a `connector.mcp.json` file. If missing, the CLI will create a template for you.

Example manifest:
```json
{
  "schema": "https://mcp.dev/schema/1.0",
  "id": "my-connector",
  "name": "My Connector",
  "description": "Description of your connector",
  "tools": [
    {
      "name": "example_tool",
      "description": "What this tool does",
      "input_schema": {
        "type": "object",
        "properties": {
          "input": { "type": "string" }
        }
      }
    }
  ],
  "_contextmesh": {
    "version": "1.0.0",
    "tags": ["category", "another-tag"],
    "language": "typescript",
    "repo": "https://github.com/yourusername/my-connector",
    "author": {
      "name": "Your Name",
      "email": "your.email@example.com"
    },
    "license": "MIT"
  }
}
```

## Environment Variables

- `CONTEXTMESH_TOKEN` - Authentication token for the registry
- `CONTEXTMESH_REGISTRY` - Custom registry URL (default: https://api.contextmesh.io)

## Development

```bash
# Clone the repository
git clone https://github.com/cloudfloo/contextmesh-cli.git
cd contextmesh-cli

# Install dependencies
npm install

# Run in development mode
npm run dev publish ./test-connector

# Run tests
npm test

# Build
npm run build
```

## License

MIT