"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageSquare, ThumbsUp, AlertTriangle, Send } from "lucide-react";

interface EnhancedCommunityReviewFormProps {
  jobScanId: Id<"jobScans">;
}

export function EnhancedCommunityReviewForm({ jobScanId }: EnhancedCommunityReviewFormProps) {
  const [reviewText, setReviewText] = useState("");
  const [recommendationVote, setRecommendationVote] = useState<"apply" | "avoid" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReview = useMutation(api.communityReviews.submitReview);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reviewText.trim()) {
      toast.error("Please write a review");
      return;
    }

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
      });

      toast.success("Review submitted successfully!");
      setReviewText("");
      setRecommendationVote(null);
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-xl bg-white/80 backdrop-blur-sm border-2 border-amber-900/10">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-900/10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-900/10 rounded-full">
            <MessageSquare className="h-6 w-6 text-amber-900" />
          </div>
          <div>
            <CardTitle className="text-2xl text-gray-900">Share Your Insights</CardTitle>
            <CardDescription className="text-gray-700">
              Your feedback helps build a safer job search community
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recommendation Vote */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-900">
              Would you recommend applying to this job?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRecommendationVote("apply")}
                className={`relative p-6 rounded-xl border-2 transition-all text-center ${
                  recommendationVote === "apply"
                    ? "border-green-500 bg-green-50 shadow-lg"
                    : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
                }`}
              >
                <ThumbsUp className={`h-8 w-8 mx-auto mb-3 ${
                  recommendationVote === "apply" ? "text-green-600" : "text-gray-400"
                }`} />
                <div className="font-bold text-lg text-gray-900">Yes, Apply</div>
                <div className="text-sm text-gray-600 mt-1">This seems legitimate</div>
                {recommendationVote === "apply" && (
                  <div className="absolute top-2 right-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRecommendationVote("avoid")}
                className={`relative p-6 rounded-xl border-2 transition-all text-center ${
                  recommendationVote === "avoid"
                    ? "border-red-500 bg-red-50 shadow-lg"
                    : "border-gray-200 hover:border-red-300 hover:bg-red-50/50"
                }`}
              >
                <AlertTriangle className={`h-8 w-8 mx-auto mb-3 ${
                  recommendationVote === "avoid" ? "text-red-600" : "text-gray-400"
                }`} />
                <div className="font-bold text-lg text-gray-900">No, Avoid</div>
                <div className="text-sm text-gray-600 mt-1">Red flags detected</div>
                {recommendationVote === "avoid" && (
                  <div className="absolute top-2 right-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-3">
            <Label htmlFor="review-text" className="text-base font-semibold text-gray-900">
              Your Experience & Advice
            </Label>
            <Textarea
              id="review-text"
              placeholder="Share your experience with this job posting. Did you apply? Interview? Notice any red flags? Your insights help others make informed decisions..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              disabled={isSubmitting}
              rows={5}
              className="resize-none bg-white border-2 border-gray-200 focus:border-amber-900 transition-colors"
            />
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>Be honest and specific to help others</span>
              <span>{reviewText.length} / 1000</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !reviewText.trim() || !recommendationVote}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-900 to-amber-700 hover:from-amber-800 hover:to-amber-600 shadow-lg hover:shadow-xl transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                Submitting Review...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Submit Review
              </>
            )}
          </Button>
        </form>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-gray-700">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-amber-900 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Community Guidelines:</strong> Be respectful and constructive. Share factual experiences to help others make informed decisions.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
