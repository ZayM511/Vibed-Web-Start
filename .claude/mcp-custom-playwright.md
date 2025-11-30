# Custom Playwright MCP Server - Usage Guide

## Configuration

The custom Playwright MCP server is configured in [.claude/mcp.json](.claude/mcp.json) and provides 12 specialized browser automation tools.

## Available Tools

### Navigation & Interaction
- **navigate** - Navigate to a URL
- **click** - Click an element by CSS selector
- **waitFor** - Wait for a selector to appear

### Screenshot & Recording
- **screenshot** - Capture screenshots
- **videoStart** - Start video recording
- **videoStop** - Stop video recording

### Debugging & Tracing
- **traceStart** - Start Playwright tracing (screenshots, snapshots, sources)
- **traceStop** - Stop and save trace file

### Content Extraction
- **htmlDump** - Save the entire page HTML
- **cssCollect** - Extract and save all CSS from the page

### Network Monitoring
- **networkHarStart** - Start HAR (HTTP Archive) capture
- **networkHarStop** - Stop HAR capture

## How to Use in Claude Code (Cursor)

Simply ask Claude to use the tools in natural language:

### Example 1: Take a Screenshot
```
Navigate to https://example.com and take a screenshot
```

Claude will use:
1. `navigate` tool with url: "https://example.com"
2. `screenshot` tool with path: "example.png"

Result: Screenshot saved to `./artifacts/example.png`

### Example 2: Record a Video
```
Start recording a video, navigate to https://github.com,
then stop the recording
```

Claude will use:
1. `videoStart` with dir: "videos"
2. `navigate` with url: "https://github.com"
3. Interact with the page
4. `videoStop`

Result: Video saved to `./artifacts/videos/`

### Example 3: Debug with Tracing
```
Start a trace, navigate to my app, click the login button,
then stop the trace and save it
```

Claude will use:
1. `traceStart` with options
2. `navigate`, `click`, etc.
3. `traceStop` with path: "trace.zip"

Result: Open with `npx playwright show-trace artifacts/trace.zip`

### Example 4: Extract Page Content
```
Go to https://example.com and save the HTML and CSS
```

Claude will use:
1. `navigate`
2. `htmlDump` with path: "page.html"
3. `cssCollect` with path: "styles.css"

### Example 5: Monitor Network Traffic
```
Start HAR recording, navigate to the site,
perform some actions, then stop recording
```

Claude will use:
1. `networkHarStart` with path: "traffic.har"
2. `navigate` and interact
3. `networkHarStop`

Result: HAR file viewable in Chrome DevTools

## File Paths

- **Relative paths** → Saved to `./artifacts/` directory
- **Absolute paths** → Used as-is
- Directories are created automatically

## Restarting the MCP Server

If you need to restart the MCP server in Cursor:

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Search for "MCP: Restart Servers"
3. Or reload the window: "Developer: Reload Window"

## Troubleshooting

### Server Not Found
- Ensure `mcp-server/dist/index.js` exists
- Run `npm run build` in the mcp-server directory

### Tools Not Appearing
- Check [.claude/mcp.json](.claude/mcp.json) exists
- Reload Cursor window
- Check Cursor output panel for errors

### Browser Not Found
```bash
cd mcp-server
npx playwright install chromium
```

## Full Documentation

See [mcp-server/README.md](../mcp-server/README.md) for:
- Detailed tool parameters
- Advanced configuration
- Development guide
- Architecture details
