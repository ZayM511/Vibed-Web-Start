```yaml
name: agent-convex-manual-scan
description: Implements Manual Scan using Convex Actions, Cheerio, and AI SDK
model: inherit
color: purple
tech_stack:
  framework: Next.js
  database: convex
  auth: convex
  provider: Convex, Cheerio, AI SDK
generated: 2025-10-17T11:21:00Z
documentation_sources:
  - https://www.convex.dev/docs/actions
  - https://www.convex.dev/docs/best-practices
  - https://www.convex.dev/docs/runtimes#node-js-runtime
  - https://www.convex.dev/docs/file-storage
  - https://www.convex.dev/docs/authentication
  - https://www.convex.dev/docs/limits
  - https://www.convex.dev/docs/http-actions
  - https://www.convex.dev/blog/unbreakable-ai-chat-streaming-responses-with-convex-vercel-ai-sdk
  - https://www.convex.dev/blog/convex-ai-sdk-the-fastest-way-to-ship-reactive-ai-apps
  - https://www.npmjs.com/package/cheerio
  - https://ai.vercel.ai/docs
  - https://ai.vercel.ai/docs/guides/node
  - https://ai.vercel.ai/docs/guides/structured-output
  - https://github.com/vercel/ai
  - https://raddy.dev/blog/simple-web-scraper-nodejs-fetch-cheerio/
  - https://www.freecodecamp.org/news/how-to-scrape-websites-with-node-js-and-cheerio/
```

# Agent: Manual Scan Implementation with Convex, Cheerio & AI SDK

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a "Manual Scan" feature. This feature allows users to paste a job link or raw job text, optionally provide context (e.g., their location or application status), and then run a scanner. The scanner will generate a detailed report with confidence scores, which can be exported, saved to history, or trigger a deeper emailed report. All backend logic leverages Convex actions, mutations, and queries, integrating with Cheerio for HTML parsing and the Vercel AI SDK for AI capabilities.
**Tech Stack**: Next.js (frontend), Convex (backend, database, authentication, file storage), Cheerio (HTML parsing), Vercel AI SDK (AI capabilities).
**Source**: Convex Developer Hub, Vercel AI SDK Documentation, Cheerio npm.

## Critical Implementation Knowledge
### 1. Convex Latest Updates 🚨
*   **Node.js Runtime `use node` Directive**: Convex actions can now explicitly opt-in to a Node.js runtime by adding `"use node";` at the top of the action file. This is crucial for integrating Node.js-specific libraries like Cheerio or certain AI SDK providers that might rely on Node.js APIs not present in Convex's default (Cloudflare Workers-like) runtime.
*   **Convex AI SDK**: Convex has introduced its own AI SDK, which is built on top of the Vercel AI SDK. This SDK simplifies managing chat history, agents, and vector embeddings within Convex. While direct Vercel AI SDK integration is covered here, consider using Convex's native AI SDK for more complex AI workflows or when leveraging Convex's built-in RAG capabilities.
*   **Function Argument & Return Validators**: It's best practice to always include argument validators (`v.object`, `v.string`, `v.id`, etc.) and return value validators for all Convex functions (queries, mutations, and actions) for robust type safety and error handling. If a function returns nothing, explicitly specify `returns: v.null()`.
*   **Node.js Version**: Convex supports Node.js 18, 20, and 22 for actions. Node.js 18 has reached End-of-Life, and new deployments won't support it after September 10, 2025. Always target Node.js 20 or higher.

### 2. Common Pitfalls & Solutions 🚨
*   **Cheerio/AI SDK Not Working in Convex Functions**:
    *   **Pitfall**: Attempting to use Node.js-specific libraries (like Cheerio, or `node-fetch` if not using native `fetch`) directly in a standard Convex query or mutation, or an action without the `"use node"` directive.
    *   **Solution**: Ensure your backend logic involving Cheerio or the Vercel AI SDK (if it has Node.js-specific dependencies) is encapsulated within a Convex **Action** file that begins with `"use node";`.
