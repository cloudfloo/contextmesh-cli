#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const platforms = [
  { target: 'node20-linux-x64', name: 'contextmesh-linux', ext: '' },
  { target: 'node20-win-x64', name: 'contextmesh-win', ext: '.exe' },
  { target: 'node20-macos-x64', name: 'contextmesh-macos', ext: '' },
  { target: 'node20-macos-arm64', name: 'contextmesh-macos-arm64', ext: '' }
];

console.log('🔨 Building TypeScript...');
execSync('npm run build', { stdio: 'inherit' });

console.log('📦 Building binaries...');

// Create binaries directory
const binariesDir = path.join(__dirname, '..', 'binaries');
if (!fs.existsSync(binariesDir)) {
  fs.mkdirSync(binariesDir, { recursive: true });
}

for (const platform of platforms) {
  const outputName = `${platform.name}${platform.ext}`;
  const outputPath = path.join(binariesDir, outputName);
  
  console.log(`Building ${outputName}...`);
  
  try {
    execSync(`pkg dist/cli.js --target ${platform.target} --output ${outputPath}`, {
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

// Create archives
console.log('📦 Creating archives...');

for (const platform of platforms) {
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
      execSync(`cd ${binariesDir} && 7z a ${archiveName} ${binaryName}`, { stdio: 'inherit' });
      console.log(`✅ Created ${archiveName}`);
    } else {
      // Create tar.gz for Unix-like systems
      const archiveName = `${platform.name}.tar.gz`;
      execSync(`cd ${binariesDir} && tar -czf ${archiveName} ${binaryName}`, { stdio: 'inherit' });
      console.log(`✅ Created ${archiveName}`);
    }
  } catch (error) {
    console.error(`❌ Error creating archive for ${binaryName}:`, error.message);
  }
}

console.log('🎉 All done!');