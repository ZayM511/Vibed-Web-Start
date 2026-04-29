# Outreach Tab Revamp — Design Spec

**Date:** 2026-04-28
**Author:** Isaiah Malone (with Claude)
**Status:** Draft — pending user review
**Scope:** `app/admin` → Outreach tab (full revamp)

---

## 1. Background

JobFiltr launched its Chrome extension and website in early April 2026 and posted on Product Hunt the week of April 21. The Outreach tab in the admin dashboard contains:

- A roster of 38 creator/influencer prospects across 4 tiers (micro / mid-major / major / international) in `components/admin/OutreachTab.tsx`
- A `BudgetAnalyzer` (in `components/admin/BudgetAnalyzer.tsx`) that scores each creator and generates a cold outreach message using one of 3 hardcoded templates
- A `ProductHuntCampaignCard` (in `components/admin/ProductHuntCampaignCard.tsx`) — *not in scope for this revamp*

Two problems with the current state:

1. **The 3 cold-email templates are pre-launch.** They use placeholder `[Your Name]`, frame JobFiltr as "we built it," and don't reflect April 2026 reality (live Chrome Web Store listing, Product Hunt launch, $49 lifetime deal pricing, "Filtr your job search" positioning).
2. **The 38 creator profiles are stale.** Follower counts, agency reps, partnership openness, and 2026 creator-economy rates have all shifted since the original research.

## 2. Goals

- Rewrite all outreach messages with April 2026 positioning that's honest about JobFiltr's just-launched-with-low-traction reality
- Generate per-creator personalized messages (cold, follow-up, break-up) for email, plus DM variants for LinkedIn / Twitter / Instagram / TikTok where DM is the documented best contact channel
- Refresh the 38 creator profiles via a deep live-data audit
- Identify 5-10 emerging creator candidates worth adding to the roster
- Apply consistent humanization rules at write time so messages don't trigger AI-detection heuristics
- Make the new content easy to display, copy, and edit in the existing admin UI

## 3. Non-goals

