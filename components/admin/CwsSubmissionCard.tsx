"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Store,
  Tag,
  Camera,
  ImageIcon,
  Copy,
  Check,
  Download,
  Pencil,
  Save,
  RefreshCw,
  Star,
  X,
  CheckCircle2,
  Circle,
  ArrowDownToLine,
  Sun,
  Moon,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const DEFAULT_MANIFEST_DESC =
  "Filter ghost jobs, scams & spam on LinkedIn and Indeed. AI-powered detection, smart filters, and community reports.";

interface StoreScreenshot {
  id: string;
  name: string;
  description: string;
  recommended: boolean;
  hasDarkMode: boolean;
  filenames: {
    light1280: string;
    light640: string;
    dark1280?: string;
    dark640?: string;
  };
}

const STORE_SCREENSHOTS: StoreScreenshot[] = [
  {
    id: "linkedin-badges",
    name: "LinkedIn Search with Badges",
    description: "Job cards with ghost badges, age badges, and filter indicators",
    recommended: true,
    hasDarkMode: false,
    filenames: {
      light1280: "linkedin-badges-light-1280x800.png",
      light640: "linkedin-badges-light-640x400.png",
    },
  },
  {
    id: "indeed-badges",
    name: "Indeed Search with Filters",
    description: "Indeed job listings with age badges and stale job detection",
    recommended: true,
    hasDarkMode: false,
    filenames: {
      light1280: "indeed-badges-light-1280x800.png",
      light640: "indeed-badges-light-640x400.png",
    },
  },
  {
    id: "ghost-analysis",
    name: "Ghost Job Analysis Detail",
    description: "Detail panel showing ghost analysis score and job age badge",
    recommended: true,
    hasDarkMode: false,
    filenames: {
      light1280: "ghost-analysis-light-1280x800.png",
      light640: "ghost-analysis-light-640x400.png",
    },
  },
  {
    id: "popup",
    name: "Extension Popup",
    description: "Filter controls and feature options in the popup UI",
    recommended: true,
    hasDarkMode: true,
    filenames: {
      light1280: "popup-light-1280x800.png",
      light640: "popup-light-640x400.png",
      dark1280: "popup-dark-1280x800.png",
      dark640: "popup-dark-640x400.png",
    },
  },
  {
    id: "community-reports",
    name: "Community Reports",
    description: "Reported company highlighting with community warnings",
    recommended: false,
    hasDarkMode: false,
    filenames: {
      light1280: "community-reports-light-1280x800.png",
      light640: "community-reports-light-640x400.png",
    },
  },
];

interface AssetFile {
  filename: string;
  path: string;
}

interface PromoTileData {
  filename: string;
  width: number;
  height: number;
  base64: string;
}

interface PromoHistoryEntry {
  id: string;
  timestamp: number;
  small: PromoTileData;
  marquee: PromoTileData;
}

const PROMO_HISTORY_KEY = "jobfiltr-promo-history";

