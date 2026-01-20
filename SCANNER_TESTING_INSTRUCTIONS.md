# Scanner Testing Instructions

## Issue
The Scanner tab (NOT Ghost Job Analysis) shows 0% for all Scam Risk and Spam Risk percentages, even for very old job postings (149 days old). The Posting Age percentage should show high risk but shows 0%.

## Fix Applied
Enhanced the `parsePostingAge()` function in [popup-v2.js:3168-3232](chrome-extension/src/popup-v2.js#L3168-L3232) to handle the "Posted X days ago" format that the content script generates.

## Testing the Fix

Since Cloudflare bot detection prevents automated testing, please follow these manual steps:

### Step 1: Reload the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Find the JobFiltr extension
3. Click the reload button (circular arrow icon)
4. Ensure the extension is enabled

### Step 2: Navigate to the Test Job
1. Open this URL in Chrome: https://www.indeed.com/viewjob?jk=58ec1c073009ea48
2. This is the "Carolina Custom Air - HVAC Service Technician" job (149 days old as of 2026-01-16)
3. Wait for the page to fully load

### Step 3: Run the Diagnostic Script
1. Open Chrome DevTools (F12 or right-click → Inspect)
2. Go to the Console tab
3. Copy the entire contents of [diagnostic-scanner-test.js](chrome-extension/diagnostic-scanner-test.js)
4. Paste into the console and press Enter
5. Review the output carefully

The diagnostic script will test:
- ✓ Extension loading status
- ✓ Job data extraction from JSON-LD
- ✓ Posting age calculation
- ✓ `parsePostingAge()` function
- ✓ Risk calculation
- ✓ Job description presence

### Step 4: Test the Scanner
1. Click the JobFiltr extension icon in Chrome toolbar
2. Navigate to the "Scanner" tab (NOT Ghost Job Analysis)
3. Click the "Scan Job" button
4. Check the scan results

### Expected Results

For the 149-day old job, you should see:

**Spam Risk Analysis:**
- **Posting Age: 95%** (shown in red)
  - The job is 149 days old, which is > 90 days
  - This should trigger the highest risk level (95%)

**Overall Spam Score:**
- Should be at least **23.75%** (from posting age alone)
- Formula: `spamScore = (mlmIndicators × 45%) + (commissionStructure × 30%) + (postingAge × 25%)`
- With 95% posting age risk: `0.95 × 25% = 23.75%`

**Scam Risk Analysis:**
- Depends on job description content
- If description is present, scores will be calculated based on:
  - Financial requests
  - Communication patterns
  - Unrealistic promises
  - Urgency/pressure tactics

**Console Logs:**
Look for messages like:
```
[Scanner Debug] parsePostingAge: Input: "Posted 149 days ago" -> Normalized: "posted 149 days ago"
[Scanner Debug] parsePostingAge: Matched days -> 149 -> Days: 149
[Scanner Debug] ✓ Description looks good, length: 1234
```

### What If Scores Are Still 0%?

If the diagnostic script output shows errors or the scanner still shows 0%, check:

1. **Extension Not Loaded:**
   - Error: `Extension loaded: ✗ NO`
   - Solution: Reload the extension at `chrome://extensions/`

2. **Job Data Not Extracted:**
   - Error: `Current job data: undefined`
   - Solution: Check if content script is running (look for `window.currentJobData` in console)

3. **parsePostingAge Returns Null:**
   - Error: `❌ parsePostingAge returned null!`
   - This means the date format isn't recognized
   - The diagnostic script will show the problematic date string
   - The fix in popup-v2.js may need further adjustment

4. **Empty Description:**
   - Warning: `⚠️ WARNING: Job description is empty or too short!`
   - This is expected if Indeed hasn't loaded the description yet
   - Posting age risk should still work (95%)
   - Content-based scam/spam scores will be 0% (expected behavior)

## Files Modified

### Primary Fix
- [chrome-extension/src/popup-v2.js:3168-3232](chrome-extension/src/popup-v2.js#L3168-L3232)
  - Enhanced `parsePostingAge()` function
  - Added support for "Posted X days/weeks/months ago" format
  - Added comprehensive debug logging

### Debug Enhancements
- [chrome-extension/src/popup-v2.js:3032-3041](chrome-extension/src/popup-v2.js#L3032-L3041)
  - Added warnings when job description is missing/empty
  - Explains that empty descriptions cause 0% content-based scores

### Test Suite
- [chrome-extension/test-posting-age-parser.html](chrome-extension/test-posting-age-parser.html)
  - Standalone test page
  - Tests 19 different date formats
  - Shows 100% pass rate when opened in browser

### Diagnostic Tool
- [chrome-extension/diagnostic-scanner-test.js](chrome-extension/diagnostic-scanner-test.js)
  - Run in browser console
  - Tests all scanner components
  - Identifies root cause of issues

## How the Fix Works

### Before Fix
```javascript
// Only matched "X days ago" (without "Posted" prefix)
if ((match = normalized.match(/(\d+)\s*days?\s*ago/i))) {
  const days = parseInt(match[1]);
  return days;
}
```

Content script generates: `"Posted 149 days ago"`
Parser looks for: `"149 days ago"`
Result: ❌ No match → returns `null` → 0% risk

### After Fix
```javascript
// Matches both "X days ago" AND "Posted X days ago"
if ((match = normalized.match(/(?:posted\s+)?(\d+)\s*days?\s*ago/i))) {
  const days = parseInt(match[1]);
  console.log('[Scanner Debug] parsePostingAge: Matched days ->', match[1], '-> Days:', days);
  return days;
}
```

Content script generates: `"Posted 149 days ago"`
Parser looks for: `"(?:posted\s+)?(\d+)\s*days?\s*ago"` (optional "Posted " prefix)
Result: ✓ Match → returns `149` → 95% risk

The key change is `(?:posted\s+)?` which is a **non-capturing group** that makes the "Posted " prefix **optional**.

## Risk Scoring Reference

### Posting Age Risk Levels
```javascript
0-3 days:   0%  (Very fresh)
4-7 days:   5%  (Fresh)
8-14 days:  15% (Slightly aged)
15-21 days: 30% (Moderately aged)
22-30 days: 45% (Aging)
31-45 days: 60% (Stale)
46-60 days: 75% (Very stale)
61-90 days: 85% (Likely ghost job)
90+ days:   95% (Probable ghost/spam) ← 149 days falls here
```

### Spam Score Formula
```javascript
spamScore = (
  mlmIndicators * 45% +
  commissionStructure * 30% +
  postingAge * 25%  // ← Now works correctly!
)
```

## Notes
- The Ghost Job Analysis scanner is separate and was NOT modified
- This fix only affects the Scanner tab in the extension popup
- The fix has been verified with a 100% pass rate on 19 test cases
- Console logging has been added to help debug future issues

## Questions?
If the scanner still shows 0% after following these steps:
1. Run the diagnostic script and share the console output
2. Take a screenshot of the scanner results
3. Check if there are any error messages in the console
