name: agent-Convex-AI-SDK-GhostJobDetector
description: Implements Ghost Job Detector using Convex Actions & AI SDK
model: inherit
color: purple
tech_stack:
  framework: Next.js
  database: convex
  auth: convex
  provider: Convex AI SDK
generated: 2025-10-17T11:17:00Z
documentation_sources:
  - https://www.convex.dev/docs/actions
  - https://www.youtube.com/watch?v=R9K13R7eWnM (Convex AI SDK: The Fastest Way to Ship Reactive AI Apps)
  - https://www.convex.dev/blog/unbreakable-ai-chat-streaming-responses-with-convex-and-vercel-ai-sdk
  - https://www.convex.dev/components/agent (AI Agent Component)
  - https://www.youtube.com/watch?v=F3a37y5iU3Y (The Ultimate Convex Beginner Tutorial - Part 2 - Actions)
  - https://www.convex.dev/components/persistent-text-streaming (Persistent Text Streaming Component)
  - https://www.youtube.com/watch?v=48_wV0sE2xY (Streaming vs. Syncing: Why Your Chat App Is Burning Bandwidth)
  - https://www.npmjs.com/package/@convex-dev/ai-sdk-google
  - https://www.convex.dev/docs/authentication
  - https://www.convex.dev/docs/file-storage
  - https://www.convex.dev/pricing

---

# Agent: Ghost Job Detector Implementation with Convex AI SDK

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a "Ghost Job Detector" feature. It leverages Convex Actions for external AI model interactions and complex analysis, Convex Mutations for persistent storage of detection results, and Convex Queries for real-time frontend display. The Convex AI SDK (Agent Component) will be the primary tool for orchestrating LLM calls, managing conversation context, and incorporating RAG for enhanced analysis.
**Tech Stack**: Next.js (App Router), Convex (Database, Serverless Functions), Convex Auth, Convex AI SDK (Agent Component), Vercel AI SDK (underlying for some Convex AI SDK features), Tailwind CSS.
**Source**: Refer to the `documentation_sources` section in the YAML header for all referenced URLs.

## Critical Implementation Knowledge
### 1. Convex AI SDK Latest Updates 🚨
Convex has introduced its own **AI SDK (Agent Component)**, which is a core building block for AI agents directly within Convex. This component handles chat history, threads, messages, and provides abstractions for using LLMs. It supports agents for `agentic` workflows and durable workflows for multi-step operations. Critically, it enables streaming text and objects using deltas over WebSockets, ensuring real-time client synchronization without needing traditional HTTP streaming. It also offers built-in hybrid vector/text search for Retrieval Augmented Generation (RAG) and integrates with a Rate Limiter Component. This is a significant evolution from merely integrating the Vercel AI SDK within a Convex Action, as Convex now provides higher-level primitives.

The **Persistent Text Streaming component** is also a key update, offering a robust way to stream AI responses while ensuring data persistence in the database, balancing immediate UI feedback with data integrity and availability across sessions/users.

### 2. Common Pitfalls & Solutions 🚨
*   **Pitfall**: Attempting `fetch` or other side-effecting operations (like directly calling an LLM API) within Convex Queries or Mutations.
    *   **Solution**: **ALWAYS use Convex Actions** for external API calls, complex computations, or any non-deterministic logic. Actions are designed for side-effects.
*   **Pitfall**: Losing AI-generated content on page refresh or across multiple users when using basic HTTP streaming for AI responses.
    *   **Solution**: Employ Convex's **Persistent Text Streaming component**. This component intelligently combines HTTP streaming for the initial user (fast feedback) with database persistence for all chunks, making the content durable and viewable by other users or after a refresh.
*   **Pitfall**: Inconsistent data when an Action calls multiple `ctx.runQuery` or `ctx.runMutation` calls. Each `runQuery`/`runMutation` within an Action runs in its own transaction, meaning they are not guaranteed to be consistent with each other.
    *   **Solution**: For operations requiring transactional consistency, create a single **internalMutation** or **internalQuery** that encapsulates all necessary database operations. The Action then calls this single internal function.
*   **Pitfall**: Next.js Server Components caching data fetched from Convex, leading to stale data on subsequent requests.
    *   **Solution**: For Server Components that need dynamic, real-time data, use `export const dynamic = "force-dynamic"` in your page or layout file to prevent static caching.