function loadPromoHistory(): PromoHistoryEntry[] {
  try {
    const raw = localStorage.getItem(PROMO_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PromoHistoryEntry[];
  } catch {
    return [];
  }
}

const MAX_PROMO_HISTORY = 3;

function savePromoHistory(history: PromoHistoryEntry[]) {
  // Limit history to prevent localStorage quota overflow (~1MB per entry)
  const trimmed = history.slice(0, MAX_PROMO_HISTORY);
  try {
    localStorage.setItem(PROMO_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // If still over quota, keep only the latest entry
    try {
      localStorage.setItem(PROMO_HISTORY_KEY, JSON.stringify(trimmed.slice(0, 1)));
    } catch {
      localStorage.removeItem(PROMO_HISTORY_KEY);
    }
  }
  return trimmed;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function downloadBase64(base64: string, filename: string) {
  const link = document.createElement("a");
  link.href = `data:image/png;base64,${base64}`;
  link.download = filename;
  link.click();
}

// Draw the JobFiltr funnel logo with gradient fill and checkmark
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const scale = size / 40; // SVG viewBox is 0 0 40 40
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Funnel gradient fill
  const grad = ctx.createLinearGradient(8, 6, 32, 34);
  grad.addColorStop(0, "#8B5CF6");
  grad.addColorStop(0.5, "#A78BFA");
  grad.addColorStop(1, "#FFFFFF");

  // Outer funnel
  ctx.beginPath();
  ctx.moveTo(8, 6);
  ctx.lineTo(32, 6);
  ctx.lineTo(24, 18);
  ctx.lineTo(24, 30);
  ctx.lineTo(16, 34);
  ctx.lineTo(16, 18);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.9;
  ctx.fill();

  // Inner highlight
  ctx.beginPath();
  ctx.moveTo(12, 8);
  ctx.lineTo(28, 8);
  ctx.lineTo(22, 17);
  ctx.lineTo(22, 26);
  ctx.lineTo(18, 28);
  ctx.lineTo(18, 17);
  ctx.closePath();
  ctx.fillStyle = "white";
  ctx.globalAlpha = 0.2;
  ctx.fill();

  // Checkmark
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(17, 14);
  ctx.lineTo(19, 16);
  ctx.lineTo(23, 12);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.restore();
}

function generateTileCanvas(
  width: number,
  height: number,
  subtitle: string,
  features?: string[]
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const isMarquee = features && features.length > 0;

  // --- Background ---
  // Base fill
  ctx.fillStyle = "#0c0c1a";
  ctx.fillRect(0, 0, width, height);

  // Radial gradient glow
  const glowX = isMarquee ? width * 0.22 : width / 2;
  const glowY = isMarquee ? height * 0.4 : height * 0.35;
  const glowR = Math.max(width, height) * 0.6;
  const radGrad = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowR);
  radGrad.addColorStop(0, "rgba(139, 92, 246, 0.18)");
  radGrad.addColorStop(0.4, "rgba(139, 92, 246, 0.06)");
  radGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, width, height);

  // Secondary subtle glow (bottom-right)
  const glow2X = isMarquee ? width * 0.75 : width * 0.7;
  const glow2Y = height * 0.7;
  const glow2R = Math.max(width, height) * 0.4;
  const radGrad2 = ctx.createRadialGradient(glow2X, glow2Y, 0, glow2X, glow2Y, glow2R);
  radGrad2.addColorStop(0, "rgba(59, 130, 246, 0.08)");
  radGrad2.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radGrad2;
  ctx.fillRect(0, 0, width, height);

  // --- Accent lines ---
  const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
  lineGrad.addColorStop(0, "rgba(139, 92, 246, 0.0)");
  lineGrad.addColorStop(0.3, "rgba(139, 92, 246, 0.7)");
  lineGrad.addColorStop(0.7, "rgba(59, 130, 246, 0.7)");
  lineGrad.addColorStop(1, "rgba(59, 130, 246, 0.0)");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, 0, width, 3);
  ctx.fillRect(0, height - 3, width, 3);

  // --- Text helpers ---
  const padding = Math.round(width * 0.06);
  const maxTextWidth = isMarquee ? width * 0.58 : width - padding * 2;

  function fitFont(baseSize: number, text: string, bold = false): number {
    let size = baseSize;
    const prefix = bold ? "bold " : "";
    while (size > 10) {
      ctx.font = `${prefix}${size}px system-ui, -apple-system, sans-serif`;
      if (ctx.measureText(text).width <= maxTextWidth) break;
      size -= 1;
    }
    return size;
  }

  if (isMarquee) {
    // === MARQUEE LAYOUT: Icon left, text right ===
    const iconSize = Math.round(height * 0.28);
    const iconX = width * 0.12;
    const iconCenterY = height * 0.38;
    drawLogo(ctx, iconX - iconSize / 2, iconCenterY - iconSize / 2, iconSize);

    // Text area starts right of icon
    const textLeft = width * 0.32;
    const textCenterX = textLeft + (width - textLeft - padding) / 2;

    const titleSize = fitFont(Math.round(width / 14), "JobFiltr", true);
    const subtitleSize = fitFont(Math.round(width / 26), subtitle);
    let featureSize = Math.round(width / 34);
    const featureSizes: number[] = [];
    const featureMaxW = width - padding * 2;
    features.forEach((f) => {
      let s = featureSize;
      while (s > 10) {
        ctx.font = `${s}px system-ui, -apple-system, sans-serif`;
        if (ctx.measureText(f).width <= featureMaxW) break;
        s -= 1;
      }
      featureSizes.push(s);
    });
    featureSize = Math.min(...featureSizes);

    // Title + subtitle block
    const titleSubGap = Math.round(height * 0.03);
    const titleBlockY = iconCenterY - (titleSize + titleSubGap + subtitleSize) / 2;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `bold ${titleSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "white";
    ctx.fillText("JobFiltr", textCenterX, titleBlockY);

    ctx.font = `${subtitleSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText(subtitle, textCenterX, titleBlockY + titleSize + titleSubGap);

    // Feature lines - centered below everything
    const featureGap = Math.round(height * 0.025);
    const featuresStartY = height * 0.68;
    ctx.textAlign = "center";
    ctx.font = `${featureSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    features.forEach((f, i) => {
      ctx.fillText(f, width / 2, featuresStartY + i * (featureSize + featureGap));
    });
  } else {
    // === SMALL TILE LAYOUT: Icon centered above text ===
    const iconSize = Math.round(height * 0.3);
    const titleSize = fitFont(Math.round(width / 13), "JobFiltr", true);
    const subtitleSize = fitFont(Math.round(width / 24), subtitle);

    const gap = Math.round(height * 0.04);
    const totalHeight = iconSize + gap + titleSize + Math.round(gap * 0.5) + subtitleSize;
    let y = (height - totalHeight) / 2;

    // Icon
    drawLogo(ctx, (width - iconSize) / 2, y, iconSize);
    y += iconSize + gap;

    // Title
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `bold ${titleSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "white";
    ctx.fillText("JobFiltr", width / 2, y);
    y += titleSize + Math.round(gap * 0.5);

    // Subtitle
    ctx.font = `${subtitleSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText(subtitle, width / 2, y);
  }

  return canvas.toDataURL("image/png").split(",")[1];
}

export function CwsSubmissionCard() {
  const { copiedKey, copyText } = useCopyFeedback();

  // Manifest description state
  const [manifestDesc, setManifestDesc] = useState(DEFAULT_MANIFEST_DESC);
  const [manifestDescEditing, setManifestDescEditing] = useState(false);

  // Screenshot gallery state
  const [selectedSize, setSelectedSize] = useState<"1280" | "640">("1280");
  const [selectedMode, setSelectedMode] = useState<"light" | "dark">("light");

  // Asset files from API
  const [screenshotFiles, setScreenshotFiles] = useState<AssetFile[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  // Promo generation state
  const [generatingPromo, setGeneratingPromo] = useState(false);
  const [promoStatus, setPromoStatus] = useState<"idle" | "success" | "error">("idle");

  // Promo history
  const [promoHistory, setPromoHistory] = useState<PromoHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Icon timestamp for cache busting
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // Load manifest desc and promo history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("jobfiltr-manifest-desc");
    if (saved) setManifestDesc(saved);
    setPromoHistory(loadPromoHistory());
  }, []);

  // Fetch available assets
  useEffect(() => {
    fetchAssets();
  }, [refreshKey]);

  const fetchAssets = async () => {
    setLoadingAssets(true);
    try {
      const res = await fetch("/api/admin/store-assets");
      if (res.ok) {
        const data = await res.json();
        setScreenshotFiles(data.screenshots || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleManifestDescSave = () => {
    localStorage.setItem("jobfiltr-manifest-desc", manifestDesc);
    setManifestDescEditing(false);
  };

  const handleSyncFromShortDesc = () => {
    const shortDesc = localStorage.getItem("jobfiltr-short-desc");
    if (shortDesc) {
      setManifestDesc(shortDesc);
      localStorage.setItem("jobfiltr-manifest-desc", shortDesc);
    }
  };

  const handleGeneratePromo = () => {
    setGeneratingPromo(true);
    setPromoStatus("idle");
    try {
      const subtitle = "Your Job Search, Upgraded";

      const smallBase64 = generateTileCanvas(440, 280, subtitle);
      const marqueeBase64 = generateTileCanvas(1400, 560, subtitle, [
        "Ghost Job Detection  ·  Scam & Spam Filters  ·  Community Reports",
        "Smart Keyword Filters  ·  Job Age Badges  ·  LinkedIn & Indeed Support",
      ]);

      const timestamp = Date.now();
      const entry: PromoHistoryEntry = {
        id: String(timestamp),
        timestamp,
        small: { filename: "small-tile-440x280.png", width: 440, height: 280, base64: smallBase64 },
        marquee: { filename: "marquee-1400x560.png", width: 1400, height: 560, base64: marqueeBase64 },
      };
      const updated = [entry, ...promoHistory];
      const saved = savePromoHistory(updated);
      setPromoHistory(saved);
      setPromoStatus("success");
      setTimeout(() => setPromoStatus("idle"), 3000);
    } catch {
      setPromoStatus("error");
      setTimeout(() => setPromoStatus("idle"), 3000);
    } finally {
      setGeneratingPromo(false);
    }
  };

  const handleDeletePromoEntry = useCallback((id: string) => {
    setPromoHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      return savePromoHistory(updated);
    });
  }, []);

  const handleDownload = (filePath: string, filename: string) => {
    const link = document.createElement("a");
    link.href = `${filePath}?t=${refreshKey}`;
    link.download = filename;
    link.click();
  };

  const handleDownloadAll = () => {
    STORE_SCREENSHOTS.forEach((ss) => {
      const filename = getActiveFilename(ss);
      if (filename && fileExists(filename)) {
        handleDownload(`/store-assets/screenshots/${filename}`, filename);
      }
    });
  };

  const getActiveFilename = (ss: StoreScreenshot): string | undefined => {
    if (selectedMode === "dark" && ss.hasDarkMode) {
      return selectedSize === "1280" ? ss.filenames.dark1280 : ss.filenames.dark640;
    }
    return selectedSize === "1280" ? ss.filenames.light1280 : ss.filenames.light640;
  };

  const fileExists = (filename: string): boolean => {
    return screenshotFiles.some((f) => f.filename === filename);
  };

  const getCharCountColor = (length: number) => {
    if (length > 125) return "text-red-400";
    if (length > 100) return "text-amber-400";
    return "text-green-400";
  };

  // Current (latest) promo tiles
  const latestPromo = promoHistory.length > 0 ? promoHistory[0] : null;
  const hasPromoTiles = latestPromo !== null;
  const previousPromos = promoHistory.slice(1);

  // Calculate checklist
  const checklist = [
    { label: "Manifest description (< 132 chars)", done: manifestDesc.length > 0 && manifestDesc.length <= 132 },
    { label: "Store listing description", done: !!localStorage.getItem("jobfiltr-detailed-desc") || true },
    { label: "Store icon (128x128)", done: true },
    { label: "At least 1 screenshot", done: screenshotFiles.length >= 1 },
    { label: "3+ screenshots (recommended)", done: screenshotFiles.length >= 6 },
    { label: "Small promo tile (440x280)", done: hasPromoTiles },
    { label: "Category set", done: true },
  ];
  const completedCount = checklist.filter((c) => c.done).length;

  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-white/5 backdrop-blur-xl border border-rose-500/30 shadow-lg shadow-rose-500/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Store className="h-5 w-5 text-rose-400" />
            Chrome Web Store Submission
          </CardTitle>
          <CardDescription className="text-white/60">
            All assets and metadata required for store listing
          </CardDescription>
          {/* Checklist progress */}
          <div className="flex items-center gap-4 mt-3">
            <Progress value={(completedCount / checklist.length) * 100} className="flex-1 h-2" />
            <span className={`text-sm font-mono whitespace-nowrap ${completedCount === checklist.length ? "text-green-400" : "text-white/60"}`}>
              {completedCount}/{checklist.length} ready
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="listing" className="w-full">
            <TabsList className="w-full bg-white/5 border border-white/10 mb-4">
              <TabsTrigger value="listing" className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">
                Listing
              </TabsTrigger>
              <TabsTrigger value="screenshots" className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">
                Screenshots
              </TabsTrigger>
              <TabsTrigger value="promo" className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">
                Promo Assets
              </TabsTrigger>
            </TabsList>

            {/* ===== LISTING TAB ===== */}
            <TabsContent value="listing" className="space-y-4">
              {/* Readiness Checklist */}
              <div className="rounded-lg bg-white/5 p-4 space-y-2">
                <p className="text-white/70 text-sm font-medium mb-3">Submission Checklist</p>
                {checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-white/20 shrink-0" />
                    )}
                    <span className={item.done ? "text-white/70" : "text-white/40"}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Manifest Description */}
              <div className="rounded-lg bg-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Manifest Description</p>
                    <p className="text-white/40 text-xs">manifest.json &quot;description&quot; field (132 characters max)</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => copyText("manifest-desc", manifestDesc)}
                      variant="ghost"
                      size="sm"
                      className={`transition-all ${
                        copiedKey === "manifest-desc"
                          ? "text-green-400 bg-green-500/10"
                          : "text-white/60 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {copiedKey === "manifest-desc" ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                      {copiedKey === "manifest-desc" ? "Copied!" : "Copy"}
                    </Button>
                    {manifestDescEditing ? (
                      <Button
                        onClick={handleManifestDescSave}
                        size="sm"
                        className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
                      >
                        <Save className="mr-1 h-3 w-3" />
                        Save
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setManifestDescEditing(true)}
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
                <textarea
                  value={manifestDesc}
                  onChange={(e) => setManifestDesc(e.target.value)}
                  maxLength={132}
                  rows={2}
                  readOnly={!manifestDescEditing}
                  className={`w-full rounded-lg px-4 py-3 text-sm text-white font-mono resize-none transition-all ${
                    manifestDescEditing
                      ? "bg-white/10 border-2 border-rose-500/50 focus:border-rose-500 focus:outline-none"
                      : "bg-black/20 border border-white/10 cursor-default"
                  }`}
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSyncFromShortDesc}
                    className="text-xs text-rose-400/70 hover:text-rose-400 transition-colors"
                  >
                    Sync from Short Description
                  </button>
                  <span className={`text-sm font-mono ${getCharCountColor(manifestDesc.length)}`}>
                    {manifestDesc.length}/132
                  </span>
                </div>
              </div>

              {/* Category */}
              <div className="rounded-lg bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-rose-500/20 flex items-center justify-center">
                    <Tag className="h-4 w-4 text-rose-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Category</p>
                    <p className="text-white/40 text-xs">Productivity</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20">
                    Set
                  </Badge>
                </div>
              </div>
            </TabsContent>

            {/* ===== SCREENSHOTS TAB ===== */}
            <TabsContent value="screenshots" className="space-y-4">
              {/* Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Size toggle */}
                <div className="flex rounded-lg overflow-hidden border border-white/10">
                  <button
                    onClick={() => setSelectedSize("1280")}
                    className={`px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedSize === "1280" ? "bg-rose-500/30 text-rose-300" : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    1280x800
                  </button>
                  <button
                    onClick={() => setSelectedSize("640")}
                    className={`px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedSize === "640" ? "bg-rose-500/30 text-rose-300" : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    640x400
                  </button>
                </div>

                {/* Mode toggle */}
                <div className="flex rounded-lg overflow-hidden border border-white/10">
                  <button
                    onClick={() => setSelectedMode("light")}
                    className={`px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${
                      selectedMode === "light" ? "bg-amber-500/30 text-amber-300" : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    <Sun className="h-3 w-3" />
                    Light
                  </button>
                  <button
                    onClick={() => setSelectedMode("dark")}
                    className={`px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${
                      selectedMode === "dark" ? "bg-indigo-500/30 text-indigo-300" : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    <Moon className="h-3 w-3" />
                    Dark
                  </button>
                </div>

                <div className="flex-1" />

                {/* Actions */}
                <Button
                  onClick={() => setRefreshKey(Date.now())}
                  variant="ghost"
                  size="sm"
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  <RefreshCw className={`mr-1 h-3 w-3 ${loadingAssets ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  onClick={handleDownloadAll}
                  variant="ghost"
                  size="sm"
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  <ArrowDownToLine className="mr-1 h-3 w-3" />
                  Download All
                </Button>
              </div>

              {/* Screenshot Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STORE_SCREENSHOTS.map((ss) => {
                  const filename = getActiveFilename(ss);
                  const exists = filename ? fileExists(filename) : false;
                  const showDarkFallback = selectedMode === "dark" && !ss.hasDarkMode;

                  return (
                    <div
                      key={ss.id}
                      className={`rounded-lg border p-3 space-y-2 transition-all ${
                        exists
                          ? "bg-white/5 border-white/10"
                          : "bg-white/[0.02] border-dashed border-white/10"
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white text-sm font-medium truncate">{ss.name}</p>
                            {ss.recommended && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 shrink-0 text-[10px] px-1.5 py-0">
                                <Star className="h-2.5 w-2.5 mr-0.5" />
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-white/40 text-xs truncate">{ss.description}</p>
                        </div>
                      </div>

                      {/* Preview */}
                      {exists && filename ? (
                        <button
                          onClick={() => setLightboxImage(`/store-assets/screenshots/${filename}?t=${refreshKey}`)}
                          className="w-full rounded-lg overflow-hidden border border-white/10 hover:border-white/20 transition-all cursor-zoom-in"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/store-assets/screenshots/${filename}?t=${refreshKey}`}
                            alt={ss.name}
                            className="w-full aspect-[16/10] object-cover"
                          />
                        </button>
                      ) : (
                        <div className="w-full aspect-[16/10] rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                          <Camera className="h-8 w-8 text-white/15" />
                          <span className="text-white/30 text-xs">
                            {showDarkFallback ? "No dark mode variant" : "Not captured yet"}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {exists && filename && (
                          <button
                            onClick={() => handleDownload(`/store-assets/screenshots/${filename}`, filename)}
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                          >
                            <Download className="h-3 w-3 inline mr-1" />
                            Download
                          </button>
                        )}
                        {exists ? (
                          <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20 text-[10px]">
                            Ready
                          </Badge>
                        ) : (
                          <Badge className="ml-auto bg-white/5 text-white/30 border-white/10 hover:bg-white/5 text-[10px]">
                            Missing
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Screenshot count summary */}
              <div className="text-center text-white/30 text-xs">
                {screenshotFiles.length} screenshot{screenshotFiles.length !== 1 ? "s" : ""} available
                {" · "}
                Chrome Web Store requires at least 1 (up to 5)
              </div>
            </TabsContent>

            {/* ===== PROMO ASSETS TAB ===== */}
            <TabsContent value="promo" className="space-y-4">
              {/* Store Icon */}
              <div className="rounded-lg bg-white/5 p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-lg border border-white/10 flex items-center justify-center shrink-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)",
                      backgroundSize: "12px 12px",
                      backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/icons/icon128.png?t=${refreshKey}`} alt="Store icon" width={48} height={48} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Store Icon</p>
                    <p className="text-white/40 text-xs">128 x 128 PNG (from Extension Icons section)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                      onClick={() => setRefreshKey(Date.now())}
                      title="Refresh icon"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = "/icons/icon128.png";
                        a.download = "icon128.png";
                        a.click();
                      }}
                      title="Download icon"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20">
                      Ready
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGeneratePromo}
                  disabled={generatingPromo}
                  className={`transition-all ${
                    promoStatus === "success"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : promoStatus === "error"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
                  }`}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${generatingPromo ? "animate-spin" : ""}`} />
                  {generatingPromo
                    ? "Generating..."
                    : promoStatus === "success"
                    ? "Generated!"
                    : promoStatus === "error"
                    ? "Failed"
                    : "Generate Promo Tiles"}
                </Button>
                <span className="text-white/40 text-xs">Creates branded tiles from logo + gradient</span>
              </div>

              {/* Current / Latest Promo Tiles */}
              {latestPromo ? (
                <>
                  {/* Small Promo Tile */}
                  <div className="rounded-lg bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">Small Promo Tile</p>
                        <p className="text-white/40 text-xs">
                          440 x 280 pixels · Generated {formatTimestamp(latestPromo.timestamp)}
                        </p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20">
                        Ready
                      </Badge>
                    </div>
                    <button
                      onClick={() => setLightboxImage(`data:image/png;base64,${latestPromo.small.base64}`)}
                      className="w-full rounded-lg overflow-hidden border border-white/10 hover:border-white/20 transition-all cursor-zoom-in"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${latestPromo.small.base64}`}
                        alt="Small promo tile"
                        className="w-full"
                      />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadBase64(latestPromo.small.base64, latestPromo.small.filename)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                      >
                        <Download className="h-3 w-3 inline mr-1" />
                        Download
                      </button>
                      <button
                        onClick={() => handleDeletePromoEntry(latestPromo.id)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all ml-auto"
                      >
                        <Trash2 className="h-3 w-3 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Marquee Promo Tile */}
                  <div className="rounded-lg bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">
                          Marquee Promo Tile
                          <span className="text-white/30 text-xs ml-2">(Optional)</span>
                        </p>
                        <p className="text-white/40 text-xs">
                          1400 x 560 pixels · Generated {formatTimestamp(latestPromo.timestamp)}
                        </p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20">
                        Ready
                      </Badge>
                    </div>
                    <button
                      onClick={() => setLightboxImage(`data:image/png;base64,${latestPromo.marquee.base64}`)}
                      className="w-full rounded-lg overflow-hidden border border-white/10 hover:border-white/20 transition-all cursor-zoom-in"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${latestPromo.marquee.base64}`}
                        alt="Marquee promo tile"
                        className="w-full"
                      />
                    </button>
                    <button
                      onClick={() => downloadBase64(latestPromo.marquee.base64, latestPromo.marquee.filename)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <Download className="h-3 w-3 inline mr-1" />
                      Download
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Empty state - Small */}
                  <div className="rounded-lg bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">Small Promo Tile</p>
                        <p className="text-white/40 text-xs">440 x 280 pixels</p>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
                        Missing
                      </Badge>
                    </div>
                    <div className="w-full aspect-[440/280] rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-white/15" />
                    </div>
                  </div>

                  {/* Empty state - Marquee */}
                  <div className="rounded-lg bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">
                          Marquee Promo Tile
                          <span className="text-white/30 text-xs ml-2">(Optional)</span>
                        </p>
                        <p className="text-white/40 text-xs">1400 x 560 pixels</p>
                      </div>
                      <Badge className="bg-white/5 text-white/30 border-white/10 hover:bg-white/5">
                        Optional
                      </Badge>
                    </div>
                    <div className="w-full aspect-[1400/560] rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-white/15" />
                    </div>
                  </div>
                </>
              )}

              {/* Previous Generations */}
              {previousPromos.length > 0 && (
                <div className="rounded-lg bg-white/5 border border-white/10">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-all rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-white/40" />
                      <span className="text-white/70 text-sm font-medium">
                        Previous Generations ({previousPromos.length})
                      </span>
                    </div>
                    {showHistory ? (
                      <ChevronUp className="h-4 w-4 text-white/40" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white/40" />
                    )}
                  </button>

                  {showHistory && (
                    <div className="border-t border-white/10 p-4 space-y-4">
                      {previousPromos.map((entry) => (
                        <div key={entry.id} className="rounded-lg bg-black/20 p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-xs font-mono">
                              {formatTimestamp(entry.timestamp)}
                            </span>
                            <button
                              onClick={() => handleDeletePromoEntry(entry.id)}
                              className="p-1 rounded-md text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Delete this generation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Small tile thumbnail */}
                            <div className="space-y-1.5">
                              <button
                                onClick={() => setLightboxImage(`data:image/png;base64,${entry.small.base64}`)}
                                className="w-full rounded border border-white/10 overflow-hidden hover:border-white/20 transition-all cursor-zoom-in"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`data:image/png;base64,${entry.small.base64}`}
                                  alt="Small tile"
                                  className="w-full"
                                />
                              </button>
                              <button
                                onClick={() => downloadBase64(entry.small.base64, `small-tile-${entry.id}.png`)}
                                className="px-2 py-1 rounded text-[10px] font-medium bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                              >
                                <Download className="h-2.5 w-2.5 inline mr-1" />
                                Small
                              </button>
                            </div>
                            {/* Marquee tile thumbnail */}
                            <div className="space-y-1.5">
                              <button
                                onClick={() => setLightboxImage(`data:image/png;base64,${entry.marquee.base64}`)}
                                className="w-full rounded border border-white/10 overflow-hidden hover:border-white/20 transition-all cursor-zoom-in"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`data:image/png;base64,${entry.marquee.base64}`}
                                  alt="Marquee tile"
                                  className="w-full"
                                />
                              </button>
                              <button
                                onClick={() => downloadBase64(entry.marquee.base64, `marquee-${entry.id}.png`)}
                                className="px-2 py-1 rounded text-[10px] font-medium bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                              >
                                <Download className="h-2.5 w-2.5 inline mr-1" />
                                Marquee
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="text-center text-white/30 text-xs">
                {promoHistory.length} generation{promoHistory.length !== 1 ? "s" : ""} in history
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Full size preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </motion.div>
  );
}
