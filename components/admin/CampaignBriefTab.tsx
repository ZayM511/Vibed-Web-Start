"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  Shield,
  MessageSquareWarning,
  HelpCircle,
  GraduationCap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Globe,
  Scale,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Knowledge Base Content ───

interface KBSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  entries: { q: string; a: string }[];
}

const KB_SECTIONS: KBSection[] = [
  {
    id: "tech-stack",
    title: "Tech Stack & Architecture",
    icon: <Cpu className="h-4 w-4" />,
    color: "cyan",
    entries: [
      {
        q: "What is JobFiltr built with?",
        a: "JobFiltr is a Chrome extension built on Manifest V3 (the latest Chrome extension platform). The frontend website and admin dashboard use Next.js 15 with App Router, Tailwind CSS 4, and shadcn/ui components. The backend uses Convex for real-time database and Clerk for authentication. The extension itself runs entirely client-side with zero server dependency for core filtering.",
      },
      {
        q: "How does the ghost job detection work technically?",
        a: "Ghost detection analyzes 50+ signals per listing using a weighted scoring algorithm. Signals include: posting age vs. repost frequency, company hiring patterns, job description quality metrics (vagueness score, buzzword density, requirements mismatch), salary transparency, application method analysis, and company reputation data. Each signal contributes to a composite ghost probability score. The analysis runs in the content script via the ghost-detection-bundle.js (~2900 lines) which executes when the detail panel loads.",
      },
      {
        q: "How do content scripts work on job boards?",
        a: "Content scripts (content-linkedin-v3.js and content-indeed-v3.js) are injected into LinkedIn and Indeed pages. They use MutationObserver to detect DOM changes and process new job cards as they appear. On LinkedIn, cards are in a virtualized list so we handle scroll-based lazy loading. On Indeed, the DOM is more stable. Scripts add badges, apply filters, and modify visibility of cards — all without any network requests to our servers.",
      },
      {
        q: "What about the community reports system?",
        a: "Community-reported companies are maintained as a curated list (~137 companies) embedded directly in both the content script and ghost detection bundle. The list is synced between both files. When a job card's company name matches a reported company, it gets an orange highlight border and a 'Community Reported' badge. No user data is sent anywhere — the list ships with the extension.",
      },
      {
        q: "How are job age badges calculated?",
        a: "Job age badges extract the posting timestamp from the job board's own metadata. On LinkedIn, this comes from spans containing relative time text (e.g., '3 days ago', '2 weeks ago'). On Indeed, it's extracted from the date metadata in the listing. The badge displays a color-coded age: green for fresh (<3 days), yellow for aging (3-14 days), orange for stale (14-30 days), red for old (30+ days).",
      },
      {
        q: "How does keyword filtering work?",
        a: "Keyword filters use regex-based matching against the full text content of job cards. Include filters show only jobs containing at least one of the specified keywords. Exclude filters hide jobs containing any of the specified keywords. The matching is case-insensitive. To prevent false matches, we clone the DOM node, strip all injected JobFiltr elements (badges, etc.), then read the clean textContent for matching.",
      },
      {
        q: "What's the extension popup architecture?",
        a: "The popup (popup.html/popup.js) communicates with content scripts via Chrome's messaging API (chrome.runtime.sendMessage / chrome.tabs.sendMessage). Filter settings are stored in chrome.storage.sync so they persist across sessions and sync across devices. When the user changes a filter in the popup, a message is sent to the active tab's content script which immediately re-applies all filters.",
      },
    ],
  },
  {
    id: "platform-comparison",
    title: "LinkedIn vs. Indeed: Platform Differences",
    icon: <Globe className="h-4 w-4" />,
    color: "blue",
    entries: [
      {
        q: "What features are available on each platform?",
        a: "Both platforms: Ghost detection, job age badges, keyword include/exclude, hide staffing agencies, scam/spam detection, community reports, hide sponsored/promoted. Indeed-only: Salary range filter, auto-hide applied jobs, more stable DOM for reliable filtering. LinkedIn: Full support including the new AI search UI, but LinkedIn's aggressive DOM changes require more complex detection logic.",
      },
      {
        q: "Why are some features Indeed-only?",
        a: "Indeed exposes more structured data in its DOM — salary ranges are consistently formatted and filterable, and applied-job state is clearly marked. LinkedIn doesn't expose salary data reliably in the card DOM, and applied-job tracking on LinkedIn is handled differently by their UI. We only ship features where we can guarantee reliable behavior.",
      },
      {
        q: "What are the LinkedIn technical challenges?",
        a: "LinkedIn uses virtualized rendering (LazyColumn), so job cards are recycled as you scroll — we must detect stale/recycled cards by storing the processed job ID and re-processing if it changes. LinkedIn's new AI search UI (/jobs/search-results/) drops all traditional BEM class selectors, requiring content-based fallback detection. LinkedIn also aggressively changes their DOM structure, requiring frequent extension updates. Their CSP blocks inline onclick handlers, so we use addEventListener exclusively.",
      },
      {
        q: "What are Indeed's technical considerations?",
        a: "Indeed uses Cloudflare protection which can detect automation. The DOM structure is more stable and predictable than LinkedIn, making filtering more reliable. Indeed has more consistent job card structure with clearly identifiable elements for company name, location, salary, and metadata.",
      },
    ],
  },
  {
    id: "privacy-compliance",
    title: "Privacy & Compliance",
    icon: <Shield className="h-4 w-4" />,
    color: "green",
    entries: [
      {
        q: "What data does JobFiltr collect?",
        a: "Zero. JobFiltr collects absolutely no user data. No browsing history, no search queries, no personal information, no analytics, no telemetry. Everything runs locally in the browser. The extension doesn't make any network requests to our servers. The only storage used is chrome.storage.sync for saving your filter preferences, which stays within Chrome's own sync system.",
      },
      {
        q: "How does JobFiltr comply with Chrome Web Store policies?",
        a: "We comply with all Manifest V3 requirements including: limited host permissions (only linkedin.com and indeed.com), no remote code execution, no eval(), declarative content scripts, and a clear privacy policy. We request only the minimum permissions needed: activeTab, storage, and host permissions for the two job board domains.",
      },
      {
        q: "Is there a privacy policy?",
        a: "Yes. Our privacy policy clearly states: no data collection, no tracking, no cookies, no analytics, no third-party data sharing. The extension analyzes job posting content locally — it reads the public job listing data that's already displayed on your screen, processes it in your browser, and never sends anything anywhere.",
      },
      {
        q: "What about GDPR/CCPA compliance?",
        a: "Since we collect zero personal data, GDPR and CCPA requirements are minimal. We don't have data to delete, share, or port. Our privacy policy is transparent about this. For the website (JobFiltr.app), we use Clerk for authentication which handles its own GDPR compliance, and Convex for the database which stores only what users explicitly provide (email for waitlist, etc.).",
      },
    ],
  },
  {
    id: "appsumo-qa",
    title: "AppSumo Partner Q&A",
    icon: <Scale className="h-4 w-4" />,
    color: "orange",
    entries: [
      {
        q: "How does the lifetime deal work for a Chrome extension?",
        a: "Customers purchase a lifetime license code on AppSumo. They redeem it at jobfiltr.app/redeem by entering their code, email, and creating an account. This grants them permanent access to JobFiltr Pro features. The license is tied to their account, not their device, so they can use it on any Chrome browser where they're logged in. Codes are stackable — multiple codes unlock higher tiers.",
      },
      {
        q: "What happens if Chrome deprecates Manifest V3 or changes APIs?",
        a: "We stay current with Chrome's extension platform. Manifest V3 is the latest standard and Google has committed to long-term support. If APIs change, we update the extension — lifetime customers always get the latest version through Chrome Web Store auto-updates. Our extension architecture is modular, so platform changes typically require updating specific content scripts rather than a full rewrite.",
      },
      {
        q: "How do you handle refunds and the 60-day guarantee?",
        a: "AppSumo handles all refund processing within their 60-day guarantee window. If a customer refunds, their license code is automatically revoked. We track code status (available/redeemed/revoked) in our system. After the 60-day window, licenses are permanent.",
      },
      {
        q: "What's the code stacking model?",
        a: "Tier 1 (1 code, $39): Lifetime Pro for 1 user. Tier 2 (2 codes, $69): Lifetime Pro + 1 gift license. Tier 3 (3 codes, $99): Lifetime Pro + 2 gift licenses + all future features forever. This encourages customers to buy multiple codes, increasing AOV while giving them shareable value.",
      },
      {
        q: "What's your support plan for AppSumo customers?",
        a: "We provide email support with a target response time of under 24 hours (under 4 hours during the first week of campaign). We have a comprehensive knowledge base, FAQ, and getting-started guide. Support is handled through a dedicated support email. We also actively monitor and respond to AppSumo product page Q&A.",
      },
      {
        q: "What's on the product roadmap?",
        a: "Near-term: AI-powered resume tailoring to match specific job descriptions, application tracking dashboard, salary benchmarking and negotiation insights. Mid-term: Support for additional job boards (Glassdoor, ZipRecruiter), Firefox extension, advanced analytics on job search patterns. Long-term: Job market intelligence, company culture scoring, interview preparation tools.",
      },
      {
        q: "How sustainable is a lifetime deal for a Chrome extension?",
        a: "Chrome extensions have near-zero marginal cost per user — there are no server costs for core functionality since everything runs client-side. The only ongoing costs are Chrome Web Store developer fee ($5 one-time), our website hosting, and development time. This makes lifetime deals highly sustainable compared to SaaS products that have per-user infrastructure costs.",
      },
    ],
  },
  {
    id: "user-faq",
    title: "User FAQ (Common Questions)",
    icon: <HelpCircle className="h-4 w-4" />,
    color: "purple",
    entries: [
      {
        q: "Does JobFiltr work with LinkedIn Premium / Sales Navigator?",
        a: "JobFiltr works with standard LinkedIn job search and the new AI-powered search UI. Sales Navigator uses a different interface that we don't currently support. LinkedIn Premium job search features work normally with JobFiltr.",
      },
      {
        q: "Will this slow down my browser?",
        a: "No. JobFiltr runs lightweight content scripts that only activate on LinkedIn and Indeed job pages. It doesn't run in the background, doesn't make network requests, and uses minimal memory. The ghost detection analysis happens asynchronously so it never blocks the page from loading.",
      },
      {
        q: "Can I use JobFiltr on multiple computers?",
        a: "Yes. Your filter settings sync automatically through Chrome's built-in sync. Install the extension on any Chrome browser where you're signed into your Google account, and your settings carry over. Your Pro license is tied to your JobFiltr account, not a specific device.",
      },
      {
        q: "How accurate is ghost job detection?",
        a: "Ghost detection analyzes 50+ signals and provides a probability score, not a binary yes/no. High-confidence detections (80%+ ghost probability) are very reliable. We show the analysis breakdown so you can make your own judgment. The system errs on the side of flagging rather than missing — it's better to review a flagged legitimate job than to miss a ghost job.",
      },
      {
        q: "What if a job is incorrectly flagged?",
        a: "Our ghost detection shows the full analysis breakdown so you can see exactly why a job was flagged. If you disagree, you can still apply — flagging doesn't block access to any job. The community reports feature lets users flag problematic companies, and these reports are curated before being included in future updates.",
      },
      {
        q: "Does JobFiltr work with other Chrome extensions?",
        a: "Yes. JobFiltr is designed to be compatible with other extensions. It injects its own namespaced elements (prefixed with 'jobfiltr-') to avoid conflicts. Ad blockers, dark mode extensions, and other job search tools should work fine alongside JobFiltr.",
      },
      {
        q: "How often is JobFiltr updated?",
        a: "We push updates regularly through the Chrome Web Store. Updates include new features, bug fixes, and adjustments for LinkedIn/Indeed DOM changes. Updates are automatic — Chrome handles the update process. Major feature releases typically happen monthly, with bug fixes shipped as needed.",
      },
      {
        q: "What if LinkedIn or Indeed changes their website?",
        a: "We actively monitor both platforms for DOM changes and push updates quickly. Our content scripts use multiple fallback detection strategies — if one selector breaks, fallback methods keep the extension working until we update. LinkedIn changes more frequently than Indeed, but we typically ship fixes within 24-48 hours of a breaking change.",
      },
    ],
  },
  {
    id: "objection-handling",
    title: "Objection Handling",
    icon: <MessageSquareWarning className="h-4 w-4" />,
    color: "rose",
    entries: [
      {
        q: "\"Why should I pay when I can just scroll past bad jobs?\"",
        a: "The average job seeker spends 11 hours per week on job boards. Studies show 40-50% of listings are ghost jobs or low-quality spam. JobFiltr saves 5-10 hours per week by automatically filtering out the noise. That's hundreds of hours over a job search that typically lasts 3-6 months. The lifetime deal pays for itself in the first day of use.",
      },
      {
        q: "\"What if LinkedIn/Indeed blocks this extension?\"",
        a: "JobFiltr doesn't violate any platform terms of service. We don't scrape data, don't automate actions, don't send fake requests, and don't access private APIs. We're a read-only tool that helps users process information that's already displayed on their screen. We're listed on the Chrome Web Store which requires compliance review. LinkedIn Verified extensions exist in this same category.",
      },
      {
        q: "\"How is this different from just using LinkedIn's built-in filters?\"",
        a: "LinkedIn's filters only cover basic criteria like location and experience level. They can't detect ghost jobs, flag scam postings, identify staffing agencies, show you how old a listing really is, or warn you about problematic companies. JobFiltr adds an entirely new layer of intelligence that job boards don't provide because it's not in their interest to show you which listings are low-quality.",
      },
      {
        q: "\"What if I stop job searching — is the lifetime deal wasted?\"",
        a: "Lifetime means lifetime. Whether you job search again in 6 months, 2 years, or 5 years, your Pro access is always there. The average person changes jobs every 2-4 years, and each time you'll have JobFiltr ready to go. Plus with the gift license tiers, you can share with friends and family who are job searching now.",
      },
      {
        q: "\"I don't trust Chrome extensions with my data.\"",
        a: "You shouldn't trust most of them — that's a healthy instinct. JobFiltr is different: we collect zero data. None. No analytics, no tracking, no personal information. Everything runs locally in your browser. You can verify this yourself by checking our network requests (there are none to our servers) or reading our source code. Our permissions are minimal: we only access LinkedIn and Indeed pages.",
      },
    ],
  },
];

