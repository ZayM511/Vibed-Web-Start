# 📦 JobFiltr Chrome Extension - Installation Guide

## 📥 Download

**File:** `jobfiltr-extension.zip` (51 KB)
**Location:** `chrome-extension/dist/jobfiltr-extension.zip`
**Version:** 2.0.0
**Last Updated:** January 19, 2025

---

## ✨ What's Included

### Features
✅ **Job Title Auto-Detection** - Automatically extracts job titles on LinkedIn and Indeed
✅ **Job Age Display** - Shows when each job was posted (minutes/hours/days)
✅ **Hide Staffing Firms** - Filter out recruiting agencies
✅ **Hide Sponsored Posts** - Remove promoted job listings
✅ **Applicant Count Filter** - Filter by number of applicants
✅ **Scanner Tab** - Analyze job postings for scams

### Platforms Supported
- ✅ LinkedIn (linkedin.com)
- ✅ Indeed (indeed.com)
- 🔄 Google Jobs (coming soon)

---

## 🚀 Installation Steps

### Method 1: Load Unpacked (Recommended)

**Step 1: Extract the ZIP**
```
1. Right-click on jobfiltr-extension.zip
2. Select "Extract All..."
3. Choose a permanent location (e.g., Documents/Extensions)
4. Click "Extract"
```

**Step 2: Open Chrome Extensions**
```
1. Open Chrome browser
2. Go to: chrome://extensions/
   OR
   Menu (⋮) → Extensions → Manage Extensions
```

**Step 3: Enable Developer Mode**
```
1. Look for "Developer mode" toggle in top-right
2. Click to enable it
```

**Step 4: Load the Extension**
```
1. Click "Load unpacked" button
2. Navigate to the extracted folder
3. Select the folder containing manifest.json
4. Click "Select Folder"
```

**Step 5: Verify Installation**
```
✅ Extension appears in the list
✅ Shield-check icon is visible
✅ No error messages shown
```

### Method 2: Drag and Drop

```
1. Extract the ZIP file
2. Go to chrome://extensions/
3. Enable Developer mode
4. Drag the extracted folder onto the page
5. Extension installs automatically
```

---

## 🔧 First-Time Setup

### 1. Pin the Extension
```
1. Click the puzzle piece icon (🧩) in Chrome toolbar
2. Find "JobFiltr - Job Search Power Tool"
3. Click the pin icon (📌) to pin it to toolbar
```

### 2. Configure Filters
```
1. Click the JobFiltr icon in toolbar
2. Go to "Filters" tab
3. Enable desired filters:
   ☑ Hide Staffing Firms
   ☑ Hide Sponsored Posts
   ☑ Job Age Display
4. Click "Apply Filters"
```

### 3. Test on LinkedIn
```
1. Go to: linkedin.com/jobs/search
2. Search for any job
3. Filters should activate automatically
4. Check console (F12) for logs
```

---

## 📋 What's in the ZIP

```
jobfiltr-extension/
├── manifest.json                    # Extension configuration
├── popup-v2.html                    # Extension popup UI
├── settings.html                    # Settings page
├── src/
│   ├── content-linkedin-v3.js      # LinkedIn integration (UPDATED)
│   ├── content-indeed-v3.js        # Indeed integration (UPDATED)
│   ├── content-google-jobs.js      # Google Jobs integration
│   ├── popup-v2.js                 # Popup functionality
│   └── background.js               # Background service worker
├── styles/
│   ├── popup-v2.css                # Popup styling
│   └── content.css                 # Injected page styles
└── icons/
    ├── icon16.png                  # 16x16 toolbar icon
    ├── icon32.png                  # 32x32 toolbar icon
    ├── icon48.png                  # 48x48 management icon
    └── icon128.png                 # 128x128 store icon
```

---

## ✅ Verification Checklist

After installation:

### Extension Status
- [ ] Extension appears at chrome://extensions/
- [ ] No error messages displayed
- [ ] Shield-check icon visible
- [ ] Extension is enabled (toggle is ON)

### Functionality Check
- [ ] Open LinkedIn jobs page
- [ ] Extension icon shows "Active on LinkedIn"
- [ ] Filters tab accessible
- [ ] Scanner tab accessible
- [ ] Console shows JobFiltr logs (F12)

### Filter Test
- [ ] Enable a filter
- [ ] Click "Apply Filters"
- [ ] Button shows "✓ Filters Applied!"
- [ ] Jobs are filtered as expected

### Job Age Display Test
- [ ] Enable "Job Age Display"
- [ ] Apply filters
- [ ] Colored badges appear on job cards
- [ ] Badges show "Posted X [time] ago"

