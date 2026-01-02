"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Briefcase,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Users,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function DatabasePage() {
  const organizedReviews = useQuery(api.communityReviews.getAllReviewsOrganized);

  if (!organizedReviews) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-white/60">Loading community reviews database...</p>
        </div>
      </div>
    );
  }

  const companies = Object.keys(organizedReviews).sort();
  const totalReviews = companies.reduce((total, company) => {
    return (
      total +
      Object.keys(organizedReviews[company]).reduce((companyTotal, position) => {
        return companyTotal + organizedReviews[company][position].length;
      }, 0)
    );
  }, 0);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.15] via-transparent to-purple-500/[0.15] blur-3xl" />

      {/* Home Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-6 left-6 z-50"
      >
        <Link href="/">
          <Button
            variant="ghost"
            className="group relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-md border border-white/10 hover:border-white/20 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
              <span className="font-medium">Home</span>
            </div>
          </Button>
        </Link>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10">
        <div className="container max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-400/30">
                <Users className="h-8 w-8 text-indigo-400" />
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent mb-4">
              Community Reviews Database
            </h1>
            <p className="text-xl text-white/70 max-w-3xl mx-auto mb-6">
              Real experiences from job seekers, organized by company and position
            </p>
            <div className="flex items-center justify-center gap-6 text-white/60">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <span>{companies.length} Companies</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <span>{totalReviews} Reviews</span>
              </div>
            </div>
          </motion.div>

          {/* Reviews by Company */}
          <div className="space-y-8">
            {companies.length === 0 ? (
              <Card className="border-dashed bg-white/5 backdrop-blur-sm border-white/20">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <MessageSquare className="h-16 w-16 text-white/30 mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-white">No Reviews Yet</h3>
                  <p className="text-white/60 text-center max-w-md">
                    Be the first to share your experience! Scan a job and leave a review to help the
                    community.
                  </p>
                </CardContent>
              </Card>
            ) : (
              companies.map((company, companyIndex) => {
                const positions = Object.keys(organizedReviews[company]).sort();

                return (
                  <motion.div
                    key={company}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: companyIndex * 0.1 }}
                  >
                    <Card className="bg-white/5 backdrop-blur-sm border-white/20 overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-6 w-6 text-indigo-400" />
                          <CardTitle className="text-2xl text-white">{company}</CardTitle>
                          <Badge variant="secondary" className="ml-auto">
                            {positions.length} {positions.length === 1 ? "Position" : "Positions"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-6">
                          {positions.map((position) => {
                            const reviews = organizedReviews[company][position];
                            const appliedCount = reviews.filter((r) => r.hasApplied === true).length;
                            const respondedCount = reviews.filter(
                              (r) => r.hasApplied === true && r.gotResponse === true
                            ).length;
                            const ghostedCount = reviews.filter(
                              (r) => r.hasApplied === true && r.gotResponse === false
                            ).length;
                            const realJobCount = reviews.filter((r) => r.wasJobReal).length;

                            return (
                              <div key={position} className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <Briefcase className="h-5 w-5 text-purple-400" />
                                    <h3 className="text-xl font-semibold text-white">{position}</h3>
                                  </div>
                                  <Badge variant="outline" className="text-white/80">
                                    {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
                                  </Badge>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-400/30">
                                    <div className="text-xs text-white/60 mb-1">Applied</div>
                                    <div className="text-lg font-bold text-indigo-300">
                                      {appliedCount}
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
                                    <div className="text-xs text-white/60 mb-1">Got Response</div>
                                    <div className="text-lg font-bold text-emerald-300">
                                      {respondedCount}
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-400/30">
                                    <div className="text-xs text-white/60 mb-1">Ghosted</div>
                                    <div className="text-lg font-bold text-orange-300">
                                      {ghostedCount}
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-400/30">
                                    <div className="text-xs text-white/60 mb-1">Legitimate</div>
                                    <div className="text-lg font-bold text-green-300">
                                      {realJobCount}
                                    </div>
                                  </div>
                                </div>

                                {/* Individual Reviews */}
                                <div className="space-y-3">
                                  {reviews.map((review) => (
                                    <div
                                      key={review.reviewId}
                                      className="p-4 rounded-lg bg-white/5 border border-white/10"
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          {review.didApply ? (
                                            <ThumbsUp className="h-4 w-4 text-green-400" />
                                          ) : (
                                            <ThumbsDown className="h-4 w-4 text-red-400" />
                                          )}
                                          <span className="text-sm font-medium text-white">
                                            {review.didApply
                                              ? "Recommends applying"
                                              : "Recommends avoiding"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-white/50">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(review.submissionDate).toLocaleDateString()}
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-2 mb-3">
                                        {review.hasApplied === true && (
                                          <Badge
                                            variant="secondary"
                                            className="bg-indigo-500/20 text-indigo-300"
                                          >
                                            Applied
                                          </Badge>
                                        )}
                                        {review.hasApplied === true && review.gotResponse === true && (
                                          <Badge
                                            variant="secondary"
                                            className="bg-emerald-500/20 text-emerald-300"
                                          >
                                            Got Response
                                          </Badge>
                                        )}
                                        {review.hasApplied === true && review.gotResponse === false && (
                                          <Badge
                                            variant="secondary"
                                            className="bg-orange-500/20 text-orange-300"
                                          >
                                            Got Ghosted
                                          </Badge>
                                        )}
                                        {review.wasJobReal ? (
                                          <Badge
                                            variant="secondary"
                                            className="bg-green-500/20 text-green-300"
                                          >
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Legitimate Job
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant="secondary"
                                            className="bg-red-500/20 text-red-300"
                                          >
                                            <XCircle className="h-3 w-3 mr-1" />
                                            Questionable
                                          </Badge>
                                        )}
                                        {review.yearsOfExperience !== undefined && (
                                          <Badge
                                            variant="secondary"
                                            className="bg-purple-500/20 text-purple-300"
                                          >
                                            {review.yearsOfExperience} years exp
                                          </Badge>
                                        )}
                                      </div>

                                      {review.comment && (
                                        <div className="text-sm text-white/80 italic border-l-2 border-amber-400/30 pl-3">
                                          &quot;{review.comment}&quot;
                                        </div>
                                      )}

                                      {review.location && (
                                        <div className="flex items-center gap-2 mt-3 text-xs text-white/50">
                                          <MapPin className="h-3 w-3" />
                                          {review.location}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {positions.indexOf(position) < positions.length - 1 && (
                                  <Separator className="bg-white/10" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
