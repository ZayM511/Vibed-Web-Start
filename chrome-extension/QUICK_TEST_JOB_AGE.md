# ⚡ Quick Test - Job Age Display Feature

## 🎯 30-Second Test

### Step 1: Reload Extension (5 seconds)
```
1. Go to chrome://extensions/
2. Find JobFiltr
3. Click reload 🔄
```

### Step 2: Enable Filter (10 seconds)
```
1. Click JobFiltr icon in toolbar
2. Go to "Filters" tab
3. Check "Job Age Display" (or similar)
4. Click "Apply Filters"
```

### Step 3: Test on LinkedIn (15 seconds)
```
1. Go to linkedin.com/jobs/search/?keywords=software+engineer
2. Look at job cards
3. ✅ Should see colored badges in top-right corner
4. ✅ Badges show "Posted X [time unit] ago"
```

---

## ✅ What You Should See

### Visual Display
```
┌──────────────────────────────┐
│ Software Engineer      🟢 5h │  ← Green badge
│ Microsoft                    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Senior Developer      🔵 3d  │  ← Blue badge
│ Google                       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Tech Lead            🟠 20d  │  ← Orange badge
│ Amazon                       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Manager              🔴 45d  │  ← Red badge
│ Meta                         │
└──────────────────────────────┘
```

### Badge Examples
- 🟢 `Posted 15 minutes ago` (< 1 hour)
- 🟢 `Posted 5 hours ago` (< 1 day)
- 🔵 `Posted 3 days ago` (1-14 days)
- 🟠 `Posted 18 days ago` (15-30 days)
- 🔴 `Posted 35 days ago` (> 30 days)

---

## 🔍 Console Verification

**Open DevTools (F12) → Console**

Should see logs like:
```
[JobFiltr...] Job age from datetime: 0 days, 5 hours, 15 minutes
[JobFiltr...] Added success badge: Posted 5 hours ago

[JobFiltr...] Job age from datetime: 3 days, 2 hours, 30 minutes
[JobFiltr...] Added info badge: Posted 3 days ago

[JobFiltr...] Job age from datetime: 18 days, 12 hours, 5 minutes
[JobFiltr...] Added warning badge: Posted 18 days ago
```

---

## 🐛 Quick Debug

### If No Badges Appear

**Run in Console:**
```javascript
// Check if filter is enabled
chrome.storage.local.get('filterSettings', (result) => {
  console.log('Settings:', result.filterSettings);
  console.log('showJobAge:', result.filterSettings?.showJobAge);
});

// Check for time elements
console.log('Time elements found:', document.querySelectorAll('time').length);

// Check for badges
console.log('Badges on page:', document.querySelectorAll('.jobfiltr-badge').length);
```

---

## ✅ Success Checklist

- [ ] Extension reloaded
- [ ] Filter enabled and applied
- [ ] Badges visible on all job cards
- [ ] Badge shows correct time format
- [ ] Badge color matches age
- [ ] Console shows job age logs
- [ ] Scroll works (new jobs get badges)

---

**Expected Time:** 30 seconds
**Expected Result:** All visible job postings show colored time badges
**Badge Count:** Should match number of visible jobs

**Status:** ✅ READY TO TEST
