"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  Copy,
  Check,
  Plus,
  Download,
  Trash2,
  Link2,
  ChevronDown,
  ChevronUp,
  Search,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const STORAGE_KEY = "jobfiltr-appsumo-license-codes";
const REDEMPTION_URL = "https://jobfiltr.app/redeem";

interface LicenseCode {
  code: string;
  status: "available" | "redeemed" | "revoked";
  createdAt: number;
  redeemedBy?: string;
  redeemedAt?: number;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 for clarity
  const seg = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${seg()}-${seg()}-${seg()}-${seg()}`;
}

function loadCodes(): LicenseCode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LicenseCode[];
  } catch {
    return [];
  }
}

function saveCodes(codes: LicenseCode[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

type FilterType = "all" | "available" | "redeemed" | "revoked";

export function LicenseCodeManager() {
  const { copiedKey, copyText } = useCopyFeedback();
  const [codes, setCodes] = useState<LicenseCode[]>([]);
  const [genCount, setGenCount] = useState(100);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCodes(loadCodes());
  }, []);

  const stats = useMemo(() => {
    const total = codes.length;
    const available = codes.filter((c) => c.status === "available").length;
    const redeemed = codes.filter((c) => c.status === "redeemed").length;
    const revoked = codes.filter((c) => c.status === "revoked").length;
    return { total, available, redeemed, revoked };
  }, [codes]);

  const filteredCodes = useMemo(() => {
    let result = codes;
    if (filter !== "all") {
      result = result.filter((c) => c.status === filter);
    }
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      result = result.filter(
        (c) =>
          c.code.includes(q) ||
          (c.redeemedBy && c.redeemedBy.toUpperCase().includes(q))
      );
    }
    return result;
  }, [codes, filter, search]);

  const handleGenerate = () => {
    const count = Math.min(Math.max(1, genCount), 10000);
    const existing = new Set(codes.map((c) => c.code));
    const newCodes: LicenseCode[] = [];
    let attempts = 0;
    while (newCodes.length < count && attempts < count * 3) {
      const code = generateCode();
      if (!existing.has(code)) {
        existing.add(code);
        newCodes.push({
          code,
          status: "available",
          createdAt: Date.now(),
        });
      }
      attempts++;
    }
    const updated = [...codes, ...newCodes];
    setCodes(updated);
    saveCodes(updated);
  };

  const handleRevoke = (code: string) => {
    setCodes((prev) => {
      const updated = prev.map((c) =>
        c.code === code ? { ...c, status: "revoked" as const } : c
      );
      saveCodes(updated);
      return updated;
    });
  };

  const handleRestore = (code: string) => {
    setCodes((prev) => {
      const updated = prev.map((c) =>
        c.code === code && c.status === "revoked"
          ? { ...c, status: "available" as const }
          : c
      );
      saveCodes(updated);
      return updated;
    });
  };

  const handleDelete = (code: string) => {
    setCodes((prev) => {
      const updated = prev.filter((c) => c.code !== code);
      saveCodes(updated);
      return updated;
    });
  };

  const handleExportCSV = () => {
    const available = codes.filter((c) => c.status === "available");
    const csv = "code,status,createdAt\n" +
      available.map((c) => `${c.code},${c.status},${new Date(c.createdAt).toISOString()}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobfiltr-appsumo-codes-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAllAvailable = () => {
    const available = codes.filter((c) => c.status === "available").map((c) => c.code);
    copyText("all-available", available.join("\n"));
  };

  const statCards = [
    { label: "Total", value: stats.total, color: "text-white" },
    { label: "Available", value: stats.available, color: "text-green-400" },
    { label: "Redeemed", value: stats.redeemed, color: "text-blue-400" },
    { label: "Revoked", value: stats.revoked, color: "text-red-400" },
  ];

  const PRESETS = [50, 100, 500, 1000, 5000];

  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-white/5 backdrop-blur-xl border border-amber-500/30 shadow-lg shadow-amber-500/10">
        <CardHeader>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-between w-full text-left group"
          >
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-400" />
                License Code Manager
              </CardTitle>
              <CardDescription className="text-white/60">
                Generate, track, and export AppSumo redemption codes
              </CardDescription>
            </div>
            {collapsed ? (
              <ChevronDown className="h-5 w-5 text-white/40 group-hover:text-white/70 transition-colors" />
            ) : (
              <ChevronUp className="h-5 w-5 text-white/40 group-hover:text-white/70 transition-colors" />
            )}
          </button>
        </CardHeader>

