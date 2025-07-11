import { Command } from 'commander';
import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { publishConnector } from '../utils/publisher';
import { validateManifest } from '../utils/validator';
import { createManifestIfMissing } from '../utils/manifest';
import { handleError } from '../errors';

export const publishCommand = new Command('publish')
  .description('Publish a connector to the ContextMesh registry')
  .argument('[directory]', 'Directory containing the connector (defaults to current directory)', '.')
  .option('-r, --registry <url>', 'Registry URL', process.env.CONTEXTMESH_REGISTRY || 'https://api.contextmesh.io')
  .option('-t, --token <token>', 'Authentication token', process.env.CONTEXTMESH_TOKEN)
  .option('--dry-run', 'Perform a dry run without uploading')
  .option('-v, --verbose', 'Show detailed error information')
  .action(async (directory: string, options) => {
    const spinner = ora();
    
    try {
      // Resolve directory path
      const connectorPath = resolve(process.cwd(), directory);
      console.log(chalk.blue(`📦 Publishing connector from: ${connectorPath}`));
      
      // Check if manifest exists, create if missing
      spinner.start('Checking for connector manifest...');
      const manifestPath = await createManifestIfMissing(connectorPath);
      spinner.succeed('Manifest found/created');
      
      // Validate manifest
      spinner.start('Validating connector manifest...');
      const manifest = await validateManifest(manifestPath);
      spinner.succeed(`Manifest validated: ${chalk.green(manifest.id)}`);
      
      // Publish connector
      if (options.dryRun) {
        console.log(chalk.yellow('🚧 Dry run mode - skipping upload'));
        console.log(chalk.gray('Would publish:'));
        console.log(chalk.gray(`  ID: ${manifest.id}`));
        console.log(chalk.gray(`  Version: ${manifest._contextmesh?.version || '0.1.0'}`));
        console.log(chalk.gray(`  Tags: ${manifest._contextmesh?.tags?.join(', ') || 'none'}`));
        return;
      }
      
      spinner.start('Publishing connector to registry...');
      const result = await publishConnector({
        directory: connectorPath,
        registryUrl: options.registry,
        token: options.token,
      });
      spinner.succeed('Connector published successfully!');
      
      // Display success message
      console.log('');
      console.log(chalk.green('✅ Published successfully!'));
      console.log(chalk.gray(`  ID: ${result.id}`));
      console.log(chalk.gray(`  Version: ${result.version}`));
      console.log(chalk.gray(`  Checksum: ${result.checksum}`));
      console.log('');
      console.log(chalk.blue('Install with:'));
      console.log(chalk.white(`  contextmesh install ${result.id}@${result.version}`));
      
    } catch (error) {
      spinner.fail('');
      handleError(error, options.verbose);
    }
  });