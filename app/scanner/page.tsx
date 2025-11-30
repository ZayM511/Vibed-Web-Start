"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Scan,
  History,
  AlertCircle,
  Search
} from "lucide-react";

// Feature Components
import { UnifiedScanForm } from "@/components/scanner/UnifiedScanForm";
import { EnhancedUnifiedScanResults } from "@/components/scanner/EnhancedUnifiedScanResults";
import { EnhancedScanHistory } from "@/components/scanner/EnhancedScanHistory";
import { UltraEnhancedCommunityReviewForm } from "@/components/scanner/UltraEnhancedCommunityReviewForm";
import CommunityReviewList from "@/components/CommunityReviewList";
import { ElegantBackground } from "@/components/ElegantBackground";

export default function UnifiedScannerPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");
  const [selectedScanId, setSelectedScanId] = useState<Id<"jobScans"> | null>(null);
  const [currentScanId, setCurrentScanId] = useState<Id<"jobScans"> | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Convex hooks - Manual scan (scans.* functions)
  const scrapeAndAnalyze = useAction(api.scans.actions.scrapeAndAnalyzeAction);
  const requestDeeperReport = useAction(api.scans.actions.requestDeeperReportAction);
  const deleteManualScan = useMutation(api.scans.mutations.deleteScanResultMutation);
  const manualScanHistory = useQuery(api.scans.queries.getScanHistoryQuery);

  // Convex hooks - Ghost job detector (jobScans.* functions)
  const createJobScan = useMutation(api.jobScans.createJobScan);
  const deleteJobScan = useMutation(api.jobScans.deleteJobScan);
  const ghostJobHistory = useQuery(api.jobScans.getRecentUserScans, { limit: 50 });

  // Combine both scan histories
  const combinedHistory = [
    ...(manualScanHistory || []).map(scan => ({ ...scan, type: "manual" as const })),
    ...(ghostJobHistory || []).map(scan => ({ ...scan, type: "ghost" as const }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  const handleManualScan = async (data: { jobInput: string; context?: string }) => {
    setIsScanning(true);
    setSelectedScanId(null);

    try {
      const result = await scrapeAndAnalyze({
        jobInput: data.jobInput,
        context: data.context,
      });

      setCurrentScanId(result.scanId);
      setSelectedScanId(result.scanId);
      toast.success("Job posting analyzed successfully!");
      setActiveTab("history");

      // Scroll to results
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
    context?: string
  }) => {
    setIsScanning(true);
    setSelectedScanId(null);

    try {
      const scanId = await createJobScan({
        jobInput: data.jobInput,
        jobUrl: data.jobUrl,
        context: data.context,
      });

      setSelectedScanId(scanId);
      toast.success("Job scan created! AI analysis in progress...");
      setActiveTab("history");

      // Scroll to results
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

  const handleRequestDeeper = async (email: string) => {
    if (!currentScanId) return;

    try {
      const result = await requestDeeperReport({
        scanId: currentScanId,
        userEmail: email,
      });
      toast.success(result.message);
    } catch (error) {
      console.error("Failed to request deeper report:", error);
      toast.error(error instanceof Error ? error.message : "Failed to request report");
    }
  };

  const handleViewDetails = (scanId: Id<"jobScans">) => {
    setSelectedScanId(scanId);
    setCurrentScanId(null);

    // Scroll to results
    setTimeout(() => {
      document.getElementById("scan-results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleDeleteScan = async (scanId: Id<"jobScans">, type: "manual" | "ghost") => {
    if (!confirm("Are you sure you want to delete this scan?")) {
      return;
    }

    try {
      if (type === "manual") {
        await deleteManualScan({ scanId });
      } else {
        await deleteJobScan({ jobScanId: scanId });
      }

      toast.success("Scan deleted successfully");

      // Clear current view if we're deleting the currently viewed scan
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
    <ElegantBackground>
      <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Hero Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-4">
          <Search className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Job Scanner
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          AI-powered analysis to detect scams, ghost jobs, and red flags in job postings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "scan" | "history")} className="space-y-6">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12">
          <TabsTrigger value="scan" className="text-base">
            <Scan className="mr-2 h-4 w-4" />
            New Scan
          </TabsTrigger>
          <TabsTrigger value="history" className="text-base">
            <History className="mr-2 h-4 w-4" />
            History ({combinedHistory.length})
          </TabsTrigger>
        </TabsList>

        {/* Scan Tab */}
        <TabsContent value="scan" className="space-y-6">
          <div className="max-w-3xl mx-auto">
            <UnifiedScanForm
              onManualScan={handleManualScan}
              onGhostJobScan={handleGhostJobScan}
              isScanning={isScanning}
            />
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* History Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3">
              <EnhancedScanHistory
                scans={combinedHistory}
                selectedScanId={selectedScanId}
                onViewDetails={handleViewDetails}
                onDelete={handleDeleteScan}
              />
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-8 xl:col-span-9">
              {selectedScanId ? (
                <div id="scan-results" className="space-y-6 scroll-mt-8">
                  <EnhancedUnifiedScanResults
                    scanId={selectedScanId}
                    onRequestDeeper={handleRequestDeeper}
                  />

                  <Separator className="bg-white/10" />

                  {/* Community Reviews Section */}
                  <div className="space-y-4">
                    <CommunityReviewList jobScanId={selectedScanId} />

                    <UltraEnhancedCommunityReviewForm jobScanId={selectedScanId} />
                  </div>
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <History className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Scan Selected</h3>
                    <p className="text-muted-foreground text-center max-w-sm">
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
    </ElegantBackground>
  );
}
