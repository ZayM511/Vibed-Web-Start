"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Globe,
  Mail,
  Phone,
  Star,
  Handshake,
  BarChart3,
  MessageSquare,
  Youtube,
  Twitter,
  Instagram,
  Linkedin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────────────────────────

type Platform = {
  name: "YouTube" | "TikTok" | "Instagram" | "Twitter/X" | "LinkedIn" | "Podcast";
  handle: string;
  url: string;
  followerCount: string;
};

type OutreachStatus =
  | "Not Contacted"
  | "Reached Out"
  | "In Negotiation"
  | "Partnered"
  | "Declined";

type PartnershipOpenness = "Open" | "Selective" | "Unknown" | "Closed";

type Influencer = {
  id: string;
  name: string;
  avatarInitials: string;
  avatarGradient: string;
  platforms: Platform[];
  primaryFollowerCount: number;
  primaryFollowerDisplay: string;
  niche: string;
  tier: "micro" | "mid-major" | "major" | "international";
  contactInfo: { management?: string; email?: string; agencyNotes?: string };
  partnershipOpenness: PartnershipOpenness;
  estimatedCostMin: number;
  estimatedCostMax: number;
  estimatedCostDisplay: string;
  suggestedDeal: string;
  estimatedRevenue: string;
  estimatedRevenueRaw: number;
  demographics: { usPercent: number; topCountries: string[]; ageRange: string; primaryGender: string };
  status: OutreachStatus;
  notes: string;
};

// ─── Real Influencer Data ─────────────────────────────────────────────────────

