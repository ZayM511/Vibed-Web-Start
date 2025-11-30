import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Mutation to save a job scan to the database
export const saveJobScan = mutation({
  args: {
    userId: v.string(),
    jobInput: v.string(),
    jobUrl: v.optional(v.string()),
    context: v.optional(v.string()),
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
      aiAnalysis: v.string(),
      webResearch: v.optional(
        v.object({
          companyWebsiteFound: v.boolean(),
          careersPageFound: v.boolean(),
          duplicatePostingsCount: v.number(),
          reputationSources: v.array(v.string()),
          verifiedOnOfficialSite: v.boolean(),
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    const scanId = await ctx.db.insert("jobScans", {
      userId: args.userId,
      jobInput: args.jobInput,
      jobUrl: args.jobUrl,
      context: args.context,
      report: args.report,
      timestamp: Date.now(),
    });

    return scanId;
  },
});

// Query to get scan history for a user
export const getScanHistory = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const scans = await ctx.db
      .query("jobScans")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return scans;
  },
});

// Query to get a specific job scan with community reviews
export const getJobScanDetails = query({
  args: {
    jobScanId: v.id("jobScans"),
  },
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.jobScanId);
    if (!scan) {
      throw new Error("Job scan not found");
    }

    const reviews = await ctx.db
      .query("communityReviews")
      .withIndex("by_job_scan", (q) => q.eq("jobScanId", args.jobScanId))
      .collect();

    return {
      scan,
      reviews,
    };
  },
});

// Query to check if a job URL has been scanned before
export const findScanByUrl = query({
  args: {
    jobUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const scans = await ctx.db
      .query("jobScans")
      .filter((q) => q.eq(q.field("jobUrl"), args.jobUrl))
      .order("desc")
      .take(1);

    return scans.length > 0 ? scans[0] : null;
  },
});
