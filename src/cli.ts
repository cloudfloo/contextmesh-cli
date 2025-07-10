#!/usr/bin/env node

import { Command } from 'commander';
import { publishCommand } from './commands/publish';

const program = new Command();

program
  .name('contextmesh')
  .description('CLI tool for ContextMesh - npm-like package manager for MCP connectors')
  .version('0.1.0');

// Add commands
program.addCommand(publishCommand);

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}