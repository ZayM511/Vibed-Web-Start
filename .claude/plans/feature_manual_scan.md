### Convex Actions Capabilities and Limitations:
*   **Purpose**: Convex Actions are serverless functions that can perform side effects (like HTTP requests to third-party services) and interact with the Convex database (indirectly via queries and mutations). They are suitable for backend logic that goes beyond simple data reads/writes.
*   **Runtimes**: Actions can run in Convex's custom JavaScript environment (faster, can be in the same file as other functions, supports some NPM packages) or in a Node.js environment (for unsupported NPM packages or Node.js-specific APIs). The Node.js runtime has higher memory limits (512MB vs 64MB) but may incur cold start overhead. For web scraping with Cheerio and potentially some AI SDK features, the Node.js runtime might be necessary.
*   **Execution Limits**: Actions time out after 10 minutes. Node actions support arguments up to 5MiB, and return values up to 16 MiB. They can perform up to 1000 concurrent operations (queries, mutations, fetch requests).
*   **HTTP Requests**: Actions can make HTTP requests to external services, which is crucial for fetching job listing URLs.
*   **Error Handling**: Unlike queries and mutations, actions are *not* automatically retried by Convex on error because they can have side effects. The caller is responsible for handling errors and retrying.
*   **Calling from Client**: Actions can be called from the client using the `useAction` hook.
*   **Authentication**: Convex uses OpenID Connect (JWTs) for authentication. Convex Actions can access authentication context via `ctx.auth` and can call other Convex functions (queries, mutations) with the authenticated user's context. Service authentication (e.g., for third-party servers calling Convex) can use shared secrets/API keys.

### Cheerio:
*   **Purpose**: Cheerio is a fast, flexible, and lean implementation of core jQuery designed for server-side HTML parsing and manipulation. It's excellent for static HTML content.
*   **Limitations for Manual Scan**: Cheerio processes the HTML document as it's received. It *does not* execute JavaScript, so it cannot scrape content that is dynamically loaded or rendered by client-side JavaScript. This is a significant limitation for many modern job boards (e.g., LinkedIn, Indeed) that heavily rely on JavaScript to populate job details. To handle dynamic content, a headless browser solution (like Puppeteer or Playwright) would be required, which adds complexity and resource usage beyond a simple Cheerio integration in a Convex Action (especially given memory/time limits).

### AI SDK:
*   **Purpose**: The AI SDK simplifies building AI applications with various Large Language Models (LLMs) (e.g., OpenAI, Anthropic, Google Gemini). It provides a unified interface for prompting, generating text, and handling streams.
*   **Usage**: It allows sending prompts to LLMs and receiving responses. For JobFiltr, this means sending job descriptions (parsed by Cheerio or pasted) to an LLM to analyze for red flags, ghost job indicators, and generate an explainability panel.
*   **Structured Output**: The AI SDK (especially in newer versions) supports structured output, which is crucial for programmatically extracting specific red flags, confidence scores, and explainability notes from the LLM's response.
*   **Authentication**: The AI SDK itself doesn't have an authentication system; it relies on the API keys of the *underlying LLM provider* (e.g., `OPENAI_API_KEY`). These keys should be stored securely as environment variables in Convex.
*   **Pricing/Rate Limits**: These are dependent on the chosen LLM provider (e.g., OpenAI, Anthropic, Google Gemini) and not directly on the AI SDK. Each provider has its own pricing model (per token, per request) and rate limits. This needs to be considered for cost and performance.
*   **Integration with Convex**: The AI SDK can be used within a Node.js Convex Action.

### Manual Scan within Convex Action with Cheerio & AI SDK:
The core idea is to have a Convex Action that:
1.  Receives a job URL or raw text.
2.  If a URL, it fetches the HTML content using `fetch` (within a Node.js action).
3.  Parses the HTML using Cheerio to extract static job details. If the content is highly dynamic, Cheerio will fail to get all information. This is a *major limitation*.
4.  Sends the extracted/pasted text to an LLM via the AI SDK with a carefully crafted prompt.
5.  Parses the structured response from the AI.
6.  Returns the processed scan results to the Next.js frontend.

### Next.js Integration:
*   Next.js applications can interact with Convex functions (queries, mutations, actions) using the Convex client SDK (`useAction` hook).
*   For server-side rendering (SSR) or server components, Convex provides mechanisms to pre-fetch data.

