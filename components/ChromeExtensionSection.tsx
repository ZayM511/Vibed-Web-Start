"use client";

import { motion } from "framer-motion";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ChromeExtensionSection({ id }: { id?: string }) {

  return (
    <div id={id} className="relative pt-8 pb-24 overflow-hidden scroll-mt-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent" />

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Get The Browser Extension
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Your job search, upgraded
          </p>
        </motion.div>

        {/* Main CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-rose-500/10 border-white/10 backdrop-blur-sm">
            <CardContent className="p-8 md:p-12">
              {/* Browser Icon and Title */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 bg-gradient-to-br from-indigo-500 to-purple-500">
                  <Chrome className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Available Now on Chrome
                </h3>
                <p className="text-white/60 max-w-xl mx-auto text-center">
                  Install JobFiltr and upgrade your job search today
                </p>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <a
                  href="https://chromewebstore.google.com/detail/jobfiltr-job-search-power/jddcgobdokioeapnopadlgfhcancmjfl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    size="lg"
                    className="px-8 py-6 text-lg font-semibold shadow-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                  >
                    <Chrome className="mr-2 h-5 w-5" />
                    Add to Chrome - It&apos;s Free
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
