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
  Pencil,
  Save,
  DollarSign,
  Sparkles,
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
const FORM_STORAGE_KEY = "jobfiltr-appsumo-form-answers";

const FORM_URL =
  "https://share.hsforms.com/2iUvbadKTQ4GR29FDPAjFWgcbi47";

interface FormFieldDef {
  key: string;
  label: string;
  defaultValue: string;
  copyable: boolean;
  multiline: boolean;
}

const FORM_FIELD_DEFS: FormFieldDef[] = [
  { key: "productName", label: "Product Name", defaultValue: "JobFiltr", copyable: true, multiline: false },
  { key: "websiteUrl", label: "Website / Product URL", defaultValue: "https://jobfiltr.app", copyable: true, multiline: false },
  { key: "paidCustomers", label: "Number of Active Paid Customers", defaultValue: "0  (dropdown options: 0, 1-25, 25-75, 75-150, 150-500, 500+)", copyable: false, multiline: false },
  { key: "selfServe", label: "Self-serve within 30 days?", defaultValue: "Yes. We already have a public Chrome Web Store listing with a self-serve install flow. We are preparing tiered pricing for the AppSumo launch with a dedicated redemption page for license key activation.", copyable: true, multiline: true },
  { key: "lookingFor", label: "What are you looking for from an AppSumo campaign?", defaultValue: "We're looking for three things: (1) Rapid user acquisition — we want to get JobFiltr into the hands of thousands of active job seekers who will use it daily and provide feedback. (2) Market validation and social proof — reviews and testimonials from real users to build credibility. (3) Revenue to fund development — we're bootstrapped and the upfront revenue will let us ship our roadmap faster, including AI-powered resume tailoring, application tracking, and salary benchmarking.", copyable: true, multiline: true },
  { key: "whyChoose", label: "Why do customers choose your product over similar tools?", defaultValue: "JobFiltr is the only browser extension that combines ghost job detection, scam/spam filtering, staffing agency removal, job age badges, and keyword-based filtering — all in real-time as you browse LinkedIn and Indeed. Competitors either focus on a single feature (like job age) or require you to leave the job board entirely. JobFiltr works invisibly inside the platforms job seekers already use, with zero tracking and zero data collection. Our ghost detection analyzes 50+ signals per listing with AI, something no other tool offers at this level. Users tell us it saves them 5-10 hours per week by eliminating low-quality listings before they waste time reading them.", copyable: true, multiline: true },
  { key: "coreFeatures", label: "Core features / roadmap link", defaultValue: "Core: Ghost job AI detection (50+ signals), job age badges, staffing agency filter, scam/spam detection, keyword include/exclude filters, hide sponsored posts, remote job verification, company blocklist, salary range filter (Indeed), auto-hide applied jobs (Indeed), community-reported companies. Roadmap: https://jobfiltr.app/roadmap", copyable: true, multiline: true },
  { key: "questions", label: "Questions for AppSumo?", defaultValue: "We'd love to understand: (1) What's the typical timeline from application approval to going live? (2) Can we run a Product Hunt launch concurrently or should we stagger them? (3) Are there best practices for Chrome extension redemption flows specifically?", copyable: true, multiline: true },
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
      { id: "asset-hero", label: "Hero/Header Image", detail: "1920x1080px, JPG/PNG, max 5MB. Logo centered, no text overlays. Use AppSumo Figma template." },
      { id: "asset-screenshots", label: "Product Screenshots (up to 5)", detail: "1920x1080px each, JPG/PNG. Real screenshots only — no mockups, overlays, or watermarks." },
      { id: "asset-video", label: "Demo Video", detail: "60-90 seconds. Open with problem (5s), show real usage, end with CTA." },
      { id: "asset-redemption", label: "Redemption Landing Page", detail: "Fields: name, email, password, AppSumo code. NO credit card or phone number. Must include AppSumo + JobFiltr branding." },
      { id: "asset-codes", label: "Redemption Codes (500-10,000)", detail: "Unique one-time-use codes for license activation." },
      { id: "asset-test-account", label: "Test Account for QA Team", detail: "Full-access account with representative data and usage instructions." },
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

const PRICING_TIERS = [
  {
    tier: 1,
    codes: 1,
    price: "$39",
    title: "Lifetime Pro",
    desc: "Lifetime Pro for 1 user",
    features: ["All Pro features forever", "Ghost job detection (50+ signals)", "All current & future filters", "Priority support"],
  },
  {
    tier: 2,
    codes: 2,
    price: "$69",
    title: "Pro + Gift",
    desc: "Lifetime Pro + 1 gift license",
    features: ["Everything in Tier 1", "1 extra license to gift to a friend", "Both licenses are lifetime", "Great for couples or referrals"],
  },
  {
    tier: 3,
    codes: 3,
    price: "$99",
    title: "Pro + Gifts + Future",
    desc: "Lifetime Pro + 2 gift licenses + all future features forever",
    features: ["Everything in Tier 2", "2 extra gift licenses (3 total users)", "All future features guaranteed", "Highest value per dollar"],
    recommended: true,
  },
];

const PRICING_RATIONALE = [
  { title: "Below $89 threshold", detail: "AppSumo rejects base tiers above ~$89. Our $39 base is in the sweet spot and $99 top tier stays well under typical rejection thresholds." },
  { title: "Code stacking drives AOV", detail: "Tier 2 ($69 for 2 codes) and Tier 3 ($99 for 3 codes) encourage buying multiple codes. Gift licenses make stacking compelling — customers share value rather than hoarding." },
  { title: "Near-zero marginal cost", detail: "Chrome extensions have no per-user server costs. Every additional license is pure margin, making gift licenses virtually free to offer." },
  { title: "Price anchoring", detail: "At even $5/mo, annual cost would be $60/year. A $39 lifetime deal anchors against years of subscription value. The $99 tier for 3 lifetime licenses is a no-brainer compared to 3 annual subscriptions." },
  { title: "Future features lock-in", detail: "Tier 3's 'all future features forever' creates urgency and FOMO. It's the only tier with this guarantee, pushing upgrades." },
];

const KEY_INFO = [
  { label: "Revenue split", value: "~30% to you, ~70% to AppSumo (negotiable)" },
  { label: "Payment lag", value: "60 days after end of month" },
  { label: "Acceptance rate", value: "~10% of applicants" },
  { label: "Campaign duration", value: "60 days once live" },
  { label: "Plus-exclusive window", value: "7 days before general launch" },
];

type CheckedState = Record<string, boolean>;
type FormValues = Record<string, string>;

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

function loadFormValues(): FormValues {
  try {
    const raw = localStorage.getItem(FORM_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as FormValues;
  } catch {
    return {};
  }
}

function saveFormValues(values: FormValues) {
  localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(values));
}

export function AppSumoCampaignCard() {
  const { copiedKey, copyText } = useCopyFeedback();
  const [checked, setChecked] = useState<CheckedState>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [formValues, setFormValues] = useState<FormValues>({});
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() => {
    setChecked(loadChecklist());
    setFormValues(loadFormValues());
  }, []);

  const getFieldValue = (field: FormFieldDef) => formValues[field.key] ?? field.defaultValue;

  const handleFieldSave = (key: string, value: string) => {
    const updated = { ...formValues, [key]: value };
    setFormValues(updated);
    saveFormValues(updated);
    setEditingField(null);
  };

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
                Partner form answers, pricing tiers, asset requirements, and launch checklists
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-orange-400">
                {totalDone}/{totalItems} complete
              </span>
              <a href={FORM_URL} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Open Form
                </Button>
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ── Partner Form Answers (Editable) ── */}
          <div>
            <button
              onClick={() => toggleSection("form")}
              className="flex items-center justify-between w-full text-left group"
            >
              <h3 className="text-white font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-orange-400" />
                Partner Form Answers
                <span className="text-white/40 text-xs font-normal ml-1">
                  (editable — click pencil to edit, copy &amp; paste into form)
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
                {FORM_FIELD_DEFS.map((field) => {
                  const value = getFieldValue(field);
                  const isEditing = editingField === field.key;
                  return (
                    <EditableFormField
                      key={field.key}
                      field={field}
                      value={value}
                      isEditing={isEditing}
                      copiedKey={copiedKey}
                      onEdit={() => setEditingField(field.key)}
                      onSave={(v) => handleFieldSave(field.key, v)}
                      onCancel={() => setEditingField(null)}
                      onCopy={() => copyText(`as-${field.label}`, value)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Pricing Tiers ── */}
          <div>
            <button
              onClick={() => toggleSection("pricing")}
              className="flex items-center justify-between w-full text-left group"
            >
              <h3 className="text-white font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-orange-400" />
                Campaign Pricing Tiers
              </h3>
              {collapsed["pricing"] ? (
                <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              ) : (
                <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              )}
            </button>

            {!collapsed["pricing"] && (
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {PRICING_TIERS.map((tier) => (
                    <div
                      key={tier.tier}
                      className={`rounded-xl p-4 border transition-all relative ${
                        tier.recommended
                          ? "bg-gradient-to-b from-orange-500/15 to-amber-500/10 border-orange-500/40 shadow-lg shadow-orange-500/10"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      {tier.recommended && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-xs font-semibold text-white flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Best Value
                        </div>
                      )}
                      <div className="text-center mb-3">
                        <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                          Tier {tier.tier} — {tier.codes} {tier.codes === 1 ? "code" : "codes"}
                        </div>
                        <div className="text-3xl font-bold text-white">{tier.price}</div>
                        <div className="text-orange-400 text-sm font-medium mt-1">{tier.title}</div>
                      </div>
                      <ul className="space-y-1.5">
                        {tier.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                            <Check className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Why These Prices Work */}
                <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-4">
                  <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-orange-400" />
                    Why These Deal Tiers Work
                  </h4>
                  <div className="space-y-2">
                    {PRICING_RATIONALE.map((r) => (
                      <div key={r.title} className="text-sm">
                        <span className="text-orange-400 font-medium">{r.title}:</span>{" "}
                        <span className="text-white/60">{r.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                    <span className={`text-xs font-mono ml-1 ${done === total ? "text-green-400" : "text-white/40"}`}>
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
                        <div className={`mt-0.5 shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-all ${
                          checked[item.id] ? "bg-orange-500 border-orange-500 text-white" : "border-white/30"
                        }`}>
                          {checked[item.id] && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <span className={`text-sm ${checked[item.id] ? "text-white/50 line-through" : "text-white/90"}`}>
                            {item.label}
                          </span>
                          {item.detail && <span className="block text-xs text-white/40 mt-0.5">{item.detail}</span>}
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
            <button onClick={() => toggleSection("keyinfo")} className="flex items-center justify-between w-full text-left group">
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
                      <span className="text-orange-400 font-medium shrink-0">{info.label}:</span>
                      <span className="text-white/70">{info.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-orange-500/10">
                  <a href={FORM_URL} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1 transition-colors">
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

// ─── Editable Form Field Component ───

function EditableFormField({
  field,
  value,
  isEditing,
  copiedKey,
  onEdit,
  onSave,
  onCancel,
  onCopy,
}: {
  field: FormFieldDef;
  value: string;
  isEditing: boolean;
  copiedKey: string | null;
  onEdit: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  onCopy: () => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (isEditing) setDraft(value);
  }, [isEditing, value]);

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-orange-400 text-xs font-medium uppercase tracking-wide mb-1">
            {field.label}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              {field.multiline ? (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  className="w-full rounded-md bg-white/10 border-2 border-orange-500/50 px-3 py-2 text-white text-sm font-mono resize-y focus:border-orange-500 focus:outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full rounded-md bg-white/10 border-2 border-orange-500/50 px-3 py-2 text-white text-sm font-mono focus:border-orange-500 focus:outline-none"
                />
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onSave(draft)}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs"
                >
                  <Save className="mr-1 h-3 w-3" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancel}
                  className="text-white/50 hover:text-white text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-white/80 text-sm whitespace-pre-wrap break-words">
              {value}
            </div>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="p-2 rounded-md bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {field.copyable && (
              <button
                onClick={onCopy}
                className={`p-2 rounded-md transition-all ${
                  copiedKey === `as-${field.label}`
                    ? "bg-green-500/20 text-green-400"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
                title="Copy to clipboard"
              >
                {copiedKey === `as-${field.label}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
