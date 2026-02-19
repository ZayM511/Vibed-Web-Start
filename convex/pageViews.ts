import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

const FOUNDER_EMAILS = [
  "isaiah.e.malone@gmail.com",
  "support@jobfiltr.app",
  "hello@jobfiltr.app",
];

// Public mutation — records a single page view (no auth required)
export const recordPageView = mutation({
  args: {
    visitorId: v.string(),
    path: v.string(),
    referrer: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("pageViews", {
      visitorId: args.visitorId,
      path: args.path,
      referrer: args.referrer,
      userId: args.userId,
      timestamp: Date.now(),
    });
  },
});

// Founder-only query — returns daily stats for the last 30 days
export const getDailyPageViewStats = query({
  args: { userEmail: v.string() },
  handler: async (ctx, args) => {
    if (!FOUNDER_EMAILS.includes(args.userEmail.toLowerCase())) {
      return null;
    }

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get aggregated stats from dailyPageViewStats table
    const aggregatedStats = await ctx.db
      .query("dailyPageViewStats")
      .withIndex("by_date")
      .collect();

    // Build a map of date -> stats from aggregated data
    const statsMap: Record<string, { totalViews: number; uniqueVisitors: number }> = {};
    for (const stat of aggregatedStats) {
      statsMap[stat.date] = {
        totalViews: stat.totalViews,
        uniqueVisitors: stat.uniqueVisitors,
      };
    }

    // Compute today's stats from raw pageViews (cron hasn't run yet for today)
    const todayStr = new Date(now).toISOString().split("T")[0];
    const todayStart = new Date(todayStr).getTime();

    const todayViews = await ctx.db
      .query("pageViews")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", todayStart))
      .collect();

    if (todayViews.length > 0) {
      const uniqueVisitors = new Set(todayViews.map((v) => v.visitorId)).size;
      statsMap[todayStr] = {
        totalViews: todayViews.length,
        uniqueVisitors,
      };
    }

    // Build array for last 30 days
    const result: { date: string; totalViews: number; uniqueVisitors: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      result.push({
        date: dateStr,
        totalViews: statsMap[dateStr]?.totalViews ?? 0,
        uniqueVisitors: statsMap[dateStr]?.uniqueVisitors ?? 0,
      });
    }

    return result;
  },
});

// Internal mutation — aggregates yesterday's raw pageViews into dailyPageViewStats
// Called by cron job daily
export const aggregateDailyStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Calculate yesterday's date range
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const dayStart = new Date(yesterdayStr).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    // Query yesterday's raw page views
    const yesterdayViews = await ctx.db
      .query("pageViews")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", dayStart).lt("timestamp", dayEnd)
      )
      .collect();

    if (yesterdayViews.length > 0) {
      const uniqueVisitors = new Set(yesterdayViews.map((v) => v.visitorId)).size;

      // Check if we already have an entry for yesterday (idempotent)
      const existing = await ctx.db
        .query("dailyPageViewStats")
        .withIndex("by_date", (q) => q.eq("date", yesterdayStr))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          totalViews: yesterdayViews.length,
          uniqueVisitors,
        });
      } else {
        await ctx.db.insert("dailyPageViewStats", {
          date: yesterdayStr,
          totalViews: yesterdayViews.length,
          uniqueVisitors,
        });
      }
    }

    // Clean up raw pageViews older than 7 days (keep DB lean)
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oldViews = await ctx.db
      .query("pageViews")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", sevenDaysAgo))
      .take(5000);

    for (const view of oldViews) {
      await ctx.db.delete(view._id);
    }
  },
});
