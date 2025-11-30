import { v } from "convex/values";
import { action } from "./_generated/server";
import Stripe from "stripe";

// Initialize Stripe - will only work when STRIPE_SECRET_KEY is set in Convex environment
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe is not configured. Please set STRIPE_SECRET_KEY in Convex environment: npx convex env set STRIPE_SECRET_KEY your_key"
    );
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-09-30.clover",
  });
}

/**
 * Create a Stripe Checkout session for subscription signup
 */
export const createCheckoutSession = action({
  args: {
    priceId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
    trialPeriodDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const stripe = getStripe();
    const userId = identity.subject;
    const userEmail = identity.email || undefined;

    // Check if user already has a Stripe customer ID
    const existingSubscription = await ctx.runQuery(
      "subscriptions:getUserSubscription" as any
    );

    let customerId: string | undefined;
    if (existingSubscription?.stripeCustomerId) {
      customerId = existingSubscription.stripeCustomerId;
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      client_reference_id: userId,
      line_items: [
        {
          price: args.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      subscription_data: args.trialPeriodDays
        ? {
            trial_period_days: args.trialPeriodDays,
            metadata: {
              userId,
            },
          }
        : {
            metadata: {
              userId,
            },
          },
      metadata: {
        userId,
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  },
});

/**
 * Create a Stripe Customer Portal session for subscription management
 */
export const createPortalSession = action({
  args: {
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const stripe = getStripe();
    const userId = identity.subject;

    // Get user's subscription to find Stripe customer ID
    const subscription = await ctx.runQuery(
      "subscriptions:getUserSubscription" as any,
      { userId }
    );

    if (!subscription || !subscription.stripeCustomerId) {
      throw new Error("No active subscription found");
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: args.returnUrl,
    });

    return {
      url: session.url,
    };
  },
});

/**
 * Get subscription details from Stripe
 */
export const getStripeSubscription = action({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(args.subscriptionId) as any;

    return {
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end * 1000,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end ? subscription.trial_end * 1000 : null,
    };
  },
});

/**
 * Cancel a subscription
 */
export const cancelStripeSubscription = action({
  args: {
    subscriptionId: v.string(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const stripe = getStripe();

    if (args.cancelAtPeriodEnd) {
      // Cancel at period end
      const subscription = await stripe.subscriptions.update(args.subscriptionId, {
        cancel_at_period_end: true,
      });

      return {
        status: subscription.status,
        cancelAt: subscription.cancel_at ? subscription.cancel_at * 1000 : null,
      };
    } else {
      // Cancel immediately
      const subscription = await stripe.subscriptions.cancel(args.subscriptionId);

      return {
        status: subscription.status,
        canceledAt: subscription.canceled_at
          ? subscription.canceled_at * 1000
          : null,
      };
    }
  },
});
