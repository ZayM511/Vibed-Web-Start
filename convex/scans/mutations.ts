import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const saveScanResultMutation = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const scanId = await ctx.db.insert("scans", {
      userId: args.userId,
      jobInput: args.jobInput,
      context: args.context,
      scanMode: args.scanMode || "quick",
      report: args.report,
      timestamp: args.timestamp,
    });
    return scanId;
  },
});

export const deleteScanResultMutation = mutation({
  args: {
    scanId: v.id("scans"),
  },
  handler: async (ctx, { scanId }) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const scan = await ctx.db.get(scanId);
    if (!scan || scan.userId !== userId) {
      throw new Error("Scan not found or unauthorized.");
    }

    await ctx.db.delete(scanId);
    return { success: true };
  },
});

export const updateScanResultMutation = mutation({
  args: {
    scanId: v.id("scans"),
    updates: v.object({
      context: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { scanId, updates }) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const scan = await ctx.db.get(scanId);
    if (!scan || scan.userId !== userId) {
      throw new Error("Scan not found or unauthorized.");
    }

    await ctx.db.patch(scanId, updates);
    return { success: true };
  },
});