*   **Pitfall**: Exposing sensitive LLM API keys directly in client-side code or poorly secured backend functions.
    *   **Solution**: Store all LLM API keys (e.g., `OPENAI_API_KEY`) as **Convex environment variables** and access them securely within your Convex Actions (`process.env.OPENAI_API_KEY`). Never expose these in client-side bundles.

### 3. Best Practices 🚨
*   **Convex Function Paradigm**:
    *   **Convex Queries**: For data reads and real-time subscriptions. Must be deterministic.
    *   **Convex Mutations**: For database writes and state changes. Must be deterministic and transactional.
    *   **Convex Actions**: For external API calls, complex business logic, third-party integrations (like AI models). Can have side-effects and be non-deterministic.
*   **Modular Backend Structure**: Organize your Convex functions in the `convex/` directory. Use `internalQuery`, `internalMutation`, and `internalAction` for private functions that are only callable from other Convex functions.
*   **Transactional Scheduling**: If an Action needs to be triggered after a Mutation, use `ctx.scheduler.runAfter()` or `ctx.scheduler.runAt()` from within the Mutation. This ensures the Action is only scheduled if the Mutation successfully commits, maintaining transactional integrity.
*   **Error Handling in Actions**: Since Actions are not automatically retried by Convex, implement robust error handling (e.g., `try-catch` blocks, logging, fallback mechanisms) within your Action handlers.
*   **Runtime Selection**: For AI SDK integrations, consider if the default Convex JavaScript runtime suffices. If specific Node.js APIs or unsupported NPM packages are required by the AI SDK, define the Action with `"use node"` at the top of the file. Note that Node.js Actions might incur cold starts.
*   **Authentication**: Always use `ctx.auth.getUserIdentity()` at the beginning of public functions to ensure the user is authenticated and authorized before proceeding with sensitive operations.
*   **Schema Validation**: Use `v` from `convex/values` to define precise schemas for your database tables and function arguments, enabling robust type checking and validation.

## Implementation Steps

### Backend Implementation (Convex)
The backend logic for the Ghost Job Detector will primarily reside within Convex functions, adhering to the Query-Mutation-Action paradigm.

1.  **Define Schema**: Create a `schema.ts` file to define tables for `jobPostings` (containing raw job data), `ghostJobReports` (for AI analysis results), and potentially `userProfiles` (for authentication context) and `files` (if attachments are involved).
2.  **Authentication**: Implement Convex authentication (e.g., using Clerk or Auth0 integration) to identify users making detection requests and store their Convex `tokenIdentifier`.
3.  **Core Job Posting Management (Mutations/Queries)**:
    *   `createJobPosting`: A mutation to add new job listings to the database.
    *   `getJobPosting`, `listJobPostings`: Queries to retrieve job data for display.
4.  **Ghost Job Analysis Orchestration (Convex Action)**:
    *   `detectGhostJob`: An internal action that will orchestrate the AI analysis. This action will:
        *   Receive a `jobPostingId`.
        *   Fetch the job posting details from the database using `ctx.runQuery`.
        *   Construct a detailed prompt for the LLM based on posting history, patterns, company profile, salary, etc.
        *   Interact with the Convex AI SDK (Agent Component) or directly with the LLM API (e.g., OpenAI) to perform the analysis.
        *   Parse the LLM's response to extract detection probability, reasons, timeline data, and recommended next steps.
        *   Store the analysis results in the `ghostJobReports` table via `ctx.runMutation`.
        *   Optionally, handle file analysis using Convex File Storage if job descriptions are uploaded.
5.  **Triggering Analysis (Convex Mutation + Scheduler)**:
    *   `initiateGhostJobDetection`: A public mutation that frontend clients call when a job posting needs to be analyzed.
    *   This mutation will update the job posting status (e.g., "analysis_pending") and then use `ctx.scheduler.runAfter()` to asynchronously invoke the `detectGhostJob` internal action. This ensures the UI is immediately responsive and the analysis is kicked off durably.
6.  **Retrieving Analysis Results (Convex Query)**:
    *   `getGhostJobReport`: A query to fetch the analysis report for a given `jobPostingId`, subscribing the frontend to real-time updates as the AI analysis progresses.

#### Convex Functions (Primary)
*   `convex/schema.ts`: Defines `jobPostings`, `ghostJobReports`, `userProfiles` tables.
*   `convex/jobPostings.ts`:
    *   `mutation: createJobPosting` (for adding new job data)
    *   `query: getJobPosting`, `listJobPostings` (for fetching job data)
