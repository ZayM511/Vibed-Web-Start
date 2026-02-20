import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Founder email addresses that can access tier override
 * Duplicated from lib/feature-flags.ts since Convex can't import from lib/
 */
const FOUNDER_EMAILS = [
  "isaiah.e.malone@gmail.com",
  "zaydozier17@gmail.com",
  "support@jobfiltr.app",
];

/**
 * Check if a user identity email matches a founder email
 */
function isFounderEmail(identity: { email?: string; tokenIdentifier?: string }): boolean {
  const email = identity.email?.toLowerCase();
  if (!email) return false;
  return FOUNDER_EMAILS.includes(email);
}

/**
 * Find the canonical founderSettings record for an email.
 * Uses email as primary lookup (shared between web + extension).
 * Falls back to clerkUserId. If duplicates exist, returns the most recently updated.
 */
async function findFounderSettingsByEmail(
  ctx: { db: any },
  email: string,
  clerkUserId?: string
) {
  // Collect ALL records that could belong to this founder
  const byEmail = await ctx.db
    .query("founderSettings")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .collect();

  let byClerk: any[] = [];
  if (clerkUserId) {
    byClerk = await ctx.db
      .query("founderSettings")
      .withIndex("by_clerk_user", (q: any) => q.eq("clerkUserId", clerkUserId))
      .collect();
  }

  // Also check for extension-created records
  const byExtension = await ctx.db
    .query("founderSettings")
    .withIndex("by_clerk_user", (q: any) => q.eq("clerkUserId", `extension_${email}`))
    .collect();

  // Deduplicate by _id
  const allMap = new Map<string, any>();
  for (const r of [...byEmail, ...byClerk, ...byExtension]) {
    allMap.set(r._id.toString(), r);
  }
  const all = Array.from(allMap.values());

  if (all.length === 0) return null;

  // Pick the most recently updated record
  all.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return all[0];
}

/**
 * Get the current user's subscription status
 * Founders with a tier override will see that tier instead of their actual subscription.
 * Regular users see their actual subscription status.
 */
export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        isActive: false,
        plan: null,
        currentPeriodEnd: null,
        status: "none" as const,
        cancelAtPeriodEnd: false,
        isAdmin: false,
        isFounder: false,
      };
    }

    const userId = identity.subject;
    const founder = isFounderEmail(identity);

    // Founder tier override check
    if (founder) {
      const email = identity.email?.toLowerCase();
      const founderSettings = email
        ? await findFounderSettingsByEmail(ctx, email, userId)
        : null;

      // If founder has an override set, respect it
      if (founderSettings) {
        const overridePlan = founderSettings.tierOverride;
        return {
          isActive: overridePlan === "pro",
          plan: overridePlan as "free" | "pro",
          currentPeriodEnd: overridePlan === "pro" ? Date.now() + 365 * 24 * 60 * 60 * 1000 : null,
          status: overridePlan === "pro" ? ("active" as const) : ("none" as const),
          cancelAtPeriodEnd: false,
          isAdmin: true,
          isFounder: true,
        };
      }

      // No override set — default founders to Pro
      return {
        isActive: true,
        plan: "pro" as const,
        currentPeriodEnd: Date.now() + 365 * 24 * 60 * 60 * 1000,
        status: "active" as const,
        cancelAtPeriodEnd: false,
        isAdmin: true,
        isFounder: true,
      };
    }

    // Regular user — check actual subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    if (!subscription) {
      return {
        isActive: false,
        plan: null,
        currentPeriodEnd: null,
        status: "none" as const,
        cancelAtPeriodEnd: false,
        isAdmin: false,
        isFounder: false,
      };
    }

    const isActive = subscription.status === "active";

    return {
      isActive,
      plan: subscription.plan,
      currentPeriodEnd: subscription.currentPeriodEnd,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      isAdmin: false,
      isFounder: false,
    };
  },
});

/**
 * Get user's payment methods
 */
export const getPaymentMethods = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("paymentMethods")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * Get user's payment history
 */
export const getPaymentHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const limit = args.limit ?? 10;

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(limit);

    return payments;
  },
});

/**
 * Create or update subscription from Stripe webhook
 * This is called by the Stripe webhook handler
 */
