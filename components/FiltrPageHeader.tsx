"use client";

import { motion } from "framer-motion";
import { JobFiltrLogo } from "./JobFiltrLogo";
import { TypingAnimation } from "@/components/ui/typing-animation";

export function FiltrPageHeader() {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.3 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1] as const,
      },
    }),
  };

  return (
    <div className="mb-8 text-center">
      {/* Logo + Brand Name */}
      <motion.div
        custom={0}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="inline-flex items-center gap-3 mb-6"
      >
        <JobFiltrLogo className="h-8 w-8 md:h-10 md:w-10" />
        <span className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-rose-300">
          JobFiltr
        </span>
      </motion.div>

      {/* Main Title */}
      <motion.div
        custom={1}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-3 tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
            Filtr Your Job Search
          </span>
        </h1>
      </motion.div>

      {/* Typing Animation */}
      <motion.div
        custom={2}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="mb-4"
      >
        <TypingAnimation
          text="Scan Job Posting Now"
          duration={80}
          className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300"
        />
      </motion.div>

      {/* Description */}
      <motion.div
        custom={3}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
      >
        <p className="text-base md:text-lg text-white/50 font-light tracking-wide max-w-2xl mx-auto whitespace-nowrap">
          AI-powered analysis with web verification to detect scams, fake postings, and red flags
        </p>
      </motion.div>
    </div>
  );
}
