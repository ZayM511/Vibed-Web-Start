"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  DollarSign,
  TrendingUp,
  Copy,
  Check,
  RefreshCw,
  Pencil,
  Save,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Mail,
  Brain,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";

// ─── Types ───

interface Platform {
  name: string;
  handle: string;
  url: string;
  followerCount: string;
}

interface Influencer {
  id: string;
  name: string;
  platforms: Platform[];
  primaryFollowerCount: number;
  primaryFollowerDisplay: string;
  niche: string;
  tier: "micro" | "mid-major" | "major" | "international";
  partnershipOpenness: string;
  estimatedCostMin: number;
  estimatedCostMax: number;
  estimatedCostDisplay: string;
  suggestedDeal: string;
  estimatedRevenue: string;
  estimatedRevenueRaw: number;
  demographics: { usPercent: number; topCountries: string[]; ageRange: string; primaryGender: string };
  contactInfo: { management?: string; email?: string; agencyNotes?: string };
  notes: string;
}

interface AnalysisResult {
  influencer: Influencer;
  overallScore: number;
  factors: { name: string; score: number; weight: number; reasoning: string }[];
  strategy: string;
  estimatedMRR: { day30: number; day60: number; day90: number };
  budgetAllocation: number;
  message: string;
  messageEdited: boolean;
}

// ─── Scoring Algorithm ───

const PRO_PRICE = 7.99;

