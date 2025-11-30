---
name: MCP Playwright Logger & AutoFix
description: Adds robust event logging (console/request/response/pageerror) and an auto-fix layer with retries to a Playwright MCP server. Writes logs to artifacts/logs/runtime.log with timestamps, levels, correlation IDs, and returns structured MCP responses. Includes a selfTest command.
role: system
triggers:
  - "update logging"
  - "enable autofix"
  - "add runtime logs"
  - "mcp playwright logs"
  - "self test"
audience: developers using Claude Code + Playwright MCP in Cursor
success_criteria:
  - artifacts/logs/runtime.log exists; events are appended with ISO timestamps + levels
  - page console/request/response/pageerror events are logged
  - handler errors include a correlation ref and are referenced across retries
  - handlers wrapped in safeRun return { ok, data?, error?, errorRef?, attempts, fixesApplied[] }
  - selfTest MCP method runs and shows the last 20 lines of runtime.log and any error screenshot path
---

# Objectives
1) **Event logging**: Wire `page.console`, `page.request`, `page.response`, `page.pageerror` to a unified logger that writes **NDJSON** and **pretty single-line** mirrors to `artifacts/logs/runtime.log`.
2) **Timestamps + levels**: Every line includes ISO timestamp + level (`INFO | WARN | ERROR`) and an `event` field.
3) **Error correlation**: On errors, generate a stable `errorRef` (correlation ID). All follow-up logs (retries/autofix) reference this `ref`.
4) **Auto-fix layer**: Add a `safeRun()` wrapper used by all handlers (navigate, click, waitFor, fill, screenshot, traceStart/Stop, videoStart/Stop, htmlDump, cssCollect, networkHarStart/Stop). It retries with healing steps (requery, scrollIntoView, waitForLoadState, backoff, text-role fallbacks).
5) **Structured results**: Handlers return `{ ok, data?, error?, errorRef?, attempts, fixesApplied: string[] }` instead of throwing.
6) **Self-test**: Add an MCP `selfTest()` method that navigates to example.com, intentionally fails a selector, triggers auto-fix, and returns the last 20 lines of `runtime.log` plus any error screenshot path.
7) **Artifacts setup**: Ensure `artifacts/` and subfolders exist at runtime (especially `artifacts/logs/`).

# Constraints & Notes
- **Paths**: Prefer relative `./artifacts/...`. Create missing folders recursively.
- **No secrets in logs**: Redact tokens/cookies/passwords (basic regex heuristic).
- **Performance**: Logging is line-buffered; do not dump full response bodies.
- **Compatibility**: TypeScript or JS is fine; keep imports simple. Avoid nonstandard deps unless necessary.
- **Idempotent**: Re-running should not duplicate config or break the server.

# Deliverables
- `scripts/setup-artifacts.mjs` (create artifacts tree; add `.gitkeep` files)
- `src/logger.ts` (or `.js`)
- `src/autofix.ts` (or `.js`)
- Updated server/handlers (e.g., `server.ts` or `src/handlers.ts`) with:
  - Event listeners wired to `logger`
  - All MCP handlers wrapped in `safeRun`
- MCP method: `selfTest()`
- Package scripts updated to run setup automatically

# Implementation Plan
1) **Artifacts setup**
   - Create (if missing):
     - `artifacts/`
     - `artifacts/{videos,steps,dom,css,network,a11y,logs}`
   - Add `scripts/setup-artifacts.mjs` and hook it in `package.json` via:
     - `"setup:artifacts": "node scripts/setup-artifacts.mjs"`
     - `"postinstall": "node scripts/setup-artifacts.mjs"`

2) **Logger**
   - File: `src/logger.ts`
   - Export:
     - `log(line: LogLine): void` → writes **one NDJSON line** and a **pretty single-line** mirror to `artifacts/logs/runtime.log`
     - `newRef(prefix?: string): string` → e.g., `err_2025-10-20T08-23-45.678Z_7c2a`
     - `mapConsoleLevel(type): "INFO"|"WARN"|"ERROR"`
   - `LogLine` fields: `{ ts, level, event, ref?, ctx?, msg? }`
   - Pretty line example:
     - `[2025-10-20T08:23:09.123Z] INFO response 200 GET https://example.com (ref: err_abc123)`

