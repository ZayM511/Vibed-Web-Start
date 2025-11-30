import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
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
 * Analyzes a job posting for scams and ghost jobs
 */
http.route({
  path: "/scan-job",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const jobData = await request.json();

      // Validate required fields
      if (!jobData.url || !jobData.platform) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: url and platform" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Call the ghost job detector
      const result = await ctx.runQuery(api.ghostJobDetector.analyzeJob, {
        url: jobData.url,
        title: jobData.title || "",
        company: jobData.company || "",
        description: jobData.description || "",
        platform: jobData.platform,
      });

      return new Response(JSON.stringify(result), {
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
 * Saves user's filter preferences to their account
 */
http.route({
  path: "/sync-settings",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { filterSettings, userId } = await request.json();

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing userId" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Save settings to user profile
      await ctx.runMutation(api.users.updateFilterSettings, {
        userId,
        filterSettings,
      });

      return new Response(
        JSON.stringify({ success: true }),
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

export default http;