function analyzeInfluencer(inf: Influencer, budget: number): AnalysisResult & { rawScore: number } {
  const factors: { name: string; score: number; weight: number; reasoning: string }[] = [];

  // 1. Budget Fit (25%) — Can we afford them? How efficiently does it use budget?
  const midCost = (inf.estimatedCostMin + inf.estimatedCostMax) / 2;
  let budgetScore: number;
  let budgetReason: string;
  if (midCost > budget) {
    const ratio = budget / midCost;
    budgetScore = ratio < 0.3 ? 1 : ratio < 0.5 ? 3 : ratio < 0.7 ? 5 : 6;
    budgetReason = `Mid-range cost $${midCost.toLocaleString()} exceeds budget by ${Math.round((1 - ratio) * 100)}%. May need to negotiate a reduced scope deal.`;
  } else if (midCost <= budget * 0.15) {
    budgetScore = 10;
    budgetReason = `Extremely affordable at $${midCost.toLocaleString()} — uses only ${Math.round((midCost / budget) * 100)}% of budget. Room for multiple partnerships.`;
  } else if (midCost <= budget * 0.3) {
    budgetScore = 9;
    budgetReason = `Great budget fit at $${midCost.toLocaleString()} — uses ${Math.round((midCost / budget) * 100)}% of budget with strong headroom.`;
  } else if (midCost <= budget * 0.5) {
    budgetScore = 8;
    budgetReason = `Solid budget fit at $${midCost.toLocaleString()} — uses ${Math.round((midCost / budget) * 100)}% of budget.`;
  } else {
    budgetScore = 7;
    budgetReason = `Takes ${Math.round((midCost / budget) * 100)}% of budget at $${midCost.toLocaleString()}. Significant commitment but within range.`;
  }
  factors.push({ name: "Budget Fit", score: budgetScore, weight: 0.25, reasoning: budgetReason });

  // 2. Revenue ROI (25%) — estimatedRevenue / cost ratio
  const roiRatio = inf.estimatedRevenueRaw / midCost;
  let roiScore: number;
  let roiReason: string;
  if (roiRatio >= 5) { roiScore = 10; roiReason = `Exceptional ROI at ${roiRatio.toFixed(1)}x return. Every $1 spent could generate $${roiRatio.toFixed(0)} in revenue.`; }
  else if (roiRatio >= 4) { roiScore = 9; roiReason = `Excellent ROI at ${roiRatio.toFixed(1)}x return. Strong revenue potential relative to cost.`; }
  else if (roiRatio >= 3) { roiScore = 8; roiReason = `Good ROI at ${roiRatio.toFixed(1)}x return. Solid revenue upside.`; }
  else if (roiRatio >= 2) { roiScore = 7; roiReason = `Moderate ROI at ${roiRatio.toFixed(1)}x. Reasonable but not exceptional.`; }
  else { roiScore = 5; roiReason = `Low ROI at ${roiRatio.toFixed(1)}x. May need high conversion to justify cost.`; }
  factors.push({ name: "Revenue ROI", score: roiScore, weight: 0.25, reasoning: roiReason });

  // 3. Audience Alignment (20%) — US%, career niche fit, job search intent
  const nicheKeywords = ["career", "job", "resume", "interview", "salary", "hiring", "recruit", "linkedin", "work"];
  const nicheMatch = nicheKeywords.filter((k) => inf.niche.toLowerCase().includes(k)).length;
  const nicheScore = Math.min(10, nicheMatch * 2 + 3);
  const usBonus = inf.demographics.usPercent >= 60 ? 2 : inf.demographics.usPercent >= 40 ? 1 : 0;
  const alignmentScore = Math.min(10, Math.round((nicheScore * 0.7 + (inf.demographics.usPercent / 10) * 0.3) + usBonus * 0.5));
  const alignmentReason = `Niche match: ${nicheMatch}/${nicheKeywords.length} career keywords. US audience: ${inf.demographics.usPercent}%. ${inf.demographics.ageRange} demographic (${inf.demographics.primaryGender}).`;
  factors.push({ name: "Audience Alignment", score: alignmentScore, weight: 0.20, reasoning: alignmentReason });

  // 4. Reach Efficiency (15%) — Followers per dollar
  const followersPerDollar = inf.primaryFollowerCount / midCost;
  let reachScore: number;
  let reachReason: string;
  if (followersPerDollar >= 200) { reachScore = 10; reachReason = `Outstanding reach efficiency: ${Math.round(followersPerDollar)} followers per dollar spent.`; }
  else if (followersPerDollar >= 100) { reachScore = 9; reachReason = `Excellent reach efficiency: ${Math.round(followersPerDollar)} followers per dollar.`; }
  else if (followersPerDollar >= 50) { reachScore = 8; reachReason = `Good reach efficiency: ${Math.round(followersPerDollar)} followers per dollar.`; }
  else if (followersPerDollar >= 20) { reachScore = 7; reachReason = `Moderate reach: ${Math.round(followersPerDollar)} followers per dollar. Premium pricing.`; }
  else { reachScore = 5; reachReason = `Low reach efficiency: ${Math.round(followersPerDollar)} followers per dollar. Expensive audience.`; }
  factors.push({ name: "Reach Efficiency", score: reachScore, weight: 0.15, reasoning: reachReason });

  // 5. Partnership Openness (10%)
  const opennessMap: Record<string, { score: number; reason: string }> = {
    Open: { score: 10, reason: "Actively open to partnerships. High probability of response and favorable terms." },
    Selective: { score: 6, reason: "Selective about partnerships. Will need a compelling pitch and strong product-audience fit." },
    Unknown: { score: 5, reason: "Partnership openness unknown. May require more research or creative outreach." },
    Closed: { score: 2, reason: "Not currently accepting partnerships. Very low probability of conversion." },
  };
  const openness = opennessMap[inf.partnershipOpenness] || opennessMap.Unknown;
  factors.push({ name: "Partnership Openness", score: openness.score, weight: 0.10, reasoning: openness.reason });

  // 6. Platform Diversity (5%)
  const platformCount = inf.platforms.length;
  const platformScore = Math.min(10, platformCount * 2 + 2);
  const platformReason = `${platformCount} platform${platformCount > 1 ? "s" : ""}: ${inf.platforms.map((p) => p.name).join(", ")}. ${platformCount >= 3 ? "Multi-platform amplification." : "Single-channel reach."}`;
  factors.push({ name: "Platform Diversity", score: platformScore, weight: 0.05, reasoning: platformReason });

  // Overall weighted score
  const rawScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const overallScore = Math.round(rawScore * 10) / 10;

  // Strategy recommendation
  let strategy: string;
  if (inf.tier === "micro") {
    strategy = `Micro-influencer play: offer free Pro lifetime access + affiliate commission (15-20% recurring). Low risk, authentic content. If they love it, negotiate a dedicated video for $${inf.estimatedCostMin}-$${inf.estimatedCostMax}.`;
  } else if (inf.tier === "mid-major") {
    strategy = `Mid-major approach: lead with free Pro access for 2 weeks → genuine review video. Offer $${inf.estimatedCostMin}-$${inf.estimatedCostMax} for a dedicated integration + affiliate code. Their audience is actively job searching = high conversion.`;
  } else if (inf.tier === "major") {
    strategy = `Major influencer play: propose a multi-touch campaign — 1 dedicated video + 2 story mentions + affiliate code. Budget: $${inf.estimatedCostMin}-$${inf.estimatedCostMax}. Frame around the ghost job epidemic for viral potential.`;
  } else {
    strategy = `International reach: test with a single sponsored post for $${inf.estimatedCostMin}-$${inf.estimatedCostMax}. Gauge non-US conversion rates before committing more. Best for Chrome Web Store global ranking boost.`;
  }

  // MRR estimation
  const conversionRate = inf.tier === "micro" ? 0.004 : inf.tier === "mid-major" ? 0.002 : inf.tier === "major" ? 0.001 : 0.0008;
  const baseConversions = Math.round(inf.primaryFollowerCount * conversionRate);
  const day30MRR = Math.round(baseConversions * PRO_PRICE);
  const day60MRR = Math.round(day30MRR * 1.6); // retention + organic growth
  const day90MRR = Math.round(day30MRR * 2.2); // compounding referrals

  // Generate cold outreach message
  const message = generateMessage(inf);

  return {
    influencer: inf,
    overallScore,
    rawScore,
    factors,
    strategy,
    estimatedMRR: { day30: day30MRR, day60: day60MRR, day90: day90MRR },
    budgetAllocation: Math.round(midCost),
    message,
    messageEdited: false,
  };
}

