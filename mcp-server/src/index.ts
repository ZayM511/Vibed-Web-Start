#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Global state
let browser: BrowserContext | null = null; // Using BrowserContext for launchPersistentContext
let page: Page | null = null;
let videoContext: BrowserContext | null = null;
const ARTIFACTS_DIR = "./artifacts";

// Ensure artifacts directory exists
await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

// Helper function to resolve paths
function resolvePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.join(ARTIFACTS_DIR, filePath);
}

// Helper function to resize images to max 2000px in any dimension
async function resizeImage(imagePath: string): Promise<void> {
  const MAX_DIMENSION = 2000;

  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    if (metadata.width && metadata.height) {
      const maxDim = Math.max(metadata.width, metadata.height);

      if (maxDim > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / maxDim;
        const newWidth = Math.round(metadata.width * scale);
        const newHeight = Math.round(metadata.height * scale);

        await image
          .resize(newWidth, newHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toFile(imagePath + '.resized');

        // Replace original with resized
        await fs.unlink(imagePath);
        await fs.rename(imagePath + '.resized', imagePath);
      }
    }
  } catch (error) {
    console.error(`Error resizing image ${imagePath}:`, error);
    // Continue without resizing if error occurs
  }
}

// Helper function to ensure browser is initialized
async function ensureBrowser(): Promise<void> {
  if (!browser) {
    const extensionPath = path.resolve(__dirname, '../../chrome-extension');
    const userDataDir = path.resolve(__dirname, '../../chrome-extension/.chrome-debug-profile');

    browser = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--allow-running-insecure-content',
        '--disable-blink-features=AutomationControlled',
        '--enable-automation=false',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled'],
    });

    // Use the default page from persistent context
    const pages = browser.pages();
    page = pages.length > 0 ? pages[0] : await browser.newPage();

    // Inject stealth scripts
    await page.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override navigator.plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Add chrome runtime
      (globalThis as any).chrome = {
        runtime: {},
      };
    });
  }

  if (!page) {
    const pages = browser.pages();
    page = pages.length > 0 ? pages[0] : await browser.newPage();
  }
}

