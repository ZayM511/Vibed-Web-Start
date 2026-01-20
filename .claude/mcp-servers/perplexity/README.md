# Custom Perplexity MCP Server

This is a custom implementation of the Perplexity MCP server that properly handles Cloudflare's bot protection by including proper HTTP headers.

## Problem Solved

The official `@perplexity-ai/mcp-server` package was triggering Cloudflare's bot detection, resulting in 401 errors even with valid API keys. This custom implementation adds proper User-Agent and other headers to bypass Cloudflare's protection.

## Features

This MCP server provides four tools:

1. **perplexity_ask** - Quick chat completions using the Sonar model
2. **perplexity_research** - Deep research with the Sonar Reasoning model and citations
3. **perplexity_reason** - Advanced reasoning with Sonar Reasoning Pro model
4. **perplexity_search** - Web search with ranked results and metadata

## Configuration

The server is configured in `.claude/mcp.json`:

```json
{
  "perplexity": {
    "command": "node",
    "args": [".claude/mcp-servers/perplexity/index.js"],
    "env": {
      "PERPLEXITY_API_KEY": "your-api-key-here"
    }
  }
}
```

## Installation

Dependencies are already installed. If you need to reinstall:

```bash
cd .claude/mcp-servers/perplexity
npm install
```

## Testing

The API key has been verified to work with direct curl requests. After reloading Claude Code, the Perplexity tools should be available without 401 errors.

## Key Implementation Details

The custom server includes these critical headers:
- `User-Agent`: Modern browser user agent
- `Origin`: https://www.perplexity.ai
- `Referer`: https://www.perplexity.ai/
- `Accept-Language`: en-US,en;q=0.9

These headers make the requests appear to come from a legitimate browser, bypassing Cloudflare's bot detection.
