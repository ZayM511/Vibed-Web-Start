"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, MessageSquare, Calendar, Briefcase, MapPin, User as UserIcon } from "lucide-react";

interface CommunityReviewListProps {
  jobScanId: Id<"jobScans"> | Id<"scans">; // Accept IDs from both scan tables
}

// Helper function to format user display name
function formatUserDisplayName(userId: string, fullName?: string): string {
  if (!fullName) {
    // If no name, use "Anonymous User"
    return "Anonymous User";
  }

  const nameParts = fullName.trim().split(" ");
  if (nameParts.length === 1) {
    // Only first name provided
    return nameParts[0];
  }

  // First name + last initial
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  const lastInitial = lastName.charAt(0).toUpperCase();

  return `${firstName} ${lastInitial}.`;
}

export default function CommunityReviewList({ jobScanId }: CommunityReviewListProps) {
  const { user: currentUser } = useUser();
  const reviews = useQuery(api.communityReviews.getReviewsForJob, { jobScanId });
  const stats = useQuery(api.communityReviews.getReviewStats, { jobScanId });

  if (!reviews || !stats) {
    return null;
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Reviews</CardTitle>
          <CardDescription>No reviews yet. Be the first to share your experience!</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Community Insights</CardTitle>
          <CardDescription>{stats.totalReviews} people have shared their experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Applied</div>
              <div className="text-2xl font-bold">{stats.appliedCount}</div>
              <div className="text-xs text-muted-foreground">
                {((stats.appliedCount / stats.totalReviews) * 100).toFixed(0)}% of reviewers
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Got Ghosted</div>
              <div className="text-2xl font-bold text-orange-500">{stats.ghostedCount}</div>
              <div className="text-xs text-muted-foreground">
                {stats.ghostedPercentage.toFixed(0)}% of all reviewers
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Legitimate Job</div>
              <div className="text-2xl font-bold text-green-500">{stats.realJobCount}</div>
              <div className="text-xs text-muted-foreground">
                {stats.realJobPercentage.toFixed(0)}% confirmed real
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Community Reviews ({reviews.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.map((review, index) => {
            // Determine if this is the current user's review
            const isCurrentUserReview = currentUser && review.userId === currentUser.id;

            // Get user display information
            const shouldShowLocation = review.userLocation && !review.hideLocationFromReviews;

            return (
              <div key={review._id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="space-y-3">
                  {/* User Info */}
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <UserIcon className="h-4 w-4" />
                    <span className="font-medium text-white/90">
                      {isCurrentUserReview ? "You" : "Anonymous User"}
                    </span>
                    {shouldShowLocation && (
                      <>
                        <span className="text-white/40">•</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{review.userLocation}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                    {review.didApply && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Applied
                      </Badge>
                    )}
                    {review.gotGhosted && (
                      <Badge variant="destructive" className="flex items-center gap-1 bg-orange-500">
                        <XCircle className="h-3 w-3" />
                        Ghosted
                      </Badge>
                    )}
                    {review.wasJobReal && (
                      <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                        <CheckCircle2 className="h-3 w-3" />
                        Real Job
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(review.submissionDate).toLocaleDateString()}
                  </div>
                </div>

                {/* Experience */}
                {review.yearsOfExperience !== undefined && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{review.yearsOfExperience} years of experience</span>
                  </div>
                )}

                {/* Comment */}
                {review.comment && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare className="h-4 w-4" />
                      <span>Comment</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">{review.comment}</p>
                  </div>
                )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
