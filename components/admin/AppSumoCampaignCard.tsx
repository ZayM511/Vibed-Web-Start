"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  ClipboardList,
  Rocket,
  FlagTriangleRight,
  Image as ImageIcon,
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

const STORAGE_KEY = "jobfiltr-appsumo-checklist";

const FORM_URL =
  "https://share.hsforms.com/2iUvbadKTQ4GR29FDPAjFWgcbi47";

interface FormField {
  label: string;
  value: string;
  copyable: boolean;
}

const FORM_FIELDS: FormField[] = [
  {
    label: "Product Name",
    value: "JobFiltr",
    copyable: true,
  },
  {
    label: "Website / Product URL",
    value: "https://jobfiltr.app",
    copyable: true,
  },
  {
    label: "Number of Active Paid Customers",
    value: "0  (dropdown options: 0, 1-25, 25-75, 75-150, 150-500, 500+)",
    copyable: false,
  },
  {
    label: "Self-serve within 30 days?",
    value:
      "Yes. We already have a public Chrome Web Store listing with a self-serve install flow. We are preparing tiered pricing for the AppSumo launch with a dedicated redemption page for license key activation.",
    copyable: true,
  },
  {
    label: "What are you looking for from an AppSumo campaign?",
    value:
      "We're looking for three things: (1) Rapid user acquisition — we want to get JobFiltr into the hands of thousands of active job seekers who will use it daily and provide feedback. (2) Market validation and social proof — reviews and testimonials from real users to build credibility. (3) Revenue to fund development — we're bootstrapped and the upfront revenue will let us ship our roadmap faster, including AI-powered resume tailoring, application tracking, and salary benchmarking.",
    copyable: true,
  },
  {
    label: "Why do customers choose your product over similar tools?",
    value:
      "JobFiltr is the only browser extension that combines ghost job detection, scam/spam filtering, staffing agency removal, job age badges, and keyword-based filtering — all in real-time as you browse LinkedIn and Indeed. Competitors either focus on a single feature (like job age) or require you to leave the job board entirely. JobFiltr works invisibly inside the platforms job seekers already use, with zero tracking and zero data collection. Our ghost detection analyzes 50+ signals per listing with AI, something no other tool offers at this level. Users tell us it saves them 5-10 hours per week by eliminating low-quality listings before they waste time reading them.",
    copyable: true,
  },
  {
    label: "Core features / roadmap link",
    value:
      "Core: Ghost job AI detection (50+ signals), job age badges, staffing agency filter, scam/spam detection, keyword include/exclude filters, hide sponsored posts, remote job verification, company blocklist, salary range filter (Indeed), auto-hide applied jobs (Indeed), community-reported companies. Roadmap: https://jobfiltr.app/roadmap",
    copyable: true,
  },
  {
    label: "Questions for AppSumo?",
    value:
      "We'd love to understand: (1) What's the typical timeline from application approval to going live? (2) Can we run a Product Hunt launch concurrently or should we stagger them? (3) Are there best practices for Chrome extension redemption flows specifically?",
    copyable: true,
  },
];

interface ChecklistSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: { id: string; label: string; detail?: string }[];
}

