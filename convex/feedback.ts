import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Submit feedback from users
 */
export const submitFeedback = mutation({
  args: {
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
    reportCategories: v.optional(v.object({
      scamJob: v.boolean(),
      spamJob: v.boolean(),
      ghostJob: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const feedbackId = await ctx.db.insert("feedback", {
      type: args.type,
      message: args.message,
      email: args.email,
      userId: args.userId,
      userName: args.userName,
      reportCategories: args.reportCategories,
      status: "new",
      createdAt: Date.now(),
    });

    return feedbackId;
  },
});

/**
 * Get all feedback (admin only in production)
 */
export const getAllFeedback = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("reviewing"),
        v.literal("resolved"),
        v.literal("archived")
      )
    ),
    type: v.optional(
      v.union(
        v.literal("feedback"),
        v.literal("improvement"),
        v.literal("report"),
        v.literal("bug"),
        v.literal("other")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      const feedback = await ctx.db
        .query("feedback")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(100);
      return feedback;
    } else if (args.type) {
      const feedback = await ctx.db
        .query("feedback")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc")
        .take(100);
      return feedback;
    } else {
      const feedback = await ctx.db
        .query("feedback")
        .withIndex("by_created")
        .order("desc")
        .take(100);
      return feedback;
    }
  },
});

/**
 * Get feedback by user
 */
export const getUserFeedback = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return feedback;
  },
});

/**
 * Update feedback status (admin only)
 */
export const updateFeedbackStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    status: v.union(
      v.literal("new"),
      v.literal("reviewing"),
      v.literal("resolved"),
      v.literal("archived")
    ),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update: any = {
      status: args.status,
    };

    if (args.adminNotes !== undefined) {
      update.adminNotes = args.adminNotes;
    }

    if (args.status === "resolved") {
      update.resolvedAt = Date.now();
    }

    await ctx.db.patch(args.feedbackId, update);
  },
});

/**
 * Admin: Remove a feedback/report entry by ID
 */
export const adminRemoveEntry = mutation({
  args: {
    id: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Get feedback statistics
 */
export const getFeedbackStats = query({
  handler: async (ctx) => {
    const allFeedback = await ctx.db.query("feedback").collect();

    const stats = {
      total: allFeedback.length,
      byType: {
        feedback: 0,
        improvement: 0,
        report: 0,
        bug: 0,
        other: 0,
      },
      byStatus: {
        new: 0,
        reviewing: 0,
        resolved: 0,
        archived: 0,
      },
    };

    allFeedback.forEach((item) => {
      stats.byType[item.type]++;
      stats.byStatus[item.status]++;
    });

    return stats;
  },
});
