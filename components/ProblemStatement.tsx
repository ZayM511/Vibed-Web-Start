"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  ShieldAlert,
  Target,
} from "lucide-react";
import CountUp from "react-countup";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatItem {
  icon: LucideIcon;
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  color: string;
  source: string;
}

export function ProblemStatement() {
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

  // Chart data for fake job postings and scam postings trend over time
  const fakeJobPostingsTrendData = [
    { year: "2019", fakeJobs: 12, scamJobs: 8 },
    { year: "2020", fakeJobs: 18, scamJobs: 11 },
    { year: "2021", fakeJobs: 21, scamJobs: 14 },
    { year: "2022", fakeJobs: 24, scamJobs: 17 },
    { year: "2023", fakeJobs: 26, scamJobs: 19 },
    { year: "2024", fakeJobs: 27, scamJobs: 21 },
    { year: "2025", fakeJobs: 27.4, scamJobs: 23 },
  ];

  // Chart data for fake job posting purposes
  const fakeJobPurposesData = [
    { category: "Data Collection Only", percentage: 45 },
    { category: "No Intent to Hire", percentage: 38 },
    { category: "Market Research", percentage: 17 },
  ];

  // Custom tooltip for charts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/20 rounded-lg p-3 backdrop-blur-sm">
          <p className="text-white font-semibold mb-1">{label}</p>
          <p className="text-rose-400 text-sm">
            {payload[0].value}% {payload[0].name}
          </p>
        </div>
      );
    }
    return null;
  };

  const extendedStats: StatItem[] = [
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
  ];

  return (
    <div className="relative pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Main Problem Narrative */}
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
                The Job Market is{" "}
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-red-400">
                Broken
              </span>
            </h2>

            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-4xl mx-auto mb-8">
              In <span className="text-white font-semibold">2025</span>, nearly{" "}
              <span className="text-rose-400 font-semibold">1 in 3 companies</span>{" "}
              posted job listings that were{" "}
              <span className="text-rose-400 font-semibold">never real</span>.
              Fake postings. Jobs with no intent to hire. Listings created only to
              collect your data, build candidate databases, or make companies appear to be growing.
            </p>

            <p className="text-base md:text-lg text-white/60 leading-relaxed max-w-3xl mx-auto">
              The result? 67% of job seekers applying to positions that were never real.
              25% searching for over a year. 45% of fake postings exist solely for data collection.{" "}
              <span className="text-white/80 font-medium">
                Your time is valuable. Your mental health matters. Your career
                deserves real opportunities.
              </span>
            </p>
          </motion.div>

          {/* Statistics Grid - 6 Cards */}
          <motion.div
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
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
                    delay: 0.2 + index * 0.1,
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
                          {stat.prefix && (
                            <span className="text-2xl mr-1">{stat.prefix}</span>
                          )}
                          <CountUp
                            end={stat.value}
                            duration={2}
                            delay={0.5}
                            enableScrollSpy
                            scrollSpyOnce
                          />
                          {stat.suffix && (
                            <span className="text-3xl">{stat.suffix}</span>
                          )}
                        </div>
                      </div>

                      {/* Label */}
                      <p className="text-sm text-white/70 font-light leading-relaxed mb-3">
                        {stat.label}
                      </p>

                      {/* Source */}
                      <p className="text-xs text-white/40 font-light">
                        Source: {stat.source}
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

          {/* Interactive Charts Section */}
          <motion.div
            custom={2}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-20"
          >
            <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                The Data Tells the Story
              </span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Fake Job Postings Trend Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] border-white/10 backdrop-blur-sm h-full">
                  <CardContent className="p-6">
                    <p className="text-sm text-white/60 mb-4">
                      The steady rise of fake job listings and scam postings
                    </p>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-rose-400" />
                      Scam & Ghost Job Postings Trend (2019-2025)
                    </h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={fakeJobPostingsTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis
                          dataKey="year"
                          stroke="#ffffff60"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis
                          stroke="#ffffff60"
                          style={{ fontSize: "12px" }}
                          unit="%"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ paddingTop: "10px" }}
                          iconType="line"
                          formatter={(value) => <span style={{ color: "#ffffff", fontSize: "12px" }}>{value}</span>}
                        />
                        <Line
                          type="monotone"
                          dataKey="fakeJobs"
                          stroke="url(#gradientLineFake)"
                          strokeWidth={3}
                          dot={{ fill: "#f87171", r: 5 }}
                          activeDot={{ r: 7 }}
                          name="Ghost Job Postings"
                          animationDuration={2000}
                          animationBegin={0}
                        />
                        <Line
                          type="monotone"
                          dataKey="scamJobs"
                          stroke="url(#gradientLineScam)"
                          strokeWidth={3}
                          dot={{ fill: "#60a5fa", r: 5 }}
                          activeDot={{ r: 7 }}
                          name="Scam Job Postings"
                          animationDuration={2000}
                          animationBegin={200}
                        />
                        <defs>
                          <linearGradient
                            id="gradientLineFake"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop offset="0%" stopColor="#fb7185" />
                            <stop offset="100%" stopColor="#ef4444" />
                          </linearGradient>
                          <linearGradient
                            id="gradientLineScam"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Fake Job Purposes Chart */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] border-white/10 backdrop-blur-sm h-full">
                  <CardContent className="p-6">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-400" />
                      Why Ghost Job Postings Exist (2025)
                    </h4>
                    <p className="text-sm text-white/60 mb-4">
                      The real reasons companies post jobs with no intent to hire
                    </p>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={fakeJobPurposesData}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis
                          type="number"
                          stroke="#ffffff60"
                          style={{ fontSize: "12px" }}
                          unit="%"
                        />
                        <YAxis
                          type="category"
                          dataKey="category"
                          stroke="#ffffff60"
                          style={{ fontSize: "11px" }}
                          width={180}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="percentage"
                          fill="url(#gradientBar)"
                          radius={[0, 8, 8, 0]}
                          name="Percentage"
                          animationDuration={2000}
                          animationBegin={0}
                        />
                        <defs>
                          <linearGradient
                            id="gradientBar"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#f97316" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>

          {/* Closing Impact Statement - Redesigned */}
          <motion.div
            custom={2}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto"
          >
            <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-rose-500/10 border-white/20 backdrop-blur-xl overflow-hidden">
              <CardContent className="p-8 md:p-12">
                {/* Title */}
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-200">
                  This isn&apos;t just about numbers.
                </h3>

                {/* Main Text */}
                <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-2xl mx-auto mb-8">
                  It&apos;s about <span className="text-white font-semibold">your time</span>,{" "}
                  <span className="text-white font-semibold">your energy</span>,{" "}
                  <span className="text-white font-semibold">your mental health</span>,
                  and{" "}
                  <span className="text-white font-semibold">your future career</span>.
                  Every fake job listing is an opportunity stolen. Every ghosted
                  application is confidence lost.
                </p>

                {/* Visual Accent Bar */}
                <div className="h-1 w-24 mx-auto bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 rounded-full" />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