const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: "assets",
    title: "Required Assets",
    icon: <ImageIcon className="h-4 w-4" />,
    items: [
      {
        id: "asset-hero",
        label: "Hero/Header Image",
        detail: "1920x1080px, JPG/PNG, max 5MB. Logo centered, no text overlays. Use AppSumo Figma template.",
      },
      {
        id: "asset-screenshots",
        label: "Product Screenshots (up to 5)",
        detail: "1920x1080px each, JPG/PNG. Real screenshots only — no mockups, overlays, or watermarks.",
      },
      {
        id: "asset-video",
        label: "Demo Video",
        detail: "60-90 seconds. Open with problem (5s), show real usage, end with CTA.",
      },
      {
        id: "asset-redemption",
        label: "Redemption Landing Page",
        detail: "Fields: name, email, password, AppSumo code. NO credit card or phone number. Must include AppSumo + JobFiltr branding.",
      },
      {
        id: "asset-codes",
        label: "Redemption Codes (500-10,000)",
        detail: "Unique one-time-use codes for license activation.",
      },
      {
        id: "asset-test-account",
        label: "Test Account for QA Team",
        detail: "Full-access account with representative data and usage instructions.",
      },
    ],
  },
  {
    id: "pre-launch",
    title: "Pre-Launch Checklist",
    icon: <ClipboardList className="h-4 w-4" />,
    items: [
      { id: "pre-stable", label: "Extension is feature-complete and production-stable" },
      { id: "pre-pricing", label: "Public pricing page exists on JobFiltr.app" },
      { id: "pre-selfserve", label: "Self-serve install flow works end-to-end" },
      { id: "pre-guides", label: "User guides / knowledge base articles created" },
      { id: "pre-browser-test", label: "Tested across Chrome versions and OS platforms" },
      { id: "pre-hero", label: "Hero image created using AppSumo Figma template (1920x1080)" },
      { id: "pre-screenshots", label: "5 product screenshots captured (real, no overlays)" },
      { id: "pre-video", label: "Demo video recorded (60-90s)" },
      { id: "pre-redemption", label: "Redemption flow built and tested end-to-end" },
      { id: "pre-codes", label: "Redemption codes generated (500-10,000 unique codes)" },
      { id: "pre-test-acct", label: "Test account prepared for AppSumo QA team" },
      { id: "pre-loadtest", label: "Infrastructure load-tested for 5-10x normal traffic" },
      { id: "pre-support", label: "Support system ready (ticketing, knowledge base)" },
      { id: "pre-faq", label: "FAQ document prepared for common purchase questions" },
      { id: "pre-copy", label: "Marketing copy finalized (headline, description, price anchoring)" },
      { id: "pre-reviews", label: "Existing users/community primed to leave early reviews" },
      { id: "pre-social", label: "Social media announcement templates ready" },
      { id: "pre-form", label: "Partner Portal form submitted" },
      { id: "pre-calendar", label: "Calendar cleared for first 3-5 days of campaign" },
    ],
  },
  {
    id: "during",
    title: "During Campaign (60-Day Window)",
    icon: <Rocket className="h-4 w-4" />,
    items: [
      { id: "dur-qa", label: "Respond to ALL public Q&A on product page", detail: "Response time in hours, not days — especially week 1." },
      { id: "dur-reviews", label: "Engage with every review (positive and negative)" },
      { id: "dur-request", label: "Send review request emails to satisfied customers", detail: "1-2 days post-activation." },
      { id: "dur-updates", label: "Publish regular updates (new features, milestones, wins)" },
      { id: "dur-conversion", label: "Monitor conversion rate — adjust pricing if needed" },
      { id: "dur-utm", label: "Track attribution with UTM parameters" },
      { id: "dur-social", label: "Maintain social media momentum" },
      { id: "dur-infra", label: "Monitor infrastructure performance under load" },
    ],
  },
  {
    id: "post",
    title: "Post-Campaign",
    icon: <FlagTriangleRight className="h-4 w-4" />,
    items: [
      { id: "post-support", label: "Continue supporting LTD customers indefinitely" },
      { id: "post-licensedb", label: "Maintain license key database for customer lookup" },
      { id: "post-analyze", label: "Analyze which channels drove highest-quality customers" },
      { id: "post-feedback", label: "Collect and act on product feedback" },
      { id: "post-roi", label: "Calculate actual ROI (after 60-day refund window, net of 70% share)" },
      { id: "post-upsell", label: "Consider upselling LTD customers to premium features" },
    ],
  },
];

const KEY_INFO = [
  { label: "Revenue split", value: "~30% to you, ~70% to AppSumo (negotiable)" },
  { label: "Payment lag", value: "60 days after end of month" },
  { label: "Acceptance rate", value: "~10% of applicants" },
  { label: "Campaign duration", value: "60 days once live" },
  { label: "Plus-exclusive window", value: "7 days before general launch" },
  { label: "Recommended base tier", value: "$49-$79 (above $89 likely rejected)" },
  { label: "Pricing tiers", value: "Tier 1: ~$49 Individual / Tier 2: ~$89 Team / Tier 3: ~$179 Agency" },
];

type CheckedState = Record<string, boolean>;

function loadChecklist(): CheckedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CheckedState;
  } catch {
    return {};
  }
}

