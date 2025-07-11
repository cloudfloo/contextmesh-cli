export interface ConnectorManifest {
  schema: string;
  id: string;
  name?: string;
  description?: string;
  tools: Tool[];
  auth?: Auth;
  _contextmesh?: ContextMeshMetadata;
}

export interface Tool {
  name: string;
  description: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
}

export interface Auth {
  type: 'oauth2' | 'api_key' | 'basic';
  authorization_url?: string;
  token_url?: string;
  scopes?: string[];
  location?: string;
  name?: string;
  scheme?: string;
}

export interface ContextMeshMetadata {
  version: string;
  tags: string[];
  language: 'typescript' | 'python' | 'rust' | 'go' | 'java';
  repo: string;
  checksum?: string;
  tested_with?: string[];
  author?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: string;
}

export interface PublishOptions {
  directory: string;
  registryUrl?: string;
  token?: string;
  dryRun?: boolean;
}

export interface PublishResult {
  id: string;
  version: string;
  checksum: string;
  uploadUrl?: string;
}