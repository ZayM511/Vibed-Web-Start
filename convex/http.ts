import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

// Initialize Stripe
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-09-30.clover",
  });
}

/**
 * Stripe Webhook Handler
 * Handles subscription events from Stripe
 */
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const stripe = getStripe();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return new Response("No signature", { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    let event: Stripe.Event;

    try {
      const body = await request.text();
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(`Webhook Error: ${err}`, { status: 400 });
    }

    // Handle the event
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;

          if (session.mode === "subscription" && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            ) as any;

            const userId = session.metadata?.userId || session.client_reference_id;
            if (!userId) {
              console.error("No userId in session metadata");
              break;
            }

            // Determine plan based on price ID
            const priceId = subscription.items.data[0]?.price.id;
            const plan = priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ? "pro" : "free";

            await ctx.runMutation(internal.subscriptions.createOrUpdateSubscription, {
              userId,
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              stripePriceId: priceId,
              plan,
              status: subscription.status as any,
              trialStart: subscription.trial_start ? subscription.trial_start * 1000 : undefined,
              trialEnd: subscription.trial_end ? subscription.trial_end * 1000 : undefined,
              currentPeriodStart: subscription.current_period_start * 1000,
              currentPeriodEnd: subscription.current_period_end * 1000,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            });
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as any;
          const priceId = subscription.items.data[0]?.price.id;
          const plan = priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ? "pro" : "free";

          await ctx.runMutation(internal.subscriptions.createOrUpdateSubscription, {
            userId: subscription.metadata?.userId || "",
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            plan,
            status: subscription.status as any,
            trialStart: subscription.trial_start ? subscription.trial_start * 1000 : undefined,
            trialEnd: subscription.trial_end ? subscription.trial_end * 1000 : undefined,
            currentPeriodStart: subscription.current_period_start * 1000,
            currentPeriodEnd: subscription.current_period_end * 1000,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as any;

          await ctx.runMutation(internal.subscriptions.createOrUpdateSubscription, {
            userId: subscription.metadata?.userId || "",
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id,
            plan: "free",
            status: "canceled",
            currentPeriodStart: subscription.current_period_start * 1000,
            currentPeriodEnd: subscription.current_period_end * 1000,
            cancelAtPeriodEnd: true,
          });
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response(`Webhook Error: ${error}`, { status: 500 });
    }
  }),
});

/**
 * Chrome Extension API - Scan Job Posting
 * TODO: Implement proper job scanning endpoint
 * The ghostJobDetector.detectGhostJob is an internalAction that requires a jobScanId
 */
