"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";

const features = {
  free: [
    "Full Indeed Support",
    "Access to primary filters",
    "Ghost Job Analysis Badges",
    "10 Scam/Spam Job Scans per month",
    "Max of 3 Excluded Keywords",
    "Max of 1 Excluded Companies",
    "Community Reported Companies",
    "Email support",
  ],
  pro: [
    "Everything in Free tier plus:",
    "Unlimited saved templates",
    "Unlimited Scam/Spam Job Scans",
    "Ghost Job Analysis full breakdown",
    "Unlimited Include/Exclude Keywords",
    "Unlimited Excluded Companies",
    "Save Jobs in app",
    "Resume/Cover Letter/Portfolio Storage in app",
    "Beta LinkedIn Support",
  ],
};

export function SubscriptionManagement() {
  const subscription = useQuery(api.subscriptions.getUserSubscription);
  const subscriptionStatus = useQuery(api.subscriptions.getSubscriptionStatus);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const [isLoading, setIsLoading] = useState(false);

  const isPro = subscriptionStatus?.plan === "pro" && subscriptionStatus?.isActive;

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

      if (!priceId) {
        toast.error("Stripe is not configured. Please contact support.");
        return;
      }

      const result = await createCheckoutSession({
        priceId,
        successUrl: `${siteUrl}/dashboard?tab=settings&success=true`,
        cancelUrl: `${siteUrl}/dashboard?tab=settings&canceled=true`,
      });

      if (result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Subscription Management</CardTitle>
        <CardDescription className="text-white/60">
          Choose the plan that works best for you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`relative rounded-lg border-2 p-6 ${
              !isPro
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            {!isPro && (
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold rounded-full">
                  CURRENT
                </span>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-6 w-6 text-emerald-400" />
                <h3 className="text-2xl font-bold text-white">Free</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                $0<span className="text-lg text-white/50">/month</span>
              </p>
              <p className="text-white/60 text-sm">Perfect for getting started</p>
            </div>

            <ul className="space-y-3 mb-6">
              {features.free.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-white/80 text-sm">
                  <Check className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`relative rounded-lg border-2 p-6 ${
              isPro
                ? "border-amber-500/50 bg-amber-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            {isPro && (
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">
                  CURRENT
                </span>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-6 w-6 text-amber-400" />
                <h3 className="text-2xl font-bold text-white">Pro</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                $7.99<span className="text-lg text-white/50">/month</span>
              </p>
              <p className="text-white/60 text-sm">Unlock all premium features</p>
            </div>

            <ul className="space-y-3 mb-6">
              {features.pro.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-white/80 text-sm">
                  <Check className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {!isPro ? (
              <Button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            ) : (
              <div className="text-center p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                <p className="text-white/80 text-sm">
                  Thank you for being a Pro member! 🎉
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Billing Info */}
        {isPro && subscription?.currentPeriodEnd && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg"
          >
            <p className="text-white/60 text-sm">
              Your subscription renews on{" "}
              <span className="text-white font-medium">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
