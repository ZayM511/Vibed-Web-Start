"use client";

import { motion } from "framer-motion";

import { HeroStatement } from "./HeroStatement";

export function JobFiltrHero() {
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
    <div className="relative z-10 container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-5xl mx-auto text-center">
        {/* Logo + Brand Name */}
        <motion.div
          custom={0}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-1 mb-6"
        >
          <img src="/jobfiltr-logo.png" alt="JobFiltr" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
          <span className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white from-40% to-[#93c5fd]">
            JobFiltr
          </span>
        </motion.div>

        {/* Main Title - Smaller than before */}
        <motion.div
          custom={1}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-3 tracking-tight">
            <span className="text-white">
              Filtr Your Job Search
            </span>
          </h1>
        </motion.div>

        {/* Subtitle tagline */}
        <motion.div
          custom={2}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="mb-12"
        >
          <p className="text-lg md:text-xl lg:text-2xl font-semibold tracking-wide">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-rose-300">
              Your Job Search, Upgraded
            </span>
          </p>
        </motion.div>

        {/* Expanded Hero Statement with Statistics */}
        <HeroStatement />
      </div>
    </div>
  );
}
