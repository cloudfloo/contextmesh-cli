#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { publishCommand } from './commands/publish';

function getPackageVersion(): string {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
    );
    return packageJson.version;
  } catch {
    return '0.1.0';
  }
}

const program = new Command();

program
  .name('contextmesh')
  .description('CLI tool for ContextMesh - npm-like package manager for MCP connectors')
  .version(getPackageVersion());

// Add commands
program.addCommand(publishCommand);

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
