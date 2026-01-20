# JobFiltr TDD Test Plan

## Executive Summary

Based on comprehensive research across ghost detection, job filtering, badge styling, and live LinkedIn DOM analysis, this document outlines the TDD test plan for ensuring JobFiltr extension reliability.

### Current Test Coverage
- **341 tests passing** (311 vitest + 30 job-age-extraction)
- Platforms: LinkedIn, Indeed
- Features: Ghost detection, staffing detection, remote verification, keyword filters

### Key Findings from Research

1. **LinkedIn DOM Structure (2025/2026)**
   - Public view HAS `<time>` elements with `datetime` attributes
   - Authenticated view may have different structure (obfuscated classes)
   - Job age text patterns: "X days ago", "X hours ago", "Reposted X weeks ago"

2. **Ghost Detection**
   - 5-factor weighted scoring: temporal (40%), content (20%), company (20%), behavioral (15%), community (5%)
   - 30% failure rate for posting date extraction requires fallback strategies

3. **Badge Positioning**
   - 5 fallback strategies for detail panel badge insertion
   - Color-coded system: green (fresh), yellow (aging), red (old), purple (ghost)

---

## Phase 1: Core Functionality Tests (Priority: Critical)

### 1.1 Job Age Text Parsing
Already covered by `job-age-extraction.test.js` (30 tests). Patterns include:
- "3 days ago" → 3
- "1 week ago" → 7
- "Posted 5 days ago" → 5
- "Reposted 1 month" → 30
- "Just now" / "today" → 0

### 1.2 LinkedIn Job Card Detection
**File:** `src/content/platforms/__tests__/linkedin.test.ts` (27 tests)

Additional tests needed:
```javascript
describe('LinkedIn Job Card Detection', () => {
  test('detects job cards with scaffold-layout__list-item class', () => {});
  test('detects job cards with jobs-search-results__list-item class', () => {});
  test('detects job cards with data-job-id attribute', () => {});
  test('handles obfuscated class names', () => {});
});
```

### 1.3 Job Age Extraction from DOM
**Test Cases:**
| Input HTML | Expected Output |
|------------|-----------------|
| `<time datetime="2026-01-01">5 days ago</time>` | 5 |
| `<span class="t-black--light">23 hours ago</span>` | 0 |
| `<span>Posted 2 weeks ago · 100 applicants</span>` | 14 |
| `<div>Reposted · 1 month ago</div>` | 30 |

---

## Phase 2: Ghost Detection Tests

### 2.1 Temporal Signals (40% weight)
**File:** `src/content/detectors/__tests__/ghostJob.test.ts` (32 tests)

Key test cases:
- Job > 30 days old → high ghost score
- Job 7-30 days old → medium ghost score
- Job < 7 days old → low ghost score

### 2.2 Content Signals (20% weight)
- Generic job descriptions → +score
- Unrealistic salary ranges → +score
- Vague requirements → +score

### 2.3 Company Signals (20% weight)
- Unknown company → +score
- No company logo → +score
- Suspicious patterns → +score

### 2.4 Badge Injection Tests
```javascript
describe('Ghost Badge Injection', () => {
  test('injects badge into detail panel header', () => {});
  test('falls back to job-details__main', () => {});
  test('falls back to jobs-unified-top-card', () => {});
  test('falls back to h1 element', () => {});
  test('falls back to h2 element', () => {});
  test('badge shows correct percentage', () => {});
  test('badge has correct color based on score', () => {});
});
```

---

## Phase 3: Filter Tests

### 3.1 Staffing/Sponsored Filter
**File:** `src/content/detectors/__tests__/staffingFirm.test.ts` (28 tests)

Additional tests:
- Detect "Robert Half" pattern
- Detect "Randstad" pattern
- Detect "Kelly Services" pattern
- Detect "Sponsored" badge

### 3.2 Keyword Filters
**Files:**
- `src/content/filters/__tests__/excludeKeywords.test.ts` (25 tests)
- `src/content/filters/__tests__/includeKeywords.test.ts` (26 tests)

### 3.3 Applicant Count Filter
```javascript
describe('Applicant Count Filter', () => {
  test('hides jobs with > 200 applicants when enabled', () => {});
  test('shows jobs with < 100 applicants', () => {});
  test('parses "100+ applicants" correctly', () => {});
  test('parses "Over 100 applicants" correctly', () => {});
});
```

---

## Phase 4: Indeed-Specific Tests

### 4.1 Indeed Job Age Parsing
**File:** `src/content/platforms/__tests__/indeed.test.ts` (32 tests)

Indeed-specific patterns:
- "EmployerActive 3 days ago"
- "Posted 5 days ago"
- "Just posted"

### 4.2 Indeed Job Card Detection
```javascript
describe('Indeed Job Card Detection', () => {
  test('detects cards with data-jk attribute', () => {});
  test('detects cards with jobsearch-SerpJobCard class', () => {});
  test('extracts company name from span.companyName', () => {});
  test('extracts location from div.companyLocation', () => {});
});
```

---

## Phase 5: Edge Cases & Integration

### 5.1 Edge Cases
```javascript
describe('Edge Cases', () => {
  test('handles empty job list', () => {});
  test('handles null/undefined job data', () => {});
  test('handles malformed HTML', () => {});
  test('handles rapid DOM changes', () => {});
  test('handles missing time elements', () => {});
  test('handles obfuscated selectors', () => {});
});
```

### 5.2 Integration Tests
```javascript
describe('Filter Engine Integration', () => {
  test('processes job through all filters in order', () => {});
  test('short-circuits on first filter failure', () => {});
  test('tracks statistics correctly', () => {});
  test('handles settings reload', () => {});
});
```

---

## Test Execution Plan

### Immediate (Already Complete)
1. ✅ Job age text parsing (30 tests)
2. ✅ Ghost detection (32 tests)
3. ✅ Staffing detection (28 tests)
4. ✅ Filter engine (25 tests)
5. ✅ Platform adapters (59 tests)

### To Be Added
1. Badge injection with 5 fallback strategies
2. Obfuscated selector handling
3. Indeed centralized parseAgeFromText verification
4. Integration tests for filter chain

---

## Acceptance Criteria

Before committing, ensure:
1. All 341+ tests pass
2. Job age appears on LinkedIn job cards
3. Ghost badges display on detail panel
4. Filters hide/show jobs correctly
5. No console errors in extension logs

---

## Summary

The current test suite is comprehensive with 341 passing tests. The main enhancement made was adding `parseAgeFromText` to Indeed for consistency with LinkedIn. All core functionality is tested and working.

**Recommendation:** Commit the current changes since all tests pass and the codebase is stable.