export const createOrUpdateSubscription = internalMutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    plan: v.union(
      v.literal("free"),
      v.literal("pro")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("unpaid")
    ),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("subscriptions", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Record a payment
 * Called by Stripe webhook when a payment succeeds or fails
 */
export const recordPayment = internalMutation({
  args: {
    userId: v.string(),
    stripePaymentIntentId: v.string(),
    stripeInvoiceId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("pending"),
      v.literal("canceled")
    ),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if payment already recorded (idempotency for webhooks)
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_stripe_payment_intent", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("payments", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Save or update payment method
 * Called when user adds/updates payment method via Stripe
 */
export const savePaymentMethod = mutation({
  args: {
    userId: v.string(),
    stripePaymentMethodId: v.string(),
    type: v.string(),
    last4: v.string(),
    brand: v.string(),
    expiryMonth: v.number(),
    expiryYear: v.number(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if payment method already exists
    const existing = await ctx.db
      .query("paymentMethods")
      .withIndex("by_stripe_payment_method", (q) =>
        q.eq("stripePaymentMethodId", args.stripePaymentMethodId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    // If this is the default, unset other defaults
    if (args.isDefault) {
      const userMethods = await ctx.db
        .query("paymentMethods")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const method of userMethods) {
        if (method.isDefault) {
          await ctx.db.patch(method._id, { isDefault: false });
        }
      }
    }

    return await ctx.db.insert("paymentMethods", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Cancel subscription at period end
 * User-facing mutation to cancel their subscription
 */
export const cancelSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    if (subscription.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.subscriptionId, {
      cancelAtPeriodEnd: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get user's current subscription
 */
export const getUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .first();
  },
});

/**
 * Get scan usage statistics for the current user
 * Free users are limited to 3 scans
 * Founders respect their tier override
 */
export const getScanUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        totalScans: 0,
        scansRemaining: 0,
        isLimitReached: true,
        isPro: false,
        isAdmin: false,
      };
    }

    const userId = identity.subject;
    const founder = isFounderEmail(identity);

    // Count total scans from both jobScans and scans tables
    const jobScans = await ctx.db
      .query("jobScans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const manualScans = await ctx.db
      .query("scans")
      .withIndex("by_userId_timestamp", (q) => q.eq("userId", userId))
      .collect();

    const totalScans = jobScans.length + manualScans.length;
    const FREE_SCAN_LIMIT = 3;

    // Founder tier override check
    if (founder) {
      const email = identity.email?.toLowerCase();
      const founderSettings = email
        ? await findFounderSettingsByEmail(ctx, email, userId)
        : null;

      const overridePlan = founderSettings?.tierOverride ?? "pro";

      if (overridePlan === "pro") {
        return {
          totalScans,
          scansRemaining: -1,
          isLimitReached: false,
          isPro: true,
          isAdmin: true,
        };
      }
      // Founder testing as free — enforce free limits
      const scansRemaining = Math.max(0, FREE_SCAN_LIMIT - totalScans);
      return {
        totalScans,
        scansRemaining,
        isLimitReached: totalScans >= FREE_SCAN_LIMIT,
        isPro: false,
        isAdmin: true,
      };
    }

    // Check subscription status
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    const isPro = subscription?.plan === "pro" && subscription?.status === "active";

    // Pro users have unlimited scans
    if (isPro) {
      return {
        totalScans,
        scansRemaining: -1, // -1 indicates unlimited
        isLimitReached: false,
        isPro: true,
        isAdmin: false,
      };
    }

    // Free users have 3 scans limit
    const scansRemaining = Math.max(0, FREE_SCAN_LIMIT - totalScans);
    const isLimitReached = totalScans >= FREE_SCAN_LIMIT;

    return {
      totalScans,
      scansRemaining,
      isLimitReached,
      isPro: false,
      isAdmin: false,
    };
  },
});

/**
 * Get founder settings (tier override) for the current user
 * Returns null if user is not a founder
 */
export const getFounderSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    if (!isFounderEmail(identity)) return null;

    const email = identity.email?.toLowerCase();
    const settings = email
      ? await findFounderSettingsByEmail(ctx, email, identity.subject)
      : null;

    return {
      isFounder: true,
      tierOverride: settings?.tierOverride ?? "pro",
    };
  },
});

/**
 * Set founder tier override
 * Only founders can call this mutation
 */
export const setFounderTierOverride = mutation({
  args: {
    tierOverride: v.union(v.literal("free"), v.literal("pro")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    if (!isFounderEmail(identity)) {
      throw new Error("Not authorized — founders only");
    }

    const userId = identity.subject;
    const email = identity.email?.toLowerCase();

    // Find the canonical record using shared helper
    const existing = email
      ? await findFounderSettingsByEmail(ctx, email, userId)
      : null;

    if (existing) {
      // Update the record and normalize clerkUserId to the real Clerk ID
      await ctx.db.patch(existing._id, {
        clerkUserId: userId,
        tierOverride: args.tierOverride,
        email: email || existing.email,
        updatedAt: Date.now(),
      });

      // Delete ALL other records for this founder (by email, clerkUserId, or extension ID)
      if (email) {
        const byEmail = await ctx.db
          .query("founderSettings")
          .withIndex("by_email", (q) => q.eq("email", email))
          .collect();
        const byClerk = await ctx.db
          .query("founderSettings")
          .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", userId))
          .collect();
        const byExt = await ctx.db
          .query("founderSettings")
          .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", `extension_${email}`))
          .collect();
        const seen = new Set<string>();
        for (const r of [...byEmail, ...byClerk, ...byExt]) {
          const id = r._id.toString();
          if (!seen.has(id) && id !== existing._id.toString()) {
            seen.add(id);
            await ctx.db.delete(r._id);
          }
        }
      }
    } else {
      await ctx.db.insert("founderSettings", {
        clerkUserId: userId,
        email,
        tierOverride: args.tierOverride,
        updatedAt: Date.now(),
      });
    }

    return { success: true, tierOverride: args.tierOverride };
  },
});

/**
 * Get subscription status by email (for Chrome extension).
 * Does NOT require Clerk JWT auth — used by the extension HTTP endpoint.
 * - Founders: checks founderSettings for tier override, defaults to Pro
 * - Regular users: checks subscriptions table by matching email to users table
 */
export const getSubscriptionStatusByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Check if founder
    if (FOUNDER_EMAILS.includes(email)) {
      const founderSettings = await findFounderSettingsByEmail(ctx, email);

      if (founderSettings) {
        const overridePlan = founderSettings.tierOverride;
        return {
          isActive: overridePlan === "pro",
          plan: overridePlan as "free" | "pro",
          status: overridePlan === "pro" ? "active" : "none",
          isFounder: true,
        };
      }

      // No override record at all — default founders to Pro
      return {
        isActive: true,
        plan: "pro" as const,
        status: "active",
        isFounder: true,
      };
    }

    // Non-founder: try to find subscription via users table
    // The users table has clerkUserId, and subscriptions are keyed by userId (clerkUserId)
    // We need to find a user with this email — but users table doesn't store email.
    // Check if there's an extensionUser with this email that has a linked clerkUserId
    // For now, non-founder users without a direct Stripe subscription default to free.
    // TODO: Add email→clerkUserId mapping when users link their accounts

    return {
      isActive: false,
      plan: "free" as const,
      status: "none",
      isFounder: false,
    };
  },
});