*   **Direct Database Access from Actions**:
    *   **Pitfall**: Actions attempting `ctx.db.insert`, `ctx.db.get`, etc. directly. Actions operate outside the reactive sync engine and cannot directly interact with the database.
    *   **Solution**: Actions *must* interact with the database indirectly by calling **Convex queries** for reads (`ctx.runQuery`) and **Convex mutations** for writes (`ctx.runMutation`). This maintains Convex's transactional guarantees and reactivity.
*   **Unawaited Promises in Actions**:
    *   **Pitfall**: Forgetting to `await` all promises within an action (e.g., `fetch` calls, `ctx.runMutation` calls). This can lead to unexpected behavior or missed error handling, as actions are not automatically retried by Convex.
    *   **Solution**: Always `await` all asynchronous operations in Convex actions. Consider using ESLint rules like `no-floating-promises` to catch these issues.
*   **Sensitive Information in Frontend Environment Variables**:
    *   **Pitfall**: Storing API keys (like `OPENAI_API_KEY`) as `NEXT_PUBLIC_` environment variables, exposing them to the client.
    *   **Solution**: All sensitive API keys and secrets should be stored as private environment variables in your Convex deployment (e.g., `OPENAI_API_KEY`) and accessed *only* within Convex backend functions. Only `NEXT_PUBLIC_CONVEX_URL` should be client-side accessible.

### 3. Best Practices 🚨
*   **Modularize Backend Logic**: Organize your Convex functions logically. For this feature, create separate files for `scan` actions, `report` mutations, and `history` queries.
*   **Argument Validation**: Implement robust argument validation (`v.object`, `v.string`, etc.) for all Convex functions to ensure type safety and prevent malformed requests.
*   **Authentication & Authorization**: For all public Convex functions (queries, mutations, actions), explicitly check `ctx.auth.getUserIdentity()` to ensure the user is authenticated and authorized to perform the requested operation.
*   **Error Handling in Actions**: Since actions are not retried, implement comprehensive `try-catch` blocks and specific error handling for external API calls (e.g., `fetch` failures, AI model errors, Cheerio parsing issues). Log detailed errors for debugging.
*   **Minimize Work in Actions**: Actions should primarily orchestrate external calls and then delegate database writes to mutations. Keep them as lean as possible to improve scalability and throughput.
*   **Efficient Web Scraping**:
    *   When fetching content for Cheerio, use appropriate headers (e.g., `User-Agent`) to avoid being blocked.
    *   Be mindful of rate limits and terms of service of the websites you are scraping.
    *   Handle cases where the target URL might not be valid or might return non-HTML content.
*   **AI Prompt Engineering**: Craft clear and specific prompts for the AI SDK to ensure accurate and relevant report generation. Experiment with system prompts, few-shot examples, and structured output schemas (using `generateObject` and `zod`) for better results.
*   **Streaming vs. Batch AI**: For potentially long AI responses (like detailed reports), consider if streaming results back to the client via HTTP actions or a combination of action/mutation updates is beneficial for UX, or if a single batch response is sufficient. For "Manual Scan", a batch response after the report is complete is likely acceptable.

## Implementation Steps

### Backend Implementation
The backend will primarily consist of Convex actions to orchestrate external calls (web scraping, AI processing) and Convex mutations to persist the results. Convex queries will handle retrieving scan history.

#### Convex Functions (Primary)
1.  **`convex/scans/actions.ts` (`"use node";`)**:
    *   **`scrapeAndAnalyzeAction`**: This is the core orchestrating action. It will accept the job link/text and optional user context.
        *   If a link is provided, it will use `fetch` to retrieve the HTML content.
        *   It will then use `Cheerio.load()` to parse the HTML and extract relevant job details (title, company, description, requirements, etc.).
        *   It will construct a detailed prompt for the AI model using the extracted job details and user-provided context.
        *   It will call the Vercel AI SDK (`generateText` or `generateObject`) to generate the detailed report and confidence scores.
        *   Finally, it will call an internal Convex mutation (`saveScanResultMutation`) to store the generated report.
    *   **`requestDeeperReportAction`**: This action will be triggered when a user requests a more in-depth emailed report. It will take the `scanId` and user's email.
        *   It will retrieve the full scan report using `ctx.runQuery`.
        *   It will format the report for email.
        *   It will call an external email service (e.g., SendGrid, Resend) API to send the email.

