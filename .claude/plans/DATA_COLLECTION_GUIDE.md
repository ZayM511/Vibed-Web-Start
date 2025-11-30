# 📊 Phase 2: Data Collection Guide

## Quick Start - Generate Training Data

### Method 1: Automated Sample Generation (FASTEST) ⚡

Use the new `generateSampleJobs` function to instantly create training data:

1. **Open Convex Dashboard**:
   - Go to your Convex project dashboard
   - Navigate to "Functions" tab

2. **Run the Data Generator**:
   ```typescript
   // In Convex dashboard, go to Functions → dataCollection → generateSampleJobs

   // Generate 20 mixed jobs (10 scams + 10 legitimate)
   await ctx.runAction(api.dataCollection.generateSampleJobs, {
     count: 20,
     includeScams: true,
     includeLegit: true
   });
   ```

3. **Check the Labeling Tab**:
   - Go to http://localhost:3001/dashboard
   - Click "Labeling" tab
   - Jobs should now appear for labeling!

---

### Method 2: Manual Scanning (RECOMMENDED for real data)

Collect real job postings and scan them:

1. **Find Job Postings**:
   - Go to Indeed, LinkedIn, Monster, etc.
   - Copy job descriptions (mix of suspicious and legitimate)

2. **Scan Each Job**:
   - Go to http://localhost:3001/filtr
   - Paste job description
   - Click "Analyze Job"
   - Each scan automatically creates a training data entry

3. **Label the Results**:
   - Go to http://localhost:3001/dashboard → Labeling tab
   - High uncertainty scans (40-60% confidence) appear first
   - Label each as scam/legitimate + ghost job

---

### Method 3: Batch Import (for large datasets)

Import multiple jobs at once:

```typescript
// In Convex dashboard
await ctx.runAction(api.dataCollection.batchImportJobs, {
  jobs: [
    {
      title: "Data Entry Clerk",
      company: "Acme Corp",
      content: "Full job description here...",
      url: "https://example.com/job/123",
      knownScam: false  // optional, if you already know the label
    },
    // ... more jobs
  ]
});
```

---

## Data Collection Goals

### Phase 2 Targets:
- ✅ **1,000 manually labeled** (high quality, diverse)
- ✅ **2,000 scraped from scam databases** (confirmed scams)
- ✅ **2,000 synthetic augmented** (variations of real examples)
- **Total: 5,000+ labeled examples**

### Current Progress:
- [ ] 0 / 1,000 manually labeled
- [ ] 0 / 2,000 scraped scams
- [ ] 0 / 2,000 synthetic examples

---

## Labeling Interface Features

### What's Fixed:
✅ **"Review From Start" button** - Now works correctly when you finish the queue
✅ **Empty state** - Shows "Go to Scanner" button when no data exists
✅ **Completion state** - Shows "Queue Complete!" when you finish all jobs

### How to Use:
1. **Stats Dashboard** - See your contribution count and confidence
2. **Classification** - Mark each job as Scam Yes/No and Ghost Job Yes/No
3. **Confidence Slider** - Rate your certainty (1-5)
4. **Red Flag Tags** - Select applicable warning signs
5. **Notes** - Add optional explanation
6. **Submit** - Saves your label and moves to next job

---

## Sample Jobs Created

The `generateSampleJobs` function includes:

### Scam Templates (3 types):
1. **"Work From Home - Easy Money"** - Classic pay-to-play scam
2. **"Data Entry Specialist"** - Upfront fee scam
3. **"Personal Assistant to CEO"** - Package forwarding / money mule scam

### Legitimate Templates (2 types):
1. **"Senior Software Engineer"** - Professional tech job
2. **"Marketing Manager"** - Standard marketing position

Each template gets varied slightly to create unique training examples.

---

## Next Steps After Data Collection

Once you have **1,000+ labeled examples**:

1. **Export the dataset:**
   ```typescript
   const dataset = await ctx.runQuery(api.trainingData.exportTrainingDataset, {
     onlyLabeled: true,
     format: "json"
   });
   ```

2. **Proceed to Model Training:**
   - Train DistilBERT transformer
   - Train XGBoost classifier
   - Calibrate Isolation Forest
   - Build ensemble fusion

3. **Achieve 85%+ accuracy target**

---

## Tips for Quality Labeling

### DO:
✅ Read the entire job posting carefully
✅ Look for multiple red flags before marking as scam
✅ Use high confidence (4-5) only when very certain
✅ Add notes explaining your reasoning for edge cases
✅ Take breaks to maintain focus

### DON'T:
❌ Rush through labels - quality over speed
❌ Mark legitimate jobs as scams based on minor issues
❌ Ignore context - some informal language is normal
❌ Label without reading the full posting
❌ Use extreme confidence (5/5) unless 100% certain

---

## Troubleshooting

**Q: "No jobs appearing in Labeling tab?"**
- A: Run `generateSampleJobs` or manually scan jobs on /filtr page

**Q: "Button says 'Review From Start' but nothing happens?"**
- A: This is fixed! The button now only appears when you've finished all jobs in the queue

**Q: "How do I reset and start over?"**
- A: Currently, manually delete entries from Convex dashboard or contact admin

**Q: "Can I label the same job multiple times?"**
- A: Yes! Multiple labels enable consensus labeling (coming soon)

---

## Current Features

### ✅ Implemented:
- Automated sample job generation
- Manual scanning workflow
- Batch import function
- Labeling interface with gamification
- Active learning (shows uncertain cases first)
- Stats tracking (contributions, confidence)
- Progress bar
- Red flag tagging

### 🚧 Coming Soon:
- Web scrapers for public scam databases
- GPT-4 synthetic data generation
- Consensus labeling (3+ votes)
- Labeler reputation system
- Data quality checks
- Export to ML training format

---

## Questions?

Check the main plan: `.claude/plans/advanced_scanner_ml_system.md`

**Ready to start collecting data?** Run `generateSampleJobs` in Convex dashboard and start labeling! 🚀
