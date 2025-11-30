# Homepage Refining Agent

## Role
You are an expert web researcher, copywriter, and data visualization specialist focused on job market fraud analytics. Your task is to research credible data about spam and ghost job postings, refine messaging, and update the homepage with accurate, trustworthy, and compelling information.

## Tasks

### 1. Refine Problem Statement Section
**Location**: Under "The Job Market Has A Problem" heading, above "In 2025, ..." section

**Current Text**:
```
Every day, thousands of job seekers waste hours applying to positions that are either potential Scams or don't lead anywhere. Then there are Ghost Jobs - fake job postings with no intent to hire.
```

**Requirements**:
- Layout the 3 problems clearly: **Scam Jobs**, **Spam Jobs**, and **Ghost Jobs**
- Provide clear, concise definitions for each
- Maintain emotional connection with job seekers
- Keep the flow natural and scannable
- Make it relatable for job seekers experiencing these issues
- Use the existing design system (gradients, spacing, etc.)

**Suggested Structure**:
```tsx
<div className="space-y-4">
  <div className="flex items-start gap-3">
    <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/20 to-rose-500/20">
      <Icon className="h-5 w-5 text-red-400" />
    </div>
    <div>
      <h4 className="font-semibold text-white mb-1">Scam Jobs</h4>
      <p className="text-white/70">Definition here...</p>
    </div>
  </div>
  {/* Repeat for Spam Jobs (gold/amber colors) and Ghost Jobs (purple colors) */}
</div>
```

### 2. Research Data & Update Charts

#### Research Requirements:
**Use Web Search/Fetch to find credible sources:**
- LinkedIn Economic Graph reports
- Indeed Hiring Lab research
- Glassdoor research reports
- Government labor statistics (BLS)
- Academic peer-reviewed papers
- Industry research (Greenhouse, ResumeUp.AI, Fortune, Bloomberg, WSJ with citations)

**Data Needed**:
- Scam job percentage growth (2020-2025)
- Ghost job percentage growth (2020-2025)
- **Spam job percentage growth (2020-2025)** ← NEW
- Data/info selling from job applications (2020-2025)
- Year-by-year breakdown

#### Chart 1 Update: "Harmful Job Posting Trends"
**File**: `app/page.tsx` (around line 1200-1400)

**Requirements**:
- Add third line for "Spam Jobs" in **gold color** (`from-amber-500` to `to-yellow-500`)
- Place "Spam Jobs" below "Ghost Jobs" in legend
- Add gold animated line with dots matching existing animation speed
- Update data with real credible statistics from research
- Ensure all three lines are clearly visible and animated

**Current Chart Data Structure**:
```typescript
const chartData = [
  { year: "2020", scam: 5, ghost: 10 },
  { year: "2021", scam: 8, ghost: 15 },
  // ... add spam data
];
```

#### Chart 2 Update: Convert to Bar Chart
**Current**: "Time Wasted on Ghost Jobs" (bar chart showing hours)
**New**: Bar chart showing spam job data AND data/info selling from job applications (2020-2025)

**Requirements**:
- Convert to stacked or grouped bar chart
- Show spam job statistics
- Show data/info selling from applications statistics
- Use gold/amber colors for spam jobs
- Use appropriate contrasting color for data selling (suggest red/rose)
- Label clearly with source citations
- Maintain responsive design

### 3. Add "Run The Numbers" Heading
**Location**: Above the 8 percentage data boxes, below "Your time is too valuable for that..."

**Requirements**:
- Use similar font size/weight as "The Job Market Has a Problem"
- Center align
- Use gradient text effect (indigo → white → rose)
- Add appropriate spacing

**Implementation**:
```tsx
<h2 className="text-4xl md:text-5xl font-bold mb-12 text-center">
  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-rose-300">
    Run The Numbers
  </span>
</h2>
```

### 4. Remove Sources from Data Boxes
**Location**: Bottom of each of the 8 percentage boxes

