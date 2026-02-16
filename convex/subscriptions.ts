import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
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
      const founderSettings = await ctx.db
        .query("founderSettings")
        .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", userId))
        .first();

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
      const founderSettings = await ctx.db
        .query("founderSettings")
        .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", userId))
        .first();

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

    const settings = await ctx.db
      .query("founderSettings")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
      .first();

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
    const existing = await ctx.db
      .query("founderSettings")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tierOverride: args.tierOverride,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("founderSettings", {
        clerkUserId: userId,
        tierOverride: args.tierOverride,
        updatedAt: Date.now(),
      });
    }

    return { success: true, tierOverride: args.tierOverride };
  },
});