- Migrating message storage to Convex backend (stays as static TypeScript file for now — local source of truth)
- Building runtime AI generation (deferred; pre-baked content is the v1)
- Redesigning the Product Hunt Campaign card or other admin tabs
- Sending the emails (the tab provides copy-ready content; sending happens in the user's email client)

## 4. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Full revamp (templates + sequences + DM variants + audit + per-creator subject + sender selector) | User chose option C |
| Voice | Hybrid (honest about early-stage, professional in delivery, leads with insight) | Best fit for solo-founder reality + creator psychology |
| Positioning | Multi-dimensional umbrella ("job search power tool") + per-creator feature spotlight | JobFiltr is broader than ghost-job detection; creators care about different features |
| Sender | Tier-based: `isaiah@jobfiltr.app` for micro/mid-major; `isaiah@groundworklabs.io` for major/international | Smaller creators relate to peer founders; larger creators expect "real company" signaling |
| Audit depth | Deep — verify follower counts, contact info, brand-deal signals, openness, 2026 cost rates, dedicated partnership contact | User explicitly chose deepest audit |
| Sequence | Multi-channel 3-touch: email cold + follow-up D+4 + break-up D+10, plus standalone DM variants for creators reachable only by DM | ~30% of creators have no email; DM-only outreach is required |
| Generation approach | Pre-baked, hand-crafted (Approach A) — all content baked into a static file | Honors "humanize to prevent AI detection" requirement; avoids runtime AI calls |
| Compensation framing | No dollar amounts in cold emails. Tier-aware soft offer: micro = "free lifetime Pro" only; mid+ = "free Pro + open to affiliate"; major = "free Pro + open to discuss sponsored on your terms" | Transactional cold emails kill reply rate |

## 5. Architecture

### 5.1 Files touched

| File | Change |
|---|---|
| `lib/outreach-content.ts` *(new)* | Exports `OUTREACH_CONTENT: Record<influencerId, OutreachContent>` — all baked messages live here |
| `components/admin/OutreachTab.tsx` | Extend `Influencer` type to reference outreach content; add "Outreach Messages" expandable section per creator card with channel tabs and copy/edit-in-place |
| `components/admin/BudgetAnalyzer.tsx` | Replace `generateMessage()` to look up baked content from `lib/outreach-content.ts`; remove the 3 hardcoded template strings; remove the regenerate-template button (no template cycling once baked) |

### 5.2 Data model

```ts
// lib/outreach-content.ts

export type SenderEmail = "isaiah@jobfiltr.app" | "isaiah@groundworklabs.io";

export type OutreachChannel = "email" | "linkedin" | "twitter" | "instagram" | "tiktok";

export type OutreachContent = {
  sender: SenderEmail;
  primaryChannel: OutreachChannel;
  featureSpotlight: string;       // 1-line note: which JobFiltr feature this creator's audience cares most about

  email: {
    coldSubject: string;
    coldBody: string;
    followupSubject: string;     // typically "re: <coldSubject>"
    followupBody: string;
    breakupSubject: string;
    breakupBody: string;
  };

  dm?: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
  };

  notes?: string;                  // hand-written hints / context for future iterations
  lastUpdated: string;             // ISO date — when the content was last regenerated
};

export const OUTREACH_CONTENT: Record<string, OutreachContent> = {
  "mc-1": { /* Adunola Adeshola — full content */ },
  "mc-2": { /* Mandy Tang — full content */ },
  // ... 38+ entries
};
```

The existing `Influencer` type in `OutreachTab.tsx` does **not** get a new field; it references content via `id` lookup. This keeps the influencer roster compact and the content file independently editable.

### 5.3 UI changes (Outreach tab)

Each `InfluencerCard` (when expanded) gets a new **"Outreach Messages"** section, placed after "Suggested Deal" and before "Outreach Status & Notes":

```
┌─ Outreach Messages ────────────────────────────────────────┐
│  Sender: isaiah@jobfiltr.app   |   Last updated: 2026-04-28 │
│  Feature spotlight: "Salary filtering aligns with audience" │
│                                                              │
│  [ Email ] [ LinkedIn DM ] [ Twitter DM ]   ← channel tabs  │
│                                                              │
│  Cold (D+0)        [Subject: ...]      [📋 Copy] [✏ Edit]  │
│  Follow-up (D+4)   [Subject: re: ...]  [📋 Copy] [✏ Edit]  │
│  Break-up (D+10)   [Subject: ...]      [📋 Copy] [✏ Edit]  │
└──────────────────────────────────────────────────────────────┘
```

- Channel tabs only render the channels that have content for that creator
- Copy buttons use the existing `useCopyFeedback` hook
- Edit-in-place: same pattern as `ProductHuntCampaignCard`'s editable maker comment (textarea, Save/Cancel)
- Edits persist to localStorage keyed by `influencerId + variant` so user changes survive page reloads

### 5.4 BudgetAnalyzer integration

The Budget Analyzer's "Cold Outreach Message" panel already shows a single message per scored creator. After this revamp it pulls from `OUTREACH_CONTENT[influencerId].email.coldBody` instead of `generateMessage()`. The "regenerate" button is removed (no template variants to cycle through anymore — there's one canonical message per creator).

## 6. Content strategy

### 6.1 Cold email — 6-beat structure

1. **Hook** (1 sentence): personalized to recent content or niche-specific stat
2. **Context** (1-2 sentences): the umbrella problem
3. **Pivot** (1 sentence): "I built JobFiltr — it's a job search power tool that…" + 3-4 feature scan
4. **Spotlight** (1-2 sentences): the ONE feature most relevant to their audience
5. **Honest context** (1 sentence): "just launched on Product Hunt last week, building it solo, in early-user mode"
6. **Ask** (1 sentence): low-friction CTA — "would you be open to me sending you a free lifetime Pro to try?"

