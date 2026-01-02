"use client";

// Component no longer needs useState
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ExternalLink,
  X,
  Shield,
  Ghost,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Calendar,
  Building2,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  // Community review specific
  didApply?: boolean;
  gotGhosted?: boolean;
  wasJobReal?: boolean;
  comment?: string;
};

interface JobPreviewModalProps {
  job: ReviewJob;
  isOpen: boolean;
  onClose: () => void;
}

export function JobPreviewModal({ job, isOpen, onClose }: JobPreviewModalProps) {
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
    if (job.jobUrl) {
      window.open(job.jobUrl, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gradient-to-br from-slate-900 to-slate-800 border-white/10 text-white p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Briefcase className="h-6 w-6 text-indigo-400" />
                  {job.jobTitle}
                </DialogTitle>
                <DialogDescription className="text-white/60 flex items-center gap-2 mb-4">
                  <Building2 className="h-4 w-4" />
                  {job.company}
                </DialogDescription>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {job.type === "labeling" && (
                    <>
                      {job.isScam && (
                        <Badge
                          variant="outline"
                          className="border-rose-500/30 bg-rose-500/10 text-rose-400"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Identified as Scam
                        </Badge>
                      )}
                      {job.isGhostJob && (
                        <Badge
                          variant="outline"
                          className="border-purple-500/30 bg-purple-500/10 text-purple-400"
                        >
                          <Ghost className="h-3 w-3 mr-1" />
                          Identified as Ghost Job
                        </Badge>
                      )}
                      {!job.isScam && !job.isGhostJob && (
                        <Badge
                          variant="outline"
                          className="border-green-500/30 bg-green-500/10 text-green-400"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Marked as Legitimate
                        </Badge>
                      )}
                      {job.confidence && (
                        <Badge
                          variant="outline"
                          className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Confidence: {job.confidence}/5
                        </Badge>
                      )}
                    </>
                  )}

                  {job.type === "community" && (
                    <>
                      {job.didApply && (
                        <Badge
                          variant="outline"
                          className="border-blue-500/30 bg-blue-500/10 text-blue-400"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Applied
                        </Badge>
                      )}
                      {job.gotGhosted && (
                        <Badge
                          variant="outline"
                          className="border-purple-500/30 bg-purple-500/10 text-purple-400"
                        >
                          <Ghost className="h-3 w-3 mr-1" />
                          Got Ghosted
                        </Badge>
                      )}
                      {job.wasJobReal !== undefined && (
                        <Badge
                          variant="outline"
                          className={cn(
                            job.wasJobReal
                              ? "border-green-500/30 bg-green-500/10 text-green-400"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                          )}
                        >
                          {job.wasJobReal ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Real Job
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Fake Job
                            </>
                          )}
                        </Badge>
                      )}
                    </>
                  )}

                  {job.type === "unreviewed" && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 text-amber-400"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Not Yet Reviewed
                    </Badge>
                  )}
                </div>
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

            {/* Timestamp */}
            <div className="flex items-center gap-2 mt-4 text-sm text-white/50">
              <Calendar className="h-4 w-4" />
              Reviewed on {formatDate(job.timestamp)}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-6">
              <div className="space-y-6">
                {/* Community Review Comment */}
                {job.comment && (
                  <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-5 w-5 text-indigo-400" />
                      <h3 className="font-semibold text-white">Your Review</h3>
                    </div>
                    <p className="text-white/80 italic">&quot;{job.comment}&quot;</p>
                  </div>
                )}

                {/* Job Content */}
                <div>
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-purple-400" />
                    Job Posting Content
                  </h3>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-white/70 whitespace-pre-wrap text-sm leading-relaxed">
                      {job.jobContent}
                    </p>
                  </div>
                </div>

                {/* Review Type Info */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="font-semibold text-white mb-2">Review Type</h3>
                  <p className="text-white/60 text-sm">
                    {job.type === "labeling" && (
                      <>
                        <span className="text-indigo-400 font-medium">Quick Review Label:</span> You
                        provided a classification label for this job posting to help train the AI
                        model.
                      </>
                    )}
                    {job.type === "community" && (
                      <>
                        <span className="text-purple-400 font-medium">Community Review:</span> You
                        shared your experience with this job posting to help others in the community.
                      </>
                    )}
                    {job.type === "unreviewed" && (
                      <>
                        <span className="text-amber-400 font-medium">Pending Review:</span> This job
                        posting is awaiting your review and classification.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-white/10 bg-gradient-to-r from-white/[0.02] to-white/[0.04]">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-white/50">
                {job.jobUrl
                  ? "View the original job posting"
                  : "Original URL not available"}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-white/20 hover:bg-white/5 text-white"
                >
                  Close
                </Button>
                {job.jobUrl && (
                  <Button
                    onClick={handleOpenOriginal}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Original Job
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
