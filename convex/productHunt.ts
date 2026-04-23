import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";

// ── Internal Queries (for stripe action) ──

export const getPurchaseCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const purchases = await ctx.db.query("productHuntPurchases").collect();
    return purchases.length;
  },
});

export const getPurchaseByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("productHuntPurchases")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});

export const getPurchaseBySessionId = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("productHuntPurchases")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", args.sessionId))
      .first();
  },
});

// ── Internal Mutations (for webhook) ──

export const createPurchase = internalMutation({
  args: {
    email: v.string(),
    stripeSessionId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Check if already exists
    const existing = await ctx.db
      .query("productHuntPurchases")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .first();

    if (existing) {
      return { success: false, error: "Purchase already recorded" };
    }

    // Create purchase record
    await ctx.db.insert("productHuntPurchases", {
      email,
      stripeSessionId: args.stripeSessionId,
      stripeCustomerId: args.stripeCustomerId,
      amount: args.amount,
      purchasedAt: Date.now(),
    });

    // Create lifetime license
    await ctx.db.insert("lifetimeLicenses", {
      email,
      code: "JOBHUNT-PH",
      tier: 1,
      grantedAt: Date.now(),
      source: "producthunt",
    });

    return { success: true, email };
  },
});

// ── Admin Queries ──

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const purchases = await ctx.db.query("productHuntPurchases").collect();
    const totalRevenue = purchases.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalPurchases: purchases.length,
      remaining: Math.max(0, 200 - purchases.length),
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      soldOut: purchases.length >= 200,
    };
  },
});

export const getAllPurchases = query({
  args: {},
  handler: async (ctx) => {
    const purchases = await ctx.db
      .query("productHuntPurchases")
      .order("desc")
      .collect();

    // Get lifetime license status for each
    const purchasesWithStatus = await Promise.all(
      purchases.map(async (purchase) => {
        const license = await ctx.db
          .query("lifetimeLicenses")
          .withIndex("by_email", (q) => q.eq("email", purchase.email))
          .first();

        return {
          ...purchase,
          hasLifetimeLicense: !!license,
          licenseTier: license?.tier,
        };
      })
    );

    return purchasesWithStatus;
  },
});

// ── Admin Mutations ──

export const grantLifetimePro = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Check if already has license
    const existing = await ctx.db
      .query("lifetimeLicenses")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      return { success: false, error: "User already has lifetime license" };
    }

    // Create lifetime license
    await ctx.db.insert("lifetimeLicenses", {
      email,
      code: "ADMIN-GRANT",
      tier: 1,
      grantedAt: Date.now(),
      source: "admin",
    });

    return { success: true };
  },
});

export const refreshLicense = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Find existing license
    const existing = await ctx.db
      .query("lifetimeLicenses")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!existing) {
      return { success: false, error: "No license found for this email" };
    }

    // Update the grantedAt timestamp to force a cache refresh
    await ctx.db.patch(existing._id, {
      grantedAt: Date.now(),
    });

    return { success: true, message: "License refreshed" };
  },
});

export const revokeLicense = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    const license = await ctx.db
      .query("lifetimeLicenses")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!license) {
      return { success: false, error: "No license found" };
    }

    await ctx.db.delete(license._id);
    return { success: true };
  },
});
