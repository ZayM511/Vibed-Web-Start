"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Check,
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const [isHovering, setIsHovering] = useState(false);

  const proFeatures = [
    {
      icon: Zap,
      title: "Unlimited Job Scans",
      description: "Scan as many job postings as you need - no limits",
      highlight: true,
    },
    {
      icon: Shield,
      title: "Advanced Scam Detection",
      description: "AI-powered detection with 95%+ accuracy",
      highlight: true,
    },
    {
      icon: TrendingUp,
      title: "Ghost Job Detection",
      description: "Identify fake postings and save your time",
      highlight: false,
    },
    {
      icon: Sparkles,
      title: "Priority Support",
      description: "Get help when you need it most",
      highlight: false,
    },
    {
      icon: Crown,
      title: "Detailed Reports",
      description: "In-depth analysis with actionable insights",
      highlight: false,
    },
    {
      icon: Shield,
      title: "No Ads",
      description: "Clean, distraction-free experience",
      highlight: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-2 border-indigo-500/20">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header Section with Gradient */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4 text-white overflow-hidden">
          {/* Animated background shapes */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute -top-1/2 -right-1/2 w-full h-full bg-white rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                rotate: [90, 0, 90],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-white rounded-full blur-3xl"
            />
          </div>

          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center mb-1.5"
            >
              <div className="p-1 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Crown className="h-7 w-7 text-yellow-300" />
              </div>
            </motion.div>

            <DialogHeader className="space-y-1 text-center">
              <DialogTitle className="text-lg font-bold text-white">
                Unlock Unlimited Scans
              </DialogTitle>
              <DialogDescription className="text-white/90 text-sm text-center">
                You've reached your free scan limit. Upgrade to Pro for unlimited job scanning and advanced features.
              </DialogDescription>
            </DialogHeader>

            {/* Social Proof Badge */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-2 flex items-center justify-center gap-2"
            >
              <Badge className="bg-white/20 text-white border-white/30 px-3 py-1 backdrop-blur-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                Trusted by job seekers nationwide
              </Badge>
            </motion.div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="p-4 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2.5">
            {proFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-all min-h-[70px] ${
                  feature.highlight
                    ? "bg-indigo-500/10 border border-indigo-500/20"
                    : "bg-muted/50"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    feature.highlight
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <feature.icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    {feature.title}
                    {feature.highlight && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        Popular
                      </Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pricing Section */}
          <div className="mb-2.5 p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <h3 className="text-xl font-bold">Pro Plan</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Unlimited access and features
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$3.99</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  or $39.99/year (save 17%)
                </p>
              </div>
            </div>

            {/* Money-back guarantee badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-yellow-500" />
              <span>Cancel anytime, no questions asked</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-2.5">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
            >
              <Link href="/pricing" className="block">
                <Button
                  size="lg"
                  className="w-full text-base h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-md shadow-indigo-500/40 relative overflow-hidden group text-white flex items-center justify-center"
                >
                  <AnimatePresence>
                    {isHovering && (
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        exit={{ x: "100%" }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      />
                    )}
                  </AnimatePresence>
                  <span className="flex items-center justify-center">
                    <Crown className="mr-2 h-5 w-5 text-yellow-500" />
                    Upgrade to Pro Now
                  </span>
                </Button>
              </Link>
            </motion.div>

            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-2.5 pt-2.5 border-t border-border">
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                <span>Immediate access to all features</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                <span>Secure payment</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
