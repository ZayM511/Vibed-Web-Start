"use client";

import { motion } from "framer-motion";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Zap,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import { JobFilterLogo } from "@/components/JobFilterLogo";

export function AnimatedBottomCTA() {
  const [currentPhrase, setCurrentPhrase] = useState(0);

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

  const stats = [
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

  return (
    <div className="relative py-32 overflow-hidden">
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

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
            }}
            animate={{
              y: [
                Math.random() * 100 + "%",
                Math.random() * 100 + "%",
                Math.random() * 100 + "%",
              ],
              x: [
                Math.random() * 100 + "%",
                Math.random() * 100 + "%",
                Math.random() * 100 + "%",
              ],
            }}
            transition={{
              duration: 10 + Math.random() * 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Main CTA Card */}
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-rose-500/10 border-white/20 backdrop-blur-xl overflow-hidden relative">
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
                <div className="mb-8">
                  <TypingAnimation
                    key={currentPhrase}
                    text={phrases[currentPhrase]}
                    duration={60}
                    className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-200"
                  />
                </div>

                <p className="text-white/70 text-lg md:text-xl mb-10 max-w-3xl">
                  JobFiltr uses advanced AI to analyze job postings in real-time.
                  Detect scams, identify fake postings with no intent to hire, and save hours every week.{" "}
                  <span className="text-white font-semibold">
                    Start protecting your job search now — completely free.
                  </span>
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <Link href="/filtr">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-10 py-7 text-lg font-semibold shadow-2xl shadow-indigo-500/50 group"
                    >
                      Scan Your First Job
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                        }}
                      >
                        <ArrowRight className="ml-2 h-5 w-5 inline" />
                      </motion.div>
                    </Button>
                  </Link>

                  <Link href="#extension">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/30 hover:bg-white/10 text-white px-10 py-7 text-lg font-semibold backdrop-blur-sm"
                    >
                      Get Browser Extension
                    </Button>
                  </Link>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/10">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                        className="text-center"
                      >
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 mb-3">
                          <Icon className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">
                          {stat.value}
                        </div>
                        <div className="text-xs text-white/60">
                          {stat.label}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-white/40 text-sm mb-4">
              Trusted by job seekers nationwide
            </p>
            <div className="flex flex-wrap justify-center gap-8 items-center">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="flex items-center gap-2 text-white/60 text-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                AI-Powered Protection
              </motion.div>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 3,
                  delay: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="flex items-center gap-2 text-white/60 text-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                100% privacy guaranteed
              </motion.div>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 3,
                  delay: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="flex items-center gap-2 text-white/60 text-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Instant Results
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
