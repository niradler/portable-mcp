#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { McpManager } from './index.js';
import { promptMode } from './prompt.js';

const program = new Command();

program
  .name('portable-mcp')
  .description('Manage MCP configurations across different environments')
  .version('0.0.2');

// Replace command
program
  .command('replace')
  .description('Replace the MCP configuration file')
  .option('--type <type>', 'Target application type (cursor|claude)')
  .option('--json-url <url>', 'URL to download the JSON configuration from')
  .option('--gist <gist>', 'GitHub Gist ID or ID/filename for multi-file gists')
  .option('--destination <path>', 'Custom destination path for the configuration file')
  .action(async (options) => {
    try {
      const manager = new McpManager();
      await manager.replace(options);
      console.log(chalk.green('✅ Configuration replaced successfully!'));
    } catch (error) {
      McpManager.handleCliError(error);
    }
  });

// Merge command
program
  .command('merge')
  .description('Merge configuration with existing MCP file')
  .option('--type <type>', 'Target application type (cursor|claude)')
  .option('--json-url <url>', 'URL to download the JSON configuration from')
  .option('--gist <gist>', 'GitHub Gist ID or ID/filename for multi-file gists')
  .option('--destination <path>', 'Custom destination path for the configuration file')
  .action(async (options) => {
    try {
      const manager = new McpManager();
      await manager.merge(options);
      console.log(chalk.green('✅ Configuration merged successfully!'));
    } catch (error) {
      McpManager.handleCliError(error);
    }
  });

// Path command
program
  .command('path')
  .description('Get the default configuration path for a type')
  .option('--type <type>', 'Target application type (cursor|claude)', 'cursor')
  .action((options) => {
    try {
      const manager = new McpManager();
      const path = manager.getDefaultPath(options.type);
      console.log(chalk.blue('📁 Default path:'), path);
    } catch (error) {
      McpManager.handleCliError(error);
    }
  });

// Store command
program
  .command('store')
  .description('Upload configuration to GitHub Gist')
  .option('--type <type>', 'Source application type (cursor|claude)')
  .option('--gist <gist>', 'GitHub Gist ID to update (optional, creates new if not provided)')
  .option('--private', 'Create private gist (default: public)', false)
  .option('--source <path>', 'Custom source path for the configuration file')
  .action(async (options) => {
    try {
      const manager = new McpManager();
      const result = await manager.store(options);
      McpManager.displayStoreResult(result);
    } catch (error) {
      McpManager.handleCliError(error);
    }
  });

// Prompt command (interactive mode)
program
  .command('prompt')
  .description('Interactive mode - asks questions to guide you through the process')
  .action(async () => {
    try {
      await promptMode();
    } catch (error) {
      McpManager.handleCliError(error);
    }
  });

// Default action when no command is provided
program.action(async () => {
  console.log(chalk.yellow('🤖 Welcome to Portable MCP Manager!'));
  console.log(chalk.gray('Starting interactive mode...\n'));
  try {
    await promptMode();
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
});

program.parse();
