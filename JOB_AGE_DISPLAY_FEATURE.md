# 📅 Job Age Display Feature - Complete Implementation

## ✅ Feature Implemented

**What It Does:** Displays a badge on every LinkedIn job posting showing exactly how long ago it was posted

**Visual Badge:** Color-coded badges appear on job cards with accurate time information

---

## 🎨 Badge Color System

### 🟢 Green Badge - Fresh Jobs
**Condition:** Posted less than 24 hours ago
**Display:**
- `Posted X minutes ago` (if < 1 hour)
- `Posted X hours ago` (if < 1 day)

### 🔵 Blue Badge - Recent Jobs
**Condition:** Posted 1-14 days ago
**Display:** `Posted X days ago`

### 🟠 Orange Badge - Older Jobs
**Condition:** Posted 15-30 days ago
**Display:** `Posted X days ago`

### 🔴 Red Badge - Very Old Jobs
**Condition:** Posted more than 30 days ago
**Display:** `Posted X days ago` or `Posted X+ days ago`

---

## ⏰ Time Formatting Rules

### Less Than 1 Hour
**Format:** `Posted X minutes ago`
**Examples:**
- `Posted 5 minutes ago`
- `Posted 45 minutes ago`
- `Posted 1 minute ago`

### Less Than 1 Day (but ≥ 1 hour)
**Format:** `Posted X hours ago`
**Examples:**
- `Posted 2 hours ago`
- `Posted 12 hours ago`
- `Posted 23 hours ago`

### 1 Day or More
**Format:** `Posted X days ago`
**Examples:**
- `Posted 1 day ago`
- `Posted 5 days ago`
- `Posted 21 days ago`
- `Posted 45 days ago`

---

## 🔍 How It Works

### 1. Time Detection Methods

**Method A: Datetime Attribute (Most Accurate)**
```javascript
<time datetime="2025-01-18T10:30:00Z">2 hours ago</time>
```
- Parses ISO datetime stamp
- Calculates exact minutes, hours, and days
- Most precise method

**Method B: Text Parsing (Fallback)**
```javascript
<time>3 hours ago</time>
<time>2 days ago</time>
<time>1 week ago</time>
```
- Parses human-readable text
- Converts weeks/months to days
- Handles various LinkedIn formats

### 2. Supported LinkedIn Time Formats

| LinkedIn Display | Parsed As | Badge Shows |
|-----------------|-----------|-------------|
| `5 minutes ago` | 5 minutes | 🟢 Posted 5 minutes ago |
| `2 hours ago` | 2 hours | 🟢 Posted 2 hours ago |
| `1 day ago` | 1 day | 🔵 Posted 1 day ago |
| `3 days ago` | 3 days | 🔵 Posted 3 days ago |
| `2 weeks ago` | 14 days | 🔵 Posted 14 days ago |
| `3 weeks ago` | 21 days | 🟠 Posted 21 days ago |
| `1 month ago` | 30 days | 🔴 Posted 30+ days ago |

### 3. Multiple Selector Strategy

Searches for time elements using 6 different selectors:
```javascript
[
  'time',                                    // Standard HTML5 time element
  '.job-card-container__listed-time',        // LinkedIn specific class
  '.job-card-list__date',                    // Alternative class
  '.jobs-unified-top-card__posted-date',     // Unified top card
  '[data-job-posted-date]',                  // Data attribute
  '.artdeco-entity-lockup__caption'          // Entity lockup
]
```

---

## 🚀 How To Use

### Step 1: Enable the Filter

1. **Open Extension Popup**
   - Click the JobFiltr icon in your toolbar

2. **Go to Filters Tab**
   - Click the "Filters" tab if not already there

3. **Enable "Job Age Display"**
   - Check the checkbox for "Job Age Display"
   - Click "Apply Filters"

### Step 2: View Job Ages

1. **Visit LinkedIn Jobs**
   ```
   https://www.linkedin.com/jobs/search/?keywords=software+engineer
   ```

