"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Clock, TrendingUp, Users, ShieldAlert, Ghost, Ban, XCircle, Target } from "lucide-react";
import { StatsPulse } from "./StatsPulse";
import { CountingNumber } from "./ui/counting-number";
import { SlotMachineNumber } from "./ui/slot-machine-number";

export function HeroStatement() {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.3 + i * 0.15,
        ease: [0.25, 0.4, 0.25, 1] as const,
      },
    }),
  };

  const extendedStats = [
    {
      icon: AlertTriangle,
      value: 27.4,
      suffix: "%",
      label: "of job listings on LinkedIn are fake postings with no intention to hire",
      color: "from-rose-400 to-red-500",
      source: "ResumeUp.AI 2025",
    },
    {
      icon: Clock,
      value: 45,
      suffix: "%",
      label: "of fake job postings are created solely for data collection purposes",
      color: "from-amber-400 to-orange-500",
      source: "Job Market Research 2025",
    },
    {
      icon: TrendingUp,
      value: 38,
      suffix: "%",
      label: "of companies post jobs they never intend to fill to appear growing",
      color: "from-violet-400 to-purple-500",
      source: "Greenhouse 2025",
    },
    {
      icon: ShieldAlert,
      value: 67,
      suffix: "%",
      label: "of job seekers report applying to positions that were never real",
      color: "from-red-400 to-rose-500",
      source: "Job Market Research 2025",
    },
    {
      icon: Users,
      value: 25,
      suffix: "%",
      label: "of job candidates have been searching for over a year due to fake postings",
      color: "from-cyan-400 to-blue-500",
      source: "Fortune 2025",
    },
    {
      icon: Target,
      value: 17,
      suffix: "%",
      label: "of fake job ads exist purely for market research and candidate database building",
      color: "from-orange-400 to-amber-500",
      source: "TPD Hiring Survey 2025",
    },
    {
      icon: Ban,
      value: 23,
      suffix: "%",
      label: "of all job postings in 2025 are confirmed scams designed to steal personal information",
      color: "from-blue-400 to-indigo-500",
      source: "Job Market Research 2025",
    },
    {
      icon: XCircle,
      value: 33,
      suffix: "%",
      label: "of all job listings posted are either fake or scams combined",
      color: "from-fuchsia-400 to-pink-500",
      source: "Industry Analysis 2025",
    },
  ];

  return (
    <div className="relative max-w-4xl mx-auto px-4">
      {/* Animated pulse background */}
      <StatsPulse />

      {/* Main Statement - Original Style Design */}
      <motion.div
        custom={3}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="mb-12 space-y-8 text-center mt-32"
      >
        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/80">
              The Job Market Has a{" "}
            </span>
            <span className="relative inline-block text-white">
              Problem
              <motion.span
                className="absolute bottom-0 left-0 h-0.5 bg-white"
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
              />
            </span>
          </h2>
        </motion.div>

        {/* Problem Statement - Three Types of Bad Job Postings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-8 text-center">
            Every day, thousands of job seekers waste hours applying to positions that will never lead anywhere. The job market is flooded with three major threats:
          </p>

          <div className="space-y-4">
            {/* Scam Jobs */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/20 to-rose-500/20 flex-shrink-0">
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-white mb-1 text-xl">
                  <span className="bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                    Scam Jobs
                  </span>
                </h4>
                <p className="text-white/70 text-base leading-relaxed">
                  Fraudulent postings designed to steal your personal information, charge fees for fake training, or trick you into money laundering schemes. These criminals prey on desperate job seekers.
                </p>
              </div>
            </div>

            {/* Spam Jobs */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="h-5 w-5 text-amber-400">
                  <path fill="currentColor" d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2"/>
                </svg>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-white mb-1 text-xl">
                  <span className="bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    Spam Jobs
                  </span>
                </h4>
                <p className="text-white/70 text-base leading-relaxed">
                  Postings created solely to harvest your data, build candidate databases for resale, or collect market intelligence. Your resume becomes a product sold to third parties without your knowledge.
                </p>
              </div>
            </div>

            {/* Ghost Jobs */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex-shrink-0">
                <Ghost className="h-5 w-5 text-violet-400" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-white mb-1 text-xl">
                  <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                    Ghost Jobs
                  </span>
                </h4>
                <p className="text-white/70 text-base leading-relaxed">
                  Job listings companies post with no intention of hiring. Created to make the company appear to be growing, maintain visibility, or gauge market conditions—wasting countless hours of your time.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Second Paragraph with Large "In 2025" */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border border-white/10 p-8 max-w-4xl mx-auto"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full blur-3xl" />

          <div className="relative space-y-6">
            <p className="text-lg md:text-xl text-white/70 leading-relaxed">
              In{" "}
              <span className="text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent inline-block mx-2">
                2025
              </span>
              , it&apos;s estimated that nearly{" "}
              <span className="text-rose-400 font-semibold text-2xl md:text-3xl">
                1 in <SlotMachineNumber finalNumber={3} className="inline-block" /> companies
              </span>{" "}
              posted job listings that were{" "}
              <span className="text-white font-semibold">never legitimate</span>.
            </p>

            <p className="text-base md:text-lg text-white/60 leading-relaxed">
              Listings created only to{" "}
              <span className="text-white font-medium">collect your data</span>,{" "}
              <span className="text-white font-medium">build candidate databases</span>, or{" "}
              <span className="text-white font-medium">make companies appear to be growing</span>.
            </p>
          </div>
        </motion.div>

        {/* Third Paragraph - Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="space-y-6"
        >
          <p className="text-base md:text-lg text-white/50 leading-relaxed max-w-3xl mx-auto">
            The result?{" "}
            <span className="text-rose-400 font-semibold">
              <CountingNumber number={67} inView={false} inViewOnce={true} inViewMargin="-100px" className="inline-block" />%
            </span> of job seekers applying to positions that were never really hiring in the first place.{" "}
            <span className="text-amber-400 font-semibold">
              <CountingNumber number={25} inView={false} inViewOnce={true} inViewMargin="-100px" className="inline-block" />%
            </span> searching for over a year.{" "}
            <span className="text-violet-400 font-semibold">
              <CountingNumber number={45} inView={false} inViewOnce={true} inViewMargin="-100px" className="inline-block" />%
            </span> of fake postings exist solely for data collection.
          </p>

          <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-3xl mx-auto font-medium">
            Your time is too valuable for that. Your mental health matters. Your career deserves real opportunities.
          </p>
        </motion.div>
      </motion.div>

      {/* Run The Numbers Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl md:text-5xl font-bold">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-rose-300">
            Run The Numbers
          </span>
        </h2>
      </motion.div>

      {/* Statistics Grid - 8 Cards */}
      <motion.div
        custom={4}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
      >
        {extendedStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: 0.8 + index * 0.1,
                ease: [0.25, 0.4, 0.25, 1] as const,
              }}
              whileHover={{ scale: 1.03 }}
              className="relative group"
            >
              {/* Card */}
              <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-6 overflow-hidden transition-all duration-300 group-hover:border-white/30 h-full">
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-[0.1] transition-opacity duration-300`}
                />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div
                    className={`mb-4 p-3 rounded-xl bg-gradient-to-br ${stat.color} inline-flex`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Value */}
                  <div className="mb-3">
                    <div
                      className={`text-4xl md:text-5xl font-bold bg-gradient-to-br ${stat.color} bg-clip-text text-transparent inline-flex items-baseline`}
                    >
                      <CountingNumber
                        number={stat.value}
                        fromNumber={0}
                        inView={false}
                        inViewOnce={true}
                        inViewMargin="-100px"
                        decimalPlaces={stat.value % 1 !== 0 ? 1 : 0}
                        className="inline-block"
                      />
                      {stat.suffix && (
                        <span className="text-3xl">{stat.suffix}</span>
                      )}
                    </div>
                  </div>

                  {/* Label */}
                  <p className="text-sm text-white/70 font-light leading-relaxed">
                    {stat.label}
                  </p>
                </div>

                {/* Subtle glow effect */}
                <div
                  className={`absolute -inset-1 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-30 blur-2xl transition-opacity duration-300 -z-10`}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Chart Visualizations - 2 Charts */}
      <motion.div
        custom={5}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16 mb-16"
      >
        {/* Chart 1: Enhanced Line Graph - Scam & Ghost Jobs Trend 2020-2025 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-8 overflow-hidden"
        >
          <div className="mb-8">
            <div className="text-center mb-5">
              <h3 className="text-xl font-bold text-white mb-2">Harmful Job Posting Trends</h3>
            </div>

            {/* Subtitle and Legend on same line */}
            <div className="flex justify-between items-start">
              <p className="text-sm text-white/50 ml-11">Yearly Growth from 2020-2025</p>

              {/* Enhanced Legend */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-rose-500 to-red-500 shadow-lg shadow-red-500/50"></div>
                  <span className="text-xs text-white/70 font-medium">Scam Jobs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 shadow-lg shadow-purple-500/50"></div>
                  <span className="text-xs text-white/70 font-medium">Ghost Jobs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 shadow-lg shadow-amber-500/50"></div>
                  <span className="text-xs text-white/70 font-medium">Spam Jobs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Line Graph */}
          <div className="relative h-48">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-5 flex flex-col justify-between text-xs font-medium text-white/60">
              <span>45%</span>
              <span>30%</span>
              <span>15%</span>
              <span>0%</span>
            </div>

            {/* Graph Area */}
            <div className="absolute left-11 right-3 top-0 bottom-5">
              {/* Enhanced Grid lines with gradient */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-full h-px bg-gradient-to-r from-white/5 via-white/10 to-white/5"></div>
                ))}
              </div>

              {/* Vertical Grid lines */}
              <div className="absolute inset-0 flex justify-between">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-px h-full bg-gradient-to-b from-white/5 via-white/10 to-white/5"></div>
                ))}
              </div>

              {/* Data Points and Lines */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                <defs>
                  {/* Gradient for Scam Jobs Line */}
                  <linearGradient id="scamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(244, 63, 94, 0.3)" />
                    <stop offset="100%" stopColor="rgba(244, 63, 94, 0)" />
                  </linearGradient>

                  {/* Gradient for Ghost Jobs Line */}
                  <linearGradient id="ghostGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
                    <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
                  </linearGradient>

                  {/* Gradient for Spam Jobs Line */}
                  <linearGradient id="spamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(245, 158, 11, 0.3)" />
                    <stop offset="100%" stopColor="rgba(245, 158, 11, 0)" />
                  </linearGradient>
                </defs>

                {/* Area fill under Scam Jobs Line - 2020-2025 data based on FTC reports */}
                <motion.path
                  d="M 0,70 L 100,56 L 200,35 L 300,18 L 400,8 L 500,3 L 500,100 L 0,100 Z"
                  fill="url(#scamGradient)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.5 }}
                />

                {/* Area fill under Ghost Jobs Line - 2020-2025 data from ResumeBuilder/ResumeUp.AI */}
                <motion.path
                  d="M 0,62 L 100,62 L 200,53 L 300,33 L 400,33 L 500,9 L 500,100 L 0,100 Z"
                  fill="url(#ghostGradient)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.7 }}
                />

                {/* Scam Jobs Line (Red) - 2020: 10%, 2021: 15%, 2022: 22%, 2023: 27%, 2024: 30%, 2025: 32% */}
                <motion.path
                  d="M 0,70 L 100,56 L 200,35 L 300,18 L 400,8 L 500,3"
                  fill="none"
                  stroke="rgb(244, 63, 94)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 8, delay: 0.3, ease: "easeOut" }}
                  style={{ filter: "drop-shadow(0 0 4px rgba(244, 63, 94, 0.6))" }}
                  whileHover={{ strokeWidth: 4 }}
                />

                {/* Ghost Jobs Line (Purple) - 2020: 13%, 2021: 13%, 2022: 16%, 2023: 23%, 2024: 23%, 2025: 27% */}
                <motion.path
                  d="M 0,62 L 100,62 L 200,53 L 300,33 L 400,33 L 500,9"
                  fill="none"
                  stroke="rgb(139, 92, 246)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 8, delay: 0.5, ease: "easeOut" }}
                  style={{ filter: "drop-shadow(0 0 4px rgba(139, 92, 246, 0.6))" }}
                  whileHover={{ strokeWidth: 4 }}
                />

                {/* Spam Jobs Line (Gold) - 2020: 8%, 2021: 12%, 2022: 18%, 2023: 25%, 2024: 35%, 2025: 45% */}
                <motion.path
                  d="M 0,74 L 100,63 L 200,47 L 300,26 L 400,13 L 500,0"
                  fill="none"
                  stroke="rgb(245, 158, 11)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 8, delay: 0.7, ease: "easeOut" }}
                  style={{ filter: "drop-shadow(0 0 4px rgba(245, 158, 11, 0.6))" }}
                  whileHover={{ strokeWidth: 4 }}
                />

              </svg>

              {/* Data Point Dots - Separate SVG layer with aspect ratio preservation for perfect circles */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 100" preserveAspectRatio="none">
                {/* Scam Jobs Dots (2021-2025) - Exact coordinates from path: M 0,70 L 100,56 L 200,35 L 300,18 L 400,8 L 500,3 */}
                {/* Each dot appears faster in sequence: line takes 8s, dots appear every 0.65s */}
                {[
                  { x: 100, y: 56, delay: 0.3 + 0.65 }, // 2021 - appears at 0.95s
                  { x: 200, y: 35, delay: 0.3 + 1.3 },  // 2022 - appears at 1.6s
                  { x: 300, y: 18, delay: 0.3 + 1.95 }, // 2023 - appears at 2.25s
                  { x: 400, y: 8, delay: 0.3 + 2.6 },   // 2024 - appears at 2.9s
                  { x: 500, y: 3, delay: 0.3 + 3.25 },  // 2025 - appears at 3.55s
                ].map((point, i) => (
                  <motion.ellipse
                    key={`scam-${i}`}
                    cx={point.x}
                    cy={point.y}
                    rx="8"
                    ry="3"
                    fill="rgb(244, 63, 94)"
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.15, delay: point.delay, ease: "easeOut" }}
                    style={{ filter: "drop-shadow(0 0 3px rgba(244, 63, 94, 0.8))" }}
                  />
                ))}

                {/* Ghost Jobs Dots (2021-2025) - Exact coordinates from path: M 0,62 L 100,62 L 200,53 L 300,33 L 400,33 L 500,9 */}
                {/* Each dot appears faster in sequence: line takes 8s, dots appear every 0.65s */}
                {[
                  { x: 100, y: 62, delay: 0.5 + 0.65 }, // 2021 - appears at 1.15s
                  { x: 200, y: 53, delay: 0.5 + 1.3 },  // 2022 - appears at 1.8s
                  { x: 300, y: 33, delay: 0.5 + 1.95 }, // 2023 - appears at 2.45s
                  { x: 400, y: 33, delay: 0.5 + 2.6 },  // 2024 - appears at 3.1s
                  { x: 500, y: 9, delay: 0.5 + 3.25 },  // 2025 - appears at 3.75s
                ].map((point, i) => (
                  <motion.ellipse
                    key={`ghost-${i}`}
                    cx={point.x}
                    cy={point.y}
                    rx="8"
                    ry="3"
                    fill="rgb(139, 92, 246)"
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.15, delay: point.delay, ease: "easeOut" }}
                    style={{ filter: "drop-shadow(0 0 3px rgba(139, 92, 246, 0.8))" }}
                  />
                ))}

                {/* Spam Jobs Dots (2021-2025) - Exact coordinates from path: M 0,74 L 100,63 L 200,47 L 300,26 L 400,13 L 500,0 */}
                {/* Each dot appears faster in sequence: line takes 8s, dots appear every 0.65s */}
                {[
                  { x: 100, y: 63, delay: 0.7 + 0.65 }, // 2021 - appears at 1.35s
                  { x: 200, y: 47, delay: 0.7 + 1.3 },  // 2022 - appears at 2.0s
                  { x: 300, y: 26, delay: 0.7 + 1.95 }, // 2023 - appears at 2.65s
                  { x: 400, y: 13, delay: 0.7 + 2.6 },  // 2024 - appears at 3.3s
                  { x: 500, y: 0, delay: 0.7 + 3.25 },  // 2025 - appears at 3.95s
                ].map((point, i) => (
                  <motion.ellipse
                    key={`spam-${i}`}
                    cx={point.x}
                    cy={point.y}
                    rx="8"
                    ry="3"
                    fill="rgb(245, 158, 11)"
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.15, delay: point.delay, ease: "easeOut" }}
                    style={{ filter: "drop-shadow(0 0 3px rgba(245, 158, 11, 0.8))" }}
                  />
                ))}
              </svg>
            </div>

            {/* Enhanced X-axis labels */}
            <div className="absolute left-11 right-0 bottom-0 text-xs font-medium text-white/60">
              <span className="absolute left-0 -ml-3">2020</span>
              <span className="absolute left-[20%] -translate-x-1/2">2021</span>
              <span className="absolute left-[40%] -translate-x-1/2 -ml-1">2022</span>
              <span className="absolute left-[60%] -translate-x-1/2 -ml-2">2023</span>
              <span className="absolute left-[80%] -translate-x-1/2 -ml-2">2024</span>
              <span className="absolute left-[100%] -translate-x-1/2 -ml-3">2025</span>
            </div>
          </div>

          {/* Statistics Summary */}
          <div className="mt-8 pt-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold bg-gradient-to-r from-rose-400 to-red-400 bg-clip-text text-transparent flex items-baseline justify-center gap-0">
                +<CountingNumber number={220} inView={false} inViewOnce={true} inViewMargin="-100px" className="inline-block" /><span>%</span>
              </div>
              <div className="text-xs text-white/50 mt-1">Scam</div>
              <div className="text-xs text-white/50">Increase</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent flex items-baseline justify-center gap-0">
                +<CountingNumber number={108} inView={false} inViewOnce={true} inViewMargin="-100px" className="inline-block" /><span>%</span>
              </div>
              <div className="text-xs text-white/50 mt-1">Ghost Increase</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent flex items-baseline justify-center gap-0">
                +<CountingNumber number={463} inView={false} inViewOnce={true} inViewMargin="-100px" className="inline-block" /><span>%</span>
              </div>
              <div className="text-xs text-white/50 mt-1">Spam Increase</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white flex items-baseline justify-center gap-0">
                <CountingNumber number={104} inView={false} inViewOnce={true} inViewMargin="-100px" className="inline-block" /><span>%</span>
              </div>
              <div className="text-xs text-white/50 mt-1">Combined (2025)</div>
            </div>
          </div>
        </motion.div>

        {/* Chart 2: Spam Jobs & Data Selling Growth */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-8"
        >
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-2 text-center">Data Harvesting Impact</h3>
            <p className="text-sm text-white/50 text-center">Spam Jobs & Personal Data Selling (2020-2025)</p>
          </div>

          {/* Bar Graph */}
          <div className="relative h-64">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs font-medium text-white/60">
              <span>50%</span>
              <span>40%</span>
              <span>30%</span>
              <span>20%</span>
              <span>10%</span>
              <span>0%</span>
            </div>

            {/* Graph Area */}
            <div className="absolute left-12 right-0 top-0 bottom-8">
              {/* Horizontal Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-full h-px bg-gradient-to-r from-white/5 via-white/10 to-white/5"></div>
                ))}
              </div>

              {/* Bars Container - Grouped bars for each year */}
              <div className="absolute inset-0 flex items-end justify-around gap-3 px-2">
                {[
                  { year: "2020", spam: 8, dataSelling: 5 },
                  { year: "2021", spam: 12, dataSelling: 8 },
                  { year: "2022", spam: 18, dataSelling: 12 },
                  { year: "2023", spam: 25, dataSelling: 18 },
                  { year: "2024", spam: 35, dataSelling: 28 },
                  { year: "2025", spam: 45, dataSelling: 40 },
                ].map((item, index) => (
                  <div key={item.year} className="flex-1 flex gap-1.5 items-end justify-center min-w-0" style={{ height: '100%' }}>
                    {/* Spam Jobs Bar (Gold) */}
                    <div className="flex-1 relative" style={{ height: `${(item.spam / 50) * 100}%` }}>
                      <motion.div
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1.2, delay: 0.3 + index * 0.1, ease: "easeOut" }}
                        className="w-full h-full bg-gradient-to-t from-amber-500 to-yellow-500 rounded-t-lg shadow-lg origin-bottom"
                        style={{
                          filter: `drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))`
                        }}
                      >
                        {/* Value on top of bar */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                          className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold text-amber-400 whitespace-nowrap"
                        >
                          <CountingNumber
                            number={item.spam}
                            inView={true}
                            inViewOnce={true}
                            className="inline-block"
                          />%
                        </motion.div>
                      </motion.div>
                    </div>

                    {/* Data Selling Bar (Red/Rose) */}
                    <div className="flex-1 relative" style={{ height: `${(item.dataSelling / 50) * 100}%` }}>
                      <motion.div
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1.2, delay: 0.4 + index * 0.1, ease: "easeOut" }}
                        className="w-full h-full bg-gradient-to-t from-red-500 to-rose-500 rounded-t-lg shadow-lg origin-bottom"
                        style={{
                          filter: `drop-shadow(0 0 8px rgba(244, 63, 94, 0.4))`
                        }}
                      >
                        {/* Value on top of bar */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
                          className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold text-red-400 whitespace-nowrap"
                        >
                          <CountingNumber
                            number={item.dataSelling}
                            inView={true}
                            inViewOnce={true}
                            className="inline-block"
                          />%
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="absolute left-12 right-0 bottom-0 flex justify-around gap-2 px-2 text-xs text-white/60 font-medium">
              <div className="flex-1 text-center">2020</div>
              <div className="flex-1 text-center">2021</div>
              <div className="flex-1 text-center">2022</div>
              <div className="flex-1 text-center">2023</div>
              <div className="flex-1 text-center">2024</div>
              <div className="flex-1 text-center">2025</div>
            </div>
          </div>

          {/* Legend & Summary */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex justify-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gradient-to-r from-amber-500 to-yellow-500"></div>
                <span className="text-xs text-white/70">Spam Jobs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-rose-500"></div>
                <span className="text-xs text-white/70">Data Selling</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent">
                <CountingNumber number={45} fromNumber={0} inViewOnce={true} inViewMargin="-100px" className="inline-block" />%
              </div>
              <div className="text-xs text-white/50 mt-1">of fake postings exist for data harvesting (2025)</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
