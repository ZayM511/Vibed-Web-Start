import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  todos: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("completed")),
    userId: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Ghost Job Detector tables
  jobScans: defineTable({
    userId: v.string(),
    jobInput: v.string(),
    jobUrl: v.optional(v.string()),
    context: v.optional(v.string()),
    scanMode: v.optional(v.union(v.literal("quick"), v.literal("deep"))),
    report: v.object({
      jobTitle: v.string(),
      company: v.string(),
      location: v.optional(v.string()),
      summary: v.string(),
      keyQualifications: v.array(v.string()),
      responsibilities: v.array(v.string()),
      redFlags: v.array(v.object({
        type: v.string(),
        description: v.string(),
        severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      })),
      confidenceScore: v.number(),
      isScam: v.boolean(),
      isGhostJob: v.boolean(),
      isSpam: v.optional(v.boolean()),
      spamReasoning: v.optional(v.string()),
      aiAnalysis: v.string(),
      // Web research results
      webResearch: v.optional(v.object({
        companyWebsiteFound: v.boolean(),
        careersPageFound: v.boolean(),
        duplicatePostingsCount: v.number(),
        reputationSources: v.array(v.string()),
        verifiedOnOfficialSite: v.boolean(),
      })),
    }),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_timestamp", ["userId", "timestamp"]),

  communityReviews: defineTable({
    jobScanId: v.union(v.id("jobScans"), v.id("scans")), // Accept IDs from both scan tables
    userId: v.string(),
    didApply: v.boolean(),
    gotGhosted: v.boolean(),
    wasJobReal: v.boolean(),
    hasApplied: v.optional(v.boolean()),
    gotResponse: v.optional(v.boolean()),
    yearsOfExperience: v.optional(v.number()),
    comment: v.optional(v.string()),
    submissionDate: v.number(),
  })
    .index("by_job_scan", ["jobScanId"])
    .index("by_user", ["userId"]),

  // Manual Scan feature table
  scans: defineTable({
    userId: v.string(),
    jobInput: v.string(),
    context: v.optional(v.string()),
    scanMode: v.optional(v.union(v.literal("quick"), v.literal("deep"))),
    report: v.object({
      jobTitle: v.string(),
      company: v.string(),
      location: v.optional(v.string()),
      summary: v.string(),
      keyQualifications: v.array(v.string()),
      responsibilities: v.array(v.string()),
      confidenceScore: v.number(),
      isScam: v.optional(v.boolean()),
      isGhostJob: v.optional(v.boolean()),
      isSpam: v.optional(v.boolean()),
      spamReasoning: v.optional(v.string()),
      redFlags: v.optional(v.array(v.object({
        type: v.string(),
        description: v.string(),
        severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      }))),
      aiAnalysis: v.string(),
    }),
    timestamp: v.number(),
  }).index("by_userId_timestamp", ["userId", "timestamp"]),

  // Feedback and Contact table
  feedback: defineTable({
    type: v.union(
      v.literal("feedback"),
      v.literal("improvement"),
      v.literal("report"),
      v.literal("bug"),
      v.literal("other")
    ),
    message: v.string(),
    email: v.optional(v.string()),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    // Report categories (only used when type is "report")
    reportCategories: v.optional(v.object({
      scamJob: v.boolean(),
      spamJob: v.boolean(),
      ghostJob: v.boolean(),
    })),
    status: v.union(
      v.literal("new"),
      v.literal("reviewing"),
      v.literal("resolved"),
      v.literal("archived")
    ),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
    adminNotes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"]),

  // User Subscriptions (Stripe Integration)
  subscriptions: defineTable({
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    plan: v.union(
      v.literal("free"),
      v.literal("pro")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("unpaid")
    ),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_status", ["status"]),

  // Payment Methods
  paymentMethods: defineTable({
    userId: v.string(),
    stripePaymentMethodId: v.string(),
    type: v.string(), // "card", "bank_account", etc.
    last4: v.string(),
    brand: v.string(), // "visa", "mastercard", etc.
    expiryMonth: v.number(),
    expiryYear: v.number(),
    isDefault: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_payment_method", ["stripePaymentMethodId"]),

  // Payment History
  payments: defineTable({
    userId: v.string(),
    stripePaymentIntentId: v.string(),
    stripeInvoiceId: v.optional(v.string()),
    amount: v.number(), // in cents
    currency: v.string(),
    status: v.union(
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("pending"),
      v.literal("canceled")
    ),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_payment_intent", ["stripePaymentIntentId"])
    .index("by_created", ["createdAt"]),

  // User Documents
  documents: defineTable({
    userId: v.string(),
    fileName: v.string(),
    fileType: v.union(
      v.literal("resume"),
      v.literal("cover_letter"),
      v.literal("portfolio")
    ),
    fileFormat: v.string(),
    fileSize: v.number(),
    storageId: v.string(),
    uploadedAt: v.number(),
    order: v.number(),
    notes: v.optional(v.string()),
    version: v.optional(v.string()),
    metadata: v.optional(v.object({
      jobTitle: v.optional(v.string()),
      company: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "fileType"])
    .index("by_user_type_order", ["userId", "fileType", "order"])
    .index("by_uploaded", ["userId", "uploadedAt"]),

  // ML Training Data
  trainingData: defineTable({
    userId: v.string(),
    jobTitle: v.string(),
    company: v.string(),
    jobContent: v.string(),
    jobUrl: v.optional(v.string()),

    // Extracted features (for ML)
    features: v.optional(v.any()),

    // Model predictions
    predictedScam: v.optional(v.boolean()),
    predictedGhost: v.optional(v.boolean()),
    predictedSpam: v.optional(v.boolean()),
    predictedConfidence: v.optional(v.number()),
    modelScores: v.optional(v.any()), // Scores from each model in ensemble

    // Ground truth labels
    isLabeled: v.boolean(),
    trueScam: v.optional(v.boolean()),
    trueGhostJob: v.optional(v.boolean()),
    trueSpam: v.optional(v.boolean()),
    labelConfidence: v.optional(v.number()), // Labeler confidence 1-5
    labelRedFlags: v.optional(v.array(v.string())),
    labelNotes: v.optional(v.string()),

    // Labeling metadata
    labeledBy: v.optional(v.string()),
    labeledAt: v.optional(v.number()),

    // Consensus labeling (from multiple labelers)
    consensusVotes: v.optional(v.number()),
    consensusAgreement: v.optional(v.number()), // 0-1 inter-annotator agreement

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_labeled_status", ["isLabeled"])
    .index("by_created", ["createdAt"])
    .index("by_confidence", ["predictedConfidence"]),

  // Labeler Contributions (for reputation system)
  labelerContributions: defineTable({
    userId: v.string(),
    trainingDataId: v.id("trainingData"),
    isScam: v.boolean(),
    isGhostJob: v.boolean(),
    confidence: v.number(),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_training_data", ["trainingDataId"]),

  // Model Performance Metrics (for monitoring)
  modelMetrics: defineTable({
    modelVersion: v.string(),
    metricType: v.union(
      v.literal("accuracy"),
      v.literal("precision"),
      v.literal("recall"),
      v.literal("f1"),
      v.literal("auc_roc")
    ),
    value: v.number(),
    sampleSize: v.number(),
    timestamp: v.number(),
  })
    .index("by_version", ["modelVersion"])
    .index("by_type", ["metricType"])
    .index("by_timestamp", ["timestamp"]),

  // Feature Cache (to avoid recomputing features)
  featureCache: defineTable({
    jobContentHash: v.string(), // SHA-256 hash of job content
    features: v.any(), // Computed features
    computedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_hash", ["jobContentHash"])
    .index("by_expires", ["expiresAt"]),

  // User Profiles (extended user data beyond Clerk)
  users: defineTable({
    clerkUserId: v.string(), // Clerk user ID (tokenIdentifier)
    location: v.optional(v.string()), // User's location
    hideLocationFromReviews: v.boolean(), // Toggle to hide location from public reviews
    profileCompletedAt: v.optional(v.number()), // Timestamp when profile was completed
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user", ["clerkUserId"]),

  // Chrome Extension User Settings
  userSettings: defineTable({
    userId: v.string(), // Clerk user ID
    filterSettings: v.any(), // Chrome extension filter preferences
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  // Waitlist Signups
  waitlist: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    location: v.optional(v.string()), // Location field (optional for backwards compatibility)
    source: v.optional(v.string()), // Where they signed up from (utm_source or default)
    utmMedium: v.optional(v.string()), // UTM medium: "post", "ad", "bio_link", etc.
    utmCampaign: v.optional(v.string()), // UTM campaign: "launch_feb2026", etc.
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("invited"),
      v.literal("converted")
    ),
    emailConfirmed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // Extension Users (separate from Clerk-managed website users)
  extensionUsers: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    name: v.optional(v.string()),
    token: v.optional(v.string()),
    tokenExpiry: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_token", ["token"]),

  // Chrome Extension Error Logs
  extensionErrors: defineTable({
    // Error details
    message: v.string(),
    stack: v.optional(v.string()),
    errorType: v.string(), // "Error", "TypeError", "ReferenceError", etc.

    // Context
    platform: v.union(v.literal("linkedin"), v.literal("indeed"), v.literal("google")),
    url: v.string(),
    userAgent: v.optional(v.string()),

    // User context (if available)
    userId: v.optional(v.string()),

    // Job context (what the user was viewing)
    jobContext: v.optional(v.object({
      jobTitle: v.optional(v.string()),
      company: v.optional(v.string()),
      jobId: v.optional(v.string()),
    })),

    // DOM state snapshot
    domSnapshot: v.optional(v.object({
      activeElement: v.optional(v.string()),
      relevantHTML: v.optional(v.string()),
      detailPanelHTML: v.optional(v.string()),
    })),

    // Console logs leading to error
    consoleLogs: v.optional(v.array(v.object({
      level: v.string(), // "log", "warn", "error", "info"
      message: v.string(),
      timestamp: v.number(),
    }))),

    // Extension version
    extensionVersion: v.string(),

    // Metadata
    timestamp: v.number(),
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_platform", ["platform", "timestamp"])
    .index("by_resolved", ["resolved", "timestamp"])
    .index("by_user", ["userId", "timestamp"]),

  // Page View Tracking
  pageViews: defineTable({
    visitorId: v.string(),
    path: v.string(),
    referrer: v.optional(v.string()),
    userId: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_visitor", ["visitorId", "timestamp"]),

  // Aggregated Daily Page View Stats
  dailyPageViewStats: defineTable({
    date: v.string(),
    totalViews: v.number(),
    uniqueVisitors: v.number(),
  })
    .index("by_date", ["date"]),

  // Founder Settings (tier override for testing)
  founderSettings: defineTable({
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    tierOverride: v.union(v.literal("free"), v.literal("pro")),
    updatedAt: v.number(),
  })
    .index("by_clerk_user", ["clerkUserId"])
    .index("by_email", ["email"]),
});
