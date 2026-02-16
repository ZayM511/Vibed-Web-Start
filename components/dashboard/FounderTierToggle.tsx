"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { RefreshCw, Shield, Crown, Sparkles } from "lucide-react";

export function FounderTierToggle() {
  const founderSettings = useQuery(api.subscriptions.getFounderSettings);
  const setOverride = useMutation(api.subscriptions.setFounderTierOverride);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!founderSettings?.isFounder) return null;

  const currentTier = founderSettings.tierOverride;
  const isPro = currentTier === "pro";

  const handleToggle = async () => {
    const newTier = isPro ? "free" : "pro";
    await setOverride({ tierOverride: newTier });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Small delay for visual feedback, then reload
    await new Promise((r) => setTimeout(r, 300));
    window.location.reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <div className="relative rounded-xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] to-yellow-500/[0.05] p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {/* Left: Title + description */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Founder Testing Mode
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Switch tiers to test Free vs Pro feature gating
              </p>
            </div>
          </div>

          {/* Right: Toggle + Refresh */}
          <div className="flex items-center gap-3">
            {/* Tier Toggle */}
            <button
              onClick={handleToggle}
              className="relative flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-1 py-1 transition-all hover:bg-white/10"
            >
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  !isPro
                    ? "bg-white/10 text-white"
                    : "text-white/40"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                Free
              </span>
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  isPro
                    ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black"
                    : "text-white/40"
                }`}
              >
                <Crown className="h-3 w-3" />
                Pro
              </span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
              title="Refresh to apply tier change"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