/**
 * Set founder tier override by email (for Chrome extension HTTP endpoint).
 * Does NOT require Clerk JWT auth — validated by founder email whitelist in HTTP handler.
 */
export const setFounderTierOverrideByEmail = internalMutation({
  args: {
    email: v.string(),
    tierOverride: v.union(v.literal("free"), v.literal("pro")),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Find the canonical record using shared helper
    const existing = await findFounderSettingsByEmail(ctx, email);

    if (existing) {
      await ctx.db.patch(existing._id, {
        tierOverride: args.tierOverride,
        email,
        updatedAt: Date.now(),
      });

      // Delete ALL other records for this founder
      const byEmail = await ctx.db
        .query("founderSettings")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect();
      const byExt = await ctx.db
        .query("founderSettings")
        .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", `extension_${email}`))
        .collect();
      const seen = new Set<string>();
      for (const r of [...byEmail, ...byExt]) {
        const id = r._id.toString();
        if (!seen.has(id) && id !== existing._id.toString()) {
          seen.add(id);
          await ctx.db.delete(r._id);
        }
      }
    } else {
      await ctx.db.insert("founderSettings", {
        clerkUserId: `extension_${email}`,
        email,
        tierOverride: args.tierOverride,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * One-time cleanup: deduplicate founderSettings records.
 * For each founder email, keeps only the most recently updated record and deletes the rest.
 */
export const cleanupFounderSettings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allSettings = await ctx.db.query("founderSettings").collect();

    // Group by email (or extract email from extension clerkUserId)
    const byEmail = new Map<string, typeof allSettings>();
    for (const s of allSettings) {
      const email = s.email
        || (s.clerkUserId.startsWith("extension_") ? s.clerkUserId.replace("extension_", "") : null);
      if (!email) continue;
      const list = byEmail.get(email) || [];
      list.push(s);
      byEmail.set(email, list);
    }

    let deleted = 0;
    for (const [email, records] of byEmail) {
      if (records.length <= 1) continue;

      // Keep the most recently updated record
      records.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const keep = records[0];

      // Backfill email on the kept record if missing
      if (!keep.email) {
        await ctx.db.patch(keep._id, { email });
      }

      // Delete the rest
      for (let i = 1; i < records.length; i++) {
        await ctx.db.delete(records[i]._id);
        deleted++;
      }
    }

    return { deleted, remaining: allSettings.length - deleted };
  },
});
