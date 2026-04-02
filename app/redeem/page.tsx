"use client";

import { useState } from "react";
import { CheckCircle2, Gift, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function RedeemPage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const formatCode = (raw: string) => {
    const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 16);
    const parts = clean.match(/.{1,4}/g) || [];
    return parts.join("-");
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(formatCode(e.target.value));
  };

  const LICENSE_STORAGE_KEY = "jobfiltr-appsumo-license-codes";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanCode = code.replace(/-/g, "");
    if (cleanCode.length !== 16) {
      setError("Please enter a valid 16-character license code.");
      return;
    }
    if (!email || !name || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    // Validate against License Code Manager storage
    try {
      const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
      if (!raw) {
        setError("Invalid license code. Please check your code and try again.");
        return;
      }
      const codes = JSON.parse(raw) as { code: string; status: string; redeemedBy?: string; redeemedAt?: number; createdAt: number }[];
      const match = codes.find((c) => c.code === code);

      if (!match) {
        setError("Invalid license code. Please check your code and try again.");
        return;
      }
      if (match.status === "redeemed") {
        setError("This code has already been redeemed.");
        return;
      }
      if (match.status === "revoked") {
        setError("This code has been revoked and is no longer valid.");
        return;
      }

      setLoading(true);
      // Simulate account creation delay
      await new Promise((r) => setTimeout(r, 1500));

      // Mark code as redeemed in localStorage
      const updated = codes.map((c) =>
        c.code === code
          ? { ...c, status: "redeemed", redeemedBy: email, redeemedAt: Date.now() }
          : c
      );
      localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(updated));

      setLoading(false);
      setStep("success");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950 to-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* JobFiltr Logo */}
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
            {/* AppSumo Logo */}
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-orange-400 tracking-tight">
              AppSumo
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Redeem Your License
          </h1>
          <p className="text-white/50 mt-2 text-sm">
            Enter your AppSumo code to activate JobFiltr Pro
          </p>
        </div>

        {step === "form" ? (
          <form
            onSubmit={handleSubmit}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl"
          >
            {/* License Code */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                AppSumo License Code
              </label>
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white font-mono text-center text-lg tracking-widest placeholder:text-white/20 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
                maxLength={19}
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Create Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 pr-12 text-white placeholder:text-white/30 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cyan-400/70 hover:text-cyan-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3.5 text-lg shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  Activate JobFiltr Pro
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-1.5 text-white/30 text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                Zero data collection
              </div>
              <div className="flex items-center gap-1.5 text-white/30 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Lifetime access
              </div>
            </div>
          </form>
        ) : (
          /* Success State */
          <div className="bg-white/5 backdrop-blur-xl border border-green-500/20 rounded-2xl p-8 text-center shadow-2xl">
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-9 w-9 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              You&apos;re All Set!
            </h2>
            <p className="text-white/60 text-sm mb-6">
              Your JobFiltr Pro license has been activated. Install the Chrome extension to get started.
            </p>
            <div className="space-y-3">
              <a
                href="https://chromewebstore.google.com/detail/jobfiltr-job-search-power/jddcgobdokioeapnopadlgfhcancmjfl"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 transition-all shadow-lg shadow-cyan-500/30"
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

            {/* Tier info */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-white/40 text-xs">
                Have multiple codes? Redeem them all to unlock higher tiers.
                Each additional code upgrades your plan.
              </p>
            </div>
          </div>
        )}

        {/* Tier Breakdown */}
        <div className="mt-8 rounded-xl bg-white/[0.03] border border-white/10 p-5">
          <h3 className="text-white/80 font-semibold text-sm mb-3 text-center">
            AppSumo Deal Tiers
          </h3>
          <div className="space-y-2.5">
            {[
              { codes: 1, price: "$39", desc: "Lifetime Pro for 1 user" },
              { codes: 2, price: "$69", desc: "Lifetime Pro + 1 gift license" },
              { codes: 3, price: "$99", desc: "Lifetime Pro + 2 gift licenses + all future features" },
            ].map((tier) => (
              <div
                key={tier.codes}
                className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-sm font-bold">
                    {tier.codes}x
                  </span>
                  <span className="text-white/60 text-sm">{tier.desc}</span>
                </div>
                <span className="text-white font-semibold text-sm">
                  {tier.price}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white/30 text-xs">
          Need help? Contact{" "}
          <a href="mailto:support@jobfiltr.app" className="text-cyan-400/60 hover:text-cyan-400 transition-colors">
            support@jobfiltr.app
          </a>
        </div>
      </div>
    </div>
  );
}