function generateMessage(inf: Influencer, variant: number = 0): string {
  const firstName = inf.name.split(" ")[0].split("(")[0].split("&")[0].trim();
  const topPlatform = inf.platforms[0];
  const achievement = inf.notes.split(",")[0] || inf.niche;

  const templates = [
    // Template 0: Direct value pitch
    `Hey ${firstName},

I've been following your content on ${topPlatform.name} — ${achievement.toLowerCase().startsWith("forbes") || achievement.toLowerCase().startsWith("nyt") ? achievement : `your work on ${inf.niche.toLowerCase()}`} really resonates with the problem we're solving.

I'm the founder of JobFiltr, a Chrome extension that detects ghost jobs, scams, and spam on LinkedIn and Indeed using AI (50+ signals per listing). We built it because 40-50% of job listings are ghost posts — and your audience is dealing with this every day.

I'd love to give you free lifetime Pro access to try it. If you find it genuinely useful, I think your audience would too — and we could explore a partnership that works for both of us (affiliate commission, sponsored content, or whatever feels right).

No pressure at all. I just want you to try it first and see if it clicks.

Would you be open to testing it out?

Best,
[Your Name]
Founder, JobFiltr`,

    // Template 1: Social proof / trend angle
    `Hi ${firstName},

Ghost jobs are everywhere right now — studies show 40-50% of listings are fake or expired. Your audience on ${topPlatform.name} (${topPlatform.followerCount} strong!) is probably running into this daily.

We built JobFiltr to solve this. It's a Chrome extension that uses AI to analyze 50+ signals per job listing and flags ghost posts, scams, and staffing agency reposts — right inside LinkedIn and Indeed. Zero data collection, completely private.

I'd love to send you a lifetime Pro license to try for yourself. ${inf.niche.toLowerCase().includes("recruit") || inf.niche.toLowerCase().includes("hiring") ? "Given your recruiting background, I'd especially value your perspective on the detection accuracy." : "Given your expertise in career strategy, your feedback would mean a lot."}

If it saves you (or your audience) even a few hours of wasted applications, I think there's a great story there.

Open to chatting?

[Your Name]
JobFiltr`,

    // Template 2: Casual / authentic
    `${firstName} — quick note.

I built a Chrome extension called JobFiltr that catches ghost jobs on LinkedIn and Indeed before people waste time applying. AI analyzes 50+ red flags per listing.

Saw your content on ${inf.niche.toLowerCase()} and thought your ${topPlatform.followerCount}+ audience would genuinely benefit from this. Not looking for a sales pitch — just want to give you a free Pro account to try it.

If you hate it, no worries. If you love it, let's talk about getting it in front of your audience.

Sound fair?

[Your Name]`,
  ];

  return templates[variant % templates.length];
}

