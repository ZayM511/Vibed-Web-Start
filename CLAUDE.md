# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude Code Instructions

### Subagents, Plans and Skills
- **`/skills`** - contains the custom skills you can use to do specific things
  - Before proceeding please check if there is a skill for the requested action
- **`/agents`** - Contains custom agent personas
  - Before implementing features, check if a relevant agent exists in this directory that can be invoked
  - Invoke custom agents using the Task tool when their expertise matches the request
  - If no matching agent exists, proceed with the task normally
- **`/plans`** - Contains plans for implementing new features
  - Usually called out to be used by an agent or user
  - Before implementing features, check if a relevant plan exists in this directory
  - If a user requests a feature with a plan, always reference and follow that plan
  - If no matching plan exists, proceed with the implementation with your own plan

**IMPORTANT**: Always check these directories when starting a new feature or task. subagents, skills and plans provide project-specific expertise and tested approaches when available.

## Commands

### Development
- `npm run dev` - Runs both Next.js frontend and Convex backend in parallel
  - http://localhost:3000
  - Convex dashboard opens automatically

### Convex
- `npx convex dev` - Start Convex development server (auto-started with `npm run dev`)
- `npx convex deploy` - Deploy Convex functions to production

## Architecture

This is a full-stack TypeScript application using:

### Frontend
- **Next.js 15** with App Router - React framework with file-based routing in `/app`
- **Tailwind CSS 4** - Utility-first styling with custom dark theme variables
- **shadcn/ui** - Pre-configured component library
- **Clerk** - Authentication provider integrated via `ClerkProvider` in app/layout.tsx

### Backend
- **Convex** - Real-time backend with:
  - Database schema defined in `convex/schema.ts`
  - Server functions in `convex/` directory (myFunctions.ts, todos.ts)
  - Auth config in `convex/auth.config.ts` (requires Clerk JWT configuration)

### Key Integration Points
- **ConvexClientProvider** (components/ConvexClientProvider.tsx) wraps the app with `ConvexProviderWithClerk` to integrate Convex with Clerk auth
- **Middleware** (middleware.ts) protects `/server` routes using Clerk
- Path aliases configured: `@/*` maps to root directory

### Clerk JWT Configuration
1. Create a JWT template named "convex" in Clerk dashboard
2. Set issuer domain in the template
3. Add `CLERK_JWT_ISSUER_DOMAIN` environment variable in Convex dashboard

## Project Structure
- `/app` - Next.js pages and layouts (App Router)
  - `/app/(auth)` - Authentication pages if needed
  - `/app/(protected)` - Protected routes requiring authentication
- `/components` - React components including sidebar and UI components
- `/convex` - Backend functions, schema, and auth configuration
  - `schema.ts` - Database schema definition
  - `auth.config.ts` - Clerk authentication configuration
- `/public` - Static assets including custom fonts
- `/agents` - Custom Claude Code agent definitions for specialized tasks
- `/plans` - Implementation plans and guides for specific features
- `middleware.ts` - Route protection configuration

## Key Architecture Patterns
- Uses TypeScript with strict mode enabled
- Path aliases configured with `@/*` mapping to root directory
- Components follow React patterns with Tailwind CSS for styling
- Real-time data synchronization with Convex
- JWT-based authentication with Clerk
- Custom hooks for framework integration
- ESLint configuration for code quality

## Authentication & Security
- Protected routes using Clerk's authentication in middleware.ts
- User-specific data filtering at the database level in Convex
- JWT tokens with Convex integration
- ClerkProvider wraps the app in app/layout.tsx
- ConvexClientProvider integrates Convex with Clerk auth

## Backend Integration
- Convex provides real-time database with TypeScript support
- All mutations and queries are type-safe
- Automatic optimistic updates and real-time sync
- Row-level security ensures users only see their own data
- Use `useQuery`, `useMutation`, and `useAction` hooks in Next.js components

## Styling Approach
- Tailwind CSS 4 with custom dark theme variables
- shadcn/ui component library for pre-built components
- Responsive design with mobile-first approach
- Consistent design system across the application

