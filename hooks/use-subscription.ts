"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Hook to check user's subscription status
 * Returns subscription details and helper flags
 */
export function useSubscription() {
  const subscriptionStatus = useQuery(api.subscriptions.getSubscriptionStatus);

  return {
    // Subscription data
    subscription: subscriptionStatus,

    // Convenience flags
    isActive: subscriptionStatus?.isActive ?? false,
    isPro: subscriptionStatus?.plan === "pro",
    isFree: subscriptionStatus?.plan === "free" || !subscriptionStatus?.plan,
    isCanceled: subscriptionStatus?.status === "canceled",
    isFounder: subscriptionStatus?.isFounder ?? false,

    // Loading state
    isLoading: subscriptionStatus === undefined,
  };
}

/**
 * Hook to get user's payment methods
 */
export function usePaymentMethods() {
  const paymentMethods = useQuery(api.subscriptions.getPaymentMethods);

  return {
    paymentMethods: paymentMethods ?? [],
    defaultPaymentMethod:
      paymentMethods?.find((pm) => pm.isDefault) ?? null,
    hasPaymentMethod: (paymentMethods?.length ?? 0) > 0,
    isLoading: paymentMethods === undefined,
  };
}

/**
 * Hook to get user's payment history
 */
export function usePaymentHistory(limit?: number) {
  const payments = useQuery(api.subscriptions.getPaymentHistory, {
    limit,
  });

  return {
    payments: payments ?? [],
    isLoading: payments === undefined,
  };
}

/**
 * Hook to get scan usage limits
 * Free users are limited to 3 scans
 */
export function useScanUsage() {
  const scanUsage = useQuery(api.subscriptions.getScanUsage);

  return {
    totalScans: scanUsage?.totalScans ?? 0,
    scansRemaining: scanUsage?.scansRemaining ?? 0,
    isLimitReached: scanUsage?.isLimitReached ?? false,
    isPro: scanUsage?.isPro ?? false,
    isUnlimited: scanUsage?.scansRemaining === -1,
    isLoading: scanUsage === undefined,
  };
}