### 6.2 Length targets

| Variant | Target words |
|---|---|
| Cold email | 110-160 |
| Follow-up D+4 | 35-60 |
| Break-up D+10 | 40-70 |
| LinkedIn DM | 60-100 |
| Twitter / IG / TikTok DM | 40-80 |

### 6.3 Tone scaling per tier

- **Micro** → "fellow indie person reaching out" (casual, peer)
- **Mid-major** → warm professional (founder respecting their time)
- **Major** → structured, manager-forwardable
- **International** → tier-appropriate + light regional acknowledgment

### 6.4 Feature-spotlight mapping (examples — full mapping built per-creator in Phase 3)

| Creator type | Feature spotlit |
|---|---|
| Salary transparency creators (e.g., Hannah Williams) | Filter listings by salary so audience applies only to roles meeting pay benchmarks |
| HR/recruiter insiders (e.g., Madeline Mann, Farah Sharghi) | 50+ ghost-job signals — "would love your hiring-manager perspective on accuracy" |
| Negotiation creators (e.g., Hanna Goefft) | Hides spam/staffing reposts so audience spends energy on negotiation, not noise |
| Anti-toxic-workplace (e.g., HR Manifesto) | Zero data collection — "built for people who already distrust LinkedIn" |
| General career (e.g., Erin McGoff) | Full power-tool umbrella — multiple features at once |
| International (e.g., Ankur Warikoo) | Ghost detection works across regions; bias-free filters |

### 6.5 Approved stats / phrases for outreach

From the live JobFiltr site and PH listing — only verified facts go into emails:

- "27.4% of job listings are ghost jobs with no intent to hire"
- "70% of all ghost jobs are posted on LinkedIn / 49% on Indeed"
- "Direct company applications have a 4x higher success rate than job board applications"
- "50+ signals to detect ghost jobs in real time"
- "Zero tracking, zero data collection — we analyze the job postings, not the people using our tool"

Stats not approved (no fabricated traction): "thousands of users," "growing fast," "loved by recruiters," etc. Until real numbers exist, we lean on market stats, not user counts.

## 7. Humanization rules (write-time)

Every message must pass these 9 rules before shipping:

1. **No em-dashes (—).** Use commas, parens, or sentence breaks.
2. **Mix sentence lengths heavily.** Fragments alongside longer sentences. Avoid uniform 12-18 word sentences.
3. **Banned AI-tells:** *leverage, delve, robust, seamless, dive into, unlock, elevate, in today's landscape, navigate the complexities*.
4. **No three-clause structures** ("not just X, but Y, and Z"). Pick one.
5. **Inconsistent contractions** within a single message ("won't" / "will not" mixed).
6. **Specific concrete details** that prove human attention (recent video, bio quirk, audience stat).
7. **One genre cue per email** — casual aside, parenthetical, "(no idea if this lands but…)".
8. **Subject lines:** lowercase, under 45 chars, no punctuation pile-ups.
9. **Vary openings across the batch.** Not every email starts "Hey [name]".

**Plus banned formulaic openers:** "I hope this finds you well," "I came across your content," "I've been a fan."

A reviewer sub-agent does a second-pass scan for rule violations; the human author (Isaiah / Claude) does the final read.

## 8. Audit workflow

### 8.1 What gets verified per creator (6 fields)

1. **Current follower counts** on every listed platform (live WebFetch on profile URL → extract count)
2. **Contact info still resolves** (email bounces, agency website live, bio link intact)
3. **Recent brand-deal signals** — last 30-60 days for: sponsored competitor (red flag), recent paid partnerships at all (active signal), career-tool sponsorships specifically (great signal)
4. **Refreshed partnership openness** — Open / Selective / Unknown / Closed, re-rated based on activity
5. **2026 cost estimate refresh** — creator economy rates are up ~15-25% since original research; pull from passionfroot/agency pages where published
6. **Dedicated partnership/promo contact** — separate "for opportunities" email, sponsorships page, or media kit URL distinct from general contact

