"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ProfileCompletionBanner() {
  const router = useRouter();
  const isProfileComplete = useQuery(api.users.isProfileComplete);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if profile is complete, still loading, or dismissed
  if (isProfileComplete !== false || isDismissed) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">Complete Your Profile</h3>
            <p className="text-white/70 text-sm mb-3">
              Add your location to unlock all features, including submitting community reviews and accessing personalized job recommendations.
            </p>
            <Button
              onClick={() => router.push("/dashboard?tab=settings")}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              size="sm"
            >
              Complete Profile Now
            </Button>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-white/40 hover:text-white/70 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
