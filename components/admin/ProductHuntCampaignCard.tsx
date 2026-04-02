"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Crosshair,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  ClipboardList,
  Rocket,
  FlagTriangleRight,
  MessageSquare,
  Image as ImageIcon,
  Pencil,
  Save,
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

const STORAGE_KEY = "jobfiltr-ph-checklist";
const FORM_STORAGE_KEY = "jobfiltr-ph-form-answers";
const COMMENT_STORAGE_KEY = "jobfiltr-ph-maker-comment";

const PH_URL = "https://www.producthunt.com/posts/new";

interface FormFieldDef {
  key: string;
  label: string;
  defaultValue: string;
  spec?: string;
  copyable: boolean;
  multiline: boolean;
}

const SUBMISSION_FIELD_DEFS: FormFieldDef[] = [
  { key: "productUrl", label: "Product URL", defaultValue: "https://jobfiltr.app", spec: "Direct link, no UTM or shortened URLs", copyable: true, multiline: false },
  { key: "productName", label: "Product Name", defaultValue: "JobFiltr", spec: "Name only — no marketing claims or emojis", copyable: true, multiline: false },
  { key: "tagline", label: "Tagline", defaultValue: "Stop wasting time on ghost jobs, scams, and spam listings", spec: "60 characters max (this is 57)", copyable: true, multiline: false },
  { key: "description", label: "Description", defaultValue: "JobFiltr is a Chrome extension that filters and analyzes job postings on LinkedIn and Indeed in real time. It uses AI to detect ghost jobs (50+ signals), flags scams and spam, hides staffing agencies, shows job age badges, and lets you filter by keywords, salary, and more. Zero tracking, zero data collection. Your job search, upgraded.", spec: "500 characters max (this is 333)", copyable: true, multiline: true },
  { key: "launchTags", label: "Launch Tags", defaultValue: "Chrome Extensions, Productivity, Job Search", spec: "Up to 3 category tags", copyable: true, multiline: false },
  { key: "pricing", label: "Pricing", defaultValue: "Free (or 'Paid with free plan' if pricing exists by launch)", copyable: false, multiline: false },
];

