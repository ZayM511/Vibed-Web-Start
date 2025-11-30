# Roadmap: Ghost Job Detector

## Context
- Stack: Next.js, Convex, AI SDK
- Feature: Ghost Job Detector using Convex Actions & AI SDK

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Convex account
- [ ] Create OpenAI account (or other chosen LLM provider for AI SDK)
- [ ] Configure Convex project in dashboard
- [ ] Generate Convex `CONVEX_DEPLOYMENT` URL
- [ ] Generate OpenAI API Key
- [ ] Configure Convex environment variables for `OPENAI_API_KEY` in dashboard

### 2. Dependencies & Environment
- [ ] Install: `convex`, `next`, `react`, `react-dom`, `@ai-sdk/openai`, `@convex-dev/server`, `@convex-dev/react`, `@convex-dev/rate-limiter`
- [ ] Env vars: `NEXT_PUBLIC_CONVEX_URL`, `OPENAI_API_KEY`

### 3. Database Schema
- [ ] Structure:
    - `jobScans` table:
        - `jobUrl`: `v.string()`
        - `scanDate`: `v.number()` (timestamp)
        - `result`: `v.object({ status: v.string(), confidence: v.number(), explanation: v.string(), redFlags: v.array(v.string()) })`
        - `jobDetails`: `v.string()` (JSON string of raw job data)
        - `userId`: `v.optional(v.id("users"))`
    - `communityReviews` table:
        - `jobScanId`: `v.id("jobScans")`
        - `userId`: `v.id("users")`
        - `didApply`: `v.boolean()`
        - `gotGhosted`: `v.boolean()`
        - `wasJobReal`: `v.boolean()`
        - `yearsOfExperience`: `v.optional(v.number())`
        - `comment`: `v.optional(v.string())`
        - `submissionDate`: `v.number()` (timestamp)

### 4. Backend Functions
- [ ] Functions:
    - `convex/jobScans.ts`:
        - `createJobScan` (mutation): Stores initial job data, triggers AI analysis action.
        - `getJobScanById` (query): Retrieves a specific job scan result.
        - `getRecentUserScans` (query): Retrieves scan history for a logged-in user.
    - `convex/communityReviews.ts`:
        - `submitReview` (mutation): Stores user community feedback for a job scan.
        - `getReviewsForJob` (query): Retrieves community reviews for a specific job.
    - `convex/ai.ts`:
        - `detectGhostJob` (action):
            - Accepts job listing text and metadata (company info, posting history context).
            - Uses `@ai-sdk/openai` to call LLM for initial analysis.
            - Integrates rule-based checks for known red flags (e.g., "WhatsApp interviews").
            - Performs lookups using external tools (e.g., D&B for company verification, FTC/BBB for warnings – simulated by placeholders in MVP).
            - Generates `status`, `confidence`, `explanation`, and `redFlags` using AI.
            - Updates the `jobScans` table with the detailed result.
        - `processJobTextForEmbeddings` (action): (Optional, for future RAG/vector search for deeper context)
    - `convex/rateLimiter.ts`:
        - `checkRateLimit` (mutation): For managing API rate limits on AI calls and external lookups using `@convex-dev/rate-limiter`.

### 5. Frontend
- [ ] Components:
    - `JobScanForm`: Input for job link on Manual Scan Page.
    - `JobScanResultsDisplay`: Renders scan results, including explainability panel and highlighted red flags.
    - `CommunityReviewForm`: Allows users to submit feedback.
    - `CommunityReviewList`: Displays community reviews for a job.
    - `ScanHistoryList`: Displays a user's past scans.
- [ ] State:
    - Global state (e.g., using React Context or Zustand) for authentication status.
    - Local component state for form inputs, loading indicators, and error messages.
    - Convex hooks (`useMutation`, `useQuery`, `useAction`) for real-time data fetching and updates.

### 6. Error Prevention
- [ ] API errors: Implement `try-catch` blocks in Convex actions for external API calls and AI SDK interactions.
- [ ] Validation:
    - Server-side validation for job URLs, user inputs, and community reviews in Convex mutations.
    - Client-side validation in Next.js forms.
- [ ] Rate limiting: Apply `@convex-dev/rate-limiter` to `detectGhostJob` action and external API calls to prevent abuse and manage costs.
- [ ] Auth: Implement Convex Auth for user login/registration and protect sensitive backend functions (`userId` checks).
- [ ] Type safety: Leverage Convex's end-to-end TypeScript type generation for all functions and database interactions.
- [ ] Boundaries: Set `maxExecutionTime` for Convex actions, especially `detectGhostJob`, to prevent excessive billing or timeouts.

### 7. Testing
- [ ] Test scenarios:
    - Successful job scan with "clean" result.
    - Successful job scan with "ghost job" detected, including explainability and red flags.
    - Manual scan page functionality.
    - Community review submission and display.
    - Scan history for logged-in users.
    - Error handling for invalid job URLs.
    - Rate limit enforcement.
    - Missing or invalid API keys.
    - Privacy controls (e.g., ensure user data is not collected without consent).