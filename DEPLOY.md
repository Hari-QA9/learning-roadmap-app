# Putting LearnMap online

This guide puts LearnMap on the internet for free, so it works on any phone, tablet or computer, anywhere. It takes about 45 minutes the first time.

| Part | Service | Cost |
|---|---|---|
| Database (MySQL) | **Aiven** | Free (1 GB) |
| Backend (the API) | **Render** | Free |
| Frontend (the website) | **Vercel** | Free |
| Emails (reset, confirm, reminders) | **Brevo** | Free (300/day) |

Rules for every step:
- Keys and passwords go **only** into each service's settings page. Never into GitHub and never into chat.
- Keep a private note (for example in your password manager) of the values you create along the way. You'll paste a few of them more than once.

---

## Step 1: Database on Aiven (about 10 min)

1. Go to **aiven.io** → **Sign up** (GitHub or Google login is fine; no card needed).
2. **Create service** → choose **MySQL** → plan **Free** → pick a US region close to you → **Create**.
3. Wait until the status says **Running** (a few minutes).
4. On the service's **Overview** page, find **Service URI**. It looks like `mysql://avnadmin:…@….aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED`. Click the copy button and save it in your private note. This is your **DATABASE_URL**.

You don't need to create any tables. The backend builds them automatically the first time it starts.

> Aiven may pause a free database that sits unused for a long time. If LearnMap ever says the database is unavailable, open Aiven and press **Power on**.

## Step 2: Backend on Render (about 10 min)

1. Go to **render.com** → **Sign up with GitHub**, and allow access to the `learning-roadmap-app` repo.
2. **New +** → **Blueprint** → choose `learning-roadmap-app` → Render reads `render.yaml` from the repo.
3. It asks for the values marked "sync: false". Fill them in:

   | Name | What to paste |
   |---|---|
   | `DATABASE_URL` | the Aiven Service URI from Step 1 |
   | `APP_URL` | `https://placeholder.vercel.app` for now (you'll fix it in Step 4) |
   | `PUBLIC_API_URL` | leave empty (Render fills in its own address automatically) |
   | `GEMINI_API_KEY` | your Gemini key (same as in your local `backend/.env`) |
   | `BREVO_API_KEY`, `MAIL_FROM` | leave empty for now (Step 5) |
   | `ADMIN_EMAILS` | your own email |

   `JWT_SECRET` is generated for you automatically, so leave it alone.
4. **Apply**. Wait for the first deploy to finish (about 3–5 min). The log should show `Connected to MySQL database` and `Server running on port …`.
5. Copy your backend address from the top of the page, for example `https://learnmap-api.onrender.com`.
6. Check it works: open `https://<your-backend>/api/health` in a browser. You should see `{"ok":true}`.

## Step 3: Frontend on Vercel (about 5 min)

1. Go to **vercel.com** → **Sign up with GitHub**.
2. **Add New… → Project** → import `learning-roadmap-app`.
3. **Root Directory** → click **Edit** → choose `frontend`. Framework should show **Create React App**.
4. Open **Environment Variables** and add:
   - `REACT_APP_API_URL` = your backend address + `/api` (for example `https://learnmap-api.onrender.com/api`)
   - `REACT_APP_CONTACT_EMAIL` = an email for privacy questions (optional)
5. **Deploy**. When it finishes, copy your site address, for example `https://learnmap.vercel.app`.

## Step 4: Connect the two (2 min)

Back on **Render** → your service → **Environment**, set `APP_URL` to your Vercel address (for example `https://learnmap.vercel.app`, with no slash at the end) → **Save changes**. Render restarts the backend by itself.

This is what lets the website talk to the backend. Other websites are blocked.

**Now open your Vercel address on your phone.** Sign up, and you're live. Use **Add to Home Screen** (or the account menu → **Install app**) to get the app icon.

## Step 5: Emails with Brevo (about 10 min)

Render's free plan blocks normal email (SMTP), so emails go through Brevo instead.

1. Go to **brevo.com** → sign up (free plan).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: your Gmail address. Open the confirmation email Brevo sends you and click the link.
3. **SMTP & API → API Keys → Generate a new API key** → copy it.
4. On **Render → Environment**, set:
   - `BREVO_API_KEY` = the key
   - `MAIL_FROM` = `LearnMap <your-verified-gmail@gmail.com>`
5. Save. In the Render logs you should see `[mail] Ready to send email through Brevo`.

Test it: on the live site, use **Forgot password**. The email should arrive within a minute (check spam the first time).

## Step 6: Optional extras

- **Sign in with Google:** in Google Cloud Console → your OAuth client → **Authorized JavaScript origins**, add your Vercel address. Then on Render add `GOOGLE_CLIENT_ID`.
- **More jobs:** add `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`, `USAJOBS_API_KEY`/`USAJOBS_EMAIL`, `JSEARCH_API_KEY`, or `YOUTUBE_API_KEY` on Render (same keys as in `TODO.md`).
- **Your own domain** (for example `learnmap.app`): buy it, add it in Vercel → **Domains**, then update `APP_URL` on Render (and the Google origin).

---

## Good to know

- **Updates are automatic.** Whenever a pull request is merged into `main`, Render and Vercel redeploy by themselves.
- **The free backend sleeps** after 15 minutes without visitors. The first visit after that takes about a minute to wake it up. While it sleeps, reminder and summary emails wait until the next wake-up. Render's **Starter** plan ($7/month) keeps it awake all the time and is worth it once real people use LearnMap.
- **Your computer copy keeps working** exactly as before (`npm start` in both folders) and uses your local MySQL. The online copy has its own database.
- **Something broke?** Render → your service → **Logs** shows backend errors. Sign in as the admin email → account menu → **Admin dashboard** → **System** shows what's switched on.

| Problem | Fix |
|---|---|
| Website loads but every action fails / "Network Error" | `REACT_APP_API_URL` on Vercel is wrong (it must end in `/api`). Fix it, then **Redeploy** on Vercel. |
| Backend log says "can't start in production yet" | It lists what's missing. Add it on Render → Environment. |
| "Database connection failed" | Check `DATABASE_URL`, and that the Aiven service is **Running**. |
| Emails don't arrive | Check the Render log line starting with `[mail]`, and that the sender is verified in Brevo. |