const DEFAULT_MAKER_COMMENT = `Hey Product Hunt! I'm [Name], the maker behind JobFiltr.

I built JobFiltr because I was spending hours every day scrolling through job listings that turned out to be ghost jobs, staffing agency reposts, or outright scams. I kept thinking — why isn't there a tool that filters this stuff out before I waste my time?

JobFiltr is a Chrome extension that works right inside LinkedIn and Indeed. It uses AI to analyze 50+ signals per listing to detect ghost jobs, flags suspicious postings, hides staffing agencies, shows you how old each listing is, and lets you filter by keywords. It also has community-reported warnings from other job seekers.

The thing I'm most proud of is the privacy-first approach — zero tracking, zero data selling. We analyze the job postings, not you.

I'd love to hear your feedback — what features would make your job search better? What's the most frustrating thing about job boards right now?`;

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
      { id: "asset-thumb", label: "Thumbnail/Logo", detail: "240x240px min (600x600 recommended for Retina). JPG/PNG/GIF, max 3MB." },
      { id: "asset-gallery", label: "Gallery Images (minimum 2)", detail: "1270x760px each. One idea per image — headline + single benefit per slide." },
      { id: "asset-video", label: "Video (optional but recommended)", detail: "YouTube full URL (not private). 45-60s: Hook (8s) -> Problem (10s) -> Demo (20s) -> CTA." },
      { id: "asset-comment", label: "Maker Comment prepared", detail: "3-5 paragraphs. Cover: origin story, problem, unique solution, ask for feedback." },
    ],
  },
  {
    id: "pre-launch",
    title: "Pre-Launch Checklist",
    icon: <ClipboardList className="h-4 w-4" />,
    items: [
      { id: "pre-account", label: "Personal Product Hunt account created (not company)" },
      { id: "pre-engage", label: "Started engaging: commenting, upvoting, participating in discussions" },
      { id: "pre-profile", label: "Profile completed: photo, bio, website, social links" },
      { id: "pre-supporters", label: "Supporter spreadsheet built: name, contact, channel, timezone" },
      { id: "pre-cws", label: "Chrome Web Store listing polished (descriptions, screenshots, icon)" },
      { id: "pre-metrics", label: "Success metrics defined (installs, signups, feedback)" },
      { id: "pre-beta", label: "Product thoroughly beta tested" },
      { id: "pre-content", label: "All submission content and assets prepared" },
      { id: "pre-comment", label: "Maker comment written in full" },
      { id: "pre-email", label: "Email templates prepared with multiple send windows" },
      { id: "pre-social", label: "Social media posts scheduled (Twitter/X, LinkedIn, Reddit)" },
      { id: "pre-reddit", label: "Presence established in relevant subreddits (r/SaaS, r/SideProject, r/jobsearchhacks)" },
      { id: "pre-schedule", label: "Product Hunt submission finalized and scheduled (draft mode)" },
      { id: "pre-test-links", label: "All links, thumbnail rendering, image quality tested" },
      { id: "pre-segment", label: "Email list segmented for staggered sends on launch day" },
      { id: "pre-confirm", label: "Supporter commitments confirmed" },
      { id: "pre-free", label: "Free tier or trial available for launch (reduces friction)" },
    ],
  },
  {
    id: "launch-day",
    title: "Launch Day",
    icon: <Rocket className="h-4 w-4" />,
    items: [
      { id: "ld-midnight", label: "12:00-12:05 AM PST", detail: "Verify page live, post maker comment, first Twitter/X announcement." },
      { id: "ld-early", label: "12:05 AM - 4:00 AM PST", detail: "Send first email blast (15-20% of list), respond to every PH comment, DM closest supporters." },
      { id: "ld-europe", label: "4:00-6:00 AM PST", detail: "Message European supporters (their morning)." },
      { id: "ld-linkedin", label: "6:00 AM PST", detail: "LinkedIn post targeting European audience." },
      { id: "ld-morning", label: "7:00-8:00 AM PST", detail: "Respond to overnight comments. Main email blast (American morning)." },
      { id: "ld-midmorning", label: "10:00 AM PST", detail: "Check ranking, share milestone if top 5." },
      { id: "ld-noon", label: "10:30 AM - 12:00 PM PST", detail: "Next supporter batch, post on Reddit (if established presence), behind-the-scenes thread." },
      { id: "ld-afternoon", label: "12:00-4:00 PM PST", detail: "Midday social update, share interesting metric or feedback quote." },
      { id: "ld-evening", label: "4:00-8:00 PM PST", detail: "Follow-up email to non-openers (plain-text), social reminder." },
      { id: "ld-night", label: "8:00-11:59 PM PST", detail: "Final transparent update about ranking. Screenshot final ranking at midnight." },
    ],
  },
  {
    id: "post-launch",
    title: "Post-Launch",
    icon: <FlagTriangleRight className="h-4 w-4" />,
    items: [
      { id: "post-comments", label: "Continue responding to all PH comments (first 2 weeks)" },
      { id: "post-milestones", label: "Share milestones with supporters and PH community" },
      { id: "post-nurture", label: "Deploy lead nurturing email campaign" },
      { id: "post-feedback", label: "Compile feedback by theme for product roadmap" },
      { id: "post-communicate", label: "Communicate back when features from feedback are shipped" },
      { id: "post-claim", label: "Claim your Product Page (permanent hub on PH)" },
      { id: "post-track", label: "Track conversions: PH visitors -> installs, by source" },
      { id: "post-churn", label: "Expect ~60% churn from launch spike (normal — plan for it)" },
      { id: "post-document", label: "Document what worked for future launches" },
    ],
  },
];

const KEY_INFO = [
  { label: "Launch time", value: "12:01 AM PST (full 24-hour window)" },
  { label: "Best days", value: "Tue/Wed/Thu (traffic) or Weekend/Mon (less competition)" },
  { label: "Critical window", value: "First 4 hours = ~60% of final ranking" },
  { label: "Self-hunting", value: "Recommended — 79% of featured posts were self-hunted" },
  { label: "Featured daily", value: "Only ~25 products" },
  { label: "Featuring criteria", value: "Usefulness, Novelty, High Craft, Creativity" },
];

