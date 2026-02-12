"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, CheckCircle2, Lightbulb, Bug, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";

type FeedbackType = "feedback" | "improvement" | "report" | "bug" | "other";

type ReportCategories = {
  scamJob: boolean;
  spamJob: boolean;
  ghostJob: boolean;
};

export default function ContactPage() {
  const { user } = useUser();
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reportCategories, setReportCategories] = useState<ReportCategories>({
    scamJob: false,
    spamJob: false,
    ghostJob: false,
  });

  const submitFeedback = useMutation(api.feedback.submitFeedback);
  const sendEmailNotification = useAction(api.email.sendFeedbackNotification);
  const sendUserConfirmation = useAction(api.email.sendUserConfirmation);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Check if at least one report category is selected (only for report type)
  const hasReportCategory = reportCategories.scamJob || reportCategories.spamJob || reportCategories.ghostJob;

  // Form validation - all required fields must be filled and email must be valid
  const isFormValid =
    selectedType !== null &&
    name.trim() !== "" &&
    email.trim() !== "" &&
    isValidEmail(email) &&
    subject.trim() !== "" &&
    message.trim() !== "" &&
    (selectedType !== "report" || hasReportCategory);

  const feedbackTypes = [
    {
      type: "feedback" as FeedbackType,
      icon: MessageSquare,
      label: "General Feedback",
      description: "Share your thoughts about JobFiltr",
      color: "from-indigo-500 to-purple-500",
    },
    {
      type: "improvement" as FeedbackType,
      icon: Lightbulb,
      label: "Improvement Idea",
      description: "Suggest ways to make JobFiltr better",
      color: "from-amber-500 to-orange-500",
    },
    {
      type: "report" as FeedbackType,
      icon: AlertTriangle,
      label: "Report A Company",
      description: "Report scam, spam, or ghost jobs",
      color: "from-orange-500 to-red-500",
    },
    {
      type: "bug" as FeedbackType,
      icon: Bug,
      label: "Bug Report",
      description: "Report a technical issue",
      color: "from-red-500 to-rose-500",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use the isFormValid check
    if (!isFormValid) return;

    setIsSubmitting(true);

    try {
      // Save feedback to database
      await submitFeedback({
        type: selectedType,
        message: message.trim(),
        email: email.trim() || undefined,
        userId: user?.id,
        userName: user?.fullName || undefined,
        reportCategories: selectedType === "report" ? reportCategories : undefined,
      });

      // Send email notification to team (don't block on failure)
      try {
        await sendEmailNotification({
          type: selectedType,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          reportCategories: selectedType === "report" ? reportCategories : undefined,
        });
      } catch (emailError) {
        // Log email error but don't fail the submission
        console.error("Failed to send team email notification:", emailError);
      }

      // Send confirmation email to user (don't block on failure)
      try {
        await sendUserConfirmation({
          type: selectedType,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          reportCategories: selectedType === "report" ? reportCategories : undefined,
        });
      } catch (emailError) {
        // Log email error but don't fail the submission
        console.error("Failed to send user confirmation email:", emailError);
      }

      setIsSubmitted(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setSelectedType(null);
      setReportCategories({ scamJob: false, spamJob: false, ghostJob: false });

      // Reset after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Header Navigation */}
      <HeaderNav />

      <div className="min-h-screen bg-background relative overflow-hidden pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.15] via-transparent to-rose-500/[0.15] blur-3xl" />

        {/* Home Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="fixed top-24 left-6 z-50"
        >
          <Button
            onClick={() => (window.location.href = "/")}
            variant="ghost"
            className="group relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-md border border-white/10 hover:border-white/20 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
              <span className="font-medium">Home</span>
            </div>
          </Button>
        </motion.div>

        <div className="relative z-10 container mx-auto px-4 md:px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 mb-6"
            >
              <MessageSquare className="h-8 w-8 text-white" />
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-rose-300">
                We&apos;d Love to Hear From You
              </span>
            </h1>
            <p className="text-white/60 text-lg">
              Your feedback helps us build a better JobFiltr for everyone
            </p>
          </div>

          {/* Feedback Type Selection */}
          {!isSubmitted && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
              >
                {feedbackTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.type;

                  return (
                    <Card
                      key={type.type}
                      className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                        isSelected
                          ? "bg-white/10 border-white/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                      onClick={() => setSelectedType(type.type)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-3 rounded-lg bg-gradient-to-br ${type.color}`}
                          >
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold mb-1">
                              {type.label}
                            </h3>
                            <p className="text-white/50 text-sm">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>

              {/* Feedback Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Name */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          required
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          required
                          className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                            email.trim() && !isValidEmail(email)
                              ? "border-red-500/50 focus:ring-red-500"
                              : "border-white/10 focus:ring-indigo-500"
                          }`}
                        />
                        {email.trim() && !isValidEmail(email) && (
                          <p className="text-red-400 text-xs mt-1">
                            Please enter a valid email address
                          </p>
                        )}
                      </div>

                      {/* Report Categories - Only shown when "report" type is selected */}
                      {selectedType === "report" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <label className="block text-white text-sm font-medium mb-3">
                            Report Type(s) *
                          </label>
                          <p className="text-white/50 text-sm mb-4">
                            Select all categories that apply to this company report
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Scam Job */}
                            <label
                              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                                reportCategories.scamJob
                                  ? "bg-red-500/20 border-red-500/50"
                                  : "bg-white/5 border-white/10 hover:border-white/20"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={reportCategories.scamJob}
                                onChange={(e) =>
                                  setReportCategories((prev) => ({
                                    ...prev,
                                    scamJob: e.target.checked,
                                  }))
                                }
                                className="sr-only"
                              />
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  reportCategories.scamJob
                                    ? "bg-red-500 border-red-500"
                                    : "border-white/30"
                                }`}
                              >
                                {reportCategories.scamJob && (
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                )}
                              </div>
                              <div>
                                <span className="text-white font-medium">Scam Job</span>
                                <p className="text-white/40 text-xs">Fraudulent or deceptive listing</p>
                              </div>
                            </label>

                            {/* Spam Job */}
                            <label
                              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                                reportCategories.spamJob
                                  ? "bg-amber-500/20 border-amber-500/50"
                                  : "bg-white/5 border-white/10 hover:border-white/20"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={reportCategories.spamJob}
                                onChange={(e) =>
                                  setReportCategories((prev) => ({
                                    ...prev,
                                    spamJob: e.target.checked,
                                  }))
                                }
                                className="sr-only"
                              />
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  reportCategories.spamJob
                                    ? "bg-amber-500 border-amber-500"
                                    : "border-white/30"
                                }`}
                              >
                                {reportCategories.spamJob && (
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                )}
                              </div>
                              <div>
                                <span className="text-white font-medium">Spam Job</span>
                                <p className="text-white/40 text-xs">Repetitive or misleading posts</p>
                              </div>
                            </label>

                            {/* Ghost Job */}
                            <label
                              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                                reportCategories.ghostJob
                                  ? "bg-purple-500/20 border-purple-500/50"
                                  : "bg-white/5 border-white/10 hover:border-white/20"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={reportCategories.ghostJob}
                                onChange={(e) =>
                                  setReportCategories((prev) => ({
                                    ...prev,
                                    ghostJob: e.target.checked,
                                  }))
                                }
                                className="sr-only"
                              />
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  reportCategories.ghostJob
                                    ? "bg-purple-500 border-purple-500"
                                    : "border-white/30"
                                }`}
                              >
                                {reportCategories.ghostJob && (
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                )}
                              </div>
                              <div>
                                <span className="text-white font-medium">Ghost Job</span>
                                <p className="text-white/40 text-xs">Position not actually being filled</p>
                              </div>
                            </label>
                          </div>
                        </motion.div>
                      )}

                      {/* Subject */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">
                          Subject *
                        </label>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Brief description of your message"
                          required
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">
                          Your Message *
                        </label>
                        <Textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder={
                            selectedType
                              ? `Tell us your ${selectedType}...`
                              : "Select a feedback type above, then share your thoughts..."
                          }
                          rows={6}
                          required
                          disabled={!selectedType}
                          className="w-full bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        size="lg"
                        disabled={!isFormValid || isSubmitting}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            Send Feedback
                          </span>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}

          {/* Success Message */}
          {isSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 mb-6">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Thank You!
                  </h2>
                  <p className="text-white/70 mb-6">
                    Your feedback has been received. We appreciate you taking the
                    time to help us improve JobFiltr.
                  </p>
                  <Button
                    onClick={() => setIsSubmitted(false)}
                    variant="outline"
                    className="border-white/20 hover:bg-white/5 text-white"
                  >
                    Send Another Message
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="text-white/40 text-sm">
              We read every message and use your feedback to continuously improve
              JobFiltr.
              <br />
              Response times may vary, but we&apos;ll get back to you as soon as
              possible.
            </p>
          </motion.div>
        </motion.div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </>
  );
}
