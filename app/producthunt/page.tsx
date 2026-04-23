"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Rocket, Crown, Shield, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const VALID_CODE = "JOBHUNT";

export default function ProductHuntPage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [codeValid, setCodeValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const stats = useQuery(api.productHunt.getStats);
  const createCheckout = useAction(api.stripe.createLifetimeCheckoutSession);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.toUpperCase().trim() === VALID_CODE) {
      setCodeValid(true);
      toast.success("Code accepted! Enter your email to continue.");
    } else {
      toast.error("Invalid promo code. Try again.");
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const result = await createCheckout({
        email: email.trim(),
        successUrl: `${siteUrl}/producthunt?success=true`,
        cancelUrl: `${siteUrl}/producthunt?canceled=true`,
      });

      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // Check URL params for success/cancel
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true" && !success) {
      setSuccess(true);
    }
  }

  const soldOut = stats?.soldOut ?? false;
  const remaining = stats?.remaining ?? 200;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-orange-950/20 to-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo & Branding */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon128.png"
              alt="JobFiltr"
              className="h-12 w-12 rounded-xl shadow-lg shadow-cyan-500/30"
            />
            <span className="text-2xl font-bold text-white tracking-tight">
              JobFiltr
            </span>
            <span className="text-white/30 mx-2">x</span>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#ff6154] to-[#da552f] flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-[#ff6154] tracking-tight">
              Product Hunt
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Lifetime Pro for $49
          </h1>
          <p className="text-white/60 text-lg">
            Launch day exclusive — no subscription, forever access
          </p>
        </motion.div>

        {/* Sold out or remaining counter */}
        {!success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            {soldOut ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <p className="text-red-400 font-semibold">This deal has sold out!</p>
                <p className="text-white/50 text-sm mt-1">Check back for future promotions.</p>
              </div>
            ) : (
              <div className="bg-[#ff6154]/10 border border-[#ff6154]/30 rounded-xl p-4 text-center">
                <p className="text-[#ff6154] font-semibold text-lg">
                  {remaining} of 200 spots remaining
                </p>
                <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff6154] to-[#da552f] transition-all duration-500"
                    style={{ width: `${((200 - remaining) / 200) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {success ? (
          /* Success State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-xl border border-green-500/30 rounded-2xl p-8 text-center shadow-2xl"
          >
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-9 w-9 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to JobFiltr Pro!
            </h2>
            <p className="text-white/60 mb-6">
              Your lifetime license is now active. Check your email for confirmation.
            </p>

            <div className="space-y-3">
              <a
                href="https://chromewebstore.google.com/detail/jobfiltr-job-search-power/jddcgobdokioeapnopadlgfhcancmjfl"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-lg bg-gradient-to-r from-[#ff6154] to-[#da552f] hover:opacity-90 text-white font-semibold py-3.5 transition-all shadow-lg shadow-orange-500/30"
              >
                Install Chrome Extension
              </a>
              <Link
                href="/"
                className="block w-full rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 py-3 transition-all"
              >
                Go to JobFiltr.app
              </Link>
            </div>
          </motion.div>
        ) : soldOut ? (
          /* Sold Out State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center"
          >
            <p className="text-white/60 mb-4">
              Subscribe for $7.99/month instead, or check our pricing page for other options.
            </p>
            <Link
              href="/pricing"
              className="inline-block rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white font-semibold py-3 px-8 transition-all"
            >
              View Pricing
            </Link>
          </motion.div>
        ) : !codeValid ? (
          /* Code Entry */
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCodeSubmit}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl"
          >
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Enter Promo Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="JOBHUNT"
                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white font-mono text-center text-xl tracking-widest placeholder:text-white/20 focus:border-[#ff6154] focus:outline-none focus:ring-1 focus:ring-[#ff6154]/50 transition-all"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-[#ff6154] to-[#da552f] hover:opacity-90 text-white font-semibold py-3.5 text-lg shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
            >
              Unlock Deal
              <ArrowRight className="h-5 w-5" />
            </button>

            <p className="text-center text-white/40 text-sm">
              Find the code on our Product Hunt page
            </p>
          </motion.form>
        ) : (
          /* Email Entry & Checkout */
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCheckout}
            className="bg-white/5 backdrop-blur-xl border border-[#ff6154]/30 rounded-2xl p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Code accepted: <span className="font-mono font-bold">{VALID_CODE}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#ff6154] focus:outline-none focus:ring-1 focus:ring-[#ff6154]/50 transition-all"
                autoFocus
              />
              <p className="text-white/40 text-xs mt-1.5">
                Use the same email you will sign in with
              </p>
            </div>

            {/* Price Summary */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Lifetime Pro Access</span>
                <div className="text-right">
                  <span className="text-white/40 line-through text-sm mr-2">$95.88/yr</span>
                  <span className="text-white font-bold text-xl">$49</span>
                </div>
              </div>
              <p className="text-green-400 text-sm mt-1">One-time payment, forever access</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#ff6154] to-[#da552f] hover:opacity-90 text-white font-semibold py-3.5 text-lg shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5" />
                  Get Lifetime Pro — $49
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-4 pt-2 text-white/30 text-xs">
              <div className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                Secure checkout
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                Instant access
              </div>
            </div>
          </motion.form>
        )}

        {/* Features */}
        {!success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 rounded-xl bg-white/[0.03] border border-white/10 p-5"
          >
            <h3 className="text-white/80 font-semibold text-sm mb-3 text-center">
              Included in Lifetime Pro
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-sm">
              {[
                "Ghost job detection (50+ signals)",
                "Unlimited scans",
                "LinkedIn & Indeed support",
                "Job age badges",
                "Staffing agency filters",
                "Scam & spam detection",
                "Keyword filters",
                "Community warnings",
                "All future updates",
                "Priority support",
              ].map((feature) => (
                <div key={feature} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#ff6154] flex-shrink-0 mt-0.5" />
                  <span className="text-white/60">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-white/30 text-xs">
          Need help?{" "}
          <a href="mailto:support@jobfiltr.app" className="text-[#ff6154]/60 hover:text-[#ff6154] transition-colors">
            support@jobfiltr.app
          </a>
        </div>
      </div>
    </div>
  );
}
