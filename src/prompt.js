import inquirer from 'inquirer';
import chalk from 'chalk';
import { McpManager } from './index.js';

export async function promptMode() {
  console.log(chalk.blue('🚀 Welcome to Interactive MCP Manager!'));
  console.log(chalk.gray('Let\'s help you manage your MCP configurations.\n'));

  const manager = new McpManager();

  // First question: What do you want to do?
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '📥 Replace configuration file', value: 'replace' },
        { name: '🔄 Merge with existing configuration', value: 'merge' },
        { name: '📤 Upload configuration to Gist', value: 'store' },
        { name: '📁 Show default configuration path', value: 'path' },
        { name: '❌ Exit', value: 'exit' }
      ]
    }
  ]);

  if (action === 'exit') {
    console.log(chalk.gray('👋 Goodbye!'));
    return;
  }

  if (action === 'path') {
    const { type } = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Which application?',
        choices: McpManager.getAppChoices()
      }
    ]);

    const defaultPath = manager.getDefaultPath(type);
    console.log(chalk.blue('\n📁 Default configuration path:'));
    console.log(chalk.white(defaultPath));
    return;
  }

  if (action === 'store') {
    await handleStorePrompt(manager);
    return;
  }

  // For replace and merge actions
  await handleReplaceOrMergePrompt(manager, action);
}

async function handleStorePrompt(manager) {
  const questions = [
    {
      type: 'list',
      name: 'type',
      message: 'Which configuration do you want to upload?',
      choices: [
        ...McpManager.getAppChoices(),
        { name: 'Custom path', value: 'custom' }
      ]
    }
  ];

  const { type } = await inquirer.prompt(questions);

  let sourcePath;
  if (type === 'custom') {
    const { customPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customPath',
        message: 'Enter the path to your configuration file:',
        validate: McpManager.createTextInputValidator('path')
      }
    ]);
    sourcePath = customPath;
  } else {
    sourcePath = manager.getDefaultPath(type);
  }

  const moreOptions = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'updateExisting',
      message: 'Do you want to update an existing Gist?',
      default: false
    }
  ]);

  let gistId;
  if (moreOptions.updateExisting) {
    const { existingGist } = await inquirer.prompt([
      {
        type: 'input',
        name: 'existingGist',
        message: 'Enter the Gist ID:',
        validate: McpManager.createTextInputValidator('Gist ID')
      }
    ]);
    gistId = existingGist;
  }

  const { isPrivate } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'isPrivate',
      message: 'Make the Gist private?',
      default: false
    }
  ]);

  try {
    const result = await manager.store({
      type,
      source: type === 'custom' ? sourcePath : undefined,
      gist: gistId,
      private: isPrivate
    });

    McpManager.displayStoreResult(result, true);
  } catch (error) {
    McpManager.displayError(error.message, true);
  }
}

async function handleReplaceOrMergePrompt(manager, action) {
  console.log(chalk.blue(`\n📥 ${action === 'replace' ? 'Replace' : 'Merge'} Configuration`));

  // Ask about source
  const { sourceType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'sourceType',
      message: 'Where is the configuration you want to download?',
      choices: [
        { name: '🔗 Direct URL', value: 'url' },
        { name: '📝 GitHub Gist', value: 'gist' }
      ]
    }
  ]);

  let sourceOptions = {};

  if (sourceType === 'url') {
    const { jsonUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'jsonUrl',
        message: 'Enter the JSON URL:',
        validate: (input) => {
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        }
      }
    ]);
    sourceOptions.jsonUrl = jsonUrl;
  } else {
    const { gistInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'gistInput',
        message: 'Enter Gist ID or ID/filename (for multi-file Gists):',
        validate: McpManager.createTextInputValidator('Gist ID')
      }
    ]);
    sourceOptions.gist = gistInput;
  }

  // Ask about destination
  const { destinationType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'destinationType',
      message: 'Where should the configuration be saved?',
      choices: [
        { name: '🎯 Cursor', value: 'cursor' },
        { name: '🤖 Claude Desktop', value: 'claude' },
        { name: '📁 Custom path', value: 'custom' }
      ]
    }
  ]);

  let destOptions = {};

  if (destinationType === 'custom') {
    const { customDest } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customDest',
        message: 'Enter the destination path:',
        validate: McpManager.createTextInputValidator('path')
      }
    ]);
    destOptions.destination = customDest;
  } else {
    destOptions.type = destinationType;
  }

  // Confirm the action
  const destination = destOptions.destination || manager.getDefaultPath(destOptions.type);
  console.log(chalk.yellow(`\n⚠️  This will ${action} the configuration at:`));
  console.log(chalk.white(destination));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to ${action} this configuration?`,
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.gray('Operation cancelled.'));
    return;
  }

  try {
    const options = { ...sourceOptions, ...destOptions };

    if (action === 'replace') {
      await manager.replace(options);
    } else {
      await manager.merge(options);
    }

    McpManager.displayOperationResult(action, destination);
  } catch (error) {
    console.error(chalk.red(`\n❌ Failed to ${action} configuration:`), error.message);
  }
}
