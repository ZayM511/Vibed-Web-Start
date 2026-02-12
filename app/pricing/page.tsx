"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { JobFiltrLogo } from "@/components/JobFiltrLogo";
import { Footer } from "@/components/Footer";

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    priceId: null,
    description: "Try JobFiltr with limited features",
    icon: Zap,
    iconColor: "text-cyan-400",
    gradient: "from-cyan-500/20 to-blue-500/20",
    features: [
      "3 scan trial",
      "Browser extension access",
      "Quick scan access",
      "Community reviews access",
      "Email support",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$7.99",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
    description: "Full protection for job seekers",
    icon: Crown,
    iconColor: "text-amber-400",
    gradient: "from-amber-500/20 to-orange-500/20",
    features: [
      "Unlimited scans",
      "Chrome extension access",
      "Advanced AI analysis",
      "Detailed scam reports",
      "Export scan results",
      "Email alerts",
      "Priority support",
      "Scan history tracking",
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
    // Free plan - redirect to filtr page (no sign in required)
    if (planName === "Free" || !priceId) {
      window.location.href = "/filtr";
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
        successUrl: `${siteUrl}/billing?success=true`,
        cancelUrl: `${siteUrl}/pricing?canceled=true`,
        // No free trial
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

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.15] via-transparent to-rose-500/[0.15] blur-3xl" />

      {/* Home Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-6 left-6 z-50"
      >
        <Button
          onClick={() => (window.location.href = "/")}
          variant="ghost"
          className="group relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-md border border-white/10 hover:border-white/20 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="font-medium">Home</span>
          </div>
        </Button>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10">
        <div className="container max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          {/* JobFiltr Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-12"
          >
            <JobFiltrLogo className="h-8 w-8 md:h-10 md:w-10" />
            <span className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-rose-300">
              JobFiltr
            </span>
          </motion.div>

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
              Protect yourself from job scams and ghost listings. Apply with confidence.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-6">
            {PRICING_TIERS.map((tier, index) => {
              const Icon = tier.icon;
              // Check if this is the user's current plan
              const isCurrentPlan = tier.name === "Free"
                ? !subscription?.plan || subscription?.plan === "free"
                : subscription?.plan === tier.name.toLowerCase();

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
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <Card
                    className={cn(
                      "relative h-full bg-white/5 backdrop-blur-sm border-white/10 overflow-hidden flex flex-col",
                      tier.popular && "border-amber-500/30 shadow-xl shadow-amber-500/10"
                    )}
                  >
                    {/* Gradient overlay */}
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-10",
                        tier.gradient
                      )}
                    />

                    <CardHeader className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={cn(
                            "p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
                          )}
                        >
                          <Icon className={cn("h-6 w-6", tier.iconColor)} />
                        </div>
                      </div>
                      <CardTitle className="text-2xl text-white">{tier.name}</CardTitle>
                      <CardDescription className="text-white/60">
                        {tier.description}
                      </CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-white">{tier.price}</span>
                        <span className="text-white/60 ml-2">/month</span>
                      </div>
                    </CardHeader>

                    <CardContent className="relative flex-1">
                      <ul className="space-y-3">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-white/80">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="relative mt-auto">
                      <Button
                        onClick={() => handleSubscribe(tier.priceId, tier.name)}
                        disabled={loading !== null || isCurrentPlan}
                        className={cn(
                          "w-full",
                          isCurrentPlan
                            ? tier.name === "Free"
                              ? "bg-gradient-to-r from-sky-300/40 to-blue-300/40 border border-sky-300/30 cursor-not-allowed"
                              : "bg-gradient-to-r from-amber-500/40 to-orange-500/40 border border-amber-500/30 cursor-not-allowed"
                            : tier.popular
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                            : "bg-white/10 hover:bg-white/20 border border-white/20"
                        )}
                      >
                        {loading === tier.priceId && tier.priceId !== null ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Processing...
                          </span>
                        ) : isCurrentPlan ? (
                          <span className={tier.name === "Free" ? "text-sky-100/70" : "text-amber-200/60"}>Currently Active</span>
                        ) : (
                          tier.cta
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* FAQ or Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 text-center"
          >
            <p className="text-white/60">
              All plans include a 30-day money-back guarantee. Cancel anytime.
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
