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
