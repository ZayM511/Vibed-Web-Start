"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Link2, FileText, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UnifiedScanFormProps {
  onManualScan: (data: { jobInput: string; context?: string }) => Promise<void>;
  onGhostJobScan: (data: { jobInput: string; jobUrl?: string; context?: string }) => Promise<void>;
  isScanning: boolean;
}

export function UnifiedScanForm({ onManualScan, onGhostJobScan, isScanning }: UnifiedScanFormProps) {
  const [scanMode, setScanMode] = useState<"quick" | "deep">("quick");
  const [inputMode, setInputMode] = useState<"url" | "text">("url");

  // Form fields
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const jobInput = inputMode === "url" ? jobUrl : jobText;

    if (!jobInput.trim()) {
      return;
    }

    const data = {
      jobInput: jobInput.trim(),
      jobUrl: inputMode === "url" ? jobUrl.trim() : undefined,
      context: undefined,
    };

    if (scanMode === "quick") {
      await onGhostJobScan(data);
    } else {
      await onManualScan(data);
    }

    // Reset form
    setJobUrl("");
    setJobText("");
    setPositionTitle("");
    setCompanyName("");
  };

  const isFormValid = inputMode === "url" ? jobUrl.trim().length > 0 : jobText.trim().length > 0;

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-2xl">Analyze Job Posting</CardTitle>
            <CardDescription>
              Choose your scan type and input method to get started
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            Beta
          </Badge>
        </div>

        <Separator />

        {/* Scan Mode Toggle */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Scan Type</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScanMode("quick")}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                scanMode === "quick"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2 ${scanMode === "quick" ? "bg-primary/10" : "bg-muted"}`}>
                  <Sparkles className={`h-4 w-4 ${scanMode === "quick" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1">Quick Scan</div>
                  <div className="text-xs text-muted-foreground">
                    Fast AI analysis with community reviews
                  </div>
                </div>
              </div>
              {scanMode === "quick" && (
                <div className="absolute top-2 right-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setScanMode("deep")}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                scanMode === "deep"
                  ? "border-purple-500 bg-purple-500/5"
                  : "border-border hover:border-purple-500/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2 ${scanMode === "deep" ? "bg-purple-500/10" : "bg-muted"}`}>
                  <Zap className={`h-4 w-4 ${scanMode === "deep" ? "text-purple-500" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1">Deep Analysis</div>
                  <div className="text-xs text-muted-foreground">
                    Comprehensive report with detailed insights
                  </div>
                </div>
              </div>
              {scanMode === "deep" && (
                <div className="absolute top-2 right-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                </div>
              )}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Mode Tabs */}
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "url" | "text")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">
                <Link2 className="mr-2 h-4 w-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="text">
                <FileText className="mr-2 h-4 w-4" />
                Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="job-url" className="text-base">
                  Job Posting URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="job-url"
                  type="url"
                  placeholder="https://linkedin.com/jobs/view/..."
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  disabled={isScanning}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  Paste the full URL from LinkedIn, Indeed, Glassdoor, or any job board
                </p>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="job-text" className="text-base">
                  Job Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="job-text"
                  placeholder="Paste the complete job posting here including:&#10;• Job title&#10;• Company name&#10;• Job description&#10;• Requirements&#10;• Benefits&#10;• Application details"
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  disabled={isScanning}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Copy the entire job posting for the most accurate analysis
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Optional Fields */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Optional Details</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position-title" className="text-sm">
                  Position Title
                </Label>
                <Input
                  id="position-title"
                  type="text"
                  placeholder="e.g., Senior Software Engineer"
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  disabled={isScanning}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name" className="text-sm">
                  Company Name
                </Label>
                <Input
                  id="company-name"
                  type="text"
                  placeholder="e.g., Tech Corp Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isScanning}
                  className="h-11"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Adding position and company details can improve analysis accuracy
            </p>
          </div>

          {/* Animated Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isScanning}
            className={`
              group relative w-full h-16 text-lg font-bold rounded-lg overflow-hidden
              transition-all duration-300
              ${!isFormValid || isScanning
                ? 'bg-gray-400 cursor-not-allowed'
                : scanMode === "quick"
                  ? 'bg-[#001f54] hover:shadow-lg hover:shadow-blue-500/50'
                  : 'bg-[#6B46C1] hover:shadow-lg hover:shadow-purple-500/50'
              }
            `}
          >
            {/* Animated gradient overlay - only shows when ready */}
            {isFormValid && !isScanning && (
              <div
                className={`absolute inset-0 ${
                  scanMode === "quick"
                    ? 'bg-gradient-to-r from-[#001f54] via-[#0039a6] to-[#001f54]'
                    : 'bg-gradient-to-r from-[#6B46C1] via-[#9333EA] to-[#6B46C1]'
                } bg-[length:200%_100%] animate-gradient`}
              />
            )}

            <span className="relative z-10 flex items-center justify-center text-white gap-3">
              {isScanning ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="tracking-wide font-semibold">
                    Analyzing Job Posting...
                  </span>
                </>
              ) : (
                <>
                  {scanMode === "quick" ? (
                    <Sparkles className="h-6 w-6 group-hover:animate-pulse" />
                  ) : (
                    <Zap className="h-6 w-6 group-hover:animate-bounce" />
                  )}
                  <span className="tracking-wide font-extrabold" style={{ fontFamily: 'var(--font-sans)' }}>
                    {scanMode === "quick" ? "Quick Scan" : "Deep Analysis"}
                  </span>
                  {scanMode === "quick" ? (
                    <Sparkles className="h-6 w-6 group-hover:animate-pulse" />
                  ) : (
                    <Zap className="h-6 w-6 group-hover:animate-bounce" />
                  )}
                </>
              )}
            </span>
          </button>

          <p className="text-xs text-center text-muted-foreground">
            {scanMode === "quick"
              ? "Fast AI-powered analysis with community insights"
              : "Comprehensive web scraping, AI evaluation, and exportable reports"
            }
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
