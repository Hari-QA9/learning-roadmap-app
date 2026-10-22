# LearnMap — future to-do list

Work we decided to hold for later, so nothing gets lost. Tick items off (`[x]`) as they're done and add new ones whenever we postpone something.

**Priority:** 🔴 must do before launch · 🟠 soon after launch · 🟢 nice to have

---

## 🔴 Before going live

### Security & privacy
- [ ] **Remove `database_backup.sql` from the public repo.** The repo is public, and the dump contains real user rows (names, emails and password hashes). Delete the file, scrub it from git history, and have those users change their passwords.
- [ ] **Ownership checks (IDOR fix).** Some routes (tasks, modules, notes, comments — resources are done) don't check that the item belongs to the logged-in member, so someone who guesses an ID could read or edit another member's data.
- [ ] Production security headers (`helmet`), CORS limited to the real site address, HTTPS only.
- [ ] Privacy policy and terms pages.
- [ ] Account deletion and "download my data" in Profile.

### Production setup
- [ ] Database settings from environment variables, with a connection pool (not hard-coded localhost).
- [ ] Hosting: frontend, backend and MySQL, plus a domain name.
- [ ] Transactional email provider for password resets (Gmail App Password is fine for testing only).
- [ ] Paid or higher-quota Gemini key, with spending alerts.
- [ ] Error monitoring (e.g. Sentry) and daily database backups.
- [ ] Move the rate limiter to a shared store (e.g. Redis) if we ever run more than one backend server.

---

## Job board

### Turn on when ready (code is already built — just add keys to `backend/.env`)
Keys go only in `backend/.env`, which is never uploaded to GitHub. Never paste keys in chat or in committed files.

- [ ] 🟠 **Adzuna** (free, ~5 minutes)
  1. Go to developer.adzuna.com → **Register** → confirm your email.
  2. Log in → open the dashboard / API access details → copy the **Application ID** and **Application Key**.
  3. In `backend/.env` set `ADZUNA_APP_ID=…`, `ADZUNA_APP_KEY=…`, `ADZUNA_COUNTRY=us`.
  - Free limit is ~250 searches/day; the app uses ~24/day.

- [ ] 🟠 **USAJobs** (free, key arrives by email)
  1. Go to developer.usajobs.gov/apirequest → fill in name, email and a short app description → accept the terms → submit.
  2. Wait for the email with your API key.
  3. In `backend/.env` set `USAJOBS_API_KEY=…` and `USAJOBS_EMAIL=…` (the **same** email you signed up with).

- [ ] 🟠 **JSearch** (LinkedIn / Indeed / Glassdoor via Google for Jobs; free trial plan, paid for launch)
  1. Sign up at rapidapi.com → search **"JSearch"** (by OpenWeb Ninja).
  2. **Pricing** → choose the free **Basic** plan → **Subscribe** (no card needed).
  3. **Endpoints** tab → copy the `X-RapidAPI-Key` value from the code example.
  4. In `backend/.env` set `JSEARCH_API_KEY=…`.
  5. While on the free plan, also set `JSEARCH_MAX_QUERIES=2` and `JOB_REFRESH_HOURS=24` (keeps it to ~60 requests/month). Raise them when moving to a paid plan at launch.

- [ ] 🟢 **YouTube** (free, optional — makes video resources open a real video instead of a YouTube search)
  1. Go to console.cloud.google.com → create a project (any name).
  2. **APIs & Services → Library** → search **YouTube Data API v3** → **Enable**.
  3. **APIs & Services → Credentials → Create credentials → API key** → copy it.
  4. In `backend/.env` set `YOUTUBE_API_KEY=…`. New roadmaps will use it (free quota is plenty for normal use).

- [ ] After adding any key: save `.env`, restart the backend (Ctrl+C, then `npm start`), and check the terminal for `[jobs] Refreshed: … adzuna: N, usajobs: N, jsearch: N`. If you see `error: HTTP 401`, the key was pasted wrong (look for extra spaces).

### Improvements
- [ ] 🟠 Grow the company-board list from ~55 to a few hundred companies (Greenhouse, Lever, Ashby), and let members suggest companies.
- [ ] 🟠 Remove duplicates when the same job comes from two sources.
- [ ] 🟠 Job alerts: a weekly email of new jobs above a member's match score.
- [ ] 🟠 Use experience level and salary in matching (the level is saved but not scored yet).
- [ ] 🟢 Location radius and salary filters.
- [ ] 🟢 Resume upload (PDF) that reads skills automatically.
- [ ] 🟢 Interview-prep agent for a specific job (likely questions + a mock interview in chat).
- [ ] 🟢 Workday career sites (many big companies use them; there's no simple public API, so this needs research).

### Decided against
- ❌ Scraping LinkedIn or Indeed directly. It breaks their terms and they block or take legal action against scrapers. We use JSearch instead.
- ❌ Auto-submitting applications. Members review the AI kit and apply on the original site.

---

## Resume builder
- [ ] 🟠 Upload a PDF or Word resume directly (today: copy its text and use **Import**).
- [ ] 🟠 Download as Word (.docx) — some application portals ask for it. PDF and plain text work today.
- [ ] 🟢 More templates (keep them single-column and real text so ATS can read them).
- [ ] 🟢 Drag-and-drop to reorder sections and entries (today: up/down arrows).
- [ ] 🟢 On phones, a "Score / Preview" tab at the top (today the score and preview are below the editor).
- [ ] 🟢 Cover-letter builder that reuses the resume and the job (the job page's application kit already writes one).
- [ ] 🟢 Show when a tailored version is older than the main resume, with an option to pull in new changes.

---

## Every field (science, health, business, engineering, teaching…)
- [ ] 🟠 Run `npm run check-resources` in `backend` every month or so — it checks every link in the resource library still works.
- [ ] 🟠 Grow the resource library (`backend/lib/resourceLibrary.js`) with more fields: psychology, social work, law, architecture, hospitality, trades.
- [ ] 🟠 Use AI to pick out skills the built-in list doesn't know, for fields we haven't covered yet (today those still match if the member types them in).
- [ ] 🟢 Let members rate resources (👍/👎) so the best ones rise to the top.
- [ ] 🟢 Add field-specific job boards where public APIs exist (e.g. HigherEdJobs for academia, health-system career sites).
- [ ] 🟢 Ownership checks are now in place for resources; tasks, modules, notes and comments still need them (see "Security & privacy").

---

## Quality
- [ ] 🟠 Move the end-to-end browser tests into the repo and run them on every pull request (GitHub Actions).
- [ ] 🟢 Lighthouse pass for speed and accessibility on the main pages.

---

## Done (for reference)
- [x] Classy redesign with light/dark mode (PR #1), Apple-style polish and speed (PR #4)
- [x] Smarter AI roadmaps (PR #2)
- [x] Login security: remember me, lockout, password reset emails (PR #3, #5)
- [x] AI job board: matching, fit analysis, application kit, gap roadmaps, tracker (PR #6)
- [x] More job sources: Ashby, ~55 company boards, Adzuna / USAJobs / JSearch ready to switch on (PR #7)
- [x] Resume builder v2: structured sections, live recruiter/ATS score, AI bullet rewrites, import, tailor-to-job versions, text-based PDF (PR #8)
- [x] Works for every field: skills, job searches, templates, resume sections & Academic CV, field-aware AI, verified resource library (PR #9)
