import { createReadStream, createWriteStream, existsSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import archiver from 'archiver';
import axios from 'axios';
import glob from 'glob';
import { PublishOptions, PublishResult, ConnectorManifest } from '../types';
import { loadManifest } from './manifest';
import chalk from 'chalk';
import { AuthenticationError, NetworkError, FileSystemError } from '../errors';
import { withRetry } from './retry';

export async function publishConnector(options: PublishOptions): Promise<PublishResult> {
  const { directory, registryUrl = 'https://api.contextmesh.io', token } = options;
  
  if (!token) {
    throw AuthenticationError.missingToken();
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
    
    archive.on('error', (err) => {
      reject(FileSystemError.cannotCreateZip(err.message));
    });
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
    // Step 1: Create connector metadata with retry
    const createResponse = await withRetry(
      async () => {
        return await axios.post(
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
      },
      {
        maxAttempts: 3,
        onRetry: (attempt, error, delay) => {
          console.log(chalk.yellow(`\n⟳ Retrying after ${delay / 1000}s (attempt ${attempt}/3)...`));
          if (error instanceof NetworkError) {
            console.log(chalk.gray(`  Reason: ${error.message}`));
          }
        }
      }
    );
    
    const { id, version, upload_url } = createResponse.data;
    
    // Step 2: Upload artifact to presigned URL (no retry for uploads to avoid duplicates)
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
      // Use the actual request URL if available, otherwise fall back to registryUrl
      const endpoint = error.config?.url || `${registryUrl}/v1/connectors`;
      throw NetworkError.fromAxiosError(error, endpoint);
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