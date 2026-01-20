# Staffing Filter Display Mode Fix - LinkedIn

## Problem Statement

The LinkedIn content script (`content-linkedin-v3.js`) is missing the staffing display mode implementation that exists in Indeed. Currently, when the "Hide Staffing Firms" filter is enabled, LinkedIn ALWAYS hides staffing firm job cards completely, regardless of the `staffingDisplayMode` setting.

The Indeed implementation properly supports three display modes:
1. **hide** - Hide the card completely (current LinkedIn behavior)
2. **flag** - Show card with a staffing badge
3. **dim** - Dim the card and show staffing badge

## Root Cause

### LinkedIn Implementation (WRONG)

**Location:** `chrome-extension/src/content-linkedin-v3.js`

**Line 2578-2581:**
```javascript
// Filter 1: Hide Staffing Firms
if (settings.hideStaffing && isStaffingFirm(jobCard)) {
  shouldHide = true;
  reasons.push('Staffing Firm');
}
```

**Line 3152-3155 (performIncrementalScan):**
```javascript
if (filterSettings.hideStaffing && isStaffingFirm(jobCard)) {
  shouldHide = true;
  reasons.push('Staffing Firm');
}
```

### Indeed Implementation (CORRECT)

**Location:** `chrome-extension/src/content-indeed-v3.js`

**Line 1480-1510:**
```javascript
// Filter 1: Handle Staffing Firms (with display mode support)
if (settings.hideStaffing) {
  const staffingResult = getStaffingResult(jobCard);
  if (staffingResult.isStaffing) {
    const displayMode = settings.staffingDisplayMode || 'hide';

    if (displayMode === 'hide') {
      shouldHide = true;
      reasons.push('Staffing Firm');
    } else if (displayMode === 'flag') {
      // Add staffing badge instead of hiding
      if (!jobCard.dataset.jobfiltrStaffingFlagged) {
        if (window.JobFiltrStaffing?.addStaffingBadge) {
          window.JobFiltrStaffing.addStaffingBadge(jobCard, staffingResult, 'indeed');
        }
        jobCard.dataset.jobfiltrStaffingFlagged = 'true';
      }
    } else if (displayMode === 'dim') {
      // Dim the card and add badge instead of hiding
      if (!jobCard.dataset.jobfiltrStaffingDimmed) {
        if (window.JobFiltrStaffing?.applyDimEffect) {
          window.JobFiltrStaffing.applyDimEffect(jobCard);
        }
        if (window.JobFiltrStaffing?.addStaffingBadge) {
          window.JobFiltrStaffing.addStaffingBadge(jobCard, staffingResult, 'indeed');
        }
        jobCard.dataset.jobfiltrStaffingDimmed = 'true';
      }
    }
  }
}
```

## Solution

### Required Changes

1. **Add staffing detection module support** - Ensure `staffing-detection.js` is loaded in LinkedIn manifest
2. **Update filter logic** - Replace simple hide with mode-aware handling
3. **Support all three display modes** - hide, flag, dim

### Implementation Plan

#### Step 1: Verify staffing-detection.js is loaded

Check `chrome-extension/manifest.json` to ensure `staffing-detection.js` is loaded for LinkedIn:

```json
{
  "content_scripts": [
    {
      "matches": ["*://*.linkedin.com/*"],
      "js": [
        "src/staffing-detection.js",  // Must be loaded BEFORE content-linkedin-v3.js
        "src/content-linkedin-v3.js"
      ]
    }
  ]
}
```

#### Step 2: Update Filter Logic in content-linkedin-v3.js

**Replace Line 2578-2581:**

```javascript
// Filter 1: Handle Staffing Firms (with display mode support)
if (settings.hideStaffing) {
  // Use the global staffing detection module
  const staffingResult = window.JobFiltrStaffing?.getStaffingResult?.(jobCard) ||
                        { isStaffing: isStaffingFirm(jobCard), detectedBy: ['basic'] };

  if (staffingResult.isStaffing) {
    const displayMode = settings.staffingDisplayMode || 'hide';

    if (displayMode === 'hide') {
      shouldHide = true;
      reasons.push('Staffing Firm');
    } else if (displayMode === 'flag') {
      // Add staffing badge instead of hiding
      if (!jobCard.dataset.jobfiltrStaffingFlagged) {
        if (window.JobFiltrStaffing?.addStaffingBadge) {
          window.JobFiltrStaffing.addStaffingBadge(jobCard, staffingResult, 'linkedin');
        }
        jobCard.dataset.jobfiltrStaffingFlagged = 'true';
      }
    } else if (displayMode === 'dim') {
      // Dim the card and add badge instead of hiding
      if (!jobCard.dataset.jobfiltrStaffingDimmed) {
        if (window.JobFiltrStaffing?.applyDimEffect) {
          window.JobFiltrStaffing.applyDimEffect(jobCard);
        }
        if (window.JobFiltrStaffing?.addStaffingBadge) {
          window.JobFiltrStaffing.addStaffingBadge(jobCard, staffingResult, 'linkedin');
        }
        jobCard.dataset.jobfiltrStaffingDimmed = 'true';
      }
    }
  }
}
```

