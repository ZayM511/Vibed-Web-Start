"use client";

import { motion } from "framer-motion";
import { Clock, Sparkles, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Empty state component displayed when no scan history exists
 * Matches brand aesthetic with animations and gradients
 */
export function EmptyHistoryState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/5 border border-white/10 p-12"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10" />

      {/* Animated background gradient  */}
      <motion.div
        animate={{
          background: [
            "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 80%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-0"
      />

      <div className="relative flex flex-col items-center justify-center space-y-6">
        {/* Animated icon */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full blur-2xl opacity-30" />

          {/* Icon container */}
          <div className="relative rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 p-8 backdrop-blur-sm border-2 border-white/10 shadow-2xl">
            <Clock className="h-16 w-16 text-indigo-300" />
          </div>
        </motion.div>

        {/* Text content */}
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            No Scan History Yet
          </h3>
          <p className="text-white/60 max-w-md leading-relaxed">
            Your analyzed job postings will appear here. Start scanning to uncover red flags, verify legitimacy, and protect yourself from scams.
          </p>
        </div>

        {/* Floating badges */}
        <div className="flex flex-wrap gap-3 justify-center">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 px-4 py-2 shadow-lg">
              <Sparkles className="h-4 w-4 mr-1.5" />
              AI-Powered Analysis
            </Badge>
          </motion.div>

          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 2,
              delay: 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 px-4 py-2 shadow-lg">
              <Search className="h-4 w-4 mr-1.5" />
              Instant Results
            </Badge>
          </motion.div>
        </div>

        {/* Call to action hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-white/50 flex items-center gap-2"
        >
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/30" />
          <span>Switch to "New Scan" tab to get started</span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/30" />
        </motion.div>
      </div>
    </motion.div>
  );
}
