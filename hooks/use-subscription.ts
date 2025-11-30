"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Hook to check user's subscription status
 * Returns subscription details and helper flags
 */
export function useSubscription() {
  const subscriptionStatus = useQuery(api.subscriptions.getSubscriptionStatus);

  // TEMPORARY: Override for testing (12 hours) - bypass all restrictions
  const BYPASS_MODE = true;

  return {
    // Subscription data
    subscription: subscriptionStatus,

    // Convenience flags - BYPASS MODE ACTIVE
    isActive: BYPASS_MODE ? true : (subscriptionStatus?.isActive ?? false),
    isPro: BYPASS_MODE ? true : (subscriptionStatus?.plan === "pro"),
    isFree: BYPASS_MODE ? false : (subscriptionStatus?.plan === "free" || !subscriptionStatus?.plan),
    isCanceled: BYPASS_MODE ? false : (subscriptionStatus?.status === "canceled"),

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

  // TEMPORARY: Override for testing (12 hours) - unlimited scans
  const BYPASS_MODE = true;

  return {
    totalScans: scanUsage?.totalScans ?? 0,
    scansRemaining: BYPASS_MODE ? -1 : (scanUsage?.scansRemaining ?? 0), // -1 = unlimited
    isLimitReached: BYPASS_MODE ? false : (scanUsage?.isLimitReached ?? false),
    isPro: BYPASS_MODE ? true : (scanUsage?.isPro ?? false),
    isUnlimited: BYPASS_MODE ? true : (scanUsage?.scansRemaining === -1),
    isLoading: scanUsage === undefined,
  };
}