### Best Practices & Pitfalls:
*   **`"use node"` Directive**: For Cheerio and AI SDK, a Convex Action will likely require the `"use node"` directive at the top of its file to access Node.js APIs and compatible NPM packages.
*   **Argument/Return Validators**: Always use `v` (Convex's schema validator) for `args` and `returns` in Convex functions to ensure type safety and validate inputs/outputs.
*   **Error Handling**: Implement robust error handling in the Convex Action for network failures (during `fetch`), Cheerio parsing issues, and AI SDK call failures.
*   **Security**: Store API keys for LLM providers as secure environment variables in Convex.
*   **Privacy**: Ensure that job data sent to LLM providers complies with privacy policies. Most LLM providers offer data privacy options where prompts are not used for training. This must be configured.
*   **Dynamic Content**: The most significant pitfall for web scraping is handling dynamically loaded content. Cheerio is ill-suited for this. For a "no compromises" app, this would require a more advanced (and likely more expensive/complex) solution than Cheerio, such as a dedicated scraping service or a self-hosted headless browser. Given the MVP philosophy, we'll start with Cheerio and acknowledge its limitations.
*   **Rate Limits**: Be mindful of external API rate limits (LLM providers, potentially job boards if direct scraping is done frequently). Implement retries with exponential backoff if necessary.
*   **Prompt Engineering**: The quality of AI analysis heavily depends on the quality of the prompts. Iterative prompt engineering will be crucial.# Roadmap: Manual Scan

## Context
- Stack: Next.js, Convex, AI SDK (@ai-sdk/openai, etc.), Cheerio
- Feature: Manual Scan with Convex Action leveraging Cheerio for HTML parsing and AI SDK for AI analysis. Allows users to paste a job link or job text for a detailed scam/ghost job report.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Convex account and deployment.
- [ ] Create a Convex project and link it to your local environment.
- [ ] Configure billing for Convex (for Node.js actions and potential higher limits).
- [ ] Obtain API keys for the chosen Large Language Model (LLM) provider (e.g., OpenAI API Key, Anthropic API Key).
- [ ] Configure LLM provider settings (e.g., data privacy settings to ensure prompts are not used for model training).

### 2. Dependencies & Environment
- [ ] **Install**:
    - `@convex-dev/react` (for Convex client-side integration)
    - `cheerio` (for HTML parsing within Convex Action)
    - `@ai-sdk/openai` (or `@ai-sdk/anthropic`, etc., based on LLM choice)
    - `zod` (for robust input/output validation, a common choice with Convex's `v` type validators)
- [ ] **Env vars**:
    - `CONVEX_DEPLOYMENT` (provided by Convex CLI)
    - `NEXT_PUBLIC_CONVEX_URL` (Convex deployment URL)
    - `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`, etc.)

### 3. Database Schema
- [ ] **Structure**:
    - `scans` table:
        - `_id: Id<'scans'>`
        - `userId: Id<'users'> | null` (optional, for logged-in users)
        - `jobUrl: v.optional(v.string())`
        - `jobText: v.string()` (either URL content or direct paste)
        - `scanResult: v.object({ confidenceScore: v.number(), redFlags: v.array(v.string()), explainability: v.string(), isScam: v.boolean(), isGhostJob: v.boolean(), flaggedDetails: v.array(v.object({ type: v.string(), value: v.string(), reason: v.string() })) })`
        - `timestamp: v.number()`
        - `userContext: v.optional(v.object({ location: v.string(), applicationStatus: v.string() }))`
        - `emailedReportRequested: v.optional(v.boolean())`

### 4. Backend Functions (Convex Actions & Internal Helpers)
- [ ] **`convex/schema.ts`**: Define `scans` table with validators.
- [ ] **`convex/scans.ts` (or similar, ensure `"use node"` directive for actions)**:
    - [ ] `internalAction: fetchAndAnalyzeJob(args: { url: v.string() | null, text: v.string() | null, userContext: v.optional(v.object({ ... })) })`:
        - Purpose: Fetches job content (if URL provided), parses it with Cheerio (if URL), sends to AI SDK for analysis, and returns structured result.
        - Requires `"use node"` directive at the top of the file.
        - **Logic**:
            - If `url` is provided:
                - Use `fetch` to get HTML content.
                - Use Cheerio to parse HTML and extract relevant job text (handle potential limitations for dynamic content).
            - If `text` is provided: use directly.
            - Construct a detailed prompt for the AI model (LLM) to identify:
                - Scam indicators (too good to be true, missing info, unusual application flows).
                - Ghost/fake job indicators (generic language, repost patterns).
                - Explainability breakdown.
                - Confidence score.
            - Call AI SDK (`generateText` or `streamText`) with the prompt and parsed job content.
            - Parse the AI's structured output (using Zod for validation).
            - Return the structured scan result.
    - [ ] `mutation: saveScanResult(args: { scanResult: v.object({ ... }), userId: v.optional(Id<'users'>) })`:
        - Purpose: Saves the AI scan result to the `scans` table.
        - Logic: Inserts the `scanResult` and optional `userId` into the `scans` table.
    - [ ] `query: getScanHistory(args: { userId: Id<'users'> })`:
        - Purpose: Retrieves a user's past scan results.
        - Logic: Queries the `scans` table filtered by `userId`.
    - [ ] `action: requestDeeperReport(args: { scanId: Id<'scans'>, userEmail: v.string() })`:
        - Purpose: Trigger an email delivery for a deeper report.
        - Requires `"use node"` directive.
        - Logic: Updates `scans` table (`emailedReportRequested: true`), uses a transactional email service (e.g., SendGrid, Resend via another `fetch` call) to send the detailed report.

### 5. Frontend (Next.js)
- [ ] **Components**:
    - `ManualScanForm`:
        - Input field for job link or text.
        - Optional fields for user location, application status.
        - "Scan Job" button.
        - Loading indicator during scan.
    - `ScanResultsDisplay`:
        - Renders the `confidenceScore`.
        - Visually highlights `redFlags` and `flaggedDetails`.
        - Displays the `explainability` panel.
        - "Save to History" button (visible if logged in).
        - "Request Deeper Report" button (with email input).
    - `ScanHistoryPage` (for logged-in users):
        - Lists `ScanResultsDisplay` components for past scans.
- [ ] **State**:
    - Use React `useState` for form inputs (`jobLink`, `jobText`, `userLocation`, `applicationStatus`).
    - Use `useAction` hook from `@convex-dev/react` to call `internalAction: fetchAndAnalyzeJob`.
    - Use `useMutation` hook to call `mutation: saveScanResult`.
    - Use `useQuery` hook to call `query: getScanHistory` (if user is logged in).
    - Manage loading and error states for API calls.

### 6. Error Prevention
- [ ] **API errors**: Implement `try-catch` blocks in Convex Actions for `fetch` calls (Cheerio) and AI SDK calls. Handle network errors, API key issues, LLM provider rate limits, and LLM response parsing errors.
- [ ] **Validation**:
    - Use Convex `v` validators for all action/mutation arguments and return values.
    - Frontend input validation (e.g., check for valid URL format, non-empty text).
- [ ] **Rate limiting**:
    - Consider implementing client-side debouncing for scan requests.
    - Monitor LLM provider rate limits and implement exponential backoff/retries in the Convex Action if necessary.
- [ ] **Auth**:
    - Use `ctx.auth` in Convex functions to verify user authentication for saving history and requesting deeper reports.
    - Securely pass authenticated user tokens to Convex.
- [ ] **Type safety**: Leverage TypeScript throughout the project, especially with Convex's generated types and Zod for AI SDK output parsing.
- [ ] **Boundaries**: Clearly define data flow between frontend, Convex Actions, Cheerio, and AI SDK. Acknowledge Cheerio's limitation with dynamic content.

### 7. Testing
- [ ] **Unit Tests (Convex Actions)**:
    - Test `fetchAndAnalyzeJob` with valid job URLs (static HTML examples) and raw job text.
    - Test `fetchAndAnalyzeJob` with malformed URLs and empty input.
    - Test AI SDK prompt generation and response parsing with mock LLM responses.
    - Test `saveScanResult` and `getScanHistory`.
    - Test `requestDeeperReport` with mock email service calls.
- [ ] **Integration Tests**:
    - Test the full flow from frontend submission of a job link/text to displaying the scan results.
    - Verify that saved scans appear in user history for authenticated users.
- [ ] **End-to-End (E2E) Tests**:
    - Use tools like Playwright or Cypress to simulate user interaction, submitting a job link, and verifying the displayed results and UI animations.
    - Test for mobile responsiveness.
- [ ] **Performance Testing**:
    - Measure latency for `fetchAndAnalyzeJob` to ensure it's within acceptable limits given the 10-minute Convex Action timeout.
    - Monitor cold start times for Node.js Convex Actions.

## Documentation Sources

This implementation plan was created using the following documentation sources:

1. [convex.dev](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGrlsQKxFrHZR0UZKjYNJzpN2ilRywj_e-8EKT-3s4j9vJY0MAbuoc82MxviXBRkQWdFUCjiAb6FaiHJrP8ILJBEo7g8GtsoIEFweU6TvZyquivvGilzzUdOO6-TDdj13omheE9)
2. [convex.dev](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQExNNgxHK_VyVQp1FS1T6VVmylyRwX8qpzYCGajZyDf1zQaH_Igs8YHX26tDYeo9PBu9zV8rGhzXy4xIg7o9-Godt8QdvsIjKho7fPowiYOF-lLsMRKwy1uXldoUWKgsIDuTwO9tnhUpf6k)
3. [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFmRZUzs2Mwd1yN_QSQId86bU02ZiuMdmOs19rUQS6Tiy0yuu19SRQryHXmy5mNcjf3dYiSXaCUTfbiA7VVtztRx54ZjF9_K5ARMAZUgcTBV-4K6nrxXUpwvM4f3HEGIkKPUZt0w_3UYdA_vVQwlXiCoQ9FE8Zx14yVMA==)
4. [youtube.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEBLXrvdG-PY2yncyIgYw00lDJIbciyVJAGgSq8iBIzO9f7H7Soa7VzMcFtKpWcybVkSU_QBg8cWj7KyU9S3PIP3NHf2-is4eFXaW7hLdG7K9NFOCC4Bq2Rsau3mHi7nPVzptkqP28=)
