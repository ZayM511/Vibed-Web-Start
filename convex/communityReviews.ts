import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Submit a community review for a job scan
 */
export const submitReview = mutation({
  args: {
    jobScanId: v.union(v.id("jobScans"), v.id("scans")), // Accept IDs from both scan tables
    didApply: v.boolean(),
    gotGhosted: v.boolean(),
    wasJobReal: v.boolean(),
    hasApplied: v.optional(v.boolean()),
    gotResponse: v.optional(v.boolean()),
    yearsOfExperience: v.optional(v.number()),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: You must be logged in to submit a review");
    }

    // Check if job scan exists
    const jobScan = await ctx.db.get(args.jobScanId);
    if (!jobScan) {
      throw new Error("Job scan not found");
    }

    // Check if user has already reviewed this job scan
    const existingReview = await ctx.db
      .query("communityReviews")
      .withIndex("by_job_scan", (q) => q.eq("jobScanId", args.jobScanId))
      .filter((q) => q.eq(q.field("userId"), identity.tokenIdentifier))
      .first();

    if (existingReview) {
      throw new Error("You have already reviewed this job posting");
    }

    // Create the review
    const reviewId = await ctx.db.insert("communityReviews", {
      jobScanId: args.jobScanId,
      userId: identity.tokenIdentifier,
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

/**
 * Get all reviews for a specific job scan with user profile information
 */
export const getReviewsForJob = query({
  args: {
    jobScanId: v.union(v.id("jobScans"), v.id("scans")), // Accept IDs from both scan tables
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("communityReviews")
      .withIndex("by_job_scan", (q) => q.eq("jobScanId", args.jobScanId))
      .order("desc")
      .collect();

    // Fetch user profile information for each review
    const reviewsWithUserInfo = await Promise.all(
      reviews.map(async (review) => {
        const userProfile = await ctx.db
          .query("users")
          .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", review.userId))
          .first();

        return {
          ...review,
          userLocation: userProfile?.location,
          hideLocationFromReviews: userProfile?.hideLocationFromReviews ?? true,
        };
      })
    );

    return reviewsWithUserInfo;
  },
});

/**
 * Get aggregated statistics for a job scan's reviews
 */
export const getReviewStats = query({
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

    const appliedCount = reviews.filter((r) => r.didApply).length;
    const ghostedCount = reviews.filter((r) => r.gotGhosted).length;
    const realJobCount = reviews.filter((r) => r.wasJobReal).length;

    return {
      totalReviews: reviews.length,
      appliedCount,
      ghostedCount,
      realJobCount,
      ghostedPercentage: (ghostedCount / reviews.length) * 100,
      realJobPercentage: (realJobCount / reviews.length) * 100,
    };
  },
});

/**
 * Get reviews submitted by the authenticated user
 */
export const getUserReviews = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: You must be logged in to view your reviews");
    }

    const limit = args.limit || 20;

    const reviews = await ctx.db
      .query("communityReviews")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .order("desc")
      .take(limit);

    return reviews;
  },
});

/**
 * Delete a review (only the author can delete)
 */
export const deleteReview = mutation({
  args: {
    reviewId: v.id("communityReviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: You must be logged in to delete a review");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Ensure user can only delete their own reviews
    if (review.userId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized: You can only delete your own reviews");
    }

    await ctx.db.delete(args.reviewId);

    return { success: true };
  },
});

/**
 * Get all reviews from all users, organized by company and position
 * For the database page
 */
export const getAllReviewsOrganized = query({
  args: {},
  handler: async (ctx) => {
    // Get all community reviews
    const reviews = await ctx.db
      .query("communityReviews")
      .order("desc")
      .collect();

    // Get corresponding job scans for each review to extract company and position info
    const reviewsWithJobData = await Promise.all(
      reviews.map(async (review) => {
        const jobScan = await ctx.db.get(review.jobScanId);
        // Extract jobUrl safely - only jobScans table has this field
        const jobUrl = jobScan && "jobUrl" in jobScan ? (jobScan as any).jobUrl : undefined;
        return {
          ...review,
          jobTitle: jobScan?.report?.jobTitle || "Unknown Position",
          company: jobScan?.report?.company || "Unknown Company",
          location: jobScan?.report?.location,
          jobUrl,
          scanTimestamp: jobScan?.timestamp,
        };
      })
    );

    // Group by company and position
    const organized: Record<
      string,
      Record<
        string,
        Array<{
          reviewId: string;
          userId: string;
          didApply: boolean;
          gotGhosted: boolean;
          wasJobReal: boolean;
          hasApplied: boolean;
          gotResponse: boolean;
          yearsOfExperience?: number;
          comment?: string;
          submissionDate: number;
          location?: string;
          jobUrl?: string;
          scanTimestamp?: number;
        }>
      >
    > = {};

    reviewsWithJobData.forEach((review) => {
      const company = review.company;
      const jobTitle = review.jobTitle;

      if (!organized[company]) {
        organized[company] = {};
      }

      if (!organized[company][jobTitle]) {
        organized[company][jobTitle] = [];
      }

      organized[company][jobTitle].push({
        reviewId: review._id,
        userId: review.userId,
        didApply: review.didApply,
        gotGhosted: review.gotGhosted,
        wasJobReal: review.wasJobReal,
        hasApplied: review.hasApplied ?? false,
        gotResponse: review.gotResponse ?? false,
        yearsOfExperience: review.yearsOfExperience,
        comment: review.comment,
        submissionDate: review.submissionDate,
        location: review.location,
        jobUrl: review.jobUrl,
        scanTimestamp: review.scanTimestamp,
      });
    });

    return organized;
  },
});
