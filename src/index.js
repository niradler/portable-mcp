import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';
import ora from 'ora';

const execAsync = promisify(exec);

export class McpManager {
  constructor() {
    this.tempDir = process.env.PORTABLE_MCP_TMP || path.join(os.homedir(), '.tmp', 'portable-mcp');
    this.githubToken = process.env.GITHUB_TOKEN;
    this.platform = os.platform();
  }


  getDefaultPath(type) {
    const homeDir = os.homedir();

    switch (type.toLowerCase()) {
      case 'cursor':
        return this.platform === 'darwin'
          ? path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'mcp.json')
          : path.join(homeDir, '.cursor', 'mcp.json');

      case 'claude':
        return this.platform === 'darwin'
          ? path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
          : path.join(homeDir, '.claude', 'claude_desktop_config.json');

      default:
        throw new Error(`Unsupported type: ${type}. Supported types: cursor, claude`);
    }
  }


  async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }


  getCacheFileName(url) {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return `${hash}.json`;
  }


  async downloadJson(url) {
    const spinner = ora('Downloading configuration...').start();

    try {
      await this.ensureTempDir();
      const cacheFile = path.join(this.tempDir, this.getCacheFileName(url));


      try {
        const stats = await fs.stat(cacheFile);
        const hourAgo = Date.now() - (60 * 60 * 1000);
        if (stats.mtime.getTime() > hourAgo) {
          spinner.succeed('Using cached configuration');
          const cachedData = await fs.readFile(cacheFile, 'utf8');
          return JSON.parse(cachedData);
        }
      } catch {

      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const jsonText = await response.text();
      const jsonData = JSON.parse(jsonText);


      await fs.writeFile(cacheFile, jsonText, 'utf8');

      spinner.succeed('Configuration downloaded successfully');
      return jsonData;
    } catch (error) {
      spinner.fail('Failed to download configuration');
      throw error;
    }
  }


  async downloadFromGist(gistInput) {
    let gistId, fileName;

    if (gistInput.includes('/')) {
      [gistId, fileName] = gistInput.split('/');
    } else {
      gistId = gistInput;
    }

    const spinner = ora('Fetching Gist information...').start();

    try {

      const gistUrl = `https://api.github.com/gists/${gistId}`;
      const headers = {};

      if (this.githubToken) {
        headers.Authorization = `token ${this.githubToken}`;
      }

      const response = await fetch(gistUrl, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch gist: ${response.status} ${response.statusText}`);
      }

      const gistData = await response.json();
      const files = Object.keys(gistData.files);

      if (files.length === 0) {
        throw new Error('Gist contains no files');
      }


      let targetFile;
      if (fileName) {
        targetFile = gistData.files[fileName];
        if (!targetFile) {
          throw new Error(`File '${fileName}' not found in gist. Available files: ${files.join(', ')}`);
        }
      } else if (files.length === 1) {
        targetFile = gistData.files[files[0]];
      } else {

        const jsonFiles = files.filter(f => f.endsWith('.json'));
        if (jsonFiles.length === 1) {
          targetFile = gistData.files[jsonFiles[0]];
        } else {
          throw new Error(`Multiple files in gist. Please specify filename: ${gistId}/${files.join(' or ' + gistId + '/')}`);
        }
      }

      spinner.succeed('Gist information fetched');

      const rawUrl = targetFile.raw_url;
      return await this.downloadJson(rawUrl);
    } catch (error) {
      spinner.fail('Failed to fetch from Gist');
      throw error;
    }
  }


  async getJsonData(options) {
    if (options.jsonUrl) {
      return await this.downloadJson(options.jsonUrl);
    } else if (options.gist) {
      return await this.downloadFromGist(options.gist);
    } else {
      throw new Error('Either --json-url or --gist must be provided');
    }
  }


  getDestination(options) {
    if (options.destination) {
      return options.destination;
    } else if (options.type) {
      return this.getDefaultPath(options.type);
    } else {
      throw new Error('Either --type or --destination must be provided');
    }
  }


  async ensureDestinationDir(filePath) {
    const dir = path.dirname(filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }


  async replace(options) {
    const jsonData = await this.getJsonData(options);
    const destination = this.getDestination(options);

    await this.ensureDestinationDir(destination);

    const spinner = ora('Writing configuration file...').start();
    try {
      await fs.writeFile(destination, JSON.stringify(jsonData, null, 2), 'utf8');
      spinner.succeed(`Configuration replaced at: ${destination}`);
    } catch (error) {
      spinner.fail('Failed to write configuration');
      throw error;
    }
  }


  async merge(options) {
    const newJsonData = await this.getJsonData(options);
    const destination = this.getDestination(options);

    await this.ensureDestinationDir(destination);

    const spinner = ora('Merging and writing configuration...').start();
    try {
      let existingData = {};

      try {
        const existingContent = await fs.readFile(destination, 'utf8');
        existingData = JSON.parse(existingContent);
      } catch {

      }

      const mergedData = this.deepMerge(existingData, newJsonData);

      await fs.writeFile(destination, JSON.stringify(mergedData, null, 2), 'utf8');
      spinner.succeed(`Configuration merged at: ${destination}`);
    } catch (error) {
      spinner.fail('Failed to merge configuration');
      throw error;
    }
  }


  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }


  async hasGitHubCli() {
    try {
      await execAsync('gh --version');
      return true;
    } catch {
      return false;
    }
  }


  async store(options) {
    const sourcePath = options.source || this.getDestination({ type: options.type });


    const spinner = ora('Reading configuration file...').start();
    try {
      await fs.access(sourcePath);
      const configContent = await fs.readFile(sourcePath, 'utf8');


      JSON.parse(configContent);

      spinner.succeed('Configuration file loaded');
    } catch (error) {
      spinner.fail('Failed to read configuration file');
      throw new Error(`Cannot read source file: ${sourcePath}. ${error.message}`);
    }

    const fileName = `${options.type || 'mcp'}.json`;


    if (this.githubToken) {
      return await this.storeWithApi(configContent, fileName, options);
    } else if (await this.hasGitHubCli()) {
      return await this.storeWithGhCli(configContent, fileName, options);
    } else {
      throw new Error('Either GITHUB_TOKEN environment variable or authenticated GitHub CLI is required');
    }
  }

  async storeWithGhCli(content, fileName, options) {
    const spinner = ora('Uploading to Gist using GitHub CLI...').start();

    try {
      await this.ensureTempDir();
      const tempFile = path.join(this.tempDir, fileName);
      await fs.writeFile(tempFile, content, 'utf8');

      let command;
      let gistId = options.gist;

      if (options.gist) {
        command = `gh gist edit ${options.gist} ${tempFile}`;
      } else {
        const visibility = options.private ? '--secret' : '--public';
        command = `gh gist create ${visibility} ${tempFile}`;

        const { stdout } = await execAsync(command);
        const gistUrl = stdout.trim();

        if (gistUrl && gistUrl.includes('gist.github.com')) {
          gistId = gistUrl.split('/').pop();
        } else {
          spinner.fail('Could not determine gist ID from GitHub CLI output');
          throw new Error('GitHub CLI did not return a valid gist URL. The gist may have been created successfully, but we cannot determine its ID.');
        }
      }

      await fs.unlink(tempFile);

      spinner.succeed('Uploaded to Gist using GitHub CLI');

      let username;
      try {
        const { stdout: userStdout } = await execAsync('gh api user --jq .login');
        username = userStdout.trim();
      } catch {
        username = null;
      }

      return {
        id: gistId,
        url: gistId ? `https://gist.github.com/${username ? username + '/' : ''}${gistId}` : null,
        viewCommand: `gh gist view ${gistId}`
      };
    } catch (error) {
      spinner.fail('Failed to upload using GitHub CLI');
      throw error;
    }
  }


  async storeWithApi(content, fileName, options) {
    if (!this.githubToken) {
      throw new Error('GITHUB_TOKEN environment variable is required for API uploads');
    }

    const spinner = ora('Uploading to Gist using GitHub API...').start();

    try {
      const gistData = {
        files: {
          [fileName]: {
            content: content
          }
        },
        public: !options.private
      };

      let url, method;
      if (options.gist) {

        url = `https://api.github.com/gists/${options.gist}`;
        method = 'PATCH';
      } else {

        url = 'https://api.github.com/gists';
        method = 'POST';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      spinner.succeed('Uploaded to Gist using GitHub API');

      return {
        id: result.id,
        url: result.html_url,
        viewCommand: `gh gist view ${result.id}`
      };
    } catch (error) {
      spinner.fail('Failed to upload using GitHub API');
      throw error;
    }
  }
}
