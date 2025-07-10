#!/usr/bin/env node

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const platforms = [
  { target: 'node18-linux-x64', name: 'contextmesh-linux', ext: '', platform: 'linux', arch: 'x64' },
  { target: 'node18-win-x64', name: 'contextmesh-win', ext: '.exe', platform: 'win', arch: 'x64' },
  { target: 'node18-macos-x64', name: 'contextmesh-macos', ext: '', platform: 'macos', arch: 'x64' },
  { target: 'node18-macos-arm64', name: 'contextmesh-macos-arm64', ext: '', platform: 'macos', arch: 'arm64' }
];

// Parse command line arguments for CI use
const args = process.argv.slice(2);
const targetPlatform = args.find(arg => arg.startsWith('--platform='))?.split('=')[1];
const targetArch = args.find(arg => arg.startsWith('--arch='))?.split('=')[1];
const skipArchives = args.includes('--no-archives');

// Filter platforms if specific target requested
let platformsToBuild = platforms;
if (targetPlatform && targetArch) {
  platformsToBuild = platforms.filter(p => p.platform === targetPlatform && p.arch === targetArch);
  if (platformsToBuild.length === 0) {
    console.error(`❌ No platform found for ${targetPlatform}-${targetArch}`);
    process.exit(1);
  }
}

console.log('🔨 Building TypeScript...');
execSync('npm run build', { stdio: 'inherit' });

console.log(`📦 Building binaries for ${platformsToBuild.length} platform(s)...`);

// Create binaries directory
const binariesDir = path.join(__dirname, '..', 'binaries');
if (!fs.existsSync(binariesDir)) {
  fs.mkdirSync(binariesDir, { recursive: true });
}

for (const platform of platformsToBuild) {
  const outputName = `${platform.name}${platform.ext}`;
  const outputPath = path.join(binariesDir, outputName);
  
  console.log(`Building ${outputName}...`);
  
  try {
    execFileSync('pkg', ['dist/cli.js', '--target', platform.target, '--output', outputPath], {
      stdio: 'inherit'
    });
    
    // Check if binary was created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`✅ ${outputName} created (${Math.round(stats.size / 1024 / 1024)}MB)`);
    } else {
      console.error(`❌ Failed to create ${outputName}`);
    }
  } catch (error) {
    console.error(`❌ Error building ${outputName}:`, error.message);
  }
}

console.log('🎉 Binary building complete!');

// Create archives (skip if requested)
if (!skipArchives) {
  console.log('📦 Creating archives...');

  for (const platform of platformsToBuild) {
  const binaryName = `${platform.name}${platform.ext}`;
  const binaryPath = path.join(binariesDir, binaryName);
  
  if (!fs.existsSync(binaryPath)) {
    console.log(`⚠️  Skipping archive for ${binaryName} (binary not found)`);
    continue;
  }
  
  try {
    if (platform.target.includes('win')) {
      // Create ZIP for Windows
      const archiveName = `${platform.name}.zip`;
      execSync(`7z a ${archiveName} ${binaryName}`, { cwd: binariesDir, stdio: 'inherit' });
      console.log(`✅ Created ${archiveName}`);
    } else {
      // Create tar.gz for Unix-like systems
      const archiveName = `${platform.name}.tar.gz`;
      execSync(`tar -czf ${archiveName} ${binaryName}`, { cwd: binariesDir, stdio: 'inherit' });
      console.log(`✅ Created ${archiveName}`);
    }
  } catch (error) {
    console.error(`❌ Error creating archive for ${binaryName}:`, error.message);
  }
}

  console.log('🎉 Archives created!');
} else {
  console.log('⏭️  Skipping archive creation');
}

console.log('🎉 All done!');