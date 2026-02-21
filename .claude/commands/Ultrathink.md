---
description: "Use any MCPS and tools as necessary or useful to best complete these tasks. Ask me any questions as necessary. If an MCP or tool is necessary or useful and I do not have it installed, ask/recommend this to me first."
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, WebSearch, WebFetch, Task, AskUserQuestion, ToolSearch
argument-hint: <task description>
---

# Command: /Ultrathink

Complete the given task using the FULL power of every available MCP server, tool, skill, subagent, and resource. Leave no stone unturned.

**Task:** $ARGUMENTS

---

## Phase 0: Pre-Flight — Tool & MCP Audit

Before doing ANY work, run this checklist:

1. **Check available MCP servers** — Use `ToolSearch` to discover what MCP tools are loaded and available. Cross-reference against the known MCPs below.

2. **Check for relevant skills** — Scan `/agents` and `/plans` directories for anything matching the task. If a plan or agent exists, use it.

3. **Identify useful-but-missing tools** — If the task would benefit from an MCP or tool that is NOT installed, **stop and recommend it to the user before proceeding**. Explain what it does and why it would help. Examples:
   - Task involves database work but Supabase MCP has no token → recommend setting it up
   - Task involves design but Figma MCP has no token → recommend configuring it
   - Task needs a package/CLI that isn't installed → recommend installing it

4. **Ask clarifying questions** — Do NOT assume ambiguous requirements. Use `AskUserQuestion` to nail down:
   - Scope and acceptance criteria
   - Design/architecture preferences
   - Any constraints or things to avoid

---

## Phase 1: Research & Understand

Use these tools aggressively to understand the problem space:

### Web Research
| Tool | When to Use |
|------|-------------|
| **Perplexity** (`perplexity_ask`, `perplexity_research`, `perplexity_reason`) | Deep research, multi-source investigation, complex reasoning |
| **Brave Search** (`brave_web_search`, `brave_news_search`) | Quick fact lookups, recent news, finding URLs |
| **Tavily** | Web search with AI-powered summarization |
| **Exa** | Neural/semantic web search for nuanced queries |
| **WebSearch / WebFetch** | Built-in web search and page fetching |

### Documentation & Code Reference
| Tool | When to Use |
|------|-------------|
| **Context7** (`resolve-library-id`, `query-docs`) | Look up current docs for ANY library or framework |
| **Explore subagent** | Deep codebase exploration across multiple files |
| **Glob / Grep / Read** | Targeted file search and reading |

### Design & UI Reference
| Tool | When to Use |
|------|-------------|
| **Figma MCP** | Pull designs, inspect components, get design specs |
| **Magic / 21st.dev** (`magic_component_builder`, `magic_component_inspiration`) | Generate UI components, get design inspiration |

---

## Phase 2: Plan & Design

1. **Launch Plan subagent(s)** to design the implementation approach
2. **Use `AskUserQuestion`** to validate the approach with the user before building
3. **Check for existing patterns** in the codebase — reuse, don't reinvent

---

## Phase 3: Implement

Use the right tool for each part of the job:

### Code & File Operations
- **Read / Edit / Write** — File operations (prefer Edit over Write for existing files)
- **Bash** — Git, npm, system commands, running scripts
- **Task subagents** — Parallelize independent work streams

### Browser & Testing
| Tool | When to Use |
|------|-------------|
| **Chrome DevTools MCP** (port 9222) | Test in the debug browser — navigate, click, screenshot, evaluate scripts |
| **Playwright MCP** | Automated browser testing, form filling, visual verification |
| **Puppeteer MCP** | Alternative browser automation |

### UI Building
| Tool | When to Use |
|------|-------------|
| **Magic / 21st.dev** | Generate React/shadcn components |
| **shadcn-ui-designing skill** | Design system components following shadcn patterns |
| **VS Code MCP** | Editor integration for previewing changes |

### Time & Utilities
| Tool | When to Use |
|------|-------------|
| **Time MCP** | Get current time, convert timezones, calculate deadlines |

---

## Phase 4: Verify & Test

1. **Run the code** — `npm run dev`, `npm run build`, or whatever is appropriate
2. **Test in browser** — Use Chrome DevTools MCP to visually verify
3. **Run tests** — `npm test` if applicable
4. **Check for errors** — Lint, TypeScript, build errors

---

## Phase 5: Report

Summarize what was done:
- What was built/changed
- What tools and MCPs were used
- Any remaining issues or follow-up items
- Ask if the user wants to deploy (suggest `/kickpush` if so)

---

## Core Principles

- **Use EVERY relevant tool** — Don't just use Read/Edit when Perplexity research or Context7 docs would give better results
- **Parallelize** — Launch multiple Task subagents for independent work streams
- **Ask, don't assume** — Use `AskUserQuestion` liberally for ambiguous decisions
- **Recommend missing tools** — If something useful isn't available, tell the user FIRST
- **Quality over speed** — This is Ultrathink mode. Be thorough. Research deeply. Build carefully.
