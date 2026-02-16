"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Package,
  ImageIcon,
  Type,
  FileText,
  MonitorSmartphone,
  Copy,
  Check,
  Download,
  RefreshCw,
  Pencil,
  Save,
  Terminal,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtmLinksCard } from "@/components/admin/UtmLinksCard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const DEFAULT_SHORT_DESC =
  "Filter ghost jobs, scams & spam on LinkedIn and Indeed. AI-powered detection, smart filters, and community reports. Apply smarter.";

const DEFAULT_DETAILED_DESC = `JobFiltr - Job Search Power Tool

Stop wasting time on fake, spam, and ghost job listings. JobFiltr is a Chrome extension that filters and analyzes job postings on LinkedIn and Indeed in real time so you only see real opportunities.

KEY FEATURES:
\u2022 Ghost Job Detection: AI analyzes 50+ indicators to flag jobs posted with no intention of hiring
\u2022 Scam & Spam Detection: Flags suspicious postings, unrealistic requirements, and data harvesting schemes
\u2022 Community Reports: See real warnings from other job seekers about problematic companies
\u2022 Hide Staffing Firms: Filter out agency postings to find direct-hire opportunities
\u2022 Job Age Badges: See how old each listing is at a glance
\u2022 Hide Sponsored/Promoted: Remove pay-to-play postings cluttering your results
\u2022 Keyword Filters: Include or exclude jobs by keywords
\u2022 Exclude Companies: Block specific companies from your search results
\u2022 Salary Range Filter: Focus on jobs that match your compensation needs (Indeed)
\u2022 Remote Job Accuracy: Verify if remote listings are truly remote
\u2022 Auto-Hide Applied Jobs: Keep your search results clean (Indeed)

SUPPORTED PLATFORMS:
\u2022 Indeed (full feature support with bonus Indeed-exclusive filters)
\u2022 LinkedIn (full support including new UI)

PRIVACY FIRST:
Zero tracking. Zero data selling. We analyze job postings, not you. Your search activity stays completely private.

Built by Groundwork Labs for job seekers tired of wading through low-quality listings. Take back control of your job search.`;

const ICON_SIZES = [128, 48, 16] as const;

function useCopyFeedback() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const copyImage = useCallback(async (key: string, url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey("error");
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }, []);

  return { copiedKey, copyText, copyImage };
}

