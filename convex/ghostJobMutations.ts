import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Internal query to get job scan (for use in actions)
 */
export const getJobScanInternal = internalQuery({
  args: {
    jobScanId: v.id("jobScans"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobScanId);
  },
});

/**
 * Internal mutation to update job scan report after AI analysis
 */
export const updateJobScanReport = internalMutation({
  args: {
    jobScanId: v.id("jobScans"),
    report: v.object({
      jobTitle: v.string(),
      company: v.string(),
      location: v.optional(v.string()),
      summary: v.string(),
      keyQualifications: v.array(v.string()),
      responsibilities: v.array(v.string()),
      redFlags: v.array(
        v.object({
          type: v.string(),
          description: v.string(),
          severity: v.union(
            v.literal("low"),
            v.literal("medium"),
            v.literal("high")
          ),
        })
      ),
      confidenceScore: v.number(),
      isScam: v.boolean(),
      isGhostJob: v.boolean(),
      isSpam: v.optional(v.boolean()),
      spamReasoning: v.optional(v.string()),
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
    await ctx.db.patch(args.jobScanId, {
      report: args.report,
    });
  },
});
