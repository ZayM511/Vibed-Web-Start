"use client";

import { useState } from "react";
import { Link2, Copy, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const UTM_LINKS = [
  { platform: "LinkedIn", icon: "in", color: "bg-blue-600", source: "linkedin", medium: "post" },
  { platform: "Reddit", icon: "R", color: "bg-orange-600", source: "reddit", medium: "post" },
  { platform: "Threads", icon: "@", color: "bg-white/20", source: "threads", medium: "post" },
  { platform: "Twitter / X", icon: "X", color: "bg-white/20", source: "twitter", medium: "post" },
  { platform: "Instagram", icon: "IG", color: "bg-gradient-to-br from-purple-600 to-pink-500", source: "instagram", medium: "bio_link" },
  { platform: "TikTok", icon: "TT", color: "bg-white/20", source: "tiktok", medium: "bio_link" },
  { platform: "Email", icon: "@", color: "bg-emerald-600", source: "email", medium: "newsletter" },
  { platform: "Referral", icon: "Rf", color: "bg-amber-600", source: "referral", medium: "word_of_mouth" },
];

export function UtmLinksCard() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const buildUtmUrl = (source: string, medium: string) =>
    `https://jobfiltr.app/waitlist?utm_source=${source}&utm_medium=${medium}`;

  const handleCopy = async (index: number, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-white/5 backdrop-blur-xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Link2 className="h-5 w-5 text-indigo-400" />
            UTM Tracking Links
          </CardTitle>
          <CardDescription className="text-white/60">
            Share these links on each platform to track where signups come from
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {UTM_LINKS.map((link, index) => {
              const url = buildUtmUrl(link.source, link.medium);
              const isCopied = copiedIndex === index;
              return (
                <div
                  key={link.source}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-md ${link.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {link.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{link.platform}</p>
                    <p className="text-white/40 text-xs truncate">{url}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(index, url)}
                    className={`shrink-0 p-2 rounded-md transition-all ${
                      isCopied
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                    title={isCopied ? "Copied!" : "Copy link"}
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
