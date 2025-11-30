# Roadmap: Live Scan

## Context
- Stack: Next.js, Convex, AI SDK (e.g., @ai-sdk/openai)
- Feature: Live Scan using Convex Actions with AI SDK

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Convex account.
- [ ] Create an OpenAI (or other LLM provider) account and obtain API key.
- [ ] Configure Convex dashboard:
    - [ ] Create a new Convex project.
    - [ ] Add `OPENAI_API_KEY` (or equivalent) as a Convex environment variable.
- [ ] Configure billing for Convex and your chosen LLM provider.
- [ ] Set up a GitHub OAuth app (or another provider) if user authentication is desired for history/bookmarking, and configure it within Convex Auth.

### 2. Dependencies & Environment
- [ ] Install:
    - `@convex-dev/react` (for React/Next.js client-side integration)
    - `convex` (Convex client library)
    - `convex-helpers` (optional, for common patterns)
    - `typescript`
    - `@ai-sdk/openai` (or `@ai-sdk/anthropic`, etc.)
    - `@upstash/ratelimit` (for backend rate limiting, if needed for API actions)
    - `cheerio` or `jsdom` (for server-side parsing of job content in Action)
    - `zod` (for robust schema validation, alongside `convex/values`)
- [ ] Env vars:
    - `NEXT_PUBLIC_CONVEX_URL`
    - `OPENAI_API_KEY` (Convex environment variable, not client-side)