        {!collapsed && (
          <CardContent className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3">
              {statCards.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg bg-white/5 border border-white/10 p-4 text-center"
                >
                  <div className={`text-3xl font-bold font-mono ${s.color}`}>
                    {s.value}
                  </div>
                  <div className="text-white/50 text-sm mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Generate & Export Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Generate Codes */}
              <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-3">
                <h4 className="text-white font-semibold text-sm">Generate Codes</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={genCount}
                    onChange={(e) => setGenCount(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={10000}
                    className="w-24 rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white text-sm font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <Button
                    onClick={handleGenerate}
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-semibold"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Generate
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setGenCount(n)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                        genCount === n
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-white/5 text-white/50 hover:text-white/80 border border-transparent"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export & Links */}
              <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-3">
                <h4 className="text-white font-semibold text-sm">Export & Links</h4>
                <button
                  onClick={handleCopyAllAvailable}
                  className={`w-full rounded-md px-4 py-2.5 text-sm font-medium transition-all border ${
                    copiedKey === "all-available"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-white/5 text-white/70 hover:bg-white/10 border-white/10"
                  }`}
                >
                  <Download className="inline mr-2 h-4 w-4" />
                  {copiedKey === "all-available"
                    ? "Copied!"
                    : `Copy ${stats.available} Available Codes`}
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full rounded-md bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 transition-all font-medium"
                >
                  <Download className="inline mr-2 h-4 w-4" />
                  Export CSV
                </button>
                <div className="flex items-center gap-2 mt-2">
                  <Link2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-white/60 text-sm truncate">
                    {REDEMPTION_URL}
                  </span>
                  <button
                    onClick={() => copyText("redeem-url", REDEMPTION_URL)}
                    className={`shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      copiedKey === "redeem-url"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {copiedKey === "redeem-url" ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>
            </div>

            {/* All Codes Section */}
            <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold text-sm">
                  All Codes ({filteredCodes.length})
                </h4>
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search codes..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-40 pl-8 pr-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-amber-500 focus:outline-none placeholder:text-white/30"
                    />
                  </div>
                  {/* Filter */}
                  <div className="flex rounded-md overflow-hidden border border-white/10">
                    {(["all", "available", "redeemed", "revoked"] as FilterType[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-2.5 py-1.5 text-xs capitalize transition-all ${
                          filter === f
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-white/5 text-white/50 hover:text-white/80"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Code List */}
              <div className="max-h-80 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredCodes.length === 0 ? (
                  <div className="text-center text-white/30 py-8 text-sm">
                    {codes.length === 0
                      ? "No codes generated yet. Click Generate to create codes."
                      : "No codes match the current filter."}
                  </div>
                ) : (
                  filteredCodes.map((c) => (
                    <div
                      key={c.code}
                      className="flex items-center justify-between rounded-lg bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 group transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white/80 text-sm font-mono">
                          {c.code}
                        </span>
                        <button
                          onClick={() => copyText(`code-${c.code}`, c.code)}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                            copiedKey === `code-${c.code}`
                              ? "bg-green-500/20 text-green-400"
                              : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {copiedKey === `code-${c.code}` ? (
                            <Check className="h-3 w-3 inline" />
                          ) : (
                            <Copy className="h-3 w-3 inline" />
                          )}{" "}
                          Copy
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.redeemedBy && (
                          <span className="text-white/30 text-xs font-mono truncate max-w-[120px]">
                            {c.redeemedBy}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            c.status === "available"
                              ? "bg-green-500/15 text-green-400"
                              : c.status === "redeemed"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {c.status === "available"
                            ? "Available"
                            : c.status === "redeemed"
                            ? "Redeemed"
                            : "Revoked"}
                        </span>
                        {c.status === "available" && (
                          <button
                            onClick={() => handleRevoke(c.code)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/30 hover:text-red-400 transition-all"
                            title="Revoke code"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {c.status === "revoked" && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRestore(c.code)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/30 hover:text-green-400 transition-all"
                              title="Restore code"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.code)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/30 hover:text-red-400 transition-all"
                              title="Delete permanently"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}
