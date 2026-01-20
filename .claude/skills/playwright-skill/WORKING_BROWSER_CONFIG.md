# Working Browser Configuration for Indeed Testing

## Successful Puppeteer MCP Launch Options

This configuration successfully bypasses Cloudflare bot detection and allows extension loading:

```javascript
{
  "headless": false,
  "userDataDir": "C:\\temp\\jobfiltr-test-2",
  "args": [
    "--disable-blink-features=AutomationControlled",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1920,1080",
    "--disable-extensions-except=C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension",
    "--load-extension=C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension"
  ],
  "ignoreDefaultArgs": [
    "--enable-automation",
    "--enable-blink-features=AutomationControlled",
    "--disable-extensions"
  ]
}
```

## Key Points

1. **Stealth Options** - Critical to bypass Cloudflare:
   - `--disable-blink-features=AutomationControlled` - Hides automation flag
   - `ignoreDefaultArgs: ["--enable-automation"]` - Removes automation indicator

2. **User Data Directory** - Use a separate temp directory to avoid profile locks:
   - `"userDataDir": "C:\\temp\\jobfiltr-test-2"`
   - This allows persistent sessions without conflicting with main Chrome profile

3. **Extension Loading** - Load via command-line flags:
   - `--disable-extensions-except=<extension-path>`
   - `--load-extension=<extension-path>`

4. **Window Size** - Set reasonable dimensions:
   - `--window-size=1920,1080`

## Usage with Puppeteer MCP

Use `mcp__puppeteer__puppeteer_navigate` with the `launchOptions` parameter:

```javascript
{
  "url": "https://www.indeed.com/jobs?q=software+engineer",
  "launchOptions": {
    "headless": false,
    "userDataDir": "C:\\temp\\jobfiltr-test-2",
    "args": [
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1920,1080",
      "--disable-extensions-except=C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension",
      "--load-extension=C:\\Users\\isaia\\OneDrive\\Documents\\2025 Docs\\Claude Copy\\Vibed-Web-Start-1\\chrome-extension"
    ],
    "ignoreDefaultArgs": ["--enable-automation", "--enable-blink-features=AutomationControlled", "--disable-extensions"]
  }
}
```

## Alternative: Chrome DevTools MCP

If using Chrome DevTools MCP, launch Chrome manually first:

```batch
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="C:\temp\jobfiltr-test" ^
  --disable-blink-features=AutomationControlled ^
  --load-extension="path\to\chrome-extension" ^
  https://www.indeed.com
```

**Note**: The `--remote-debugging-port` flag may trigger Google's security warnings when trying to sign in with Google account. Use email/password login instead.
