"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";
import {
  Building2,
  EyeOff,
  Clock,
  Calendar,
  CalendarDays,
  MapPin,
  Plus,
  Minus,
  Ban,
  DollarSign,
  BadgeCheck,
  CheckCircle,
  Zap,
  Globe,
  ShieldAlert,
  Ghost,
  Users,
  Bookmark,
  ListTodo,
  FileText,
  Mail,
  Briefcase,
  Filter,
  ScanLine,
  FolderOpen,
  MessageSquare,
  AlertCircle,
  Info,
} from "lucide-react";
import { ScreenshotSlideshow } from "@/components/ScreenshotSlideshow";
import { VideoShowcase } from "@/components/VideoShowcase";

// Platform logos (reused from HeroStatement.tsx)
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      fill="currentColor"
      d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z"
    />
  </svg>
);

const IndeedIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      fill="currentColor"
      d="M11.49 17.32c-.83 0-1.5-.67-1.5-1.5V9.14c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v6.68c0 .83-.67 1.5-1.5 1.5zm0-12.32c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"
    />
  </svg>
);

export function FeaturesSection() {
  const [showIndeedOnlyDialog, setShowIndeedOnlyDialog] = useState(false);

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

  const filterFeatures = [
    { icon: Building2, name: "Hide/Flag/Dim Staffing Firms", indeedOnly: false },
    { icon: EyeOff, name: "Hide Sponsored/Promoted", indeedOnly: false },
    { icon: Clock, name: "Early Applicant Jobs", indeedOnly: true },
    { icon: Calendar, name: "Job Age Display", indeedOnly: false },
    { icon: CalendarDays, name: "Job Posting Age", indeedOnly: false },
    { icon: MapPin, name: "True Remote Accuracy", indeedOnly: false },
    { icon: Plus, name: "Include Keywords", indeedOnly: false },
    { icon: Minus, name: "Exclude Keywords", indeedOnly: false },
    { icon: Ban, name: "Exclude Companies", indeedOnly: false },
    { icon: DollarSign, name: "Salary Range", indeedOnly: true },
    { icon: BadgeCheck, name: "Actively Recruiting Badges", indeedOnly: false },
    { icon: CheckCircle, name: "Auto-Hide Applied Jobs", indeedOnly: true },
    { icon: Zap, name: "Urgently Hiring Only", indeedOnly: true },
    { icon: Globe, name: "Visa Sponsorship Only", indeedOnly: false },
  ];

  const scannerFeatures = [
    { icon: ShieldAlert, name: "Scam/Spam Scanning" },
    { icon: Ghost, name: "Ghost Job Analysis" },
    { icon: Users, name: "Community Reported Warnings" },
    { icon: Bookmark, name: "Job Saving / Navigation" },
  ];

  const documentFeatures = [
    { icon: ListTodo, name: "To-Do List" },
    { icon: FileText, name: "Resumes Storage" },
    { icon: Mail, name: "Cover Letters Storage" },
    { icon: Briefcase, name: "Portfolio Storage" },
  ];

  return (
    <section className="relative pt-10 pb-24">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              <span className="text-white">Powerful </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
                Features & Filters
              </span>
            </h2>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-3xl mx-auto">
              Everything you need to take control of your job search
            </p>
          </motion.div>

          {/* Platform Detection Hero Card */}
          <motion.div
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] border-white/10 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
                  {/* Platform Icons */}
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500">
                      <LinkedInIcon className="h-10 w-10 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-white/30">+</span>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800">
                      <IndeedIcon className="h-10 w-10 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                      Automatic Platform Detection
                    </h3>
                    <p className="text-white/60 text-lg leading-relaxed">
                      Work seamlessly on Indeed and LinkedIn — JobFiltr
                      automatically detects when you&apos;re browsing job
                      listings on either platform and activates its powerful features.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category Cards Grid */}
          <motion.div
            custom={2}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Filters Card - Spans full height on left */}
            <motion.div
              whileHover={{ y: -8 }}
              className="relative group lg:row-span-2"
            >
              <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] border-white/10 backdrop-blur-sm h-full group-hover:border-white/30 transition-all duration-300">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500">
                      <Filter className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Filters</h3>
                  </div>

                  {/* Features Grid - 2 columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filterFeatures.map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <div
                          key={feature.name}
                          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                        >
                          <Icon className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                          <span className="text-sm">
                            {feature.name}
                            {feature.indeedOnly && (
                              <sup className="text-cyan-400/70 ml-0.5 text-[10px]">*</sup>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Indeed-only footnote */}
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <button
                      onClick={() => setShowIndeedOnlyDialog(true)}
                      className="text-xs text-white/40 hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-cyan-400/70">*</span>
                      <span>Indeed only</span>
                      <span className="text-white/20">&mdash;</span>
                      <span className="underline underline-offset-2 decoration-white/30">
                        Learn why
                      </span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Scanner Card */}
            <motion.div whileHover={{ y: -8 }} className="relative group">
              <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] border-white/10 backdrop-blur-sm h-full group-hover:border-white/30 transition-all duration-300">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500">
                      <ScanLine className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Scanner</h3>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3">
                    {scannerFeatures.map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <div
                          key={feature.name}
                          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                        >
                          <Icon className="h-4 w-4 text-amber-400 flex-shrink-0" />
                          <span className="text-sm">{feature.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Documents Card */}
            <motion.div whileHover={{ y: -8 }} className="relative group">
              <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] border-white/10 backdrop-blur-sm h-full group-hover:border-white/30 transition-all duration-300">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
                      <FolderOpen className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Documents</h3>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3">
                    {documentFeatures.map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <div
                          key={feature.name}
                          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                        >
                          <Icon className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-sm">{feature.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact CTA - Spans 2 columns under Scanner and Documents */}
            <motion.div
              whileHover={{ y: -4 }}
              className="relative group lg:col-span-2"
            >
              <Card className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border-white/10 backdrop-blur-sm h-full group-hover:border-white/30 transition-all duration-300">
                <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <MessageSquare className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      Want to report a company or request a feature?
                    </h3>
                  </div>

                  <Link href="/contact">
                    <Button
                      size="default"
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold mb-3"
                    >
                      Submit a Contact Form
                    </Button>
                  </Link>

                  <p className="text-white/50 text-sm max-w-md">
                    We&apos;re dedicated to making JobFiltr the best tool for
                    <br />
                    job seekers in today&apos;s market.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Video Showcase */}
          <motion.div
            custom={4}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <VideoShowcase />
          </motion.div>

          {/* Screenshot Slideshow */}
          <motion.div
            custom={5}
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <ScreenshotSlideshow />
          </motion.div>
        </div>
      </div>
      {/* Indeed-Only Explanation Dialog */}
      <Dialog open={showIndeedOnlyDialog} onOpenChange={setShowIndeedOnlyDialog}>
        <DialogContent className="bg-[#0c0c1a] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2.5">
              <Info className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              Why Some Filters Are Indeed-Only
            </DialogTitle>
            <DialogDescription className="text-white/50 text-sm">
              Platform differences affect feature availability
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 text-sm leading-relaxed mt-1">
            {/* LinkedIn's limitations */}
            <div className="space-y-2">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                LinkedIn&apos;s Technical Barriers
              </h4>
              <p className="text-white/60">
                LinkedIn aggressively restricts third-party browser extensions.
                Their platform frequently changes its underlying page structure,
                uses virtualized rendering that hides job data, and actively
                detects and blocks extension interactions.
              </p>
              <p className="text-white/60">
                This makes certain filters&mdash;like detecting early applicant
                status, salary ranges, applied jobs, and hiring urgency&mdash;unreliable
                or impossible to implement on LinkedIn.
              </p>
            </div>

            {/* Why Indeed works */}
            <div className="space-y-2">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                Why Indeed Works Better
              </h4>
              <p className="text-white/60">
                Indeed maintains a stable, consistent page structure and
                doesn&apos;t actively block browser extensions. This allows
                JobFiltr to reliably read job metadata and provide these
                advanced filtering features.
              </p>
            </div>

            {/* Positive: what works on both */}
            <div className="p-3.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <h4 className="text-cyan-400 font-semibold flex items-center gap-2 mb-1.5">
                <Zap className="h-4 w-4 flex-shrink-0" />
                Works on Both Platforms
              </h4>
              <p className="text-white/50 text-xs leading-relaxed">
                Most JobFiltr features work across both Indeed and LinkedIn,
                including keyword filtering, company exclusions, staffing firm
                detection, job age display, remote accuracy, ghost job analysis,
                and community reported warnings.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
