"use client";

import { useState } from "react";
import { EnhancedScanHistory } from "@/components/scanner/EnhancedScanHistory";
import { ElegantBackground } from "@/components/ElegantBackground";
import { Id } from "@/convex/_generated/dataModel";

export default function HistoryDemoPage() {
  const [selectedScanId, setSelectedScanId] = useState<Id<"jobScans"> | null>(null);

  // Mock scan data for demo
  const mockScans = [
    {
      _id: "scan1" as Id<"jobScans">,
      timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      report: {
        jobTitle: "Senior Frontend Developer",
        company: "Tech Innovations Inc.",
        isScam: false,
        isGhostJob: false,
      },
      type: "manual" as const,
    },
    {
      _id: "scan2" as Id<"jobScans">,
      timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      report: {
        jobTitle: "Analyzing...",
        company: "Startup XYZ",
        isScam: false,
        isGhostJob: false,
      },
      type: "ghost" as const,
    },
    {
      _id: "scan3" as Id<"jobScans">,
      timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      report: {
        jobTitle: "Remote Customer Service Representative - $5000/week",
        company: "GlobalTech Solutions",
        isScam: true,
        isGhostJob: false,
      },
      type: "ghost" as const,
    },
    {
      _id: "scan4" as Id<"jobScans">,
      timestamp: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
      report: {
        jobTitle: "Software Engineering Manager",
        company: "MegaCorp Industries",
        isScam: false,
        isGhostJob: true,
      },
      type: "manual" as const,
    },
    {
      _id: "scan5" as Id<"jobScans">,
      timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
      report: {
        jobTitle: "Full Stack Developer",
        company: "Digital Solutions Co.",
        isScam: false,
        isGhostJob: false,
      },
      type: "ghost" as const,
    },
    {
      _id: "scan6" as Id<"jobScans">,
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
      report: {
        jobTitle: "Product Designer",
        company: "Creative Studios",
        isScam: false,
        isGhostJob: false,
      },
      type: "manual" as const,
    },
    {
      _id: "scan7" as Id<"jobScans">,
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
      report: {
        jobTitle: "Data Entry - Work From Home - No Experience Required",
        company: "QuickCash LLC",
        isScam: true,
        isGhostJob: false,
      },
      type: "ghost" as const,
    },
    {
      _id: "scan8" as Id<"jobScans">,
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
      report: {
        jobTitle: "DevOps Engineer",
        company: "Cloud Infrastructure Ltd",
        isScam: false,
        isGhostJob: true,
      },
      type: "manual" as const,
    },
  ];

  const handleViewDetails = (scanId: Id<"jobScans">) => {
    setSelectedScanId(scanId);
    console.log("Viewing scan:", scanId);
  };

  const handleDelete = (scanId: string, type: "manual" | "ghost") => {
    console.log("Deleting scan:", scanId, "type:", type);
    alert(`Delete scan ${scanId} (${type})`);
  };

  return (
    <ElegantBackground>
      <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent mb-2">
            Enhanced Scan History Demo
          </h1>
          <p className="text-white/70 text-lg">
            Beautiful, animated scan history with glass-morphism design
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* History Sidebar */}
          <div className="lg:col-span-4 xl:col-span-4">
            <EnhancedScanHistory
              scans={mockScans}
              selectedScanId={selectedScanId}
              onViewDetails={handleViewDetails}
              onDelete={handleDelete}
            />
          </div>

          {/* Results Panel Placeholder */}
          <div className="lg:col-span-8 xl:col-span-8">
            <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-8">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10" />

              <div className="relative text-center space-y-4">
                {selectedScanId ? (
                  <>
                    <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full mb-4">
                      <svg className="h-12 w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-white">
                      Scan Details
                    </h2>
                    <p className="text-white/60">
                      Selected: {selectedScanId}
                    </p>
                    <p className="text-sm text-white/50">
                      Full scan results would appear here in the actual implementation
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full mb-4">
                      <svg className="h-12 w-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-white">
                      No Scan Selected
                    </h2>
                    <p className="text-white/60">
                      Click on any scan from the history to view details
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features showcase */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative overflow-hidden rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
            <div className="relative space-y-2">
              <div className="text-3xl">✨</div>
              <h3 className="text-lg font-semibold text-white">Smooth Animations</h3>
              <p className="text-sm text-white/60">Framer Motion powered transitions and interactions</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5" />
            <div className="relative space-y-2">
              <div className="text-3xl">🎨</div>
              <h3 className="text-lg font-semibold text-white">Glass-morphism</h3>
              <p className="text-sm text-white/60">Modern frosted glass design with backdrop blur</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5" />
            <div className="relative space-y-2">
              <div className="text-3xl">📊</div>
              <h3 className="text-lg font-semibold text-white">Live Stats</h3>
              <p className="text-sm text-white/60">Real-time statistics and status indicators</p>
            </div>
          </div>
        </div>
      </div>
    </ElegantBackground>
  );
}