## API Key Management
When implementing features that require API keys:
1. Ask the user to provide the API key
2. Add the key to `.env.local` file yourself (create the file if it doesn't exist)
4. Never ask the user to manually edit environment files - handle it for them

## Convex Backend Development
**IMPORTANT**: When implementing any features or changes that involve Convex:
- ALWAYS refer to and follow the guidelines in `convexGuidelines.md`
- This file contains critical best practices for:
  - Function syntax (queries, mutations, actions, internal functions)
  - Validators and type safety
  - Schema definitions and index usage
  - File storage patterns
  - Scheduling and cron jobs
  - Database queries and performance optimization
- Following these guidelines ensures type safety, proper security, and optimal performance
- Never deviate from these patterns without explicit user approval

## Modular Code Best Practice
**IMPORTANT**: Write modular, reusable code to optimize token usage and maintainability:
- Break down large pages into smaller, focused components
- Extract reusable UI elements into separate component files
- Keep pages concise by delegating logic to components and hooks
- Avoid pages that are thousands of lines long - this saves tokens and improves code quality

## UI-First Implementation Approach
**IMPORTANT**: When implementing new features or screens:
1. **Build the UI first** - Create the complete visual interface with all elements, styling, and layout
2. **Match existing design** - New designs should closely match the existing UI screens, pages, and components, unless otherwise stated by the user
3. **Then add functionality** - After the UI is in place, implement the business logic, state management, and backend integration
4. This approach ensures a clear separation of concerns and makes it easier to iterate on both design and functionality independently

## Browser Testing for JobFiltr Extension

### Critical: Use Existing Debug Browser

**DO NOT launch new browser instances for testing.**

Connect to the existing Chrome debug session at `http://localhost:9222`

The debug browser is pre-configured with:
- JobFiltr extension loaded (unpacked from C:\Users\isaia\OneDrive\Documents\2025 Docs\Claude Copy\Vibed-Web-Start-1\chrome-extension)
- LinkedIn authenticated (for beta testing)
- Indeed authenticated (primary platform)
- No automation detection flags

### How to Connect

Use Chrome DevTools MCP to connect to the running debug browser:
- Browser URL: `http://localhost:9222`
- Use `browser.disconnect()` when done, **never** `browser.close()`

### If Debug Browser Isn't Running

Tell me to wait, then instruct the user to launch it manually:
```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-debug-profile"
```

**Do not attempt to launch Chrome yourself.** The user must launch it manually to preserve:
- Extension installation
- Login sessions  
- Clean automation fingerprint

### Testing Workflow

1. Connect to debug browser on port 9222
2. Navigate to Indeed or LinkedIn job listings
3. Verify JobFiltr UI elements are injected
4. Test filter functionality
5. Take screenshots to verify state
6. Disconnect (don't close) when done

### Platform-Specific Notes

- **Indeed (Primary)**: Full testing support. Indeed's DOM is stable.
- **LinkedIn (Beta Only)**: Limited testing. LinkedIn aggressively detects automation and changes DOM structure frequently. If LinkedIn blocks access or behaves unexpectedly, note it and move on - this is expected behavior.

### Common Mistakes to Avoid

- ❌ Launching a new browser instance
- ❌ Using `puppeteer.launch()` or `playwright.launch()`
- ❌ Attempting to log into LinkedIn programmatically
- ❌ Calling `browser.close()` (kills the debug session)
- ✅ Using `puppeteer.connect()` or CDP connection
- ✅ Using existing authenticated sessions
- ✅ Calling `browser.disconnect()` to detach cleanly

## Browser Automation Rules

**ALWAYS use the Chrome DevTools MCP tools for browser interactions.**

DO NOT:
- Write Puppeteer scripts via Bash
- Write Playwright scripts via Bash
- Use `node -e` with browser automation code
- Install or require puppeteer/puppeteer-core

DO:
- Use the Chrome DevTools MCP tools directly (they're already connected to port 9222)
- Use MCP tools like `devtools_screenshot`, `devtools_navigate`, `devtools_click`, etc.

The Chrome DevTools MCP is already connected to the debug browser. Use its native tools instead of writing scripts.