// ─── Quiz System ───

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
}

const QUESTION_POOL: QuizQuestion[] = [
  // Tech Stack
  { id: "t1", question: "What Chrome extension manifest version does JobFiltr use?", options: ["Manifest V2", "Manifest V3", "Manifest V4", "No manifest required"], correctIndex: 1, explanation: "JobFiltr uses Manifest V3, the latest Chrome extension platform standard.", category: "Tech Stack" },
  { id: "t2", question: "How many signals does the ghost job detection analyze per listing?", options: ["10+", "25+", "50+", "100+"], correctIndex: 2, explanation: "Ghost detection analyzes 50+ signals including posting age, company patterns, description quality, and more.", category: "Tech Stack" },
  { id: "t3", question: "Where does JobFiltr's core filtering logic run?", options: ["On our cloud servers", "Client-side in the browser", "Through a proxy service", "On LinkedIn/Indeed's servers"], correctIndex: 1, explanation: "Everything runs locally in the browser via content scripts — zero server dependency for core features.", category: "Tech Stack" },
  { id: "t4", question: "What frontend framework does the JobFiltr website use?", options: ["React with Create React App", "Next.js 15 with App Router", "Vue.js 3", "SvelteKit"], correctIndex: 1, explanation: "The website uses Next.js 15 with App Router, Tailwind CSS 4, and shadcn/ui components.", category: "Tech Stack" },
  { id: "t5", question: "How do content scripts detect new job cards appearing on the page?", options: ["Polling every second", "MutationObserver", "Page refresh detection", "WebSocket connection"], correctIndex: 1, explanation: "Content scripts use MutationObserver to efficiently detect DOM changes and process new job cards as they appear.", category: "Tech Stack" },
  { id: "t6", question: "How are filter settings stored and synced across devices?", options: ["Our cloud database", "chrome.storage.sync", "localStorage", "Cookies"], correctIndex: 1, explanation: "Filter settings use chrome.storage.sync which persists across sessions and syncs via Chrome's built-in sync system.", category: "Tech Stack" },
  // Platform
  { id: "p1", question: "Which feature is available on Indeed but NOT on LinkedIn?", options: ["Ghost detection", "Job age badges", "Salary range filter", "Keyword filters"], correctIndex: 2, explanation: "Salary range filter and auto-hide applied jobs are Indeed-only features because Indeed exposes this data reliably in its DOM.", category: "Platform" },
  { id: "p2", question: "Why does LinkedIn require more complex detection logic?", options: ["It has more jobs", "It uses virtualized rendering and frequently changes DOM", "It requires a login", "It blocks all extensions"], correctIndex: 1, explanation: "LinkedIn uses virtualized rendering (LazyColumn) that recycles DOM elements, and aggressively changes their DOM structure, requiring fallback detection strategies.", category: "Platform" },
  { id: "p3", question: "How many companies are in the community-reported list?", options: ["~50", "~100", "~137", "~500"], correctIndex: 2, explanation: "The community-reported companies list contains approximately 137 companies, synced between content script and ghost detection bundle.", category: "Platform" },
  { id: "p4", question: "What does JobFiltr use to prevent badge text from contaminating keyword matching?", options: ["Separate DOM tree", "Clone node and strip JobFiltr elements", "Shadow DOM", "iframes"], correctIndex: 1, explanation: "We clone the DOM node, remove all [class*='jobfiltr'] elements, then read the clean textContent to prevent our own badge text from triggering keyword filters.", category: "Platform" },
  // Privacy
  { id: "s1", question: "How much user data does JobFiltr collect?", options: ["Basic analytics only", "Anonymous usage stats", "Zero — no data at all", "Email and search queries"], correctIndex: 2, explanation: "JobFiltr collects absolutely zero user data. No analytics, no tracking, no telemetry, no personal information.", category: "Privacy" },
  { id: "s2", question: "Does JobFiltr make network requests to its own servers during filtering?", options: ["Yes, for ghost detection AI", "Yes, for community reports", "No — everything runs locally", "Only for premium features"], correctIndex: 2, explanation: "The extension makes zero network requests to our servers. All processing happens locally in the browser.", category: "Privacy" },
  { id: "s3", question: "What permissions does JobFiltr request?", options: ["All browsing data", "activeTab, storage, and host permissions for LinkedIn/Indeed only", "Full network access", "Camera and microphone"], correctIndex: 1, explanation: "Minimal permissions: activeTab, storage (for settings sync), and host permissions limited to linkedin.com and indeed.com.", category: "Privacy" },
  // AppSumo
  { id: "a1", question: "What is AppSumo's revenue split for partners?", options: ["50/50", "~30% to partner, ~70% to AppSumo", "~70% to partner, ~30% to AppSumo", "90/10"], correctIndex: 1, explanation: "Approximately 30% goes to the partner and 70% to AppSumo, though this is negotiable.", category: "AppSumo" },
  { id: "a2", question: "How long is AppSumo's refund guarantee window?", options: ["30 days", "60 days", "90 days", "14 days"], correctIndex: 1, explanation: "AppSumo offers a 60-day refund guarantee. Payment is processed with a 60-day lag to account for this.", category: "AppSumo" },
  { id: "a3", question: "What percentage of AppSumo partner applications are accepted?", options: ["~50%", "~25%", "~10%", "~5%"], correctIndex: 2, explanation: "Approximately 10% of applicants are accepted through AppSumo's three-stage vetting process.", category: "AppSumo" },
  { id: "a4", question: "What is the recommended base tier price for AppSumo deals?", options: ["$19-$29", "$49-$79", "$99-$149", "$149-$199"], correctIndex: 1, explanation: "$49-$79 is the sweet spot. Base tiers above $89 are generally rejected.", category: "AppSumo" },
  { id: "a5", question: "What must the redemption page NOT ask for?", options: ["Email address", "Product feedback", "Credit card or phone number", "Account password"], correctIndex: 2, explanation: "AppSumo strictly prohibits asking for credit card or phone number on the redemption page.", category: "AppSumo" },
  { id: "a6", question: "How long is a typical AppSumo campaign?", options: ["14 days", "30 days", "60 days", "90 days"], correctIndex: 2, explanation: "AppSumo campaigns run for 60 days, with a 7-day Plus-exclusive window before general availability.", category: "AppSumo" },
  // Product Hunt
  { id: "h1", question: "What time should you launch on Product Hunt for maximum ranking window?", options: ["9:00 AM PST", "12:01 AM PST", "6:00 AM EST", "Noon PST"], correctIndex: 1, explanation: "12:01 AM PST gives the full 24-hour ranking window since the leaderboard resets at midnight PST.", category: "Product Hunt" },
  { id: "h2", question: "What percentage of featured Product Hunt posts were self-hunted?", options: ["25%", "50%", "79%", "95%"], correctIndex: 2, explanation: "79% of featured posts were self-hunted. Self-hunting gives more control and is strongly recommended.", category: "Product Hunt" },
  { id: "h3", question: "What determines ~60% of your final Product Hunt ranking?", options: ["Total upvotes", "First 4 hours of activity", "Number of comments", "Social media shares"], correctIndex: 1, explanation: "The first 4 hours are critical — upvote velocity in this window determines approximately 60% of final ranking.", category: "Product Hunt" },
  { id: "h4", question: "What should you NEVER do on Product Hunt?", options: ["Post a maker comment", "Share on social media", "Ask people to upvote", "Include a demo video"], correctIndex: 2, explanation: "Never ask for upvotes — it violates guidelines and triggers algorithmic penalties. Ask for feedback, thoughts, or comments instead.", category: "Product Hunt" },
  // User FAQ
  { id: "u1", question: "How long does the average person job search before finding a new role?", options: ["1-2 weeks", "1-2 months", "3-6 months", "Over a year"], correctIndex: 2, explanation: "The average job search lasts 3-6 months, making JobFiltr's lifetime deal increasingly valuable over time.", category: "User FAQ" },
  { id: "u2", question: "What percentage of job listings are estimated to be ghost jobs or spam?", options: ["10-15%", "20-30%", "40-50%", "60-70%"], correctIndex: 2, explanation: "Studies show 40-50% of listings are ghost jobs or low-quality spam, wasting significant searcher time.", category: "User FAQ" },
  { id: "u3", question: "Why is a lifetime deal sustainable for JobFiltr specifically?", options: ["We have VC funding", "Chrome extensions have near-zero marginal cost per user", "We plan to add subscriptions later", "We'll run ads"], correctIndex: 1, explanation: "Chrome extensions run client-side with zero per-user server costs, making lifetime deals highly sustainable compared to SaaS products.", category: "User FAQ" },
  { id: "u4", question: "How quickly does JobFiltr typically fix LinkedIn DOM changes?", options: ["Within a week", "Within 24-48 hours", "Monthly updates", "We don't — users must wait"], correctIndex: 1, explanation: "We typically ship fixes within 24-48 hours of a breaking LinkedIn change, using fallback detection strategies to minimize disruption.", category: "User FAQ" },
];

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface QuizState {
  questions: QuizQuestion[];
  answers: Record<string, number>; // questionId -> selectedIndex
  submitted: boolean;
}