const RULES = [
  "NEVER ask for upvotes — ask for feedback, thoughts, comments",
  "NEVER pay for hunters or votes — explicit guideline violation",
  "NEVER create fake accounts or coordinate artificial voting",
  "Stagger outreach throughout the day — don't frontload",
  "Email is your strongest channel — segment and stagger sends",
  "No shortened links or UTM tracking in product URL",
  "No emojis or marketing claims in product name",
  "Account must exist at least 1 week before posting (3 months engagement recommended)",
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

function loadMakerComment(): string | null {
  return localStorage.getItem(COMMENT_STORAGE_KEY);
}

function saveMakerComment(val: string) {
  localStorage.setItem(COMMENT_STORAGE_KEY, val);
}

export function ProductHuntCampaignCard() {
  const { copiedKey, copyText } = useCopyFeedback();
  const [checked, setChecked] = useState<CheckedState>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [formValues, setFormValues] = useState<FormValues>({});
  const [editingField, setEditingField] = useState<string | null>(null);

  // Maker comment state
  const [makerComment, setMakerComment] = useState(DEFAULT_MAKER_COMMENT);
  const [editingComment, setEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(DEFAULT_MAKER_COMMENT);

  useEffect(() => {
    setChecked(loadChecklist());
    setFormValues(loadFormValues());
    const saved = loadMakerComment();
    if (saved) setMakerComment(saved);
  }, []);

  const getFieldValue = (field: FormFieldDef) => formValues[field.key] ?? field.defaultValue;

  const handleFieldSave = (key: string, value: string) => {
    const updated = { ...formValues, [key]: value };
    setFormValues(updated);
    saveFormValues(updated);
    setEditingField(null);
  };

  const handleCommentSave = () => {
    setMakerComment(commentDraft);
    saveMakerComment(commentDraft);
    setEditingComment(false);
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
      <Card className="bg-white/5 backdrop-blur-xl border border-red-500/30 shadow-lg shadow-red-500/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Crosshair className="h-5 w-5 text-red-400" />
                Product Hunt Campaign
              </CardTitle>
              <CardDescription className="text-white/60">
                Submission content, launch day playbook, and progress tracking
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-red-400">
                {totalDone}/{totalItems} complete
              </span>
              <a href={PH_URL} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Product Hunt
                </Button>
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ── Submission Content (Editable) ── */}
          <div>
            <button
              onClick={() => toggleSection("submission")}
              className="flex items-center justify-between w-full text-left group"
            >
              <h3 className="text-white font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-red-400" />
                Submission Content
                <span className="text-white/40 text-xs font-normal ml-1">
                  (editable — click pencil to edit)
                </span>
              </h3>
              {collapsed["submission"] ? (
                <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              ) : (
                <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              )}
            </button>

            {!collapsed["submission"] && (
              <div className="mt-3 space-y-2">
                {SUBMISSION_FIELD_DEFS.map((field) => {
                  const value = getFieldValue(field);
                  const isEditing = editingField === field.key;
                  return (
                    <EditableField
                      key={field.key}
                      field={field}
                      value={value}
                      isEditing={isEditing}
                      copiedKey={copiedKey}
                      accentColor="red"
                      onEdit={() => setEditingField(field.key)}
                      onSave={(v) => handleFieldSave(field.key, v)}
                      onCancel={() => setEditingField(null)}
                      onCopy={() => copyText(`ph-${field.label}`, value)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Maker Comment (Editable) ── */}
          <div>
            <button
              onClick={() => toggleSection("maker-comment")}
              className="flex items-center justify-between w-full text-left group"
            >
              <h3 className="text-white font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-red-400" />
                Maker Comment
                <span className="text-white/40 text-xs font-normal ml-1">
                  (first comment on your PH page)
                </span>
              </h3>
              {collapsed["maker-comment"] ? (
                <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              ) : (
                <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              )}
            </button>

            {!collapsed["maker-comment"] && (
              <div className="mt-3 relative">
                {editingComment ? (
                  <div className="space-y-2">
                    <textarea
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      rows={12}
                      className="w-full rounded-lg bg-white/10 border-2 border-red-500/50 px-4 py-3 text-white text-sm font-mono resize-y focus:border-red-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCommentSave}
                        className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-xs"
                      >
                        <Save className="mr-1 h-3 w-3" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingComment(false); setCommentDraft(makerComment); }}
                        className="text-white/50 hover:text-white text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <pre className="text-white/80 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {makerComment}
                    </pre>
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      <button
                        onClick={() => { setCommentDraft(makerComment); setEditingComment(true); }}
                        className="p-2 rounded-md bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition-all"
                        title="Edit maker comment"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => copyText("ph-maker-comment", makerComment)}
                        className={`p-2 rounded-md transition-all ${
                          copiedKey === "ph-maker-comment"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
                        }`}
                        title="Copy maker comment"
                      >
                        {copiedKey === "ph-maker-comment" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
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
                    <span className="text-red-400">{section.icon}</span>
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
                            ? "bg-red-500/10 border border-red-500/20"
                            : "bg-white/5 border border-transparent hover:bg-white/10"
                        }`}
                      >
                        <div className={`mt-0.5 shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-all ${
                          checked[item.id] ? "bg-red-500 border-red-500 text-white" : "border-white/30"
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

          {/* ── Rules ── */}
          <div>
            <button onClick={() => toggleSection("rules")} className="flex items-center justify-between w-full text-left group">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="text-red-400 text-lg leading-none">!</span>
                Important Rules
              </h3>
              {collapsed["rules"] ? (
                <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              ) : (
                <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              )}
            </button>
            {!collapsed["rules"] && (
              <div className="mt-3 rounded-lg bg-red-500/5 border border-red-500/20 p-4 space-y-1.5">
                {RULES.map((rule) => (
                  <div key={rule} className="flex items-start gap-2 text-sm">
                    <span className="text-red-400 shrink-0 mt-0.5">{rule.startsWith("NEVER") ? "\u2718" : "\u2022"}</span>
                    <span className={rule.startsWith("NEVER") ? "text-red-300" : "text-white/70"}>{rule}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Key Info ── */}
          <div>
            <button onClick={() => toggleSection("keyinfo")} className="flex items-center justify-between w-full text-left group">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-red-400" />
                Key Info
              </h3>
              {collapsed["keyinfo"] ? (
                <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              ) : (
                <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              )}
            </button>
            {!collapsed["keyinfo"] && (
              <div className="mt-3 rounded-lg bg-red-500/5 border border-red-500/20 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {KEY_INFO.map((info) => (
                    <div key={info.label} className="flex gap-2 text-sm">
                      <span className="text-red-400 font-medium shrink-0">{info.label}:</span>
                      <span className="text-white/70">{info.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Reusable Editable Field ───

function EditableField({
  field,
  value,
  isEditing,
  copiedKey,
  accentColor,
  onEdit,
  onSave,
  onCancel,
  onCopy,
}: {
  field: FormFieldDef;
  value: string;
  isEditing: boolean;
  copiedKey: string | null;
  accentColor: string;
  onEdit: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  onCopy: () => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (isEditing) setDraft(value);
  }, [isEditing, value]);

  const borderColor = accentColor === "red" ? "border-red-500/50 focus:border-red-500" : "border-orange-500/50 focus:border-orange-500";
  const gradientClass = accentColor === "red"
    ? "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
    : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600";
  const labelColor = accentColor === "red" ? "text-red-400" : "text-orange-400";

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`${labelColor} text-xs font-medium uppercase tracking-wide`}>
              {field.label}
            </span>
            {field.spec && <span className="text-white/30 text-xs">{field.spec}</span>}
          </div>
          {isEditing ? (
            <div className="mt-1 space-y-2">
              {field.multiline ? (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  className={`w-full rounded-md bg-white/10 border-2 ${borderColor} px-3 py-2 text-white text-sm font-mono resize-y focus:outline-none`}
                />
              ) : (
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className={`w-full rounded-md bg-white/10 border-2 ${borderColor} px-3 py-2 text-white text-sm font-mono focus:outline-none`}
                />
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onSave(draft)} className={`${gradientClass} text-white text-xs`}>
                  <Save className="mr-1 h-3 w-3" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel} className="text-white/50 hover:text-white text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-white/80 text-sm mt-1 whitespace-pre-wrap break-words">{value}</div>
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
                  copiedKey === `ph-${field.label}`
                    ? "bg-green-500/20 text-green-400"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
                title="Copy to clipboard"
              >
                {copiedKey === `ph-${field.label}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
