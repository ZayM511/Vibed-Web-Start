# Playwright MCP Setup Guide

This guide explains how to configure the Playwright MCP (Model Context Protocol) server to use both default snapshot mode and vision mode for accomplishing tasks.

## Overview

Playwright MCP provides browser automation capabilities with two primary operating modes:

### Snapshot Mode (Default)
- **Fast and lightweight** - Uses Playwright's accessibility tree instead of screenshots
- **LLM-friendly** - Operates on structured data without vision models
- **Deterministic** - Avoids ambiguity common with screenshot-based approaches
- **Automatically enabled** - No additional configuration required

### Vision Mode (Opt-in)
- **Coordinate-based interactions** - Click, drag, and move mouse using X/Y coordinates
- **Visual element targeting** - Interact with elements not in the accessibility tree (e.g., canvas elements)
- **Screenshot-based** - Provides fallback for complex visual scenarios
- **Must be enabled** - Requires the `--caps vision` flag

## Installation

### Quick Start (Claude Code CLI)

```bash
claude mcp add playwright npx @playwright/mcp@latest --caps vision
```

This command installs Playwright MCP with vision mode enabled.

### Manual Configuration

Add to your MCP configuration file (location varies by client):

**Basic Configuration (Snapshot Mode Only):**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest"
      ]
    }
  }
}
```

**With Vision Mode Enabled:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--caps",
        "vision"
      ]
    }
  }
}
```

**With Multiple Capabilities:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--caps",
        "vision,pdf,tabs"
      ]
    }
  }
}
```

## Available Capabilities

Enable additional capabilities using the `--caps` flag with comma-separated values:

- **vision** - Coordinate-based interactions (mouse_click_xy, mouse_drag_xy, mouse_move_xy)
- **pdf** - PDF generation (browser_pdf_save)
- **tabs** - Tab management (browser_tabs)
- **install** - Browser installation tool
- **testing** - Test assertions and locator generation
- **tracing** - Playwright trace recording

## Configuration Options

### Common Arguments

```bash
# Browser selection
--browser chrome|firefox|webkit|msedge

# Run in headless mode
--headless

# Custom user profile directory
--user-data-dir <path>

# Device emulation
--device "iPhone 15"

# Viewport size
--viewport-size 1920x1080

# Timeouts
--timeout-action 5000
--timeout-navigation 60000

# Network filtering
--allowed-origins "https://example.com;https://another.com"
--blocked-origins "https://ads.example.com"

# Grant permissions
--grant-permissions geolocation,clipboard-read,clipboard-write
```

### Advanced Configuration File

For complex setups, create a JSON configuration file:

**config.json:**
```json
{
  "browser": {
    "browserName": "chromium",
    "isolated": false,
    "launchOptions": {
      "headless": false,
      "channel": "chrome"
    },
    "contextOptions": {
      "viewport": {
        "width": 1920,
        "height": 1080
      }
    }
  },
  "capabilities": ["vision", "pdf", "tabs"],
  "outputDir": "./playwright-output",
  "network": {
    "allowedOrigins": ["https://example.com"],
    "blockedOrigins": ["https://ads.example.com"]
  }
}
```

**Use with:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--config",
        "./path/to/config.json"
      ]
    }
  }
}
```

## How Both Modes Work Together

When you enable vision mode alongside the default snapshot mode, the MCP server provides **both** sets of tools:

### Default Snapshot Mode Tools (Always Available)
- `browser_navigate` - Navigate to URLs
- `browser_snapshot` - Capture accessibility tree
- `browser_click` - Click elements using accessibility references
- `browser_type` - Type text into elements
- `browser_fill_form` - Fill multiple form fields
- `browser_select_option` - Select dropdown options
- `browser_hover` - Hover over elements
- `browser_drag` - Drag and drop elements
- `browser_evaluate` - Execute JavaScript
- `browser_press_key` - Press keyboard keys
- `browser_take_screenshot` - Capture screenshots
- `browser_wait_for` - Wait for conditions
- `browser_console_messages` - Get console output
- `browser_network_requests` - List network activity

### Vision Mode Tools (When `--caps vision` Enabled)
- `browser_mouse_click_xy` - Click at X/Y coordinates
- `browser_mouse_drag_xy` - Drag from one coordinate to another
- `browser_mouse_move_xy` - Move mouse to coordinates

### Best Practices

1. **Start with snapshot mode** - Use accessibility-based tools first for reliability
2. **Fall back to vision mode** - Use coordinate-based tools when elements aren't in the accessibility tree
3. **Combine approaches** - Take screenshots to identify coordinates, then use vision mode tools
4. **Enable what you need** - Only enable capabilities you'll use to keep the tool set focused

## Example Use Cases

### 1. Form Automation (Snapshot Mode)
```
Task: Fill out a login form
Tools used:
- browser_navigate
- browser_snapshot
- browser_type (username field)
- browser_type (password field)
- browser_click (submit button)
```

### 2. Canvas Interaction (Vision Mode Required)
```
Task: Draw on an HTML canvas
Tools used:
- browser_navigate
- browser_take_screenshot (to see the canvas)
- browser_mouse_click_xy (to click at specific coordinates)
- browser_mouse_drag_xy (to draw lines)
```

### 3. Complex Workflow (Both Modes)
```
Task: Navigate site and interact with custom elements
Tools used:
- browser_navigate (snapshot mode)
- browser_snapshot (snapshot mode - identify structure)
- browser_click (snapshot mode - standard buttons)
- browser_take_screenshot (vision mode - identify custom elements)
- browser_mouse_click_xy (vision mode - interact with custom UI)
- browser_pdf_save (if pdf capability enabled)
```

## Recommended Configurations

### For General Web Automation
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--caps",
        "vision,tabs",
        "--browser",
        "chrome"
      ]
    }
  }
}
```

### For Testing and Development
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--caps",
        "vision,testing,tracing",
        "--headless",
        "--isolated"
      ]
    }
  }
}
```

### For PDF Generation and Screenshots
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--caps",
        "pdf,vision",
        "--output-dir",
        "./output"
      ]
    }
  }
}
```

## Troubleshooting

### Browser Not Installed
If you get an error about the browser not being installed:
1. Enable the `install` capability: `--caps vision,install`
2. Use the `browser_install` tool to install the browser

### Permission Issues
Some sites may block automation. Try:
```bash
--grant-permissions geolocation,clipboard-read,clipboard-write
--user-agent "Mozilla/5.0..."
```

### Display Issues (Headless)
For headed browser without display:
```bash
--port 8931
```
Then connect via HTTP transport in your MCP client config:
```json
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/mcp"
    }
  }
}
```

## User Profile Modes

### Persistent Profile (Default)
- Saves login state between sessions
- Located at platform-specific paths
- Override with `--user-data-dir`

### Isolated Mode
- Fresh profile for each session
- No state persistence
- Enable with `--isolated`
- Optionally provide initial state: `--storage-state path/to/storage.json`

## Resources

- [Playwright MCP GitHub Repository](https://github.com/microsoft/playwright-mcp)
- [Playwright Documentation](https://playwright.dev)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)

## Summary

To use Playwright MCP with **both default snapshot mode and vision mode**:

1. Add `--caps vision` to your configuration
2. Both modes will be available simultaneously
3. Use snapshot mode (accessibility-based) as your primary approach
4. Fall back to vision mode (coordinate-based) when needed
5. Consider enabling additional capabilities (`pdf`, `tabs`, `testing`) based on your needs

The default snapshot mode and vision mode are **complementary**, not mutually exclusive. Enabling vision mode gives you additional tools while keeping all the default snapshot mode tools available.
