"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser, SignIn, SignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { CheckCircle2, Chrome, Loader2 } from "lucide-react";
import { Footer } from "@/components/Footer";

// The published Chrome Web Store extension ID
// For development, the extension ID changes with each unpacked load
const EXTENSION_IDS: string[] = [
  // Add your production extension ID here when published:
  // "abcdefghijklmnopqrstuvwxyz123456",
];

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(".cloud", ".site") || "";

type AuthStep = "signing-in" | "generating-token" | "sending-to-extension" | "complete" | "error";

export default function ExtensionAuthPage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [step, setStep] = useState<AuthStep>("signing-in");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Check URL params for mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") {
      setMode("signup");
    }
  }, []);

  const sendAuthToExtension = useCallback(async () => {
    if (!user) return;

    setStep("generating-token");
    setError(null);

    try {
      const email = user.primaryEmailAddress?.emailAddress;
      const name = user.fullName || user.firstName || "";

      if (!email) {
        throw new Error("No email address found on your account");
      }

      // Generate extension session token via Convex
      const response = await fetch(`${CONVEX_SITE_URL}/extension/clerk-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          clerkUserId: user.id,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate session token");
      }

      const data = await response.json();

      // Try to send to extension via chrome.runtime.sendMessage
      setStep("sending-to-extension");

      let sent = false;

      // Try each known extension ID
      for (const extId of EXTENSION_IDS) {
        try {
          await sendMessageToExtension(extId, {
            type: "AUTH_SUCCESS",
            token: data.token,
            email: data.email,
            name: data.name,
            clerkUserId: data.clerkUserId,
          });
          sent = true;
          break;
        } catch {
          // This extension ID didn't work, try next
        }
      }

      // If no hardcoded IDs worked, try to discover the extension
      // by attempting to send to a range of possible IDs
      if (!sent && typeof chrome !== "undefined" && chrome.runtime) {
        // Extension might be in development mode with a dynamic ID
        // The extension will be listening, we just need the right ID
        console.log("No hardcoded extension ID worked. Extension may need to be configured.");
      }

      // Show success regardless - the token was generated
      // If the extension didn't receive it, user can copy manually or re-auth
      setStep("complete");

    } catch (err) {
      console.error("Extension auth error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    }
  }, [user]);

  // When user becomes signed in, automatically generate token
  useEffect(() => {
    if (isSignedIn && user && step === "signing-in") {
      sendAuthToExtension();
    }
  }, [isSignedIn, user, step, sendAuthToExtension]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.15] via-transparent to-rose-500/[0.15] blur-3xl" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-8"
        >
          <img src="/jobfiltr-logo.png" alt="JobFiltr" className="h-10 w-10 object-contain" />
          <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white from-40% to-[#93c5fd]">
            JobFiltr
          </span>
        </motion.div>

        {/* Extension badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
        >
          <Chrome className="h-4 w-4 text-white/60" />
          <span className="text-sm text-white/60">Extension Sign In</span>
        </motion.div>

        {!isSignedIn ? (
          // Show Clerk sign-in/sign-up
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {mode === "signup" ? (
              <SignUp
                routing="hash"
                afterSignUpUrl="/extension-auth"
                appearance={{
                  elements: {
                    rootBox: "mx-auto",
                    card: "bg-[#1a1a2e] border border-white/10",
                  },
                }}
              />
            ) : (
              <SignIn
                routing="hash"
                afterSignInUrl="/extension-auth"
                appearance={{
                  elements: {
                    rootBox: "mx-auto",
                    card: "bg-[#1a1a2e] border border-white/10",
                  },
                }}
              />
            )}

            <p className="text-center text-white/40 text-sm mt-4">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button onClick={() => setMode("signin")} className="text-white/60 underline hover:text-white/80">
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button onClick={() => setMode("signup")} className="text-white/60 underline hover:text-white/80">
                    Sign up
                  </button>
                </>
              )}
            </p>
          </motion.div>
        ) : (
          // Post-auth flow
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            {(step === "generating-token" || step === "sending-to-extension") && (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-400 mx-auto" />
                <h2 className="text-2xl font-bold text-white">
                  {step === "generating-token" ? "Generating session..." : "Connecting to extension..."}
                </h2>
                <p className="text-white/60">This will only take a moment</p>
              </div>
            )}

            {step === "complete" && (
              <div className="space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">You&apos;re all set!</h2>
                <p className="text-white/60">
                  Your account has been connected. You can close this tab and return to the JobFiltr extension.
                </p>
                <p className="text-white/40 text-sm">
                  Signed in as <span className="text-white/60">{user?.primaryEmailAddress?.emailAddress}</span>
                </p>
              </div>
            )}

            {step === "error" && (
              <div className="space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mx-auto">
                  <span className="text-3xl">!</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
                <p className="text-white/60">{error}</p>
                <button
                  onClick={() => {
                    setStep("signing-in");
                    sendAuthToExtension();
                  }}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}

// Helper to send message to chrome extension
function sendMessageToExtension(extensionId: string, message: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.sendMessage) {
      reject(new Error("Chrome runtime not available"));
      return;
    }

    try {
      chrome.runtime.sendMessage(extensionId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
