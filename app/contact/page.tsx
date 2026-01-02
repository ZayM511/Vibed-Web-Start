"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, CheckCircle2, Lightbulb, Bug, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { HeaderNav } from "@/components/HeaderNav";

type FeedbackType = "feedback" | "improvement" | "feature" | "bug" | "other";

export default function ContactPage() {
  const { user } = useUser();
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submitFeedback = useMutation(api.feedback.submitFeedback);

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
      type: "feature" as FeedbackType,
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" className="h-6 w-6">
          <path fill="currentColor" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0m0 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13m0 1.25a.75.75 0 0 1 .688.451l1.045 2.412l2.618.25a.75.75 0 0 1 .425 1.309l-1.971 1.74l.572 2.565a.75.75 0 0 1-1.113.81L8 10.948l-2.264 1.337a.75.75 0 0 1-1.113-.809l.571-2.565l-1.97-1.74a.75.75 0 0 1 .425-1.309l2.617-.25L7.312 3.2l.051-.097A.75.75 0 0 1 8 2.75m-.534 3.866a.75.75 0 0 1-.616.448l-1.336.127l1.006.89a.75.75 0 0 1 .235.725l-.292 1.31l1.156-.682l.09-.046a.75.75 0 0 1 .672.046l1.155.681l-.29-1.31a.75.75 0 0 1 .234-.725l1.005-.889l-1.335-.127a.75.75 0 0 1-.616-.448L8 5.385z"/>
        </svg>
      ),
      label: "Feature Request",
      description: "Request a new feature",
      color: "from-blue-500 to-cyan-500",
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
    if (!selectedType || !name.trim() || !email.trim() || !subject.trim() || !message.trim()) return;

    setIsSubmitting(true);

    try {
      await submitFeedback({
        type: selectedType,
        message: message.trim(),
        email: email.trim() || undefined,
        userId: user?.id,
        userName: user?.fullName || undefined,
      });

      setIsSubmitted(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setSelectedType(null);

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
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>

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
                        disabled={!selectedType || !name.trim() || !email.trim() || !subject.trim() || !message.trim() || isSubmitting}
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
    </>
  );
}
