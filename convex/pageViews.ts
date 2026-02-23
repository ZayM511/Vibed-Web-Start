import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

const FOUNDER_EMAILS = [
  "isaiah.e.malone@gmail.com",
  "support@jobfiltr.app",
  "hello@jobfiltr.app",
];

// Convert a UTC timestamp to YYYY-MM-DD in Pacific Time (America/Los_Angeles)
function toPacificDateString(ts: number): string {
  return new Date(ts).toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
}

// Get the UTC timestamp for midnight Pacific Time on a given date
function getPacificDayStartUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Midnight Pacific = 8 AM UTC (PST) or 7 AM UTC (PDT)
  // Try both offsets and pick the one that maps back to the correct date
  for (const offset of [8, 7]) {
    const candidate = Date.UTC(y, m - 1, d, offset, 0, 0);
    if (toPacificDateString(candidate) === dateStr) {
      return candidate;
    }
  }
  return Date.UTC(y, m - 1, d, 8, 0, 0);
}

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
    // Use Pacific Time so each day starts at midnight PST/PDT
    const todayStr = toPacificDateString(now);
    const todayStart = getPacificDayStartUTC(todayStr);

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

    // Build array for last 30 Pacific days
    const result: { date: string; totalViews: number; uniqueVisitors: number }[] = [];
    const seen = new Set<string>();
    for (let i = 30; i >= 0; i--) {
      const dateStr = toPacificDateString(now - i * 24 * 60 * 60 * 1000);
      if (seen.has(dateStr)) continue;
      seen.add(dateStr);
      result.push({
        date: dateStr,
        totalViews: statsMap[dateStr]?.totalViews ?? 0,
        uniqueVisitors: statsMap[dateStr]?.uniqueVisitors ?? 0,
      });
    }

    return result.slice(-30);
  },
});

// Internal mutation — aggregates yesterday's raw pageViews into dailyPageViewStats
// Called by cron job daily
export const aggregateDailyStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Calculate yesterday's date range in Pacific Time
    const yesterdayStr = toPacificDateString(now - 24 * 60 * 60 * 1000);
    const dayStart = getPacificDayStartUTC(yesterdayStr);
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
