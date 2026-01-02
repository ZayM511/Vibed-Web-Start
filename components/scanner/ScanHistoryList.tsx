"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, XCircle, TrendingUp, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UnifiedScan } from "@/lib/scanAdapters";
import { ScanHistoryCard } from "./ScanHistoryCard";
import { EmptyHistoryState } from "./EmptyHistoryState";

interface ScanHistoryListProps {
  scans: UnifiedScan[];
  selectedScanId: string | null;
  onSelectScan: (scanId: string, scanType: "manual" | "ghost") => void;
  onDeleteScan: (scanId: string, scanType: "manual" | "ghost") => void;
}

/**
 * Redesigned scan history list component
 * Optimized for better width management and modern aesthetics
 */
export function ScanHistoryList({
  scans,
  selectedScanId,
  onSelectScan,
  onDeleteScan,
}: ScanHistoryListProps) {
  // Return empty state if no scans
  if (!scans || scans.length === 0) {
    return <EmptyHistoryState />;
  }

  // Calculate stats
  const completedScans = scans.filter(
    (s) => s.report.jobTitle !== "Analyzing..."
  ).length;
  const analyzingScans = scans.length - completedScans;
  const safeJobs = scans.filter(
    (s) =>
      s.report.jobTitle !== "Analyzing..." &&
      !s.report.isScam &&
      !s.report.isGhostJob
  ).length;
  const ghostJobs = scans.filter((s) => s.report.isGhostJob).length;
  const scams = scans.filter((s) => s.report.isScam).length;

  return (
    <div className="relative w-full max-w-full h-full flex flex-col rounded-xl bg-black/30 backdrop-blur-sm border border-white/10">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-xl" />

      {/* Enhanced header with stats */}
      <div className="relative flex-shrink-0">
        {/* Header section - larger and more prominent */}
        <div className="relative px-4 py-5 space-y-4">
          {/* Title bar - prominent and larger */}
          <div className="flex items-center justify-between pb-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 shadow-lg shadow-indigo-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="h-6 w-6 text-indigo-300">
                  <path fill="currentColor" d="m13 11.6l3 3q.275.275.275.7T16 16t-.7.275t-.7-.275l-3.3-3.3q-.15-.15-.225-.337T11 11.975V8q0-.425.288-.712T12 7t.713.288T13 8zM15.25 5q-.525 0-.888-.362T14 3.75t.363-.888t.887-.362t.888.363t.362.887t-.363.888T15.25 5m0 16.5q-.525 0-.888-.363T14 20.25t.363-.888t.887-.362t.888.363t.362.887t-.363.888t-.887.362m4-13q-.525 0-.888-.363T18 7.25t.363-.888T19.25 6t.888.363t.362.887t-.363.888t-.887.362m0 9.5q-.525 0-.888-.363T18 16.75t.363-.888t.887-.362t.888.363t.362.887t-.363.888t-.887.362m1.5-4.75q-.525 0-.888-.363T19.5 12t.363-.888t.887-.362t.888.363T22 12t-.363.888t-.887.362M2 12q0-3.925 2.613-6.75t6.412-3.2q.4-.05.688.238T12 3q0 .4-.262.7t-.663.35q-3.025.35-5.05 2.6T4 12q0 3.125 2.025 5.363t5.05 2.587q.4.05.663.35T12 21q0 .425-.288.713t-.687.237Q7.2 21.575 4.6 18.75T2 12"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Scan History</h2>
                <p className="text-sm text-white/60 mt-0.5">{scans.length} total scans</p>
              </div>
            </div>
          </div>

          {/* Enhanced stats grid - larger and more prominent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Completed - full width, larger */}
            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              className="group sm:col-span-2"
            >
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-white">{completedScans}</div>
                      <div className="text-xs text-emerald-400/80 font-medium">Completed</div>
                    </div>
                  </div>
                  {analyzingScans > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                      <Zap className="h-4 w-4 text-cyan-400 animate-pulse" />
                      <div>
                        <div className="text-lg font-bold text-cyan-400">{analyzingScans}</div>
                        <div className="text-[10px] text-cyan-400/70">Analyzing</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Safe - larger and more prominent */}
            <motion.div whileHover={{ y: -2, scale: 1.02 }} className="group">
              <div className={`p-3 rounded-xl border transition-all ${
                safeJobs > 0
                  ? "bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/30 shadow-lg shadow-green-500/10"
                  : "bg-white/5 border-white/10 hover:border-green-500/30 hover:bg-green-500/5"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${
                    safeJobs > 0 ? "bg-green-500/20 border border-green-500/30" : "bg-white/5"
                  }`}>
                    <TrendingUp className={`h-4 w-4 transition-colors ${
                      safeJobs > 0 ? "text-green-400" : "text-white/40 group-hover:text-green-400"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-2xl font-bold ${
                      safeJobs > 0 ? "text-green-400" : "text-white"
                    }`}>{safeJobs}</div>
                    <div className="text-xs text-white/60 font-medium">Safe</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Ghost - larger and more prominent */}
            <motion.div whileHover={{ y: -2, scale: 1.02 }} className="group">
              <div className={`p-3 rounded-xl border transition-all ${
                ghostJobs > 0
                  ? "bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/30 shadow-lg shadow-orange-500/10"
                  : "bg-white/5 border-white/10 hover:border-orange-500/30 hover:bg-orange-500/5"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${
                    ghostJobs > 0 ? "bg-orange-500/20 border border-orange-500/30" : "bg-white/5"
                  }`}>
                    <AlertCircle className={`h-4 w-4 transition-colors ${
                      ghostJobs > 0 ? "text-orange-400" : "text-white/40 group-hover:text-orange-400"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-2xl font-bold ${
                      ghostJobs > 0 ? "text-orange-400" : "text-white"
                    }`}>{ghostJobs}</div>
                    <div className="text-xs text-white/60 font-medium">Ghost</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Scams - larger and spans full width when detected */}
            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              className={`group ${scams > 0 ? 'sm:col-span-2' : ''}`}
            >
              <div className={`p-3 rounded-xl border transition-all ${
                scams > 0
                  ? "bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/30 shadow-lg shadow-red-500/10"
                  : "bg-white/5 border-white/10 hover:border-red-500/30 hover:bg-red-500/5"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${
                    scams > 0 ? "bg-red-500/20 border border-red-500/30" : "bg-white/5"
                  }`}>
                    <XCircle className={`h-4 w-4 transition-colors ${
                      scams > 0 ? "text-red-400" : "text-white/40 group-hover:text-red-400"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-2xl font-bold ${
                      scams > 0 ? "text-red-400" : "text-white"
                    }`}>{scams}</div>
                    <div className="text-xs text-white/60 font-medium">Scams</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scan list - clean scroll area with proper width constraints */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="relative px-2.5 py-2.5 space-y-1.5">
            <AnimatePresence mode="popLayout">
              {scans.map((scan) => (
                <ScanHistoryCard
                  key={scan._id}
                  scan={scan}
                  isSelected={selectedScanId === scan._id}
                  onSelect={() => onSelectScan(scan._id, scan.type)}
                  onDelete={() => onDeleteScan(scan._id, scan.type)}
                />
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