*   `convex/ghostDetector.ts`:
    *   `internalAction: detectGhostJob` (orchestrates AI analysis, calls LLM, saves results via mutation)
    *   `mutation: initiateGhostJobDetection` (triggers `detectGhostJob` via scheduler, updates job status)
    *   `mutation: saveGhostJobReport` (internal, called by `detectGhostJob` to persist results)
    *   `query: getGhostJobReport` (fetches analysis results for a job)
*   `convex/auth.ts`: (If custom auth setup beyond basic Convex integrations) Contains `getUserIdentity` helper logic.
*   `convex/files.ts`: (If using Convex File Storage for attachments)
    *   `mutation: generateUploadUrl` (for client-side file uploads)
    *   `internalAction: storeFileFromUrl` (for server-side fetching/storing files)
    *   `query: getFileMetadata` (for retrieving file info)

### Frontend Integration (Next.js)
1.  **Convex Client Provider**: Wrap your Next.js application with `ConvexClientProvider` to enable Convex React hooks.
2.  **Job Posting Form**: A client component to create new job postings, calling the `createJobPosting` mutation.
3.  **Job Listing Page**: A client component displaying `listJobPostings` via `useQuery`.
4.  **Detection Trigger**: A button or similar UI element on the job posting detail page that calls `initiateGhostJobDetection` mutation.
5.  **Ghost Job Report Display**:
    *   A client component that uses `useQuery(api.ghostDetector.getGhostJobReport, { jobPostingId })` to display the detection results.
    *   Utilize UI components (e.g., timeline, explainability section) to visualize the AI analysis from the fetched report.
    *   If streaming AI responses, use the `useStream` hook from the Persistent Text Streaming component in this client component.

## Code Patterns

### Convex Backend Functions

#### `convex/jobPostings.ts` (Example Mutation)
This mutation handles adding a new job posting.

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const createJobPosting = mutation({
  args: {
    title: v.string(),
    company: v.string(),
    description: v.string(),
    salary: v.optional(v.string()),
    // ... other job posting fields
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const jobPostingId = await ctx.db.insert("jobPostings", {
      ...args,
      userId: identity.tokenIdentifier,
      status: "pending_analysis", // Initial status
      createdAt: Date.now(),
    });

    // Schedule the ghost job detection action asynchronously
    await ctx.scheduler.runAfter(0, api.ghostDetector.initiateGhostJobDetection, {
      jobPostingId,
    });

    return jobPostingId;
  },
});
```

#### `convex/ghostDetector.ts` (Example Action)
This internal action performs the actual AI analysis using an assumed `ConvexAIClient` (representing the Convex AI SDK or an integrated LLM client).

```typescript
import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { ConvexAIClient } from "@convex-dev/ai-sdk-example"; // Placeholder for Convex AI SDK/integration

// Initialize your AI client, potentially using environment variables
const aiClient = new ConvexAIClient({
  apiKey: process.env.OPENAI_API_KEY!, // Example: using OpenAI
});

export const detectGhostJob = internalAction({
  args: {
    jobPostingId: v.id("jobPostings"),
  },
  handler: async (ctx, args) => {
    // 1. Fetch job posting data
    const jobPosting = await ctx.runQuery(api.jobPostings.getJobPosting, {
      jobPostingId: args.jobPostingId,
    });

    if (!jobPosting) {
      throw new Error("Job posting not found.");
    }

    // 2. Prepare prompt for LLM
    const prompt = `Analyze the following job posting for signs of being a 'ghost job' (fake or non-existent).
    Consider:
    - Title: ${jobPosting.title}
    - Company: ${jobPosting.company}
    - Description: ${jobPosting.description}
    - Salary: ${jobPosting.salary || "Not specified"}
    - Previous posting patterns (hypothetically, from other data or user reports)

    Provide a likelihood score (0-100), key reasons, a timeline of suspicious activity (if applicable), and recommended next steps for a user.
    Format the output as JSON: {likelihood: number, reasons: string[], timeline: string[], nextSteps: string[]}.`;

    // 3. Call AI model using Convex AI SDK/client
    const aiResponse = await aiClient.analyzeJob(prompt);

    // Assuming aiResponse is parsed JSON
    const detectionResult = aiResponse; // Or parse it if it's a string

    // 4. Save results to database via an internal mutation
    await ctx.runMutation(api.ghostDetector.saveGhostJobReport, {
      jobPostingId: args.jobPostingId,
      likelihood: detectionResult.likelihood,
      reasons: detectionResult.reasons,
      timeline: detectionResult.timeline,
      nextSteps: detectionResult.nextSteps,
      analyzedAt: Date.now(),
      status: "completed",
    });

    // 5. Update job posting status
    await ctx.runMutation(api.jobPostings.updateJobPostingStatus, {
      jobPostingId: args.jobPostingId,
      status: "analysis_completed",
    });

    console.log(`Ghost job detection completed for ${args.jobPostingId}`);
    return detectionResult;
  },
});

