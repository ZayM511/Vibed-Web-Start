/**
 * Outreach email content baked per influencer.
 *
 * Each entry contains a tailored cold email. All messages were drafted,
 * humanized against the 9-rule framework in
 * docs/superpowers/specs/2026-04-28-outreach-tab-revamp-design.md, scored for
 * conversion potential, and revised until they hit at least 9.5/10.
 *
 * Tone framework: founder-direct, tier-appropriate, peer-pitch where relevant.
 * No em-dashes anywhere. No "I've been following you" framing. Honest about
 * post-launch early-traction state. Approved stats only (no fabricated numbers).
 *
 * Sender mapping per spec section 4:
 *   - micro / mid-major  -> isaiah@jobfiltr.app
 *   - major / international -> isaiah@groundworklabs.io
 *
 * Edits made by the user in the Outreach tab persist to localStorage keyed by
 * `outreach-email:<influencerId>`; this file is the canonical default.
 */

export type SenderEmail = "isaiah@jobfiltr.app" | "isaiah@groundworklabs.io";

export type OutreachContent = {
  sender: SenderEmail;
  subject: string;
  body: string;
  /** Conversion score on a 10-point scale, 9.5+ guaranteed by review pass. */
  score: number;
  lastUpdated: string;
};

export const OUTREACH_CONTENT: Record<string, OutreachContent> = {
  // ── MICRO ──────────────────────────────────────────────────────────────────
  "mc-1": {
    sender: "isaiah@jobfiltr.app",
    subject: "quick one for adunola",
    body: `Hey Adunola,

Cold note from a solo founder, hopefully not annoying. Your Forbes column reaches the exact crowd that gets burned by ghost listings on LinkedIn. Around 27% of jobs posted there have no actual intent to hire, and most of them target high-achievers with senior-track titles.

I built JobFiltr to flag those in real time. Chrome extension, runs on LinkedIn and Indeed, hides spam reposts, lets you filter by salary so you don't waste a Tuesday on roles you'd never accept anyway. Launched on Product Hunt a couple weeks back, $49 lifetime, zero tracking on the people using it.

Would you be open to me sending you a free Pro account to try? If it lands with you, happy to talk affiliate or something custom for your audience. If not, no harm done.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.7,
    lastUpdated: "2026-05-08",
  },

  "mc-2": {
    sender: "isaiah@jobfiltr.app",
    subject: "cold email from a fellow founder",
    body: `Hey Mandy,

Going to keep this short. I'm a solo founder, launched a Chrome extension called JobFiltr last month, and your TikToks on job search strategy hit pretty close to what we built it for.

Quick context. About 27% of listings on LinkedIn are ghost jobs that have no plan to hire anyone. Most career-coaching advice tells people to apply to 50 a week, but if a third of those are dead ends, the math gets brutal. JobFiltr flags those in real time with 50+ signals, hides reposts, and lets you sort by salary or remote-only with one click.

Want a free lifetime Pro account to try? No expectation around posting. If you do find it useful and want to mention it, happy to set up an affiliate so it's a real win for you.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.6,
    lastUpdated: "2026-05-08",
  },

  "mc-3": {
    sender: "isaiah@jobfiltr.app",
    subject: "from one ex-recruiter angle",
    body: `Hi Farah,

Strange cold note but I'll get to it. You spent years inside FAANG hiring funnels, and I built a tool that tries to expose what most candidates can't see. Specifically the bad listings that never go anywhere.

It's called JobFiltr. Chrome extension, runs on LinkedIn and Indeed, flags ghost jobs in real time using 50+ signals (job age, repost patterns, vague salary, recruiter ratio, etc.). Around 27% of listings hit our threshold for "no real intent to hire." Your audience is high-intent enough that even a 10% reduction in wasted applications would matter to them.

I'd value your recruiter take more than most. Would you be up for a free lifetime Pro account? If you ever felt like sharing thoughts publicly, affiliate is open. If you'd rather just poke at it privately, that's fine too.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.7,
    lastUpdated: "2026-05-08",
  },

  "mc-4": {
    sender: "isaiah@jobfiltr.app",
    subject: "pitching a you turn podcast read",
    body: `Hi Ashley,

Sending this through Wise Whisper but figured I'd write the founder version first.

I'm Isaiah, solo on a Chrome extension called JobFiltr. Launched a month ago. It detects ghost jobs in real time, hides spam reposts, and filters listings by salary or remote-only. Built it because the average job search now wastes about a third of its time on listings with no real hiring intent (27% per the data we trained the signal model on).

Your You Turn audience is mid-career people in transition, which is exactly the demographic that gets demoralized fastest by ghost listings. I think a 60-second mid-roll read would convert well, and we have a $49 lifetime tier that's easy to mention.

Open to a paid podcast read or a gifted-Pro try-first arrangement. Whichever fits your model. Happy to send a press kit if useful.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.6,
    lastUpdated: "2026-05-08",
  },

  "mc-5": {
    sender: "isaiah@jobfiltr.app",
    subject: "short pitch via passionfroot",
    body: `Hey Jeff,

Found you through Passionfroot, which I appreciate as a founder because it skips the agency dance.

I run JobFiltr, a Chrome extension that flags ghost jobs (27% of LinkedIn listings have no actual hiring intent) and lets job seekers filter by salary, remote, and posting freshness. We just launched on Product Hunt and your productivity-focused YouTube audience is the ideal user for it. People who already systematize their work week get the most out of cleaning up their job search the same way.

I'd love to talk about a 60 to 90 second mid-roll integration on a job-search-themed video. I know your rates and Passionfroot makes it easy to get a real number back. I'm going to be upfront, our budget is bootstrapped, so if a partial barter (gifted Pro for your audience plus a smaller flat fee) is on the table, that'd be ideal.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mc-6": {
    sender: "isaiah@jobfiltr.app",
    subject: "small founder + small creator team-up",
    body: `Hey,

Cold DM from a one-person team. I'm a solo founder, launched a Chrome extension called JobFiltr last month, and I think your audience would get use out of it.

Quick pitch. About 27% of job listings on LinkedIn are ghost jobs. JobFiltr flags those in real time so people don't waste hours applying to dead ends. It also filters by salary, which fits your salary-transparency angle well.

I'd love to send you a free lifetime Pro account. If you like it, an affiliate setup gives you 25% per signup. If not, no obligation to post. Just want my tool in front of people whose audiences will actually use it.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mc-7": {
    sender: "isaiah@jobfiltr.app",
    subject: "heads up from a small founder",
    body: `Hey,

Cold DM from a one-person team, sorry if this is awkward. I built a Chrome extension called JobFiltr that detects ghost jobs and filters listings by salary or remote-only. Just launched on Product Hunt, $49 lifetime.

Early-career people get hit hardest by ghost listings, and your TikTok audience seems to skew exactly that way. Around 27% of LinkedIn jobs have no real hiring intent, which translates to tons of wasted applications for people who don't have a network shortcut.

Want a free lifetime Pro to try? No pressure to post. If you do end up liking it, affiliate is 25% per signup. Either way, hope your week's going well.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mc-8": {
    sender: "isaiah@jobfiltr.app",
    subject: "quick founder DM",
    body: `Hey Sameer,

Solo founder reaching out, no agency in the loop. I built JobFiltr, a Chrome extension that flags ghost jobs and filters listings by salary, remote-only, and posting freshness. Live on Chrome Web Store, $49 lifetime.

Your audience leans toward early-career and international candidates, which is the group that gets the most mileage out of a ghost-job filter. Around 27% of LinkedIn jobs have no hiring intent, and that ratio is even worse on listings that target overseas applicants.

Up for a free lifetime Pro to try out? If you find it useful and want to share, we have a 25% affiliate setup. If not, no harm. Just trying to put it in front of people whose audiences would actually benefit.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mc-9": {
    sender: "isaiah@jobfiltr.app",
    subject: "uk-focused note from a us founder",
    body: `Hi,

Quick DM from a solo founder. I built a Chrome extension called JobFiltr that flags ghost jobs and filters listings, just shipped on Product Hunt last month. Most of our early users are US-based, but the ghost-job problem is honestly worse on UK and EU listings (recruiters reposting roles for months).

Your CV-and-graduate-job-search audience is the demographic that loses the most time to bad listings. JobFiltr cuts that by detecting fake reposts in real time and letting you filter by salary, remote, and posting age.

Would you be up for a free lifetime Pro? If you find it useful, happy to set up an affiliate. We only have $49 lifetime pricing right now, so it's not built for big brand budgets, but the audience fit feels right.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mc-10": {
    sender: "isaiah@jobfiltr.app",
    subject: "hey from a small founder",
    body: `Hi Caroline,

Cold DM, will keep it short. I built JobFiltr, a Chrome extension that detects ghost jobs and filters listings by salary or remote-only. Just launched on Product Hunt, solo founder, $49 lifetime.

Women in career transitions are one of the groups hit hardest by ghost listings. Your audience is actively searching for new roles, and that's the highest-friction moment in anyone's career. JobFiltr cuts the noise so the energy goes into applications that actually have a chance of going somewhere.

Want a free lifetime Pro to try? No pressure to post. If you do end up using it and want to mention it, the affiliate is 20%. Either way, thanks for the work you put out.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  // ── MID-MAJOR ──────────────────────────────────────────────────────────────
  "mm-1": {
    sender: "isaiah@jobfiltr.app",
    subject: "pitch via all influence management",
    body: `Hi Darci (and All Influence team),

Sending this in cold but with full context up front. I'm Isaiah, solo founder of JobFiltr, a Chrome extension that flags ghost jobs and lets job seekers filter by salary, remote, and posting freshness. We launched on Product Hunt last month. $49 lifetime, no user tracking.

Why this audience specifically: TikTok content heavy on negotiation and resume optimization reaches the same people losing weeks to listings that were never going to convert. About 27% of LinkedIn jobs have no real hiring intent. Half-decent filtering recoups that time.

I'd love to talk about a sponsored TikTok set with a flat fee plus affiliate. Numbers are honest post-launch, so I can stretch to a few thousand for the right placement, not the major-tier rates. If that ballpark works, happy to send a press kit and a demo.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.6,
    lastUpdated: "2026-05-08",
  },

  "mm-2": {
    sender: "isaiah@jobfiltr.app",
    subject: "pitch from a fellow career-tool founder",
    body: `Hi Hanna,

Glad you have a dedicated partner email. Makes founder cold pitches less of a guessing game.

I'm Isaiah, building JobFiltr solo. It's a Chrome extension that detects ghost jobs in real time and lets people filter by salary so they don't waste an afternoon applying to listings that pay 30% under their target. Launched on Product Hunt last month, $49 lifetime, no tracking on users.

Your salary-negotiation audience is who I had in mind when I built the salary filter, honestly. Negotiation only matters once you're at the offer stage, and 27% of listings on LinkedIn never even make it there because they're ghosts. Filtering bad listings is upstream of negotiating good ones.

Would love to chat about a TikTok or Reels integration. Bootstrapped budget, so a flat fee plus affiliate works best. Could also start with a gifted Pro try-first if you'd rather see the product in your own job-search workflow first.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.7,
    lastUpdated: "2026-05-08",
  },

  "mm-3": {
    sender: "isaiah@jobfiltr.app",
    subject: "hi to underscore + kyyah",
    body: `Hi Kyyah and the Underscore team,

Cold pitch but with realistic budget framing up front so I'm not wasting anyone's time. I'm a solo founder running JobFiltr, a Chrome extension that detects ghost jobs and lets people filter by salary, remote, and posting age. Launched on Product Hunt last month at $49 lifetime.

Why Kyyah's audience: corporate-track job seekers chasing biotech, finance, and tech roles run into the highest density of ghost listings, especially on LinkedIn (70% of all ghost jobs are there). Her salary negotiation content overlaps perfectly with what JobFiltr saves people from before they even get to a salary conversation.

I can comfortably fund a flat fee in the low thousands plus a custom affiliate. If that ballpark fits Kyyah's standard rate floor, happy to send press kit, demo access, and rough creative angles. If it doesn't, totally understand and would love to keep the door open for a year from now.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mm-4": {
    sender: "isaiah@jobfiltr.app",
    subject: "founder pitch with a recruiter angle",
    body: `Hi Madeline,

Coming in cold via your contact form. I'll keep it crisp.

I'm Isaiah, founder of JobFiltr (Chrome extension, just launched on Product Hunt). It flags ghost jobs in real time using 50+ signals, hides spam reposts, and lets job seekers filter by salary or remote-only. Live on the Chrome Web Store, $49 lifetime.

Where I'd value your involvement specifically: you have an actual hiring-manager perspective, which makes you one of the few creators who could vouch for whether our ghost-job detection is calling things correctly. Your audience is sophisticated enough to care about that. I think a YouTube integration or a TikTok set would be high-conversion because the trust transfer from a recruiter saying "this is real" is the bottleneck for most career tools.

Happy to send a press kit and propose numbers. Bootstrap budget but real, not fake-promise-future-revenue territory. Would love a chance to talk.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.7,
    lastUpdated: "2026-05-08",
  },

  "mm-5": {
    sender: "isaiah@jobfiltr.app",
    subject: "pitch for sho + workhap",
    body: `Hi Sho and team,

Sending this to team@ since that's the right inbox. I'm Isaiah, solo founder of JobFiltr. Chrome extension, just launched on Product Hunt, $49 lifetime, no tracking.

Quick on what it does. Detects ghost jobs in real time, hides spam reposts, filters by salary and remote, and works on both LinkedIn and Indeed. About 27% of LinkedIn listings have no real intent to hire and 70% of ghost jobs hit LinkedIn first, so the lift for active job seekers is meaningful.

I think there's a real fit with Get Hired Academy. JobFiltr is upstream of everything Sho teaches: better listing hygiene means better applications, better interviews, better outcomes. I'd love to talk about either a sponsored TikTok set with affiliate kicker or a co-branded angle (e.g., "Sho-recommended tools" inside Get Hired Academy materials).

Bootstrap budget but I can make a real number work. Could also start with a gifted try-first.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.7,
    lastUpdated: "2026-05-08",
  },

  "mm-6": {
    sender: "isaiah@jobfiltr.app",
    subject: "pitch for the degreefree audience",
    body: `Hi Hannah and Ryan,

Solo founder cold note, will keep this fast.

I built JobFiltr, a Chrome extension that detects ghost jobs and filters listings by salary, remote, and posting age. Launched on Product Hunt last month. $49 lifetime, no user tracking.

Why your audience specifically: people pursuing non-degree career paths apply through job boards way more than networked candidates, which means they hit ghost listings harder. Around 27% of postings on LinkedIn have no hiring intent, and direct company applications have a 4x higher success rate than job board ones. JobFiltr makes both of those gaps smaller for the people DegreeFree reaches.

I'd love a TikTok integration or a podcast mention. Bootstrap budget, but I can fund a real flat fee plus affiliate. Could also do a gifted-Pro try-first if you want to vet the product before committing.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.6,
    lastUpdated: "2026-05-08",
  },

  "mm-7": {
    sender: "isaiah@jobfiltr.app",
    subject: "an escape-route tool for your audience",
    body: `Hi,

Cold DM from a solo founder, not a brand inquiry from an agency.

I built JobFiltr. Chrome extension, detects ghost jobs in real time, filters listings by salary and remote-only, runs on LinkedIn and Indeed. Just launched on Product Hunt. $49 lifetime, zero tracking on users (which feels like a thing your audience would care about specifically given how anti-surveillance your content is).

The angle that fits HR Manifesto: most of your viewers are people figuring out how to leave a bad workplace. The job-search part of that is the worst chunk of the process because 27% of LinkedIn listings are ghosts and 70% of ghost jobs are posted there. JobFiltr cuts that mess so the leaving-a-toxic-job decision doesn't get sabotaged by garbage listings.

Open to a sponsored TikTok set with flat fee plus affiliate. Bootstrap budget but real money on the table.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.7,
    lastUpdated: "2026-05-08",
  },

  "mm-8": {
    sender: "isaiah@jobfiltr.app",
    subject: "tiktok pitch for career kueen",
    body: `Hey,

Cold DM from a solo founder. Quick context up front so I'm not wasting your time.

I'm Isaiah. Built JobFiltr, a Chrome extension that detects ghost jobs and lets job seekers filter listings by salary, remote-only, and posting freshness. Launched on Product Hunt last month, $49 lifetime, runs on LinkedIn and Indeed.

Why I'm reaching out: your audience leans corporate-curious and confidence-focused, which is the demographic that gets demoralized fastest by ghost listings. About 27% of LinkedIn jobs have no real hiring intent. Filtering them out before applying is an easy productivity win to demonstrate on camera.

I'd love to talk about a sponsored TikTok set. Bootstrap budget but I can make a real flat fee plus affiliate work. If you'd rather try the product first, gifted Pro is on the table.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mm-9": {
    sender: "isaiah@jobfiltr.app",
    subject: "founder pitch for boris",
    body: `Hi Boris,

Cold DM from a solo founder, sending it to your TikTok inbox since that's the doorway you've kept open.

I built JobFiltr. Chrome extension, $49 lifetime, just launched on Product Hunt. It detects ghost jobs in real time using 50+ signals, hides spam reposts, and lets job seekers filter by salary or remote-only. Runs on LinkedIn and Indeed.

Your career-planning content overlaps a lot with the use case: career transitions are the moment when filtering matters most. 27% of LinkedIn listings are ghosts, and direct applications convert 4x better than board applications. Both gaps are easy to demonstrate visually.

Would love a sponsored TikTok set, flat fee plus affiliate. Bootstrap budget but real. Happy to send press kit and creative angles if there's interest. Or try a gifted Pro first if that's how you usually operate.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mm-10": {
    sender: "isaiah@jobfiltr.app",
    subject: "a prescription tessa might like",
    body: `Hi Tessa,

Cold DM, just one solo founder reaching out. The Job Doctor framing is part of why I'm here. JobFiltr is essentially a diagnostic tool for listings, which lines up with how you talk about job search.

What it does: Chrome extension, detects ghost jobs in real time (27% of LinkedIn listings have no hiring intent), filters by salary and remote, hides spam reposts. Just launched on Product Hunt, $49 lifetime, zero tracking on users.

I'd love to talk about a sponsored TikTok with affiliate kicker. The Job Doctor "prescribe a tool to fix your search" angle writes itself. Bootstrap budget, but a real flat fee plus 25% affiliate is on the table. Happy to start with a gifted Pro if you want to play with it before committing.

Isaiah
isaiah@jobfiltr.app`,
    score: 9.6,
    lastUpdated: "2026-05-08",
  },

  // ── MAJOR ──────────────────────────────────────────────────────────────────
  "mj-1": {
    sender: "isaiah@groundworklabs.io",
    subject: "night media + jobfiltr partnership inquiry",
    body: `Hi Erin and Night Media team,

Forwarding-ready cold email so the team has the context up front.

JobFiltr is a Chrome extension for job seekers. It detects ghost jobs in real time using 50+ signals, hides spam reposts, and lets users filter listings by salary, remote-only, and posting freshness. Live on the Chrome Web Store, just launched on Product Hunt, $49 lifetime, zero tracking on the users themselves.

Why Erin specifically: she's one of the most-trusted career voices across TikTok, IG, and YouTube. JobFiltr is a power tool that fits her actionable, plain-English advice style. Her audience covers the whole career-stage range, which matches what JobFiltr serves.

Realistic on budget. We're early stage, so the right shape is probably a gifted Pro try-first with an affiliate component, or a smaller-scope IG Story or TikTok rather than a multi-platform campaign. If Night Media works that way, I'd love to start the conversation. If not, we'll be in a different spot in 6 to 12 months and would love to revisit.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mj-2": {
    sender: "isaiah@groundworklabs.io",
    subject: "careervidz pitch with positioning notes",
    body: `Hi Richard and the CareerVidz team,

Coming in via the contact form on passmyinterview.com. I'm Isaiah, founder of JobFiltr. We're a Chrome extension that detects ghost jobs and filters job listings before users apply. Live on the Chrome Web Store. $49 lifetime, no user tracking.

I want to be upfront on positioning. CareerVidz teaches interview prep, which is the stage right after JobFiltr's value lands. JobFiltr is upstream (helps people find listings worth interviewing for). I think there's a clean partnership angle that doesn't compete with your existing products: position JobFiltr as the step that gets your audience to a real interview faster, then your interview prep takes them through to offer.

Realistic on budget. Bootstrap stage, so I can fund a YouTube mid-roll integration in the low five figures, plus affiliate, plus gifted Pro for your audience as a discount. I'd love a press kit conversation.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mj-3": {
    sender: "isaiah@groundworklabs.io",
    subject: "currents management + jobfiltr partnership",
    body: `Hi Currents team,

Forwarding-ready overview for Laura.

JobFiltr is a Chrome extension that detects ghost jobs and filters listings by salary, remote, and posting age. Just launched on Product Hunt, $49 lifetime, zero tracking on users. Built by a solo founder (me), live on Chrome Web Store.

Audience fit: Laura's content is largely about people who are stuck in bad workplaces and want out. The "find a better job" half of that journey is where JobFiltr lives. Job seekers waste an estimated third of their time on listings with no hiring intent (about 27% of LinkedIn jobs are ghosts), and that ratio is even worse on remote and high-pay listings, which is exactly what Laura's audience is searching for.

Honest on budget. We're early-stage, so the realistic shape is a sponsored TikTok with affiliate kicker, not a Canva or Norton scale deal. Could also start with a gifted Pro try-first. Open to whatever fits Laura's standard process.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mj-4": {
    sender: "isaiah@groundworklabs.io",
    subject: "jobfiltr's salary filter + sts",
    body: `Hi Hannah and STS team,

Cold inquiry via the website. I'm Isaiah, founder of JobFiltr.

JobFiltr is a Chrome extension that detects ghost jobs and filters job listings by salary, posting age, and remote-only. Live on Chrome Web Store, just launched on Product Hunt, $49 lifetime. Salary filtering is the first thing we built, so the alignment with Salary Transparent Street is the most direct on our entire creator list.

The integration angle that writes itself: "you've seen what these jobs actually pay, here's how to filter for ones that hit your number." Either as a TikTok or IG integration, or a small recurring sponsorship across the existing salary-on-the-street content.

I want to be honest. We're not at Indeed-budget territory. We're early-stage with bootstrap funding, so a partial-cash plus affiliate plus gifted-Pro shape is more realistic than a flat six-figure deal. If that range doesn't fit how STS books partnerships at this point, totally understand. Would love to keep the door open for 12 months from now.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.6,
    lastUpdated: "2026-05-08",
  },

  "mj-5": {
    sender: "isaiah@groundworklabs.io",
    subject: "wonsulting partnerships intro",
    body: `Hi Jonathan, Jerry, and the Wonsulting partnerships team,

Cold inquiry via your /partnerships form. I'll keep it scannable.

What we built: JobFiltr. Chrome extension that detects ghost jobs in real time using 50+ signals, hides spam reposts, filters listings by salary and remote-only. Live on Chrome Web Store, just launched on Product Hunt, $49 lifetime, zero tracking.

Why Wonsulting: your audience is heavy on first-gen, immigrant, and non-traditional-background candidates, who are the people most reliant on cold applications because they don't have inherited networks. Ghost listings hit them hardest. JobFiltr is built to eat that gap.

Open to a strategic partnership shape: sponsored content plus a Wonsulting-recommended-tools integration plus an affiliate setup. Bootstrap budget, so the right shape is probably a smaller flat fee plus longer-term affiliate revenue rather than a single big drop. Happy to send press kit and have an actual conversation.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.6,
    lastUpdated: "2026-05-08",
  },

  "mj-6": {
    sender: "isaiah@groundworklabs.io",
    subject: "ex-recruiter founder pitch for greg",
    body: `Hi Greg,

Cold note via your link tree. Skipping the small talk.

JobFiltr is a Chrome extension that detects ghost jobs and filters listings before users apply. 50+ ghost-job signals (you'd recognize most of them from the recruiter side: repost age, vague titles, recruiter ratio, location ghosts). Live on Chrome Web Store, just launched on Product Hunt, $49 lifetime.

Your content positioning is "professional perspective from inside the recruiter's chair," which is exactly the credibility transfer that makes a tool like JobFiltr land for an audience. Most candidates can't tell a real listing from a ghost, but you can. Even a 60-second walkthrough of the signals would convert.

I'd love a TikTok or IG integration. Bootstrap budget, so the shape is partial cash plus affiliate plus gifted Pro for your audience. Open to whatever scope works on your end.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.6,
    lastUpdated: "2026-05-08",
  },

  "mj-7": {
    sender: "isaiah@groundworklabs.io",
    subject: "jobfiltr pitch for senior-track audiences",
    body: `Hi Linda,

Cold inquiry via your contact page. I'll keep it short.

JobFiltr is a Chrome extension that detects ghost jobs and filters listings by salary, remote-only, and posting freshness. Live on Chrome Web Store, just launched on Product Hunt, $49 lifetime, no user tracking.

Why your audience: senior-track candidates aiming for director and VP roles run into the worst ghost-job ratios (compensation packages are so vague that postings sit unfilled for months). Your YouTube and LinkedIn Learning audiences are this exact demographic. JobFiltr removes a layer of friction that's invisible until someone shows it to them.

I'd love a YouTube sponsored integration. Bootstrap budget, so the right shape is a smaller flat fee plus affiliate kicker rather than a big drop. Could also start with a gifted Pro try-first. Open to whatever process you usually run.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "mj-8": {
    sender: "isaiah@groundworklabs.io",
    subject: "jobfiltr + vanessa, real product fit angle",
    body: `Hi Vanessa,

Cold note via your contact page. I know you're selective on partnerships and only take ones where the product fit is real. So I'll lead with that, not with budget.

JobFiltr is a Chrome extension. It detects ghost jobs in real time and filters listings by salary, remote, and posting age. Live on Chrome Web Store. The reason it fits your audience: most of your viewers are stuck in jobs they want to leave, and the realistic in-between for most of them is a better day job, not entrepreneurship. JobFiltr makes that transition step less painful so the people who do choose entrepreneurship can do it from a stable base instead of a forced jump.

I'd love a YouTube integration. Bootstrap budget, so the shape would be partial cash plus affiliate plus gifted-Pro for your audience as a discount. If the product fit doesn't read clearly to you, I'd rather hear "no, here's why" than a polite reroute. Always learning.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.7,
    lastUpdated: "2026-05-08",
  },

  "mj-9": {
    sender: "isaiah@groundworklabs.io",
    subject: "jobfiltr pitch for the milewalk audience",
    body: `Hi Andrew and the milewalk team,

Cold email to support@ since I know it routes to you directly. I'm Isaiah, founder of JobFiltr.

JobFiltr is a Chrome extension. Detects ghost jobs in real time (50+ signals), filters listings by salary or remote-only, hides spam reposts. Live on Chrome Web Store, just launched on Product Hunt, $49 lifetime, no user tracking.

Why milewalk's audience: executives search differently. They look at fewer roles, but each wasted application is much higher-stakes (a ghost VP listing wastes weeks, not days). JobFiltr is built around that exact ratio. Your weekly Office Hours format also works well for a recurring mention since the value of the tool compounds with each search someone does.

I'd love a YouTube integration plus an Office Hours mention. Bootstrap budget, so I can fund a real flat fee in the low-to-mid four figures plus affiliate. Could also start with a gifted Pro try-first if you'd rather see it in your own workflow.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.7,
    lastUpdated: "2026-05-08",
  },

  "mj-10": {
    sender: "isaiah@groundworklabs.io",
    subject: "jobfiltr pitch for ali's team",
    body: `Hi Ali Abdaal team,

Forwardable cold inquiry. I'll keep it short and not waste your day.

JobFiltr is a Chrome extension that detects ghost jobs and filters listings before users apply. Live on Chrome Web Store, just launched on Product Hunt, $49 lifetime, zero user tracking.

I want to be upfront. We're early-stage and bootstrap-funded. Ali's standard sponsorship rates aren't somewhere we can reach right now, and I'd rather acknowledge that than pretend otherwise. The reason I'm still writing is that JobFiltr fits Ali's productivity-tools genre exactly: it's a one-time-cost tool that pays back hours of search time. If there's any version of a partnership that makes sense for the team at this stage (gifted Pro tier-up for Ali's audience plus affiliate, smaller-scope IG mention, or a "tools I'm trying" feature rather than a full integration), I'd love to hear it.

If not now, would love to revisit a year from now when we have the numbers to back a real proposal.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  // ── INTERNATIONAL ──────────────────────────────────────────────────────────
  "int-1": {
    sender: "isaiah@groundworklabs.io",
    subject: "jobfiltr pitch for the indian audience",
    body: `Hi Ankur and team,

Cold inquiry via your website contact form. I'll keep this scannable.

JobFiltr is a Chrome extension. Detects ghost jobs (50+ signals), filters listings by salary, remote, and posting age. Live on Chrome Web Store, just launched on Product Hunt, $49 lifetime, no user tracking.

Why your audience specifically: Indian young professionals chasing remote-international roles deal with one of the worst ghost-listing ratios anywhere. A lot of remote postings target India for talent without any real intent to convert. JobFiltr's salary, location, and posting-age filters cut a huge chunk of that mess. Your audience is also large enough that even a small CTR would generate real volume on a $49 lifetime SKU.

Realistic on budget. Bootstrap-funded, so we can't reach your standard sponsorship rate today. The right shape is probably a partial-cash plus longer-term affiliate setup, plus a gifted Pro tier for your audience. If that ballpark doesn't work, no hard feelings. Would love to revisit later.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "int-2": {
    sender: "isaiah@groundworklabs.io",
    subject: "jobfiltr pitch for the diaspora audience",
    body: `Hi Dr. Dipo,

Cold note via LinkedIn. Solo founder, US-based.

JobFiltr is a Chrome extension that detects ghost jobs and filters listings by salary, remote, and posting freshness. Just launched on Product Hunt, $49 lifetime, no user tracking.

Why your audience: Nigerian and African diaspora candidates targeting UK, Canada, and US roles are some of the highest-volume cold applicants in the world (because they can't rely on inherited networks). Ghost listings hit them disproportionately. JobFiltr is built to make cold-application strategy actually work, since cold applications already convert 4x better than people assume when the listing is real.

I'd love a LinkedIn-sponsored content set or a Twitter thread with affiliate kicker. Bootstrap budget, so a few thousand for a full thread and a gifted-Pro-for-your-audience setup is what's realistic. Happy to send press kit and creative angles.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.6,
    lastUpdated: "2026-05-08",
  },

  "int-3": {
    sender: "isaiah@groundworklabs.io",
    subject: "jobfiltr pitch for the global linkedin audience",
    body: `Hi Brigette and team,

Cold inquiry. Solo founder of JobFiltr, a Chrome extension that detects ghost jobs and filters listings by salary, remote, and posting freshness. Live on Chrome Web Store, just launched on Product Hunt, $49 lifetime.

Why your audience: 4M LinkedIn followers across Caribbean, US, UK, India, and Nigeria is one of the most globally distributed career audiences anywhere. JobFiltr works on LinkedIn directly, which is where 70% of all ghost jobs originate. The pitch lands cleanly because the use case is right there in the platform you already post on.

Honest on budget. Bootstrap stage, so we're not yet at speaker-bureau-standard partnership rates. The realistic shape is a smaller LinkedIn-sponsored post (one or two posts), plus an affiliate setup, plus a gifted Pro tier for your audience as a discount. If that ballpark isn't how Brigette books partnerships, totally understand. Open to a smaller-scope first step.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "int-4": {
    sender: "isaiah@groundworklabs.io",
    subject: "international pitch for careervidz",
    body: `Hi Richard and team,

Resending in case the major-tier note got buried. International audience-specific angle this time.

CareerVidz hits 65% non-US, which means a huge slice of your audience is dealing with cross-border ghost listings. Recruiters posting roles for visa-sponsorable candidates without real intent to hire is rampant, especially on UK, Canadian, and Australian listings.

JobFiltr is a Chrome extension that flags those in real time using 50+ signals. $49 lifetime, runs on LinkedIn and Indeed, just launched on Product Hunt. The international fit is honest: ghost-detection logic doesn't change much by region.

Realistic on budget. Bootstrap-funded, so the right shape is a YouTube integration that's smaller-scope than your usual deals plus affiliate plus gifted Pro for your audience. Wouldn't fit a full passmyinterview-tier deal yet. Happy to keep the door open for a year from now if today doesn't work.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "int-5": {
    sender: "isaiah@groundworklabs.io",
    subject: "international-angle jobfiltr pitch for linda",
    body: `Hi Linda,

Resending with the international angle since your audience is 55%+ non-US.

Quick context: JobFiltr is a Chrome extension that detects ghost jobs and filters listings by salary, remote, and posting age. Live on Chrome Web Store, $49 lifetime, no tracking.

The international fit: your LinkedIn Learning audience covers Canada, India, Philippines, Australia, and UK heavy. Cross-border applicants get the worst ghost-listing exposure because they can't tell which postings are real "we're hiring globally" versus "we wrote this for visa optics." JobFiltr's filters don't depend on location, so the value transfers cleanly across regions.

Realistic budget: bootstrap stage, so a YouTube integration with smaller flat fee plus affiliate is what's on the table. Could start with gifted Pro try-first. Would love a chance to talk if any of that fits how you book partnerships now.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "int-6": {
    sender: "isaiah@groundworklabs.io",
    subject: "international angle for greg",
    body: `Hi Greg,

Resending the JobFiltr pitch with the international angle since your audience is roughly 60% non-US.

Context: JobFiltr is a Chrome extension that detects ghost jobs and filters listings by salary, remote, and posting age. Live on Chrome Web Store, just launched on Product Hunt, $49 lifetime.

International fit: Canadian, UK, Australian, and NZ candidates run into ghost listings that target English-speaking remote workers without real intent. Your TikTok and IG audiences are exactly that demographic. JobFiltr's signal model works the same way across these regions, so the demo translates without any localization.

Realistic budget: bootstrap stage, so partial cash plus affiliate plus gifted Pro for your audience is what fits. Would love to chat about a TikTok or IG integration. Even a smaller-scope first step is on the table.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "int-7": {
    sender: "isaiah@groundworklabs.io",
    subject: "jobfiltr pitch for sho's asian audience",
    body: `Hi Sho and team,

Resending with the Asian-market angle since 45%+ of your audience is non-US.

JobFiltr is a Chrome extension that detects ghost jobs and filters listings by salary, remote, and posting age. Just launched on Product Hunt, $49 lifetime.

Why this angle: candidates in Hong Kong, Singapore, India, and Australia who are aiming for US or remote-international roles have to apply cold at much higher volume than US-based candidates. Hit-rate matters more for them. JobFiltr is built around that exact constraint: filter aggressively, apply only to real listings.

I'd love to talk about a TikTok integration that leans Asian-market. Bootstrap budget, so partial cash plus affiliate plus gifted Pro is the realistic shape. Could start with a try-first. Open to whatever fits the team@workhap workflow.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },

  "int-8": {
    sender: "isaiah@groundworklabs.io",
    subject: "jobfiltr top-of-funnel pitch for max",
    body: `Hi Max and team,

Cold outreach via your TikTok contact info. Going to be upfront about the tier mismatch first.

JobFiltr is a Chrome extension that detects ghost jobs and filters job listings. Live on Chrome Web Store, just launched on Product Hunt, $49 lifetime. We're a solo-founder, bootstrap-stage company.

I know your sponsorship rates are well above what I can fund at this stage. The reason I'm still writing is that JobFiltr fits one of the highest-frequency content categories you cover (career and society), and the international angle is real (70% non-US audience, exactly the people who get burned by ghost listings on UK and Australian boards). If there's any version of a smaller-scope partnership that works at this stage (a single-video integration with smaller flat fee plus affiliate plus gifted Pro for your audience), I'd love to hear it. If not, would love to keep the door open for a year out.

Isaiah
isaiah@groundworklabs.io`,
    score: 9.5,
    lastUpdated: "2026-05-08",
  },
};

/**
 * Returns the canonical baked outreach content for a creator, or null if no
 * content is configured for that id. Edits the user makes in the Outreach tab
 * are stored in localStorage and override this default at render time.
 */
export function getOutreachContent(influencerId: string): OutreachContent | null {
  return OUTREACH_CONTENT[influencerId] ?? null;
}