export function MarketingPromoTab() {
  const { copiedKey, copyText, copyImage } = useCopyFeedback();

  // Short description state
  const [shortDesc, setShortDesc] = useState(DEFAULT_SHORT_DESC);
  const [shortDescEditing, setShortDescEditing] = useState(false);

  // Detailed description state
  const [detailedDesc, setDetailedDesc] = useState(DEFAULT_DETAILED_DESC);
  const [detailedDescEditing, setDetailedDescEditing] = useState(false);

  // Icon regeneration state
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateStatus, setRegenerateStatus] = useState<"idle" | "success" | "error">("idle");
  const [iconTimestamp, setIconTimestamp] = useState(Date.now());

  // Load descriptions from localStorage on mount
  useEffect(() => {
    const savedShort = localStorage.getItem("jobfiltr-short-desc");
    const savedDetailed = localStorage.getItem("jobfiltr-detailed-desc");
    if (savedShort) setShortDesc(savedShort);
    if (savedDetailed) setDetailedDesc(savedDetailed);
  }, []);

  const handleShortDescSave = () => {
    localStorage.setItem("jobfiltr-short-desc", shortDesc);
    setShortDescEditing(false);
  };

  const handleDetailedDescSave = () => {
    localStorage.setItem("jobfiltr-detailed-desc", detailedDesc);
    setDetailedDescEditing(false);
  };

  const handleRegenerateIcons = async () => {
    setRegenerating(true);
    setRegenerateStatus("idle");
    try {
      const res = await fetch("/api/admin/generate-icons", { method: "POST" });
      if (res.ok) {
        setRegenerateStatus("success");
        setIconTimestamp(Date.now());
        setTimeout(() => setRegenerateStatus("idle"), 3000);
      } else {
        setRegenerateStatus("error");
        setTimeout(() => setRegenerateStatus("idle"), 3000);
      }
    } catch {
      setRegenerateStatus("error");
      setTimeout(() => setRegenerateStatus("idle"), 3000);
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadIcon = (size: number) => {
    const link = document.createElement("a");
    link.href = `/icons/icon${size}.png?t=${iconTimestamp}`;
    link.download = `icon${size}.png`;
    link.click();
  };

  const handleDownloadExtension = async () => {
    try {
      const res = await fetch("/api/admin/download-extension");
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to download");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "jobfiltr-extension.zip";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download extension ZIP. Make sure the build has been run first.");
    }
  };

  const getCharCountColor = (length: number) => {
    if (length > 125) return "text-red-400";
    if (length > 100) return "text-amber-400";
    return "text-green-400";
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Section 1: Extension ZIP Package */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 backdrop-blur-xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-400" />
              Extension Package
            </CardTitle>
            <CardDescription className="text-white/60">
              Chrome Web Store submission ZIP package
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Download button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleDownloadExtension}
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Extension ZIP
              </Button>
              <span className="text-white/40 text-sm">jobfiltr-extension.zip</span>
            </div>

            {/* Build command */}
            <div className="rounded-lg bg-white/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Terminal className="h-4 w-4" />
                Build Command
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-emerald-400 text-sm font-mono bg-black/30 rounded px-3 py-2">
                  cd chrome-extension && pwsh -File build-extension.ps1
                </code>
                <button
                  onClick={() => copyText("build-cmd", "cd chrome-extension && pwsh -File build-extension.ps1")}
                  className={`shrink-0 p-2 rounded-md transition-all ${
                    copiedKey === "build-cmd"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {copiedKey === "build-cmd" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Extension directory path */}
            <div className="rounded-lg bg-white/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <FolderOpen className="h-4 w-4" />
                Extension Directory
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-white/70 text-sm font-mono bg-black/30 rounded px-3 py-2 truncate">
                  chrome-extension/
                </code>
                <button
                  onClick={() => copyText("ext-dir", "chrome-extension/")}
                  className={`shrink-0 p-2 rounded-md transition-all ${
                    copiedKey === "ext-dir"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {copiedKey === "ext-dir" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 2: Extension Icons */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 backdrop-blur-xl border border-violet-500/30 shadow-lg shadow-violet-500/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-violet-400" />
                Extension Icons
              </CardTitle>
              <CardDescription className="text-white/60">
                Required sizes for Chrome Web Store (128x128, 48x48, 16x16)
              </CardDescription>
            </div>
            <Button
              onClick={handleRegenerateIcons}
              disabled={regenerating}
              className={`transition-all ${
                regenerateStatus === "success"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : regenerateStatus === "error"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
              }`}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? "Generating..." : regenerateStatus === "success" ? "Generated!" : regenerateStatus === "error" ? "Failed" : "Regenerate Icons"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ICON_SIZES.map((size) => (
                <div key={size} className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white/5">
                  {/* Checkerboard background for transparency */}
                  <div
                    className="rounded-lg border border-white/10 flex items-center justify-center p-4"
                    style={{
                      backgroundImage: "linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)",
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/icons/icon${size}.png?t=${iconTimestamp}`}
                      alt={`JobFiltr icon ${size}x${size}`}
                      width={size}
                      height={size}
                      className="block"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <span className="text-white/70 text-sm font-mono">{size}x{size}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyImage(`icon-${size}`, `/icons/icon${size}.png?t=${iconTimestamp}`)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        copiedKey === `icon-${size}`
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {copiedKey === `icon-${size}` ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={() => handleDownloadIcon(size)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <Download className="h-3 w-3 inline mr-1" />
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 3: Short Description */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 backdrop-blur-xl border border-amber-500/30 shadow-lg shadow-amber-500/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Type className="h-5 w-5 text-amber-400" />
                Short Description
              </CardTitle>
              <CardDescription className="text-white/60">
                Chrome Web Store short description (132 characters max)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => copyText("short-desc", shortDesc)}
                variant="ghost"
                size="sm"
                className={`transition-all ${
                  copiedKey === "short-desc"
                    ? "text-green-400 bg-green-500/10"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {copiedKey === "short-desc" ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                {copiedKey === "short-desc" ? "Copied!" : "Copy"}
              </Button>
              {shortDescEditing ? (
                <Button
                  onClick={handleShortDescSave}
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  <Save className="mr-1 h-4 w-4" />
                  Save
                </Button>
              ) : (
                <Button
                  onClick={() => setShortDescEditing(true)}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              maxLength={132}
              rows={2}
              readOnly={!shortDescEditing}
              className={`w-full rounded-lg px-4 py-3 text-sm text-white font-mono resize-none transition-all ${
                shortDescEditing
                  ? "bg-white/10 border-2 border-amber-500/50 focus:border-amber-500 focus:outline-none"
                  : "bg-white/5 border border-white/10 cursor-default"
              }`}
            />
            <div className="flex justify-end mt-2">
              <span className={`text-sm font-mono ${getCharCountColor(shortDesc.length)}`}>
                {shortDesc.length}/132
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 4: Detailed Description */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 backdrop-blur-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                Detailed Description
              </CardTitle>
              <CardDescription className="text-white/60">
                Full feature breakdown for Chrome Web Store listing
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => copyText("detailed-desc", detailedDesc)}
                variant="ghost"
                size="sm"
                className={`transition-all ${
                  copiedKey === "detailed-desc"
                    ? "text-green-400 bg-green-500/10"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {copiedKey === "detailed-desc" ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                {copiedKey === "detailed-desc" ? "Copied!" : "Copy"}
              </Button>
              {detailedDescEditing ? (
                <Button
                  onClick={handleDetailedDescSave}
                  size="sm"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                >
                  <Save className="mr-1 h-4 w-4" />
                  Save
                </Button>
              ) : (
                <Button
                  onClick={() => setDetailedDescEditing(true)}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={detailedDesc}
              onChange={(e) => setDetailedDesc(e.target.value)}
              rows={16}
              readOnly={!detailedDescEditing}
              className={`w-full rounded-lg px-4 py-3 text-sm text-white font-mono resize-none transition-all ${
                detailedDescEditing
                  ? "bg-white/10 border-2 border-cyan-500/50 focus:border-cyan-500 focus:outline-none"
                  : "bg-white/5 border border-white/10 cursor-default"
              }`}
            />
            <div className="flex justify-end mt-2">
              <span className="text-white/40 text-sm font-mono">
                {detailedDesc.length} characters
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 5: UTM Tracking Links */}
      <UtmLinksCard />

      {/* Section 6: Store Screenshots */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 backdrop-blur-xl border border-pink-500/30 shadow-lg shadow-pink-500/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5 text-pink-400" />
              Store Screenshots
            </CardTitle>
            <CardDescription className="text-white/60">
              Chrome Web Store requires at least one 1280x800 or 640x400 screenshot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed border-pink-500/30 bg-pink-500/5 p-8 flex flex-col items-center gap-4">
              <MonitorSmartphone className="h-12 w-12 text-pink-400/40" />
              <div className="text-center space-y-2">
                <p className="text-white/70 text-sm font-medium">
                  1280 x 800 Hero Screenshot
                </p>
                <p className="text-white/40 text-xs max-w-md">
                  Use the debug browser (port 9222) to navigate to an Indeed job search page with JobFiltr active. Apply filters, show badges, and capture a 1280x800 screenshot showcasing the extension in action.
                </p>
              </div>
              <div className="flex gap-3 text-xs text-white/30">
                <span className="px-2 py-1 rounded bg-white/5">PNG or JPEG</span>
                <span className="px-2 py-1 rounded bg-white/5">1280x800 or 640x400</span>
                <span className="px-2 py-1 rounded bg-white/5">No alpha/transparency</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
