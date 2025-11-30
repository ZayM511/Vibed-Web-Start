"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  ExternalLink,
  Eye,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ghost,
  Shield,
  MessageSquare,
  TrendingUp,
  FileCheck,
  Sparkles,
  Search,
  RefreshCw,
  CornerDownRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { JobPreviewModal } from "./JobPreviewModal";
import { ReviewDetailModal } from "./ReviewDetailModal";

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

interface ReviewHistoryListProps {
  onSelectJob?: (jobId: Id<"trainingData">) => void;
}

export function ReviewHistoryList({ onSelectJob }: ReviewHistoryListProps) {
  const [selectedTab, setSelectedTab] = useState("unreviewed");
  const [previewJob, setPreviewJob] = useState<ReviewJob | null>(null);
  const [reviewDetailJob, setReviewDetailJob] = useState<ReviewJob | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const reviewHistory = useQuery(api.reviewHistory.getUserReviewHistory);
  const stats = useQuery(api.reviewHistory.getReviewStats);

  if (!reviewHistory || !stats) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { reviewed, unreviewed, stats: historyStat } = reviewHistory;

  // Filter jobs based on search query
  const filterJobs = (jobs: typeof reviewed) => {
    if (!searchQuery.trim()) return jobs;
    const query = searchQuery.toLowerCase();
    return jobs.filter(
      (job) =>
        job.jobTitle.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query)
    );
  };

  // Group reviewed jobs into threads by trainingDataId
  const groupIntoThreads = (jobs: typeof reviewed) => {
    const threads: Array<{ original: ReviewJob; updates: ReviewJob[] }> = [];
    const grouped = new Map<string, ReviewJob[]>();

    // Group by trainingDataId
    jobs.forEach((job) => {
      if (job.type === "labeling" && job.trainingDataId) {
        const key = job.trainingDataId;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(job);
      } else {
        // Community reviews don't have threads, add them directly
        threads.push({ original: job, updates: [] });
      }
    });

    // Convert grouped labeling reviews into thread structure
    grouped.forEach((reviewsForJob) => {
      // Sort by timestamp (oldest first)
      const sorted = reviewsForJob.sort((a, b) => a.timestamp - b.timestamp);
      const original = sorted[0];
      const updates = sorted.slice(1);
      threads.push({ original, updates });
    });

    // Sort threads by most recent activity (original or latest update)
    return threads.sort((a, b) => {
      const aLatest = a.updates.length > 0
        ? a.updates[a.updates.length - 1].timestamp
        : a.original.timestamp;
      const bLatest = b.updates.length > 0
        ? b.updates[b.updates.length - 1].timestamp
        : b.original.timestamp;
      return bLatest - aLatest;
    });
  };

  const filteredReviewed = filterJobs(reviewed);
  const reviewThreads = groupIntoThreads(filteredReviewed);
  const filteredUnreviewed = filterJobs(unreviewed);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <FileCheck className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-white/60">Total Reviewed</p>
                <p className="text-2xl font-bold text-white">
                  {historyStat.totalReviewed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-white/60">Labels Given</p>
                <p className="text-2xl font-bold text-white">
                  {historyStat.totalLabeled}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <MessageSquare className="h-5 w-5 text-pink-400" />
              </div>
              <div>
                <p className="text-xs text-white/60">Community Reviews</p>
                <p className="text-2xl font-bold text-white">
                  {historyStat.totalCommunityReviews}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-white/60">Avg Confidence</p>
                <p className="text-2xl font-bold text-white">
                  {stats.avgConfidence}/5
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review History Tabs */}
      <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
        <CardContent className="p-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2 bg-white/5 backdrop-blur-sm border border-white/10 p-1 mb-6">
              <TabsTrigger
                value="unreviewed"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:text-white"
              >
                <Clock className="h-4 w-4" />
                Pending ({historyStat.totalUnreviewed})
              </TabsTrigger>
              <TabsTrigger
                value="reviewed"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                Reviewed ({historyStat.totalReviewed})
              </TabsTrigger>
            </TabsList>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  type="text"
                  placeholder="Search jobs by title or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Unreviewed Jobs */}
            <TabsContent value="unreviewed" className="mt-0">
              <div className="space-y-3">
                {filteredUnreviewed.length === 0 ? (
                  <div className="text-center py-12">
                    {searchQuery ? (
                      <>
                        <Search className="h-12 w-12 text-white/30 mx-auto mb-4" />
                        <p className="text-white/60">No jobs found</p>
                        <p className="text-white/40 text-sm mt-2">
                          Try a different search term
                        </p>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-12 w-12 text-white/30 mx-auto mb-4" />
                        <p className="text-white/60">All caught up!</p>
                        <p className="text-white/40 text-sm mt-2">
                          No pending jobs to review
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredUnreviewed.map((job, index) => (
                      <ReviewJobCard
                        key={job.id}
                        job={job}
                        index={index}
                        onPreview={() => setPreviewJob(job)}
                        onSelect={onSelectJob}
                        isPending={true}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </TabsContent>

            {/* Reviewed Jobs */}
            <TabsContent value="reviewed" className="mt-0">
              <div className="space-y-4">
                {reviewThreads.length === 0 ? (
                  <div className="text-center py-12">
                    {searchQuery ? (
                      <>
                        <Search className="h-12 w-12 text-white/30 mx-auto mb-4" />
                        <p className="text-white/60">No jobs found</p>
                        <p className="text-white/40 text-sm mt-2">
                          Try a different search term
                        </p>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-12 w-12 text-white/30 mx-auto mb-4" />
                        <p className="text-white/60">No reviews yet</p>
                        <p className="text-white/40 text-sm mt-2">
                          Start labeling jobs to build your review history
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {reviewThreads.map((thread, threadIndex) => (
                      <ReviewThread
                        key={thread.original.id}
                        thread={thread}
                        index={threadIndex}
                        onPreview={setPreviewJob}
                        onReviewDetail={setReviewDetailJob}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Job Preview Modal */}
      {previewJob && (
        <JobPreviewModal
          job={previewJob}
          isOpen={!!previewJob}
          onClose={() => setPreviewJob(null)}
        />
      )}

      {/* Review Detail Modal */}
      <ReviewDetailModal
        job={reviewDetailJob}
        isOpen={!!reviewDetailJob}
        onClose={() => setReviewDetailJob(null)}
      />
    </div>
  );
}

interface ReviewJobCardProps {
  job: ReviewJob;
  index: number;
  onPreview: () => void;
  onSelect?: (jobId: Id<"trainingData">) => void;
  onReviewDetail?: () => void;
  isPending?: boolean;
}

function ReviewJobCard({ job, index, onPreview, onSelect, onReviewDetail, isPending = false }: ReviewJobCardProps) {
  const handleCardClick = () => {
    if (isPending && onSelect) {
      // The job.id should be the training data ID for pending jobs
      onSelect(job.id as Id<"trainingData">);
    } else if (!isPending && onReviewDetail) {
      // For reviewed jobs, open the review detail modal
      onReviewDetail();
    }
  };
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Card
        className={cn(
          "bg-white/5 border-white/10 hover:border-white/20 transition-all duration-200 group",
          (isPending || onReviewDetail) && "cursor-pointer hover:bg-white/10"
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Job Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {job.jobTitle}
                  </h3>
                  <p className="text-sm text-white/60 truncate">{job.company}</p>
                </div>
              </div>

              {/* Review Details */}
              <div className="flex flex-wrap gap-2 mb-3">
                {job.type === "labeling" && (
                  <>
                    {job.isScam && (
                      <Badge
                        variant="outline"
                        className="border-rose-500/30 bg-rose-500/10 text-rose-400"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Scam
                      </Badge>
                    )}
                    {job.isGhostJob && (
                      <Badge
                        variant="outline"
                        className="border-purple-500/30 bg-purple-500/10 text-purple-400"
                      >
                        <Ghost className="h-3 w-3 mr-1" />
                        Ghost Job
                      </Badge>
                    )}
                    {job.confidence && (
                      <Badge
                        variant="outline"
                        className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                      >
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
                        Applied
                      </Badge>
                    )}
                    {job.gotGhosted && (
                      <Badge
                        variant="outline"
                        className="border-purple-500/30 bg-purple-500/10 text-purple-400"
                      >
                        Ghosted
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
                        {job.wasJobReal ? "Real Job" : "Fake Job"}
                      </Badge>
                    )}
                  </>
                )}

                {job.type === "unreviewed" && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-amber-400"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Not Reviewed
                  </Badge>
                )}
              </div>

              {/* Comment Preview */}
              {job.comment && (
                <p className="text-sm text-white/50 line-clamp-2 italic">
                  "{job.comment}"
                </p>
              )}

              {/* Timestamp */}
              <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(job.timestamp)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
                className="border-white/20 hover:bg-white/5 text-white group/btn"
              >
                <Eye className="h-4 w-4 mr-1 group-hover/btn:text-indigo-400 transition-colors" />
                Preview
              </Button>

              {job.jobUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(job.jobUrl, "_blank");
                  }}
                  className="border-white/20 hover:bg-white/5 text-white group/btn"
                >
                  <ExternalLink className="h-4 w-4 mr-1 group-hover/btn:text-purple-400 transition-colors" />
                  Open
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ReviewThread Component - Shows original review and updates
interface ReviewThreadProps {
  thread: { original: ReviewJob; updates: ReviewJob[] };
  index: number;
  onPreview: (job: ReviewJob) => void;
  onReviewDetail: (job: ReviewJob) => void;
}

function ReviewThread({ thread, index, onPreview, onReviewDetail }: ReviewThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { original, updates } = thread;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="space-y-2"
    >
      {/* Original Review */}
      <Card
        className="bg-white/5 border-white/10 hover:border-white/20 transition-all duration-200 group cursor-pointer hover:bg-white/10"
        onClick={() => onReviewDetail(original)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Job Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {original.jobTitle}
                  </h3>
                  <p className="text-sm text-white/60 truncate">{original.company}</p>
                </div>
                {updates.length > 0 && (
                  <Badge
                    variant="outline"
                    className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shrink-0"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {updates.length} update{updates.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {/* Review Details */}
              <div className="flex flex-wrap gap-2 mb-3">
                {original.type === "labeling" && (
                  <>
                    {original.isScam && (
                      <Badge
                        variant="outline"
                        className="border-rose-500/30 bg-rose-500/10 text-rose-400"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Scam
                      </Badge>
                    )}
                    {original.isGhostJob && (
                      <Badge
                        variant="outline"
                        className="border-purple-500/30 bg-purple-500/10 text-purple-400"
                      >
                        <Ghost className="h-3 w-3 mr-1" />
                        Ghost Job
                      </Badge>
                    )}
                    {original.confidence && (
                      <Badge
                        variant="outline"
                        className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                      >
                        Confidence: {original.confidence}/5
                      </Badge>
                    )}
                  </>
                )}

                {original.type === "community" && (
                  <>
                    {original.didApply && (
                      <Badge
                        variant="outline"
                        className="border-blue-500/30 bg-blue-500/10 text-blue-400"
                      >
                        Applied
                      </Badge>
                    )}
                    {original.gotGhosted && (
                      <Badge
                        variant="outline"
                        className="border-purple-500/30 bg-purple-500/10 text-purple-400"
                      >
                        Ghosted
                      </Badge>
                    )}
                    {original.wasJobReal !== undefined && (
                      <Badge
                        variant="outline"
                        className={cn(
                          original.wasJobReal
                            ? "border-green-500/30 bg-green-500/10 text-green-400"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                        )}
                      >
                        {original.wasJobReal ? "Real Job" : "Fake Job"}
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {/* Comment Preview */}
              {original.comment && (
                <p className="text-sm text-white/50 line-clamp-2 italic">
                  "{original.comment}"
                </p>
              )}

              {/* Timestamp */}
              <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Original review · {formatDate(original.timestamp)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(original);
                }}
                className="border-white/20 hover:bg-white/5 text-white group/btn"
              >
                <Eye className="h-4 w-4 mr-1 group-hover/btn:text-indigo-400 transition-colors" />
                Preview
              </Button>

              {original.jobUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(original.jobUrl, "_blank");
                  }}
                  className="border-white/20 hover:bg-white/5 text-white group/btn"
                >
                  <ExternalLink className="h-4 w-4 mr-1 group-hover/btn:text-purple-400 transition-colors" />
                  Open
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Updated Reviews (Threaded) */}
      {updates.length > 0 && (
        <div className="ml-8 space-y-2">
          <AnimatePresence>
            {updates.map((update, updateIndex) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, delay: updateIndex * 0.05 }}
              >
                <Card
                  className="bg-gradient-to-r from-cyan-500/5 to-transparent border-l-4 border-l-cyan-500/50 border-white/10 hover:border-white/20 transition-all duration-200 group cursor-pointer hover:bg-white/5"
                  onClick={() => onReviewDetail(update)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Update Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CornerDownRight className="h-4 w-4 text-cyan-400 shrink-0" />
                          <Badge
                            variant="outline"
                            className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Updated Review
                          </Badge>
                        </div>

                        {/* Review Details */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {update.type === "labeling" && (
                            <>
                              {update.isScam && (
                                <Badge
                                  variant="outline"
                                  className="border-rose-500/30 bg-rose-500/10 text-rose-400"
                                >
                                  <Shield className="h-3 w-3 mr-1" />
                                  Scam
                                </Badge>
                              )}
                              {update.isGhostJob && (
                                <Badge
                                  variant="outline"
                                  className="border-purple-500/30 bg-purple-500/10 text-purple-400"
                                >
                                  <Ghost className="h-3 w-3 mr-1" />
                                  Ghost Job
                                </Badge>
                              )}
                              {update.confidence && (
                                <Badge
                                  variant="outline"
                                  className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                                >
                                  Confidence: {update.confidence}/5
                                </Badge>
                              )}
                            </>
                          )}
                        </div>

                        {/* Timestamp */}
                        <p className="text-xs text-white/40 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(update.timestamp)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview(update);
                          }}
                          className="border-white/20 hover:bg-white/5 text-white group/btn"
                        >
                          <Eye className="h-4 w-4 mr-1 group-hover/btn:text-indigo-400 transition-colors" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