2.  **`convex/scans/mutations.ts`**:
    *   **`saveScanResultMutation`**: This mutation will receive the AI-generated report, confidence scores, original job input, and user ID. It will write this data into a `scans` table in Convex DB.
    *   **`updateScanResultMutation`**: (Optional) For updating existing reports, e.g., adding an export link or marking as "emailed".
    *   **`deleteScanResultMutation`**: For users to remove items from their scan history.

3.  **`convex/scans/queries.ts`**:
    *   **`getScanHistoryQuery`**: This query will fetch a list of past scan reports for the authenticated user, ordered by creation time.
    *   **`getScanResultByIdQuery`**: This query will fetch a specific detailed scan report by its ID.

### Frontend Integration
1.  **Input Form Component**:
    *   A Next.js React component for users to input a job URL or paste raw job text.
    *   Fields for optional context (e.g., location, desired role, application status).
    *   A "Run Scan" button that triggers the `scrapeAndAnalyzeAction` via `useAction`.
    *   Display loading states while the scan is running.
2.  **Report Display Component**:
    *   A component to display the detailed report, confidence scores, and any other relevant information returned by the scan.
    *   Buttons to "Save to History" (calls `saveScanResultMutation`), "Export" (potentially generates a file using Convex File Storage and `ctx.storage.generateUploadUrl`), and "Request Deeper Report" (calls `requestDeeperReportAction`).
3.  **History Page/Component**:
    *   Displays a list of previously saved scan reports using `useQuery` with `getScanHistoryQuery`.
    *   Each item links to a detailed view (`getScanResultByIdQuery`).

## Code Patterns

### Convex Backend Functions

