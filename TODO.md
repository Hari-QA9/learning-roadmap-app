# LearnMap — future to-do list

Work we decided to hold for later, so nothing gets lost. Tick items off (`[x]`) as they're done and add new ones whenever we postpone something.

**Priority:** 🔴 must do before launch · 🟠 soon after launch · 🟢 nice to have

---

## 🔴 Before going live

### Security & privacy
- [ ] **Remove `database_backup.sql` from the public repo.** The repo is public, and the dump contains real user rows (names, emails and password hashes). Delete the file, scrub it from git history, and have those users change their passwords.
- [ ] **Ownership checks (IDOR fix).** Some routes (tasks, modules, notes, resources, comments) don't check that the item belongs to the logged-in member, so someone who guesses an ID could read or edit another member's data.
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
- [ ] 🟠 **Adzuna** (free): get `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` at developer.adzuna.com.
- [ ] 🟠 **USAJobs** (free): get `USAJOBS_API_KEY` at developer.usajobs.gov.
- [ ] 🟠 **JSearch** (paid): adds LinkedIn / Indeed / Glassdoor listings through Google for Jobs. Subscribe on RapidAPI and set `JSEARCH_API_KEY` once there are users and a budget.

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