export const initiateGhostJobDetection = mutation({
  args: {
    jobPostingId: v.id("jobPostings"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    // Update status and schedule the internal action
    await ctx.db.patch(args.jobPostingId, { status: "analysis_in_progress" });
    await ctx.scheduler.runAfter(0, api.ghostDetector.detectGhostJob, {
      jobPostingId: args.jobPostingId,
    });
    return true;
  },
});

export const saveGhostJobReport = internalMutation({
  args: {
    jobPostingId: v.id("jobPostings"),
    likelihood: v.number(),
    reasons: v.array(v.string()),
    timeline: v.array(v.string()),
    nextSteps: v.array(v.string()),
    analyzedAt: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("ghostJobReports", {
      ...args,
    });
  },
});
```

#### `convex/http.ts` (For Persistent Streaming, if needed)
If you decide to use the Persistent Text Streaming component for incremental display of AI reasoning, you'd route a POST request through `http.ts`.

```typescript
import { httpRouter } from "convex/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Example for Persistent Text Streaming component
// This would be part of the component itself, but shown here for context
http.route({
  path: "/stream-ghost-analysis",
  method: "POST",
  handler: api.persistentTextStreaming.stream, // Assuming a component's streaming action
});

export default http;
```

## Testing & Debugging
1.  **Convex Dashboard**:
    *   Use the "Functions" tab in the Convex dashboard to directly run and test your Queries, Mutations, and Actions with mock arguments. This is invaluable for isolated backend testing.
    *   Monitor the "Logs" tab to see `console.log` outputs and identify errors within your Convex functions.
    *   Inspect your database tables to verify that Mutations and Actions are correctly storing and updating data.
    *   The "Agent Playground" is available for debugging and iterating on prompts and context settings for the Convex AI SDK (Agent Component).
2.  **Unit Tests (Convex Test Utilities)**: Write unit tests for your Convex functions (queries, mutations, actions) using Convex's testing utilities. Focus on input validation, expected output, and correct database interactions.
3.  **End-to-End Testing**: Test the full flow from Next.js frontend to Convex backend, ensuring that UI interactions correctly trigger Convex functions and display updated results.
4.  **Error Handling**: Explicitly test error paths in your Actions (e.g., what happens if the LLM API call fails, or returns an unexpected format).

## Environment Variables
*   `CONVEX_DEPLOYMENT_URL`: Your Convex deployment URL (auto-generated by `npx convex dev` or deployment).
*   `NEXT_PUBLIC_CONVEX_URL`: Public URL for Convex client in Next.js.
*   `OPENAI_API_KEY`: API key for OpenAI (or other LLM provider). Used by Convex Actions to interact with the AI model.
*   `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: (If using Clerk for authentication).
*   `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`: (If using Auth0 for authentication).

Add these to your `.env.local` file and to your Convex deployment settings (`npx convex env set <VAR_NAME> <VALUE>`).

```
# .env.local
NEXT_PUBLIC_CONVEX_URL="YOUR_CONVEX_DEPLOYMENT_URL"
OPENAI_API_KEY="sk-..." # Or other LLM provider API key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..." # If using Clerk
CLERK_SECRET_KEY="sk_..." # If using Clerk
```

## Success Metrics
*   **Real-time Detection**: The UI accurately reflects the status of ghost job detection (e.g., "pending analysis", "analysis completed") in real-time.
*   **Accurate Analysis**: The AI model, via the Convex Action, correctly identifies potential ghost jobs and provides relevant explainability, timeline, and next steps.
*   **Data Persistence**: All job posting data and ghost job analysis reports are durably stored in the Convex database.
*   **Scalability**: The system can handle multiple concurrent job posting analyses without significant performance degradation.
*   **Security**: LLM API keys are securely managed via Convex environment variables and only accessed by authorized Convex Actions.
*   **Authentication**: Only authenticated and authorized users can initiate ghost job detection.
*   **Robustness**: The system gracefully handles errors during AI API calls and other external integrations.
*   **Frontend Responsiveness**: The Next.js frontend remains responsive during AI analysis, thanks to asynchronous Actions and the Convex scheduler. If streaming is implemented, AI responses appear incrementally.