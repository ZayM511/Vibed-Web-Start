import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * Get all user review contributions with related job information
 * Returns a combined list of labeled jobs and community reviews
 */
export const getUserReviewHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Use tokenIdentifier to match what addLabel uses
    const userId = identity.tokenIdentifier;

    // Get all labeling contributions
    const labelingContributions = await ctx.db
      .query("labelerContributions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Group contributions by trainingDataId to create threads
    const contributionsByJob = new Map<string, typeof labelingContributions>();
    labelingContributions.forEach((contribution) => {
      const key = contribution.trainingDataId;
      if (!contributionsByJob.has(key)) {
        contributionsByJob.set(key, []);
      }
      contributionsByJob.get(key)!.push(contribution);
    });

    // Get training data for each contribution group
    const labeledJobs = await Promise.all(
      Array.from(contributionsByJob.entries()).map(async ([trainingDataId, contributions]) => {
        // First contribution in the group - use its trainingDataId which has the correct type
        const firstContribution = contributions[0];
        const trainingData = await ctx.db.get(firstContribution.trainingDataId) as Doc<"trainingData"> | null;
        if (!trainingData) return null;

        // Sort contributions by timestamp (oldest first to show original review first)
        const sortedContributions = contributions.sort((a, b) => a.timestamp - b.timestamp);

        // Map each contribution to a review object
        return sortedContributions.map((contribution, index) => ({
          id: contribution._id,
          type: "labeling" as const,
          jobTitle: trainingData.jobTitle,
          company: trainingData.company,
          jobUrl: trainingData.jobUrl,
          jobContent: trainingData.jobContent,
          isScam: contribution.isScam,
          isGhostJob: contribution.isGhostJob,
          confidence: contribution.confidence,
          redFlags: trainingData.labelRedFlags,
          notes: trainingData.labelNotes,
          timestamp: contribution.timestamp,
          reviewed: true,
          trainingDataId: contribution.trainingDataId,
          isUpdate: index > 0, // Mark as update if not the first contribution
          isOriginal: index === 0, // Mark the first as original
          updateNumber: index > 0 ? index : undefined, // Track which update this is
          totalUpdates: sortedContributions.length - 1, // Total number of updates
        }));
      })
    ).then((results) => results.filter(Boolean).flat());

    // Get all community reviews
    const communityReviews = await ctx.db
      .query("communityReviews")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get scan data for each review
    const reviewedJobs = await Promise.all(
      communityReviews.map(async (review) => {
        // Try to get from jobScans first
        let scan = await ctx.db.get(review.jobScanId);

        // If not found, try scans table
        if (!scan) {
          scan = await ctx.db.get(review.jobScanId);
        }

        if (!scan) return null;

        return {
          id: review._id,
          type: "community" as const,
          jobTitle: scan.report.jobTitle,
          company: scan.report.company,
          jobUrl: (scan as any).jobUrl || undefined,
          jobContent: (scan as any).jobInput,
          didApply: review.didApply,
          gotGhosted: review.gotGhosted,
          wasJobReal: review.wasJobReal,
          comment: review.comment,
          timestamp: review.submissionDate,
          reviewed: true,
        };
      })
    );

    // Filter out null values and combine both lists
    const allReviews = [
      ...labeledJobs.filter(Boolean),
      ...reviewedJobs.filter(Boolean),
    ].sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));

    // Get unreviewed jobs (training data that user hasn't labeled yet)
    const allTrainingData = await ctx.db
      .query("trainingData")
      .collect();

    const reviewedTrainingDataIds = new Set(
      labelingContributions.map((c) => c.trainingDataId)
    );

    const unreviewedJobs = allTrainingData
      .filter((data) => !reviewedTrainingDataIds.has(data._id))
      .map((data) => ({
        id: data._id,
        type: "unreviewed" as const,
        jobTitle: data.jobTitle,
        company: data.company,
        jobUrl: data.jobUrl,
        jobContent: data.jobContent,
        timestamp: data.createdAt,
        reviewed: false,
      }));

    return {
      reviewed: allReviews,
      unreviewed: unreviewedJobs,
      stats: {
        totalReviewed: allReviews.length,
        totalLabeled: labeledJobs.filter(Boolean).length,
        totalCommunityReviews: reviewedJobs.filter(Boolean).length,
        totalUnreviewed: unreviewedJobs.length,
      },
    };
  },
});

/**
 * Get stats for user's review activity
 */
export const getReviewStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Use tokenIdentifier to match what addLabel uses
    const userId = identity.tokenIdentifier;

    // Get labeling contributions
    const labelingContributions = await ctx.db
      .query("labelerContributions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get community reviews
    const communityReviews = await ctx.db
      .query("communityReviews")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Calculate average confidence from labeling
    const avgConfidence =
      labelingContributions.length > 0
        ? labelingContributions.reduce((sum, c) => sum + c.confidence, 0) /
          labelingContributions.length
        : 0;

    // Count scams and ghost jobs identified
    const scamsIdentified = labelingContributions.filter((c) => c.isScam).length;
    const ghostJobsIdentified = labelingContributions.filter(
      (c) => c.isGhostJob
    ).length;

    return {
      totalContributions: labelingContributions.length + communityReviews.length,
      labelingContributions: labelingContributions.length,
      communityReviews: communityReviews.length,
      avgConfidence: Number(avgConfidence.toFixed(1)),
      scamsIdentified,
      ghostJobsIdentified,
    };
  },
});
