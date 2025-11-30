"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Zap, Shield, TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  className?: string;
}

export function UpgradePrompt({ className }: UpgradePromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn("w-full max-w-4xl mx-auto", className)}
    >
      <Card className="relative overflow-hidden bg-white/5 backdrop-blur-sm border-white/10">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-rose-500/20 opacity-50" />

        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              rotate: [360, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-r from-rose-500/30 to-amber-500/30 rounded-full blur-3xl"
          />
        </div>

        <CardHeader className="relative text-center pb-6">
          <div className="mx-auto mb-6 p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 w-fit">
            <Lock className="h-8 w-8 text-indigo-300" />
          </div>

          <CardTitle className="text-3xl md:text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
            Unlock Job Scam Protection
          </CardTitle>

          <CardDescription className="text-lg text-white/60 max-w-2xl mx-auto">
            Protect yourself from job scams and ghost listings with AI-powered analysis
          </CardDescription>

          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30">
              <Zap className="h-3 w-3 mr-1" />
              7-Day Free Trial
            </Badge>
            <Badge className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30">
              <Shield className="h-3 w-3 mr-1" />
              Cancel Anytime
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-6">
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: Shield,
                title: "AI-Powered Scam Detection",
                description: "Advanced algorithms analyze job postings for red flags",
              },
              {
                icon: Zap,
                title: "Real-Time Analysis",
                description: "Get instant results on any job posting",
              },
              {
                icon: TrendingUp,
                title: "Community Insights",
                description: "Learn from experiences of other job seekers",
              },
              {
                icon: CheckCircle2,
                title: "Detailed Reports",
                description: "Comprehensive analysis with actionable insights",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10">
                  <feature.icon className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                  <p className="text-sm text-white/60">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4">
            <Button
              onClick={() => (window.location.href = "/pricing")}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold px-8"
            >
              Start Free Trial
            </Button>
            <Button
              onClick={() => (window.location.href = "/pricing")}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-white/20 hover:bg-white/10"
            >
              View Plans
            </Button>
          </div>

          <p className="text-center text-sm text-white/40">
            Join thousands of job seekers protecting themselves from scams
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
