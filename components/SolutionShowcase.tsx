"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Zap,
  Users,
  CheckCircle2,
  Search,
  TrendingDown,
  Lock,
  Brain,
  Download,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import { JobFilterLogo } from "@/components/JobFilterLogo";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { WAITLIST_MODE } from "@/lib/feature-flags";

// Custom alert diamond icon component
const AlertDiamondIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2"/>
  </svg>
);

export function SolutionShowcase() {
  const [showModal, setShowModal] = useState(false);
  const { isSignedIn } = useUser();

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: i * 0.1,
        ease: [0.25, 0.4, 0.25, 1] as const,
      },
    }),
  };

  const valueProp = [
    {
      icon: Shield,
      title: "Your Time Protected",
      description:
        "Spend your energy on opportunities that matter. JobFiltr helps filter out fake and unwanted postings so you focus only on real jobs.",
      color: "from-pink-500 to-rose-500",
      benefit: "Save hours every week",
    },
    {
      icon: Zap,
      title: "Instant Scam Detection",
      description:
        "JobFiltr analyzes job postings in seconds -- flagging fake listings, unrealistic requirements, and suspicious patterns before you waste your time or compromise your personal information.",
      color: "from-indigo-500 to-purple-500",
      benefit: "Apply with confidence",
    },
    {
      icon: Users,
      title: "Community Reported Insight",
      description:
        "Learn from other job seekers' experiences. Real reports, real warnings, real protection from those who've been there.",
      color: "from-purple-500 to-pink-500",
      benefit: "Collective wisdom at a glance",
    },
    {
      icon: AlertDiamondIcon,
      title: "Ghost Job Detection",
      description:
        "Identify deceptive postings designed to collect your data. JobFiltr flags suspicious patterns, unrealistic promises, and data harvesting schemes before you apply.",
      color: "from-amber-500 to-yellow-500",
      benefit: "Protect your personal data",
    },
    {
      icon: Brain,
      title: "Smart Pattern Recognition",
      description:
        "Advanced AI learns from 50+ scam indicators including salary ranges, job requirements, company verification, and posting patterns to spot red flags instantly.",
      color: "from-cyan-500 to-blue-500",
      benefit: "Smarter than human review",
    },
    {
      icon: Lock,
      title: "Zero Privacy Invasion",
      description:
        "No tracking. No data selling. No invasive monitoring. We analyze job postings, not you. Your job search stays completely private and secure.",
      color: "from-emerald-500 to-teal-500",
      benefit: "100% privacy guaranteed",
    },
  ];

  return (
    <div className="relative pt-8 pb-10">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent" />

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Transition Statement */}
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              <span className="text-white">
                What if you could{" "}
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                filter out the noise?
              </span>
            </h2>

            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-4xl mx-auto mb-8">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-rose-300 font-semibold">JobFiltr</span> is your
              companion for the modern job search. We provide optimal filters,
              spot red flags, and identify fake postings with no intent to hire —{" "}
              <span className="text-white font-bold">
                before you waste your time
              </span>
              .
            </p>
          </motion.div>

          {/* Value Propositions - 6 Cards */}
          <motion.div
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20"
          >
            {valueProp.map((prop, index) => {
              const Icon = prop.icon;
              return (
                <motion.div
                  key={prop.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    delay: 0.2 + index * 0.15,
                  }}
                  whileHover={{ y: -8 }}
                  className="relative group"
                >
                  <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] border-white/10 backdrop-blur-sm h-full group-hover:border-white/30 transition-all duration-300">
                    <CardContent className="p-8">
                      {/* Icon */}
                      <div
                        className={`mb-6 p-4 rounded-2xl bg-gradient-to-br ${prop.color} inline-flex group-hover:scale-110 transition-transform duration-300`}
                      >
                        <Icon className="h-8 w-8 text-white" />
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-white mb-4">
                        {prop.title}
                      </h3>

                      {/* Description */}
                      <p className="text-white/60 text-sm leading-relaxed mb-4">
                        {prop.description}
                      </p>

                      {/* Benefit Tag */}
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${prop.color} bg-opacity-20 border border-white/10`}
                      >
                        <TrendingDown className="h-3 w-3 text-white" />
                        <span className="text-xs text-white/80 font-medium">
                          {prop.benefit}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Solution Statement */}
          <motion.div
            custom={2}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-8 text-center"
          >
            <p className="text-xl md:text-2xl text-white/70 leading-relaxed max-w-4xl mx-auto">
              We built JobFiltr to cut through the noise so you can focus on{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent font-medium">
                real opportunities
              </span>{" "}
              that respect your time, energy, and career goals.
            </p>
          </motion.div>

          {/* Closing Statement */}
          <motion.div
            custom={3}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-lg md:text-xl text-white/50 leading-relaxed max-w-3xl mx-auto">
              Stop wasting countless hours job searching.{" "}
              Stop second-guessing every application.{" "}
              <span className="text-white/70 font-medium underline">
                Start applying with confidence.
              </span>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Get Started Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <Card className="w-full max-w-md bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-white/20 shadow-2xl pointer-events-auto">
                <CardContent className="p-8">
                  {/* Close Button */}
                  <button
                    onClick={() => setShowModal(false)}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Content based on auth status */}
                  {!isSignedIn ? (
                    // Not signed in
                    <div className="text-center">
                      <motion.div
                        animate={{
                          rotate: [0, 360],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                        }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 mb-6"
                      >
                        <JobFilterLogo className="h-8 w-8" />
                      </motion.div>

                      {WAITLIST_MODE ? (
                        <>
                          <h3 className="text-2xl font-bold text-white mb-3">
                            Coming Soon
                          </h3>
                          <p className="text-white/70 mb-8">
                            Join our waitlist to be the first to know when JobFiltr launches
                          </p>
                          <Link href="/waitlist" onClick={() => setShowModal(false)}>
                            <Button
                              size="lg"
                              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold"
                            >
                              Join The Waitlist
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <>
                          <h3 className="text-2xl font-bold text-white mb-3">
                            Get Started with JobFiltr
                          </h3>
                          <p className="text-white/70 mb-8">
                            Sign up or sign in to start protecting your job search
                          </p>
                          <div className="space-y-3">
                            <SignUpButton mode="modal">
                              <Button
                                size="lg"
                                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold"
                              >
                                Create Account
                              </Button>
                            </SignUpButton>
                            <SignInButton mode="modal">
                              <Button
                                size="lg"
                                variant="outline"
                                className="w-full border-white/20 hover:bg-white/5 text-white"
                              >
                                Sign In
                              </Button>
                            </SignInButton>
                          </div>
                          <p className="text-xs text-white/40 mt-6">
                            Free to use • No credit card required
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    // Signed in - show options
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 mb-6">
                        <CheckCircle2 className="h-8 w-8 text-white" />
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-3">
                        Choose How to Get Started
                      </h3>
                      <p className="text-white/70 mb-8">
                        Install the browser extension or try the web app
                      </p>

                      <div className="space-y-3">
                        <Button
                          size="lg"
                          onClick={() => {
                            setShowModal(false);
                            const extensionSection = document.getElementById('extension');
                            if (extensionSection) {
                              const offset = 80;
                              const elementPosition = extensionSection.getBoundingClientRect().top;
                              const offsetPosition = elementPosition + window.pageYOffset - offset;

                              window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                              });
                            }
                          }}
                          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold"
                        >
                          <Download className="mr-2 h-5 w-5" />
                          Get Browser Extension
                        </Button>

                        <Link href="/filtr" onClick={() => setShowModal(false)}>
                          <Button
                            size="lg"
                            variant="outline"
                            className="w-full border-white/20 hover:bg-white/5 text-white"
                          >
                            <Search className="mr-2 h-5 w-5" />
                            Try Web App
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
