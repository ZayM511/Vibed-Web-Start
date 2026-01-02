"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

const POPUP_SESSION_KEY = "profileCompletionPopupShown";

export function ProfileCompletionDialog() {
  const router = useRouter();
  const { user } = useUser();
  const isProfileComplete = useQuery(api.users.isProfileComplete);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show if:
    // 1. User is signed in
    // 2. Profile is not complete
    // 3. Popup hasn't been shown this session
    if (user && isProfileComplete === false) {
      const popupShown = sessionStorage.getItem(POPUP_SESSION_KEY);

      if (!popupShown) {
        // Small delay for better UX
        const timer = setTimeout(() => {
          setIsOpen(true);
          sessionStorage.setItem(POPUP_SESSION_KEY, "true");
        }, 1500);

        return () => clearTimeout(timer);
      }
    }
  }, [user, isProfileComplete]);

  const handleComplete = () => {
    setIsOpen(false);
    // Navigate to settings tab
    router.push("/dashboard?tab=settings");
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10">
                <MapPin className="h-5 w-5 text-indigo-400" />
              </div>
              <DialogTitle className="text-xl text-white">Complete Your Profile</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-white/70 pt-2">
            Add your location to unlock the full experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <p className="text-sm text-white/80">
              By adding your location, you&apos;ll be able to:
            </p>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">✓</span>
                <span>Share your experiences through community reviews</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">✓</span>
                <span>Connect with other job seekers in your area</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">✓</span>
                <span>Get personalized job recommendations</span>
              </li>
            </ul>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
            <p className="text-xs text-white/60">
              <strong className="text-white/80">Privacy Note:</strong> You can choose to hide your location from public reviews at any time in your settings.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="border-white/20 text-white/70 hover:bg-white/5 hover:text-white"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleComplete}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
          >
            Complete Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
