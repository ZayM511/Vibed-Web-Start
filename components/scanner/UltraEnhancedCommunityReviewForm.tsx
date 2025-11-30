"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  Send,
  Sparkles,
  Heart,
  Star,
} from "lucide-react";

interface UltraEnhancedCommunityReviewFormProps {
  jobScanId: Id<"jobScans">;
}

export function UltraEnhancedCommunityReviewForm({
  jobScanId,
}: UltraEnhancedCommunityReviewFormProps) {
  const [reviewText, setReviewText] = useState("");
  const [recommendationVote, setRecommendationVote] = useState<"apply" | "avoid" | null>(null);
  const [hasApplied, setHasApplied] = useState<boolean | null>(null);
  const [gotResponse, setGotResponse] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const submitReview = useMutation(api.communityReviews.submitReview);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recommendationVote) {
      toast.error("Please select your recommendation");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitReview({
        jobScanId,
        comment: reviewText.trim(),
        didApply: recommendationVote === "apply",
        gotGhosted: false,
        wasJobReal: recommendationVote === "apply",
        hasApplied: hasApplied ?? false,
        gotResponse: gotResponse ?? false,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setReviewText("");
        setRecommendationVote(null);
        setHasApplied(null);
        setGotResponse(null);
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/5 border border-amber-400/30"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-pink-500/10" />

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-500/90 to-emerald-500/90 backdrop-blur-xl"
          >
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center justify-center p-6 bg-white/20 rounded-full mb-4">
                  <Heart className="h-16 w-16 text-white" fill="currentColor" />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-3xl font-bold text-white mb-2">Thank You!</h3>
                <p className="text-white/90 text-lg">Your review helps others make better decisions</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative p-8 border-b border-white/10">
        <div className="flex items-start gap-4">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/30"
          >
            <MessageSquare className="h-7 w-7 text-amber-400" />
          </motion.div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-300 via-orange-300 to-pink-300 bg-clip-text text-transparent mb-2">
              Share Your Experience With The Community
            </h2>
            <p className="text-white/70">
              Help build a safer job search community with your insights
            </p>
          </div>
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Star className="h-6 w-6 text-amber-400" fill="currentColor" />
          </motion.div>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="relative p-8 space-y-6">
        {/* Recommendation Vote */}
        <motion.div variants={itemVariants} className="space-y-4">
          <label className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Would you recommend applying?
          </label>

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              type="button"
              onClick={() => setRecommendationVote("apply")}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden p-8 rounded-xl backdrop-blur-sm border-2 transition-all ${
                recommendationVote === "apply"
                  ? "bg-green-500/30 border-green-400 shadow-lg shadow-green-400/20"
                  : "bg-white/5 border-white/20 hover:border-green-400/50"
              }`}
            >
              {recommendationVote === "apply" && (
                <motion.div
                  layoutId="selected"
                  className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/10"
                />
              )}

              <div className="relative text-center space-y-3">
                <motion.div
                  animate={
                    recommendationVote === "apply"
                      ? { scale: [1, 1.2, 1] }
                      : {}
                  }
                  transition={{
                    duration: 0.5,
                  }}
                >
                  <ThumbsUp
                    className={`h-12 w-12 mx-auto ${
                      recommendationVote === "apply" ? "text-green-400" : "text-white/40"
                    }`}
                  />
                </motion.div>
                <div>
                  <div className={`font-bold text-xl ${
                    recommendationVote === "apply" ? "text-green-300" : "text-white"
                  }`}>
                    Yes, Apply
                  </div>
                  <div className="text-sm text-white/70 mt-1">Looks legitimate</div>
                </div>

                {recommendationVote === "apply" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3"
                  >
                    <div className="h-4 w-4 rounded-full bg-green-400 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => setRecommendationVote("avoid")}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden p-8 rounded-xl backdrop-blur-sm border-2 transition-all ${
                recommendationVote === "avoid"
                  ? "bg-red-500/30 border-red-400 shadow-lg shadow-red-400/20"
                  : "bg-white/5 border-white/20 hover:border-red-400/50"
              }`}
            >
              {recommendationVote === "avoid" && (
                <motion.div
                  layoutId="selected"
                  className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-500/10"
                />
              )}

              <div className="relative text-center space-y-3">
                <motion.div
                  animate={
                    recommendationVote === "avoid"
                      ? { rotate: [0, -10, 10, -10, 0] }
                      : {}
                  }
                  transition={{
                    duration: 0.5,
                  }}
                >
                  <AlertTriangle
                    className={`h-12 w-12 mx-auto ${
                      recommendationVote === "avoid" ? "text-red-400" : "text-white/40"
                    }`}
                  />
                </motion.div>
                <div>
                  <div className={`font-bold text-xl ${
                    recommendationVote === "avoid" ? "text-red-300" : "text-white"
                  }`}>
                    No, Avoid
                  </div>
                  <div className="text-sm text-white/70 mt-1">Red flags present</div>
                </div>

                {recommendationVote === "avoid" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3"
                  >
                    <div className="h-4 w-4 rounded-full bg-red-400 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Have You Applied Section */}
        <motion.div variants={itemVariants} className="space-y-4">
          <label className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Have you applied to this job?
          </label>

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              type="button"
              onClick={() => setHasApplied(true)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden p-6 rounded-xl backdrop-blur-sm border-2 transition-all ${
                hasApplied === true
                  ? "bg-indigo-500/30 border-indigo-400 shadow-lg shadow-indigo-400/20"
                  : "bg-white/5 border-white/20 hover:border-indigo-400/50"
              }`}
            >
              {hasApplied === true && (
                <motion.div
                  layoutId="hasAppliedSelected"
                  className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-blue-500/10"
                />
              )}

              <div className="relative text-center space-y-2">
                <div className={`font-bold text-lg ${
                  hasApplied === true ? "text-indigo-300" : "text-white"
                }`}>
                  Yes
                </div>
                <div className="text-sm text-white/70">I have applied</div>

                {hasApplied === true && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2"
                  >
                    <div className="h-4 w-4 rounded-full bg-indigo-400 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => {
                setHasApplied(false);
                setGotResponse(null); // Reset response if they didn't apply
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden p-6 rounded-xl backdrop-blur-sm border-2 transition-all ${
                hasApplied === false
                  ? "bg-slate-500/30 border-slate-400 shadow-lg shadow-slate-400/20"
                  : "bg-white/5 border-white/20 hover:border-slate-400/50"
              }`}
            >
              {hasApplied === false && (
                <motion.div
                  layoutId="hasAppliedSelected"
                  className="absolute inset-0 bg-gradient-to-br from-slate-500/20 to-gray-500/10"
                />
              )}

              <div className="relative text-center space-y-2">
                <div className={`font-bold text-lg ${
                  hasApplied === false ? "text-slate-300" : "text-white"
                }`}>
                  No
                </div>
                <div className="text-sm text-white/70">I have not applied</div>

                {hasApplied === false && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2"
                  >
                    <div className="h-4 w-4 rounded-full bg-slate-400 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.button>
          </div>

          {/* Follow-up: Did they get a response? */}
          <AnimatePresence>
            {hasApplied === true && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 pt-2"
              >
                <label className="text-base font-medium text-white/90 flex items-center gap-2">
                  Did you get a response back?
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    type="button"
                    onClick={() => setGotResponse(true)}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative overflow-hidden p-5 rounded-xl backdrop-blur-sm border-2 transition-all ${
                      gotResponse === true
                        ? "bg-emerald-500/30 border-emerald-400 shadow-lg shadow-emerald-400/20"
                        : "bg-white/5 border-white/20 hover:border-emerald-400/50"
                    }`}
                  >
                    {gotResponse === true && (
                      <motion.div
                        layoutId="gotResponseSelected"
                        className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/10"
                      />
                    )}

                    <div className="relative text-center">
                      <div className={`font-semibold ${
                        gotResponse === true ? "text-emerald-300" : "text-white"
                      }`}>
                        Yes, got response
                      </div>

                      {gotResponse === true && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-0 right-0"
                        >
                          <div className="h-3 w-3 rounded-full bg-emerald-400 flex items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setGotResponse(false)}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative overflow-hidden p-5 rounded-xl backdrop-blur-sm border-2 transition-all ${
                      gotResponse === false
                        ? "bg-orange-500/30 border-orange-400 shadow-lg shadow-orange-400/20"
                        : "bg-white/5 border-white/20 hover:border-orange-400/50"
                    }`}
                  >
                    {gotResponse === false && (
                      <motion.div
                        layoutId="gotResponseSelected"
                        className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/10"
                      />
                    )}

                    <div className="relative text-center">
                      <div className={`font-semibold ${
                        gotResponse === false ? "text-orange-300" : "text-white"
                      }`}>
                        No, got ghosted
                      </div>

                      {gotResponse === false && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-0 right-0"
                        >
                          <div className="h-3 w-3 rounded-full bg-orange-400 flex items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Review Text */}
        <motion.div variants={itemVariants} className="space-y-4">
          <label className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-400" />
            Your Experience & Advice
            <span className="text-sm font-normal text-white/60">(Optional)</span>
          </label>

          <div className="relative">
            <Textarea
              placeholder="Share your experience with this job posting. Did you apply? Interview? Notice any red flags? Your insights help others make informed decisions..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              disabled={isSubmitting}
              rows={6}
              className="resize-none bg-white/10 border-2 border-white/20 focus:border-amber-400 backdrop-blur-sm text-white placeholder:text-white/50 rounded-xl"
            />
            <div className="flex justify-between items-center mt-2 text-xs">
              <span className="text-white/60">Be honest and specific to help others</span>
              <span className={`${
                reviewText.length > 900 ? "text-amber-400" : "text-white/60"
              }`}>
                {reviewText.length} / 1000
              </span>
            </div>
          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.div variants={itemVariants}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={isSubmitting || !recommendationVote}
              className="relative w-full h-16 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Shine effect */}
              {!isSubmitting && recommendationVote && (
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "linear",
                  }}
                  className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                />
              )}

              <span className="relative flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Submit Review
                  </>
                )}
              </span>
            </Button>
          </motion.div>
        </motion.div>

        {/* Guidelines */}
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/30 backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-white/80">
              <strong className="text-white">Community Guidelines:</strong> Be respectful and
              constructive. Share factual experiences to help others make informed decisions.
            </div>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
}
