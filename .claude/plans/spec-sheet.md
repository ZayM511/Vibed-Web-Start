1. What This App Does
JobFiltr 2.0 is a web app and Chrome extension that scans job postings to spot scams, ghost listings, and other red flags, then explains why. It protects your privacy by default and helps you apply with confidence.

2. Core Features
- Live Scan (Chrome Extension): Scan the active job tab on sites like LinkedIn, Indeed, Google Jobs, and ZipRecruiter to get an instant AI + rule-based verdict with highlighted red flags. Uses a custom in-house scanner via Manifest V3 content scripts and saves results/bookmarks to Convex when you’re logged in with Clerk.
- Ghost Job Detector: Analyzes repost patterns, posting history, company fit, salary anomalies, and community reports to flag likely ghost or fake roles. Shows a timeline and confidence score with references sourced from public datasets (e.g., FTC, BBB, LinkedIn company metadata, D&B) via the custom engine.
- Manual Scan (Web): Paste a job link or text, add optional context (location, application status), and run the same scanner to get a detailed, explainable report with confidence scores. Export, save to history in Convex, or request a deeper emailed report (opt-in).
- Explainability Panel: Every scan shows the “why” behind the verdict—e.g., mismatched domains/emails, missing company info, unusual application flows (WhatsApp/Telegram), and “too good to be true” language—with citations to trusted sources where applicable.
- Community Review Engine: Users can submit experiences (applied, ghosted, real/not real, tenure, comments) that become trust signals on each job page. Reviews are tied to Clerk accounts (optional), stored in Convex, and fed back into the model to improve accuracy over time.
- In-Browser Job Board Overlay: Overlay risk signals, badges, and quick actions directly on job boards for a seamless, in-context check. Implemented via the Chrome extension’s content scripts with subtle UI highlights and no tracking by default.
- Bookmarks & History: Save and organize jobs and scan results, with cross-device sync when logged in via Clerk. Quick re-scan and versioned history are stored in Convex.
- Privacy & Compliance Controls: No tracking or data harvesting by default; scans run locally where possible and cloud storage only occurs when you choose to save or submit. Designed for GDPR/CCPA-friendly practices with clear consent and data deletion options.
- Multi-language & Verified Badges: Multi-language UI and reports to reach more users. Verified employer badges appear when company data matches trusted records and passes consistency checks.

3. Tech Stack
- Framework: Next.js (React 18, App Router)
- Database/Backend: Convex (data storage and server-side functions)
- Auth: Clerk (email/OAuth, session management)
- Browser Extension: Chrome Extension (Manifest V3, content scripts, storage)
- AI/Analysis: Custom AI + rule-based scanner (in-house) leveraging public datasets/APIs (FTC, BBB, LinkedIn company metadata, D&B, WHOIS) for research-informed signals
- Styling/UX: Tailwind CSS; lightweight animation via CSS/JS for subtle transitions
- Internationalization: Next.js i18n routing

4. UI Design Style
A premium, trust-first aesthetic using blues, whites, and grays with calming green/teal accents, clean professional typography, and subtle modern animations that feel fast, accessible, and polished on both desktop and mobile.