### 3. Database Schema
- [ ] Structure:
    - `jobScans`:
        - `_id: Id<'jobScans'>`
        - `_creationTime: number`
        - `jobUrl: string` (indexed)
        - `jobTitle: string`
        - `companyName: string`
        - `scanResult: { verdict: 'Scam' | 'Ghost' | 'Legitimate', confidence: number, explainability: string[], redFlags: string[] }`
        - `fullJobContent: string` (optional, for deeper analysis or archival)
        - `userId: Id<'users'> | null` (optional, linked to authenticated user)
        - `isBookmarked: boolean`
        - `communityReviewCount: number`
        - `averageRating: number` (e.g., 1-5, derived from reviews)
        - `lastUpdated: number`
    - `communityReviews`:
        - `_id: Id<'communityReviews'>`
        - `_creationTime: number`
        - `jobScanId: Id<'jobScans'>` (indexed)
        - `userId: Id<'users'>` (optional)
        - `rating: number` (e.g., 1-5, user's trust rating)
        - `applied: boolean`
        - `ghosted: boolean`
        - `jobReal: boolean`
        - `workedHereYears: number | null`
        - `comment: string | null`
    - `users`:
        - `_id: Id<'users'>`
        - `_creationTime: number`
        - `clerkId: string` (or other auth provider ID, indexed)
        - `name: string`
        - `email: string`
        - `scanHistory: Id<'jobScans'>[]` (optional, for quick lookup)

### 4. Backend Functions
- [ ] Functions:
    - `api.jobs.scanJobListing` (Action):
        - Purpose: Orchestrates the AI and rule-based scanning process.
        - Inputs: `jobUrl: string`, `jobContent: string` (scraped from extension/paste), `userId: Id<'users'> | null`
        - Logic:
            - Extracts key data points from `jobContent` (using `cheerio`/`jsdom` if necessary).
            - Calls internal AI action (`internal.ai.analyzeJob`) for scam/ghost detection.
            - Applies rule-based checks (e.g., known scam phrases, domain reputation check, application flow red flags).
            - Compiles `scanResult` including `verdict`, `confidence`, `explainability`, `redFlags`.
            - Returns `scanResult` to client.
            - *Does not persist by default.*
    - `internal.ai.analyzeJob` (Action, internal):
        - Purpose: Interacts with LLM for deep analysis.
        - Inputs: `extractedJobDetails: object` (structured data from `scanJobListing`)
        - Logic:
            - Uses `@ai-sdk/openai` (or chosen AI SDK) to prompt an LLM with job details.
            - Prompts LLM to identify potential scam/ghost indicators, analyze language, and assign a preliminary verdict/confidence.
            - Returns LLM's structured output.
    - `api.jobs.saveJobScan` (Mutation):
        - Purpose: Saves a scan result and optionally links to a user's history.
        - Inputs: `jobScanData: object` (including `scanResult`), `userId: Id<'users'> | null`, `isBookmarked: boolean`
        - Logic: Inserts `jobScanData` into `jobScans` table. Updates `users.scanHistory` if `userId` is present.
    - `api.community.submitReview` (Mutation):
        - Purpose: Allows users to submit feedback for a job listing.
        - Inputs: `reviewData: object` (linked to `jobScanId`), `userId: Id<'users'>`
        - Logic: Inserts `reviewData` into `communityReviews` table. Updates `jobScans` with aggregate review data (`communityReviewCount`, `averageRating`).
    - `api.jobs.getScanHistory` (Query):
        - Purpose: Retrieves a logged-in user's scan history.
        - Inputs: `userId: Id<'users'>`
        - Logic: Fetches `jobScans` associated with `userId`.
    - `api.jobs.getJobScanDetails` (Query):
        - Purpose: Retrieves details for a specific job scan.
        - Inputs: `jobScanId: Id<'jobScans'>`
        - Logic: Fetches `jobScans` document and associated `communityReviews`.

### 5. Frontend
- [ ] Components:
    - `ChromeExtensionScanner`:
        - Purpose: UI for triggering a scan on the active tab. Displays loading state and initial verdict.
        - Interacts with browser APIs to get active tab URL and content.
        - Calls `api.jobs.scanJobListing` Convex Action.
    - `ManualScanForm`:
        - Purpose: Input field for pasting job links or content.
        - Triggers `api.jobs.scanJobListing` Convex Action.
    - `ScanResultsDisplay`:
        - Purpose: Renders the AI verdict, confidence score, explainability panel, and highlighted red flags.
        - Displays buttons for "Save/Bookmark" and "Submit Review."
    - `CommunityReviewForm`:
        - Purpose: Collects user feedback for a job listing (did apply, ghosted, worked here, etc.).
        - Calls `api.community.submitReview` Convex Mutation.
    - `ScanHistoryPage`:
        - Purpose: Lists a user's saved/bookmarked scans and provides links to `ScanResultsDisplay`.
        - Uses `useQuery(api.jobs.getScanHistory, { userId })`.
- [ ] State:
    - Global state (e.g., Zustand, React Context) for authenticated user details.
    - Local component state for form inputs, loading indicators, and scan result display.
    - Convex's reactive queries (`useQuery`) will manage state for `ScanHistoryPage` and `ScanResultsDisplay` (when viewing saved/reviewed scans).
    - `useAction` hook for triggering the `scanJobListing` and `saveJobScan` actions.

### 6. Error Prevention
- [ ] API errors: Implement `try/catch` blocks in Actions and Mutations, return structured error objects.
- [ ] Validation: Use `v` from `convex/values` and `zod` for robust input validation in all Convex functions.
- [ ] Rate limiting: Implement client-side and server-side (within Convex Actions using `@upstash/ratelimit` or similar logic) rate limiting for scan requests to prevent abuse and manage LLM costs.
- [ ] Auth: Use `ctx.auth` in all protected Convex functions (mutations, queries, actions that modify/access user-specific data) to ensure user is authenticated and authorized.
- [ ] Type safety: Leverage TypeScript extensively, including Convex's generated types, for strict type checking across frontend and backend.
- [ ] Boundaries: Set clear memory and execution time expectations for Convex Actions, optimize AI prompts and data inputs to stay within Convex and LLM provider limits.

### 7. Testing
- [ ] Test scenarios:
    - [ ] Successful scan of a legitimate job listing (web app and extension).
    - [ ] Successful scan of a known scam/ghost job listing.
    - [ ] AI explanation panel accurately reflects red flags.
    - [ ] Saving a scan result (authenticated user).
    - [ ] Submitting a community review.
    - [ ] Retrieving scan history for a logged-in user.
    - [ ] Handling invalid job URLs or content.
    - [ ] Handling network errors during AI calls or database operations.
    - [ ] Concurrent scan requests without data corruption or excessive rate limiting.
    - [ ] Privacy adherence: no data saved unless explicitly chosen by the user.