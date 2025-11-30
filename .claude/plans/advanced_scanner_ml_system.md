# Advanced AI-Powered Job Scam Detection System
## Achieving 90%+ Accuracy with Self-Learning Capabilities

**Version:** 2.0
**Target Accuracy:** ≥90%
**Date:** January 2025
**Status:** Strategic Plan

---

## Executive Summary

This plan outlines a comprehensive transformation of the current job scam detection system from a simple GPT-4 prompt-based approach to a sophisticated, multi-layered AI system with continuous learning capabilities. The goal is to achieve **90%+ accuracy** in detecting both scam job postings and ghost jobs through ensemble learning, advanced NLP, behavioral analysis, and community-driven feedback loops.

---

## Table of Contents

1. [Current System Analysis](#1-current-system-analysis)
2. [Strategic Architecture](#2-strategic-architecture)
3. [Multi-Layered Detection System](#3-multi-layered-detection-system)
4. [Self-Learning & Continuous Improvement](#4-self-learning--continuous-improvement)
5. [Feature Engineering](#5-feature-engineering)
6. [Implementation Phases](#6-implementation-phases)
7. [Technical Stack](#7-technical-stack)
8. [Success Metrics](#8-success-metrics)
9. [Risk Mitigation](#9-risk-mitigation)

---

## 1. Current System Analysis

### Current Implementation (convex/ai.ts)
```typescript
// Current: Single GPT-4o-mini call with prompt engineering
- Model: OpenAI GPT-4o-mini
- Approach: Zero-shot classification
- Temperature: 0.3
- Output: Single confidence score
```

### Limitations Identified

| **Limitation** | **Impact** | **Risk Level** |
|----------------|------------|----------------|
| Single model dependency | No redundancy, vulnerable to model failures | **High** |
| No training data collection | Cannot improve over time | **Critical** |
| No feature engineering | Misses statistical patterns | **High** |
| No ensemble approach | Lower accuracy ceiling | **High** |
| No anomaly detection | Misses outliers | **Medium** |
| No feedback loop | No learning from mistakes | **Critical** |
| No versioning | Cannot A/B test improvements | **Medium** |
| No caching | High API costs | **Low** |

### Accuracy Estimation
- **Current Expected Accuracy:** 60-75%
- **Target Accuracy:** 90%+
- **Gap to Close:** 15-30%

---

## 2. Strategic Architecture

### 2.1 Multi-Layer Detection Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    INPUT: Job Posting                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Layer 1: Feature Extraction                     │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐  │
│  │ Text NLP     │ Metadata     │ URL Analysis │ Temporal │  │
│  │ Features     │ Extraction   │              │ Patterns │  │
│  └──────────────┴──────────────┴──────────────┴──────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│            Layer 2: Parallel Model Ensemble                  │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐  │
│  │ Transformer  │ Statistical  │ Anomaly      │ LLM      │  │
│  │ Model (BERT) │ Classifier   │ Detector     │ Analyzer │  │
│  │              │ (XGBoost)    │ (Isolation)  │ (GPT-4)  │  │
│  └──────────────┴──────────────┴──────────────┴──────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│         Layer 3: Meta-Classifier (Ensemble Fusion)           │
│              Weighted voting + Confidence calibration        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│            Layer 4: Post-Processing & Validation             │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │ Rule Engine  │ Community    │ Historical Similarity    │ │
│  │ Validation   │ Consensus    │ Check                    │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                OUTPUT: Scam Assessment                       │
│  • Scam Probability: 0-100%                                  │
│  • Ghost Job Probability: 0-100%                             │
│  • Confidence Score: 0-100%                                  │
│  • Red Flags: Detailed list                                 │
│  • Recommendation: Action to take                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Multi-Layered Detection System

### Layer 1: Advanced Feature Engineering

#### 3.1.1 Text-Based Features (NLP)

**Semantic Features:**
- **Embeddings:** DistilBERT/MiniLM sentence embeddings (768-dim)
- **TF-IDF Vectors:** Top 5000 n-grams (1-3 grams)
- **Sentiment Analysis:** VADER compound scores
- **Readability Metrics:** Flesch-Kincaid, Gunning Fog
- **Linguistic Patterns:**
  - Urgency words count ("now", "immediately", "limited time")
  - Vague qualifiers ("dynamic", "fast-paced", "motivated")
  - Financial keywords ("fee", "investment", "guarantee")

**Syntactic Features:**
- Grammar error rate (LanguageTool API)
- Spelling error rate
- Average sentence length
- Punctuation density
- Capitalization anomalies (ALL CAPS frequency)

#### 3.1.2 Metadata Features

**Job Posting Attributes:**
```javascript
{
  // Structural
  descriptionLength: number,
  hasContactInfo: boolean,
  hasSalaryRange: boolean,
  hasCompanyWebsite: boolean,
  hasApplicationProcess: boolean,

  // Temporal
  postingAge: number,  // days since posted
  estimatedFillTime: number,  // ML prediction
  isReposted: boolean,

  // Company
  companyDomain: string,
  domainAge: number,  // via WHOIS
  domainTrustScore: number,  // via external API
  linkedInCompanyExists: boolean,
  glassdoorRating: number | null,

  // Contact
  emailDomain: string,
  usesGenericEmail: boolean,  // gmail, yahoo, etc.
  phoneNumberCountry: string | null,

  // Requirements
  requirementCount: number,
  experienceYearsMin: number,
  educationLevel: string,
  requiresPayment: boolean,
  requiresSSN: boolean,
}
```

#### 3.1.3 Behavioral/Temporal Features

- **Company posting velocity:** Jobs posted per week
- **Similarity to existing jobs:** Cosine similarity to company's other postings
- **Geographic consistency:** Location vs company HQ distance
- **Salary anomaly:** Deviation from industry average (via BLS API)
- **Posting pattern:** Time of day, day of week analysis

#### 3.1.4 URL/Domain Features

- **Domain reputation:** VirusTotal, Google Safe Browsing API
- **SSL certificate validity**
- **Domain age:** WHOIS lookup
- **Redirect chain analysis:** Count and destinations
- **URL structure:** Length, subdomain count, suspicious patterns

---

### Layer 2: Parallel Model Ensemble

#### 3.2.1 Model #1: Fine-Tuned Transformer (Primary)

**Architecture:**
```
Base Model: DistilBERT-base-uncased (66M parameters)
Fine-tuning: Binary classification (scam/legitimate)
Training: 50k+ labeled job postings
```

**Advantages:**
- ✅ Captures semantic meaning and context
- ✅ Handles implicit scam indicators
- ✅ Strong with text-heavy features
- ✅ Transfer learning from pre-trained knowledge

**Training Pipeline:**
```python
# Pseudo-code
model = DistilBertForSequenceClassification.from_pretrained(
    'distilbert-base-uncased',
    num_labels=2  # scam vs legitimate
)

# Dataset: JobPostingDataset with balanced sampling
# Optimizer: AdamW with learning rate 2e-5
# Epochs: 3-5 with early stopping
# Validation: 20% holdout set
# Metrics: F1, Precision, Recall, AUC-ROC
```

#### 3.2.2 Model #2: Gradient Boosted Trees (XGBoost)

**Features:** All engineered features (3.1.1 - 3.1.4)

**Configuration:**
```python
params = {
    'objective': 'binary:logistic',
    'max_depth': 8,
    'learning_rate': 0.05,
    'n_estimators': 500,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'eval_metric': 'auc',
    'early_stopping_rounds': 50
}
```

**Advantages:**
- ✅ Excellent with tabular/structured features
- ✅ Feature importance interpretability
- ✅ Fast inference
- ✅ Robust to missing values

#### 3.2.3 Model #3: Anomaly Detection (Isolation Forest)

**Purpose:** Flag unusual patterns not seen in training data

**Configuration:**
```python
IsolationForest(
    contamination=0.05,  # expect 5% anomalies
    n_estimators=200,
    max_samples=256,
    random_state=42
)
```

**Features Used:**
- Posting metadata vectors
- TF-IDF compressed representation (PCA 50 components)
- Behavioral metrics

**Output:** Anomaly score (-1 to 1)

#### 3.2.4 Model #4: LLM Analyzer (GPT-4o)

**Enhanced Prompt Engineering:**
```typescript
const advancedPrompt = `You are a senior fraud investigator with 20 years of experience in employment scam detection.

CRITICAL ANALYSIS FRAMEWORK:
1. Identity Verification Indicators
2. Financial Request Red Flags
3. Communication Pattern Analysis
4. Urgency & Pressure Tactics
5. Job Description Quality Assessment
6. Company Legitimacy Signals

Context: This job has been flagged by preliminary screening.
Statistical Profile: ${metadataJson}

Provide nuanced analysis considering:
- False positive risk (legitimate remote jobs may seem suspicious)
- Industry-specific norms (crypto/startup vs corporate)
- Geographic factors (international postings)

Output strict JSON with reasoning chain...`;
```

**Advantages:**
- ✅ Handles complex, nuanced cases
- ✅ Provides human-readable explanations
- ✅ Strong zero-shot generalization
- ✅ Can reason about edge cases

---

### Layer 3: Meta-Classifier (Ensemble Fusion)

#### 3.3.1 Weighted Voting Algorithm

```javascript
// Weights learned through cross-validation
const ensembleWeights = {
  transformerModel: 0.40,  // Best semantic understanding
  xgboostModel: 0.30,      // Best with structured data
  anomalyDetector: 0.10,   // Conservative weight
  llmAnalyzer: 0.20        // Tie-breaker and explanation
};

// Fusion function
function fuseScores(scores) {
  const weightedSum = Object.entries(ensembleWeights).reduce(
    (sum, [model, weight]) => sum + scores[model] * weight,
    0
  );

  // Apply calibration (Platt scaling)
  const calibratedScore = calibrateScore(weightedSum);

  // Confidence interval based on model agreement
  const agreement = calculateAgreement(scores);
  const confidence = Math.min(calibratedScore * agreement, 100);

  return {
    scamProbability: calibratedScore,
    confidence: confidence,
    modelConsensus: agreement
  };
}
```

#### 3.3.2 Confidence Calibration

**Purpose:** Ensure predicted probabilities match actual frequencies

**Method:** Isotonic regression on validation set
```
If model predicts 80% scam → Actual should be ~80% scam rate
```

---

### Layer 4: Post-Processing & Validation

#### 3.4.1 Rule Engine Validation

**Hard Rules (Override ML):**
```typescript
const hardRules = [
  {
    id: "REQUESTS_PAYMENT",
    condition: (job) =>
      /pay.*fee|investment.*required|training.*cost/i.test(job.content),
    action: "CLASSIFY_AS_SCAM",
    confidence: 95
  },
  {
    id: "REQUESTS_SSN_EARLY",
    condition: (job) =>
      /social.*security|SSN|tax.*id/i.test(job.content) &&
      !job.isLaterInProcess,
    action: "FLAG_HIGH_RISK",
    confidence: 90
  },
  {
    id: "KNOWN_SCAM_DOMAIN",
    condition: (job) =>
      scamDomainDatabase.includes(extractDomain(job.email)),
    action: "CLASSIFY_AS_SCAM",
    confidence: 100
  }
];
```

#### 3.4.2 Community Consensus

**Voting System:**
```typescript
interface CommunitySignal {
  userReports: number;           // Users who flagged as scam
  userValidations: number;       // Users who verified as legit
  expertReviews: number;         // Pro users who reviewed
  averageRating: number;         // 1-5 stars
  reportReasons: string[];       // Common themes
}

// Adjust confidence based on community
function adjustWithCommunity(mlScore, communitySignal) {
  if (communitySignal.userReports > 10 &&
      communitySignal.averageRating < 2) {
    // Strong community consensus → increase confidence
    return Math.min(mlScore + 15, 100);
  }
  return mlScore;
}
```

#### 3.4.3 Historical Similarity Check

**Approach:** Vector similarity search (Pinecone/Weaviate)

```typescript
// Check if similar jobs were scams
const similarJobs = await vectorDB.query({
  vector: jobEmbedding,
  topK: 50,
  filter: { analyzedDate: { $gte: Date.now() - 90days } }
});

const scamRate = similarJobs.filter(j => j.isScam).length / 50;
if (scamRate > 0.7) {
  // 70%+ of similar jobs were scams → high suspicion
  return { adjustConfidence: +20 };
}
```

---

## 4. Self-Learning & Continuous Improvement

### 4.1 Active Learning Pipeline

**Goal:** Intelligently select most valuable data for human labeling

```
┌─────────────────────────────────────────────────────┐
│           Daily Scan Volume: ~1000 jobs             │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Filter: High Uncertainty Cases                     │
│  • 40-60% scam probability                          │
│  • Low model agreement (<0.6)                       │
│  • Novel feature patterns                           │
│                                                      │
│  Output: ~50 jobs/day for review                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Human Labeling Queue (Pro Users + Experts)         │
│  • Display full job posting                         │
│  • Show model predictions & explanations            │
│  • Collect labels + feedback                        │
│                                                      │
│  Incentive: Free Pro for verified contributors      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Validation: Consensus Check                        │
│  • Require 3+ independent labels                    │
│  • Use majority vote                                │
│  • Track labeler quality (Inter-annotator agreement)│
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Add to Training Dataset                            │
│  • Store in Convex with quality score               │
│  • Trigger retraining when threshold met (500 new)  │
└─────────────────────────────────────────────────────┘
```

### 4.2 Continuous Retraining

**Schedule:**
- **Weekly:** Retrain XGBoost on new data (fast, low cost)
- **Monthly:** Fine-tune transformer (compute intensive)
- **Quarterly:** Full ensemble revalidation

**A/B Testing Framework:**
```typescript
interface ModelVersion {
  id: string;
  version: "v2.1.3";
  models: {
    transformer: "distilbert-finetuned-v3",
    xgboost: "xgb_20250115",
    // ...
  };
  deployedAt: Date;
  trafficPercentage: number;  // 10% shadow traffic initially
}

// Gradual rollout
const rolloutStrategy = {
  day1: { newModel: 10, oldModel: 90 },
  day7: { newModel: 50, oldModel: 50 },  // if metrics good
  day14: { newModel: 100, oldModel: 0 }  // full rollout
};
```

### 4.3 Feedback Loops

#### User Feedback
```typescript
interface UserFeedback {
  scanId: string;
  userAction: "applied" | "ignored" | "reported_scam" | "reported_error";
  correctLabel?: "scam" | "ghost" | "legitimate";
  confidence: number;  // 1-5 stars
  comments?: string;

  // Implicit signals
  timeSpentReading: number;  // seconds
  sharedToOthers: boolean;
  savedToDocuments: boolean;
}

// Weight by user reputation
const feedbackWeight = getUserReputationScore(userId);
```

#### Outcome Tracking
```typescript
// Long-term validation (if users report job outcomes)
interface JobOutcome {
  scanId: string;
  userApplied: boolean;
  gotInterview: boolean;
  gotOffer: boolean;
  wasScam: boolean;
  reportedDate: Date;
}

// Retrain with actual outcomes (gold standard data)
```

### 4.4 Model Performance Monitoring

**Real-time Metrics Dashboard:**
```typescript
const metrics = {
  // Accuracy metrics (on labeled subset)
  accuracy: 0.93,
  precision: 0.91,  // True positives / (TP + FP)
  recall: 0.94,     // True positives / (TP + FN)
  f1Score: 0.925,
  aucRoc: 0.96,

  // Operational metrics
  avgInferenceTime: 2.3,  // seconds
  apiCost: 0.012,         // $ per scan
  dailyVolume: 1247,

  // Quality metrics
  falsePositiveRate: 0.09,  // Legit jobs flagged as scam
  falseNegativeRate: 0.06,  // Scams missed
  userDisagreementRate: 0.11,  // Users report wrong label

  // Drift detection
  featureDistributionShift: 0.23,  // KL divergence from training
  predictionDistributionShift: 0.15
};

// Alert if metrics degrade
if (metrics.f1Score < 0.85) {
  sendAlert("Model performance below threshold!");
  triggerRetraining();
}
```

---

## 5. Feature Engineering (Detailed)

### 5.1 Text Preprocessing Pipeline

```typescript
class JobTextPreprocessor {
  async process(rawText: string): Promise<ProcessedText> {
    // 1. HTML cleaning
    const cleanedHtml = this.stripHtml(rawText);

    // 2. Text normalization
    const normalized = this.normalize(cleanedHtml);

    // 3. Tokenization
    const tokens = this.tokenize(normalized);

    // 4. Named Entity Recognition
    const entities = await this.extractEntities(normalized);

    // 5. Keyword extraction
    const keywords = this.extractKeywords(tokens);

    return {
      cleanText: normalized,
      tokens,
      entities,  // PERSON, ORG, MONEY, DATE, etc.
      keywords,
      sentences: this.sentencize(normalized)
    };
  }

  private extractEntities(text: string) {
    // Use spaCy via Python microservice or compromise.js
    return {
      companies: [...],
      locations: [...],
      salaries: [...],
      dates: [...],
      emails: [...],
      phones: [...],
      urls: [...]
    };
  }
}
```

### 5.2 Domain-Specific Features

**Financial Red Flags:**
```typescript
const financialFeatures = {
  mentionsPayment: boolean,
  requestsSSN: boolean,
  requestsBankInfo: boolean,
  hasTrainingFee: boolean,
  hasMembershipFee: boolean,
  unrealisticSalary: boolean,  // >$200k for entry level
  salaryRangeTooBroad: boolean,  // $30k-$150k
  guaranteesIncome: boolean,
  mlmKeywords: number  // "downline", "recruit", etc.
};
```

**Communication Red Flags:**
```typescript
const communicationFeatures = {
  usesGenericEmail: boolean,  // @gmail, @yahoo
  noCompanyDomain: boolean,
  requestsOffPlatformContact: boolean,
  hasWhatsApp: boolean,
  hasTelegram: boolean,
  urgencyScore: number,  // "apply now", "limited spots"
  pressureScore: number  // "must decide today"
};
```

**Job Description Quality:**
```typescript
const qualityFeatures = {
  grammarErrorRate: number,
  spellingErrorRate: number,
  readabilityScore: number,
  isVague: boolean,
  hasClearResponsibilities: boolean,
  hasClearQualifications: boolean,
  descriptionLength: number,
  descriptionCoherence: number,  // cosine similarity between sections
  allCapsPercentage: number,
  exclamationMarkCount: number
};
```

### 5.3 Company Verification Features

```typescript
async function verifyCompany(companyName: string, domain?: string) {
  // 1. LinkedIn verification
  const linkedInExists = await checkLinkedInCompany(companyName);
  const linkedInEmployeeCount = linkedInExists ?
    await getEmployeeCount(companyName) : 0;

  // 2. Glassdoor data
  const glassdoorData = await fetchGlassdoor(companyName);

  // 3. Domain age check
  const domainAge = domain ? await whoisLookup(domain) : null;

  // 4. SSL certificate
  const hasValidSSL = domain ? await checkSSL(domain) : false;

  // 5. Google presence
  const googleResults = await searchGoogle(`"${companyName}" company`);
  const hasOfficialSite = googleResults.some(r => r.domain === domain);

  return {
    linkedInExists,
    linkedInEmployeeCount,
    glassdoorRating: glassdoorData?.rating,
    glassdoorReviewCount: glassdoorData?.reviewCount,
    domainAge,
    hasValidSSL,
    hasOfficialSite,
    trustScore: calculateTrustScore(...)
  };
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Infrastructure for ML pipeline

**Tasks:**
1. Set up ML infrastructure
   - Create Python microservice for ML models
   - Set up model serving (FastAPI)
   - Configure GPU instances (AWS EC2 g5.xlarge or Modal)
   - Set up vector database (Pinecone free tier)

2. Data collection system
   - Create `trainingData` table in Convex
   - Build labeling interface for Pro users
   - Implement data export pipeline

3. Feature engineering pipeline
   - Build `FeatureExtractor` class
   - Integrate external APIs (WHOIS, VirusTotal, etc.)
   - Create feature storage schema

**Deliverables:**
- ✅ Python ML service running
- ✅ Data labeling UI live
- ✅ Feature extraction tested

---

### Phase 2: Model Development (Weeks 3-5)
**Goal:** Train initial ensemble models

**Tasks:**
1. Collect training data
   - Manually label 1000 jobs (seed dataset)
   - Scrape public scam databases
   - Generate synthetic examples (data augmentation)
   - Target: 5000 labeled examples minimum

2. Train individual models
   - Fine-tune DistilBERT (3-5 epochs)
   - Train XGBoost classifier
   - Calibrate Isolation Forest
   - Create GPT-4o prompt templates

3. Build ensemble fusion
   - Implement weighted voting
   - Train meta-classifier (logistic regression)
   - Add confidence calibration

**Deliverables:**
- ✅ 4 trained models with >80% accuracy each
- ✅ Ensemble system achieving 85%+ accuracy
- ✅ Model artifacts saved and versioned

---

### Phase 3: Integration (Weeks 6-7)
**Goal:** Replace current system with ML pipeline

**Tasks:**
1. Update Convex actions
   - Replace `ai.ts` with `mlPipeline.ts`
   - Add feature extraction step
   - Implement ensemble calling logic
   - Add caching layer (Redis)

2. API optimization
   - Batch inference for multiple jobs
   - Implement rate limiting
   - Add retry logic
   - Monitor latency (<3s target)

3. Update frontend
   - Show model confidence breakdown
   - Display feature importance
   - Add "Why?" explanation button
   - Show similar past scans

**Deliverables:**
- ✅ New ML backend deployed
- ✅ Frontend updated with rich results
- ✅ API latency <3 seconds

---

### Phase 4: Self-Learning System (Weeks 8-9)
**Goal:** Enable continuous improvement

**Tasks:**
1. Active learning pipeline
   - Build uncertainty sampling
   - Create review queue for edge cases
   - Implement consensus labeling (3 votes)

2. Retraining automation
   - Set up scheduled retraining jobs
   - Implement model versioning (Git LFS)
   - Build A/B testing framework
   - Create rollback mechanism

3. Feedback collection
   - Add "Was this helpful?" buttons
   - Collect user corrections
   - Track long-term outcomes
   - Implement reputation system

**Deliverables:**
- ✅ Active learning queue operational
- ✅ Weekly automated retraining
- ✅ Feedback loop collecting data

---

### Phase 5: Browser Extension Update (Week 10)
**Goal:** Upgrade Chrome extension with new algorithm

**Tasks:**
1. Extension architecture
   - Background service worker for ML inference
   - Local caching of results
   - API communication with backend

2. Feature parity
   - Same detection accuracy as web app
   - Real-time scanning on job boards
   - Overlay warnings on suspicious jobs
   - Export scan history

3. Performance optimization
   - Preload models on install
   - Debounce API calls
   - Offline mode with cached model

**Deliverables:**
- ✅ Chrome extension v2.0 published
- ✅ Extension achieves 90%+ accuracy
- ✅ User guide and demo video

---

### Phase 6: Validation & Optimization (Weeks 11-12)
**Goal:** Achieve and validate 90%+ accuracy

**Tasks:**
1. Rigorous testing
   - Collect 500-job test set (never seen before)
   - Manual expert labeling (ground truth)
   - Run full evaluation suite
   - Calculate all metrics

2. Error analysis
   - Identify failure modes
   - Analyze false positives
   - Analyze false negatives
   - Retrain on difficult cases

3. Performance tuning
   - Hyperparameter optimization (Optuna)
   - Feature selection (SHAP values)
   - Ensemble weight optimization
   - Latency optimization

4. Production hardening
   - Load testing (1000 concurrent scans)
   - Chaos engineering (API failures)
   - Security audit
   - Cost optimization

**Deliverables:**
- ✅ 90%+ accuracy validated on test set
- ✅ Production-ready system
- ✅ Documentation complete

---

## 7. Technical Stack

### 7.1 Core ML Stack

| **Component** | **Technology** | **Reasoning** |
|---------------|----------------|---------------|
| **Transformer Model** | DistilBERT | 40% smaller than BERT, 60% faster, 97% performance |
| **Tree Model** | XGBoost | Industry standard, fast, interpretable |
| **Anomaly Detection** | Isolation Forest | Unsupervised, handles outliers well |
| **LLM** | OpenAI GPT-4o | Best reasoning, explanation generation |
| **Embeddings** | all-MiniLM-L6-v2 | Fast, 384-dim, good quality |
| **Feature Store** | Convex tables | Native integration, real-time |
| **Vector DB** | Pinecone | Free tier, 1M vectors, fast similarity search |
| **Model Serving** | FastAPI + Modal | Serverless, auto-scaling, GPU support |
| **Orchestration** | Convex cron jobs | Native, reliable |
| **Monitoring** | Convex + Datadog | Metrics, logging, alerting |

### 7.2 ML Service Architecture

```typescript
// Python ML Service (FastAPI)
// Deployed on Modal.com (serverless GPU)

@app.function(
    gpu="T4",  // NVIDIA T4
    memory=8192,  // 8GB
    timeout=60
)
@web_endpoint(method="POST")
def predict_scam(job_posting: JobPosting):
    # Load models from cache
    transformer = load_model("distilbert-scam-v3")
    xgboost = load_model("xgb-scam-v2")
    isolation_forest = load_model("if-anomaly-v1")

    # Extract features
    features = extract_features(job_posting)

    # Run ensemble
    scores = {
        "transformer": transformer.predict_proba(features.text)[0],
        "xgboost": xgboost.predict_proba(features.tabular)[0],
        "anomaly": isolation_forest.score_samples(features.combined)[0],
        "llm": None  # Called separately due to latency
    }

    # Fuse scores
    final_score = ensemble_fusion(scores)

    return {
        "scam_probability": final_score.scam,
        "ghost_probability": final_score.ghost,
        "confidence": final_score.confidence,
        "model_scores": scores,
        "feature_importance": get_shap_values(features)
    }
```

### 7.3 Convex Integration

```typescript
// convex/mlPipeline.ts

export const scanJobWithML = action({
  args: {
    jobContent: v.string(),
    jobUrl: v.optional(v.string()),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    // 1. Extract features
    const features = await extractFeatures(args);

    // 2. Check cache
    const cacheKey = hashJobContent(args.jobContent);
    const cached = await ctx.runQuery(internal.cache.get, { key: cacheKey });
    if (cached && !isExpired(cached)) {
      return cached.result;
    }

    // 3. Call ML service (parallel)
    const [mlResult, llmResult] = await Promise.all([
      fetch(ML_SERVICE_URL, {
        method: "POST",
        body: JSON.stringify(features)
      }),
      ctx.runAction(internal.ai.analyzeJob, args)  // GPT-4o
    ]);

    // 4. Fuse results
    const finalResult = fuseResults(mlResult, llmResult);

    // 5. Cache result
    await ctx.runMutation(internal.cache.set, {
      key: cacheKey,
      result: finalResult,
      ttl: 7 * 24 * 60 * 60  // 7 days
    });

    // 6. Log for retraining
    await ctx.runMutation(internal.training.logScan, {
      features,
      prediction: finalResult,
      userId: args.userId
    });

    return finalResult;
  }
});
```

---

## 8. Success Metrics

### 8.1 Accuracy Targets

| **Metric** | **Target** | **Minimum Acceptable** |
|------------|------------|------------------------|
| **Overall Accuracy** | 92% | 90% |
| **Precision (Scam)** | 90% | 85% |
| **Recall (Scam)** | 94% | 90% |
| **F1 Score** | 92% | 88% |
| **AUC-ROC** | 0.95 | 0.90 |
| **False Positive Rate** | <8% | <10% |
| **False Negative Rate** | <6% | <10% |

### 8.2 Operational Targets

| **Metric** | **Target** | **Maximum Acceptable** |
|------------|------------|------------------------|
| **Inference Latency** | <2s | <3s |
| **API Uptime** | 99.9% | 99.5% |
| **Cost per Scan** | <$0.01 | <$0.02 |
| **Daily Scan Volume** | 10,000+ | - |
| **User Satisfaction** | 4.5/5 | 4.0/5 |

### 8.3 Learning Metrics

| **Metric** | **Target** |
|------------|------------|
| **Weekly New Labels** | 200+ |
| **Model Improvement Rate** | +2% accuracy/month |
| **Active Learner Precision** | 80%+ (selected cases are actually informative) |
| **User Feedback Rate** | 15%+ of scans |

---

## 9. Risk Mitigation

### 9.1 Technical Risks

| **Risk** | **Impact** | **Mitigation** |
|----------|------------|----------------|
| ML service downtime | High | Fallback to GPT-4o only mode |
| API rate limits | Medium | Caching, batch processing, multiple providers |
| Model drift | High | Weekly monitoring, automated retraining |
| Training data bias | Critical | Diverse labeling team, bias audits |
| Adversarial attacks | Medium | Ensemble robustness, anomaly detection |
| GPU costs escalate | Medium | Switch to CPU inference, model quantization |

### 9.2 Business Risks

| **Risk** | **Impact** | **Mitigation** |
|----------|------------|----------------|
| Can't reach 90% accuracy | Critical | Invest in more training data, hire ML consultant |
| Users don't provide feedback | High | Gamification, incentives (free Pro) |
| Scammers adapt to detection | High | Continuous learning, monitor new patterns |
| Legal liability (wrong flag) | Medium | Clear disclaimers, confidence thresholds |
| Competitor with better model | Medium | Open-source parts, community advantage |

### 9.3 Contingency Plans

**If accuracy plateaus at 85%:**
1. Hire expert ML consultant for 2-week engagement
2. Collect 10,000 more labeled examples (crowdsource)
3. Explore more advanced models (GPT-4 fine-tuning, Claude)
4. Add more external data sources (court records, FTC database)

**If ML service is too expensive:**
1. Model quantization (INT8)
2. Switch to smaller model (MobileBERT)
3. Reduce ensemble to 2 models
4. Use GPT-4o-mini instead of GPT-4o

---

## 10. Cost Analysis

### 10.1 Development Costs

| **Item** | **Cost** | **Duration** |
|----------|----------|--------------|
| ML Engineer (contract) | $15,000 | 12 weeks |
| GPU compute (Modal) | $500 | 12 weeks |
| Data labeling (crowdsource) | $2,000 | Initial dataset |
| External APIs (WHOIS, etc.) | $200/mo | Ongoing |
| Vector DB (Pinecone) | Free → $70/mo | Production |
| **Total Development** | **~$20,000** | **One-time** |

### 10.2 Operational Costs (Monthly)

| **Item** | **Cost/Month** | **Assumptions** |
|----------|----------------|-----------------|
| ML inference (Modal) | $300 | 10k scans/day, 2s/scan |
| OpenAI API (GPT-4o) | $500 | $0.015/scan, 30k scans |
| Vector DB (Pinecone) | $70 | Standard plan |
| External APIs | $200 | WHOIS, VirusTotal, etc. |
| Monitoring (Datadog) | $100 | Standard plan |
| **Total Monthly** | **~$1,170** | **$0.04/scan** |

### 10.3 ROI Analysis

**Assumptions:**
- Pro subscription: $3.99/month
- Conversion rate improvement: 5% → 12% (due to better accuracy)
- Current users: 1,000
- Growth: +20%/month

**Impact:**
- **Before:** 1,000 × 5% × $3.99 = $200/mo revenue
- **After:** 1,000 × 12% × $3.99 = $479/mo revenue (+$279/mo)
- **Net benefit:** $279 - $1,170 = **-$891/mo** (initially)
- **Break-even:** ~4,200 users

**Long-term value:**
- Market differentiation (only app with 90%+ accuracy)
- User trust → word of mouth growth
- Data moat (more scans → better model → more users)

---

## 11. Next Steps

### Immediate Actions (This Week)

1. **User approval:** Review and approve this plan
2. **Set up infrastructure:**
   - Create Modal account (free tier)
   - Set up Pinecone (free tier)
   - Configure Convex tables for training data
3. **Begin data collection:**
   - Build labeling interface
   - Manually label first 100 jobs
   - Set up community review program

### Week 1 Deliverables

- [ ] Python ML service skeleton deployed
- [ ] Feature extraction pipeline functional
- [ ] 500 labeled training examples collected
- [ ] DistilBERT fine-tuning started

### Success Criteria (End of Phase 6)

✅ **90%+ accuracy on held-out test set**
✅ **<3 second inference latency**
✅ **Active learning pipeline collecting 100+ labels/week**
✅ **Chrome extension updated with ML pipeline**
✅ **User satisfaction score >4.3/5**
✅ **Production deployment with monitoring**

---

## Conclusion

This plan transforms JobFiltr from a simple prompt-based tool into a **world-class ML-powered fraud detection system**. By combining:

- 🧠 **State-of-the-art NLP** (DistilBERT fine-tuning)
- 📊 **Advanced feature engineering** (60+ features)
- 🔄 **Ensemble learning** (4 complementary models)
- 🎯 **Continuous improvement** (active learning, retraining)
- 👥 **Community wisdom** (user feedback loops)

We will achieve **90%+ accuracy** in detecting both scam jobs and ghost jobs, positioning JobFiltr as the most accurate and trusted job safety tool on the market.

**Estimated Timeline:** 12 weeks
**Estimated Cost:** $20k development + $1.2k/month operational
**Expected Outcome:** Market-leading 90%+ accuracy

---

**Ready to proceed?** Let's build the future of job scam detection. 🚀
