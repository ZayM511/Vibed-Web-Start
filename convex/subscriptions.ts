import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Admin bypass - specific user IDs that bypass all restrictions
 * Add your Clerk user ID here to enable admin mode
 */
const ADMIN_USER_IDS: string[] = [
  // Add your Clerk user ID here when you're signed in
  // You can find it in the Clerk dashboard or console.log(identity.subject)
];

/**
 * Get the current user's subscription status
 * Returns detailed information about subscription state, trial, and access level
 * Admin users are treated as Pro subscribers
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
      };
    }

    const userId = identity.subject;

    // Admin bypass - treat as Pro subscriber
    const isAdmin = ADMIN_USER_IDS.includes(userId);
    if (isAdmin) {
      return {
        isActive: true,
        plan: "pro" as const,
        currentPeriodEnd: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
        status: "active" as const,
        cancelAtPeriodEnd: false,
        isAdmin: true,
      };
    }

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
 * Admin users bypass all limits
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

    // Admin bypass - unlimited access
    const isAdmin = ADMIN_USER_IDS.includes(userId);
    if (isAdmin) {
      const jobScans = await ctx.db
        .query("jobScans")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      const manualScans = await ctx.db
        .query("scans")
        .withIndex("by_userId_timestamp", (q) => q.eq("userId", userId))
        .collect();

      const totalScans = jobScans.length + manualScans.length;

      return {
        totalScans,
        scansRemaining: -1, // -1 indicates unlimited
        isLimitReached: false,
        isPro: true, // Treat admin as Pro
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