---

## 🔍 Troubleshooting

### Extension Won't Load

**Error: "Manifest file is missing or unreadable"**
```
Solution:
1. Re-extract the ZIP file
2. Ensure manifest.json is in the root folder
3. Try loading the folder again
```

**Error: "Could not load icon 'icons/icon16.png'"**
```
Solution:
1. Check that icons folder exists
2. Verify all 4 icon files are present
3. Re-extract the ZIP if files are missing
```

### Extension Loads But Doesn't Work

**Issue: No filters applying**
```
Checklist:
1. Are you on a supported site? (LinkedIn/Indeed)
2. Did you enable filters in the popup?
3. Did you click "Apply Filters"?
4. Check Console (F12) for error messages
```

**Issue: Job title not detected**
```
Checklist:
1. Are you on a job DETAILS page? (not search results)
2. Check Console for "Found title" message
3. Try refreshing the page
4. Ensure extension is enabled
```

### Console Shows Errors

**Check Console Logs:**
```
1. Press F12 to open DevTools
2. Go to Console tab
3. Look for [JobFiltr] messages
4. Share any error messages for support
```

---

## 🎯 Quick Test

**30-Second Verification:**

```bash
# 1. Install extension (see steps above)

# 2. Go to LinkedIn jobs
https://www.linkedin.com/jobs/search/?keywords=software+engineer

# 3. Open extension popup → Filters tab

# 4. Enable "Job Age Display"

# 5. Click "Apply Filters"

# 6. ✅ Should see colored badges on all job cards!
```

---

## 📊 Expected Console Output

When working correctly:

```
[JobFiltr 2025-01-19T...] LinkedIn content script loaded
[JobFiltr 2025-01-19T...] Applying filters with settings: {...}
[JobFiltr 2025-01-19T...] Found 25 job cards using selector: .jobs-search__results-list > li
[JobFiltr 2025-01-19T...] Job age from datetime: 3 days, 5 hours, 25 minutes
[JobFiltr 2025-01-19T...] Added info badge: Posted 3 days ago
[JobFiltr 2025-01-19T...] Filtered 0 jobs out of 25
```

---

## 🔄 Updating the Extension

When a new version is available:

```
1. Download the new ZIP file
2. Extract to the SAME location (overwrite old files)
3. Go to chrome://extensions/
4. Click the reload icon (🔄) on JobFiltr
5. Extension updates automatically
```

---

## 🗑️ Uninstalling

To remove the extension:

```
1. Go to chrome://extensions/
2. Find JobFiltr extension
3. Click "Remove"
4. Confirm removal
5. Delete the extracted folder from your computer
```

---

## 📞 Support

### Documentation
- **Complete Guide:** See `EXTENSION_COMPLETE_FIX_SUMMARY.md`
- **Job Age Feature:** See `JOB_AGE_DISPLAY_FEATURE.md`
- **Title Fix:** See `TITLE_EXTRACTION_FIX.md`
- **Quick Test:** See `QUICK_TEST_GUIDE.md`

### Console Diagnostics
```javascript
// Check extension status
chrome.management.get('extension-id', console.log);

// Check filter settings
chrome.storage.local.get('filterSettings', console.log);

// Count time elements on page
console.log('Time elements:', document.querySelectorAll('time').length);

// Count badges on page
console.log('Badges:', document.querySelectorAll('.jobfiltr-badge').length);
```

---

## ⚠️ Important Notes

### Permissions
The extension requires:
- ✅ Access to LinkedIn.com
- ✅ Access to Indeed.com
- ✅ Access to Google.com (for Google Jobs)
- ✅ Storage (to save filter settings)
- ✅ Tabs (to detect active tab)

### Privacy
- ✅ No data sent to external servers
- ✅ All processing happens locally
- ✅ Filter settings stored in browser only
- ✅ No tracking or analytics

### Updates
- ⚠️ This is a development version
- ⚠️ Not published on Chrome Web Store yet
- ⚠️ Must be manually updated when new versions release

---

## 🎉 All Set!

Your JobFiltr extension is now installed and ready to use!

**Next Steps:**
1. Visit LinkedIn or Indeed jobs page
2. Enable your preferred filters
3. Start filtering out unwanted jobs
4. Use Scanner tab to analyze postings

**Enjoy a better job search experience!** 🚀

---

**Version:** 2.0.0
**Last Updated:** January 19, 2025
**File Size:** 51 KB
**Platforms:** LinkedIn, Indeed
