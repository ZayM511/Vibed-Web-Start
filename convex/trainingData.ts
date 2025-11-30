import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Query to get all training data
export const getTrainingData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // DEBUG: Temporarily remove auth check to see if data exists
    console.log("getTrainingData - authenticated:", !!identity);
    console.log("getTrainingData - userId:", identity?.tokenIdentifier);

    const allData = await ctx.db
      .query("trainingData")
      .order("desc")
      .collect();

    // Filter out already labeled jobs
    const unlabeledData = allData.filter(item => !item.isLabeled);

    console.log("getTrainingData - total count:", allData.length);
    console.log("getTrainingData - unlabeled count:", unlabeledData.length);
    console.log("getTrainingData - labeled count:", allData.length - unlabeledData.length);
    console.log("getTrainingData - first 3 unlabeled:", unlabeledData.slice(0, 3).map(item => ({
      id: item._id,
      jobTitle: item.jobTitle,
      userId: item.userId,
      isLabeled: item.isLabeled,
    })));

    // Return only unlabeled data
    return unlabeledData;
  },
});

// Query to get unlabeled scans for active learning
export const getUnlabeledScans = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = args.limit || 50;

    return await ctx.db
      .query("trainingData")
      .withIndex("by_labeled_status", (q) => q.eq("isLabeled", false))
      .order("desc")
      .take(limit);
  },
});

// Query to get high uncertainty cases for active learning
export const getHighUncertaintyCases = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = args.limit || 50;

    // Get unlabeled scans with confidence between 40-60% (high uncertainty)
    const allUnlabeled = await ctx.db
      .query("trainingData")
      .withIndex("by_labeled_status", (q) => q.eq("isLabeled", false))
      .collect();

    const highUncertainty = allUnlabeled.filter(
      (item) =>
        item.predictedConfidence !== undefined &&
        item.predictedConfidence >= 40 &&
        item.predictedConfidence <= 60
    );

    return highUncertainty
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);
  },
});

