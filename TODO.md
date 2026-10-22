# LearnMap — future to-do list

Work we decided to hold for later, so nothing gets lost. Tick items off (`[x]`) as they're done and add new ones whenever we postpone something.

**Priority:** 🔴 must do before launch · 🟠 soon after launch · 🟢 nice to have

---

## 🔴 Before going live

### Security & privacy
- [x] Removed `database_backup.sql` from the repo (PR #15). `*.sql` dumps are now ignored by git.
- [ ] **Scrub `database_backup.sql` from git history** (it's still in old commits) — or make the repo private — and have the people in that dump change their passwords. Needs a force-push, so only with your OK.
- [x] Ownership checks everywhere: modules, notes, comments, quizzes, module/roadmap results (certificates can only be issued for your own roadmap) (PR #15).
- [x] Security headers, CORS limited to the real site in production, HTTPS-only header, start-up checks that refuse a weak `JWT_SECRET` (PR #15).
- [x] Privacy policy and terms pages (PR #15). 🟠 Have someone knowledgeable review the wording before a big launch.
- [x] Account deletion and "download my data" in Profile (PR #15).

### Production setup
- [x] Database settings from environment variables, with a connection pool (PR #15).
- [ ] **Hosting:** Aiven (MySQL) + Render (backend) + Vercel (frontend) — follow [DEPLOY.md](DEPLOY.md). Domain name later.
- [x] Email that works when hosted: Brevo API support (PR #15). Set it up in DEPLOY.md step 5.
- [ ] 🟠 Render Starter plan ($7/month) once real people use it — the free backend sleeps after 15 minutes, which delays reminder emails.
- [ ] Paid or higher-quota Gemini key, with spending alerts.
- [ ] Error monitoring (e.g. Sentry) and daily database backups. (The admin dashboard shows recent errors since the last restart — a start, not a replacement.)
- [x] `backend/database/schema.sql` (tables only, no member data). The backend creates the tables automatically on a fresh database (PR #15).
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

- [ ] 🟠 **Sign in with Google** (free)
  1. Go to console.cloud.google.com → pick your project → **APIs & Services → OAuth consent screen** → External → fill in app name (LearnMap), support email → Save.
  2. **Credentials → Create credentials → OAuth client ID** → type **Web application**.
  3. Under **Authorized JavaScript origins** add `http://localhost:3000` (and your real site address once it's online).
  4. Copy the **Client ID** into `backend/.env` as `GOOGLE_CLIENT_ID=…` and restart the backend — the Google button appears on the login and sign-up pages.

- [ ] 🟠 **Admin dashboard:** put your own email in `backend/.env` as `ADMIN_EMAILS=you@gmail.com`, restart, then open the account menu → **Admin dashboard**.

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

---

## Interviews & calendar
- [ ] 🟠 Voice mock interviews: the AI reads questions aloud and you answer out loud (today: typed, or browser speech-to-text in Chrome/Edge/Safari).
- [ ] 🟢 Two-way Google/Outlook calendar sync (today: a subscribe link + "Add to calendar" buttons).
- [ ] 🟢 Thank-you email draft after an interview (AI, from the tracker).

---

## Engagement (reminders & notifications)
- [ ] 🔴 Set up email in production — Brevo (DEPLOY.md step 5) — and set `PUBLIC_API_URL` so unsubscribe links work. Reminders and job alerts are in-app only until then.
- [ ] 🟠 Push notifications to phones (needs the installable app from PR C + web push keys).
- [ ] 🟢 Let members pick the day/time of their weekly summary (today: Monday 9am their time).
- [ ] 🟢 Weekly summary for mentors/parents (optional sharing).

---

## Platform
- [ ] 🟠 Publish the installable app to the Google Play Store (a "Trusted Web Activity" wraps the web app) once LearnMap is online.
- [ ] 🟢 Web push notifications to phones when the app is closed (needs the site online over HTTPS + push keys).
- [ ] 🟢 More admin tools: deactivate a member, resend their verification, export members as CSV.

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
- [x] Retention pack: welcome setup, learning streak & daily goal, live notifications, reminders, weekly summary, job alerts, follow-ups, email settings & unsubscribe (PR #12)
- [x] Mock interviews with feedback, calendar feed & add-to-calendar, interview dates/contacts/next steps in the tracker, editable due dates (PR #13)
- [x] Email verification, Sign in with Google, installable app (icons, offline page, service worker), admin dashboard (PR #14)
- [x] Launch-ready: env-based database pool, auto-created tables, ownership checks, security headers & CORS, Privacy/Terms, download & delete account, Brevo email, Render/Vercel config + DEPLOY.md (PR #15)
