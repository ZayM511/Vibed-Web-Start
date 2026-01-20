import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Log an error from the Chrome extension
 */
export const logError = mutation({
  args: {
    message: v.string(),
    stack: v.optional(v.string()),
    errorType: v.string(),
    platform: v.union(v.literal("linkedin"), v.literal("indeed"), v.literal("google")),
    url: v.string(),
    userAgent: v.optional(v.string()),
    userId: v.optional(v.string()),
    jobContext: v.optional(v.object({
      jobTitle: v.optional(v.string()),
      company: v.optional(v.string()),
      jobId: v.optional(v.string()),
    })),
    domSnapshot: v.optional(v.object({
      activeElement: v.optional(v.string()),
      relevantHTML: v.optional(v.string()),
      detailPanelHTML: v.optional(v.string()),
    })),
    consoleLogs: v.optional(v.array(v.object({
      level: v.string(),
      message: v.string(),
      timestamp: v.number(),
    }))),
    extensionVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const errorId = await ctx.db.insert("extensionErrors", {
      ...args,
      timestamp: Date.now(),
      resolved: false,
    });

    return errorId;
  },
});

/**
 * Get all errors (with pagination and filtering)
 */
export const getErrors = query({
  args: {
    platform: v.optional(v.union(v.literal("linkedin"), v.literal("indeed"), v.literal("google"))),
    resolved: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { platform, resolved, limit = 100 } = args;

    // Start with appropriate index based on filters
    let errors;
    if (platform !== undefined) {
      errors = await ctx.db
        .query("extensionErrors")
        .withIndex("by_platform", (q) => q.eq("platform", platform))
        .order("desc")
        .take(limit);
    } else if (resolved !== undefined) {
      errors = await ctx.db
        .query("extensionErrors")
        .withIndex("by_resolved", (q) => q.eq("resolved", resolved))
        .order("desc")
        .take(limit);
    } else {
      errors = await ctx.db
        .query("extensionErrors")
        .withIndex("by_timestamp")
        .order("desc")
        .take(limit);
    }

    // Additional filtering if needed
    if (resolved !== undefined && platform !== undefined) {
      return errors.filter(e => e.resolved === resolved);
    }

    return errors;
  },
});

/**
 * Get recent errors (last 24 hours)
 */
export const getRecentErrors = query({
  args: {
    platform: v.optional(v.union(v.literal("linkedin"), v.literal("indeed"), v.literal("google"))),
  },
  handler: async (ctx, args) => {
    const { platform } = args;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    let errors;
    if (platform !== undefined) {
      errors = await ctx.db
        .query("extensionErrors")
        .withIndex("by_platform", (q) => q.eq("platform", platform))
        .order("desc")
        .filter((q) => q.gte(q.field("timestamp"), oneDayAgo))
        .take(100);
    } else {
      errors = await ctx.db
        .query("extensionErrors")
        .withIndex("by_timestamp")
        .order("desc")
        .filter((q) => q.gte(q.field("timestamp"), oneDayAgo))
        .take(100);
    }

    return errors;
  },
});

/**
 * Get error statistics
 */
export const getErrorStats = query({
  args: {},
  handler: async (ctx) => {
    const allErrors = await ctx.db.query("extensionErrors").collect();

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const recentErrors = allErrors.filter(e => e.timestamp >= oneDayAgo);
    const weekErrors = allErrors.filter(e => e.timestamp >= oneWeekAgo);

    const byPlatform = {
      linkedin: allErrors.filter(e => e.platform === "linkedin").length,
      indeed: allErrors.filter(e => e.platform === "indeed").length,
      google: allErrors.filter(e => e.platform === "google").length,
    };

    const byType = allErrors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: allErrors.length,
      last24Hours: recentErrors.length,
      last7Days: weekErrors.length,
      unresolved: allErrors.filter(e => !e.resolved).length,
      byPlatform,
      byType,
    };
  },
});

/**
 * Get a single error by ID
 */
export const getError = query({
  args: {
    id: v.id("extensionErrors"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Mark an error as resolved
 */
export const markResolved = mutation({
  args: {
    id: v.id("extensionErrors"),
    resolvedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      resolved: true,
      resolvedAt: Date.now(),
      resolvedBy: args.resolvedBy,
      notes: args.notes,
    });
  },
});

/**
 * Delete an error
 */
export const deleteError = mutation({
  args: {
    id: v.id("extensionErrors"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Get grouped errors (same error message occurring multiple times)
 */
export const getGroupedErrors = query({
  args: {
    platform: v.optional(v.union(v.literal("linkedin"), v.literal("indeed"), v.literal("google"))),
  },
  handler: async (ctx, args) => {
    const { platform } = args;

    let errors;
    if (platform !== undefined) {
      errors = await ctx.db
        .query("extensionErrors")
        .withIndex("by_platform", (q) => q.eq("platform", platform))
        .order("desc")
        .take(500);
    } else {
      errors = await ctx.db
        .query("extensionErrors")
        .withIndex("by_timestamp")
        .order("desc")
        .take(500);
    }

    // Group by error message
    const grouped = errors.reduce((acc, error) => {
      const key = error.message;
      if (!acc[key]) {
        acc[key] = {
          message: error.message,
          errorType: error.errorType,
          count: 0,
          firstOccurrence: error.timestamp,
          lastOccurrence: error.timestamp,
          platform: error.platform,
          resolved: true,
          instances: [],
        };
      }

      acc[key].count++;
      acc[key].firstOccurrence = Math.min(acc[key].firstOccurrence, error.timestamp);
      acc[key].lastOccurrence = Math.max(acc[key].lastOccurrence, error.timestamp);
      acc[key].resolved = acc[key].resolved && error.resolved;
      acc[key].instances.push(error._id);

      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  },
});
