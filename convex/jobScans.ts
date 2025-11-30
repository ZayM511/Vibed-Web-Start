import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Create a new job scan and trigger AI analysis
 */
export const createJobScan = mutation({
  args: {
    jobInput: v.string(),
    jobUrl: v.optional(v.string()),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TEMPORARY: Bypass auth for testing (12 hours)
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.tokenIdentifier || "test_user_anonymous";

    // Original auth check (commented out for testing)
    // if (!identity) {
    //   throw new Error("Unauthorized: You must be logged in to scan jobs");
    // }

    // Create initial job scan with placeholder report
    const jobScanId = await ctx.db.insert("jobScans", {
      userId: userId,
      jobInput: args.jobInput,
      jobUrl: args.jobUrl,
      context: args.context,
      report: {
        jobTitle: "Analyzing...",
        company: "Analyzing...",
        location: undefined,
        summary: "AI analysis in progress...",
        keyQualifications: [],
        responsibilities: [],
        redFlags: [],
        confidenceScore: 0,
        isScam: false,
        isGhostJob: false,
        aiAnalysis: "Analysis pending...",
      },
      timestamp: Date.now(),
    });

    // Schedule the AI analysis to run asynchronously
    await ctx.scheduler.runAfter(0, internal.ghostJobDetector.detectGhostJob, {
      jobScanId: jobScanId,
      jobInput: args.jobInput,
      context: args.context,
    });

    return jobScanId;
  },
});

/**
 * Get a specific job scan by ID
 */
export const getJobScanById = query({
  args: {
    jobScanId: v.id("jobScans"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const scan = await ctx.db.get(args.jobScanId);
    if (!scan) {
      return null;
    }

    // Ensure user can only access their own scans
    // Check both tokenIdentifier and subject for compatibility with different scan types
    if (scan.userId !== identity.tokenIdentifier && scan.userId !== identity.subject) {
      return null;
    }

    return scan;
  },
});

/**
 * Get recent job scans for the authenticated user
 */
export const getRecentUserScans = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // TEMPORARY: Bypass auth for testing (12 hours)
    const identity = await ctx.auth.getUserIdentity();

    // If no authenticated user, return scans for anonymous test user
    if (!identity) {
      const limit = args.limit || 20;
      const anonymousScans = await ctx.db
        .query("jobScans")
        .withIndex("by_user_timestamp", (q) =>
          q.eq("userId", "test_user_anonymous")
        )
        .order("desc")
        .take(limit);

      return anonymousScans;
    }

    const limit = args.limit || 20;

    // Get scans using tokenIdentifier (for ghost job scans)
    const scansWithToken = await ctx.db
      .query("jobScans")
      .withIndex("by_user_timestamp", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .order("desc")
      .take(limit);

    // Get scans using subject (for manual scans)
    const scansWithSubject = identity.subject
      ? await ctx.db
          .query("jobScans")
          .withIndex("by_user_timestamp", (q) =>
            q.eq("userId", identity.subject)
          )
          .order("desc")
          .take(limit)
      : [];

    // Combine and deduplicate
    const allScans = [...scansWithToken, ...scansWithSubject];
    const uniqueScans = Array.from(
      new Map(allScans.map((scan) => [scan._id, scan])).values()
    );

    // Sort by timestamp descending and limit
    return uniqueScans
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },
});

/**
 * Delete a job scan
 */
export const deleteJobScan = mutation({
  args: {
    jobScanId: v.id("jobScans"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: You must be logged in to delete scans");
    }

    const scan = await ctx.db.get(args.jobScanId);
    if (!scan) {
      throw new Error("Job scan not found");
    }

    // Ensure user can only delete their own scans
    // Check both tokenIdentifier and subject for compatibility
    if (scan.userId !== identity.tokenIdentifier && scan.userId !== identity.subject) {
      throw new Error("Unauthorized: You can only delete your own scans");
    }

    // Delete associated community reviews first
    const reviews = await ctx.db
      .query("communityReviews")
      .withIndex("by_job_scan", (q) => q.eq("jobScanId", args.jobScanId))
      .collect();

    for (const review of reviews) {
      await ctx.db.delete(review._id);
    }

    // Delete the scan
    await ctx.db.delete(args.jobScanId);

    return { success: true };
  },
});
