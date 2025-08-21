# Portable MCP Manager

A CLI tool to manage MCP (Model Context Protocol) configurations across different environments like Cursor and Claude Desktop.

## Features

- 🔄 **Replace** or **merge** configurations from various sources
- 🔗 Download from **direct URLs** or **GitHub Gists** (public/private)
- 📱 Support for **Cursor** and **Claude Desktop**
- 🖥️ Cross-platform support (**Windows** and **macOS**)
- 📤 Upload configurations to **GitHub Gists**
- 🎯 **Interactive mode** for easy usage
- ⚡ **Caching** for faster repeated operations
- 🛠️ **GitHub CLI integration** when available

## Installation

```bash
npm install -g portable-mcp
```

Or run directly with npx:

```bash
npx portable-mcp --help
```

## Quick Start

### Interactive Mode (Recommended for beginners)

Simply run the command without arguments to enter interactive mode:

```bash
portable-mcp
```

or

```bash
portable-mcp prompt
```

### Replace Configuration

Replace your Cursor configuration from a GitHub Gist:

```bash
portable-mcp replace --type cursor --gist 50007c6cd60db13cf8477b3b5caa96f0
```

Replace from a direct URL:

```bash
portable-mcp replace --type cursor --json-url https://gist.githubusercontent.com/niradler/50007c6cd60db13cf8477b3b5caa96f0/raw/1c4229a9ac141f2a5530d98540ae67845b08a3be/cursor.json
```

### Merge Configuration

Merge new settings with your existing configuration:

```bash
portable-mcp merge --type claude --gist abc123def456
```

### Upload to Gist

Upload your current configuration to a new public Gist:

```bash
portable-mcp store --type cursor
```

Upload to a private Gist:

```bash
portable-mcp store --type cursor --private
```

Update an existing Gist:

```bash
portable-mcp store --type cursor --gist abc123def456
```

### Get Default Paths

Check where your configuration files should be located:

```bash
portable-mcp path --type cursor
portable-mcp path --type claude
```

## Command Reference

### Commands

#### `replace`

Replace the entire configuration file.

**Options:**

- `--type <type>` - Target application (`cursor` | `claude`)
- `--json-url <url>` - Direct URL to JSON configuration
- `--gist <gist>` - GitHub Gist ID or `ID/filename` for multi-file Gists
- `--destination <path>` - Custom destination path

#### `merge`

Merge configuration with existing file (deep merge).

**Options:** Same as `replace`

#### `store`

Upload configuration to GitHub Gist.

**Options:**

- `--type <type>` - Source application (`cursor` | `claude`)
- `--gist <gist>` - Existing Gist ID to update (optional)
- `--private` - Create private Gist (default: public)
- `--source <path>` - Custom source path

#### `path`

Show default configuration path for a type.

**Options:**

- `--type <type>` - Application type (default: `cursor`)

#### `prompt`

Interactive mode - asks questions to guide you through the process.

### Environment Variables

- `PORTABLE_MCP_TMP` - Custom temporary directory for cache (default: `~/.tmp/portable-mcp`)
- `GITHUB_TOKEN` - GitHub personal access token (required for private Gists and API uploads)

## Configuration Paths

### Cursor

- **Windows**: `C:\\Users\\<username>\\.cursor\\mcp.json`
- **macOS**: `~/Library/Application Support/Cursor/User/mcp.json`

### Claude Desktop

- **Windows**: `C:\\Users\\<username>\\.claude\\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

## GitHub Integration

### GitHub CLI (Recommended)

If you have [GitHub CLI](https://cli.github.com/) installed and authenticated, the tool will automatically use it for Gist operations. This provides the best experience and doesn't require additional tokens.

### GitHub API

If GitHub CLI is not available, you can use the GitHub API directly by setting the `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN=ghp_your_personal_access_token_here
```

Get a token from: https://github.com/settings/tokens

Required scopes: `gist`

## Examples

### Example 1: Complete Workflow

```bash
# Check current configuration location
portable-mcp path --type cursor

# Replace with a configuration from Gist
portable-mcp replace --type cursor --gist abc123def456

# Upload your modified configuration back
portable-mcp store --type cursor --private
```

### Example 2: Working with Multi-file Gists

```bash
# Download specific file from multi-file Gist
portable-mcp replace --type cursor --gist abc123def456/cursor-config.json
```

### Example 3: Custom Paths

```bash
# Use custom source and destination
portable-mcp replace --json-url https://example.com/config.json --destination ./my-config.json
```

### Example 4: Merge Configurations

```bash
# Merge remote config with local (useful for partial updates)
portable-mcp merge --type cursor --gist abc123def456
```

## Caching

Downloaded configurations are cached in the temp directory for 1 hour to speed up repeated operations. Cache location:

- Default: `~/.tmp/portable-mcp/`
- Custom: Set `PORTABLE_MCP_TMP` environment variable

## License

MIT License - see LICENSE file for details.
