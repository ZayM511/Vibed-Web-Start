"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Free tier limits
 */
const FREE_LIMITS = {
  excludeKeywords: 3,
  excludeCompanies: 1,
  monthlyAnalyses: 30,
};

interface ProStatus {
  isPro: boolean;
  tier: "free" | "pro";
  isLoading: boolean;
  expiresAt: string | null;
}

/**
 * Hook to check and manage pro subscription status
 * Works with both Next.js web app and can be adapted for Chrome extension
 */
export function usePro() {
  const [status, setStatus] = useState<ProStatus>({
    isPro: false,
    tier: "free",
    isLoading: true,
    expiresAt: null,
  });

  const fetchStatus = useCallback(async () => {
    // Check for cached status (5 minute cache)
    if (typeof window !== "undefined" && "localStorage" in window) {
      try {
        const cached = localStorage.getItem("proStatus");
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (Date.now() - parsedCache.cachedAt < 300000) {
            setStatus({
              isPro: parsedCache.isPro,
              tier: parsedCache.tier,
              isLoading: false,
              expiresAt: parsedCache.expiresAt,
            });
            return;
          }
        }
      } catch {
        // Ignore cache errors
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      setStatus((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const { data } = await supabase
        .from("user_tiers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tierData = data as any;
      const isPro =
        tierData?.tier === "pro" &&
        (tierData?.subscription_status === "active" ||
          (tierData?.current_period_end &&
            new Date(tierData.current_period_end) > new Date()));

      const newStatus: ProStatus = {
        isPro,
        tier: (tierData?.tier as "free" | "pro") || "free",
        isLoading: false,
        expiresAt: tierData?.current_period_end || null,
      };

      // Cache the status
      if (typeof window !== "undefined" && "localStorage" in window) {
        try {
          localStorage.setItem(
            "proStatus",
            JSON.stringify({ ...newStatus, cachedAt: Date.now() })
          );
        } catch {
          // Ignore storage errors
        }
      }

      setStatus(newStatus);
    } catch (error) {
      console.error("Error fetching pro status:", error);
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /**
   * Check if user can use include keywords (Pro only)
   */
  const canUseIncludeKeywords = useCallback(() => status.isPro, [status.isPro]);

  /**
   * Check if user can use saved templates (Pro only)
   */
  const canUseSavedTemplates = useCallback(() => status.isPro, [status.isPro]);

  /**
   * Get the exclude keyword limit for current tier
   */
  const getExcludeKeywordLimit = useCallback(
    () => (status.isPro ? Infinity : FREE_LIMITS.excludeKeywords),
    [status.isPro]
  );

  /**
   * Get the exclude company limit for current tier
   */
  const getExcludeCompanyLimit = useCallback(
    () => (status.isPro ? Infinity : FREE_LIMITS.excludeCompanies),
    [status.isPro]
  );

  /**
   * Get remaining monthly analyses
   */
  const getRemainingAnalyses = useCallback(async (): Promise<number> => {
    if (status.isPro) return Infinity;
    if (!isSupabaseConfigured || !supabase) return FREE_LIMITS.monthlyAnalyses;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return FREE_LIMITS.monthlyAnalyses;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.rpc as any)("get_analysis_count", {
        p_user_id: user.id,
      });

      const used = data ?? 0;
      return Math.max(0, FREE_LIMITS.monthlyAnalyses - used);
    } catch {
      return FREE_LIMITS.monthlyAnalyses;
    }
  }, [status.isPro]);

  /**
   * Increment the analysis count for the current month
   */
  const incrementAnalysisCount = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny.from("job_analysis_usage").upsert(
        {
          user_id: user.id,
          month_year: monthYear,
          analysis_count: 1,
        },
        {
          onConflict: "user_id,month_year",
        }
      );

      if (error) {
        // If upsert failed, try incrementing
        await supabaseAny.rpc("increment_analysis_count", {
          p_user_id: user.id,
          p_month_year: monthYear,
        });
      }

      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    ...status,
    refreshStatus: fetchStatus,
    canUseIncludeKeywords,
    canUseSavedTemplates,
    getExcludeKeywordLimit,
    getExcludeCompanyLimit,
    getRemainingAnalyses,
    incrementAnalysisCount,
    FREE_LIMITS,
  };
}

export { FREE_LIMITS };