3) **Event listeners**
   - In server bootstrap after `page` is ready:
     - `page.on("console", ...)`
     - `page.on("pageerror", ...)` → generate `ref`, include `stack` in `ctx`
     - `page.on("request", ...)`
     - `page.on("response", ...)` → `level` by status (>=500 ERROR, >=400 WARN)
   - Log browser/version, UA, viewport at start.

4) **Auto-fix wrapper**
   - File: `src/autofix.ts`
   - Export:
     - `async function safeRun(label, ctx, fn)`
   - Env/config defaults:
     - `AUTO_FIX = process.env.AUTO_FIX !== "false"`
     - `MAX_RETRIES = Number(process.env.MAX_RETRIES || 2)`
     - `BACKOFF_MS = Number(process.env.BACKOFF_MS || 400)`
   - On failure:
     - Create `errorRef = newRef()`
     - Log `ERROR event:"handler"` with `ref:errorRef`, `ctx:{label, selector, url}`
     - If `AUTO_FIX`, attempt healing steps (log each step `event:"autofix" level:"WARN"`):
       1) Re-query locator & `waitFor({ state:"visible" })`
       2) `scrollIntoViewIfNeeded()`
       3) `waitForLoadState("domcontentloaded")` then `"networkidle"` (best effort)
       4) Retry action
       5) If detached/not visible: refetch locator and retry
       6) Navigation timeouts: retry `goto` with `waitUntil:"domcontentloaded"`, then `waitForLoadState("networkidle")`
       7) If prior 429/5xx: exponential backoff `(BACKOFF_MS * 2**attempt)`
       8) Last-resort selector healing for clicks: try `getByRole('button', { name })`, `getByText(name)`, or `:has-text(...)`
     - On final failure: take screenshot `artifacts/steps/error-${errorRef}.png` and include path in returned `ctx`
   - Return `{ ok, data?, error?, errorRef?, attempts, fixesApplied: string[] }`

5) **Wrap handlers**
   - Wrap: `navigate`, `waitFor`, `click`, `fill`, `screenshot`, `traceStart`, `traceStop`, `videoStart`, `videoStop`, `htmlDump`, `cssCollect`, `networkHarStart`, `networkHarStop`
   - Example:
     ```ts
     export async function click(selector: string) {
       return safeRun("click", { page, selector, args:{ selector } }, async () => {
         const loc = page.locator(selector);
         await loc.waitFor({ state: "visible", timeout: 5000 });
         await loc.scrollIntoViewIfNeeded();
         await loc.click();
         return { selector };
       });
     }
     ```

6) **Self-test MCP method**
   - `selfTest()`:
     - `navigate("https://example.com")`
     - Intentionally `waitFor(".this-does-not-exist")` to trigger auto-fix
     - Return:
       - Last 20 lines of `artifacts/logs/runtime.log`
       - Any error screenshot paths created
       - Summary `{ ok, attempts, fixesApplied }`

7) **Security**
   - Redact secrets in logs (mask likely tokens/cookies/passwords)
   - Do not log response bodies; log method, URL, status only

# Tasks (execute in order)
- Create/patch `scripts/setup-artifacts.mjs`; run it (postinstall and manual).
- Add `src/logger.ts` and `src/autofix.ts`.
- Wire event listeners in server bootstrap.
- Wrap existing MCP handlers with `safeRun`.
- Add `selfTest()` MCP method and export in the tool schema.
- Update `package.json` scripts and run `npm run setup:artifacts`.
- Provide a README snippet on how to run `selfTest()` via MCP.

# Verification Checklist
- [ ] `npm i` completes; `postinstall` creates artifacts subfolders
- [ ] Event logs appear in `artifacts/logs/runtime.log` when browsing
- [ ] Induced handler error yields `ERROR` with `ref`, retries, and a final screenshot
- [ ] Handlers return structured result with `ok/attempts/fixesApplied`
- [ ] `selfTest()` returns recent log lines and screenshot path

# Example Follow-up Commands (for the agent to run/offer)
- Run: `npm run setup:artifacts`
- Run MCP: `selfTest()`
- Navigate sample: `navigate("https://example.com")` → `screenshot("artifacts/steps/home.png")`
- Tail logs: show last 20 lines of `artifacts/logs/runtime.log`

# Output Format
- Summarize files created/modified
- Show key code excerpts (logger, safeRun, event wiring)
- Provide copy-paste commands to run tests
- Print the final MCP schema additions (including `selfTest`)
