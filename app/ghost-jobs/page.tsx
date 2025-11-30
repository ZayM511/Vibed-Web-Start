"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import JobScanForm from "@/components/JobScanForm";
import JobScanResults from "@/components/JobScanResults";
import { CommunityReviewForm } from "@/components/CommunityReviewForm";
import CommunityReviewList from "@/components/CommunityReviewList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Clock, Trash2, XCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ElegantBackground } from "@/components/ElegantBackground";

export default function GhostJobsPage() {
  const { user } = useUser();
  const [selectedScanId, setSelectedScanId] = useState<Id<"jobScans"> | null>(null);
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");

  const recentScans = useQuery(api.jobScans.getRecentUserScans, { limit: 20 });
  const deleteJobScan = useMutation(api.jobScans.deleteJobScan);

  const handleScanCreated = (scanId: string) => {
    setSelectedScanId(scanId as Id<"jobScans">);
    setActiveTab("history");
  };

  const handleDeleteScan = async (scanId: Id<"jobScans">) => {
    if (!confirm("Are you sure you want to delete this scan?")) {
      return;
    }

    try {
      await deleteJobScan({ jobScanId: scanId });
      toast.success("Scan deleted successfully");

      if (selectedScanId === scanId) {
        setSelectedScanId(null);
      }
    } catch (error) {
      console.error("Failed to delete scan:", error);
      toast.error("Failed to delete scan");
    }
  };

  const getStatusIcon = (scan: { report: { jobTitle: string; isScam: boolean; isGhostJob: boolean } }) => {
    if (scan.report.jobTitle === "Analyzing...") {
      return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
    }
    if (scan.report.isScam) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (scan.report.isGhostJob) {
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (scan: { report: { jobTitle: string; isScam: boolean; isGhostJob: boolean } }) => {
    if (scan.report.jobTitle === "Analyzing...") {
      return <Badge variant="secondary">Analyzing</Badge>;
    }
    if (scan.report.isScam) {
      return <Badge variant="destructive">Scam</Badge>;
    }
    if (scan.report.isGhostJob) {
      return <Badge variant="destructive" className="bg-orange-500">Ghost Job</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Legitimate</Badge>;
  };

  if (!user) {
    return (
      <ElegantBackground>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground">Please sign in to use the Ghost Job Detector</p>
            </CardContent>
          </Card>
        </div>
      </ElegantBackground>
    );
  }

  return (
    <ElegantBackground>
      <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Ghost Job Detector</h1>
        <p className="text-muted-foreground">
          Analyze job postings for red flags and get community insights
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "scan" | "history")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan">New Scan</TabsTrigger>
          <TabsTrigger value="history">Scan History</TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-6">
          <JobScanForm onScanCreated={handleScanCreated} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scan History List */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Your Scans</CardTitle>
                  <CardDescription>
                    {recentScans?.length || 0} total scans
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!recentScans || recentScans.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No scans yet. Create your first scan!
                    </p>
                  ) : (
                    recentScans.map((scan) => (
                      <div
                        key={scan._id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedScanId === scan._id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-secondary/50"
                        }`}
                        onClick={() => setSelectedScanId(scan._id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusIcon(scan)}
                              <h3 className="font-medium text-sm truncate">
                                {scan.report.jobTitle}
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {scan.report.company}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {getStatusBadge(scan)}
                              <span className="text-xs text-muted-foreground">
                                {new Date(scan.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScan(scan._id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Selected Scan Details */}
            <div className="lg:col-span-2 space-y-6">
              {selectedScanId ? (
                <>
                  <JobScanResults scanId={selectedScanId} />
                  <Separator />
                  <CommunityReviewList jobScanId={selectedScanId} />
                  <Separator />
                  <CommunityReviewForm jobScanId={selectedScanId} />
                </>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Scan Selected</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Select a scan from the list to view details and community reviews
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