// ─── Component ───

interface BudgetAnalyzerProps {
  influencers: Influencer[];
}

export function BudgetAnalyzer({ influencers }: BudgetAnalyzerProps) {
  const { copiedKey, copyText } = useCopyFeedback();
  const [budget, setBudget] = useState(2000);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setResults(null);
    setAnalysisComplete(false);

    // Simulate deep thinking with progressive analysis
    await new Promise((r) => setTimeout(r, 1800));

    // Score all influencers
    const allScored = influencers.map((inf) => analyzeInfluencer(inf, budget));

    // Filter to 9.0+ only
    const passing = allScored
      .filter((r) => r.overallScore >= 9.0)
      .sort((a, b) => b.overallScore - a.overallScore);

    // If nothing passes 9.0, show top results with explanation
    const finalResults: AnalysisResult[] = passing.length > 0
      ? passing
      : allScored.sort((a, b) => b.overallScore - a.overallScore).slice(0, 3);

    setResults(finalResults);
    setAnalyzing(false);
    setAnalysisComplete(true);
  }, [influencers, budget]);

  const handleRegenerateMessage = (id: string) => {
    const result = results?.find((r) => r.influencer.id === id);
    if (!result) return;
    const currentMsg = messageDrafts[id] || result.message;
    // Pick a different template
    const variants = [0, 1, 2];
    const currentIdx = variants.findIndex((v) => generateMessage(result.influencer, v) === currentMsg);
    const nextVariant = (currentIdx + 1) % 3;
    const newMsg = generateMessage(result.influencer, nextVariant);
    setMessageDrafts((prev) => ({ ...prev, [id]: newMsg }));
    setResults((prev) =>
      prev?.map((r) => (r.influencer.id === id ? { ...r, message: newMsg, messageEdited: false } : r)) ?? null
    );
  };

  const handleSaveMessage = (id: string) => {
    const draft = messageDrafts[id];
    if (draft) {
      setResults((prev) =>
        prev?.map((r) => (r.influencer.id === id ? { ...r, message: draft, messageEdited: true } : r)) ?? null
      );
    }
    setEditingMessage(null);
  };

  const BUDGET_PRESETS = [500, 1000, 2000, 5000, 10000, 25000];

  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `$${n}`;

  const passingCount = results?.filter((r) => r.overallScore >= 9.0).length ?? 0;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
    >
      <Card className="bg-gradient-to-b from-violet-500/5 to-purple-500/5 backdrop-blur-xl border border-violet-500/30 shadow-lg shadow-violet-500/10">
        <CardHeader>
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-between w-full text-left group">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Brain className="h-5 w-5 text-violet-400" />
                Outreach Budget Analyzer
              </CardTitle>
              <CardDescription className="text-white/60">
                Set your budget, analyze optimal paths, and generate cold outreach messages
              </CardDescription>
            </div>
            {collapsed ? <ChevronDown className="h-5 w-5 text-white/40" /> : <ChevronUp className="h-5 w-5 text-white/40" />}
          </button>
        </CardHeader>

        {!collapsed && (
          <CardContent className="space-y-6">
            {/* Budget Input */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-5 w-5 text-violet-400" />
                <h3 className="text-white font-semibold">Monthly Budget</h3>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">$</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-40 pl-8 pr-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white text-xl font-mono font-bold focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <Button
                  onClick={runAnalysis}
                  disabled={analyzing || budget === 0}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-6 py-3 text-base disabled:opacity-40"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-5 w-5" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {BUDGET_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setBudget(p)}
                    className={`px-3 py-1.5 rounded-md text-sm font-mono transition-all ${
                      budget === p
                        ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                        : "bg-white/5 text-white/50 hover:text-white/80 border border-transparent"
                    }`}
                  >
                    {fmt(p)}
                  </button>
                ))}
              </div>
            </div>

            {/* Analysis Progress */}
            {analyzing && (
              <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-6 text-center">
                <Loader2 className="h-8 w-8 text-violet-400 animate-spin mx-auto mb-3" />
                <p className="text-white font-medium">Running deep analysis...</p>
                <p className="text-white/40 text-sm mt-1">
                  Evaluating {influencers.length} influencers across 6 scoring dimensions. Only paths rated 9/10+ will be presented.
                </p>
              </div>
            )}

            {/* Results */}
            {analysisComplete && results && (
              <div className="space-y-4">
                {/* Results Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-violet-400" />
                      {passingCount > 0
                        ? `${passingCount} Optimal Path${passingCount > 1 ? "s" : ""} Found`
                        : "Top Paths (None scored 9+)"}
                    </h3>
                    <p className="text-white/40 text-xs mt-0.5">
                      {passingCount > 0
                        ? `Scored 9.0/10 or higher from ${influencers.length} influencers analyzed`
                        : `Showing top 3 results. Consider increasing budget or adjusting criteria.`}
                    </p>
                  </div>
                  <Button
                    onClick={runAnalysis}
                    variant="ghost"
                    size="sm"
                    className="text-violet-400 hover:text-violet-300"
                  >
                    <RefreshCw className="mr-1 h-4 w-4" />
                    Re-analyze
                  </Button>
                </div>

                {/* Result Cards */}
                <AnimatePresence>
                  {results.map((result, idx) => {
                    const isExpanded = expandedResult === result.influencer.id;
                    const isEditingMsg = editingMessage === result.influencer.id;
                    const currentMessage = messageDrafts[result.influencer.id] || result.message;
                    const meetsThreshold = result.overallScore >= 9.0;

                    return (
                      <motion.div
                        key={result.influencer.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`rounded-xl border p-5 space-y-4 ${
                          meetsThreshold
                            ? "bg-gradient-to-r from-violet-500/10 to-purple-500/5 border-violet-500/30"
                            : "bg-white/[0.03] border-white/10"
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                              meetsThreshold ? "bg-violet-500/20 text-violet-400" : "bg-white/10 text-white/50"
                            }`}>
                              {result.overallScore.toFixed(1)}
                            </div>
                            <div>
                              <h4 className="text-white font-semibold">{result.influencer.name}</h4>
                              <p className="text-white/50 text-xs">{result.influencer.niche}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/40 capitalize">
                                  {result.influencer.tier}
                                </span>
                                <span className="text-xs text-white/30">
                                  {result.influencer.primaryFollowerDisplay} followers
                                </span>
                                <span className="text-xs text-white/30">
                                  ~{fmt(result.budgetAllocation)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {meetsThreshold && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/15 text-green-400 text-xs font-medium">
                              <Sparkles className="h-3 w-3" />
                              Recommended
                            </div>
                          )}
                        </div>

                        {/* MRR Estimates */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "30-Day MRR", value: result.estimatedMRR.day30 },
                            { label: "60-Day MRR", value: result.estimatedMRR.day60 },
                            { label: "90-Day MRR", value: result.estimatedMRR.day90 },
                          ].map((m) => (
                            <div key={m.label} className="rounded-lg bg-white/5 border border-white/5 p-3 text-center">
                              <div className="text-green-400 font-bold font-mono text-lg">
                                ${m.value.toLocaleString()}
                              </div>
                              <div className="text-white/40 text-xs mt-0.5">{m.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Strategy */}
                        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                          <div className="flex items-center gap-1.5 text-violet-400 text-xs font-medium mb-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Recommended Strategy
                          </div>
                          <p className="text-white/70 text-sm">{result.strategy}</p>
                        </div>

                        {/* Expand/Collapse */}
                        <button
                          onClick={() => setExpandedResult(isExpanded ? null : result.influencer.id)}
                          className="flex items-center gap-1 text-violet-400 text-xs hover:text-violet-300 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {isExpanded ? "Hide Details" : "Show Scoring Breakdown & Outreach Message"}
                        </button>

                        {isExpanded && (
                          <div className="space-y-4 pt-2 border-t border-white/5">
                            {/* Scoring Breakdown */}
                            <div>
                              <h5 className="text-white text-sm font-medium mb-2">Scoring Breakdown</h5>
                              <div className="space-y-2">
                                {result.factors.map((f) => (
                                  <div key={f.name} className="rounded-md bg-white/[0.03] p-2.5">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-white/80 text-sm font-medium">{f.name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-white/30 text-xs">{Math.round(f.weight * 100)}%</span>
                                        <span className={`font-mono font-bold text-sm ${
                                          f.score >= 9 ? "text-green-400" : f.score >= 7 ? "text-amber-400" : "text-red-400"
                                        }`}>
                                          {f.score}/10
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-white/40 text-xs">{f.reasoning}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Cold Outreach Message */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-white text-sm font-medium flex items-center gap-1.5">
                                  <Mail className="h-4 w-4 text-violet-400" />
                                  Cold Outreach Message
                                </h5>
                                <div className="flex items-center gap-1">
                                  {!isEditingMsg && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingMessage(result.influencer.id);
                                          setMessageDrafts((p) => ({ ...p, [result.influencer.id]: currentMessage }));
                                        }}
                                        className="p-1.5 rounded-md bg-white/5 text-white/50 hover:text-white transition-all"
                                        title="Edit message"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleRegenerateMessage(result.influencer.id)}
                                        className="p-1.5 rounded-md bg-white/5 text-white/50 hover:text-violet-400 transition-all"
                                        title="Regenerate message"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => copyText(`msg-${result.influencer.id}`, currentMessage)}
                                        className={`p-1.5 rounded-md transition-all ${
                                          copiedKey === `msg-${result.influencer.id}`
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-white/5 text-white/50 hover:text-white"
                                        }`}
                                        title="Copy message"
                                      >
                                        {copiedKey === `msg-${result.influencer.id}` ? (
                                          <Check className="h-3.5 w-3.5" />
                                        ) : (
                                          <Copy className="h-3.5 w-3.5" />
                                        )}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {isEditingMsg ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={messageDrafts[result.influencer.id] || currentMessage}
                                    onChange={(e) =>
                                      setMessageDrafts((p) => ({ ...p, [result.influencer.id]: e.target.value }))
                                    }
                                    rows={12}
                                    className="w-full rounded-lg bg-white/10 border-2 border-violet-500/50 px-4 py-3 text-white text-sm font-mono resize-y focus:border-violet-500 focus:outline-none"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveMessage(result.influencer.id)}
                                      className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs"
                                    >
                                      <Save className="mr-1 h-3 w-3" /> Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingMessage(null)}
                                      className="text-white/50 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4">
                                  <pre className="text-white/70 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                                    {currentMessage}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}
