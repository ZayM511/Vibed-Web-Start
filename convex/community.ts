import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Submit a community review for a job scan
export const submitReview = mutation({
  args: {
    jobScanId: v.union(v.id("jobScans"), v.id("scans")), // Accept IDs from both scan tables
    userId: v.string(),
    didApply: v.boolean(),
    gotGhosted: v.boolean(),
    wasJobReal: v.boolean(),
    hasApplied: v.optional(v.boolean()),
    gotResponse: v.optional(v.boolean()),
    yearsOfExperience: v.optional(v.number()),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if job scan exists
    const jobScan = await ctx.db.get(args.jobScanId);
    if (!jobScan) {
      throw new Error("Job scan not found");
    }

    // Create the review
    const reviewId = await ctx.db.insert("communityReviews", {
      jobScanId: args.jobScanId,
      userId: args.userId,
      didApply: args.didApply,
      gotGhosted: args.gotGhosted,
      wasJobReal: args.wasJobReal,
      hasApplied: args.hasApplied,
      gotResponse: args.gotResponse,
      yearsOfExperience: args.yearsOfExperience,
      comment: args.comment,
      submissionDate: Date.now(),
    });

    return reviewId;
  },
});

// Get all reviews for a specific job scan
export const getReviewsForJob = query({
  args: {
    jobScanId: v.union(v.id("jobScans"), v.id("scans")), // Accept IDs from both scan tables
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("communityReviews")
      .withIndex("by_job_scan", (q) => q.eq("jobScanId", args.jobScanId))
      .collect();

    return reviews;
  },
});

// Get reviews submitted by a specific user
export const getUserReviews = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("communityReviews")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return reviews;
  },
});

// Get aggregated stats for a job scan based on community reviews
export const getJobStats = query({
  args: {
    jobScanId: v.union(v.id("jobScans"), v.id("scans")), // Accept IDs from both scan tables
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("communityReviews")
      .withIndex("by_job_scan", (q) => q.eq("jobScanId", args.jobScanId))
      .collect();

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        appliedCount: 0,
        ghostedCount: 0,
        realJobCount: 0,
        ghostedPercentage: 0,
        realJobPercentage: 0,
      };
    }

    const appliedCount = reviews.filter(r => r.didApply).length;
    const ghostedCount = reviews.filter(r => r.gotGhosted).length;
    const realJobCount = reviews.filter(r => r.wasJobReal).length;

    return {
      totalReviews: reviews.length,
      appliedCount,
      ghostedCount,
      realJobCount,
      ghostedPercentage: appliedCount > 0 ? (ghostedCount / appliedCount) * 100 : 0,
      realJobPercentage: (realJobCount / reviews.length) * 100,
    };
  },
});
