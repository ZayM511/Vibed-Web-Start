"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ArrowLeft,
  UserPlus,
  Shield,
  Rocket,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HeaderNav } from "@/components/HeaderNav";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState(false);

  const joinWaitlist = useMutation(api.waitlist.joinWaitlist);
  const sendConfirmation = useAction(api.waitlistEmail.sendWaitlistConfirmation);
  const sendAdminNotification = useAction(api.waitlistEmail.sendWaitlistAdminNotification);
  const waitlistCount = useQuery(api.waitlist.getWaitlistCount);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const isFormValid = email.trim() !== "" && isValidEmail(email) && name.trim() !== "" && location.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await joinWaitlist({
        email: email.trim(),
        name: name.trim() || undefined,
        location: location.trim(),
        source: "waitlist_page",
      });

      if (!result.success && result.error === "already_exists") {
        setError("This email is already on our waitlist!");
        setIsSubmitting(false);
        return;
      }

      // Send confirmation email to user (don't block on failure)
      let emailFailed = false;
      try {
        await sendConfirmation({
          email: email.trim(),
          name: name.trim() || undefined,
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        emailFailed = true;
      }

      // Send admin notification (don't block on failure)
      try {
        await sendAdminNotification({
          email: email.trim(),
          name: name.trim() || undefined,
          location: location.trim(),
          totalCount: (waitlistCount || 0) + 1,
          source: "waitlist_page",
        });
      } catch (adminEmailError) {
        console.error("Failed to send admin notification:", adminEmailError);
      }

      if (emailFailed) {
        setEmailWarning(true);
      }

      setIsSubmitted(true);
      setEmail("");
      setName("");
      setLocation("");
    } catch (err) {
      console.error("Failed to join waitlist:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: Rocket,
      title: "Early Access",
      description: "Be the first to try JobFiltr when it launches",
    },
    {
      icon: Shield,
      title: "Risk Detection",
      description: "AI-powered scam, spam, & ghost job identification",
    },
    {
      icon: Filter,
      title: "User-Powered Filters",
      description: "Useful requested filters that empower the job seeker",
    },
  ];

  return (
    <>
      <HeaderNav />

      <div className="min-h-screen bg-background relative overflow-hidden pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.15] via-transparent to-rose-500/[0.15] blur-3xl" />

        {/* Home Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="fixed top-24 left-6 z-50"
        >
          <Button
            onClick={() => (window.location.href = "/")}
            variant="ghost"
            className="group relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-md border border-white/10 hover:border-white/20 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
              <span className="font-medium">Home</span>
            </div>
          </Button>
        </motion.div>

        <div className="relative z-10 container mx-auto px-4 md:px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 mb-6"
              >
                <UserPlus className="h-8 w-8 text-white" />
              </motion.div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-rose-300">
                  Join The Waitlist
                </span>
              </h1>
              <p className="text-white/60 text-lg max-w-xl mx-auto text-center">
                Be the first to know when JobFiltr launches
              </p>
            </div>

            {/* Benefits Grid */}
            {!isSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
              >
                {benefits.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <Card
                      key={benefit.title}
                      className="bg-white/5 border-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <CardContent className="p-4 text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 mb-3">
                          <Icon className="h-5 w-5 text-indigo-400" />
                        </div>
                        <h3 className="text-white font-semibold text-sm mb-1">
                          {benefit.title}
                        </h3>
                        <p className="text-white/50 text-xs">
                          {benefit.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>
            )}

            {/* Signup Form */}
            {!isSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Name */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          required
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError(null);
                          }}
                          placeholder="your.email@example.com"
                          required
                          className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                            email.trim() && !isValidEmail(email)
                              ? "border-red-500/50 focus:ring-red-500"
                              : "border-white/10 focus:ring-indigo-500"
                          }`}
                        />
                        {email.trim() && !isValidEmail(email) && (
                          <p className="text-red-400 text-xs mt-1">
                            Please enter a valid email address
                          </p>
                        )}
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">
                          Location *
                        </label>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g., San Francisco, CA"
                          required
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Error Message */}
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                        >
                          <p className="text-red-400 text-sm">{error}</p>
                        </motion.div>
                      )}

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        size="lg"
                        disabled={!isFormValid || isSubmitting}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Joining...
                          </span>
                        ) : (
                          "Join The Waitlist"
                        )}
                      </Button>

                      <p className="text-white/40 text-xs text-center">
                        We respect your privacy. No spam, ever.
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Success Message */}
            {isSubmitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30 backdrop-blur-sm">
                  <CardContent className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 mb-6">
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      You&apos;re on the list!
                    </h2>
                    <p className="text-white/70 mb-6">
                      {emailWarning
                        ? "Thanks for joining! We couldn\u0027t send a confirmation email right now, but don\u0027t worry \u2014 you\u0027re on the list. We\u0027ll notify you when JobFiltr is ready to launch."
                        : "Thanks for joining! Check your inbox for a confirmation email. We\u0027ll notify you as soon as JobFiltr is ready to launch."}
                    </p>
                    <Button
                      onClick={() => (window.location.href = "/")}
                      variant="outline"
                      className="border-white/20 hover:bg-white/5 text-white"
                    >
                      Back to Home
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </motion.div>
        </div>
      </div>
    </>
  );
}