function CollapsibleSection({
  section,
  defaultOpen = false,
}: {
  section: KBSection;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const colorMap: Record<string, string> = {
    cyan: "border-cyan-500/20 text-cyan-400",
    blue: "border-blue-500/20 text-blue-400",
    green: "border-green-500/20 text-green-400",
    orange: "border-orange-500/20 text-orange-400",
    purple: "border-purple-500/20 text-purple-400",
    rose: "border-rose-500/20 text-rose-400",
  };
  const c = colorMap[section.color] || colorMap.cyan;
  const borderClass = c.split(" ")[0];
  const textClass = c.split(" ")[1];

  return (
    <motion.div variants={itemVariants}>
      <Card className={`bg-white/5 backdrop-blur-xl border ${borderClass} shadow-lg`}>
        <CardHeader className="cursor-pointer" onClick={() => setOpen(!open)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <span className={textClass}>{section.icon}</span>
              {section.title}
              <span className="text-white/30 text-xs font-normal ml-1">
                {section.entries.length} items
              </span>
            </CardTitle>
            {open ? (
              <ChevronUp className="h-4 w-4 text-white/40" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/40" />
            )}
          </div>
        </CardHeader>
        {open && (
          <CardContent className="space-y-3 pt-0">
            {section.entries.map((entry, idx) => (
              <QAItem key={idx} q={entry.q} a={entry.a} color={section.color} />
            ))}
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}

function QAItem({ q, a, color }: { q: string; a: string; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const bgMap: Record<string, string> = {
    cyan: "bg-cyan-500/5",
    blue: "bg-blue-500/5",
    green: "bg-green-500/5",
    orange: "bg-orange-500/5",
    purple: "bg-purple-500/5",
    rose: "bg-rose-500/5",
  };

  return (
    <div
      className={`rounded-lg border border-white/5 ${expanded ? bgMap[color] || "" : ""} transition-colors`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-start gap-2"
      >
        <ArrowRight
          className={`h-4 w-4 mt-0.5 shrink-0 transition-transform ${
            expanded ? "rotate-90 text-white/70" : "text-white/30"
          }`}
        />
        <span className={`text-sm ${expanded ? "text-white font-medium" : "text-white/70"}`}>
          {q}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pl-10">
          <p className="text-white/60 text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export function CampaignBriefTab() {
  const [quiz, setQuiz] = useState<QuizState | null>(null);

  const startQuiz = useCallback(() => {
    const selected = shuffleArray(QUESTION_POOL).slice(0, 10);
    setQuiz({ questions: selected, answers: {}, submitted: false });
  }, []);

  const selectAnswer = (qId: string, idx: number) => {
    if (!quiz || quiz.submitted) return;
    setQuiz((prev) =>
      prev ? { ...prev, answers: { ...prev.answers, [qId]: idx } } : prev
    );
  };

  const submitQuiz = () => {
    if (!quiz) return;
    setQuiz((prev) => (prev ? { ...prev, submitted: true } : prev));
  };

  const quizScore = useMemo(() => {
    if (!quiz?.submitted) return null;
    let correct = 0;
    quiz.questions.forEach((q) => {
      if (quiz.answers[q.id] === q.correctIndex) correct++;
    });
    return { correct, total: quiz.questions.length };
  }, [quiz]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="rounded-xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20 p-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-teal-400" />
            Campaign Brief — Everything You Need to Know About JobFiltr
          </h2>
          <p className="text-white/60 mt-2 text-sm">
            Comprehensive product knowledge for AppSumo partner calls, Product Hunt launch, user support, and sales conversations.
            Expand any section to view Q&A pairs. Test your knowledge with the quiz at the bottom.
          </p>
        </div>
      </motion.div>

      {/* Knowledge Base Sections */}
      {KB_SECTIONS.map((section, idx) => (
        <CollapsibleSection key={section.id} section={section} defaultOpen={idx === 0} />
      ))}

      {/* Quiz Section */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 backdrop-blur-xl border border-teal-500/30 shadow-lg shadow-teal-500/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-teal-400" />
              Test Your Knowledge
            </CardTitle>
            <CardDescription className="text-white/60">
              10 random questions from a pool of {QUESTION_POOL.length}. Covers tech stack, platforms, privacy, AppSumo, Product Hunt, and user FAQ.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!quiz ? (
              <Button
                onClick={startQuiz}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white"
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                Start Quiz
              </Button>
            ) : (
              <>
                {/* Score Banner */}
                {quiz.submitted && quizScore && (
                  <div
                    className={`rounded-lg p-4 text-center ${
                      quizScore.correct === quizScore.total
                        ? "bg-green-500/15 border border-green-500/30"
                        : quizScore.correct >= 7
                        ? "bg-teal-500/15 border border-teal-500/30"
                        : "bg-orange-500/15 border border-orange-500/30"
                    }`}
                  >
                    <div className="text-3xl font-bold text-white font-mono">
                      {quizScore.correct}/{quizScore.total}
                    </div>
                    <div className="text-white/60 text-sm mt-1">
                      {quizScore.correct === quizScore.total
                        ? "Perfect score! You're ready."
                        : quizScore.correct >= 7
                        ? "Great job! Review the missed questions below."
                        : "Review the sections above and try again."}
                    </div>
                  </div>
                )}

                {/* Questions */}
                <div className="space-y-4">
                  {quiz.questions.map((q, qIdx) => {
                    const selected = quiz.answers[q.id];
                    const isCorrect = selected === q.correctIndex;
                    const showResult = quiz.submitted;

                    return (
                      <div
                        key={q.id}
                        className={`rounded-lg border p-4 space-y-3 ${
                          showResult
                            ? isCorrect
                              ? "border-green-500/30 bg-green-500/5"
                              : selected !== undefined
                              ? "border-red-500/30 bg-red-500/5"
                              : "border-orange-500/30 bg-orange-500/5"
                            : "border-white/10 bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-white/30 text-sm font-mono shrink-0">
                            {qIdx + 1}.
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm font-medium">
                                {q.question}
                              </span>
                              {showResult && (
                                isCorrect ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                                ) : selected !== undefined ? (
                                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                ) : null
                              )}
                            </div>
                            <span className="text-white/30 text-xs">{q.category}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-5">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = selected === oIdx;
                            const isAnswer = oIdx === q.correctIndex;
                            let className =
                              "text-left rounded-md px-3 py-2 text-sm transition-all border ";

                            if (showResult) {
                              if (isAnswer) {
                                className +=
                                  "bg-green-500/15 border-green-500/30 text-green-300";
                              } else if (isSelected && !isAnswer) {
                                className +=
                                  "bg-red-500/15 border-red-500/30 text-red-300 line-through";
                              } else {
                                className +=
                                  "bg-white/[0.02] border-white/5 text-white/40";
                              }
                            } else {
                              className += isSelected
                                ? "bg-teal-500/20 border-teal-500/40 text-teal-300"
                                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10";
                            }

                            return (
                              <button
                                key={oIdx}
                                onClick={() => selectAnswer(q.id, oIdx)}
                                disabled={quiz.submitted}
                                className={className}
                              >
                                <span className="font-mono text-xs mr-2 opacity-50">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {showResult && !isCorrect && (
                          <div className="pl-5 text-sm text-white/50 italic">
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  {!quiz.submitted ? (
                    <Button
                      onClick={submitQuiz}
                      disabled={
                        Object.keys(quiz.answers).length < quiz.questions.length
                      }
                      className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white disabled:opacity-40"
                    >
                      Submit Answers ({Object.keys(quiz.answers).length}/
                      {quiz.questions.length})
                    </Button>
                  ) : (
                    <Button
                      onClick={startQuiz}
                      className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retake Quiz (New Questions)
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
