"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Scan,
  History,
  ArrowLeft,
  ShieldAlert
} from "lucide-react";

const ADMIN_EMAIL = "isaiah.e.malone@gmail.com";

// Feature Components
import { EnhancedScanForm } from "@/components/scanner/EnhancedScanForm";
import { ScanHistoryList } from "@/components/scanner/ScanHistoryList";
import { ScanResultsDisplay } from "@/components/scanner/ScanResultsDisplay";
import { UltraEnhancedCommunityReviewForm } from "@/components/scanner/UltraEnhancedCommunityReviewForm";
import CommunityReviewList from "@/components/CommunityReviewList";
import { FiltrPageHeader } from "@/components/FiltrPageHeader";
import { combineAndSortScans } from "@/lib/scanAdapters";
import { UpgradeModal } from "@/components/scanner/UpgradeModal";
import { useSubscription } from "@/hooks/use-subscription";
import { useScanUsage } from "@/hooks/use-subscription";
import { Crown } from "lucide-react";
import Link from "next/link";

// Background shapes component from homepage
function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.15]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

export default function JobFiltrPage() {
  const { user, isLoaded } = useUser();
  const { isPro, isLoading: subLoading } = useSubscription();
  const { isLimitReached, scansRemaining, isUnlimited, isLoading: scanLoading } = useScanUsage();
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");

  // Check if user is admin
  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.15] via-transparent to-orange-500/[0.15] blur-3xl" />
        <div className="relative z-10">
          <Card className="max-w-md mx-auto bg-white/5 backdrop-blur-sm border-red-500/30">
            <CardContent className="flex flex-col items-center justify-center py-16 px-8">
              <div className="p-4 rounded-full bg-red-500/20 border border-red-500/30 mb-6">
                <ShieldAlert className="h-12 w-12 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
              <p className="text-white/70 text-center mb-6">
                This page is restricted to administrators only.
              </p>
              <Link href="/">
                <Button className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Return Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [selectedScanType, setSelectedScanType] = useState<"manual" | "ghost" | null>(null);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Show loading state while data is being fetched
  const isLoadingData = subLoading || scanLoading;

  // Convex hooks - Manual scan
  const scrapeAndAnalyze = useAction(api.scans.actions.scrapeAndAnalyzeAction);
  const deleteManualScan = useMutation(api.scans.mutations.deleteScanResultMutation);
  const manualScanHistory = useQuery(api.scans.queries.getScanHistoryQuery);

  // Convex hooks - Ghost job detector
  const createJobScan = useMutation(api.jobScans.createJobScan);
  const deleteJobScan = useMutation(api.jobScans.deleteJobScan);
  const ghostJobHistory = useQuery(api.jobScans.getRecentUserScans, { limit: 50 });

  // Combine and normalize scan histories using adapter
  const combinedHistory = combineAndSortScans(manualScanHistory, ghostJobHistory);

  const handleManualScan = async (data: { jobInput: string; context?: string; scanMode?: "quick" | "deep" }) => {
    // TEMPORARY: Bypass scan limit checks for testing (12 hours)
    // if (isLimitReached && !isPro) {
    //   setShowUpgradeModal(true);
    //   return;
    // }

    setIsScanning(true);
    setSelectedScanId(null);

    try {
      const result = await scrapeAndAnalyze({
        jobInput: data.jobInput,
        context: data.context,
        scanMode: data.scanMode,
      });

      setCurrentScanId(result.scanId);
      setSelectedScanId(result.scanId);
      setSelectedScanType("manual");

      // Show remaining scans for free users
      if (!isPro && scansRemaining > 0) {
        toast.success(`Job analyzed! You have ${scansRemaining - 1} scan${scansRemaining - 1 !== 1 ? 's' : ''} remaining.`);
      } else if (!isPro && scansRemaining === 1) {
        toast.success("Job analyzed! This was your last free scan. Upgrade to Pro for unlimited scans!");
      } else {
        toast.success("Job posting analyzed successfully!");
      }

      setActiveTab("history");

      setTimeout(() => {
        document.getElementById("scan-results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Manual scan failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze job posting");
    } finally {
      setIsScanning(false);
    }
  };

  const handleGhostJobScan = async (data: {
    jobInput: string;
    jobUrl?: string;
    context?: string;
    scanMode?: "quick" | "deep";
  }) => {
    // TEMPORARY: Bypass scan limit checks for testing (12 hours)
    // if (isLimitReached && !isPro) {
    //   setShowUpgradeModal(true);
    //   return;
    // }

    setIsScanning(true);
    setSelectedScanId(null);

    try {
      const scanId = await createJobScan({
        jobInput: data.jobInput,
        jobUrl: data.jobUrl,
        context: data.context,
      });

      setSelectedScanId(scanId);
      setSelectedScanType("ghost");

      // Show remaining scans for free users
      if (!isPro && scansRemaining > 0) {
        toast.success(`Job scan created! You have ${scansRemaining - 1} scan${scansRemaining - 1 !== 1 ? 's' : ''} remaining.`);
      } else if (!isPro && scansRemaining === 1) {
        toast.success("Job scan created! This was your last free scan. Upgrade to Pro!");
      } else {
        toast.success("Job scan created! AI analysis in progress...");
      }

      setActiveTab("history");

      setTimeout(() => {
        document.getElementById("scan-results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Ghost job scan failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create job scan");
    } finally {
      setIsScanning(false);
    }
  };

  const handleViewDetails = (scanId: string, scanType: "manual" | "ghost") => {
    setSelectedScanId(scanId);
    setSelectedScanType(scanType);
    setCurrentScanId(null);

    setTimeout(() => {
      document.getElementById("scan-results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleDeleteScan = async (scanId: string, type: "manual" | "ghost") => {
    if (!confirm("Are you sure you want to delete this scan?")) {
      return;
    }

    try {
      if (type === "manual") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await deleteManualScan({ scanId: scanId as any });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await deleteJobScan({ jobScanId: scanId as any });
      }

      toast.success("Scan deleted successfully");

      if (scanId === selectedScanId) {
        setSelectedScanId(null);
      }
      if (scanId === currentScanId) {
        setCurrentScanId(null);
      }
    } catch (error) {
      console.error("Failed to delete scan:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete scan");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Home Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-6 left-6 z-50"
      >
          <Button
            onClick={() => window.location.href = "/"}
            variant="ghost"
            className="group relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-md border border-white/10 hover:border-white/20 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Content */}
            <div className="relative flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
              <span className="font-medium">Home</span>
            </div>
          </Button>
        </motion.div>

        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.15] via-transparent to-rose-500/[0.15] blur-3xl" />

      {/* Animated shapes background */}
      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-indigo-500/[0.15]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />

        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-rose-500/[0.15]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />

        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-violet-500/[0.15]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />

        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-amber-500/[0.15]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />

        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-cyan-500/[0.15]"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <FiltrPageHeader />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "scan" | "history")} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12 bg-white/10 backdrop-blur-sm border border-white/20">
            <TabsTrigger value="scan" className="text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white hover:bg-white/10 hover:text-white transition-all duration-200">
              <Scan className="mr-2 h-4 w-4" />
              New Scan
            </TabsTrigger>
            <TabsTrigger value="history" className="text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white hover:bg-white/10 hover:text-white transition-all duration-200">
              <History className="mr-2 h-4 w-4" />
              History ({combinedHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Loading State */}
              {isLoadingData && (
                <div className="p-6 rounded-lg border border-white/10 bg-white/5 text-center">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              )}

              {/* Scan Limit Banner for Free Users */}
              {!isLoadingData && !isPro && (
                <div className={`p-4 rounded-lg border ${
                  isLimitReached
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : scansRemaining === 1
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      {isLimitReached ? (
                        <p className="font-semibold">Free scan limit reached (3/3 scans used)</p>
                      ) : isUnlimited ? (
                        <p className="font-semibold">Unlimited scans available</p>
                      ) : (
                        <p className="font-semibold">
                          {scansRemaining} free scan{scansRemaining !== 1 ? 's' : ''} remaining ({3 - scansRemaining}/3 used)
                        </p>
                      )}
                    </div>
                    <Link href="/pricing">
                      <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <Crown className="h-4 w-4" />
                        Upgrade to Pro
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Scan Form - Always show, modal will handle limit */}
              {!isLoadingData && (
                <EnhancedScanForm
                  onManualScan={handleManualScan}
                  onGhostJobScan={handleGhostJobScan}
                  isScanning={isScanning}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 -ml-12">
              {/* Sidebar - extended height */}
              <div className="lg:col-span-5 xl:col-span-4 h-[calc(100vh-1rem)]">
                <ScanHistoryList
                  scans={combinedHistory}
                  selectedScanId={selectedScanId}
                  onSelectScan={handleViewDetails}
                  onDeleteScan={handleDeleteScan}
                />
              </div>

              {/* Results section */}
              <div className="lg:col-span-7 xl:col-span-8">
                {selectedScanId && selectedScanType ? (
                  <div id="scan-results" className="space-y-6 scroll-mt-8">
                    <ScanResultsDisplay
                      scanId={selectedScanId}
                      scanType={selectedScanType}
                    />

                    <Separator className="bg-white/10" />

                    <div className="space-y-4">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <CommunityReviewList jobScanId={selectedScanId as any} />
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <UltraEnhancedCommunityReviewForm jobScanId={selectedScanId as any} />
                    </div>
                  </div>
                ) : (
                  <Card className="border-dashed bg-white/5 backdrop-blur-sm border-white/20">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <div className="rounded-full bg-indigo-500/20 p-4 mb-4">
                        <History className="h-8 w-8 text-indigo-300" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-white">No Scan Selected</h3>
                      <p className="text-white/60 text-center max-w-sm">
                        Select a scan from the history list to view detailed results and community reviews
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80 pointer-events-none" />

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </div>
  );
}
