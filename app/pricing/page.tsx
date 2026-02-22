"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser, SignUpButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Crown } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    priceId: null,
    description: "Perfect for getting started",
    icon: Sparkles,
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/50",
    bgColor: "bg-emerald-500/10",
    gradient: "from-emerald-500/20 to-green-500/20",
    badgeGradient: "from-emerald-500 to-green-500",
    features: [
      "Indeed Support",
      "Access to primary filters",
      "Ghost Job Analysis Badges",
      "10 Scam/Spam Job Scans per month",
      "Max of 3 Excluded Keywords",
      "Max of 1 Excluded Companies",
      "Community Reported Companies",
      "Email support",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$7.99",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
    description: "Unlock all premium features",
    icon: Crown,
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/50",
    bgColor: "bg-amber-500/10",
    gradient: "from-amber-500/20 to-orange-500/20",
    badgeGradient: "from-amber-500 to-orange-500",
    features: [
      "Everything in Free tier plus:",
      "LinkedIn Support",
      "Unlimited saved templates",
      "Unlimited Scam/Spam Job Scans",
      "Ghost Job Analysis full breakdown",
      "Unlimited Include/Exclude Keywords",
      "Unlimited Excluded Companies",
      "Save Jobs in app",
      "Resume/Cover Letter/Portfolio Storage in app",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
];

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const { subscription } = useSubscription();
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string | null, planName: string) => {
    if (planName === "Free" || !priceId) {
      return;
    }

    if (!isSignedIn) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setLoading(priceId);

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const result = await createCheckoutSession({
        priceId,
        successUrl: `${siteUrl}/dashboard?tab=settings&success=true`,
        cancelUrl: `${siteUrl}/pricing?canceled=true`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (tierName: string) => {
    if (!isSignedIn) return false;
    return tierName === "Free"
      ? !subscription?.plan || subscription?.plan === "free"
      : subscription?.plan === tierName.toLowerCase();
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <HeaderNav />

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.15] via-transparent to-rose-500/[0.15] blur-3xl" />

      {/* Main Content */}
      <div className="relative z-10">
        <div className="container max-w-7xl mx-auto pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
              Choose Your Plan
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Your job search, upgraded. Less noise. More clarity.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-6">
            {PRICING_TIERS.map((tier, index) => {
              const Icon = tier.icon;
              const isCurrent = isCurrentPlan(tier.name);

              return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="relative"
                >
                  {tier.popular && (
                    <div className="absolute -top-8 left-0 right-0 flex justify-center">
                      <Badge className={`bg-gradient-to-r ${tier.badgeGradient} text-white border-0 px-4 py-1`}>
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <Card
                    className={cn(
                      "relative h-full bg-white/5 backdrop-blur-sm overflow-hidden flex flex-col",
                      isCurrent
                        ? `${tier.borderColor} ${tier.bgColor} border-2`
                        : "border-white/10",
                      tier.popular && !isCurrent && "border-amber-500/30 shadow-xl shadow-amber-500/10"
                    )}
                  >
                    {/* Gradient overlay */}
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-10",
                        tier.gradient
                      )}
                    />

                    {isCurrent && (
                      <div className="absolute top-4 right-4 z-10">
                        <span className={`px-3 py-1 bg-gradient-to-r ${tier.badgeGradient} text-white text-xs font-bold rounded-full`}>
                          CURRENT
                        </span>
                      </div>
                    )}

                    <CardHeader className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn("h-6 w-6", tier.iconColor)} />
                        <CardTitle className="text-2xl text-white">{tier.name}</CardTitle>
                      </div>
                      <CardDescription className="text-white/60">
                        {tier.description}
                      </CardDescription>
                      <div className="mt-4">
                        <span className="text-3xl font-bold text-white">{tier.price}</span>
                        <span className="text-lg text-white/50">/month</span>
                      </div>
                    </CardHeader>

                    <CardContent className="relative flex-1">
                      <ul className="space-y-3">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <Check className={cn("h-5 w-5 flex-shrink-0 mt-0.5", tier.iconColor)} />
                            <span className="text-white/80">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="relative mt-auto">
                      {isCurrent ? (
                        <div className="w-full text-center p-3 bg-white/5 border border-white/10 rounded-lg">
                          <p className="text-white/60 text-sm">Currently Active</p>
                        </div>
                      ) : !isSignedIn && tier.name === "Pro" ? (
                        <SignUpButton mode="modal">
                          <Button
                            className={cn(
                              "w-full",
                              `bg-gradient-to-r ${tier.badgeGradient} hover:opacity-90`
                            )}
                          >
                            <Crown className="h-4 w-4 mr-2" />
                            Sign Up to Upgrade
                          </Button>
                        </SignUpButton>
                      ) : !isSignedIn && tier.name === "Free" ? (
                        <SignUpButton mode="modal">
                          <Button
                            className="w-full bg-white/10 hover:bg-white/20 border border-white/20"
                          >
                            Get Started Free
                          </Button>
                        </SignUpButton>
                      ) : (
                        <Button
                          onClick={() => handleSubscribe(tier.priceId, tier.name)}
                          disabled={loading !== null}
                          className={cn(
                            "w-full",
                            tier.popular
                              ? `bg-gradient-to-r ${tier.badgeGradient} hover:opacity-90`
                              : "bg-white/10 hover:bg-white/20 border border-white/20"
                          )}
                        >
                          {loading === tier.priceId && tier.priceId !== null ? (
                            <span className="flex items-center gap-2">
                              <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              Processing...
                            </span>
                          ) : (
                            <>
                              {tier.popular && <Crown className="h-4 w-4 mr-2" />}
                              {tier.cta}
                            </>
                          )}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 text-center"
          >
            <p className="text-white/60">
              Start free, upgrade when you&apos;re ready. No commitments, cancel anytime.
            </p>
            <p className="text-white/40 text-sm mt-2">
              Need help?{" "}
              <a
                href="/contact"
                className="text-white/60 underline hover:text-white/80 transition-colors"
              >
                Contact us
              </a>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
