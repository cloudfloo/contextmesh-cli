import { createReadStream, createWriteStream, existsSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import archiver from 'archiver';
import axios from 'axios';
import glob from 'glob';
import { PublishOptions, PublishResult, ConnectorManifest } from '../types';
import { loadManifest } from './manifest';
import chalk from 'chalk';

export async function publishConnector(options: PublishOptions): Promise<PublishResult> {
  const { directory, registryUrl = 'https://api.contextmesh.io', token } = options;
  
  if (!token) {
    throw new Error('Authentication token required. Set CONTEXTMESH_TOKEN environment variable or use --token flag.');
  }
  
  // Load and validate manifest
  const manifestPath = join(directory, 'connector.mcp.json');
  const manifest = loadManifest(manifestPath);
  
  // Create ZIP archive
  const zipPath = join(directory, '.contextmesh-publish.zip');
  const checksum = await createZipArchive(directory, zipPath);
  
  try {
    // Upload to registry
    const result = await uploadToRegistry(manifest, zipPath, checksum, registryUrl, token);
    
    // Clean up temporary ZIP
    if (existsSync(zipPath)) {
      const fs = await import('fs/promises');
      await fs.unlink(zipPath);
    }
    
    return result;
  } catch (error) {
    // Clean up on error
    if (existsSync(zipPath)) {
      const fs = await import('fs/promises');
      await fs.unlink(zipPath);
    }
    throw error;
  }
}

async function createZipArchive(directory: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    const hash = createHash('sha256');
    
    output.on('close', () => {
      const checksum = `sha256:${hash.digest('hex')}`;
      resolve(checksum);
    });
    
    archive.on('error', reject);
    archive.on('data', (chunk) => hash.update(chunk));
    
    archive.pipe(output);
    
    // Add files to archive, excluding common unnecessary files
    const files = glob.sync('**/*', {
      cwd: directory,
      ignore: [
        'node_modules/**',
        '.git/**',
        '*.log',
        '.DS_Store',
        'Thumbs.db',
        '.contextmesh-publish.zip',
        'dist/**',
        'build/**',
        '.env*',
        '*.tmp',
        '*.temp'
      ],
      dot: true,
      nodir: true
    });
    
    console.log(chalk.gray(`  Packaging ${files.length} files...`));
    
    files.forEach(file => {
      const filePath = join(directory, file);
      archive.file(filePath, { name: file });
    });
    
    archive.finalize();
  });
}

async function uploadToRegistry(
  manifest: ConnectorManifest,
  zipPath: string,
  checksum: string,
  registryUrl: string,
  token: string
): Promise<PublishResult> {
  // Update manifest with checksum
  const publishManifest = {
    ...manifest,
    _contextmesh: {
      ...manifest._contextmesh,
      checksum
    }
  };
  
  try {
    // Step 1: Create connector metadata
    const createResponse = await axios.post(
      `${registryUrl}/v1/connectors`,
      {
        manifest: publishManifest,
        readme: await loadReadme(dirname(zipPath))
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const { id, version, upload_url } = createResponse.data;
    
    // Step 2: Upload artifact to presigned URL
    if (upload_url) {
      const fileStream = createReadStream(zipPath);
      await axios.put(upload_url, fileStream, {
        headers: {
          'Content-Type': 'application/zip'
        }
      });
    }
    
    return {
      id,
      version,
      checksum,
      uploadUrl: upload_url
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || error.message;
      throw new Error(`Registry error: ${message}`);
    }
    throw error;
  }
}

async function loadReadme(directory: string): Promise<string | undefined> {
  const readmePaths = ['README.md', 'readme.md', 'Readme.md'];
  
  for (const readmePath of readmePaths) {
    const fullPath = join(directory, readmePath);
    if (existsSync(fullPath)) {
      const fs = await import('fs/promises');
      return await fs.readFile(fullPath, 'utf-8');
    }
  }
  
  return undefined;
}