2. **See Badges Appear**
   - Every visible job card will show a colored badge
   - Badge appears in top-right corner of each job card
   - Color indicates how recent the job is

### Step 3: Scroll for More

- As you scroll and LinkedIn loads more jobs
- Badges automatically appear on new jobs
- Mutation observer ensures all jobs get badges

---

## 📊 Technical Details

### Badge Styling

```css
Position: absolute (top-right corner)
Background: Color-coded (green/blue/orange/red)
Padding: 4px 10px
Border-radius: 6px
Font-size: 11px
Font-weight: 600
Z-index: 1000
Box-shadow: 0 2px 8px rgba(0,0,0,0.15)
Backdrop-filter: blur(4px)
```

### Performance Optimization

**Badge Removal:**
- Existing badges removed before re-applying
- Prevents duplicate badges
- Ensures clean display

**Mutation Observer:**
- Debounced to 500ms
- Only re-applies when DOM changes settle
- Prevents excessive re-rendering

**Conditional Display:**
- Only shows badges when filter is enabled
- Only on visible jobs (not hidden by other filters)
- Skips jobs that will be hidden

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Extension reloaded at `chrome://extensions/`
- [ ] "Job Age Display" filter enabled
- [ ] Filters applied
- [ ] Badges appear on all visible job cards
- [ ] Badge shows in top-right corner

### Time Accuracy
- [ ] Fresh jobs show minutes/hours
- [ ] 1+ day jobs show days
- [ ] Weeks converted to days (e.g., "2 weeks" = "14 days")
- [ ] Months show as "30+ days"

### Color Coding
- [ ] Green badge for jobs < 24 hours
- [ ] Blue badge for jobs 1-14 days
- [ ] Orange badge for jobs 15-30 days
- [ ] Red badge for jobs > 30 days

### Dynamic Loading
- [ ] Scroll down to load more jobs
- [ ] New jobs automatically get badges
- [ ] Badges update correctly

### Console Verification
- [ ] F12 → Console shows job age logs
- [ ] Example: `[JobFiltr...] Job age from datetime: 5 days, 3 hours, 45 minutes`
- [ ] Example: `[JobFiltr...] Added info badge: Posted 5 days ago`

---

## 🐛 Troubleshooting

### Badges Don't Appear

**Check 1: Filter Enabled?**
```
Extension popup → Filters tab → "Job Age Display" checked
```

**Check 2: Filters Applied?**
```
Click "Apply Filters" button after checking the box
```

**Check 3: Console Logs?**
```javascript
// Should see in Console (F12):
[JobFiltr...] Job age from datetime: X days, Y hours, Z minutes
[JobFiltr...] Added info badge: Posted X days ago
```

**Check 4: Time Element Present?**
```javascript
// Run in Console to check:
document.querySelectorAll('time').length
// Should return > 0
```

### Badges Show Wrong Time

**Issue:** Badge says "30+ days" but LinkedIn shows "2 days"

**Solution:**
- LinkedIn text might be cached
- Check Console for actual parsed time
- Datetime attribute is more accurate than text

### Badges Disappear After Scrolling

**Issue:** Badges vanish when loading more jobs

**Solution:**
- Check if mutation observer is working
- Look for "Re-applying filters due to DOM changes" in Console
- May need to re-apply filters manually

---

## 🔧 Console Commands for Testing

### Check Time Elements
```javascript
// Find all time elements on page
document.querySelectorAll('time').forEach((t, i) => {
  console.log(`Time ${i + 1}:`, t.textContent, '| datetime:', t.getAttribute('datetime'));
});
```

### Test Job Age Detection
```javascript
// Test first job card
const jobCard = document.querySelector('.jobs-search__results-list > li');
const time = jobCard.querySelector('time');
console.log('Text:', time.textContent);
console.log('Datetime:', time.getAttribute('datetime'));

// Calculate age manually
if (time.getAttribute('datetime')) {
  const posted = new Date(time.getAttribute('datetime'));
  const now = new Date();
  const diffHours = Math.floor((now - posted) / (1000 * 60 * 60));
  const diffDays = Math.floor((now - posted) / (1000 * 60 * 60 * 24));
  console.log('Hours ago:', diffHours);
  console.log('Days ago:', diffDays);
}
```