### 8.2 Subagent dispatch plan

- **5 verification agents** (8-9 creators each, grouped by tier so agents can cross-compare rates)
- **1 emerging-creators agent** — find 5-10 new prospects: career creators above 50K followers who broke out since late 2025
- All run in parallel
- Each agent receives: list of creators, the 6-field rubric, JSON output schema, instruction to mark `null` on anything not visible (no fabrication)
- Estimated runtime: 25-40 min parallel
- Each agent writes findings to a temp file; results merged before review

### 8.3 Audit output

A diff report shown to user before any data changes:

```
Adunola Adeshola
  Instagram followers: 54K → 71K (+17K)
  ⚠ Sponsored Teal HQ Mar 2026 — competitor signal
  Openness: Open → Selective
  Cost: $500-$2K → $750-$3K (2026 rates)
  Partnership contact: NEW — partnerships@employeeredefined.com

Hannah Williams
  TikTok: 1.3M → 1.4M (+100K)
  Recent deals: own brand only, no competitor
  Cost: $30K-$100K → $40K-$120K
  ...

NEW CANDIDATES (from emerging agent):
  - [Creator name] — 180K TikTok, broke out Q4 2025, niche fit, partnership openness: ...
  - ...
```

User approves the diff (or strikes specific changes) before changes apply to `INFLUENCERS`.

### 8.4 Caveats

- Live follower-count scraping on TikTok/Instagram is sometimes blocked. Where blocked, agents fall back to Perplexity search ("[creator name] TikTok followers April 2026") and report with confidence rating
- For ~5-10 creators where this happens, expect "follower count: estimated, not verified" notes
- Emerging-creators agent works from search results + LinkedIn Top Voices in career niche; may surface candidates not yet on user's radar

## 9. Build sequence

| Phase | Description | Estimated time |
|---|---|---|
| 1 | Deep audit (6 parallel agents) | 30-45 min |
| 2 | **Checkpoint:** audit diff review with user; apply approved changes | 10 min |
| 3 | Content generation (4 parallel agents, one per tier) | 30-45 min |
| 4 | Humanization review (reviewer agent + manual) | 30-45 min |
| 5 | **Checkpoint:** sample of finished messages reviewed by user | 10 min |
| 6 | Implementation: create `lib/outreach-content.ts`, update `OutreachTab.tsx` + `BudgetAnalyzer.tsx`, render new UI | 20-30 min |
| 7 | **Checkpoint:** verification with `npm run dev`, final UI walkthrough | 10-15 min |

**Total: ~2.5-3.5 hours** (mostly parallel agent time + 3 user checkpoints)

## 10. Open questions / risks

- **Risk:** Live scraping blocks for some creators may force estimated follower counts. Mitigation: report a confidence rating in the audit diff and in the creator's `notes` field, accept partial verification rather than drop the creator entirely.
- **Risk:** AI-detection heuristics evolve. The 9 humanization rules are based on April 2026 best practices; some may go stale by late 2026. Mitigation: store rules in this spec and regenerate batch if detection becomes a problem.
- **Risk:** A reviewer agent may miss subtle rule violations. Mitigation: human (Isaiah) reads every message before commit. Sample-check in Phase 5 surfaces systemic issues.
- **Open question:** Should there be a UI affordance to mark a creator as "do not contact" (e.g., they sponsored a direct competitor)? Could be a future addition; not in v1 scope.

## 11. Success criteria

- All 38 creators (or 38 + emerging additions) have complete, hand-crafted outreach content for at least one channel
- Every message passes the 9 humanization rules
- The new "Outreach Messages" UI section renders correctly per tier with channel tabs and working copy/edit
- `BudgetAnalyzer` cold-message panel pulls from baked content (no template cycling)
- Influencer follower counts and partnership-openness ratings reflect April 2026 reality
- User can read a sample message in the UI and feel confident sending it as-is
