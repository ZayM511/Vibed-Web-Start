# Keyword Filter Debugging Guide

## Overview

This guide helps diagnose issues with the Include/Exclude Keywords filters on LinkedIn.

## Quick Test

1. Open LinkedIn Jobs page (e.g., https://www.linkedin.com/jobs/search/)
2. Open Developer Tools (F12) → Console tab
3. Run this command: `jobfiltrTestKeywords('engineer')`

You should see output like:
```
=== Testing keyword "engineer" on 7 cards ===
Card 1: MATCH - "Software Engineer"
Card 2: NO MATCH - "Product Manager"
...
=== Results: 5 matches, 2 non-matches ===
```

If this works, the keyword matching logic is functioning correctly.

## Detailed Debugging Steps

### Step 1: Verify Keywords Are Added

1. Open JobFiltr popup
2. Sign in if needed
3. Add a keyword (e.g., "python")
4. Check the popup console (right-click popup → Inspect → Console)

Expected output:
```
[JobFiltr Popup] addKeyword called
  type: include
  keyword: python
  Added to includeKeywords. Array now: ["python"]
```

If you don't see this, the keyword isn't being added properly.

### Step 2: Verify Checkbox Is Checked

After adding the keyword:
1. Check the "Include Keywords" checkbox
2. The checkbox should be visually checked

### Step 3: Verify Settings Are Saved

1. Click "Apply Filters"
2. Check the popup console for:

Expected output:
```
[JobFiltr Popup] saveFilterSettings called
  Global includeKeywords array at start: ["python"]
  Include checkbox checked: true

[JobFiltr Popup] KEYWORD DEBUG:
  filterSettings.filterIncludeKeywords: true
  filterSettings.includeKeywords: ["python"]
```

If `includeKeywords` is empty `[]` or `filterIncludeKeywords` is `false`, that's the problem.

### Step 4: Verify Content Script Receives Message

1. Switch to the LinkedIn tab
2. Open Developer Tools → Console
3. Look for:

Expected output:
```
[JobFiltr] Message received: APPLY_FILTERS
[JobFiltr] === APPLY_FILTERS RECEIVED ===
[JobFiltr] filterIncludeKeywords: true (type: boolean)
[JobFiltr] includeKeywords: ["python"] (type: object)
```

If you don't see this, the message isn't reaching the content script.

### Step 5: Check Keyword Filter State

In the LinkedIn page console, run:
```
jobfiltrKeywordState()
```

Expected output:
```
=== Keyword Filter State ===
filterIncludeKeywords: true
includeKeywords: ["python"]
filterExcludeKeywords: false
excludeKeywords: []
```

## Common Issues

### Issue: Keywords not saved
- **Symptom**: `includeKeywords: []` in save logs
- **Cause**: Keywords might be cleared before save
- **Fix**: Check if popup is reloading or keywords are reset

### Issue: Checkbox not checked
- **Symptom**: `filterIncludeKeywords: false` in save logs
- **Cause**: User forgot to check the checkbox
- **Fix**: Check the "Include Keywords" checkbox

### Issue: Message not received
- **Symptom**: No `APPLY_FILTERS RECEIVED` in content script console
- **Cause**: Content script not loaded or tab ID mismatch
- **Fix**: Refresh the LinkedIn page and try again

### Issue: Text extraction fails
- **Symptom**: `jobfiltrTestKeywords()` finds no matches for obvious keywords
- **Cause**: LinkedIn DOM structure changed
- **Fix**: Report this issue for selector updates

## Debug Functions

Available in the LinkedIn page console:

- `jobfiltrDebug()` - Show general extension state
- `jobfiltrKeywordState()` - Show current keyword filter settings
- `jobfiltrTestKeywords('keyword')` - Test keyword matching on visible job cards