### Check Badge Presence
```javascript
// Count badges on page
const badges = document.querySelectorAll('.jobfiltr-badge');
console.log('Total badges:', badges.length);

badges.forEach((badge, i) => {
  console.log(`Badge ${i + 1}:`, badge.textContent, '| color:', badge.style.background);
});
```

---

## 📝 Example Output

### Console Logs
```
[JobFiltr 2025-01-18T12:00:00.000Z] LinkedIn content script loaded
[JobFiltr 2025-01-18T12:00:01.234Z] Applying filters with settings: {showJobAge: true, ...}
[JobFiltr 2025-01-18T12:00:01.456Z] Found 25 job cards using selector: .jobs-search__results-list > li
[JobFiltr 2025-01-18T12:00:01.567Z] Job age from datetime: 0 days, 3 hours, 25 minutes
[JobFiltr 2025-01-18T12:00:01.678Z] Added success badge: Posted 3 hours ago
[JobFiltr 2025-01-18T12:00:01.789Z] Job age from datetime: 2 days, 14 hours, 35 minutes
[JobFiltr 2025-01-18T12:00:01.890Z] Added info badge: Posted 2 days ago
[JobFiltr 2025-01-18T12:00:02.001Z] Job age from datetime: 18 days, 6 hours, 12 minutes
[JobFiltr 2025-01-18T12:00:02.112Z] Added warning badge: Posted 18 days ago
[JobFiltr 2025-01-18T12:00:02.223Z] Job age from datetime: 45 days, 2 hours, 48 minutes
[JobFiltr 2025-01-18T12:00:02.334Z] Added danger badge: Posted 45 days ago
[JobFiltr 2025-01-18T12:00:02.445Z] Filtered 0 jobs out of 25
```

### Visual Result on LinkedIn
```
┌─────────────────────────────────────┐
│ Software Engineer               🟢  │  ← Green badge: "Posted 3 hours ago"
│ Microsoft                           │
│ Seattle, WA                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Senior Developer                🔵  │  ← Blue badge: "Posted 2 days ago"
│ Google                              │
│ Mountain View, CA                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Tech Lead                       🟠  │  ← Orange badge: "Posted 18 days ago"
│ Amazon                              │
│ New York, NY                        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Engineering Manager             🔴  │  ← Red badge: "Posted 45 days ago"
│ Meta                                │
│ Menlo Park, CA                      │
└─────────────────────────────────────┘
```

---

## ✅ Success Criteria

**Feature is working correctly when:**

1. ✅ Badge appears on every visible job card
2. ✅ Badge shows accurate time (minutes/hours/days)
3. ✅ Badge color matches job age (green < 24h, blue 1-14d, orange 15-30d, red > 30d)
4. ✅ Badge persists while scrolling
5. ✅ New jobs get badges automatically
6. ✅ Console shows detailed job age logs
7. ✅ Badge positioned in top-right corner
8. ✅ Badge doesn't interfere with clicking jobs
9. ✅ Badge removed when filter disabled
10. ✅ Works alongside other filters

---

## 🎉 Feature Complete!

The Job Age Display feature is now fully implemented with:

✅ **Accurate time parsing** from datetime attributes and text
✅ **Smart formatting** (minutes for < 1hr, hours for < 1day, days for >= 1day)
✅ **Color-coded badges** for easy visual identification
✅ **All visible jobs** get badges when filter is enabled
✅ **Dynamic updates** as you scroll and load more jobs
✅ **Comprehensive logging** for debugging and verification

**Status:** READY TO TEST
**Compatibility:** LinkedIn 2025
**Performance:** Optimized with debounced mutation observer
