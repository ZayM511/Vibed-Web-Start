"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Sparkles,
  FileText,
  Calendar,
  TrendingUp,
  Shield,
  Eye,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface ScanItem {
  _id: Id<"jobScans"> | Id<"scans">;
  timestamp: number;
  report: {
    jobTitle: string;
    company: string;
    isScam?: boolean;
    isGhostJob?: boolean;
  };
  type: "manual" | "ghost";
}

interface EnhancedScanHistoryProps {
  scans: ScanItem[];
  selectedScanId: Id<"jobScans"> | null;
  onViewDetails: (scanId: Id<"jobScans">, scanType: "manual" | "ghost") => void;
  onDelete: (scanId: string, type: "manual" | "ghost") => void;
}

export function EnhancedScanHistory({
  scans,
  selectedScanId,
  onViewDetails,
  onDelete,
}: EnhancedScanHistoryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const getStatusData = (scan: ScanItem) => {
    if (scan.report.jobTitle === "Analyzing...") {
      return {
        icon: Clock,
        color: "text-blue-400",
        bgGradient: "from-blue-500/20 to-cyan-500/10",
        borderColor: "border-blue-400/30",
        label: "Analyzing",
        badgeClass: "bg-blue-500/20 text-blue-300 border-blue-400/30",
      };
    }
    if (scan.report.isScam) {
      return {
        icon: XCircle,
        color: "text-red-400",
        bgGradient: "from-red-500/20 to-pink-500/10",
        borderColor: "border-red-400/30",
        label: "Scam Detected",
        badgeClass: "bg-red-500/20 text-red-300 border-red-400/30",
      };
    }
    if (scan.report.isGhostJob) {
      return {
        icon: AlertCircle,
        color: "text-orange-400",
        bgGradient: "from-orange-500/20 to-yellow-500/10",
        borderColor: "border-orange-400/30",
        label: "Ghost Job",
        badgeClass: "bg-orange-500/20 text-orange-300 border-orange-400/30",
      };
    }
    return {
      icon: CheckCircle2,
      color: "text-green-400",
      bgGradient: "from-green-500/20 to-emerald-500/10",
      borderColor: "border-green-400/30",
      label: "Verified",
      badgeClass: "bg-green-500/20 text-green-300 border-green-400/30",
    };
  };

  const getScanTypeData = (type: "manual" | "ghost") => {
    return type === "manual"
      ? {
          icon: FileText,
          label: "Deep Analysis",
          color: "text-purple-400",
          bgClass: "bg-purple-500/10 border-purple-400/30",
        }
      : {
          icon: Sparkles,
          label: "Quick Scan",
          color: "text-indigo-400",
          bgClass: "bg-indigo-500/10 border-indigo-400/30",
        };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.4, 0.25, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      x: -100,
      transition: {
        duration: 0.3,
      },
    },
  };

  if (!scans || scans.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-8"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10" />

        <div className="relative flex flex-col items-center justify-center space-y-4">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full blur-xl opacity-20" />
            <div className="relative rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-6 backdrop-blur-sm border border-white/10">
              <Clock className="h-12 w-12 text-indigo-400" />
            </div>
          </motion.div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              No Scan History Yet
            </h3>
            <p className="text-sm text-white/60 max-w-md">
              Your analyzed job postings will appear here. Start scanning to build your history!
            </p>
          </div>

          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 px-4 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Ready to scan
            </Badge>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  const completedScans = scans.filter(s => s.report.jobTitle !== "Analyzing...").length;
  const analyzingScans = scans.length - completedScans;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative w-full max-w-full overflow-hidden rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-950/40 border border-indigo-500/20 shadow-2xl shadow-indigo-500/10"
    >
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
            ],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-0"
        />

        {/* Animated gradient border */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl opacity-20 blur-sm"
        />
      </div>

      {/* Header with stats */}
      <div className="relative p-5 border-b border-indigo-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent" />

        <div className="relative flex items-center justify-between gap-4 overflow-hidden">
          <div className="space-y-1 min-w-0 flex-shrink">
            <div className="flex items-center gap-3 overflow-hidden">
              <motion.div
                animate={{
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                className="relative"
              >
                <div className="absolute inset-0 bg-indigo-500 rounded-lg blur-md opacity-40" />
                <Shield className="relative h-6 w-6 text-indigo-300" />
              </motion.div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent whitespace-nowrap">
                Scan History
              </h2>
            </div>
            <p className="text-xs text-indigo-300/60 font-medium">
              {scans.length} total {scans.length === 1 ? "scan" : "scans"}
            </p>
          </div>

          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <motion.div
              whileHover={{ scale: 1.1, y: -2 }}
              className="relative group"
            >
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl blur-lg opacity-30"
              />
              <Badge className="relative bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-200 border-2 border-emerald-400/40 px-3 py-1.5 text-xs whitespace-nowrap font-semibold backdrop-blur-sm shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                {completedScans} completed
              </Badge>
            </motion.div>

            {analyzingScans > 0 && (
              <motion.div
                whileHover={{ scale: 1.1, y: -2 }}
                animate={{ opacity: [1, 0.8, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative group"
              >
                <motion.div
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl blur-lg opacity-40"
                />
                <Badge className="relative bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-200 border-2 border-cyan-400/40 px-3 py-1.5 text-xs whitespace-nowrap font-semibold backdrop-blur-sm shadow-lg shadow-cyan-500/20">
                  <Zap className="h-3.5 w-3.5 mr-1.5 animate-pulse flex-shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                  {analyzingScans} analyzing
                </Badge>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Scan list */}
      <ScrollArea className="h-[calc(100vh-20rem)]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-4 space-y-3 w-full overflow-hidden"
        >
          <AnimatePresence mode="popLayout">
            {scans.map((scan) => {
              const statusData = getStatusData(scan);
              const scanTypeData = getScanTypeData(scan.type);
              const StatusIcon = statusData.icon;
              const ScanIcon = scanTypeData.icon;
              const scanIdStr = scan._id as string;
              const isSelected = (selectedScanId as string) === scanIdStr;
              const isHovered = hoveredId === scanIdStr;

              return (
                <motion.div
                  key={scanIdStr}
                  variants={itemVariants}
                  layout
                  onHoverStart={() => setHoveredId(scanIdStr)}
                  onHoverEnd={() => setHoveredId(null)}
                  whileHover={{ scale: 1.03, y: -4 }}
                  className={`relative group cursor-pointer rounded-2xl backdrop-blur-xl transition-all duration-300 w-full overflow-hidden ${
                    isSelected
                      ? "bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-pink-500/10 border-2 border-indigo-400/60 shadow-xl shadow-indigo-500/30"
                      : "bg-gradient-to-br from-slate-800/40 via-slate-900/30 to-slate-800/40 border-2 border-slate-700/30 hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/20"
                  }`}
                  onClick={() => onViewDetails(scan._id as Id<"jobScans">, scan.type)}
                >
                  {/* Animated gradient border on hover */}
                  <AnimatePresence>
                    {isHovered && !isSelected && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 overflow-hidden rounded-2xl"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className={`absolute inset-[-2px] bg-gradient-to-r ${statusData.bgGradient} opacity-30 blur-sm`}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Selected indicator with glow */}
                  {isSelected && (
                    <>
                      <motion.div
                        layoutId="selected-indicator"
                        className="absolute inset-0 bg-gradient-to-br from-indigo-500/25 via-purple-500/15 to-pink-500/10 rounded-2xl"
                      />
                      <motion.div
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-40"
                      />
                    </>
                  )}

                  <div className="relative p-3 space-y-2.5 w-full max-w-full overflow-hidden">
                    {/* Header row */}
                    <div className="flex items-start gap-2 w-full max-w-full overflow-hidden">
                      {/* Status icon with glow */}
                      <motion.div
                        animate={
                          scan.report.jobTitle === "Analyzing..."
                            ? { rotate: 360 }
                            : {}
                        }
                        transition={
                          scan.report.jobTitle === "Analyzing..."
                            ? { duration: 2, repeat: Infinity, ease: "linear" }
                            : {}
                        }
                        className="relative flex-shrink-0 group/icon"
                      >
                        <motion.div
                          whileHover={{ scale: 1.15 }}
                          className={`p-2 rounded-xl ${scanTypeData.bgClass} backdrop-blur-sm shadow-lg relative overflow-hidden`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${statusData.bgGradient} opacity-30 blur-sm group-hover/icon:opacity-50 transition-opacity`} />
                          <StatusIcon className={`relative h-4 w-4 ${statusData.color} drop-shadow-[0_0_4px_currentColor]`} />
                        </motion.div>
                      </motion.div>

                      {/* Job info with better typography */}
                      <div className="flex-1 min-w-0 space-y-1 overflow-hidden">
                        <h3 className="font-semibold text-sm text-white/90 truncate overflow-hidden text-ellipsis whitespace-nowrap drop-shadow-sm">
                          {scan.report.jobTitle}
                        </h3>
                        <p className="text-xs text-indigo-200/60 truncate overflow-hidden text-ellipsis whitespace-nowrap font-medium">
                          {scan.report.company}
                        </p>
                      </div>

                      {/* Delete button with enhanced hover */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0"
                      >
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 bg-red-500/10 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all flex-shrink-0 rounded-xl border border-red-500/20 hover:border-red-500/40 backdrop-blur-sm shadow-lg shadow-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(scanIdStr, scan.type);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
                          </Button>
                        </motion.div>
                      </motion.div>
                    </div>

                    {/* Badges row with glow effects */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                      <motion.div whileHover={{ scale: 1.05 }} className="relative">
                        <div className={`absolute inset-0 ${statusData.badgeClass} rounded-lg blur-sm opacity-40`} />
                        <Badge className={`relative ${statusData.badgeClass} text-xs px-2.5 py-1 whitespace-nowrap flex-shrink-0 font-semibold backdrop-blur-sm border border-white/10 shadow-lg`}>
                          {statusData.label}
                        </Badge>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} className="relative">
                        <div className={`absolute inset-0 ${scanTypeData.bgClass} rounded-lg blur-sm opacity-40`} />
                        <Badge className={`relative ${scanTypeData.bgClass} ${scanTypeData.color} border-2 text-xs px-2.5 py-1 whitespace-nowrap flex-shrink-0 font-semibold backdrop-blur-sm shadow-lg`}>
                          <ScanIcon className="h-3 w-3 mr-1 flex-shrink-0 drop-shadow-[0_0_4px_currentColor]" />
                          {scanTypeData.label}
                        </Badge>
                      </motion.div>
                    </div>

                    {/* Footer row with enhanced styling */}
                    <div className="flex items-center justify-between text-xs overflow-hidden pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-indigo-300/50 min-w-0 flex-shrink">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate font-medium">
                          {formatDistanceToNow(new Date(scan.timestamp), { addSuffix: true })}
                        </span>
                      </div>

                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-1.5 flex-shrink-0 relative"
                        >
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur-md opacity-40"
                          />
                          <div className="relative flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg border border-indigo-400/30 backdrop-blur-sm">
                            <Eye className="h-3 w-3 flex-shrink-0 text-indigo-300 drop-shadow-[0_0_4px_rgba(165,180,252,0.8)]" />
                            <span className="font-semibold whitespace-nowrap text-xs text-indigo-200">Viewing</span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Analyzing progress indicator */}
                    {scan.report.jobTitle === "Analyzing..." && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 rounded-b-xl"
                        style={{ transformOrigin: "left" }}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </ScrollArea>

      {/* Footer stats */}
      <div className="relative p-4 border-t border-white/10">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-purple-500/5" />
        <div className="relative flex items-center justify-center gap-4 text-xs text-white/60">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            <span>{scans.filter(s => !s.report.isScam && !s.report.isGhostJob).length} safe jobs</span>
          </div>
          <div className="h-3 w-px bg-white/20" />
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 text-orange-400" />
            <span>{scans.filter(s => s.report.isGhostJob).length} ghost jobs</span>
          </div>
          <div className="h-3 w-px bg-white/20" />
          <div className="flex items-center gap-1.5">
            <XCircle className="h-3 w-3 text-red-400" />
            <span>{scans.filter(s => s.report.isScam).length} scams</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
