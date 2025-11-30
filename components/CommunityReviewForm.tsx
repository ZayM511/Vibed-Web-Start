"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface CommunityReviewFormProps {
  jobScanId: Id<"jobScans">;
  onSubmitSuccess?: () => void;
}

export function CommunityReviewForm({ jobScanId, onSubmitSuccess }: CommunityReviewFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const isProfileComplete = useQuery(api.users.isProfileComplete);
  const [didApply, setDidApply] = useState(false);
  const [gotGhosted, setGotGhosted] = useState(false);
  const [wasJobReal, setWasJobReal] = useState(false);
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReview = useMutation(api.community.submitReview);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be signed in to submit a review");
      return;
    }

    // Check if profile is complete
    if (!isProfileComplete) {
      toast.error("Please add your location in settings before submitting a review");
      router.push("/dashboard?tab=settings");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitReview({
        jobScanId,
        userId: user.id,
        didApply,
        gotGhosted,
        wasJobReal,
        yearsOfExperience: yearsOfExperience ? parseFloat(yearsOfExperience) : undefined,
        comment: comment.trim() || undefined,
      });

      toast.success("Review submitted successfully!");

      // Reset form
      setDidApply(false);
      setGotGhosted(false);
      setWasJobReal(false);
      setYearsOfExperience("");
      setComment("");

      onSubmitSuccess?.();
    } catch (error) {
      console.error("Submit review error:", error);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show profile completion notice if profile is not complete
  if (isProfileComplete === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            You need to complete your profile before submitting reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-white/80 mb-3">
                To share your experience with the community, please add your location to your profile.
                This helps us provide better insights and connect you with other job seekers.
              </p>
              <Button
                onClick={() => router.push("/dashboard?tab=settings")}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                Add Location in Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Your Experience</CardTitle>
        <CardDescription>
          Help the community by sharing your experience with this job listing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="didApply"
                checked={didApply}
                onCheckedChange={(checked) => setDidApply(checked === true)}
              />
              <Label
                htmlFor="didApply"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I applied to this job
              </Label>
            </div>

            {didApply && (
              <div className="flex items-center space-x-2 ml-6">
                <Checkbox
                  id="gotGhosted"
                  checked={gotGhosted}
                  onCheckedChange={(checked) => setGotGhosted(checked === true)}
                />
                <Label
                  htmlFor="gotGhosted"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I was ghosted (no response after applying)
                </Label>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="wasJobReal"
                checked={wasJobReal}
                onCheckedChange={(checked) => setWasJobReal(checked === true)}
              />
              <Label
                htmlFor="wasJobReal"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                This appears to be a real job opportunity
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearsOfExperience">
              Years of Experience (Optional)
            </Label>
            <Input
              id="yearsOfExperience"
              type="number"
              min="0"
              max="50"
              step="0.5"
              placeholder="e.g., 3.5"
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Additional Comments (Optional)</Label>
            <textarea
              id="comment"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Share any additional details about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
