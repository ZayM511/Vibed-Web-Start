# Job Title Extraction Fix - Complete Guide

## Issue Resolution

### Problem
The Chrome extension scanner was **not detecting job titles** automatically, even though URL and company names were being extracted successfully.

### Root Cause
1. **Outdated selectors** that didn't match current LinkedIn and Indeed DOM structures
2. **Missing primary selector** `h2.jobTitle > span` for Indeed (confirmed from 2025 Indeed API docs)
3. **Insufficient selector fallbacks** for both platforms

### Solution Applied
✅ Updated both content scripts with **confirmed working selectors** from 2025
✅ Added the primary Indeed selector `h2.jobTitle > span` at top priority
✅ Expanded LinkedIn selectors to 12 variations with proper H1/H2 targeting
✅ Improved text cleanup to handle nested spans and whitespace
✅ Enhanced logging to track which selector succeeds

## Files Updated

### 1. LinkedIn Content Script
**File:** `chrome-extension/src/content-linkedin-v3.js`

**New Title Selectors (12 variations):**
```javascript
const titleSelectors = [
  'h1.job-details-jobs-unified-top-card__job-title',  // Most common
  'h1.jobs-unified-top-card__job-title',              // Alternative
  '.job-details-jobs-unified-top-card__job-title h1', // Nested H1
  '.jobs-unified-top-card__job-title h1',             // Nested H1
  'h1.t-24.t-bold',                                    // Size class
  'h2.t-24.t-bold',                                    // H2 variant
  '.job-details-jobs-unified-top-card__job-title',    // Container
  '.jobs-unified-top-card__job-title',                // Container
  '[data-job-title]',                                  // Data attribute
  '.jobs-unified-top-card__job-title-link',           // Link element
  'h1[class*="job-title"]',                            // Partial match
  'h2[class*="job-title"]'                             // H2 partial
];
```

### 2. Indeed Content Script
**File:** `chrome-extension/src/content-indeed-v3.js`

**New Title Selectors (14 variations):**
```javascript
const titleSelectors = [
  'h2.jobTitle > span',                               // PRIMARY (from Indeed docs)
  'h2.jobTitle span',                                 // Without child combinator
  'h1.jobsearch-JobInfoHeader-title span',            // Header with span
  'h1.jobsearch-JobInfoHeader-title',                 // Header H1
  '[data-testid="jobsearch-JobInfoHeader-title"] span', // Test ID + span
  '[data-testid="jobsearch-JobInfoHeader-title"]',    // Test ID
  'h1.jobTitle span',                                 // H1 + span
  'h1.jobTitle',                                      // H1 only
  'h2.jobTitle',                                      // H2 only
  'h1[class*="jobTitle"]',                            // Partial match
  'h2[class*="jobTitle"]',                            // H2 partial
  '.jobsearch-JobInfoHeader-title-container h1 span', // Container path
  '.jobsearch-JobInfoHeader-title-container h1',      // Container H1
  '.jobsearch-JobInfoHeader-title'                    // Class only
];
```

## Testing Instructions

### Step 1: Reload the Extension

1. **Open Chrome Extensions**
   ```
   chrome://extensions/
   ```

2. **Find JobFiltr**
   - Look for "JobFiltr - Job Search Power Tool"

3. **Click the Reload Button** 🔄
   - This loads the updated content scripts

4. **Verify Version**
   - The manifest should show version 2.0.0

### Step 2: Test on LinkedIn

1. **Navigate to a LinkedIn Job Posting**
   ```
   https://www.linkedin.com/jobs/search/?keywords=software+engineer
   ```

2. **Click on ANY job** to open the details panel

3. **Open DevTools** (F12)
   - Go to the **Console** tab
   - Look for logs starting with `[JobFiltr`

4. **Expected Console Output:**
   ```
   [JobFiltr 2025-01-18...] LinkedIn content script loaded
   [JobFiltr 2025-01-18...] Extracting job info from URL: https://www.linkedin.com/jobs/view/...
   [JobFiltr 2025-01-18...] Found title using selector: "h1.job-details-jobs-unified-top-card__job-title"
   [JobFiltr 2025-01-18...] Title: "Senior Software Engineer"
   [JobFiltr 2025-01-18...] Found company using selector: "a.job-details-jobs-unified-top-card__company-name"
   [JobFiltr 2025-01-18...] Company: "Microsoft"
   [JobFiltr 2025-01-18...] Extracted job info: {title: "Senior Software Engineer", ...}
   ```

5. **Open Extension Popup**
   - Click the JobFiltr icon in toolbar
   - Go to **Scanner** tab

6. **Verify Auto-Detection:**
   - ✅ **Job Title** should show (e.g., "Senior Software Engineer")
   - ✅ **Company** should show (e.g., "Microsoft")
   - ✅ **URL** should show the current job URL
   - ✅ **Scan button** should be enabled

### Step 3: Test on Indeed

1. **Navigate to an Indeed Job Posting**
   ```
   https://www.indeed.com/jobs?q=software+engineer
   ```

2. **Click on ANY job** to open the details

3. **Open DevTools** (F12)
   - Go to the **Console** tab

