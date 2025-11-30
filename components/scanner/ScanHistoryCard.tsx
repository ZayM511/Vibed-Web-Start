"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Trash2,
  Eye,
  Calendar,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnifiedScan, getScanStatus, getRiskLevel } from "@/lib/scanAdapters";
import { useState } from "react";

interface ScanHistoryCardProps {
  scan: UnifiedScan;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

/**
 * Redesigned compact scan history card component
 * Optimized for sidebar width with better space utilization
 */
export function ScanHistoryCard({
  scan,
  isSelected,
  onSelect,
  onDelete,
}: ScanHistoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const status = getScanStatus(scan);
  const risk = getRiskLevel(scan.report.confidenceScore);
  const isAnalyzing = scan.report.jobTitle === "Analyzing...";

  // Status icon mapping
  const StatusIcon = isAnalyzing
    ? Clock
    : status.variant === "scam"
    ? XCircle
    : status.variant === "ghost"
    ? AlertCircle
    : CheckCircle2;

  // Compact color scheme
  const colors = {
    analyzing: {
      border: "border-cyan-500/30",
      selectedBorder: "border-cyan-500/60",
      bg: "bg-cyan-500/5",
      selectedBg: "bg-cyan-500/10",
      text: "text-cyan-400",
      iconBg: "bg-cyan-500/10",
    },
    scam: {
      border: "border-red-500/30",
      selectedBorder: "border-red-500/60",
      bg: "bg-red-500/5",
      selectedBg: "bg-red-500/10",
      text: "text-red-400",
      iconBg: "bg-red-500/10",
    },
    ghost: {
      border: "border-orange-500/30",
      selectedBorder: "border-orange-500/60",
      bg: "bg-orange-500/5",
      selectedBg: "bg-orange-500/10",
      text: "text-orange-400",
      iconBg: "bg-orange-500/10",
    },
    verified: {
      border: "border-green-500/30",
      selectedBorder: "border-green-500/60",
      bg: "bg-green-500/5",
      selectedBg: "bg-green-500/10",
      text: "text-green-400",
      iconBg: "bg-green-500/10",
    },
  };

  const color = colors[status.variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onSelect}
      className={`
        relative cursor-pointer rounded-lg transition-all duration-200 w-full
        ${isSelected ? color.selectedBg : "bg-white/[0.02]"}
        border ${isSelected ? color.selectedBorder : "border-white/10"}
        ${isSelected ? "shadow-lg shadow-black/20" : "hover:bg-white/[0.05] hover:border-white/20"}
        overflow-hidden group
      `}
    >
      {/* Compact content - reduced padding */}
      <div className="relative p-2.5">
        {/* Header row - more compact */}
        <div className="flex items-start gap-2 mb-2">
          {/* Status icon - smaller */}
          <div className="flex-shrink-0">
            <div className={`p-1.5 rounded-md ${color.iconBg}`}>
              <StatusIcon className={`h-3 w-3 ${color.text} ${isAnalyzing ? "animate-pulse" : ""}`} />
            </div>
          </div>

          {/* Job info - compact */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-xs text-white truncate leading-tight">
              {scan.report.jobTitle}
            </h3>
            <p className="text-[10px] text-white/40 truncate mt-0.5">
              {scan.report.company}
            </p>
          </div>

          {/* Delete button - compact */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered || isSelected ? 1 : 0 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0"
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-md border border-white/10 hover:border-red-500/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </motion.div>
        </div>

        {/* Compact badges row */}
        <div className="flex items-center gap-1 mb-2">
          <Badge className={`${color.bg} ${color.text} text-[9px] px-1.5 py-0 font-medium border ${color.border} leading-tight`}>
            {status.label}
          </Badge>

          {!isAnalyzing && (
            <Badge
              className={`text-[9px] px-1.5 py-0 font-medium border leading-tight ${
                risk.level === "low"
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : risk.level === "medium"
                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}
            >
              {scan.report.confidenceScore}%
            </Badge>
          )}

          {scan.scanMode && (
            <Badge className={`text-[9px] px-1.5 py-0 font-medium border leading-tight ${
              scan.scanMode === "deep"
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            }`}>
              {scan.scanMode === "deep" ? (
                <>
                  <Sparkles className="h-2 w-2 mr-0.5 inline" />
                  Deep
                </>
              ) : (
                <>
                  <Zap className="h-2 w-2 mr-0.5 inline" />
                  Quick
                </>
              )}
            </Badge>
          )}
        </div>

        {/* Compact footer */}
        <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5">
          <div className="flex items-center gap-1 text-white/30">
            <Calendar className="h-2.5 w-2.5" />
            <span className="truncate">
              {formatDistanceToNow(new Date(scan.timestamp), {
                addSuffix: true,
              })}
            </span>
          </div>

          {/* Viewing indicator - compact */}
          {isSelected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-white/50"
            >
              <Eye className="h-2.5 w-2.5" />
              <span className="text-[9px] font-medium">Viewing</span>
            </motion.div>
          )}
        </div>

        {/* Analyzing indicator */}
        {isAnalyzing && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: [0, 1, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute bottom-0 left-0 right-0 h-0.5 ${color.text.replace("text-", "bg-")} rounded-b-lg`}
            style={{ transformOrigin: "left" }}
          />
        )}
      </div>
    </motion.div>
  );
}