// Mutation to add training example from scan
export const addTrainingExample = mutation({
  args: {
    jobTitle: v.string(),
    company: v.string(),
    jobContent: v.string(),
    jobUrl: v.optional(v.string()),
    features: v.optional(v.any()), // Extracted features
    predictedScam: v.optional(v.boolean()),
    predictedGhost: v.optional(v.boolean()),
    predictedSpam: v.optional(v.boolean()),
    predictedConfidence: v.optional(v.number()),
    modelScores: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("trainingData", {
      userId: identity.tokenIdentifier,
      jobTitle: args.jobTitle,
      company: args.company,
      jobContent: args.jobContent,
      jobUrl: args.jobUrl,
      features: args.features,
      predictedScam: args.predictedScam,
      predictedGhost: args.predictedGhost,
      predictedSpam: args.predictedSpam,
      predictedConfidence: args.predictedConfidence,
      modelScores: args.modelScores,
      isLabeled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Internal mutation for adding training examples from actions (no auth check)
export const addTrainingExampleInternal = internalMutation({
  args: {
    userId: v.string(),
    jobTitle: v.string(),
    company: v.string(),
    jobContent: v.string(),
    jobUrl: v.optional(v.string()),
    features: v.optional(v.any()),
    predictedScam: v.optional(v.boolean()),
    predictedGhost: v.optional(v.boolean()),
    predictedSpam: v.optional(v.boolean()),
    predictedConfidence: v.optional(v.number()),
    modelScores: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("trainingData", {
      userId: args.userId,
      jobTitle: args.jobTitle,
      company: args.company,
      jobContent: args.jobContent,
      jobUrl: args.jobUrl,
      features: args.features,
      predictedScam: args.predictedScam,
      predictedGhost: args.predictedGhost,
      predictedSpam: args.predictedSpam,
      predictedConfidence: args.predictedConfidence,
      modelScores: args.modelScores,
      isLabeled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Mutation to add label from user
export const addLabel = mutation({
  args: {
    trainingDataId: v.id("trainingData"),
    isScam: v.boolean(),
    isGhostJob: v.boolean(),
    confidence: v.number(), // User's confidence 1-5
    redFlags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // TEMPORARY: Allow unauthenticated labeling for debugging
    const userId = identity?.tokenIdentifier || "debug_labeler";

    console.log("addLabel - authenticated:", !!identity);
    console.log("addLabel - userId:", userId);

    const trainingData = await ctx.db.get(args.trainingDataId);
    if (!trainingData) throw new Error("Training data not found");

    // Update the training data with the label
    await ctx.db.patch(args.trainingDataId, {
      isLabeled: true,
      labeledBy: userId,
      labeledAt: Date.now(),
      trueScam: args.isScam,
      trueGhostJob: args.isGhostJob,
      labelConfidence: args.confidence,
      labelRedFlags: args.redFlags,
      labelNotes: args.notes,
      updatedAt: Date.now(),
    });

    // Record labeler contribution (for reputation system)
    await ctx.db.insert("labelerContributions", {
      userId: userId,
      trainingDataId: args.trainingDataId,
      isScam: args.isScam,
      isGhostJob: args.isGhostJob,
      confidence: args.confidence,
      timestamp: Date.now(),
    });

    console.log("addLabel - successfully labeled:", args.trainingDataId);

    return args.trainingDataId;
  },
});

// Mutation to add consensus label (from multiple labelers)
export const addConsensusLabel = mutation({
  args: {
    trainingDataId: v.id("trainingData"),
    labels: v.array(
      v.object({
        userId: v.string(),
        isScam: v.boolean(),
        isGhostJob: v.boolean(),
        confidence: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Calculate consensus (majority vote)
    const scamVotes = args.labels.filter((l) => l.isScam).length;
    const ghostVotes = args.labels.filter((l) => l.isGhostJob).length;
    const totalVotes = args.labels.length;

    const consensusScam = scamVotes > totalVotes / 2;
    const consensusGhost = ghostVotes > totalVotes / 2;

    // Calculate inter-annotator agreement (simple percentage)
    const agreement =
      Math.max(scamVotes, totalVotes - scamVotes) / totalVotes;

    await ctx.db.patch(args.trainingDataId, {
      isLabeled: true,
      trueScam: consensusScam,
      trueGhostJob: consensusGhost,
      consensusVotes: totalVotes,
      consensusAgreement: agreement,
      updatedAt: Date.now(),
    });

    return args.trainingDataId;
  },
});

// Query to get labeler stats (for reputation system)
export const getLabelerStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const contributions = await ctx.db
      .query("labelerContributions")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .collect();

    const totalLabels = contributions.length;
    const avgConfidence =
      contributions.reduce((sum, c) => sum + c.confidence, 0) / totalLabels || 0;

    // TODO: Calculate accuracy (requires comparing with consensus labels)

    return {
      totalLabels,
      avgConfidence,
      lastLabelDate: contributions[0]?.timestamp,
    };
  },
});

// Query to export training data for ML model
export const exportTrainingDataset = query({
  args: {
    onlyLabeled: v.optional(v.boolean()),
    format: v.optional(v.union(v.literal("json"), v.literal("csv"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Only allow admins to export (TODO: add admin check)

    const query = ctx.db.query("trainingData");
    const data = args.onlyLabeled
      ? await query
          .withIndex("by_labeled_status", (q) => q.eq("isLabeled", true))
          .collect()
      : await query.collect();

    // Return as JSON (CSV conversion can be done client-side)
    return data.map((item) => ({
      id: item._id,
      jobTitle: item.jobTitle,
      company: item.company,
      jobContent: item.jobContent,
      jobUrl: item.jobUrl,
      features: item.features,
      predictedScam: item.predictedScam,
      predictedGhost: item.predictedGhost,
      predictedConfidence: item.predictedConfidence,
      trueScam: item.trueScam,
      trueGhostJob: item.trueGhostJob,
      labelConfidence: item.labelConfidence,
      isLabeled: item.isLabeled,
      createdAt: item.createdAt,
    }));
  },
});

// Debug query to check training data
export const debugTrainingData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { error: "Not authenticated", count: 0, data: [] };

    const allData = await ctx.db.query("trainingData").collect();
    const unlabeled = allData.filter((item) => !item.isLabeled);

    return {
      authenticated: true,
      userId: identity.tokenIdentifier,
      totalCount: allData.length,
      unlabeledCount: unlabeled.length,
      recentItems: allData.slice(0, 3).map((item) => ({
        id: item._id,
        jobTitle: item.jobTitle,
        company: item.company,
        isLabeled: item.isLabeled,
        userId: item.userId,
        confidence: item.predictedConfidence,
      })),
    };
  },
});

// Debug mutation to insert a test job directly (bypass ML pipeline)
export const insertTestJob = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // For debugging: Use test userId if not authenticated
    const userId = identity?.tokenIdentifier || "debug_user_test";

    console.log("insertTestJob - authenticated:", !!identity);
    console.log("insertTestJob - userId:", userId);

    const id = await ctx.db.insert("trainingData", {
      userId,
      jobTitle: "Test Job - Software Engineer",
      company: "Test Company Inc",
      jobContent: "This is a test job posting for debugging purposes.",
      jobUrl: "https://example.com/test",
      features: {},
      predictedScam: false,
      predictedGhost: false,
      predictedConfidence: 50,
      modelScores: {},
      isLabeled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("insertTestJob - inserted with ID:", id);

    return { success: true, id, userId };
  },
});