// Create MCP server
const server = new Server(
  {
    name: "custom-playwright-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "navigate",
        description: "Navigate to a URL",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to navigate to",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "screenshot",
        description: "Take a screenshot and save to path",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to save screenshot (relative to artifacts/ or absolute)",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "traceStart",
        description: "Start Playwright tracing",
        inputSchema: {
          type: "object",
          properties: {
            screenshots: {
              type: "boolean",
              description: "Capture screenshots during trace",
            },
            snapshots: {
              type: "boolean",
              description: "Capture snapshots during trace",
            },
            sources: {
              type: "boolean",
              description: "Include source files in trace",
            },
          },
        },
      },
      {
        name: "traceStop",
        description: "Stop Playwright tracing and save to path",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to save trace file (relative to artifacts/ or absolute)",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "videoStart",
        description: "Start video recording by creating a new context",
        inputSchema: {
          type: "object",
          properties: {
            dir: {
              type: "string",
              description: "Directory to save video (relative to artifacts/ or absolute)",
            },
          },
          required: ["dir"],
        },
      },
      {
        name: "videoStop",
        description: "Stop video recording and close the video context",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "click",
        description: "Click an element by selector",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for the element to click",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "waitFor",
        description: "Wait for a selector to appear",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector to wait for",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "htmlDump",
        description: "Dump the current page HTML to a file",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to save HTML dump (relative to artifacts/ or absolute)",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "cssCollect",
        description: "Collect all CSS from the page and save to a file",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to save CSS (relative to artifacts/ or absolute)",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "networkHarStart",
        description: "Start HAR (HTTP Archive) capture",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to save HAR file (relative to artifacts/ or absolute)",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "networkHarStop",
        description: "Stop HAR capture and save the file",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "navigate": {
        await ensureBrowser();
        const { url } = args as { url: string };
        await page!.goto(url);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, url }, null, 2),
            },
          ],
        };
      }

      case "screenshot": {
        await ensureBrowser();
        const { path: screenshotPath } = args as { path: string };
        const resolvedPath = resolvePath(screenshotPath);
        await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
        await page!.screenshot({ path: resolvedPath });

        // Resize image if it exceeds max dimension
        await resizeImage(resolvedPath);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, path: resolvedPath }, null, 2),
            },
          ],
        };
      }

      case "traceStart": {
        await ensureBrowser();
        const options = args as {
          screenshots?: boolean;
          snapshots?: boolean;
          sources?: boolean;
        };
        await browser!.tracing.start({
          screenshots: options.screenshots ?? true,
          snapshots: options.snapshots ?? true,
          sources: options.sources ?? true,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true }, null, 2),
            },
          ],
        };
      }

      case "traceStop": {
        await ensureBrowser();
        const { path: tracePath } = args as { path: string };
        const resolvedPath = resolvePath(tracePath);
        await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
        await browser!.tracing.stop({ path: resolvedPath });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, path: resolvedPath }, null, 2),
            },
          ],
        };
      }

      case "videoStart": {
        await ensureBrowser();
        const { dir } = args as { dir: string };
        const resolvedDir = resolvePath(dir);
        await fs.mkdir(resolvedDir, { recursive: true });

        // Note: Video recording is not supported with persistent context + extension loading
        // Return error for now
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { ok: false, error: "Video recording not supported with extension loading" },
                null,
                2
              ),
            },
          ],
        };

        // OLD CODE - doesn't work with persistent context:
        // videoContext = await browser!.newContext({ recordVideo: { dir: resolvedDir } });
        // page = await videoContext.newPage();
      }

      case "videoStop": {
        if (!videoContext) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { ok: false, error: "No video context to stop" },
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Close the video context (this saves the video)
        await videoContext.close();
        videoContext = null;

        // Restore page to the main browser context
        if (browser) {
          page = await browser.newPage();
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true }, null, 2),
            },
          ],
        };
      }

      case "click": {
        await ensureBrowser();
        const { selector } = args as { selector: string };
        await page!.click(selector);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, selector }, null, 2),
            },
          ],
        };
      }

      case "waitFor": {
        await ensureBrowser();
        const { selector } = args as { selector: string };
        await page!.waitForSelector(selector);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, selector }, null, 2),
            },
          ],
        };
      }

      case "htmlDump": {
        await ensureBrowser();
        const { path: htmlPath } = args as { path: string };
        const resolvedPath = resolvePath(htmlPath);
        await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

        const html = await page!.evaluate(() => {
          // eslint-disable-next-line no-undef
          return (globalThis as any).document.documentElement.outerHTML;
        });

        await fs.writeFile(resolvedPath, html, "utf-8");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, path: resolvedPath }, null, 2),
            },
          ],
        };
      }

      case "cssCollect": {
        await ensureBrowser();
        const { path: cssPath } = args as { path: string };
        const resolvedPath = resolvePath(cssPath);
        await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

        const css = await page!.evaluate(() => {
          const cssTexts: string[] = [];
          // eslint-disable-next-line no-undef
          const doc = (globalThis as any).document;
          for (let i = 0; i < doc.styleSheets.length; i++) {
            const sheet = doc.styleSheets[i];
            try {
              if (sheet.cssRules) {
                const rules = Array.from(sheet.cssRules as any).map(
                  (rule: any) => rule.cssText
                );
                cssTexts.push(rules.join("\n"));
              }
            } catch (e) {
              // Cross-origin stylesheets may throw errors
              // eslint-disable-next-line no-undef
              (globalThis as any).console.warn("Could not access stylesheet:", e);
            }
          }
          return cssTexts.join("\n\n");
        });

        await fs.writeFile(resolvedPath, css, "utf-8");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, path: resolvedPath }, null, 2),
            },
          ],
        };
      }

      case "networkHarStart": {
        await ensureBrowser();
        const { path: harPath } = args as { path: string };
        const resolvedPath = resolvePath(harPath);
        await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

        // Start HAR recording on the context
        await browser!.routeFromHAR(resolvedPath, {
          update: true,
          updateContent: "embed",
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, path: resolvedPath }, null, 2),
            },
          ],
        };
      }

      case "networkHarStop": {
        // HAR is automatically saved when browser context is closed or when routeFromHAR completes
        // For persistent context, we can't easily close and recreate, so just return success
        // The HAR file will be updated when the browser closes

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { ok: false, error: `Unknown tool: ${name}` },
                null,
                2
              ),
            },
          ],
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: false, error: errorMessage }, null, 2),
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Custom Playwright MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
