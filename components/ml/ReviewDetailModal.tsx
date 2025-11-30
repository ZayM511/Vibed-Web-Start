"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  ExternalLink,
  X,
  Shield,
  Ghost,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Building2,
  Briefcase,
  Edit,
  FileEdit,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type ReviewJob = {
  id: string;
  type: "labeling" | "community" | "unreviewed";
  jobTitle: string;
  company: string;
  jobUrl?: string;
  jobContent: string;
  timestamp: number;
  reviewed: boolean;
  // Labeling specific
  isScam?: boolean;
  isGhostJob?: boolean;
  confidence?: number;
  redFlags?: string[];
  notes?: string;
  trainingDataId?: Id<"trainingData">;
  // Thread tracking
  isUpdate?: boolean;
  isOriginal?: boolean;
  updateNumber?: number;
  totalUpdates?: number;
  // Community review specific
  didApply?: boolean;
  gotGhosted?: boolean;
  wasJobReal?: boolean;
  comment?: string;
};

interface ReviewDetailModalProps {
  job: ReviewJob | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewDetailModal({ job, isOpen, onClose }: ReviewDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update review form state
  const [updateIsScam, setUpdateIsScam] = useState<boolean | null>(null);
  const [updateIsGhostJob, setUpdateIsGhostJob] = useState<boolean | null>(null);
  const [updateConfidence, setUpdateConfidence] = useState(3);
  const [updateNotes, setUpdateNotes] = useState("");
  const [updateRedFlags, setUpdateRedFlags] = useState<string[]>([]);

  const addLabel = useMutation(api.trainingData.addLabel);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleOpenOriginal = () => {
    if (job?.jobUrl) {
      window.open(job.jobUrl, "_blank");
    }
  };

  const handleCopyUrl = async () => {
    if (job?.jobUrl) {
      await navigator.clipboard.writeText(job.jobUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartUpdate = () => {
    // Pre-fill with existing values
    if (job?.type === "labeling") {
      setUpdateIsScam(job.isScam ?? null);
      setUpdateIsGhostJob(job.isGhostJob ?? null);
      setUpdateConfidence(job.confidence ?? 3);
      setUpdateNotes(job.notes ?? "");
      setUpdateRedFlags(job.redFlags ?? []);
    }
    setIsUpdating(true);
  };

  const handleCancelUpdate = () => {
    setIsUpdating(false);
    setUpdateIsScam(null);
    setUpdateIsGhostJob(null);
    setUpdateConfidence(3);
    setUpdateNotes("");
    setUpdateRedFlags([]);
  };

  const handleSubmitUpdate = async () => {
    if (!job?.trainingDataId || updateIsScam === null || updateIsGhostJob === null) {
      return;
    }

    try {
      await addLabel({
        trainingDataId: job.trainingDataId,
        isScam: updateIsScam,
        isGhostJob: updateIsGhostJob,
        confidence: updateConfidence,
        redFlags: updateRedFlags,
        notes: updateNotes.trim() || undefined,
      });

      // Reset and close
      handleCancelUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to submit update review:", error);
      alert(`Error submitting update: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const toggleRedFlag = (flag: string) => {
    setUpdateRedFlags((prev) =>
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

  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gradient-to-br from-slate-900 to-slate-800 border-white/10 text-white p-0 overflow-hidden [&>button]:hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <FileEdit className="h-5 w-5 text-indigo-400" />
                  <DialogTitle className="text-2xl font-bold text-white">
                    {isUpdating ? "Update Review" : "Review Details"}
                  </DialogTitle>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-white/60" />
                    <h3 className="text-xl font-semibold text-white">{job.jobTitle}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-white/60" />
                    <DialogDescription className="text-white/60">{job.company}</DialogDescription>
                  </div>
                </div>

                {!isUpdating && (
                  <>
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {/* Update Badge */}
                      {job.isUpdate && (
                        <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Updated Review {job.updateNumber && `#${job.updateNumber}`}
                        </Badge>
                      )}
                      {job.isOriginal && job.totalUpdates && job.totalUpdates > 0 && (
                        <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400">
                          Original Review ({job.totalUpdates} update{job.totalUpdates > 1 ? 's' : ''})
                        </Badge>
                      )}

                      {job.type === "labeling" && (
                        <>
                          {job.isScam && (
                            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400">
                              <Shield className="h-3 w-3 mr-1" />
                              Identified as Scam
                            </Badge>
                          )}
                          {job.isGhostJob && (
                            <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-400">
                              <Ghost className="h-3 w-3 mr-1" />
                              Identified as Ghost Job
                            </Badge>
                          )}
                          {!job.isScam && !job.isGhostJob && (
                            <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Marked as Legitimate
                            </Badge>
                          )}
                          {job.confidence && (
                            <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Confidence: {job.confidence}/5
                            </Badge>
                          )}
                        </>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 mt-4 text-sm text-white/50">
                      <Calendar className="h-4 w-4" />
                      Reviewed on {formatDate(job.timestamp)}
                    </div>
                  </>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-6">
              <AnimatePresence mode="wait">
                {!isUpdating ? (
                  /* Read-Only View */
                  <motion.div
                    key="readonly"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Job URL */}
                    {job.jobUrl && (
                      <div className="space-y-2">
                        <Label className="text-white font-semibold">Job URL</Label>
                        <div className="flex gap-2">
                          <Input
                            value={job.jobUrl}
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
                        </div>
                      </div>
                    )}

                    {/* Original Review Details */}
                    {job.type === "labeling" && (
                      <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-4">
                        <h3 className="font-semibold text-white mb-3">Your Original Review</h3>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-white/50 mb-1">Scam Classification</p>
                              <p className="text-white font-medium">
                                {job.isScam ? "Yes - This is a scam" : "No - This is legitimate"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-white/50 mb-1">Ghost Job Classification</p>
                              <p className="text-white font-medium">
                                {job.isGhostJob ? "Yes - Ghost job posting" : "No - Genuine hiring intent"}
                              </p>
                            </div>
                          </div>

                          {job.confidence && (
                            <div>
                              <p className="text-xs text-white/50 mb-1">Your Confidence</p>
                              <p className="text-white font-medium">{job.confidence}/5</p>
                            </div>
                          )}

                          {job.redFlags && job.redFlags.length > 0 && (
                            <div>
                              <p className="text-xs text-white/50 mb-2">Red Flags Identified</p>
                              <div className="flex flex-wrap gap-2">
                                {job.redFlags.map((flag) => (
                                  <Badge
                                    key={flag}
                                    variant="outline"
                                    className="border-rose-500/30 bg-rose-500/10 text-rose-400"
                                  >
                                    {flag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {job.notes && (
                            <div>
                              <p className="text-xs text-white/50 mb-1">Your Notes</p>
                              <p className="text-white/80 italic">"{job.notes}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Review Type Info with Labeling Choices */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h3 className="font-semibold text-white mb-3">Review Type</h3>
                      <p className="text-white/60 text-sm mb-4">
                        {job.type === "labeling" && (
                          <>
                            <span className="text-indigo-400 font-medium">Quick Review Label:</span> You
                            provided a classification label for this job posting to help train the AI model.
                          </>
                        )}
                        {job.type === "community" && (
                          <>
                            <span className="text-purple-400 font-medium">Community Review:</span> You
                            shared your experience with this job posting to help others in the community.
                          </>
                        )}
                      </p>

                      {/* What You Reviewed */}
                      {job.type === "labeling" && (
                        <div className="pt-3 border-t border-white/10">
                          <p className="text-xs text-white/50 mb-2 font-semibold">What You Reviewed:</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-white/70">Is this a SCAM?</span>
                              <span className={cn(
                                "font-medium",
                                job.isScam ? "text-rose-400" : "text-green-400"
                              )}>
                                {job.isScam ? "Yes" : "No"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-white/70">Is this a GHOST JOB?</span>
                              <span className={cn(
                                "font-medium",
                                job.isGhostJob ? "text-purple-400" : "text-green-400"
                              )}>
                                {job.isGhostJob ? "Yes" : "No"}
                              </span>
                            </div>
                            {job.confidence && (
                              <div className="flex items-center justify-between">
                                <span className="text-white/70">Confidence Level</span>
                                <span className="text-indigo-400 font-medium">{job.confidence}/5</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  /* Update Review Form */
                  <motion.div
                    key="update"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-amber-400 mb-2">
                        <Edit className="h-4 w-4" />
                        <p className="font-semibold">Submitting an Update</p>
                      </div>
                      <p className="text-white/70 text-sm">
                        This will create a new review record marked as an update to your original review.
                        Both reviews will be preserved for tracking purposes.
                      </p>
                    </div>

                    {/* Update Labeling Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Scam Classification */}
                      <div className="space-y-3">
                        <Label className="text-white font-semibold">Is this a SCAM?</Label>
                        <RadioGroup
                          value={updateIsScam === null ? "" : updateIsScam.toString()}
                          onValueChange={(value) => setUpdateIsScam(value === "true")}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="update-scam-yes" />
                            <Label htmlFor="update-scam-yes" className="text-white/80 cursor-pointer">
                              Yes - This is a scam
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="update-scam-no" />
                            <Label htmlFor="update-scam-no" className="text-white/80 cursor-pointer">
                              No - This is legitimate
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Ghost Job Classification */}
                      <div className="space-y-3">
                        <Label className="text-white font-semibold">Is this a GHOST JOB?</Label>
                        <RadioGroup
                          value={updateIsGhostJob === null ? "" : updateIsGhostJob.toString()}
                          onValueChange={(value) => setUpdateIsGhostJob(value === "true")}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="update-ghost-yes" />
                            <Label htmlFor="update-ghost-yes" className="text-white/80 cursor-pointer">
                              Yes - Ghost job posting
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="update-ghost-no" />
                            <Label htmlFor="update-ghost-no" className="text-white/80 cursor-pointer">
                              No - Genuine hiring intent
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    {/* Confidence Slider */}
                    <div className="space-y-3">
                      <Label className="text-white font-semibold">
                        Your Confidence: {updateConfidence}/5
                      </Label>
                      <div className="relative pb-2">
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={updateConfidence}
                          onChange={(e) => setUpdateConfidence(Number(e.target.value))}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                          style={{ accentColor: "#8b5cf6" }}
                        />
                        <div className="absolute w-full flex justify-between px-0.5 pointer-events-none" style={{ top: "10px" }}>
                          {[1, 2, 3, 4, 5].map((tick) => (
                            <div key={tick} className="w-0.5 h-3 bg-white/40" />
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
                            variant={updateRedFlags.includes(flag) ? "default" : "outline"}
                            className={`cursor-pointer transition-colors ${
                              updateRedFlags.includes(flag)
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
                        value={updateNotes}
                        onChange={(e) => setUpdateNotes(e.target.value)}
                        placeholder="Any changes or new observations..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-white/10 bg-gradient-to-r from-white/[0.02] to-white/[0.04]">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-white/50">
                {!isUpdating && job.jobUrl && "View the original job posting"}
              </div>
              <div className="flex gap-3">
                {!isUpdating ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="border-white/20 hover:bg-white/5 text-white"
                    >
                      Close
                    </Button>
                    {job.type === "labeling" && (
                      <Button
                        onClick={handleStartUpdate}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Submit Update Review
                      </Button>
                    )}
                    {job.jobUrl && (
                      <Button
                        onClick={handleOpenOriginal}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Original Job
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelUpdate}
                      className="border-white/20 hover:bg-white/5 text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitUpdate}
                      disabled={updateIsScam === null || updateIsGhostJob === null}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50"
                    >
                      Submit Update
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
