import { query } from "../_generated/server";
import { v } from "convex/values";

export const getScanHistoryQuery = query({
  args: {},
  handler: async (ctx) => {
    // Get user identity - allow both authenticated and unauthenticated users
    const identity = await ctx.auth.getUserIdentity();

    // If no authenticated user, return scans for anonymous test user
    if (!identity) {
      const anonymousScans = await ctx.db
        .query("scans")
        .withIndex("by_userId_timestamp", (q) => q.eq("userId", "test_user_anonymous"))
        .order("desc")
        .collect();

      return anonymousScans;
    }

    // For authenticated users, get their scans using subject
    const userId = identity.subject;
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("scans")
      .withIndex("by_userId_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getScanResultByIdQuery = query({
  args: { scanId: v.id("scans") },
  handler: async (ctx, { scanId }) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    if (!userId) {
      return null;
    }

    const scan = await ctx.db.get(scanId);
    if (scan && scan.userId === userId) {
      return scan;
    }
    return null;
  },
});

export const getRecentScansQuery = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("scans")
      .withIndex("by_userId_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});
