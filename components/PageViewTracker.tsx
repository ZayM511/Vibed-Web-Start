"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";

function getVisitorId(): string {
  const key = "jobfiltr-visitor-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function PageViewTracker() {
  const recordPageView = useMutation(api.pageViews.recordPageView);
  const { userId } = useAuth();

  useEffect(() => {
    // Deduplicate: skip if same path tracked within 5 seconds
    const dedupKey = "jobfiltr-pv-dedup";
    const now = Date.now();
    const path = window.location.pathname;
    const prev = sessionStorage.getItem(dedupKey);

    if (prev) {
      try {
        const { p, t } = JSON.parse(prev);
        if (p === path && now - t < 5000) return;
      } catch {
        // ignore parse errors
      }
    }

    sessionStorage.setItem(dedupKey, JSON.stringify({ p: path, t: now }));

    const visitorId = getVisitorId();
    const referrer = document.referrer || undefined;

    recordPageView({
      visitorId,
      path,
      referrer,
      userId: userId ?? undefined,
    }).catch(() => {
      // Silently ignore tracking failures — non-critical
    });
  }, [recordPageView, userId]);

  return null;
}
