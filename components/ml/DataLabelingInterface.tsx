"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Award, TrendingUp, Copy, Check, ExternalLink, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewHistoryList } from "./ReviewHistoryList";

export function DataLabelingInterface() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<Id<"trainingData"> | null>(null);
  const [isScam, setIsScam] = useState<boolean | null>(null);
  const [isGhostJob, setIsGhostJob] = useState<boolean | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [notes, setNotes] = useState("");
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
  const [hasApplied, setHasApplied] = useState<boolean | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  // Fetch unlabeled data for active learning
  // Temporarily using getAllTrainingData to debug
  const unlabeledData = useQuery(api.trainingData.getTrainingData, {});

  const addLabel = useMutation(api.trainingData.addLabel);
  const labelerStats = useQuery(api.trainingData.getLabelerStats);

  // Debug logging
  console.log("DataLabelingInterface - unlabeledData:", unlabeledData);
  console.log("DataLabelingInterface - unlabeledData length:", unlabeledData?.length);

  // Get current job - either selected job or sequential job from index
  const currentJob = selectedJobId
    ? unlabeledData?.find(job => job._id === selectedJobId)
    : unlabeledData?.[currentIndex];

  // Handler for when a pending job is clicked from Review History
  const handleSelectJob = (jobId: Id<"trainingData">) => {
    setSelectedJobId(jobId);
    // Reset form
    setIsScam(null);
    setIsGhostJob(null);
    setConfidence(3);
    setNotes("");
    setSelectedRedFlags([]);
    setHasApplied(null);
    setWouldRecommend(null);
  };

  // Handler to go back to review history
  const handleBackToHistory = () => {
    setSelectedJobId(null);
    setIsScam(null);
    setIsGhostJob(null);
    setConfidence(3);
    setNotes("");
    setSelectedRedFlags([]);
    setHasApplied(null);
    setWouldRecommend(null);
  };

  // Copy URL to clipboard
  const [copied, setCopied] = useState(false);
  const handleCopyUrl = async () => {
    if (currentJob?.jobUrl) {
      await navigator.clipboard.writeText(currentJob.jobUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitLabel = async () => {
    console.log("🔵 Submit button clicked!");
    console.log("Current job:", currentJob);
    console.log("isScam:", isScam);
    console.log("isGhostJob:", isGhostJob);
    console.log("confidence:", confidence);

    if (!currentJob || isScam === null || isGhostJob === null) {
      console.log("❌ Validation failed - missing required fields");
      console.log("currentJob exists:", !!currentJob);
      console.log("isScam is set:", isScam !== null);
      console.log("isGhostJob is set:", isGhostJob !== null);
      return;
    }

    console.log("✅ Validation passed, calling addLabel mutation...");

    try {
      const result = await addLabel({
        trainingDataId: currentJob._id,
        isScam,
        isGhostJob,
        confidence,
        redFlags: selectedRedFlags,
        notes: notes.trim() || undefined,
      });

      console.log("✅ Label submitted successfully:", result);

      // Reset for next job
      setIsScam(null);
      setIsGhostJob(null);
      setConfidence(3);
      setNotes("");
      setSelectedRedFlags([]);
      setHasApplied(null);
      setWouldRecommend(null);

      // Go back to review history instead of moving to next job
      setSelectedJobId(null);
      console.log("✅ Label submitted, returning to history");
    } catch (error) {
      console.error("❌ Failed to submit label:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fullError: error,
      });
      alert(`Error submitting label: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSkip = () => {
    setCurrentIndex((prev) => prev + 1);
    setIsScam(null);
    setIsGhostJob(null);
    setConfidence(3);
    setNotes("");
    setSelectedRedFlags([]);
    setHasApplied(null);
    setWouldRecommend(null);
    setSelectedJobId(null); // Clear selected job
  };

  const toggleRedFlag = (flag: string) => {
    setSelectedRedFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  const commonRedFlags = [
    "Requests payment/fees",
    "Requests SSN/bank info",
    "Unrealistic salary",
    "Poor grammar/spelling",
    "Vague job description",
    "Generic email address",
    "Pressure tactics",
    "Too good to be true",
    "No company information",
    "Suspicious contact method",
  ];

  if (!unlabeledData) {
    return (
      <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-white/60 mt-4">Loading labeling queue...</p>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no data at all
  if (unlabeledData.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">All Caught Up!</h3>
          <p className="text-white/60 mb-6">
            No jobs need labeling right now. Start scanning jobs to populate the training queue!
          </p>
          <Button
            onClick={() => window.location.href = "/filtr"}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          >
            Go to Scanner
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show completion state if finished all jobs
  if (!currentJob || currentIndex >= unlabeledData.length) {
    return (
      <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Queue Complete!</h3>
          <p className="text-white/60 mb-6">
            You&apos;ve labeled all {unlabeledData.length} jobs in the queue. Great work!
          </p>
          <Button
            onClick={() => setCurrentIndex(0)}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          >
            Review From Start
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show labeling interface if a job is selected
  if (selectedJobId && currentJob) {
    const progress = ((currentIndex + 1) / unlabeledData.length) * 100;

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={handleBackToHistory}
          className="border-white/20 hover:bg-white/5 text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Review History
        </Button>

        {/* Debug info */}
        <div className="bg-green-500/10 border border-green-500/30 rounded p-4 text-green-200">
          <p className="font-bold text-xl">✅ System Working! You have {unlabeledData?.length || 0} jobs ready to label!</p>
          <p className="text-lg mt-2">Currently viewing: Job {currentIndex + 1} of {unlabeledData?.length || 0}</p>
          <p className="text-sm mt-2 text-green-300">After you label this job and click Submit, you&apos;ll return to the review history!</p>
        </div>

        {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-indigo-400" />
              <div>
                <p className="text-sm text-white/60">Your Contributions</p>
                <p className="text-2xl font-bold text-white">
                  {labelerStats?.totalLabels || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-sm text-white/60">Avg Confidence</p>
                <p className="text-2xl font-bold text-white">
                  {labelerStats?.avgConfidence
                    ? `${labelerStats.avgConfidence.toFixed(1)}/5`
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-pink-400" />
              <div>
                <p className="text-sm text-white/60">Progress</p>
                <p className="text-2xl font-bold text-white">
                  {currentIndex + 1}/{unlabeledData.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Labeling Interface */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentJob._id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-white">
                    {currentJob.jobTitle}
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    {currentJob.company}
                  </CardDescription>
                </div>
                {currentJob.predictedConfidence !== undefined && (
                  <Badge
                    variant="outline"
                    className={`${
                      currentJob.predictedConfidence < 50
                        ? "border-yellow-500/50 text-yellow-400"
                        : currentJob.predictedConfidence > 80
                        ? "border-green-500/50 text-green-400"
                        : "border-orange-500/50 text-orange-400"
                    }`}
                  >
                    Model Confidence: {currentJob.predictedConfidence}%
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Job Content */}
              <div className="bg-white/5 rounded-lg p-4 max-h-64 overflow-y-auto">
                <p className="text-white/80 text-sm whitespace-pre-wrap">
                  {currentJob.jobContent.substring(0, 1000)}
                  {currentJob.jobContent.length > 1000 && "..."}
                </p>
              </div>

              {/* Job URL */}
              {currentJob.jobUrl && (
                <div className="space-y-2">
                  <Label className="text-white font-semibold">URL Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={currentJob.jobUrl}
                      readOnly
                      className="bg-white/5 border-white/10 text-white/70 flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyUrl}
                      className="border-white/20 hover:bg-white/5 text-white shrink-0"
                      title="Copy URL"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(currentJob.jobUrl, "_blank")}
                      className="border-white/20 hover:bg-white/5 text-white shrink-0"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Model Prediction (if available) */}
              {currentJob.predictedScam !== undefined && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                  <p className="text-sm text-white/60 mb-2">AI Prediction:</p>
                  <div className="flex gap-4">
                    <Badge variant={currentJob.predictedScam ? "destructive" : "secondary"}>
                      Scam: {currentJob.predictedScam ? "Yes" : "No"}
                    </Badge>
                    <Badge variant={currentJob.predictedGhost ? "destructive" : "secondary"}>
                      Ghost Job: {currentJob.predictedGhost ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Labeling Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scam Classification */}
                <div className="space-y-3">
                  <Label className="text-white font-semibold">Is this a SCAM?</Label>
                  <RadioGroup
                    value={isScam === null ? "" : isScam.toString()}
                    onValueChange={(value) => setIsScam(value === "true")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="scam-yes" />
                      <Label htmlFor="scam-yes" className="text-white/80 cursor-pointer">
                        Yes - This is a scam
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="scam-no" />
                      <Label htmlFor="scam-no" className="text-white/80 cursor-pointer">
                        No - This is legitimate
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Ghost Job Classification */}
                <div className="space-y-3">
                  <Label className="text-white font-semibold">Is this a GHOST JOB?</Label>
                  <RadioGroup
                    value={isGhostJob === null ? "" : isGhostJob.toString()}
                    onValueChange={(value) => setIsGhostJob(value === "true")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="ghost-yes" />
                      <Label htmlFor="ghost-yes" className="text-white/80 cursor-pointer">
                        Yes - Ghost job posting
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="ghost-no" />
                      <Label htmlFor="ghost-no" className="text-white/80 cursor-pointer">
                        No - Genuine hiring intent
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Have You Applied */}
                <div className="space-y-3">
                  <Label className="text-white font-semibold">Have you applied to this job?</Label>
                  <RadioGroup
                    value={hasApplied === null ? "" : hasApplied.toString()}
                    onValueChange={(value) => setHasApplied(value === "true")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="applied-yes" />
                      <Label htmlFor="applied-yes" className="text-white/80 cursor-pointer">
                        Yes - I have applied
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="applied-no" />
                      <Label htmlFor="applied-no" className="text-white/80 cursor-pointer">
                        No - I have not applied
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Would Recommend Applying */}
                <div className="space-y-3">
                  <Label className="text-white font-semibold">Would you recommend applying?</Label>
                  <RadioGroup
                    value={wouldRecommend === null ? "" : wouldRecommend.toString()}
                    onValueChange={(value) => setWouldRecommend(value === "true")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="recommend-yes" />
                      <Label htmlFor="recommend-yes" className="text-white/80 cursor-pointer">
                        Yes - I would recommend
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="recommend-no" />
                      <Label htmlFor="recommend-no" className="text-white/80 cursor-pointer">
                        No - I would not recommend
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Confidence Slider */}
              <div className="space-y-3">
                <Label className="text-white font-semibold">
                  Your Confidence: {confidence}/5
                </Label>
                <div className="relative pb-2">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    style={{
                      accentColor: "#8b5cf6",
                    }}
                  />
                  {/* Tick marks */}
                  <div className="absolute w-full flex justify-between px-0.5 pointer-events-none" style={{ top: "10px" }}>
                    {[1, 2, 3, 4, 5].map((tick) => (
                      <div
                        key={tick}
                        className="w-0.5 h-3 bg-white/40"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-white/50 px-0.5">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
                <div className="flex justify-between text-xs text-white/50">
                  <span>Not Sure</span>
                  <span>Very Confident</span>
                </div>
              </div>

              {/* Red Flags */}
              <div className="space-y-3">
                <Label className="text-white font-semibold">Red Flags (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {commonRedFlags.map((flag) => (
                    <Badge
                      key={flag}
                      variant={selectedRedFlags.includes(flag) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors ${
                        selectedRedFlags.includes(flag)
                          ? "bg-rose-500 hover:bg-rose-600 border-rose-500"
                          : "border-white/20 hover:border-rose-500/50"
                      }`}
                      onClick={() => toggleRedFlag(flag)}
                    >
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <Label className="text-white font-semibold">Additional Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional observations or reasoning..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="border-white/20 text-white hover:bg-white/5"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleSubmitLabel}
                  disabled={isScam === null || isGhostJob === null}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50"
                >
                  Submit Label
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
      </div>
    );
  }

  // Default: Show Review History
  return <ReviewHistoryList onSelectJob={handleSelectJob} />;
}
