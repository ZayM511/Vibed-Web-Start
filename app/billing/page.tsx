"use client";

import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useSubscription, usePaymentMethods, usePaymentHistory } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const { isSignedIn } = useUser();
  const { subscription, isActive, isLoading } = useSubscription();
  // Trial features not yet implemented
  const isTrialing = false;
  const trialDaysRemaining: number = 0;
  const { defaultPaymentMethod } = usePaymentMethods();
  const { payments } = usePaymentHistory(10);
  const createPortalSession = useAction(api.stripe.createPortalSession);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for success param in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success") === "true") {
      setShowSuccess(true);
      toast.success("Subscription activated successfully!");
      // Clean up URL
      window.history.replaceState({}, "", "/billing");
    }
  }, []);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const result = await createPortalSession({
        returnUrl: `${siteUrl}/billing`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to open portal:", error);
      toast.error(error instanceof Error ? error.message : "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
            <p className="text-white/60 mb-4">Please sign in to view your billing information</p>
            <Button onClick={() => (window.location.href = "/")}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
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
        <div className="container max-w-5xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
              Billing & Subscription
            </h1>
            <p className="text-lg text-white/60">
              Manage your subscription, payment methods, and billing history
            </p>
          </motion.div>

          {/* Success Banner */}
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="bg-emerald-500/10 border-emerald-500/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <p className="text-emerald-100">Your subscription has been activated successfully!</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="grid gap-6">
            {/* Current Subscription */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Current Plan</CardTitle>
                      <CardDescription className="text-white/60">
                        Your subscription details and status
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleManageSubscription}
                      disabled={portalLoading || !isActive}
                      variant="outline"
                      className="border-white/20 hover:bg-white/10"
                    >
                      {portalLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Manage Subscription
                          <ExternalLink className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  ) : isActive ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-white/60">Plan</span>
                        <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0">
                          {subscription?.plan?.toUpperCase()}
                        </Badge>
                      </div>

                      {isTrialing && (
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Trial Status</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                              {trialDaysRemaining} {trialDaysRemaining === 1 ? "day" : "days"} remaining
                            </Badge>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-white/60">Status</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-400 capitalize">{subscription?.status}</span>
                        </div>
                      </div>

                      {subscription?.currentPeriodEnd && (
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Next Billing Date</span>
                          <span className="text-white">{formatDate(subscription.currentPeriodEnd)}</span>
                        </div>
                      )}

                      {subscription?.cancelAtPeriodEnd && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <div className="flex items-center gap-2 text-amber-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">
                              Your subscription will cancel on {formatDate(subscription.currentPeriodEnd!)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <XCircle className="h-12 w-12 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No active subscription</p>
                      <Button onClick={() => (window.location.href = "/pricing")}>
                        View Plans
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {defaultPaymentMethod ? (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/10">
                          <CreditCard className="h-5 w-5 text-white/60" />
                        </div>
                        <div>
                          <p className="text-white capitalize">
                            {defaultPaymentMethod.brand} •••• {defaultPaymentMethod.last4}
                          </p>
                          <p className="text-sm text-white/60">
                            Expires {defaultPaymentMethod.expiryMonth}/{defaultPaymentMethod.expiryYear}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/60 text-center py-4">No payment method on file</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Payment History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length > 0 ? (
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div
                          key={payment._id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-white/40" />
                            <div>
                              <p className="text-white text-sm">{payment.description}</p>
                              <p className="text-xs text-white/60">
                                {formatDate(payment.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">
                              {formatAmount(payment.amount, payment.currency)}
                            </p>
                            <Badge
                              variant={payment.status === "succeeded" ? "default" : "destructive"}
                              className={cn(
                                "text-xs",
                                payment.status === "succeeded"
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  : ""
                              )}
                            >
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/60 text-center py-4">No payment history</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
