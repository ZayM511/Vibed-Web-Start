"use client";

import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Shield, Lock, Eye, Trash2, FileEdit, Bell, Mail, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const lastUpdated = "February 2, 2026";

  return (
    <>
      <HeaderNav />
      <div className="relative min-h-screen w-full bg-background pt-24 pb-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />

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

        <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/20 mb-6">
                <Shield className="w-8 h-8 text-indigo-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Privacy Policy
              </h1>
              <p className="text-white/60">
                Last Updated: {lastUpdated}
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-lg max-w-none space-y-8">

              {/* Introduction */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">Introduction</h2>
                <p className="text-white/70">
                  JobFiltr, a product of Groundwork Labs LLC (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Chrome browser extension and website (collectively, the &quot;Service&quot;).
                </p>
                <p className="text-white/70">
                  JobFiltr helps job seekers identify potentially fraudulent, ghost, or spam job listings on platforms like Indeed and LinkedIn. We analyze job postings to provide you with insights about listing quality and legitimacy.
                </p>
                <p className="text-white/70">
                  By using JobFiltr, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.
                </p>
              </section>

              {/* Information We Collect */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <Eye className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-2xl font-semibold text-white m-0">Information We Collect</h2>
                </div>

                <h3 className="text-xl font-medium text-white/90 mt-6 mb-3">Information You Provide</h3>
                <ul className="text-white/70 space-y-2">
                  <li><strong>Account Information:</strong> When you sign up via Google OAuth, we collect your email address and name from your Google profile.</li>
                  <li><strong>Documents:</strong> If you upload your resume, cover letter, or portfolio, we store these files securely to help personalize your job search experience.</li>
                  <li><strong>Feedback:</strong> When you submit feedback or report a job listing, we collect your comments and any information you choose to provide.</li>
                  <li><strong>Location (Optional):</strong> You may optionally provide your location to improve job recommendations.</li>
                </ul>

                <h3 className="text-xl font-medium text-white/90 mt-6 mb-3">Information Collected Automatically</h3>
                <ul className="text-white/70 space-y-2">
                  <li><strong>Job Data:</strong> When you scan a job listing, we collect the job title, company name, job description, posting URL, and posting date from the job platform (Indeed, LinkedIn, etc.).</li>
                  <li><strong>Usage Data:</strong> We collect information about how you use the extension, including scan history, filter preferences, and feature usage.</li>
                  <li><strong>Technical Data:</strong> To diagnose issues, we may collect error logs, browser type, and limited DOM information when errors occur.</li>
                </ul>

                <h3 className="text-xl font-medium text-white/90 mt-6 mb-3">Information from Third Parties</h3>
                <ul className="text-white/70 space-y-2">
                  <li><strong>Google OAuth:</strong> When you sign in with Google, we receive your email address, name, and profile picture from Google.</li>
                </ul>
              </section>

              {/* How We Use Your Information */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">How We Use Your Information</h2>
                <p className="text-white/70 mb-4">We use the information we collect to:</p>
                <ul className="text-white/70 space-y-2">
                  <li>Provide, maintain, and improve the JobFiltr service</li>
                  <li>Analyze job listings for potential scams, ghost jobs, and spam</li>
                  <li>Personalize your experience based on your preferences and documents</li>
                  <li>Process your subscription and payments</li>
                  <li>Respond to your feedback and support requests</li>
                  <li>Send you important service updates (not marketing emails)</li>
                  <li>Detect and prevent fraud, abuse, and technical issues</li>
                  <li>Improve our machine learning models to better detect fraudulent listings</li>
                  <li>Generate anonymized, aggregate analytics about job market trends</li>
                </ul>
              </section>

              {/* How We Share Your Information */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">How We Share Your Information</h2>
                <p className="text-white/70 mb-4">
                  <strong>We do not sell your personal information.</strong> We share your information only with the following service providers who help us operate our Service:
                </p>
                <ul className="text-white/70 space-y-3">
                  <li>
                    <strong>Convex:</strong> Our backend database provider that securely stores your account information, scan history, and documents.
                  </li>
                  <li>
                    <strong>Stripe:</strong> Our payment processor that handles subscription billing. Stripe receives your payment information directly; we only store the last 4 digits of your card and subscription status.
                  </li>
                  <li>
                    <strong>Clerk:</strong> Our authentication provider that manages secure sign-in.
                  </li>
                  <li>
                    <strong>Google:</strong> When you sign in with Google OAuth, Google provides your profile information.
                  </li>
                </ul>
                <p className="text-white/70 mt-4">
                  We may also disclose your information if required by law, court order, or government request, or to protect our rights, privacy, safety, or property.
                </p>
              </section>

              {/* California Privacy Rights */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">Your California Privacy Rights (CCPA/CPRA)</h2>
                <p className="text-white/70 mb-4">
                  If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
                </p>

                <div className="grid gap-4 mt-6">
                  <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
                    <Eye className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-medium m-0">Right to Know</h4>
                      <p className="text-white/60 text-sm mt-1 mb-0">You can request information about the categories and specific pieces of personal information we have collected about you, the sources of that information, our business purposes for collecting it, and the categories of third parties with whom we share it.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
                    <Trash2 className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-medium m-0">Right to Delete</h4>
                      <p className="text-white/60 text-sm mt-1 mb-0">You can request that we delete your personal information, subject to certain exceptions (such as legal record-keeping requirements).</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
                    <FileEdit className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-medium m-0">Right to Correct</h4>
                      <p className="text-white/60 text-sm mt-1 mb-0">You can request that we correct inaccurate personal information we maintain about you.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
                    <Bell className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-medium m-0">Right to Non-Discrimination</h4>
                      <p className="text-white/60 text-sm mt-1 mb-0">We will not discriminate against you for exercising any of your CCPA rights.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-400 text-sm m-0">
                    <strong>Note:</strong> We do not sell or share your personal information with third parties for their marketing purposes. Therefore, the &quot;Do Not Sell or Share My Personal Information&quot; right does not apply to our Service.
                  </p>
                </div>
              </section>

              {/* How to Exercise Your Rights */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-2xl font-semibold text-white m-0">How to Exercise Your Rights</h2>
                </div>
                <p className="text-white/70 mb-4">
                  You can exercise your privacy rights in two ways:
                </p>
                <ul className="text-white/70 space-y-2">
                  <li><strong>Email:</strong> Send a request to <a href="mailto:support@jobfiltr.com" className="text-indigo-400 hover:text-indigo-300">support@jobfiltr.com</a></li>
                  <li><strong>In-App:</strong> Go to Dashboard → Settings → Privacy to manage your data</li>
                </ul>
                <p className="text-white/70 mt-4">
                  We will respond to your request within 45 days. We may need to verify your identity before processing your request.
                </p>
              </section>

              {/* Data Retention */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">Data Retention</h2>
                <p className="text-white/70 mb-4">We retain your information for the following periods:</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-white/90 font-medium">Data Type</th>
                        <th className="text-left py-3 px-4 text-white/90 font-medium">Retention Period</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/70">
                      <tr className="border-b border-white/10">
                        <td className="py-3 px-4">Job scan history</td>
                        <td className="py-3 px-4">2 years</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 px-4">Error logs</td>
                        <td className="py-3 px-4">90 days</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 px-4">Account data</td>
                        <td className="py-3 px-4">Until you delete your account</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">Payment records</td>
                        <td className="py-3 px-4">7 years (legal requirement)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Data Security */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-2xl font-semibold text-white m-0">Data Security</h2>
                </div>
                <p className="text-white/70">
                  We implement appropriate technical and organizational measures to protect your personal information:
                </p>
                <ul className="text-white/70 space-y-2 mt-4">
                  <li>All data is transmitted over HTTPS (TLS encryption)</li>
                  <li>Sensitive data is encrypted at rest</li>
                  <li>We use secure, industry-standard authentication (OAuth 2.0)</li>
                  <li>Access to personal data is restricted to authorized personnel only</li>
                  <li>We regularly review and update our security practices</li>
                </ul>
                <p className="text-white/70 mt-4">
                  While we strive to protect your information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
                </p>
              </section>

              {/* Children's Privacy */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">Children&apos;s Privacy</h2>
                <p className="text-white/70">
                  JobFiltr is intended for users who are 16 years of age or older. We do not knowingly collect personal information from children under 16. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at <a href="mailto:support@jobfiltr.com" className="text-indigo-400 hover:text-indigo-300">support@jobfiltr.com</a>, and we will delete such information.
                </p>
              </section>

              {/* Chrome Extension Permissions */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">Chrome Extension Permissions</h2>
                <p className="text-white/70 mb-4">
                  Our Chrome extension requests the following permissions to function properly:
                </p>
                <ul className="text-white/70 space-y-3">
                  <li>
                    <strong>activeTab & tabs:</strong> To read job listing content on the current page when you initiate a scan.
                  </li>
                  <li>
                    <strong>storage:</strong> To save your preferences, scan history, and authentication state locally.
                  </li>
                  <li>
                    <strong>Host permissions (Indeed, LinkedIn, etc.):</strong> To inject our job analysis features on supported job platforms.
                  </li>
                  <li>
                    <strong>identity:</strong> To enable secure Google OAuth sign-in.
                  </li>
                  <li>
                    <strong>notifications:</strong> To alert you about important job scan results.
                  </li>
                </ul>
                <p className="text-white/70 mt-4">
                  We only use these permissions for their stated purposes and collect only the minimum data necessary.
                </p>
              </section>

              {/* Google API Limited Use Disclosure */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">Google API Limited Use Disclosure</h2>
                <p className="text-white/70">
                  JobFiltr&apos;s use and transfer of information received from Google APIs adheres to the{" "}
                  <a
                    href="https://developer.chrome.com/docs/webstore/program-policies/limited-use"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    Chrome Web Store User Data Policy
                  </a>
                  , including the Limited Use requirements. Specifically:
                </p>
                <ul className="text-white/70 space-y-2 mt-4">
                  <li>We only use Google user data for the features visible and necessary to the user.</li>
                  <li>We do not transfer Google user data to third parties except as necessary to provide our service.</li>
                  <li>We do not use Google user data for advertising purposes.</li>
                  <li>We do not allow humans to read Google user data unless required for security, legal compliance, or with your explicit consent.</li>
                </ul>
              </section>

              {/* Global Privacy Control */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">Global Privacy Control (GPC)</h2>
                <p className="text-white/70">
                  We honor Global Privacy Control (GPC) signals sent by your browser. If your browser sends a GPC signal indicating you wish to opt out of the sale or sharing of your personal information, we will treat this as a valid opt-out request under the CCPA. Since we do not sell or share your personal information, this signal serves as confirmation that your data is already protected.
                </p>
              </section>

              {/* Changes to This Policy */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">Changes to This Privacy Policy</h2>
                <p className="text-white/70">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. We encourage you to review this Privacy Policy periodically. Changes are effective when posted.
                </p>
              </section>

              {/* Contact Us */}
              <section className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl p-6 md:p-8 border border-indigo-500/30">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">Contact Us</h2>
                <p className="text-white/70 mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="space-y-2 text-white/70">
                  <p><strong>Email:</strong> <a href="mailto:support@jobfiltr.com" className="text-indigo-400 hover:text-indigo-300">support@jobfiltr.com</a></p>
                  <p><strong>Location:</strong> California, United States</p>
                </div>
              </section>

            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}