*   **Action for Web Scraping & AI Processing (`convex/scans/actions.ts`)**:
    ```typescript
    "use node"; // CRITICAL: Enables Node.js runtime for Cheerio and fetch
    import { action } from "../_generated/server";
    import { v } from "convex/values";
    import * as cheerio from "cheerio";
    import { generateObject, openai } from "@ai-sdk/openai"; // Using Vercel AI SDK
    import { z } from "zod";
    import { internal } from "../_generated/api";

    export const scrapeAndAnalyzeAction = action({
      args: {
        jobInput: v.string(), // Can be URL or raw text
        context: v.optional(v.string()), // User provided context
      },
      handler: async (ctx, { jobInput, context }) => {
        const userId = (await ctx.auth.getUserIdentity())?.subject;
        if (!userId) {
          throw new Error("Not authenticated");
        }

        let jobDescription = jobInput;
        if (jobInput.startsWith("http")) {
          // Attempt to scrape if it's a URL
          try {
            const response = await fetch(jobInput, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36",
              },
            });
            if (!response.ok) {
              throw new Error(`Failed to fetch URL: ${response.statusText}`);
            }
            const html = await response.text();
            const $ = cheerio.load(html);
            // Example: Extract job title and main description
            // You'll need to inspect target websites for appropriate selectors
            const title = $("h1").first().text().trim();
            const mainContent = $("body").text().trim(); // More refined selectors needed here
            jobDescription = `Title: ${title}\n\n${mainContent.slice(0, 5000)}`; // Limit content for AI
          } catch (error) {
            console.error("Scraping failed:", error);
            // Fallback to original input or throw
            throw new Error(`Failed to scrape job link: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // Define the schema for the AI's structured output
        const reportSchema = z.object({
          jobTitle: z.string().describe("The extracted job title."),
          company: z.string().describe("The company offering the job."),
          location: z.string().optional().describe("Job location if available."),
          summary: z.string().describe("A concise summary of the job description."),
          keyQualifications: z.array(z.string()).describe("List of essential qualifications."),
          responsibilities: z.array(z.string()).describe("List of main job responsibilities."),
          confidenceScore: z.number().min(0).max(100).describe("Confidence score (0-100) that this job matches the user's implicit profile."),
          aiAnalysis: z.string().describe("Detailed AI analysis of the job, including pros, cons, and recommendations."),
        });

        // Use the AI SDK to generate a structured report
        const { object: aiReport } = await generateObject({
          model: openai("gpt-4o"), // or your preferred model
          schema: reportSchema,
          prompt: `Analyze the following job description. User context: "${context || 'none'}". Generate a detailed report in JSON format.
          Job Description:
          ${jobDescription}`,
          temperature: 0.7,
        });

        // Save the result to the database via a mutation
        const scanId = await ctx.runMutation(internal.scans.saveScanResultMutation, {
          userId,
          jobInput,
          context,
          report: aiReport,
          timestamp: Date.now(),
        });

        return { scanId, report: aiReport };
      },
    });

    export const requestDeeperReportAction = action({
      args: {
        scanId: v.id("scans"),
        userEmail: v.string(),
      },
      handler: async (ctx, { scanId, userEmail }) => {
        const userId = (await ctx.auth.getUserIdentity())?.subject;
        const scan = await ctx.runQuery(internal.scans.getScanResultByIdQuery, { scanId });

        if (!scan || scan.userId !== userId) {
          throw new Error("Scan not found or unauthorized.");
        }

        // Simulate sending email to an external service
        console.log(`Sending deeper report for scan ${scanId} to ${userEmail}`);
        // await fetch("https://api.emailservice.com/send", { /* ... */ });
        return { success: true, message: `Deeper report requested for ${userEmail}.` };
      },
    });
    ```

*   **Mutation for Saving Scan Results (`convex/scans/mutations.ts`)**:
    ```typescript
    import { mutation } from "../_generated/server";
    import { v } from "convex/values";
    import { Doc } from "../_generated/dataModel"; // Import Doc type

    export const saveScanResultMutation = mutation({
      args: {
        userId: v.string(),
        jobInput: v.string(),
        context: v.optional(v.string()),
        report: v.any(), // Ensure this matches your AI SDK output schema structure
        timestamp: v.number(),
      },
      handler: async (ctx, args) => {
        const scanId = await ctx.db.insert("scans", {
          ...args,
        });
        return scanId;
      },
    });

    export const deleteScanResultMutation = mutation({
      args: {
        scanId: v.id("scans"),
      },
      handler: async (ctx, { scanId }) => {
        const userId = (await ctx.auth.getUserIdentity())?.subject;
        const scan = await ctx.db.get(scanId);
        if (!scan || scan.userId !== userId) {
          throw new Error("Scan not found or unauthorized.");
        }
        await ctx.db.delete(scanId);
        return { success: true };
      },
    });
    ```

*   **Query for Fetching Scan History (`convex/scans/queries.ts`)**:
    ```typescript
    import { query } from "../_generated/server";
    import { v } from "convex/values";

    export const getScanHistoryQuery = query({
      args: {},
      handler: async (ctx) => {
        const userId = (await ctx.auth.getUserIdentity())?.subject;
        if (!userId) {
          return []; // Or throw an error for unauthenticated access
        }
        return await ctx.db
          .query("scans")
          .withIndex("by_userId_timestamp", (q) => q.eq("userId", userId))
          .order("desc")
          .collect();
      },
    });

    export const getScanResultByIdQuery = query({
      args: { scanId: v.id("scans") },
      handler: async (ctx, { scanId }) => {
        const userId = (await ctx.auth.getUserIdentity())?.subject;
        if (!userId) {
          return null;
        }
        const scan = await ctx.db.get(scanId);
        if (scan && scan.userId === userId) {
          return scan;
        }
        return null; // Scan not found or not authorized
      },
    });
    ```

*   **Schema Definition (`convex/schema.ts`)**:
    ```typescript
    import { defineSchema, defineTable } from "convex/server";
    import { v } from "convex/values";
    import { authTables } from "@convex-dev/auth/server"; // If using Convex Auth

    export default defineSchema({
      // Add authTables if using Convex Auth
      ...authTables,
      scans: defineTable({
        userId: v.string(), // ID of the user who performed the scan
        jobInput: v.string(), // Original job URL or text
        context: v.optional(v.string()), // Optional user context
        report: v.any(), // The AI-generated detailed report (JSON object)
        timestamp: v.number(),
      }).index("by_userId_timestamp", ["userId", "timestamp"]), // Index for efficient history retrieval
      // Add other tables as needed
    });
    ```

## Testing & Debugging
*   **Local Development**: Run `npx convex dev` to synchronize your schema and deploy functions locally. Use `npm run dev` for your Next.js frontend.
*   **Convex Dashboard Logs**: Monitor the Convex dashboard for detailed logs and errors from your actions, mutations, and queries. This is critical for debugging issues with external API calls, Cheerio parsing, and AI SDK interactions.
*   **Simulate Frontend Calls**: Use tools like Postman or `curl` (for HTTP actions if you choose to expose any, though for this internal flow, client-side calls via `useAction` are typical) or directly call Convex functions from other Convex functions during development to isolate issues.
*   **AI SDK Error Handling**: Pay close attention to errors returned by `generateObject` or `generateText`. These can indicate issues with API keys, prompt length, or model availability.
*   **Cheerio Selectors**: Debug Cheerio selectors by logging the HTML fetched and using browser developer tools to inspect the structure of target job pages.
*   **Argument Validation Errors**: Convex will provide clear errors if your function arguments don't match the defined `v.object` schema, helping you catch type mismatches early.

## Environment Variables
Ensure the following environment variables are configured:

```
# .env.local (for local Convex project)
CONVEX_DEPLOYMENT_URL=<your_convex_deployment_url>
OPENAI_API_KEY=<your_openai_api_key>
# Add any other AI provider API keys (e.g., ANTHROPIC_API_KEY)
# Add API keys for email service if 'requestDeeperReportAction' uses one
# EMAIL_SERVICE_API_KEY=...

