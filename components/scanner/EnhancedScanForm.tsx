"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, Ghost, Scan, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Custom SVG icons
const ScamSpottingIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2"/>
  </svg>
);

const AIPoweredInsightsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>
  </svg>
);

interface EnhancedScanFormProps {
  onManualScan: (data: { jobInput: string; context?: string; scanMode?: "quick" | "deep" }) => Promise<void>;
  onGhostJobScan: (data: { jobInput: string; jobUrl?: string; context?: string; scanMode?: "quick" | "deep" }) => Promise<void>;
  isScanning: boolean;
}

export function EnhancedScanForm({ onManualScan, isScanning }: EnhancedScanFormProps) {
  const [scanMode, setScanMode] = useState<"quick" | "deep">("quick");

  // Form fields
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobUrl.trim()) {
      return;
    }

    const data = {
      jobInput: jobUrl.trim(),
      jobUrl: jobUrl.trim(),
      context: undefined,
      scanMode,
    };

    // Always use manual scan handler as it properly supports both quick and deep modes
    await onManualScan(data);

    // Reset form
    setJobUrl("");
    setJobText("");
    setPositionTitle("");
    setCompanyName("");
  };

  const isFormValid = jobUrl.trim().length > 0;

  const scanTypeVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: [0.25, 0.4, 0.25, 1] as const,
      },
    }),
  };

  const features = [
    { icon: Shield, text: "Scam Detection", color: "text-indigo-400", isCustom: false },
    { icon: Ghost, text: "Ghost Job Analysis", color: "text-purple-400", isCustom: false },
    { icon: ScamSpottingIcon, text: "Spam Spotting", color: "text-amber-400", isCustom: true },
    { icon: AIPoweredInsightsIcon, text: "AI-Powered Insights", color: "text-sky-400", isCustom: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] as const }}
    >
      <Card className="backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl shadow-black/20">
        <CardHeader className="space-y-4 pb-6">
          {/* Animated Header */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex items-start justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="h-6 w-6 text-indigo-300">
                    <path fill="currentColor" d="M2 5V3q0-.825.588-1.412T4 1h2q.425 0 .713.288T7 2t-.288.713T6 3H4v2q0 .425-.288.713T3 6t-.712-.288T2 5m18 0V3h-2q-.425 0-.712-.288T17 2t.288-.712T18 1h2q.825 0 1.413.588T22 3v2q0 .425-.288.713T21 6t-.712-.288T20 5M2 21v-2q0-.425.288-.712T3 18t.713.288T4 19v2h2q.425 0 .713.288T7 22t-.288.713T6 23H4q-.825 0-1.412-.587T2 21m18 2h-2q-.425 0-.712-.288T17 22t.288-.712T18 21h2v-2q0-.425.288-.712T21 18t.713.288T22 19v2q0 .825-.587 1.413T20 23M7 18h10V6H7zm0 2q-.825 0-1.412-.587T5 18V6q0-.825.588-1.412T7 4h10q.825 0 1.413.588T19 6v12q0 .825-.587 1.413T17 20zm3-10h4q.425 0 .713-.288T15 9t-.288-.712T14 8h-4q-.425 0-.712.288T9 9t.288.713T10 10m0 3h4q.425 0 .713-.288T15 12t-.288-.712T14 11h-4q-.425 0-.712.288T9 12t.288.713T10 13m0 3h4q.425 0 .713-.288T15 15t-.288-.712T14 14h-4q-.425 0-.712.288T9 15t.288.713T10 16m-3 2V6z"/>
                  </svg>
                </div>
                <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-200">
                  Analyze Job Posting
                </CardTitle>
              </div>
              <CardDescription className="text-white/60 text-base">
                AI-powered detection of scams, ghost jobs, and red flags
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30">
              Beta
            </Badge>
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-wrap gap-2"
          >
            {features.map((feature, i) => {
              const IconComponent = feature.icon;
              return (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <IconComponent className={`h-3.5 w-3.5 ${feature.color}`} />
                  <span className="text-xs text-white/80 font-medium">{feature.text}</span>
                  <CheckCircle2 className="h-3 w-3 text-green-400" />
                </motion.div>
              );
            })}
          </motion.div>

          <Separator className="bg-white/10" />

          {/* Scan Mode Toggle */}
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Label className="text-base font-semibold text-white/90">Scan Type</Label>
            </motion.div>
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                custom={0}
                variants={scanTypeVariants}
                initial="hidden"
                animate="visible"
                type="button"
                onClick={() => setScanMode("quick")}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-5 rounded-xl border-2 transition-all text-left overflow-hidden group ${
                  scanMode === "quick"
                    ? "border-indigo-400/50 bg-gradient-to-br from-indigo-500/20 to-purple-500/10"
                    : "border-white/10 bg-white/5 hover:border-indigo-400/30 hover:bg-white/10"
                }`}
              >
                {/* Animated gradient background on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative flex items-start gap-3">
                  <div className={`rounded-lg p-2.5 transition-colors ${
                    scanMode === "quick"
                      ? "bg-indigo-500/20 backdrop-blur-sm"
                      : "bg-white/10 group-hover:bg-indigo-500/10"
                  }`}>
                    <Scan className={`h-5 w-5 transition-colors ${
                      scanMode === "quick" ? "text-indigo-300" : "text-white/60 group-hover:text-indigo-300"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1.5 text-white/90 text-base">Quick Scan</div>
                    <div className="text-xs text-white/50 leading-relaxed">
                      Quick and thorough AI analysis
                    </div>
                  </div>
                </div>
                {scanMode === "quick" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3"
                  >
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-400 shadow-lg shadow-indigo-400/50" />
                  </motion.div>
                )}
              </motion.button>

              <motion.button
                custom={1}
                variants={scanTypeVariants}
                initial="hidden"
                animate="visible"
                type="button"
                onClick={() => setScanMode("deep")}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-5 rounded-xl border-2 transition-all text-left overflow-hidden group ${
                  scanMode === "deep"
                    ? "border-purple-400/50 bg-gradient-to-br from-purple-500/20 to-pink-500/10"
                    : "border-white/10 bg-white/5 hover:border-purple-400/30 hover:bg-white/10"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative flex items-start gap-3">
                  <div className={`rounded-lg p-1.5 transition-colors ${
                    scanMode === "deep"
                      ? "bg-purple-500/20 backdrop-blur-sm"
                      : "bg-white/10 group-hover:bg-purple-500/10"
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={`h-7 w-7 transition-colors ${
                      scanMode === "deep" ? "text-purple-300" : "text-white/60 group-hover:text-purple-300"
                    }`}>
                      <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1.5 text-white/90 text-base">Deep Analysis</div>
                    <div className="text-xs text-white/50 leading-relaxed">
                      Comprehensive report with detailed insights
                    </div>
                  </div>
                </div>
                {scanMode === "deep" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3"
                  >
                    <div className="h-2.5 w-2.5 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50" />
                  </motion.div>
                )}
              </motion.button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="space-y-3"
            >
              <Label htmlFor="job-url" className="text-base text-white/90">
                Job Posting URL <span className="text-pink-400">*</span>
              </Label>
              <Input
                id="job-url"
                type="url"
                placeholder="https://linkedin.com/jobs/view/..."
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                disabled={isScanning}
                className={`h-14 bg-white/5 border-white/20 text-white placeholder:text-white/40 transition-all ${
                  scanMode === "deep"
                    ? "focus:border-purple-400 focus:bg-white/10"
                    : "focus:border-indigo-400/50 focus:bg-white/10"
                }`}
              />
              <p className="text-xs text-white/50">
                Paste the full URL from LinkedIn, Indeed, Glassdoor, or any job board
              </p>
            </motion.div>

            <Separator className="bg-white/10" />

            {/* Optional Fields */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="space-y-4"
            >
              <Label className="text-base font-semibold text-white/90">Optional Details</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position-title" className="text-sm text-white/70">
                    Position Title
                  </Label>
                  <Input
                    id="position-title"
                    type="text"
                    placeholder="e.g., Senior Software Engineer"
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    disabled={isScanning}
                    className={`h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 transition-all ${
                      scanMode === "deep"
                        ? "focus:border-purple-400 focus:bg-white/10"
                        : "focus:border-indigo-400/50 focus:bg-white/10"
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-sm text-white/70">
                    Company Name
                  </Label>
                  <Input
                    id="company-name"
                    type="text"
                    placeholder="e.g., Tech Corp Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={isScanning}
                    className={`h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 transition-all ${
                      scanMode === "deep"
                        ? "focus:border-purple-400 focus:bg-white/10"
                        : "focus:border-indigo-400/50 focus:bg-white/10"
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-description" className="text-sm text-white/70">
                  Job Description
                </Label>
                <Textarea
                  id="job-description"
                  placeholder="Paste the complete job posting here (optional)&#10;• Job title&#10;• Company name&#10;• Job description&#10;• Requirements&#10;• Benefits&#10;• Application details"
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  disabled={isScanning}
                  rows={8}
                  className={`font-mono text-sm bg-white/5 border-white/20 text-white placeholder:text-white/40 transition-all resize-none ${
                    scanMode === "deep"
                      ? "focus:border-purple-400 focus:bg-white/10"
                      : "focus:border-indigo-400/50 focus:bg-white/10"
                  }`}
                />
              </div>

              <p className="text-xs text-white/50">
                Adding position and company details can improve analysis accuracy
              </p>
            </motion.div>

            {/* Enhanced Submit Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              whileHover={isFormValid && !isScanning ? { scale: 1.02, y: -2 } : {}}
              whileTap={isFormValid && !isScanning ? { scale: 0.98 } : {}}
              type="submit"
              disabled={!isFormValid || isScanning}
              className={`
                group relative w-full h-18 py-5 text-lg font-bold rounded-xl overflow-hidden
                transition-all duration-300 shadow-lg
                ${!isFormValid || isScanning
                  ? 'bg-white/10 cursor-not-allowed border-2 border-white/20'
                  : scanMode === "quick"
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/50 border-2 border-indigo-400/50'
                    : 'bg-gradient-to-r from-purple-600 to-pink-500 hover:shadow-2xl hover:shadow-purple-500/50 border-2 border-purple-400/50'
                }
              `}
            >
              {/* Animated shine effect */}
              {isFormValid && !isScanning && (
                <motion.div
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "linear",
                  }}
                  className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                />
              )}

              <span className="relative z-10 flex items-center justify-center text-white gap-3">
                {isScanning ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="tracking-wide font-bold">
                      Analyzing Job Posting...
                    </span>
                  </>
                ) : (
                  <span className="tracking-wide font-extrabold text-xl">
                    {scanMode === "quick" ? "Start Quick Scan" : "Start Deep Analysis"}
                  </span>
                )}
              </span>
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.5 }}
              className="text-xs text-center text-white/50 leading-relaxed"
            >
              {scanMode === "quick"
                ? "Fast AI-powered analysis with relevant insights in seconds"
                : "Comprehensive web scraping, AI evaluation, and exportable detailed reports"
              }
            </motion.p>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