http.route({
  path: "/scan-job",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    try {
      const jobData = await request.json();

      // Validate required fields
      if (!jobData.url || !jobData.platform) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: url and platform" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // TODO: Create a proper public query/mutation for the extension API
      // For now, return a placeholder response
      return new Response(JSON.stringify({
        message: "Job scan endpoint not yet implemented",
        receivedData: {
          url: jobData.url,
          platform: jobData.platform,
        }
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Error scanning job:", error);
      return new Response(
        JSON.stringify({ error: "Failed to scan job posting" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Chrome Extension API - Sync Filter Settings
 * TODO: Implement updateFilterSettings mutation in users.ts
 */
http.route({
  path: "/sync-settings",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    try {
      const { filterSettings, userId } = await request.json();

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing userId" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // TODO: Implement api.users.updateFilterSettings mutation
      // For now, return success without actually saving
      console.log("Filter settings received for user:", userId, filterSettings);

      return new Response(
        JSON.stringify({ success: true, message: "Settings sync not yet implemented" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (error) {
      console.error("Error syncing settings:", error);
      return new Response(
        JSON.stringify({ error: "Failed to sync settings" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * CORS Preflight Handler
 */
http.route({
  path: "/scan-job",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }),
});

http.route({
  path: "/sync-settings",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }),
});

// ===== Extension Auth Routes =====

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

http.route({
  path: "/auth/signup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { email, password, name } = await request.json();

      if (!email || !password) {
        return new Response(
          JSON.stringify({ message: "Email and password are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      if (password.length < 8) {
        return new Response(
          JSON.stringify({ message: "Password must be at least 8 characters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      const result = await ctx.runAction(internal.extensionAuth.signup, {
        email,
        password,
        name: name || undefined,
      });

      if (!result.success) {
        return new Response(
          JSON.stringify({ message: result.error }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      return new Response(
        JSON.stringify({ token: result.token, email: result.email, name: result.name }),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    } catch (error) {
      console.error("Signup error:", error);
      return new Response(
        JSON.stringify({ message: "Account creation failed. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
  }),
});

http.route({
  path: "/auth/signin",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { email, password } = await request.json();

      if (!email || !password) {
        return new Response(
          JSON.stringify({ message: "Email and password are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      const result = await ctx.runAction(internal.extensionAuth.signin, {
        email,
        password,
      });

      if (!result.success) {
        return new Response(
          JSON.stringify({ message: result.error }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      return new Response(
        JSON.stringify({ token: result.token, email: result.email, name: result.name }),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    } catch (error) {
      console.error("Signin error:", error);
      return new Response(
        JSON.stringify({ message: "Sign in failed. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
  }),
});

// CORS preflight for auth routes
http.route({
  path: "/auth/signup",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

http.route({
  path: "/auth/signin",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

// ===== Extension Subscription Status Endpoint =====

http.route({
  path: "/extension/subscription-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { email } = await request.json();

      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      const status = await ctx.runQuery(
        internal.subscriptions.getSubscriptionStatusByEmail,
        { email }
      );

      return new Response(
        JSON.stringify(status),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscription status" }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
  }),
});

http.route({
  path: "/extension/subscription-status",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

// ===== Extension Founder Tier Override Endpoint =====

http.route({
  path: "/extension/set-founder-tier",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { email, tierOverride } = await request.json();

      if (!email || !tierOverride) {
        return new Response(
          JSON.stringify({ error: "Email and tierOverride are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      if (tierOverride !== "free" && tierOverride !== "pro") {
        return new Response(
          JSON.stringify({ error: "tierOverride must be 'free' or 'pro'" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      // Validate founder email server-side
      const FOUNDER_EMAILS = [
        "isaiah.e.malone@gmail.com",
        "zaydozier17@gmail.com",
        "support@jobfiltr.app",
      ];

      const normalizedEmail = email.toLowerCase().trim();
      if (!FOUNDER_EMAILS.includes(normalizedEmail)) {
        return new Response(
          JSON.stringify({ error: "Not authorized — founders only" }),
          { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      // Upsert founder settings by email
      await ctx.runMutation(internal.subscriptions.setFounderTierOverrideByEmail, {
        email: normalizedEmail,
        tierOverride,
      });

      return new Response(
        JSON.stringify({ success: true, tierOverride }),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    } catch (error) {
      console.error("Error setting founder tier:", error);
      return new Response(
        JSON.stringify({ error: "Failed to set tier override" }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
  }),
});

http.route({
  path: "/extension/set-founder-tier",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

// ===== Extension Google Auth Endpoint =====

http.route({
  path: "/auth/google",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { email, name } = await request.json();

      if (!email) {
        return new Response(
          JSON.stringify({ message: "Email is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      const result = await ctx.runAction(internal.extensionAuth.googleAuth, {
        email,
        name: name || undefined,
      });

      if (!result.success) {
        return new Response(
          JSON.stringify({ message: "Google authentication failed" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      return new Response(
        JSON.stringify({ token: result.token, email: result.email, name: result.name }),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    } catch (error) {
      console.error("Google auth error:", error);
      return new Response(
        JSON.stringify({ message: "Google authentication failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
  }),
});

http.route({
  path: "/auth/google",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

export default http;