const INFLUENCERS: Influencer[] = [
  // ── MICRO ──────────────────────────────────────────────────────────────────
  {
    id: "mc-1", name: "Adunola Adeshola", avatarInitials: "AA",
    avatarGradient: "from-violet-500 to-purple-600",
    platforms: [
      { name: "Instagram", handle: "@thenewemployees", url: "https://www.instagram.com/thenewemployees/", followerCount: "54K" },
      { name: "LinkedIn", handle: "Adunola Adeshola", url: "https://www.linkedin.com/in/adunolaadeshola/", followerCount: "35K" },
      { name: "Twitter/X", handle: "@AdunolaAdeshola", url: "https://x.com/adunolaadeshola", followerCount: "15K" },
    ],
    primaryFollowerCount: 54000, primaryFollowerDisplay: "54K",
    niche: "Career strategy for high-achievers, salary negotiation, landing roles at Google/Spotify/LinkedIn",
    tier: "micro",
    contactInfo: { agencyNotes: "Via employeeredefined.com or LinkedIn DM" },
    partnershipOpenness: "Open",
    estimatedCostMin: 500, estimatedCostMax: 2000, estimatedCostDisplay: "$500–$2,000",
    suggestedDeal: "Affiliate deal with 20-25% commission per sign-up + free premium access. Her high-achiever audience is a high-conversion segment for JobFiltr premium tier.",
    estimatedRevenue: "$2,000–$8,000", estimatedRevenueRaw: 5000,
    demographics: { usPercent: 70, topCountries: ["United States", "United Kingdom", "Nigeria", "Canada"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Forbes column read 3M+ times. Clients have landed roles at Google, Spotify, Vogue. Very credible voice for mid-to-senior professionals.",
  },
  {
    id: "mc-2", name: "Mandy Tang", avatarInitials: "MT",
    avatarGradient: "from-pink-500 to-fuchsia-600",
    platforms: [
      { name: "TikTok", handle: "@careercoachmandy", url: "https://www.tiktok.com/@careercoachmandy", followerCount: "104K" },
      { name: "Instagram", handle: "@careercoachmandy", url: "https://www.instagram.com/careercoachmandy/", followerCount: "15K" },
    ],
    primaryFollowerCount: 104500, primaryFollowerDisplay: "104K",
    niche: "Career coaching, resume tips, job search strategy, interview preparation, workplace confidence",
    tier: "micro",
    contactInfo: { agencyNotes: "Via TikTok bio link or Instagram DM" },
    partnershipOpenness: "Open",
    estimatedCostMin: 500, estimatedCostMax: 2500, estimatedCostDisplay: "$500–$2,500",
    suggestedDeal: "Product seeding + affiliate commission (15-20%). Free premium membership and custom promo code for her audience.",
    estimatedRevenue: "$1,500–$5,000", estimatedRevenueRaw: 3250,
    demographics: { usPercent: 65, topCountries: ["United States", "Canada", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Strong engagement rate typical of micro-influencers. Content is very aligned with JobFiltr's job search filtering use case.",
  },
  {
    id: "mc-3", name: "Farah Sharghi", avatarInitials: "FS",
    avatarGradient: "from-purple-500 to-indigo-600",
    platforms: [
      { name: "TikTok", handle: "@farahsharghi", url: "https://www.tiktok.com/@farahsharghi", followerCount: "45K" },
      { name: "LinkedIn", handle: "Farah Sharghi", url: "https://www.linkedin.com/in/fsharghi/", followerCount: "30K" },
      { name: "Instagram", handle: "@farahsharghi", url: "https://www.instagram.com/farahsharghi/", followerCount: "15K" },
    ],
    primaryFollowerCount: 45000, primaryFollowerDisplay: "45K",
    niche: "Tech recruiting insider tips, FAANG hiring processes, resume reviews — ex-Google/Uber/TikTok recruiter",
    tier: "micro",
    contactInfo: { agencyNotes: "Via farahsharghi.com contact page" },
    partnershipOpenness: "Open",
    estimatedCostMin: 500, estimatedCostMax: 2000, estimatedCostDisplay: "$500–$2,000",
    suggestedDeal: "Sponsored content integration where she demonstrates JobFiltr while giving job search advice. Flat fee + affiliate link.",
    estimatedRevenue: "$1,000–$4,000", estimatedRevenueRaw: 2500,
    demographics: { usPercent: 75, topCountries: ["United States", "Canada", "India", "United Kingdom"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Recruited at Google, Uber, Lyft, TikTok, NYT. Her audience is highly motivated job seekers — ideal for JobFiltr conversion.",
  },
  {
    id: "mc-4", name: "Ashley Stahl", avatarInitials: "AS",
    avatarGradient: "from-rose-500 to-pink-600",
    platforms: [
      { name: "Instagram", handle: "@ashleystahl", url: "https://www.instagram.com/ashleystahl/", followerCount: "76K" },
      { name: "YouTube", handle: "Ashley Stahl", url: "https://www.youtube.com/@AshleyStahl", followerCount: "20K" },
      { name: "TikTok", handle: "@ashley.stahl", url: "https://www.tiktok.com/@ashley.stahl", followerCount: "1.6K" },
    ],
    primaryFollowerCount: 76000, primaryFollowerDisplay: "76K",
    niche: "Career coaching, personal branding, career pivots, You Turn podcast, salary negotiation",
    tier: "micro",
    contactInfo: { management: "Wise Whisper Agency (her own agency)", agencyNotes: "Via ashleystahl.com or Wise Whisper Agency" },
    partnershipOpenness: "Open",
    estimatedCostMin: 1000, estimatedCostMax: 3000, estimatedCostDisplay: "$1,000–$3,000",
    suggestedDeal: "Podcast sponsorship on 'You Turn' podcast + Instagram story series. Flat fee + affiliate code.",
    estimatedRevenue: "$2,000–$6,000", estimatedRevenueRaw: 4000,
    demographics: { usPercent: 80, topCountries: ["United States", "Canada", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Former Pentagon national security background. 2 viral TED talks. Podcast sponsorship could be high-ROI for JobFiltr.",
  },
  {
    id: "mc-5", name: "Jeff Su", avatarInitials: "JS",
    avatarGradient: "from-indigo-500 to-violet-600",
    platforms: [
      { name: "YouTube", handle: "Jeff Su", url: "https://www.youtube.com/@JeffSu", followerCount: "1.6M" },
      { name: "Instagram", handle: "@j.sushie", url: "https://www.instagram.com/j.sushie/", followerCount: "74K" },
      { name: "TikTok", handle: "@jsushie", url: "https://www.tiktok.com/@jsushie", followerCount: "16.2K" },
    ],
    primaryFollowerCount: 1600000, primaryFollowerDisplay: "1.6M",
    niche: "Productivity, career growth, corporate job search, Google product marketing insights",
    tier: "micro",
    contactInfo: { agencyNotes: "Via jeffsu.org or Passionfroot (passionfroot.me/jeffsu)" },
    partnershipOpenness: "Open",
    estimatedCostMin: 5000, estimatedCostMax: 15000, estimatedCostDisplay: "$5,000–$15,000",
    suggestedDeal: "Sponsored YouTube integration — 60-90 second mid-roll featuring JobFiltr as part of a job search tips video. Flat fee.",
    estimatedRevenue: "$10,000–$40,000", estimatedRevenueRaw: 25000,
    demographics: { usPercent: 55, topCountries: ["United States", "India", "United Kingdom", "Singapore", "Hong Kong"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "NOTE: 1.6M YouTube subs puts him in major tier by count, but listed micro here due to TikTok-level presence. Google employee adds credibility. Uses Passionfroot for brand deals — easy to book.",
  },
  {
    id: "mc-6", name: "Income Rebellion", avatarInitials: "IR",
    avatarGradient: "from-fuchsia-500 to-purple-600",
    platforms: [
      { name: "TikTok", handle: "@incomerebellion", url: "https://www.tiktok.com/@incomerebellion", followerCount: "11.6K" },
    ],
    primaryFollowerCount: 11600, primaryFollowerDisplay: "11.6K",
    niche: "Side hustles, income growth, career pivots, unconventional career paths, salary transparency",
    tier: "micro",
    contactInfo: { agencyNotes: "Via TikTok DM or bio link" },
    partnershipOpenness: "Open",
    estimatedCostMin: 100, estimatedCostMax: 500, estimatedCostDisplay: "$100–$500",
    suggestedDeal: "Free product + commission-based affiliate deal (25-30% commission). Low risk, high potential for authentic content.",
    estimatedRevenue: "$500–$2,000", estimatedRevenueRaw: 1250,
    demographics: { usPercent: 80, topCountries: ["United States", "Canada"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Very small but engaged niche audience. Ideal for testing messaging and getting authentic UGC content at minimal cost.",
  },
  {
    id: "mc-7", name: "MingKe Career", avatarInitials: "MK",
    avatarGradient: "from-violet-400 to-pink-500",
    platforms: [
      { name: "TikTok", handle: "@mingkecareer", url: "https://www.tiktok.com/@mingkecareer", followerCount: "10.8K" },
    ],
    primaryFollowerCount: 10800, primaryFollowerDisplay: "10.8K",
    niche: "Career advice, job search tips, resume optimization, professional development for early-career professionals",
    tier: "micro",
    contactInfo: { agencyNotes: "Via TikTok DM or bio link" },
    partnershipOpenness: "Open",
    estimatedCostMin: 100, estimatedCostMax: 500, estimatedCostDisplay: "$100–$500",
    suggestedDeal: "Free JobFiltr premium access + affiliate deal with 25-30% commission. 'How I use JobFiltr to find jobs' content series.",
    estimatedRevenue: "$300–$1,500", estimatedRevenueRaw: 900,
    demographics: { usPercent: 70, topCountries: ["United States", "Canada", "United Kingdom"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Small but growing creator. Very affordable for early-stage brand partnerships. Can produce authentic content.",
  },
  {
    id: "mc-8", name: "Sameer Jauhar", avatarInitials: "SJ",
    avatarGradient: "from-purple-400 to-violet-600",
    platforms: [
      { name: "TikTok", handle: "@sameer_jauhar", url: "https://www.tiktok.com/@sameer_jauhar", followerCount: "16.2K" },
    ],
    primaryFollowerCount: 16200, primaryFollowerDisplay: "16.2K",
    niche: "Career coaching, professional development, job search strategies, workplace tips",
    tier: "micro",
    contactInfo: { agencyNotes: "Via TikTok bio link" },
    partnershipOpenness: "Open",
    estimatedCostMin: 100, estimatedCostMax: 500, estimatedCostDisplay: "$100–$500",
    suggestedDeal: "Product gifting + affiliate commission (25%). Low-cost test partnership.",
    estimatedRevenue: "$300–$1,500", estimatedRevenueRaw: 900,
    demographics: { usPercent: 50, topCountries: ["United States", "India", "United Kingdom", "Canada"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Good for testing international reach particularly in the Indian market. Low-cost entry point.",
  },
  {
    id: "mc-9", name: "Careerology UK", avatarInitials: "CU",
    avatarGradient: "from-pink-400 to-rose-500",
    platforms: [
      { name: "TikTok", handle: "@careerology_uk", url: "https://www.tiktok.com/@careerology_uk", followerCount: "10.1K" },
    ],
    primaryFollowerCount: 10100, primaryFollowerDisplay: "10.1K",
    niche: "UK-focused career advice, job applications, CV tips, interview preparation, graduate job search",
    tier: "micro",
    contactInfo: { agencyNotes: "Via TikTok DM or bio link" },
    partnershipOpenness: "Open",
    estimatedCostMin: 100, estimatedCostMax: 500, estimatedCostDisplay: "$100–$500",
    suggestedDeal: "Free product access + affiliate deal. Useful for testing UK market messaging.",
    estimatedRevenue: "$200–$1,000", estimatedRevenueRaw: 600,
    demographics: { usPercent: 15, topCountries: ["United Kingdom", "Ireland", "United States", "Canada"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "UK-focused creator — great for testing JobFiltr's international expansion. Very affordable partnership entry point.",
  },
  {
    id: "mc-10", name: "Caroline (What Happens Now)", avatarInitials: "CW",
    avatarGradient: "from-indigo-400 to-purple-600",
    platforms: [
      { name: "TikTok", handle: "@whathappensnow.co", url: "https://www.tiktok.com/@whathappensnow.co", followerCount: "25K" },
      { name: "Instagram", handle: "@whathappensnow.co", url: "https://www.instagram.com/whathappensnow.co/", followerCount: "8K" },
    ],
    primaryFollowerCount: 25000, primaryFollowerDisplay: "25K",
    niche: "Career coaching, career transitions, job search guidance, professional development for women",
    tier: "micro",
    contactInfo: { agencyNotes: "Via TikTok/Instagram DM or website" },
    partnershipOpenness: "Open",
    estimatedCostMin: 200, estimatedCostMax: 800, estimatedCostDisplay: "$200–$800",
    suggestedDeal: "Free JobFiltr premium + affiliate deal (20%). Co-create a 'tools I use for job searching' content piece.",
    estimatedRevenue: "$500–$2,000", estimatedRevenueRaw: 1250,
    demographics: { usPercent: 65, topCountries: ["United States", "Canada", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Growing career coaching account focused on career transitions. Audience is actively searching for new opportunities — high purchase intent.",
  },

  // ── MID-MAJOR ──────────────────────────────────────────────────────────────
  {
    id: "mm-1", name: "Darci Smith", avatarInitials: "DS",
    avatarGradient: "from-amber-500 to-orange-600",
    platforms: [
      { name: "TikTok", handle: "@careercoachdarci", url: "https://www.tiktok.com/@careercoachdarci", followerCount: "291K" },
      { name: "Instagram", handle: "@careercoachdarci", url: "https://www.instagram.com/careercoachdarci/", followerCount: "60K" },
      { name: "LinkedIn", handle: "Darci Smith", url: "https://www.linkedin.com/in/darcismith/", followerCount: "15K" },
    ],
    primaryFollowerCount: 291300, primaryFollowerDisplay: "291K",
    niche: "Interview advice, resume & LinkedIn optimization, salary negotiation — recruiter at boutique firm",
    tier: "mid-major",
    contactInfo: { management: "All Influence Management", agencyNotes: "Via allinfluencemgmt.com/careercoachdarci" },
    partnershipOpenness: "Open",
    estimatedCostMin: 2000, estimatedCostMax: 8000, estimatedCostDisplay: "$2,000–$8,000",
    suggestedDeal: "Sponsored TikTok series (3-5 videos) showing how JobFiltr helps filter and find jobs. Flat fee $3,000-$5,000 + affiliate link.",
    estimatedRevenue: "$5,000–$15,000", estimatedRevenueRaw: 10000,
    demographics: { usPercent: 75, topCountries: ["United States", "Canada", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Managed by All Influence Management — professional to work with. 10+ years recruiting experience. Partnered with onomy on podcast.",
  },
  {
    id: "mm-2", name: "Hanna Goefft", avatarInitials: "HG",
    avatarGradient: "from-orange-500 to-red-500",
    platforms: [
      { name: "TikTok", handle: "@hannagetshired", url: "https://www.tiktok.com/@hannagetshired", followerCount: "325K" },
      { name: "Instagram", handle: "@hannagetshired", url: "https://www.instagram.com/hannagetshired/", followerCount: "173K" },
      { name: "LinkedIn", handle: "Hanna Goefft", url: "https://www.linkedin.com/in/hanna-goefft/", followerCount: "50K" },
    ],
    primaryFollowerCount: 324900, primaryFollowerDisplay: "325K",
    niche: "Salary negotiation, contract negotiation, getting hired strategies — ex-recruiter and marketing manager",
    tier: "mid-major",
    contactInfo: { email: "partner@hannagetshired.com", agencyNotes: "Has dedicated partnership email — very professional" },
    partnershipOpenness: "Open",
    estimatedCostMin: 3000, estimatedCostMax: 10000, estimatedCostDisplay: "$3,000–$10,000",
    suggestedDeal: "Multi-platform campaign (TikTok + Instagram Reels + LinkedIn post). Flat fee $5,000-$7,000 with dedicated promo code.",
    estimatedRevenue: "$8,000–$25,000", estimatedRevenueRaw: 16500,
    demographics: { usPercent: 70, topCountries: ["United States", "Canada", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "500K+ total cross-platform audience. 80M+ impressions. Ex-recruiter content is perfectly aligned with JobFiltr.",
  },
  {
    id: "mm-3", name: "Kyyah Abdul", avatarInitials: "KA",
    avatarGradient: "from-yellow-500 to-amber-600",
    platforms: [
      { name: "TikTok", handle: "@kyyahabdul", url: "https://www.tiktok.com/@kyyahabdul", followerCount: "300K" },
      { name: "Instagram", handle: "@kyyahabdul", url: "https://www.instagram.com/kyyahabdul/", followerCount: "85K" },
    ],
    primaryFollowerCount: 300200, primaryFollowerDisplay: "300K",
    niche: "Corporate career tips, salary negotiation, workplace navigation — biotech/corporate background, published author",
    tier: "mid-major",
    contactInfo: { email: "kyyah@underscoretalent.com", management: "Underscore Talent", agencyNotes: "kyyah@underscoretalent.com or kyyahabdul.com/bookkyyah" },
    partnershipOpenness: "Open",
    estimatedCostMin: 2500, estimatedCostMax: 8000, estimatedCostDisplay: "$2,500–$8,000",
    suggestedDeal: "Sponsored TikTok content + Instagram stories featuring JobFiltr. Flat fee $3,000-$5,000. Published author adds credibility.",
    estimatedRevenue: "$5,000–$15,000", estimatedRevenueRaw: 10000,
    demographics: { usPercent: 80, topCountries: ["United States", "United Kingdom", "Canada", "Nigeria"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Published author ('The Prepared Graduate'). Represented by talent agency. 16.2M TikTok likes shows high engagement.",
  },
  {
    id: "mm-4", name: "Madeline Mann", avatarInitials: "MM",
    avatarGradient: "from-amber-400 to-yellow-500",
    platforms: [
      { name: "TikTok", handle: "@selfmademillennial", url: "https://www.tiktok.com/@selfmademillennial", followerCount: "433K" },
      { name: "YouTube", handle: "Self Made Millennial", url: "https://www.youtube.com/@SelfMadeMillennial", followerCount: "400K" },
      { name: "LinkedIn", handle: "Madeline Mann", url: "https://www.linkedin.com/in/madelinemann/", followerCount: "200K" },
    ],
    primaryFollowerCount: 432700, primaryFollowerDisplay: "433K",
    niche: "HR/recruiting insider knowledge, job search strategy, interview prep — hiring manager perspective",
    tier: "mid-major",
    contactInfo: { agencyNotes: "Via madelinemann.com" },
    partnershipOpenness: "Open",
    estimatedCostMin: 5000, estimatedCostMax: 15000, estimatedCostDisplay: "$5,000–$15,000",
    suggestedDeal: "YouTube sponsored integration + TikTok series. Flat fee $8,000-$12,000. Her hiring manager perspective makes JobFiltr recommendation very credible.",
    estimatedRevenue: "$15,000–$50,000", estimatedRevenueRaw: 32500,
    demographics: { usPercent: 70, topCountries: ["United States", "Canada", "United Kingdom", "India"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Named Top 5 Career YouTube Channel. #2 Career TikTok (behind Gary Vee). Author of 'Reverse the Search' (Penguin Random House). Featured on WSJ, NYT, ABC, Bloomberg. EXTREMELY high-value partner.",
  },
  {
    id: "mm-5", name: "Sho Dewan", avatarInitials: "SD",
    avatarGradient: "from-orange-400 to-amber-500",
    platforms: [
      { name: "TikTok", handle: "@workhap", url: "https://www.tiktok.com/@workhap", followerCount: "655K" },
      { name: "LinkedIn", handle: "Sho Dewan", url: "https://www.linkedin.com/in/shodewan/", followerCount: "100K" },
      { name: "Instagram", handle: "@workhap", url: "https://www.instagram.com/workhap/", followerCount: "80K" },
    ],
    primaryFollowerCount: 654700, primaryFollowerDisplay: "655K",
    niche: "Career coaching, resume writing, interview prep, job search training — LinkedIn Top Voice, Forbes contributor",
    tier: "mid-major",
    contactInfo: { email: "team@workhap.com", agencyNotes: "team@workhap.com" },
    partnershipOpenness: "Open",
    estimatedCostMin: 5000, estimatedCostMax: 15000, estimatedCostDisplay: "$5,000–$15,000",
    suggestedDeal: "Sponsored TikTok series + Get Hired Academy cross-promotion. Flat fee $6,000-$10,000 + affiliate deal for ongoing revenue.",
    estimatedRevenue: "$10,000–$35,000", estimatedRevenueRaw: 22500,
    demographics: { usPercent: 55, topCountries: ["United States", "United Kingdom", "India", "Hong Kong", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "2M+ total reach. LinkedIn Top Voice. Forbes contributor. Based in LA but strong international audience. Worked with Simon Sinek.",
  },
  {
    id: "mm-6", name: "Hannah & Ryan Maruyama (DegreeFree)", avatarInitials: "DF",
    avatarGradient: "from-red-400 to-orange-500",
    platforms: [
      { name: "TikTok", handle: "@degreefree", url: "https://www.tiktok.com/@degreefree", followerCount: "516K" },
      { name: "YouTube", handle: "Degree Free", url: "https://www.youtube.com/@degreefree", followerCount: "30K" },
    ],
    primaryFollowerCount: 515700, primaryFollowerDisplay: "516K",
    niche: "Alternative career paths without college degrees, career pivots, practical skill-based hiring",
    tier: "mid-major",
    contactInfo: { email: "hello@degreefree.co", agencyNotes: "hello@degreefree.co" },
    partnershipOpenness: "Open",
    estimatedCostMin: 3000, estimatedCostMax: 10000, estimatedCostDisplay: "$3,000–$10,000",
    suggestedDeal: "Sponsored TikTok content + podcast mention. Position JobFiltr as 'the tool that helps you find jobs that don't require degrees.' Flat fee $4,000-$7,000.",
    estimatedRevenue: "$8,000–$20,000", estimatedRevenueRaw: 14000,
    demographics: { usPercent: 75, topCountries: ["United States", "Canada", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Unique niche — career content for non-degree holders. Targets 18-25 year olds. Price-sensitive demographic that would love an affordable job search tool.",
  },
  {
    id: "mm-7", name: "HR Manifesto", avatarInitials: "HM",
    avatarGradient: "from-amber-600 to-orange-500",
    platforms: [
      { name: "TikTok", handle: "@hrmanifesto", url: "https://www.tiktok.com/@hrmanifesto", followerCount: "742K" },
    ],
    primaryFollowerCount: 742100, primaryFollowerDisplay: "742K",
    niche: "HR insider perspective on workplace issues, employee rights, toxic workplace recovery, hiring process transparency",
    tier: "mid-major",
    contactInfo: { agencyNotes: "Via TikTok bio link" },
    partnershipOpenness: "Open",
    estimatedCostMin: 4000, estimatedCostMax: 12000, estimatedCostDisplay: "$4,000–$12,000",
    suggestedDeal: "Sponsored TikTok in 'work rescue' content. Flat fee $5,000-$8,000. Position JobFiltr as 'the escape tool for people in toxic workplaces.'",
    estimatedRevenue: "$8,000–$25,000", estimatedRevenueRaw: 16500,
    demographics: { usPercent: 70, topCountries: ["United States", "Canada", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "HR insider perspective adds unique credibility. Audience is often people actively wanting to leave their jobs — very high purchase intent for a job search tool.",
  },
  {
    id: "mm-8", name: "Career Kueen", avatarInitials: "CK",
    avatarGradient: "from-orange-600 to-amber-500",
    platforms: [
      { name: "TikTok", handle: "@careerkueen", url: "https://www.tiktok.com/@careerkueen", followerCount: "671K" },
    ],
    primaryFollowerCount: 670600, primaryFollowerDisplay: "671K",
    niche: "Career coaching, job search motivation, corporate life tips, interview preparation, workplace confidence",
    tier: "mid-major",
    contactInfo: { agencyNotes: "Via TikTok bio link" },
    partnershipOpenness: "Open",
    estimatedCostMin: 4000, estimatedCostMax: 12000, estimatedCostDisplay: "$4,000–$12,000",
    suggestedDeal: "Sponsored TikTok series. Flat fee $5,000-$8,000 for a 3-video package featuring JobFiltr in job search workflow content.",
    estimatedRevenue: "$8,000–$22,000", estimatedRevenueRaw: 15000,
    demographics: { usPercent: 70, topCountries: ["United States", "Canada", "United Kingdom"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "670K+ TikTok. Career coaching content directly aligns with JobFiltr use case.",
  },
  {
    id: "mm-9", name: "Career with Boris", avatarInitials: "CB",
    avatarGradient: "from-yellow-400 to-orange-500",
    platforms: [
      { name: "TikTok", handle: "@careerwithboris", url: "https://www.tiktok.com/@careerwithboris", followerCount: "626K" },
    ],
    primaryFollowerCount: 625800, primaryFollowerDisplay: "626K",
    niche: "Career planning, job search strategy, professional development, career transitions, workplace advice",
    tier: "mid-major",
    contactInfo: { agencyNotes: "Via TikTok bio link" },
    partnershipOpenness: "Open",
    estimatedCostMin: 4000, estimatedCostMax: 10000, estimatedCostDisplay: "$4,000–$10,000",
    suggestedDeal: "Sponsored TikTok content featuring JobFiltr as a career planning tool. Flat fee $4,000-$7,000.",
    estimatedRevenue: "$7,000–$20,000", estimatedRevenueRaw: 13500,
    demographics: { usPercent: 65, topCountries: ["United States", "Canada", "United Kingdom", "Germany"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "625K+ followers in the career niche. Consistent content output. Good mid-tier partnership candidate with reasonable rates.",
  },
  {
    id: "mm-10", name: "Job Doctor Tessa", avatarInitials: "JT",
    avatarGradient: "from-amber-500 to-red-400",
    platforms: [
      { name: "TikTok", handle: "@jobdoctortessa", url: "https://www.tiktok.com/@jobdoctortessa", followerCount: "768K" },
    ],
    primaryFollowerCount: 768400, primaryFollowerDisplay: "768K",
    niche: "Career mentoring, job search advice, workplace issues, career transitions — 'Job Doctor' branding",
    tier: "mid-major",
    contactInfo: { agencyNotes: "Via TikTok bio link" },
    partnershipOpenness: "Open",
    estimatedCostMin: 4000, estimatedCostMax: 12000, estimatedCostDisplay: "$4,000–$12,000",
    suggestedDeal: "Sponsored TikTok integration. Flat fee $5,000-$8,000 for 'prescribing JobFiltr for your job search' themed content series.",
    estimatedRevenue: "$8,000–$25,000", estimatedRevenueRaw: 16500,
    demographics: { usPercent: 70, topCountries: ["United States", "Canada", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "768K followers — approaching major tier. 'Job Doctor' branding is unique and memorable. Strong candidate for JobFiltr partnership.",
  },

  // ── MAJOR ──────────────────────────────────────────────────────────────────
  {
    id: "mj-1", name: "Erin McGoff", avatarInitials: "EM",
    avatarGradient: "from-cyan-500 to-blue-600",
    platforms: [
      { name: "TikTok", handle: "@erinmcgoff", url: "https://www.tiktok.com/@erinmcgoff", followerCount: "2.9M" },
      { name: "Instagram", handle: "@advicewitherin", url: "https://www.instagram.com/advicewitherin/", followerCount: "2.2M" },
      { name: "YouTube", handle: "AdviceWithErin", url: "https://www.youtube.com/@AdviceWithErin", followerCount: "500K" },
      { name: "LinkedIn", handle: "Erin McGoff", url: "https://www.linkedin.com/in/erinmcgoff/", followerCount: "200K" },
    ],
    primaryFollowerCount: 2900000, primaryFollowerDisplay: "2.9M",
    niche: "Career and life advice, job search, resume reviews, interview prep — #1 career advice creator",
    tier: "major",
    contactInfo: { email: "advicewitherin@night.co", management: "Night Media (same agency as MrBeast)", agencyNotes: "advicewitherin@night.co" },
    partnershipOpenness: "Open",
    estimatedCostMin: 25000, estimatedCostMax: 75000, estimatedCostDisplay: "$25,000–$75,000",
    suggestedDeal: "Multi-platform sponsored campaign: TikTok series + Instagram Reels + YouTube integration. Flat fee $30,000-$50,000. Alternatively, long-term ambassador at $100,000-$150,000/year.",
    estimatedRevenue: "$50,000–$200,000", estimatedRevenueRaw: 125000,
    demographics: { usPercent: 65, topCountries: ["United States", "United Kingdom", "Canada", "Australia", "India"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "7M+ total followers. Forbes 30 Under 30 (2025). NYT Bestselling Author. LinkedIn Top Voice. Instagram Reels have hit 50M+ plays. DREAM PARTNER for JobFiltr but expensive.",
  },
  {
    id: "mj-2", name: "Richard McMunn (CareerVidz)", avatarInitials: "RM",
    avatarGradient: "from-blue-500 to-indigo-600",
    platforms: [
      { name: "YouTube", handle: "CareerVidz", url: "https://www.youtube.com/@CareerVidz", followerCount: "5.2M" },
      { name: "TikTok", handle: "@careervidz", url: "https://www.tiktok.com/@careervidz", followerCount: "4.6M" },
    ],
    primaryFollowerCount: 5210000, primaryFollowerDisplay: "5.2M",
    niche: "Interview preparation, job interview Q&A tutorials, career advice for specific industries",
    tier: "major",
    contactInfo: { agencyNotes: "Via passmyinterview.com or how2become.com contact pages" },
    partnershipOpenness: "Open",
    estimatedCostMin: 20000, estimatedCostMax: 60000, estimatedCostDisplay: "$20,000–$60,000",
    suggestedDeal: "YouTube sponsored video integration + TikTok cross-promotion. Flat fee $25,000-$40,000. Position JobFiltr as the first step before interview prep.",
    estimatedRevenue: "$50,000–$150,000", estimatedRevenueRaw: 100000,
    demographics: { usPercent: 35, topCountries: ["United Kingdom", "United States", "Canada", "Australia", "India"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "9.8M+ total following. 413.6M YouTube views across 2,840 videos. UK-based. Founded 2011. Also runs passmyinterview.com — position JobFiltr carefully to avoid overlap.",
  },
  {
    id: "mj-3", name: "Laura Whaley", avatarInitials: "LW",
    avatarGradient: "from-sky-500 to-cyan-600",
    platforms: [
      { name: "TikTok", handle: "@loewhaley", url: "https://www.tiktok.com/@loewhaley", followerCount: "4M" },
      { name: "Instagram", handle: "@loewhaley", url: "https://www.instagram.com/loewhaley/", followerCount: "500K" },
      { name: "LinkedIn", handle: "Laura Whaley", url: "https://ca.linkedin.com/in/laura-whaley-10458b2a1", followerCount: "50K" },
    ],
    primaryFollowerCount: 4000000, primaryFollowerDisplay: "4M",
    niche: "Workplace boundaries, office conversation scripts, work-life balance, corporate culture navigation",
    tier: "major",
    contactInfo: { email: "loewhaley@currentsmgmt.com", management: "Currents Management", agencyNotes: "loewhaley@currentsmgmt.com" },
    partnershipOpenness: "Open",
    estimatedCostMin: 25000, estimatedCostMax: 75000, estimatedCostDisplay: "$25,000–$75,000",
    suggestedDeal: "Sponsored TikTok series (3-5 videos) + Instagram collab. Flat fee $30,000-$50,000. Theme: 'When you need to set boundaries by finding a better job — here's how I filter opportunities.'",
    estimatedRevenue: "$50,000–$180,000", estimatedRevenueRaw: 115000,
    demographics: { usPercent: 50, topCountries: ["United States", "Canada", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "Female (70%)" },
    status: "Not Contacted",
    notes: "Nearly 4M TikTok followers, 104M+ likes. Has worked with Canva, Norton, Amazon. Canadian creator. Left tech job to become full-time creator. Audience is people unhappy at work — perfect JobFiltr users.",
  },
  {
    id: "mj-4", name: "Hannah Williams (Salary Transparent St.)", avatarInitials: "HW",
    avatarGradient: "from-indigo-500 to-blue-500",
    platforms: [
      { name: "TikTok", handle: "@saborhannahwilliams", url: "https://www.tiktok.com/@saborhannahwilliams", followerCount: "1.3M" },
      { name: "Instagram", handle: "@salarytransparentstreet", url: "https://www.instagram.com/salarytransparentstreet/", followerCount: "654K" },
      { name: "YouTube", handle: "Salary Transparent Street", url: "https://www.youtube.com/@SalaryTransparentStreet", followerCount: "250K" },
    ],
    primaryFollowerCount: 1300000, primaryFollowerDisplay: "1.3M",
    niche: "Salary transparency, asking strangers about salaries, wage gap awareness, compensation equity",
    tier: "major",
    contactInfo: { agencyNotes: "Via salarytransparentstreet.com" },
    partnershipOpenness: "Open",
    estimatedCostMin: 30000, estimatedCostMax: 100000, estimatedCostDisplay: "$30,000–$100,000",
    suggestedDeal: "Sponsored content integration — 'Use JobFiltr to find jobs that match the salaries we feature.' Flat fee $40,000-$60,000.",
    estimatedRevenue: "$60,000–$200,000", estimatedRevenueRaw: 130000,
    demographics: { usPercent: 80, topCountries: ["United States", "Canada", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Business generated $1M+ in 2023. Previous deal with Indeed was nearly $500K for 6 months. Forbes 30 Under 30. TIME100 Creator. 97% of revenue from brand partnerships. VERY experienced with career tool partnerships.",
  },
  {
    id: "mj-5", name: "Wonsulting (Jonathan Javier & Jerry Lee)", avatarInitials: "WS",
    avatarGradient: "from-cyan-400 to-blue-500",
    platforms: [
      { name: "LinkedIn", handle: "Jonathan Javier", url: "https://www.linkedin.com/in/jonathan-javier/", followerCount: "1M" },
      { name: "TikTok", handle: "@wonsulting", url: "https://www.tiktok.com/@wonsulting", followerCount: "835K" },
      { name: "Instagram", handle: "@wonsulting", url: "https://www.instagram.com/wonsulting/", followerCount: "500K" },
    ],
    primaryFollowerCount: 1000000, primaryFollowerDisplay: "1M",
    niche: "Resume tips, LinkedIn optimization, job search for non-traditional backgrounds, underrepresented communities",
    tier: "major",
    contactInfo: { agencyNotes: "Via wonsulting.com/partnerships" },
    partnershipOpenness: "Open",
    estimatedCostMin: 15000, estimatedCostMax: 50000, estimatedCostDisplay: "$15,000–$50,000",
    suggestedDeal: "Strategic partnership: Wonsulting recommends JobFiltr to their clients + co-branded content series. Revenue share or flat fee $20,000-$35,000.",
    estimatedRevenue: "$30,000–$100,000", estimatedRevenueRaw: 65000,
    demographics: { usPercent: 70, topCountries: ["United States", "India", "Canada", "United Kingdom", "Philippines"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "3M+ total community. 30M+ monthly impressions. Jonathan has Google/Snap/Cisco background. Strong first-gen immigrant audience. Potential for deeper product integration.",
  },
  {
    id: "mj-6", name: "Greg Langstaff", avatarInitials: "GL",
    avatarGradient: "from-blue-400 to-cyan-500",
    platforms: [
      { name: "TikTok", handle: "@greglangstaff", url: "https://www.tiktok.com/@greglangstaff", followerCount: "787K" },
      { name: "Instagram", handle: "@langstaff.greg", url: "https://www.instagram.com/langstaff.greg/", followerCount: "559K" },
    ],
    primaryFollowerCount: 786900, primaryFollowerDisplay: "787K",
    niche: "Job search expert tips, resume writing (Certified Resume Strategist), interview coaching — 15+ years as recruiter",
    tier: "major",
    contactInfo: { agencyNotes: "Via linktr.ee/greglangstaff" },
    partnershipOpenness: "Open",
    estimatedCostMin: 8000, estimatedCostMax: 25000, estimatedCostDisplay: "$8,000–$25,000",
    suggestedDeal: "Sponsored TikTok + Instagram campaign. Flat fee $10,000-$18,000. Resume content pairs perfectly with JobFiltr — 'Once your resume is ready, here's how to find the right jobs.'",
    estimatedRevenue: "$15,000–$50,000", estimatedRevenueRaw: 32500,
    demographics: { usPercent: 55, topCountries: ["United States", "Canada", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "1.3M+ total following. 10.5M TikTok likes. Canadian creator. Content started 2020. Also listed in International tier for non-US reach.",
  },
  {
    id: "mj-7", name: "Linda Raynier", avatarInitials: "LR",
    avatarGradient: "from-sky-400 to-blue-600",
    platforms: [
      { name: "YouTube", handle: "Linda Raynier", url: "https://www.youtube.com/@LindaRaynier", followerCount: "998K" },
      { name: "LinkedIn", handle: "Linda Raynier", url: "https://ca.linkedin.com/in/lindaraynier", followerCount: "100K" },
      { name: "Instagram", handle: "@lindaraynier", url: "https://www.instagram.com/lindaraynier/", followerCount: "50K" },
    ],
    primaryFollowerCount: 998000, primaryFollowerDisplay: "998K",
    niche: "Executive presence, career growth to C-suite, interview coaching — LinkedIn Learning instructor, 2.5M learners",
    tier: "major",
    contactInfo: { agencyNotes: "Via lindaraynier.com contact page" },
    partnershipOpenness: "Open",
    estimatedCostMin: 10000, estimatedCostMax: 30000, estimatedCostDisplay: "$10,000–$30,000",
    suggestedDeal: "Sponsored YouTube video integration. Flat fee $12,000-$20,000. Position JobFiltr for mid-to-senior professionals looking for director/VP roles.",
    estimatedRevenue: "$20,000–$60,000", estimatedRevenueRaw: 40000,
    demographics: { usPercent: 45, topCountries: ["United States", "Canada", "India", "United Kingdom", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Nearly 1M YouTube subscribers. LinkedIn Learning instructor with 2.5M+ learners. Featured in Forbes, HuffPost, NY Post. Canadian CPA background. YouTube long-form has lasting SEO value.",
  },
  {
    id: "mj-8", name: "Vanessa Lau", avatarInitials: "VL",
    avatarGradient: "from-teal-500 to-cyan-500",
    platforms: [
      { name: "YouTube", handle: "Vanessa Lau", url: "https://www.youtube.com/@VanessaLau", followerCount: "600K" },
      { name: "Instagram", handle: "@vanessalau.co", url: "https://www.instagram.com/vanessalau.co/", followerCount: "200K" },
    ],
    primaryFollowerCount: 600000, primaryFollowerDisplay: "600K",
    niche: "Escaping 9-to-5, building online businesses, career transitions to entrepreneurship",
    tier: "major",
    contactInfo: { agencyNotes: "Via vanessalau.co/contact" },
    partnershipOpenness: "Selective",
    estimatedCostMin: 10000, estimatedCostMax: 25000, estimatedCostDisplay: "$10,000–$25,000",
    suggestedDeal: "YouTube sponsored video. Flat fee $12,000-$18,000. Angle: 'Before you quit your job, use JobFiltr to find something better first.'",
    estimatedRevenue: "$15,000–$45,000", estimatedRevenueRaw: 30000,
    demographics: { usPercent: 50, topCountries: ["United States", "Canada", "Australia", "United Kingdom", "Philippines"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Canadian entrepreneur. Ex-L'Oreal. $7M+ in business sales. Only accepts partnerships she genuinely believes in — must have genuine product fit pitch.",
  },
  {
    id: "mj-9", name: "Andrew LaCivita", avatarInitials: "AL",
    avatarGradient: "from-blue-600 to-indigo-500",
    platforms: [
      { name: "YouTube", handle: "Andrew LaCivita", url: "https://www.youtube.com/@andrewlacivita", followerCount: "350K" },
      { name: "LinkedIn", handle: "Andrew LaCivita", url: "https://www.linkedin.com/in/andrewlacivita/", followerCount: "150K" },
    ],
    primaryFollowerCount: 350000, primaryFollowerDisplay: "350K",
    niche: "Executive job search coaching, leadership development, interview prep, weekly live office hours",
    tier: "major",
    contactInfo: { email: "support@milewalk.com", agencyNotes: "support@milewalk.com" },
    partnershipOpenness: "Open",
    estimatedCostMin: 5000, estimatedCostMax: 15000, estimatedCostDisplay: "$5,000–$15,000",
    suggestedDeal: "YouTube sponsored video + weekly Office Hours mention. Flat fee $6,000-$10,000. Target his executive-level audience with JobFiltr premium features.",
    estimatedRevenue: "$10,000–$30,000", estimatedRevenueRaw: 20000,
    demographics: { usPercent: 50, topCountries: ["United States", "United Kingdom", "Canada", "India", "Germany"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Globally renowned career coach. Helped 100K+ individuals across 200 countries. Bestselling author (3 books). Founder of milewalk Academy. Weekly YouTube Live = recurring exposure.",
  },
  {
    id: "mj-10", name: "Ali Abdaal", avatarInitials: "AA",
    avatarGradient: "from-cyan-600 to-teal-500",
    platforms: [
      { name: "YouTube", handle: "Ali Abdaal", url: "https://www.youtube.com/@aliabdaal", followerCount: "5.8M" },
      { name: "Instagram", handle: "@aliabdaal", url: "https://www.instagram.com/aliabdaal/", followerCount: "1M" },
      { name: "TikTok", handle: "@aliabdaal", url: "https://www.tiktok.com/@aliabdaal", followerCount: "800K" },
    ],
    primaryFollowerCount: 5800000, primaryFollowerDisplay: "5.8M",
    niche: "Productivity, career optimization, financial freedom, health and work-life balance — British doctor turned creator",
    tier: "major",
    contactInfo: { management: "Dedicated team managing sponsorships", agencyNotes: "Via aliabdaal.com (team handles inquiries)" },
    partnershipOpenness: "Selective",
    estimatedCostMin: 50000, estimatedCostMax: 200000, estimatedCostDisplay: "$50,000–$200,000",
    suggestedDeal: "Sponsored YouTube mid-roll integration. Budget $75,000-$150,000/video. Alternatively, long-term deal at $300,000-$500,000/year for recurring mentions.",
    estimatedRevenue: "$100,000–$500,000", estimatedRevenueRaw: 300000,
    demographics: { usPercent: 35, topCountries: ["United Kingdom", "United States", "India", "Canada", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "5.8M YouTube subscribers. $1-2M annual sponsorship income. PREMIUM rates — only partners with high-quality tools. Strong UK/international audience. Halo effect would significantly boost JobFiltr credibility. EXPENSIVE but massive reach.",
  },

  // ── INTERNATIONAL ──────────────────────────────────────────────────────────
  {
    id: "int-1", name: "Ankur Warikoo", avatarInitials: "AW",
    avatarGradient: "from-green-500 to-emerald-600",
    platforms: [
      { name: "YouTube", handle: "warikoo", url: "https://www.youtube.com/@warikoo", followerCount: "3.8M" },
      { name: "Instagram", handle: "@ankurwarikoo", url: "https://www.instagram.com/ankurwarikoo/", followerCount: "2M" },
      { name: "LinkedIn", handle: "Ankur Warikoo", url: "https://www.linkedin.com/in/warikoo/", followerCount: "1.5M" },
    ],
    primaryFollowerCount: 3800000, primaryFollowerDisplay: "3.8M",
    niche: "Career management, entrepreneurship, personal growth, digital education — Indian young professional audience",
    tier: "international",
    contactInfo: { agencyNotes: "Via ankurwarikoo.com" },
    partnershipOpenness: "Open",
    estimatedCostMin: 15000, estimatedCostMax: 50000, estimatedCostDisplay: "$15,000–$50,000",
    suggestedDeal: "YouTube sponsored video + Instagram Reels targeting Indian job seekers. Budget $20,000-$35,000. Position JobFiltr for Indian professionals seeking international remote/hybrid roles.",
    estimatedRevenue: "$25,000–$80,000", estimatedRevenueRaw: 52500,
    demographics: { usPercent: 5, topCountries: ["India", "UAE", "United States", "Singapore", "United Kingdom"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "14.8M+ combined following. 4X Bestselling author. Ex-CEO of Groupon India. Fortune 40 Under 40. LinkedIn India Top Voice. 430K+ students on his platform. MASSIVE Indian audience — ideal for international expansion.",
  },
  {
    id: "int-2", name: "Dr. Dipo Awojide", avatarInitials: "DA",
    avatarGradient: "from-emerald-500 to-teal-600",
    platforms: [
      { name: "Twitter/X", handle: "@OgbeniDipo", url: "https://x.com/OgbeniDipo", followerCount: "300K" },
      { name: "LinkedIn", handle: "Dr Dipo Awojide", url: "https://www.linkedin.com/in/dipoawojide/", followerCount: "200K" },
      { name: "Instagram", handle: "@ogbenidipo", url: "https://www.instagram.com/ogbenidipo/", followerCount: "72K" },
    ],
    primaryFollowerCount: 300000, primaryFollowerDisplay: "300K",
    niche: "Career advice for Africans (esp. Nigerians) in the UK, business strategy, personal branding, employability coaching",
    tier: "international",
    contactInfo: { management: "BTDT HUB (his own organization)", agencyNotes: "Via LinkedIn or BTDT HUB website" },
    partnershipOpenness: "Open",
    estimatedCostMin: 2000, estimatedCostMax: 8000, estimatedCostDisplay: "$2,000–$8,000",
    suggestedDeal: "LinkedIn sponsored content + Twitter thread series. Budget $3,000-$5,000. Target Nigerian/African diaspora job seekers in UK, Canada, US.",
    estimatedRevenue: "$4,000–$12,000", estimatedRevenueRaw: 8000,
    demographics: { usPercent: 10, topCountries: ["Nigeria", "United Kingdom", "Canada", "Ghana", "South Africa", "United States"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "First Nigerian on LinkedIn Top Voices list. UK-based Nigerian. PhD from Loughborough University. Mentored 1,000+ people across UK, Canada, India, Nigeria, Ghana, South Africa.",
  },
  {
    id: "int-3", name: "Brigette Hyacinth", avatarInitials: "BH",
    avatarGradient: "from-teal-500 to-green-600",
    platforms: [
      { name: "LinkedIn", handle: "Brigette Hyacinth", url: "https://tt.linkedin.com/in/brigettehyacinth", followerCount: "4M" },
      { name: "Instagram", handle: "@brigettehyacinth", url: "https://www.instagram.com/brigettehyacinth/", followerCount: "50K" },
    ],
    primaryFollowerCount: 4000000, primaryFollowerDisplay: "4M",
    niche: "Leadership, HR, AI & digital transformation, career development — Caribbean/international focus",
    tier: "international",
    contactInfo: { management: "All American Speakers Bureau / AAE Speakers Bureau", agencyNotes: "Via brigettehyacinth.com or speaker bureau" },
    partnershipOpenness: "Open",
    estimatedCostMin: 5000, estimatedCostMax: 15000, estimatedCostDisplay: "$5,000–$15,000",
    suggestedDeal: "LinkedIn sponsored content series (3-5 posts). Budget $6,000-$10,000. Position JobFiltr for global professionals and emerging market job seekers.",
    estimatedRevenue: "$8,000–$25,000", estimatedRevenueRaw: 16500,
    demographics: { usPercent: 20, topCountries: ["Trinidad & Tobago", "United States", "United Kingdom", "India", "Nigeria", "Canada"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "4M+ LinkedIn followers — one of the most followed globally. Top 100 HR Influencer. Traveled 100+ countries. 6 published books. LinkedIn-heavy influence — great for professional audience targeting.",
  },
  {
    id: "int-4", name: "Richard McMunn (CareerVidz) — Intl", avatarInitials: "RM",
    avatarGradient: "from-green-400 to-teal-500",
    platforms: [
      { name: "YouTube", handle: "CareerVidz", url: "https://www.youtube.com/@CareerVidz", followerCount: "5.2M" },
      { name: "TikTok", handle: "@careervidz", url: "https://www.tiktok.com/@careervidz", followerCount: "4.6M" },
    ],
    primaryFollowerCount: 5210000, primaryFollowerDisplay: "5.2M",
    niche: "Interview preparation, job interview Q&A — UK-based with massive global reach (65% non-US audience)",
    tier: "international",
    contactInfo: { agencyNotes: "Via passmyinterview.com or how2become.com" },
    partnershipOpenness: "Open",
    estimatedCostMin: 20000, estimatedCostMax: 60000, estimatedCostDisplay: "$20,000–$60,000",
    suggestedDeal: "YouTube sponsored video + TikTok series. Budget $25,000-$40,000. UK-based but 65% international audience — great for global JobFiltr launch.",
    estimatedRevenue: "$50,000–$150,000", estimatedRevenueRaw: 100000,
    demographics: { usPercent: 35, topCountries: ["United Kingdom", "United States", "Canada", "Australia", "India", "Nigeria"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Also listed in Major tier. UK-based = strong international audience. 65% of viewers are non-US. NOTE: Runs passmyinterview.com — partnership needs careful positioning.",
  },
  {
    id: "int-5", name: "Linda Raynier — Intl", avatarInitials: "LR",
    avatarGradient: "from-emerald-400 to-green-500",
    platforms: [
      { name: "YouTube", handle: "Linda Raynier", url: "https://www.youtube.com/@LindaRaynier", followerCount: "998K" },
      { name: "LinkedIn", handle: "Linda Raynier", url: "https://ca.linkedin.com/in/lindaraynier", followerCount: "100K" },
    ],
    primaryFollowerCount: 998000, primaryFollowerDisplay: "998K",
    niche: "Career strategy for mid-to-senior professionals, executive coaching — Canadian creator with global reach",
    tier: "international",
    contactInfo: { agencyNotes: "Via lindaraynier.com" },
    partnershipOpenness: "Open",
    estimatedCostMin: 10000, estimatedCostMax: 30000, estimatedCostDisplay: "$10,000–$30,000",
    suggestedDeal: "YouTube sponsored integration. Budget $12,000-$20,000. Target Canadian and international professionals seeking executive roles.",
    estimatedRevenue: "$20,000–$60,000", estimatedRevenueRaw: 40000,
    demographics: { usPercent: 30, topCountries: ["Canada", "United States", "India", "United Kingdom", "Australia", "Philippines"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Also in Major tier. Canadian-based with 55%+ non-US audience. LinkedIn Learning instructor (2.5M learners globally). Strong in Canada, India, Philippines, Australia.",
  },
  {
    id: "int-6", name: "Greg Langstaff — Intl", avatarInitials: "GL",
    avatarGradient: "from-teal-400 to-emerald-500",
    platforms: [
      { name: "TikTok", handle: "@greglangstaff", url: "https://www.tiktok.com/@greglangstaff", followerCount: "787K" },
      { name: "Instagram", handle: "@langstaff.greg", url: "https://www.instagram.com/langstaff.greg/", followerCount: "559K" },
    ],
    primaryFollowerCount: 786900, primaryFollowerDisplay: "787K",
    niche: "Job search, resume writing, interview coaching — Canadian creator with strong UK/Australian audience",
    tier: "international",
    contactInfo: { agencyNotes: "Via linktr.ee/greglangstaff" },
    partnershipOpenness: "Open",
    estimatedCostMin: 8000, estimatedCostMax: 25000, estimatedCostDisplay: "$8,000–$25,000",
    suggestedDeal: "TikTok + Instagram sponsored content. Budget $10,000-$18,000. Canadian creator with diverse international reach.",
    estimatedRevenue: "$15,000–$50,000", estimatedRevenueRaw: 32500,
    demographics: { usPercent: 40, topCountries: ["Canada", "United States", "United Kingdom", "Australia", "New Zealand"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Also in Major tier. Canadian-based with strong anglophone international audience (60% non-US). 1.3M+ total following. Great for reaching job seekers in Canada, UK, and Australia.",
  },
  {
    id: "int-7", name: "Sho Dewan (Workhap) — Intl", avatarInitials: "SD",
    avatarGradient: "from-green-600 to-teal-500",
    platforms: [
      { name: "TikTok", handle: "@workhap", url: "https://www.tiktok.com/@workhap", followerCount: "655K" },
      { name: "LinkedIn", handle: "Sho Dewan", url: "https://www.linkedin.com/in/shodewan/", followerCount: "100K" },
    ],
    primaryFollowerCount: 654700, primaryFollowerDisplay: "655K",
    niche: "Career coaching, job search — Hong Kong-born, LA-based with strong Asian and international audience",
    tier: "international",
    contactInfo: { email: "team@workhap.com", agencyNotes: "team@workhap.com" },
    partnershipOpenness: "Open",
    estimatedCostMin: 5000, estimatedCostMax: 15000, estimatedCostDisplay: "$5,000–$15,000",
    suggestedDeal: "TikTok sponsored content targeting Asian markets. Budget $6,000-$10,000. Position JobFiltr for international job seekers.",
    estimatedRevenue: "$10,000–$35,000", estimatedRevenueRaw: 22500,
    demographics: { usPercent: 40, topCountries: ["United States", "Hong Kong", "United Kingdom", "India", "Singapore", "Australia"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "Also in Mid-Major tier. Hong Kong roots give him strong Asian market reach. Forbes contributor. 45%+ non-US audience. Great bridge between US and Asian job markets.",
  },
  {
    id: "int-8", name: "Max Klymenko", avatarInitials: "MK",
    avatarGradient: "from-emerald-600 to-green-500",
    platforms: [
      { name: "TikTok", handle: "@maxklymenko", url: "https://www.tiktok.com/@maxklymenko", followerCount: "9.1M" },
      { name: "YouTube", handle: "Max Klymenko", url: "https://www.youtube.com/@maxklymenko", followerCount: "500K" },
    ],
    primaryFollowerCount: 9100000, primaryFollowerDisplay: "9.1M",
    niche: "Careers, business, society, tech exploration — 'self-proclaimed brain of TikTok' — UK/Australia-based",
    tier: "international",
    contactInfo: { agencyNotes: "Via TikTok bio or YouTube about page" },
    partnershipOpenness: "Open",
    estimatedCostMin: 30000, estimatedCostMax: 100000, estimatedCostDisplay: "$30,000–$100,000",
    suggestedDeal: "Sponsored TikTok content. Budget $40,000-$70,000. Leverage his massive reach for brand awareness rather than direct conversion.",
    estimatedRevenue: "$50,000–$200,000", estimatedRevenueRaw: 125000,
    demographics: { usPercent: 30, topCountries: ["United Kingdom", "United States", "Australia", "Canada", "New Zealand"], ageRange: "—", primaryGender: "—" },
    status: "Not Contacted",
    notes: "9.1M TikTok followers — one of the biggest in the career/business space globally. Ukrainian-born, UK/Australia-based. 70% non-US audience. Less targeted but huge top-of-funnel potential.",
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  micro: {
    label: "Micro Influencers",
    range: "1K–50K followers",
    gradient: "from-violet-500 to-purple-600",
    badgeClass: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  },
  "mid-major": {
    label: "Mid-Major Influencers",
    range: "50K–500K followers",
    gradient: "from-amber-500 to-orange-500",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  major: {
    label: "Major Influencers",
    range: "500K+ followers",
    gradient: "from-cyan-500 to-blue-500",
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
  international: {
    label: "International Audience",
    range: "Large non-US audiences",
    gradient: "from-green-500 to-emerald-500",
    badgeClass: "bg-green-500/20 text-green-300 border-green-500/30",
  },
} as const;

const STATUS_CONFIG: Record<OutreachStatus, { label: string; class: string }> = {
  "Not Contacted": { label: "Not Contacted", class: "bg-zinc-700/60 text-zinc-400 border-zinc-600/40" },
  "Reached Out": { label: "Reached Out", class: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  "In Negotiation": { label: "In Negotiation", class: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  "Partnered": { label: "Partnered", class: "bg-green-500/20 text-green-300 border-green-500/30" },
  "Declined": { label: "Declined", class: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const OPENNESS_CONFIG: Record<PartnershipOpenness, { class: string }> = {
  Open: { class: "text-green-400" },
  Selective: { class: "text-amber-400" },
  Unknown: { class: "text-zinc-400" },
  Closed: { class: "text-red-400" },
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  YouTube: <Youtube className="h-3.5 w-3.5" />,
  TikTok: <MessageSquare className="h-3.5 w-3.5" />,
  Instagram: <Instagram className="h-3.5 w-3.5" />,
  "Twitter/X": <Twitter className="h-3.5 w-3.5" />,
  LinkedIn: <Linkedin className="h-3.5 w-3.5" />,
  Podcast: <MessageSquare className="h-3.5 w-3.5" />,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── InfluencerCard ───────────────────────────────────────────────────────────

function InfluencerCard({
  influencer,
  onStatusChange,
  onNotesChange,
}: {
  influencer: Influencer;
  onStatusChange: (id: string, status: OutreachStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tierCfg = TIER_CONFIG[influencer.tier];
  const statusCfg = STATUS_CONFIG[influencer.status];
  const opennessCfg = OPENNESS_CONFIG[influencer.partnershipOpenness];

  return (
    <motion.div variants={itemVariants} layout>
      <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className={`h-12 w-12 rounded-full bg-gradient-to-br ${influencer.avatarGradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg`}
            >
              {influencer.avatarInitials}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="font-semibold text-white text-sm">{influencer.name}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{influencer.niche}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusCfg.class}`}>
                    {statusCfg.label}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tierCfg.badgeClass}`}>
                    {tierCfg.label}
                  </span>
                </div>
              </div>

              {/* Platforms */}
              <div className="flex flex-wrap gap-2 mt-2">
                {influencer.platforms.map((p) => (
                  <a
                    key={p.name + p.handle}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md border border-white/10 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {PLATFORM_ICONS[p.name]}
                    <span>{p.handle}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-400">{p.followerCount}</span>
                    <ExternalLink className="h-2.5 w-2.5 text-zinc-500" />
                  </a>
                ))}
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1 text-zinc-300">
                  <Users className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="font-medium">{influencer.primaryFollowerDisplay}</span>
                  <span className="text-zinc-500">primary</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-300">
                  <DollarSign className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="font-medium">{influencer.estimatedCostDisplay}</span>
                  <span className="text-zinc-500">est. cost</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-300">
                  <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="font-medium">{influencer.estimatedRevenue}</span>
                  <span className="text-zinc-500">est. revenue</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-zinc-500" />
                  <span className={`font-medium ${opennessCfg.class}`}>{influencer.partnershipOpenness}</span>
                  <span className="text-zinc-500">openness</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="text-zinc-500 hover:text-white transition-colors flex-shrink-0 mt-1"
            >
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="border-t border-white/10 mt-4 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Info */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Contact Info</h5>
                    {influencer.contactInfo.email && (
                      <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <Mail className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{influencer.contactInfo.email}</span>
                      </div>
                    )}
                    {influencer.contactInfo.management && (
                      <div className="flex items-start gap-2 text-xs text-zinc-300">
                        <Phone className="h-3.5 w-3.5 text-zinc-500 mt-0.5" />
                        <span>{influencer.contactInfo.management}</span>
                      </div>
                    )}
                    {influencer.contactInfo.agencyNotes && (
                      <p className="text-xs text-zinc-500 italic pl-5">{influencer.contactInfo.agencyNotes}</p>
                    )}
                  </div>

                  {/* Audience Demographics */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Audience Demographics</h5>
                    <div className="flex items-center gap-2 text-xs">
                      <Globe className="h-3.5 w-3.5 text-zinc-500" />
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-zinc-300">US Audience</span>
                          <span className="text-white font-medium">{influencer.demographics.usPercent}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                            style={{ width: `${influencer.demographics.usPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400">
                      <span className="text-zinc-500">Top countries: </span>
                      {influencer.demographics.topCountries.join(", ")}
                    </div>
                  </div>

                  {/* Suggested Deal */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Suggested Deal</h5>
                    <div className="flex items-start gap-2 text-xs text-zinc-300 bg-white/5 rounded-lg p-3 border border-white/10">
                      <Handshake className="h-3.5 w-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
                      <p>{influencer.suggestedDeal}</p>
                    </div>
                  </div>

                  {/* Status & Notes */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Outreach Status & Notes</h5>
                    <Select
                      value={influencer.status}
                      onValueChange={(v) => onStatusChange(influencer.id, v as OutreachStatus)}
                    >
                      <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {(Object.keys(STATUS_CONFIG) as OutreachStatus[]).map((s) => (
                          <SelectItem key={s} value={s} className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Add notes about this outreach..."
                      value={influencer.notes}
                      onChange={(e) => onNotesChange(influencer.id, e.target.value)}
                      className="h-20 bg-white/5 border-white/10 text-xs text-zinc-300 placeholder:text-zinc-600 resize-none"
                    />
                  </div>

                  {/* Research Notes */}
                  {influencer.notes && (
                    <div className="space-y-2 md:col-span-2">
                      <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Research Notes</h5>
                      <p className="text-xs text-zinc-400 bg-white/5 rounded-lg p-3 border border-white/10 leading-relaxed">
                        {influencer.notes}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── TierSection ──────────────────────────────────────────────────────────────

function TierSection({
  tier,
  influencers,
  onStatusChange,
  onNotesChange,
}: {
  tier: keyof typeof TIER_CONFIG;
  influencers: Influencer[];
  onStatusChange: (id: string, status: OutreachStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const cfg = TIER_CONFIG[tier];
  if (influencers.length === 0) return null;

  const partnered = influencers.filter((i) => i.status === "Partnered").length;
  const active = influencers.filter((i) => i.status === "Reached Out" || i.status === "In Negotiation").length;

  return (
    <motion.div variants={itemVariants} className="space-y-3">
      <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between group">
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${cfg.gradient}`} />
          <span className="text-white font-semibold text-sm">{cfg.label}</span>
          <span className="text-zinc-500 text-xs">{cfg.range}</span>
          <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
            {influencers.length}
          </span>
          {partnered > 0 && (
            <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full">
              {partnered} partnered
            </span>
          )}
          {active > 0 && (
            <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
              {active} active
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-zinc-500 group-hover:text-white transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 overflow-hidden"
          >
            {influencers.map((inf) => (
              <InfluencerCard
                key={inf.id}
                influencer={inf}
                onStatusChange={onStatusChange}
                onNotesChange={onNotesChange}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── OutreachTab ──────────────────────────────────────────────────────────────

export function OutreachTab() {
  const [influencers, setInfluencers] = useState<Influencer[]>(INFLUENCERS);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("tier");

  const handleStatusChange = (id: string, status: OutreachStatus) =>
    setInfluencers((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));

  const handleNotesChange = (id: string, notes: string) =>
    setInfluencers((prev) => prev.map((i) => (i.id === id ? { ...i, notes } : i)));

  const filtered = useMemo(() => {
    let list = [...influencers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || i.niche.toLowerCase().includes(q) ||
          i.platforms.some((p) => p.handle.toLowerCase().includes(q))
      );
    }
    if (filterTier !== "all") list = list.filter((i) => i.tier === filterTier);
    if (filterStatus !== "all") list = list.filter((i) => i.status === filterStatus);
    if (filterPlatform !== "all") list = list.filter((i) => i.platforms.some((p) => p.name === filterPlatform));
    if (sortBy === "followers-desc") list.sort((a, b) => b.primaryFollowerCount - a.primaryFollowerCount);
    else if (sortBy === "followers-asc") list.sort((a, b) => a.primaryFollowerCount - b.primaryFollowerCount);
    else if (sortBy === "cost-asc") list.sort((a, b) => a.estimatedCostMin - b.estimatedCostMin);
    else if (sortBy === "cost-desc") list.sort((a, b) => b.estimatedCostMin - a.estimatedCostMin);
    else if (sortBy === "revenue-desc") list.sort((a, b) => b.estimatedRevenueRaw - a.estimatedRevenueRaw);
    else {
      const order = { micro: 0, "mid-major": 1, major: 2, international: 3 };
      list.sort((a, b) => order[a.tier] - order[b.tier]);
    }
    return list;
  }, [influencers, search, filterTier, filterStatus, filterPlatform, sortBy]);

  const stats = useMemo(() => {
    const all = influencers;
    const n = all.length;
    const avgCostMin = Math.round(all.reduce((s, i) => s + i.estimatedCostMin, 0) / n);
    const avgCostMax = Math.round(all.reduce((s, i) => s + i.estimatedCostMax, 0) / n);
    const totalRevMin = all.reduce((s, i) => {
      const m = i.estimatedRevenue.match(/\$([0-9,]+)/);
      return s + (m ? parseInt(m[1].replace(/,/g, "")) : 0);
    }, 0);
    const totalRevMax = all.reduce((s, i) => {
      const matches = [...i.estimatedRevenue.matchAll(/\$([0-9,]+)/g)];
      const last = matches[matches.length - 1];
      return s + (last ? parseInt(last[1].replace(/,/g, "")) : 0);
    }, 0);
    const contacted = all.filter((i) => i.status !== "Not Contacted").length;
    const partnered = all.filter((i) => i.status === "Partnered").length;
    return { total: n, avgCostMin, avgCostMax, totalRevMin, totalRevMax, contacted, partnered };
  }, [influencers]);

  const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

  const groupedByTier = useMemo(() => {
    return (["micro", "mid-major", "major", "international"] as const).map((tier) => ({
      tier,
      influencers: filtered.filter((i) => i.tier === tier),
    }));
  }, [filtered]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Summary Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-violet-400" />
              <span className="text-xs text-zinc-400">Total Influencers</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stats.contacted} contacted</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-zinc-400">Avg. Est. Cost</span>
            </div>
            <p className="text-2xl font-bold text-white">{fmt(stats.avgCostMin)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">up to {fmt(stats.avgCostMax)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-zinc-400">Total Est. Revenue</span>
            </div>
            <p className="text-2xl font-bold text-white">{fmt(stats.totalRevMin)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">up to {fmt(stats.totalRevMax)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Handshake className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-zinc-400">Active Outreach</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.contacted}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stats.partnered} partnered</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search by name, niche, or handle..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-sm text-white placeholder:text-zinc-600 h-9"
                />
              </div>
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="w-40 h-9 bg-white/5 border-white/10 text-xs text-zinc-300">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-zinc-500" />
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">All Tiers</SelectItem>
                  <SelectItem value="micro" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">Micro (1K–50K)</SelectItem>
                  <SelectItem value="mid-major" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">Mid-Major (50K–500K)</SelectItem>
                  <SelectItem value="major" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">Major (500K+)</SelectItem>
                  <SelectItem value="international" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">International</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 h-9 bg-white/5 border-white/10 text-xs text-zinc-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">All Statuses</SelectItem>
                  {(Object.keys(STATUS_CONFIG) as OutreachStatus[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-36 h-9 bg-white/5 border-white/10 text-xs text-zinc-300">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">All Platforms</SelectItem>
                  {(["YouTube", "TikTok", "Instagram", "Twitter/X", "LinkedIn", "Podcast"] as const).map((p) => (
                    <SelectItem key={p} value={p} className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44 h-9 bg-white/5 border-white/10 text-xs text-zinc-300">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5 text-zinc-500" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="tier" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">Sort: By Tier</SelectItem>
                  <SelectItem value="followers-desc" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">Sort: Most Followers</SelectItem>
                  <SelectItem value="followers-asc" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">Sort: Fewest Followers</SelectItem>
                  <SelectItem value="cost-asc" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">Sort: Lowest Cost</SelectItem>
                  <SelectItem value="cost-desc" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">Sort: Highest Cost</SelectItem>
                  <SelectItem value="revenue-desc" className="text-xs text-zinc-300 focus:bg-white/10 focus:text-white">Sort: Highest Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filtered.length !== influencers.length && (
              <p className="text-xs text-zinc-500 mt-2">
                Showing {filtered.length} of {influencers.length} influencers
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Influencer Sections */}
      <div className="space-y-8">
        {sortBy === "tier"
          ? groupedByTier.map(({ tier, influencers: list }) => (
              <TierSection
                key={tier}
                tier={tier}
                influencers={list}
                onStatusChange={handleStatusChange}
                onNotesChange={handleNotesChange}
              />
            ))
          : filtered.map((inf) => (
              <InfluencerCard
                key={inf.id}
                influencer={inf}
                onStatusChange={handleStatusChange}
                onNotesChange={handleNotesChange}
              />
            ))}
      </div>

      {filtered.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-16 text-zinc-500">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No influencers match your filters.</p>
          <button
            onClick={() => { setSearch(""); setFilterTier("all"); setFilterStatus("all"); setFilterPlatform("all"); }}
            className="mt-2 text-xs text-cyan-400 hover:underline"
          >
            Clear all filters
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
