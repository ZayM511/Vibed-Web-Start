"use client";

import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
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
                <FileText className="w-8 h-8 text-indigo-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Terms of Service
              </h1>
              <p className="text-white/60">
                Last Updated: {lastUpdated}
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-lg max-w-none space-y-8">

              {/* Introduction */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">1. Agreement to Terms</h2>
                <p className="text-white/70">
                  By accessing or using JobFiltr, a product of Groundwork Labs LLC (&quot;Service&quot;), including our website and Chrome browser extension, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use our Service.
                </p>
                <p className="text-white/70">
                  These Terms constitute a legally binding agreement between you and JobFiltr. We may update these Terms from time to time, and your continued use of the Service after any changes constitutes acceptance of the new Terms.
                </p>
              </section>

              {/* Description of Service */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">2. Description of Service</h2>
                <p className="text-white/70">
                  JobFiltr provides tools to help job seekers identify potentially fraudulent, ghost, or spam job listings on employment platforms such as Indeed and LinkedIn. Our Service includes:
                </p>
                <ul className="text-white/70 space-y-2">
                  <li>A Chrome browser extension that analyzes job postings</li>
                  <li>Filtering tools to customize your job search experience</li>
                  <li>Scanning features to detect potential scams and ghost jobs</li>
                  <li>Document storage for resumes and cover letters</li>
                </ul>
                <p className="text-white/70 mt-4">
                  <strong>Important:</strong> JobFiltr provides informational analysis only. We do not guarantee the accuracy of our assessments, and our Service should not be your sole basis for employment decisions.
                </p>
              </section>

              {/* Eligibility */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">3. Eligibility</h2>
                <p className="text-white/70">
                  You must be at least 16 years of age to use JobFiltr. By using our Service, you represent and warrant that you meet this age requirement. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.
                </p>
              </section>

              {/* Account Registration */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">4. Account Registration</h2>
                <p className="text-white/70">
                  To access certain features of the Service, you may need to create an account. When you create an account, you agree to:
                </p>
                <ul className="text-white/70 space-y-2">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                </ul>
                <p className="text-white/70 mt-4">
                  We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity.
                </p>
              </section>

              {/* Subscription and Payments */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">5. Subscription and Payments</h2>
                <p className="text-white/70">
                  JobFiltr offers both free and paid subscription plans. For paid subscriptions:
                </p>
                <ul className="text-white/70 space-y-2">
                  <li><strong>Billing:</strong> Subscriptions are billed monthly in advance. You authorize us to charge your payment method on a recurring basis.</li>
                  <li><strong>Cancellation:</strong> You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.</li>
                  <li><strong>Refunds:</strong> We offer a 30-day money-back guarantee for new subscribers. After 30 days, refunds are provided at our discretion.</li>
                  <li><strong>Price Changes:</strong> We may change subscription prices with 30 days&apos; notice. Continued use after the price change constitutes acceptance.</li>
                </ul>
                <p className="text-white/70 mt-4">
                  Payments are processed securely through Stripe. We do not store your full payment card details.
                </p>
              </section>

              {/* Acceptable Use */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">6. Acceptable Use</h2>
                <p className="text-white/70 mb-4">
                  You agree not to use the Service to:
                </p>
                <ul className="text-white/70 space-y-2">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on the intellectual property rights of others</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Scrape, data mine, or extract data from the Service for commercial purposes</li>
                  <li>Use automated tools to access the Service beyond normal extension use</li>
                  <li>Impersonate another person or entity</li>
                  <li>Upload malicious code or content</li>
                  <li>Circumvent any access restrictions or usage limits</li>
                </ul>
              </section>

              {/* Intellectual Property */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">7. Intellectual Property</h2>
                <p className="text-white/70">
                  The Service, including its original content, features, and functionality, is owned by JobFiltr and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our Service without our express written permission.
                </p>
                <p className="text-white/70 mt-4">
                  You retain ownership of any content you upload to the Service (such as resumes and cover letters). By uploading content, you grant us a limited license to store and process that content solely to provide the Service to you.
                </p>
              </section>

              {/* Third-Party Services */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">8. Third-Party Services</h2>
                <p className="text-white/70">
                  JobFiltr integrates with third-party platforms (Indeed, LinkedIn, etc.) to provide its functionality. We are not affiliated with, endorsed by, or responsible for these platforms. Your use of third-party platforms is subject to their respective terms of service.
                </p>
                <p className="text-white/70 mt-4">
                  Job posting data analyzed by JobFiltr is obtained from publicly visible job listings. We do not guarantee the availability, accuracy, or completeness of third-party job data.
                </p>
              </section>

              {/* Disclaimer of Warranties */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">9. Disclaimer of Warranties</h2>
                <p className="text-white/70">
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
                <p className="text-white/70 mt-4">
                  We do not warrant that:
                </p>
                <ul className="text-white/70 space-y-2">
                  <li>The Service will be uninterrupted, secure, or error-free</li>
                  <li>Our job analysis or scam detection will be accurate or complete</li>
                  <li>Any job identified as legitimate is actually legitimate</li>
                  <li>Any job identified as a scam is actually fraudulent</li>
                </ul>
                <p className="text-white/70 mt-4">
                  You acknowledge that employment decisions should be made using your own judgment and due diligence, not solely based on JobFiltr&apos;s analysis.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">10. Limitation of Liability</h2>
                <p className="text-white/70">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, JOBFILTR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
                </p>
                <p className="text-white/70 mt-4">
                  Our total liability for any claims arising from your use of the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or $100, whichever is greater.
                </p>
              </section>

              {/* Indemnification */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">11. Indemnification</h2>
                <p className="text-white/70">
                  You agree to indemnify, defend, and hold harmless JobFiltr and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorney&apos;s fees) arising from your use of the Service, your violation of these Terms, or your violation of any rights of another party.
                </p>
              </section>

              {/* Termination */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">12. Termination</h2>
                <p className="text-white/70">
                  We may terminate or suspend your access to the Service immediately, without prior notice, for any reason, including if you breach these Terms. Upon termination:
                </p>
                <ul className="text-white/70 space-y-2">
                  <li>Your right to use the Service will immediately cease</li>
                  <li>We may delete your account and associated data</li>
                  <li>Provisions that by their nature should survive termination will remain in effect</li>
                </ul>
                <p className="text-white/70 mt-4">
                  You may terminate your account at any time by contacting us at support@jobfiltr.com.
                </p>
              </section>

              {/* Governing Law */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">13. Governing Law</h2>
                <p className="text-white/70">
                  These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions. Any legal action or proceeding arising out of these Terms shall be brought exclusively in the courts located in California.
                </p>
              </section>

              {/* Changes to Terms */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">14. Changes to Terms</h2>
                <p className="text-white/70">
                  We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page and updating the &quot;Last Updated&quot; date. Your continued use of the Service after changes are posted constitutes acceptance of the modified Terms.
                </p>
              </section>

              {/* Severability */}
              <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">15. Severability</h2>
                <p className="text-white/70">
                  If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
                </p>
              </section>

              {/* Contact */}
              <section className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl p-6 md:p-8 border border-indigo-500/30">
                <h2 className="text-2xl font-semibold text-white mt-0 mb-4">16. Contact Us</h2>
                <p className="text-white/70 mb-4">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="space-y-2 text-white/70">
                  <p><strong>Email:</strong> <a href="mailto:support@jobfiltr.com" className="text-indigo-400 hover:text-indigo-300">support@jobfiltr.com</a></p>
                  <p><strong>Location:</strong> California, United States</p>
                </div>
                <p className="text-white/70 mt-4">
                  For privacy-related inquiries, please see our{" "}
                  <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">
                    Privacy Policy
                  </Link>.
                </p>
              </section>

            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}
