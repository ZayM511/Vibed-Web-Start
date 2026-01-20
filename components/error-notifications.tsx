"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

/**
 * Real-time error notification component
 * Monitors for new errors and shows toast notifications
 */
export function ErrorNotifications() {
  const recentErrors = useQuery(api.extensionErrors.getRecentErrors, {});
  const previousErrorCount = useRef<number>(0);

  useEffect(() => {
    if (!recentErrors) return;

    const currentCount = recentErrors.length;

    // Skip first load to avoid showing notifications for existing errors
    if (previousErrorCount.current === 0) {
      previousErrorCount.current = currentCount;
      return;
    }

    // Check if there are new errors
    if (currentCount > previousErrorCount.current) {
      const latestError = recentErrors[0];

      // Show toast notification
      toast.error(`New Extension Error: ${latestError.errorType}`, {
        description: `${latestError.message} | Platform: ${latestError.platform}`,
        duration: 5000,
      });

      // Request browser notification permission if not granted
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }

      // Show browser notification if permitted
      if (Notification.permission === "granted") {
        new Notification("JobFiltr Extension Error", {
          body: `${latestError.errorType}: ${latestError.message.substring(0, 100)}`,
          icon: "/icons/icon128.png",
          tag: "extension-error",
          requireInteraction: false,
        });
      }

      previousErrorCount.current = currentCount;
    } else if (currentCount < previousErrorCount.current) {
      // Errors were deleted or resolved
      previousErrorCount.current = currentCount;
    }
  }, [recentErrors]);

  // This component doesn't render anything visible
  return null;
}