**Replace Line 3152-3155 (performIncrementalScan):**

```javascript
// Filter 1: Handle Staffing Firms (with display mode support)
if (filterSettings.hideStaffing) {
  const staffingResult = window.JobFiltrStaffing?.getStaffingResult?.(jobCard) ||
                        { isStaffing: isStaffingFirm(jobCard), detectedBy: ['basic'] };

  if (staffingResult.isStaffing) {
    const displayMode = filterSettings.staffingDisplayMode || 'hide';

    if (displayMode === 'hide') {
      shouldHide = true;
      reasons.push('Staffing Firm');
    } else if (displayMode === 'flag') {
      if (!jobCard.dataset.jobfiltrStaffingFlagged) {
        if (window.JobFiltrStaffing?.addStaffingBadge) {
          window.JobFiltrStaffing.addStaffingBadge(jobCard, staffingResult, 'linkedin');
        }
        jobCard.dataset.jobfiltrStaffingFlagged = 'true';
      }
    } else if (displayMode === 'dim') {
      if (!jobCard.dataset.jobfiltrStaffingDimmed) {
        if (window.JobFiltrStaffing?.applyDimEffect) {
          window.JobFiltrStaffing.applyDimEffect(jobCard);
        }
        if (window.JobFiltrStaffing?.addStaffingBadge) {
          window.JobFiltrStaffing.addStaffingBadge(jobCard, staffingResult, 'linkedin');
        }
        jobCard.dataset.jobfiltrStaffingDimmed = 'true';
      }
    }
  }
}
```

#### Step 3: Add Badge Cleanup on Mode Change

When display mode changes or filter is disabled, we need to clean up badges and dim effects:

**Add new function:**

```javascript
/**
 * Clean up staffing badges and dim effects
 * Called when filter is disabled or mode changes
 */
function cleanupStaffingEffects(jobCard) {
  // Remove staffing badges
  jobCard.querySelectorAll('.jobfiltr-staffing-badge').forEach(b => b.remove());

  // Remove dim effect
  if (jobCard.dataset.jobfiltrStaffingDimmed) {
    if (window.JobFiltrStaffing?.removeDimEffect) {
      window.JobFiltrStaffing.removeDimEffect(jobCard);
    }
    delete jobCard.dataset.jobfiltrStaffingDimmed;
  }

  // Clear flag
  delete jobCard.dataset.jobfiltrStaffingFlagged;
}
```

**Call cleanup when filters reset:**

```javascript
// In resetFilters function (around line 2800)
function resetFilters() {
  processedJobCards.clear();

  const jobCardSelectors = [/* ... */];

  document.querySelectorAll(jobCardSelectors.join(', ')).forEach(jobCard => {
    // Existing cleanup code...

    // Clean up staffing effects
    cleanupStaffingEffects(jobCard);

    // Rest of reset logic...
  });
}
```

#### Step 4: Test Cases

Create test cases to verify all modes work:

1. **Hide Mode Test:**
   - Enable "Hide Staffing Firms"
   - Set display mode to "hide"
   - Verify TekSystems job is hidden
   - Verify non-staffing job is visible

2. **Flag Mode Test:**
   - Enable "Hide Staffing Firms"
   - Set display mode to "flag"
   - Verify TekSystems job is visible
   - Verify TekSystems job has staffing badge
   - Verify non-staffing job has no badge

3. **Dim Mode Test:**
   - Enable "Hide Staffing Firms"
   - Set display mode to "dim"
   - Verify TekSystems job is visible but dimmed
   - Verify TekSystems job has staffing badge
   - Verify non-staffing job is not dimmed

4. **Mode Change Test:**
   - Start with "hide" mode
   - Change to "flag" mode
   - Verify previously hidden cards reappear with badges
   - Change to "dim" mode
   - Verify cards are dimmed

## Files to Modify

1. **chrome-extension/manifest.json** - Ensure staffing-detection.js loaded
2. **chrome-extension/src/content-linkedin-v3.js** - Update filter logic (2 locations)
3. **chrome-extension/tests/staffing-display-mode.test.js** - Add LinkedIn tests

## Success Criteria

✅ LinkedIn respects `staffingDisplayMode` setting
✅ Hide mode: Staffing firms completely hidden
✅ Flag mode: Staffing firms visible with badge
✅ Dim mode: Staffing firms dimmed with badge
✅ Non-staffing firms never hidden/dimmed
✅ Mode changes work smoothly without page reload
✅ All test cases pass

## Edge Cases

1. **Filter disabled:** All staffing effects removed
2. **Mode change:** Previous effects cleaned up before applying new mode
3. **Badge persistence:** Badges survive page mutations
4. **Multiple filters:** Staffing + other filters work together correctly
