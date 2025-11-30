# Chrome Extension Fix and Testing Guide

## Issues Fixed

### 1. **Filters Not Working**
**Root Cause:** Outdated DOM selectors that didn't match current LinkedIn and Indeed structure.

**Fix:**
- Created updated content scripts (`content-linkedin-v3.js` and `content-indeed-v3.js`)
- Added multiple fallback selectors for each element type
- Implemented comprehensive logging for debugging
- Added mutation observer debouncing to prevent performance issues

### 2. **Automatic Job Title Detection Failing**
**Root Cause:** Limited selector coverage and no fallback mechanisms.

**Fix:**
- Expanded title selectors to include 7+ variations for LinkedIn
- Added 6+ variations for Indeed
- Implemented intelligent fallback to search all headings if primary selectors fail
- Added detailed logging to track detection success

## Key Improvements

### LinkedIn Content Script (content-linkedin-v3.js)
- **Job Card Selectors:** 6 different selector patterns
- **Title Detection:** 7 selector variations + heading fallback
- **Company Detection:** 7 selector variations
- **Description Detection:** 5 selector variations
- **Enhanced Logging:** Timestamps and structured console output
- **Mutation Observer:** Debounced to fire only after 500ms of stability

### Indeed Content Script (content-indeed-v3.js)
- **Job Card Selectors:** 8 different selector patterns
- **Title Detection:** 6 selector variations with span cleanup
- **Company Detection:** 7 selector variations
- **Description Detection:** 5 selector variations
- **Enhanced Logging:** Timestamps and structured console output
- **Mutation Observer:** Debounced to fire only after 500ms of stability

## Installation & Testing Instructions

### Step 1: Install the Extension

1. **Extract the extension**
   - Download and unzip `jobfiltr-chrome-extension.zip`
   - Or use the `chrome-extension` folder directly from the project

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder (or extracted folder)

3. **Verify Installation**
   - You should see the JobFiltr extension with the shield-check icon
   - Pin the extension to your toolbar for easy access

### Step 2: Test on LinkedIn

1. **Navigate to LinkedIn Jobs**
   - Go to https://www.linkedin.com/jobs/search/?keywords=software+engineer
   - Or search for any job title

2. **Open Extension Popup**
   - Click the JobFiltr icon in your toolbar
   - You should see "Active on LinkedIn" status

3. **Test Filter Functionality**
   - Go to the "Filters" tab
   - Enable "Hide Staffing Firms" filter
   - Click "Apply Filters"
   - You should see the button change to "✓ Filters Applied!"
   - Job cards from staffing firms should disappear from the list

4. **Test Sponsored Filter**
   - Enable "Hide Sponsored Posts"
   - Click "Apply Filters"
   - Promoted/sponsored jobs should be hidden

5. **Check Console for Logs**
   - Open Chrome DevTools (F12)
   - Go to Console tab
   - You should see logs like:
     ```
     [JobFiltr 2025-01-18...] LinkedIn content script loaded
     [JobFiltr 2025-01-18...] Found X job cards using selector: ...
     [JobFiltr 2025-01-18...] Filtered Y jobs out of X
     ```

6. **Test Job Title Detection**
   - Click on any job posting to open the details
   - Go to "Scanner" tab in the extension popup
   - You should see the detected job title and company name
   - If not detected, check console for error messages

### Step 3: Test on Indeed

1. **Navigate to Indeed Jobs**
   - Go to https://www.indeed.com/jobs?q=software+engineer
   - Or search for any job title

2. **Open Extension Popup**
   - Click the JobFiltr icon
   - You should see "Active on Indeed" status

3. **Test Filter Functionality**
   - Go to "Filters" tab
   - Enable "Hide Staffing Firms" filter
   - Click "Apply Filters"
   - Staffing firm job listings should be hidden

4. **Test Sponsored Filter**
   - Enable "Hide Sponsored Posts"
   - Click "Apply Filters"
   - Sponsored jobs should be hidden

5. **Check Console for Logs**
   - Open Chrome DevTools (F12)
   - Go to Console tab
   - You should see logs like:
     ```
     [JobFiltr 2025-01-18...] Indeed content script loaded
     [JobFiltr 2025-01-18...] Found X job cards using selector: ...
     [JobFiltr 2025-01-18...] Filtered Y jobs out of X
     ```

