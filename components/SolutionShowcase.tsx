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
  ChartBar,
  ArrowRight,
  TrendingUp,
  Download,
  X,
  Database,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TypingAnimation } from "@/components/ui/typing-animation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { JobFilterLogo } from "@/components/JobFilterLogo";
import { CountingNumber } from "@/components/ui/counting-number";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";

// Custom alert diamond icon component
const AlertDiamondIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2"/>
  </svg>
);

export function SolutionShowcase() {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const { isSignedIn } = useUser();

  const phrases = [
    "Stop wasting time on fake jobs",
    "Find real opportunities faster",
    "Protect your job search today",
    "Join thousands of smart job seekers",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % phrases.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [phrases.length]);

  const ctaStats = [
    { icon: Shield, value: "95%", label: "Detection accuracy" },
    { icon: TrendingUp, value: "50+", label: "Red flags detected" },
    { icon: Zap, value: "<3s", label: "Analysis time" },
    { icon: CheckCircle2, value: "10,000+", label: "Jobs scanned" },
  ];

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
      icon: Zap,
      title: "Instant Scam Detection",
      description:
        "JobFiltr analyzes job postings in seconds -- flagging fake listings, unrealistic requirements, and suspicious patterns before you waste your time or compromise your personal information.",
      color: "from-indigo-500 to-purple-500",
      benefit: "Save hours every week",
    },
    {
      icon: Users,
      title: "Community-Powered Intelligence",
      description:
        "Learn from thousands of job seekers' experiences. Real reviews, real warnings, real protection from those who've been there.",
      color: "from-purple-500 to-pink-500",
      benefit: "Collective wisdom at your fingertips",
      comingSoon: true,
    },
    {
      icon: Shield,
      title: "Your Time Protected",
      description:
        "Spend your energy on opportunities that matter. JobFiltr helps filter out the fake postings so you focus only on real jobs.",
      color: "from-pink-500 to-rose-500",
      benefit: "Apply with confidence",
    },
    {
      icon: Lock,
      title: "Zero Privacy Invasion",
      description:
        "No tracking. No data selling. No invasive monitoring. We analyze job postings, not you. Your job search stays completely private and secure.",
      color: "from-emerald-500 to-teal-500",
      benefit: "100% privacy guaranteed",
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
      icon: AlertDiamondIcon,
      title: "Spam Job Detection",
      description:
        "Identify deceptive postings designed to collect your data. JobFiltr flags suspicious patterns, unrealistic promises, and data harvesting schemes before you apply.",
      color: "from-amber-500 to-yellow-500",
      benefit: "Protect your personal data",
    },
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Paste Job URL or Description",
      description: "Copy and paste any job posting link or text",
      icon: Search,
    },
    {
      step: "2",
      title: "AI Analyzes in Seconds",
      description: "Our AI scans 50+ scam indicators instantly",
      icon: Zap,
    },
    {
      step: "3",
      title: "Get Clear Risk Assessment",
      description: "See red flags, confidence scores, and recommendations",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="relative pt-8 pb-24">
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
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/80">
                What if you could{" "}
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                filter out the noise
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/80">
                ?
              </span>
            </h2>

            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-4xl mx-auto mb-8">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-rose-300 font-semibold">JobFiltr</span> is your
              AI-powered companion for the modern job search. We detect scams,
              identify fake postings with no intent to hire, and flag red flags—
              <span className="text-indigo-400 font-semibold">
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
                      {/* Coming Soon Badge */}
                      {(prop as any).comingSoon && (
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-semibold text-white shadow-lg">
                          Coming soon
                        </div>
                      )}

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
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-3xl mx-auto">
              We built JobFiltr to cut through the noise—so you can focus on{" "}
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
            className="text-center mb-20"
          >
            <p className="text-lg md:text-xl text-white/50 leading-relaxed max-w-2xl mx-auto">
              Stop second-guessing every application.{" "}
              <span className="text-white/70 font-medium">
                Start applying with confidence.
              </span>
            </p>
          </motion.div>

          {/* Animated CTA Section */}
          <motion.div
            custom={4}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-12 mb-20 relative overflow-hidden"
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0">
              <motion.div
                animate={{
                  background: [
                    "radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
                    "radial-gradient(circle at 80% 50%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)",
                    "radial-gradient(circle at 50% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
                    "radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
                  ],
                }}
                transition={{
                  duration: 10,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="absolute inset-0"
              />
            </div>

            <Card className="relative z-10 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-rose-500/10 border-white/20 backdrop-blur-xl overflow-hidden">
              {/* Animated border glow */}
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 opacity-30 blur-2xl"
              />

              <CardContent className="relative z-10 p-10 md:p-16">
                {/* Sparkle icon */}
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 mb-8"
                >
                  <JobFilterLogo className="h-8 w-8" />
                </motion.div>

                {/* Typing Animation */}
                <div className="mb-8 pb-4 overflow-visible">
                  <TypingAnimation
                    key={currentPhrase}
                    text={phrases[currentPhrase]}
                    duration={60}
                    className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-200 pb-2"
                  />
                </div>

                <p className="text-white/70 text-lg md:text-xl mb-10 max-w-3xl mx-auto text-center">
                  JobFiltr uses advanced AI to analyze job postings in real-time.
                  Detect scams, identify fake postings with no intent to hire, and save hours every week.{" "}
                  <span className="text-white font-semibold">
                    Start protecting your job search now — for free.
                  </span>
                </p>

                {/* CTA Button */}
                <div className="flex justify-center mb-12">
                  <Button
                    size="lg"
                    onClick={() => setShowModal(true)}
                    className="group relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 hover:from-indigo-600 hover:via-purple-600 hover:to-indigo-600 text-white px-12 py-8 text-xl font-bold shadow-2xl shadow-purple-500/50 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-purple-500/70 cursor-pointer"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      Get Started Today
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                        }}
                      >
                        <ArrowRight className="h-6 w-6" />
                      </motion.div>
                    </span>
                    {/* Shine effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{
                        x: ['-200%', '200%'],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* How It Works Section */}
          <motion.div
            custom={3}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-16"
          >
            <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                How It Works
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {howItWorks.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.6,
                      delay: 0.3 + index * 0.15,
                    }}
                    className="relative"
                  >
                    <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full hover:bg-white/10 transition-colors">
                      <CardContent className="p-6 text-center">
                        {/* Step Number */}
                        <div className="text-6xl font-bold text-white/10 mb-4">
                          {item.step}
                        </div>

                        {/* Icon */}
                        <div className="mb-4">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
                            <Icon className="h-8 w-8 text-white" />
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-lg font-semibold text-white mb-2">
                          {item.title}
                        </h4>

                        {/* Description */}
                        <p className="text-sm text-white/60">
                          {item.description}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Connecting Line (except for last item) */}
                    {index < howItWorks.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent" />
                    )}
                  </motion.div>
                );
              })}
            </div>
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
                    // Not signed in - show auth options
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