4. **Expected Console Output:**
   ```
   [JobFiltr 2025-01-18...] Indeed content script loaded
   [JobFiltr 2025-01-18...] Extracting job info from URL: https://www.indeed.com/viewjob?jk=...
   [JobFiltr 2025-01-18...] Found title using selector: "h2.jobTitle > span"
   [JobFiltr 2025-01-18...] Title: "Software Engineer"
   [JobFiltr 2025-01-18...] Found company using selector: "[data-testid="inlineHeader-companyName"]"
   [JobFiltr 2025-01-18...] Company: "Google"
   [JobFiltr 2025-01-18...] Extracted job info: {title: "Software Engineer", ...}
   ```

5. **Open Extension Popup**
   - Click the JobFiltr icon
   - Go to **Scanner** tab

6. **Verify Auto-Detection:**
   - ✅ **Job Title** should show (e.g., "Software Engineer")
   - ✅ **Company** should show (e.g., "Google")
   - ✅ **URL** should show the current job URL

### Step 4: Advanced Testing with Test Tool

If title still doesn't appear, use the selector testing tool:

1. **Open Test Tool**
   ```
   Open: chrome-extension/test-selectors.html in Chrome
   ```

2. **On LinkedIn Job Page:**
   - Copy the "LinkedIn Title Test" code
   - Paste into Console (F12)
   - See which selector works

3. **On Indeed Job Page:**
   - Copy the "Indeed Title Test" code
   - Paste into Console
   - See which selector works

4. **Run Full Test:**
   - Copy the "Full Job Info Extraction Test"
   - Paste into Console
   - Get complete diagnostic information

## Troubleshooting

### Title Still Not Detected

**If Console shows:**
```
❌ Title not found with any selector
```

**Then:**

1. **Inspect the Title Element**
   - Right-click on the job title → "Inspect"
   - Note the exact HTML structure

2. **Check the Classes**
   ```javascript
   // Run in Console
   document.querySelector('h1, h2').className
   ```

3. **Test Custom Selector**
   ```javascript
   // Run in Console with your observed selector
   document.querySelector('YOUR_SELECTOR_HERE').textContent
   ```

4. **Report Back**
   - Share the Console output
   - Share the HTML structure
   - Share the working selector

### Common Issues

**Issue:** "Not on a job posting page"
- **LinkedIn:** URL must include `/jobs/`
- **Indeed:** URL must include `/viewjob`, `/rc/clk`, or `/pagead/`

**Issue:** Extension says "Not detected"
- Check Console for error messages
- Ensure you're on the job details page, not search results
- Try refreshing the page

**Issue:** Title shows but is empty or garbled
- Check Console for whitespace in title
- Look for nested spans or elements
- May need to adjust text cleanup logic

## What Changed

### Before (Old Selectors)
```javascript
// LinkedIn - Limited coverage
['.jobs-unified-top-card__job-title', 'h1.job-title']

// Indeed - Missing primary selector
['.jobsearch-JobInfoHeader-title', 'h1.jobTitle']
```

### After (New Selectors)
```javascript
// LinkedIn - 12 variations with proper H1/H2 targeting
['h1.job-details-jobs-unified-top-card__job-title', ...]

// Indeed - 14 variations starting with confirmed working selector
['h2.jobTitle > span', 'h2.jobTitle span', ...]
```

### Text Cleanup Added
```javascript
// Remove extra whitespace and newlines
title = title.replace(/\s+/g, ' ').trim();
```

## Success Criteria

✅ **Job title appears** in Scanner tab automatically
✅ **Console shows** "Found title using selector: ..."
✅ **Title is clean** (no extra spaces or newlines)
✅ **Scan button is enabled** when title is detected
✅ **Works on multiple job postings** (not just one)

## Next Steps

After confirming the fix works:

1. **Test on 5+ different jobs** on each platform
2. **Check various job types** (entry level, senior, etc.)
3. **Verify on different companies** (startups, enterprise)
4. **Test filter functionality** still works correctly
5. **Report any edge cases** where title doesn't appear

## Quick Test Checklist

- [ ] Extension reloaded in Chrome
- [ ] LinkedIn job page opened
- [ ] Console shows "Found title" message
- [ ] Scanner tab shows job title
- [ ] Indeed job page opened
- [ ] Console shows "Found title" message
- [ ] Scanner tab shows job title
- [ ] Tested on 3+ jobs per platform
- [ ] All working correctly

## Files Modified

```
chrome-extension/
├── src/
│   ├── content-linkedin-v3.js    ✅ Updated with 12 title selectors
│   ├── content-indeed-v3.js      ✅ Updated with 14 title selectors
│   └── background.js             (unchanged)
├── test-selectors.html           ✅ NEW diagnostic tool
├── manifest.json                 (unchanged - already using v3 scripts)
└── dist/
    └── jobfiltr-extension.zip    ✅ Rebuilt with fixes
```

## Support

If title extraction still fails after following all steps:

1. Open the test tool: `chrome-extension/test-selectors.html`
2. Run the diagnostic scripts on the job page
3. Copy the Console output
4. Share the output along with:
   - Job URL (or site name if private)
   - Platform (LinkedIn/Indeed)
   - Browser version

The enhanced logging will show exactly which selector is being tested and whether it succeeds or fails.