6. **Test Job Title Detection**
   - Click on any job to open the details
   - Go to "Scanner" tab in the extension popup
   - You should see the detected job title and company name

## Debugging Tips

### If Filters Don't Work

1. **Check Console Logs**
   - Open DevTools (F12) → Console tab
   - Look for `[JobFiltr]` log messages
   - If you see "No job cards found with any selector", the DOM structure has changed

2. **Verify Extension is Loaded**
   - You should see the initial "content script loaded" message
   - If not, reload the page

3. **Check Extension Status**
   - Click the extension icon
   - Ensure it says "Active on [Site Name]"
   - If not, you may not be on a supported page

### If Job Title Detection Fails

1. **Check URL**
   - LinkedIn: Must include `/jobs/`
   - Indeed: Must include `/viewjob`, `/rc/clk`, or `/pagead/`

2. **Check Console**
   - Look for "Extracting job info from URL" message
   - Check which selectors are being tried
   - Look for "Found title using selector" success message

3. **Manual Inspection**
   - Right-click on the job title → Inspect
   - Note the element's class names and structure
   - Compare with selectors in the content script

### Common Issues

**Issue:** "Not on a supported job site" message
- **Solution:** Make sure you're on linkedin.com or indeed.com job pages

**Issue:** Filters reset after scrolling
- **Solution:** This is expected - the mutation observer should re-apply filters automatically

**Issue:** Extension icon is grayed out
- **Solution:** Refresh the job search page

## Testing Checklist

### LinkedIn
- [ ] Extension loads on LinkedIn jobs page
- [ ] "Active on LinkedIn" status shows in popup
- [ ] Hide Staffing Firms filter works
- [ ] Hide Sponsored Posts filter works
- [ ] Job title is detected on job details page
- [ ] Company name is detected on job details page
- [ ] Filters persist when scrolling (via mutation observer)
- [ ] Reset Filters button works
- [ ] Console shows detailed logs

### Indeed
- [ ] Extension loads on Indeed jobs page
- [ ] "Active on Indeed" status shows in popup
- [ ] Hide Staffing Firms filter works
- [ ] Hide Sponsored Posts filter works
- [ ] Job title is detected on job details page
- [ ] Company name is detected on job details page
- [ ] Filters persist when scrolling (via mutation observer)
- [ ] Reset Filters button works
- [ ] Console shows detailed logs

## Advanced Testing

### Test Staffing Firm Detection
Search for jobs at known staffing companies:
- TekSystems
- Robert Half
- Randstad
- Insight Global
- Aerotek

Enable "Hide Staffing Firms" and verify these are hidden.

### Test Sponsored Detection
Look for jobs with "Promoted" or "Sponsored" labels and verify they're hidden when the filter is enabled.

### Test Dynamic Loading
1. Apply filters
2. Scroll to load more jobs
3. Verify new jobs are also filtered (mutation observer should handle this)

## Performance Monitoring

Check console for:
- Number of job cards found
- Number of jobs filtered
- Time taken for filter application
- Mutation observer triggering frequency

## Next Steps

If you encounter any issues:

1. **Check Console Logs** - All actions are logged with timestamps
2. **Update Selectors** - If DOM has changed, selectors may need updating
3. **Test on Different Job Searches** - Some job types may have different layouts
4. **Report Issues** - Note the specific job URL and console errors

## File Structure

```
chrome-extension/
├── manifest.json                    # Updated to use v3 scripts
├── src/
│   ├── content-linkedin-v3.js      # New LinkedIn content script
│   ├── content-indeed-v3.js        # New Indeed content script
│   ├── popup-v2.js                 # Popup functionality
│   └── background.js               # Background service worker
├── icons/
│   ├── icon16.png                  # New shield-check icons
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── dist/
    └── jobfiltr-extension.zip      # Packaged extension
```

## Summary

The extension has been completely overhauled with:

✅ **Updated DOM Selectors** - Multiple fallback selectors for robustness
✅ **Enhanced Logging** - Detailed console output for debugging
✅ **Improved Detection** - Better job title and company name extraction
✅ **Performance Optimization** - Debounced mutation observer
✅ **Error Handling** - Graceful fallbacks when selectors fail

The filters and automatic detection should now work reliably on both LinkedIn and Indeed!
