# MCP Servers Setup Guide

This project has been configured with **9 powerful MCP (Model Context Protocol) servers** to enhance Claude Code's capabilities.

## Installed MCP Servers

### 1. **Filesystem MCP** ✅
- **Package**: `@modelcontextprotocol/server-filesystem`
- **Purpose**: Enhanced file operations and directory access
- **Scope**: Limited to `/home/user/Vibed-Web-Start` directory
- **No API key required**

### 2. **GitHub MCP** 🔑
- **Package**: `@modelcontextprotocol/server-github`
- **Purpose**: Direct GitHub API access for repositories, issues, PRs
- **API Key Required**: Yes
- **Setup**:
  1. Go to https://github.com/settings/tokens
  2. Create a new Personal Access Token with repo permissions
  3. Add to `.env.local`: `GITHUB_TOKEN=your_token_here`

### 3. **Brave Search MCP** 🔑
- **Package**: `@modelcontextprotocol/server-brave-search`
- **Purpose**: Web search capabilities
- **API Key Required**: Yes
- **Setup**:
  1. Sign up at https://brave.com/search/api/
  2. Get your API key
  3. Add to `.env.local`: `BRAVE_API_KEY=your_key_here`

### 4. **Postgres MCP** ⚙️
- **Package**: `@modelcontextprotocol/server-postgres`
- **Purpose**: PostgreSQL database operations
- **Configuration**: Currently configured for `postgresql://localhost/vibed`
- **Note**: Update the connection string in `.mcp.json` as needed

### 5. **Puppeteer MCP** ✅
- **Package**: `@modelcontextprotocol/server-puppeteer`
- **Purpose**: Browser automation and web scraping
- **No API key required**

### 6. **Playwright MCP** ✅
- **Package**: `@executeautomation/playwright-mcp-server`
- **Purpose**: Browser automation for testing and scraping (alternative to Puppeteer)
- **No API key required**

### 7. **shadcn/ui MCP** ✅
- **Package**: `@jpisnice/shadcn-ui-mcp-server`
- **Purpose**: Access to shadcn/ui component documentation and code examples
- **No API key required**
- **Perfect for**: Quick component lookups and implementation guidance

### 8. **Context7 MCP** ✅
- **Package**: `@upstash/context7-mcp`
- **Purpose**: Up-to-date library documentation and code examples
- **No API key required**
- **Perfect for**: Getting current documentation for any library

### 9. **Figma MCP** 🔑
- **Package**: `@modelcontextprotocol/server-figma`
- **Purpose**: Figma design file access and integration
- **API Key Required**: Yes
- **Setup**:
  1. Go to https://www.figma.com/developers/api#access-tokens
  2. Create a Personal Access Token
  3. Add to `.env.local`: `FIGMA_TOKEN=your_token_here`

## Setup Instructions

### Step 1: Configure API Keys

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your API keys for:
- `GITHUB_TOKEN` (for GitHub MCP)
- `BRAVE_API_KEY` (for Brave Search MCP)
- `FIGMA_TOKEN` (for Figma MCP)

### Step 2: Restart Claude Code

The MCP servers are configured in `.mcp.json` and will automatically load when you restart Claude Code.

To verify MCP servers are loaded:
```bash
claude mcp list
```

### Step 3: Enable/Disable Servers

You can enable or disable specific MCP servers by @-mentioning them:
```
@filesystem  # Toggle filesystem MCP on/off
@github      # Toggle GitHub MCP on/off
```

Or use the `/mcp` command to manage servers interactively.

## Usage Examples

### Using Filesystem MCP
```
"Read all TypeScript files in the components directory"
```

### Using GitHub MCP
```
"Create a new issue in this repository titled 'Bug: Login not working'"
"Show me the latest pull requests"
```

### Using Brave Search MCP
```
"Search the web for Next.js 15 performance optimization tips"
```

### Using shadcn MCP
```
"Show me how to implement a shadcn Button component"
"What are the available shadcn Form components?"
```

### Using Context7 MCP
```
"Get the latest documentation for React 19 hooks"
"Show me examples of Zod schema validation"
```

### Using Puppeteer/Playwright MCP
```
"Scrape the job listings from this website"
"Take a screenshot of my homepage at localhost:3000"
```

### Using Figma MCP
```
"Get the latest designs from our Figma file"
"Show me the color palette from the design system"
```

## Troubleshooting

### MCP Server Not Loading

1. Check if the server is enabled: `claude mcp list`
2. Verify API keys in `.env.local`
3. Check server status: `claude mcp list` (shows health status)
4. Enable debug mode: `claude --mcp-debug`

### Permission Errors

MCP tools may require permission. Claude Code will ask for confirmation before using them. You can:
- Allow once
- Allow always
- Deny

Manage permissions with: `/permissions`

### Connection Issues

If an MCP server fails to connect:
1. Ensure you have internet connection
2. Check if the API key is valid
3. Verify the package is accessible via npx
4. Try reinstalling: `npx -y @modelcontextprotocol/server-<name>`

## Benefits for VIBED Development

These MCP servers provide powerful capabilities for building VIBED:

- **Filesystem**: Quickly navigate and modify project files
- **GitHub**: Manage issues, PRs, and repository operations
- **Brave Search**: Research job market trends and competitor features
- **Puppeteer/Playwright**: Scrape job boards for market research
- **shadcn**: Quickly implement UI components
- **Context7**: Get up-to-date documentation for libraries
- **Figma**: Import designs directly from Figma files
- **Postgres**: Manage database schema and queries (when implemented)

## Configuration File

All MCP servers are configured in `.mcp.json` at the project root. You can modify this file to:
- Add new servers
- Change server arguments
- Update environment variables
- Disable servers

## Need Help?

- MCP Documentation: https://modelcontextprotocol.io/
- Claude Code MCP Guide: https://docs.claude.com/en/docs/claude-code/mcp
- Issue Tracker: https://github.com/modelcontextprotocol/servers/issues
