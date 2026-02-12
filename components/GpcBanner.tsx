"use client";

import { useEffect, useState } from "react";
import { Shield, Check } from "lucide-react";

// Extend Navigator interface to include Global Privacy Control
// This is a newer Web API that TypeScript doesn't have types for yet
declare global {
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

/**
 * Global Privacy Control (GPC) Banner Component
 *
 * This component detects if the user's browser has Global Privacy Control enabled
 * and displays a confirmation badge when detected. This is required under CCPA 2026
 * regulations to visibly confirm that opt-out preferences are being honored.
 *
 * GPC is a browser signal that indicates the user's preference to opt out of
 * the sale or sharing of their personal information.
 *
 * @see https://globalprivacycontrol.org/
 */
export function GpcBanner() {
  const [gpcEnabled, setGpcEnabled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if GPC is enabled in the browser
    // navigator.globalPrivacyControl is the standard GPC signal
    if (typeof window !== "undefined" && navigator.globalPrivacyControl === true) {
      // Check if user has previously dismissed this banner
      const wasDismissed = localStorage.getItem("gpc_banner_dismissed");
      if (!wasDismissed) {
        setGpcEnabled(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("gpc_banner_dismissed", "true");
  };

  if (!gpcEnabled || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-green-500/10 backdrop-blur-md border border-green-500/30 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-green-500/20 rounded-full">
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium text-sm">
                Opt-Out Preference Honored
              </span>
            </div>
            <p className="text-white/60 text-xs">
              We detected your Global Privacy Control signal and are honoring your opt-out preference. JobFiltr does not sell or share your personal information.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white/40 hover:text-white/60 transition-colors"
            aria-label="Dismiss"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * GPC Status Badge - A smaller inline indicator for use in footers or headers
 * Shows a compact badge when GPC is enabled
 */
export function GpcStatusBadge() {
  const [gpcEnabled, setGpcEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.globalPrivacyControl === true) {
      setGpcEnabled(true);
    }
  }, []);

  if (!gpcEnabled) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400">
      <Shield className="w-3 h-3" />
      <span>GPC Honored</span>
    </div>
  );
}
