# Custom Playwright MCP Server

A custom Model Context Protocol (MCP) server with extended Playwright automation handlers.

## Features

This MCP server provides 12 specialized Playwright handlers:

### Navigation & Interaction
1. **navigate(url)** - Navigate to a URL
2. **click(selector)** - Click an element by CSS selector
3. **waitFor(selector)** - Wait for a selector to appear

### Screenshot & Recording
4. **screenshot(path)** - Take a screenshot
5. **videoStart(dir)** - Start video recording
6. **videoStop()** - Stop video recording

### Tracing
7. **traceStart(options)** - Start Playwright tracing with screenshots, snapshots, and sources
8. **traceStop(path)** - Stop tracing and save to file

### Content Extraction
9. **htmlDump(path)** - Save the entire page HTML to a file
10. **cssCollect(path)** - Extract and save all CSS from the page

### Network Monitoring
11. **networkHarStart(path)** - Start HAR (HTTP Archive) capture
12. **networkHarStop()** - Stop HAR capture

## Installation

### 1. Build the Server

```bash
cd mcp-server
npm install
npm run build
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

## Configuration

### For Claude Desktop

Add to your Claude Desktop configuration file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "custom-playwright": {
      "command": "node",
      "args": [
        "C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude\\Vibed-Web-Start-1\\mcp-server\\dist\\index.js"
      ]
    }
  }
}
```

**Note:** Update the path to match your actual installation directory.

### For Other MCP Clients

Use stdio transport with the command:
```bash
node /path/to/mcp-server/dist/index.js
```

## Usage

All tools return JSON responses in the format:
- Success: `{ "ok": true, "path": "..." }` or `{ "ok": true }`
- Failure: `{ "ok": false, "error": "error message" }`

### File Path Handling

- Relative paths are saved to `./artifacts/` directory
- Absolute paths are used as-is
- Directories are created automatically if they don't exist

### Example Workflows

#### 1. Capture a Screenshot

```
Use the navigate tool to go to https://example.com
Then use the screenshot tool to save to "example.png"
```

Result: Screenshot saved to `./artifacts/example.png`

#### 2. Record a Video

```
Use videoStart with dir "videos"
Use navigate to go to https://example.com
Interact with the page...
Use videoStop to finish recording
```

Result: Video saved to `./artifacts/videos/`

#### 3. Debug with Tracing

```
Use traceStart with screenshots: true, snapshots: true, sources: true
Perform your automation steps...
Use traceStop with path "debug-trace.zip"
```

Result: Trace file saved to `./artifacts/debug-trace.zip`
Open in Playwright Trace Viewer: `npx playwright show-trace debug-trace.zip`

#### 4. Extract Page Content

```
Navigate to a page
Use htmlDump to save HTML to "page.html"
Use cssCollect to save CSS to "styles.css"
```

Result: HTML and CSS saved separately for analysis

#### 5. Monitor Network Traffic

```
Use networkHarStart with path "traffic.har"
Navigate and interact with the page...
Use networkHarStop
```

Result: HAR file saved to `./artifacts/traffic.har`
View in Chrome DevTools or HAR analyzer

## Tool Reference

### navigate
```typescript
{
  url: string  // URL to navigate to
}
```

### screenshot
```typescript
{
  path: string  // Path to save screenshot (PNG)
}
```

### traceStart
```typescript
{
  screenshots?: boolean  // Default: true
  snapshots?: boolean    // Default: true
  sources?: boolean      // Default: true
}
```

### traceStop
```typescript
{
  path: string  // Path to save trace file (.zip)
}
```

### videoStart
```typescript
{
  dir: string  // Directory to save video files
}
```

### videoStop
```typescript
{
  // No parameters
}
```

### click
```typescript
{
  selector: string  // CSS selector
}
```

### waitFor
```typescript
{
  selector: string  // CSS selector to wait for
}
```

### htmlDump
```typescript
{
  path: string  // Path to save HTML file
}
```

### cssCollect
```typescript
{
  path: string  // Path to save CSS file
}
```

### networkHarStart
```typescript
{
  path: string  // Path to save HAR file
}
```

### networkHarStop
```typescript
{
  // No parameters
}
```

## Browser Configuration

The server launches Chromium in headed mode by default. To customize:

Edit [src/index.ts](src/index.ts:31):
```typescript
browser = await chromium.launch({
  headless: false,  // Set to true for headless mode
  // Add other options as needed
});
```

## Artifacts Directory

All files are saved to `./artifacts/` by default (relative to where the server is run).

You can change this by modifying the `ARTIFACTS_DIR` constant in [src/index.ts](src/index.ts:13):
```typescript
const ARTIFACTS_DIR = "./my-custom-artifacts";
```

## Troubleshooting

### Browser Not Found
```bash
npx playwright install chromium
```

### Permission Denied
Ensure the artifacts directory is writable:
```bash
mkdir -p ./artifacts
chmod 755 ./artifacts
```

### Server Not Starting
Check that the build completed successfully:
```bash
npm run build
```

### Claude Can't Find Server
1. Verify the path in `claude_desktop_config.json` is absolute
2. Restart Claude Desktop after configuration changes
3. Check Claude Desktop logs for errors

## Development

### Build and Run
```bash
npm run build
npm run start
```

### Watch Mode (Auto-rebuild)
```bash
npm run dev
```

### Testing
```bash
# Start the server
npm run start

# In another terminal, test with MCP inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Architecture

- **Server Framework:** [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **Browser Automation:** [Playwright](https://playwright.dev)
- **Transport:** stdio (standard input/output)
- **Language:** TypeScript compiled to ES2022

## License

MIT

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [Playwright Documentation](https://playwright.dev)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
