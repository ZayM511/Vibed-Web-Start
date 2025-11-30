# ⚡ Quick Test Guide - Job Title Extraction Fix

## 🚀 Immediate Steps

### 1. Reload Extension (30 seconds)
```
1. Go to: chrome://extensions/
2. Find "JobFiltr" extension
3. Click the reload button 🔄
4. Done!
```

### 2. Test on LinkedIn (1 minute)
```
1. Go to: https://www.linkedin.com/jobs/search/?keywords=software+engineer
2. Click ANY job to open details
3. Press F12 → Console tab
4. Look for: [JobFiltr...] Found title using selector: "..."
5. Click JobFiltr extension icon → Scanner tab
6. ✅ Job title should now appear!
```

### 3. Test on Indeed (1 minute)
```
1. Go to: https://www.indeed.com/jobs?q=software+engineer
2. Click ANY job to open details
3. Press F12 → Console tab
4. Look for: [JobFiltr...] Found title using selector: "h2.jobTitle > span"
5. Click JobFiltr extension icon → Scanner tab
6. ✅ Job title should now appear!
```

## ✅ What You Should See

### Console Output (LinkedIn)
```
[JobFiltr 2025-01-18T...] LinkedIn content script loaded
[JobFiltr 2025-01-18T...] Extracting job info from URL: https://...
[JobFiltr 2025-01-18T...] Found title using selector: "h1.job-details-jobs-unified-top-card__job-title"
[JobFiltr 2025-01-18T...] Title: "Senior Software Engineer"
[JobFiltr 2025-01-18T...] Found company using selector: "a.job-details-jobs-unified-top-card__company-name"
[JobFiltr 2025-01-18T...] Company: "Microsoft"
```

### Console Output (Indeed)
```
[JobFiltr 2025-01-18T...] Indeed content script loaded
[JobFiltr 2025-01-18T...] Extracting job info from URL: https://...
[JobFiltr 2025-01-18T...] Found title using selector: "h2.jobTitle > span"
[JobFiltr 2025-01-18T...] Title: "Software Engineer"
[JobFiltr 2025-01-18T...] Found company using selector: "[data-testid="inlineHeader-companyName"]"
[JobFiltr 2025-01-18T...] Company: "Google"
```

### Extension Popup (Scanner Tab)
```
✅ Job Title: "Senior Software Engineer"
✅ Company: "Microsoft"
✅ URL: https://www.linkedin.com/jobs/view/...
✅ [Scan Job] button is ENABLED
```

## 🔧 If Title Still Doesn't Appear

### Quick Diagnostic (30 seconds)

**Run in Console (F12) on the job page:**

```javascript
// Quick test
const title = document.querySelector('h2.jobTitle > span') ||
              document.querySelector('h1.job-details-jobs-unified-top-card__job-title');
console.log('Title found:', title?.textContent.trim());
```

**Expected:**
- LinkedIn: Shows the job title
- Indeed: Shows the job title

**If null/undefined:**
- Open: `chrome-extension/test-selectors.html`
- Follow the diagnostic instructions

## 📊 Success Checklist

Test on both platforms:

**LinkedIn:**
- [ ] Extension reloaded
- [ ] Console shows "Found title" log
- [ ] Scanner tab shows job title
- [ ] Title is accurate (matches page)

**Indeed:**
- [ ] Extension reloaded
- [ ] Console shows "Found title" log
- [ ] Scanner tab shows job title
- [ ] Title is accurate (matches page)

## 🎯 Key Changes Made

### LinkedIn
- ✅ 12 title selector variations (was 7)
- ✅ Better H1/H2 targeting
- ✅ Whitespace cleanup added

### Indeed
- ✅ 14 title selector variations (was 6)
- ✅ **PRIMARY:** `h2.jobTitle > span` (from Indeed docs)
- ✅ Span-specific targeting
- ✅ Whitespace cleanup added

## 🐛 Still Having Issues?

1. **Check URL Requirements:**
   - LinkedIn: Must have `/jobs/` in URL
   - Indeed: Must have `/viewjob`, `/rc/clk`, or `/pagead/`

2. **Verify Page Type:**
   - Must be on job DETAILS page
   - Not on search results page

3. **Check Console:**
   - Any error messages?
   - Does it say "Not on a job posting page"?

4. **Use Diagnostic Tool:**
   - Open `chrome-extension/test-selectors.html`
   - Follow instructions
   - Copy console output

## 📝 Report Format

If still not working, provide:

```
Platform: [LinkedIn / Indeed]
URL: [job posting URL or "private"]
Browser: [Chrome version]
Console Output: [paste logs]
Selector Test Results: [from diagnostic tool]
```

## 🎉 Success!

Once you see the job title in the Scanner tab:

✅ **Title extraction is fixed!**
✅ Filters should also work properly
✅ Extension is fully functional

Test on 3-5 different jobs to confirm consistency.

---

**Total Test Time:** ~3 minutes
**Files Changed:** 2 content scripts
**New Selectors:** 26 total (12 LinkedIn + 14 Indeed)
**Success Rate Target:** 95%+ of job postings