**Action**: Delete all `<p>Source: ...</p>` lines from the 8 stat boxes

### 5. Update "Instant Scam Detection" Box
**Current**: "AI analyzes job postings in seconds, flagging fake listings, unrealistic requirements, and suspicious patterns before you waste your time."

**New**: "JobFiltr analyzes job postings in seconds -- flagging fake listings, unrealistic requirements, and suspicious patterns before you waste your time or compromise your personal information"

**File**: `app/page.tsx` (around line 1800-2000)

### 6. Change "Real-Time Market Insights" to Spam Detection
**Current Box**: "Real-Time Market Insights" - "Get live data on company hiring trends..."

**New Requirements**:
- Change title to something about spam job detection
- Update description to explain how JobFiltr helps detect spam jobs
- Keep the same icon or choose a relevant one
- Maintain design consistency

**Suggested**:
```tsx
<div>
  <TrendingUp className="h-12 w-12 text-amber-500 mb-4" />
  <h3>Spam Job Detection</h3>
  <p>Identify deceptive postings designed to collect your data. JobFiltr flags suspicious patterns, unrealistic promises, and data harvesting schemes before you apply.</p>
</div>
```

### 7. Update Trust Badge
**Current**: "Trusted by thousands of job seekers"
**New**: "Trusted by job seekers nationwide"

**Location**: Search for "Trusted by thousands" and replace

### 8. Update Bottom Trust Indicators
**Current**:
- "No signup required"
- "Always free"

**Requirements**:
- Replace with more compelling, relevant trust indicators
- Match quality of "100% privacy guaranteed"
- Focus on value propositions that matter to job seekers

**Suggestions**:
- "AI-Powered Protection"
- "Instant Results"
- "No Credit Card Required"
- "Unlimited Scans Available"
- "Community-Verified Data"
- "Real-Time Detection"

### 9. Replace Bottom CTA Stats
**Current**:
- "Fake jobs filtered" (0.0%)
- "Analysis time" (<5s)
- "Free forever" (0%)

**Requirements**:
- Replace with on-brand, compelling statistics
- Use real/realistic numbers if possible from research
- Focus on value and protection

**Suggestions**:
- "95%+ Accuracy" (detection accuracy)
- "50+ Red Flags Detected" (scam indicators)
- "3-Second Analysis" (speed)
- "10,000+ Jobs Scanned" (volume)

## Implementation Guidelines

### File to Modify
- **Primary**: `app/page.tsx` - Main homepage

### Design Consistency
✅ Maintain glassmorphism effects
✅ Keep gradient backgrounds and animations
✅ Use existing color palette (indigo, purple, rose, amber/gold)
✅ Preserve responsive design
✅ Keep animation speeds consistent

### Color Palette for Spam Jobs
- Line/accent: `from-amber-500 to-yellow-500`
- Background glow: `from-amber-500/20 to-yellow-500/20`
- Text: `text-amber-400`
- Icon background: `bg-amber-500`

### Testing Checklist
- [ ] All text updates accurate and compelling
- [ ] Charts render correctly with new data
- [ ] Animations work smoothly
- [ ] Responsive on mobile and desktop
- [ ] No TypeScript errors
- [ ] Sources cited for all statistics
- [ ] Color scheme consistent
- [ ] Typography hierarchy maintained

## Success Criteria
✅ Problem statement section redesigned with 3 clear job types
✅ Chart 1 includes Spam Jobs line (gold) with real data
✅ Chart 2 converted to bar chart with spam + data selling stats
✅ "Run The Numbers" heading added above stat boxes
✅ Sources removed from data boxes
✅ "Instant Scam Detection" text updated
✅ "Real-Time Market Insights" changed to spam detection
✅ Trust badge updated to "nationwide"
✅ Bottom trust indicators replaced with compelling alternatives
✅ Bottom CTA stats replaced with on-brand metrics
✅ All changes maintain design consistency
✅ Page renders without errors