function saveChecklist(state: CheckedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function AppSumoCampaignCard() {
  const { copiedKey, copyText } = useCopyFeedback();
  const [checked, setChecked] = useState<CheckedState>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChecked(loadChecklist());
  }, []);

  const toggleItem = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveChecklist(next);
      return next;
    });
  };

  const toggleSection = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getSectionProgress = (section: ChecklistSection) => {
    const done = section.items.filter((i) => checked[i.id]).length;
    return { done, total: section.items.length };
  };

  const totalDone = CHECKLIST_SECTIONS.reduce(
    (acc, s) => acc + s.items.filter((i) => checked[i.id]).length,
    0
  );
  const totalItems = CHECKLIST_SECTIONS.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-white/5 backdrop-blur-xl border border-orange-500/30 shadow-lg shadow-orange-500/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-orange-400" />
                AppSumo Campaign
              </CardTitle>
              <CardDescription className="text-white/60">
                Partner form answers, asset requirements, and launch checklists
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-orange-400">
                {totalDone}/{totalItems} complete
              </span>
              <a
                href={FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Open Form
                </Button>
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ── Partner Form Answers ── */}
          <div>
            <button
              onClick={() => toggleSection("form")}
              className="flex items-center justify-between w-full text-left group"
            >
              <h3 className="text-white font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-orange-400" />
                Partner Form Answers
                <span className="text-white/40 text-xs font-normal ml-1">
                  (copy &amp; paste into form)
                </span>
              </h3>
              {collapsed["form"] ? (
                <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              ) : (
                <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              )}
            </button>

            {!collapsed["form"] && (
              <div className="mt-3 space-y-2">
                {FORM_FIELDS.map((field) => (
                  <div
                    key={field.label}
                    className="rounded-lg bg-white/5 border border-white/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-orange-400 text-xs font-medium uppercase tracking-wide mb-1">
                          {field.label}
                        </div>
                        <div className="text-white/80 text-sm whitespace-pre-wrap break-words">
                          {field.value}
                        </div>
                      </div>
                      {field.copyable && (
                        <button
                          onClick={() => copyText(`as-${field.label}`, field.value)}
                          className={`shrink-0 p-2 rounded-md transition-all ${
                            copiedKey === `as-${field.label}`
                              ? "bg-green-500/20 text-green-400"
                              : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                          }`}
                          title="Copy to clipboard"
                        >
                          {copiedKey === `as-${field.label}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Checklists ── */}
          {CHECKLIST_SECTIONS.map((section) => {
            const { done, total } = getSectionProgress(section);
            const isCollapsed = collapsed[section.id];
            return (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-between w-full text-left group"
                >
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <span className="text-orange-400">{section.icon}</span>
                    {section.title}
                    <span
                      className={`text-xs font-mono ml-1 ${
                        done === total ? "text-green-400" : "text-white/40"
                      }`}
                    >
                      {done}/{total}
                    </span>
                  </h3>
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
                  )}
                </button>

                {!isCollapsed && (
                  <div className="mt-2 space-y-1">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`flex items-start gap-3 w-full text-left rounded-lg px-3 py-2 transition-all ${
                          checked[item.id]
                            ? "bg-orange-500/10 border border-orange-500/20"
                            : "bg-white/5 border border-transparent hover:bg-white/10"
                        }`}
                      >
                        <div
                          className={`mt-0.5 shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-all ${
                            checked[item.id]
                              ? "bg-orange-500 border-orange-500 text-white"
                              : "border-white/30"
                          }`}
                        >
                          {checked[item.id] && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <span
                            className={`text-sm ${
                              checked[item.id]
                                ? "text-white/50 line-through"
                                : "text-white/90"
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.detail && (
                            <span className="block text-xs text-white/40 mt-0.5">
                              {item.detail}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Key Info Reference ── */}
          <div>
            <button
              onClick={() => toggleSection("keyinfo")}
              className="flex items-center justify-between w-full text-left group"
            >
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-orange-400" />
                Key Info
              </h3>
              {collapsed["keyinfo"] ? (
                <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              ) : (
                <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              )}
            </button>

            {!collapsed["keyinfo"] && (
              <div className="mt-3 rounded-lg bg-orange-500/5 border border-orange-500/20 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {KEY_INFO.map((info) => (
                    <div key={info.label} className="flex gap-2 text-sm">
                      <span className="text-orange-400 font-medium shrink-0">
                        {info.label}:
                      </span>
                      <span className="text-white/70">{info.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-orange-500/10">
                  <a
                    href={FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    AppSumo Partner Form
                  </a>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
