import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";

/**
 * Check if an email is already on the waitlist
 */
export const checkEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    return { exists: !!existing };
  },
});

/**
 * Add a new email to the waitlist
 */
export const joinWaitlist = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    location: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Check for duplicate
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      return { success: false, error: "already_exists", id: existing._id };
    }

    const id = await ctx.db.insert("waitlist", {
      email: normalizedEmail,
      name: args.name?.trim(),
      location: args.location.trim(),
      source: args.source || "homepage",
      status: "pending",
      emailConfirmed: false,
      createdAt: Date.now(),
    });

    return { success: true, id };
  },
});

/**
 * Get waitlist statistics (admin only)
 */
export const getWaitlistStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("waitlist").collect();

    return {
      total: all.length,
      byStatus: {
        pending: all.filter((w) => w.status === "pending").length,
        confirmed: all.filter((w) => w.status === "confirmed").length,
        invited: all.filter((w) => w.status === "invited").length,
        converted: all.filter((w) => w.status === "converted").length,
      },
    };
  },
});

/**
 * Get all waitlist entries (admin only)
 */
export const getAllWaitlistEntries = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("waitlist")
      .withIndex("by_created")
      .order("desc")
      .collect();

    return entries;
  },
});

/**
 * Get waitlist count
 */
export const getWaitlistCount = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("waitlist").collect();
    return all.length;
  },
});

/**
 * Admin: Add a new waitlist entry directly
 */
export const adminAddEntry = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("invited"),
      v.literal("converted")
    ),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      return { success: false, error: "already_exists" };
    }

    const id = await ctx.db.insert("waitlist", {
      email: normalizedEmail,
      name: args.name?.trim() || undefined,
      location: args.location?.trim() || undefined,
      source: args.source?.trim() || "admin",
      status: args.status,
      emailConfirmed: false,
      createdAt: Date.now(),
    });

    return { success: true, id };
  },
});

/**
 * Get waitlist analytics data (admin only)
 */
export const getWaitlistAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("waitlist").collect();

    const total = all.length;
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const thisWeek = all.filter((w) => w.createdAt >= oneWeekAgo).length;

    // Group by status
    const byStatus = {
      pending: all.filter((w) => w.status === "pending").length,
      confirmed: all.filter((w) => w.status === "confirmed").length,
      invited: all.filter((w) => w.status === "invited").length,
      converted: all.filter((w) => w.status === "converted").length,
    };

    // Group by location
    const locationMap: Record<string, number> = {};
    for (const entry of all) {
      const loc = entry.location?.trim() || "Unknown";
      locationMap[loc] = (locationMap[loc] || 0) + 1;
    }
    const byLocation = Object.entries(locationMap)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);

    // Group by source
    const sourceMap: Record<string, number> = {};
    for (const entry of all) {
      const src = entry.source?.trim() || "direct";
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    }
    const bySource = Object.entries(sourceMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // Daily signups for last 30 days
    const dailyMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dailyMap[key] = 0;
    }
    for (const entry of all) {
      if (entry.createdAt >= thirtyDaysAgo) {
        const d = new Date(entry.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (key in dailyMap) {
          dailyMap[key]++;
        }
      }
    }
    const dailySignups = Object.entries(dailyMap).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      total,
      thisWeek,
      byStatus,
      byLocation,
      bySource,
      dailySignups,
    };
  },
});

/**
 * Admin: Remove a waitlist entry by ID
 */
export const adminRemoveEntry = mutation({
  args: {
    id: v.id("waitlist"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