# .env.development.local & .env.production.local (for Next.js frontend)
NEXT_PUBLIC_CONVEX_URL=<your_convex_deployment_url>
# IMPORTANT: DO NOT expose sensitive API keys directly to the frontend.
```
*   **`CONVEX_DEPLOYMENT_URL`**: Your Convex backend URL. For local development, this is typically `http://localhost:port`. For production, it's provided by Convex.
*   **`OPENAI_API_KEY`**: Your API key for OpenAI (or other AI provider used by AI SDK). This must be set as a **private** environment variable in your Convex deployment settings (via `npx convex env set` or the dashboard).
*   **`NEXT_PUBLIC_CONVEX_URL`**: Your Convex URL, prefixed with `NEXT_PUBLIC_` so Next.js makes it available on the client-side.

## Success Metrics
*   **Successful Job Link Scanning**: Users can paste a job URL and receive a detailed, AI-generated report.
*   **Successful Raw Text Scanning**: Users can paste raw job text and receive a detailed, AI-generated report.
*   **Accurate Report Generation**: The AI report correctly extracts key details, provides a summary, qualifications, responsibilities, and a reasonable confidence score and analysis.
*   **Report Persistence**: Scan reports are correctly saved to the Convex database and associated with the authenticated user.
*   **History Retrieval**: Authenticated users can view their past scan reports in a history list.
*   **Detailed Report View**: Users can click on a history item to view the full, detailed report.
*   **Deeper Report Request**: The "Request Deeper Report" functionality successfully triggers an email or external notification, and appropriate checks are in place (e.g., user email provided).
*   **Authentication Enforcement**: Unauthenticated users cannot perform scans, save reports, or view history.
*   **Error Handling**: The system gracefully handles invalid URLs, scraping failures, and AI processing errors, providing informative feedback to the user and logging errors on the backend.
*   **Performance**: Scan operations complete within an acceptable timeframe, and the UI remains responsive during the process.
*   **Convex Function Testing**:
    *   `scrapeAndAnalyzeAction` runs successfully, makes external `fetch` calls, parses HTML with Cheerio, interacts with the AI SDK, and correctly calls `saveScanResultMutation`.
    *   `saveScanResultMutation` correctly inserts data into the `scans` table.
    *   `getScanHistoryQuery` and `getScanResultByIdQuery` accurately retrieve data based on `userId` and `scanId`.
    *   `requestDeeperReportAction` successfully calls an external email service.
    *   All functions have appropriate argument validators and return types.
```