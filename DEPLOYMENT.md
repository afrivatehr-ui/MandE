# Afrivate M&E — Full Deployment Walkthrough

This is a complete, step-by-step guide to take the project from source code to a
live, working app. It is written to be followed by the developer (a frontend dev
learning Supabase) and/or an AI assistant (GitHub Copilot). Follow the steps in
order. Do not skip the "Environment constraints" section — it explains why we use
the browser instead of the Supabase CLI.

---

## 1. What this project is

An internal Monitoring & Evaluation web app for AfriVate Technologies Ltd. It
tracks volunteer deployments, collects feedback from volunteers and partner
organisations via tokenised public survey links, auto-calculates a Volunteer
Performance Index (VPI), and shows dashboards, scorecards, and exportable reports.

**Tech stack**
- Frontend: React 18 + Vite + Tailwind (in `app/`), React Router, Zustand,
  TanStack Query, Recharts, react-pdf, papaparse.
- Backend: **Supabase** — Postgres + Auth + Row Level Security + Edge Functions.
  There is no separate Node/Express server.

**Repo layout**
```
app/                         React frontend (this is what gets hosted)
supabase/
  migrations/                SQL: schema, RLS policies, VPI trigger
  seed.sql                   sample admin user + demo data
  functions/                 3 Edge Functions (server-side logic)
    surveys/                 public, token-validated survey GET/submit
    send-survey-emails/      sends survey invitations via Gmail SMTP
    admin-users/             ADMIN-only user create/delete
```

**Roles:** ADMIN (full access + user mgmt), HR (read all + manage data),
VIEWER (read-only). Volunteers/supervisors are NOT app users — they only get
emailed survey links.

**VPI formula:** `VPI% = ((Task + Professionalism + Impact + (Overall / 2)) / 4) × 20`
- A ≥ 80% (Retain & Recognise), B 60–79% (Develop & Monitor), C < 60% (Urgent Review).

---

## 2. Environment constraints (important)

This machine is **Windows + Git Bash**, with two known issues:

1. **IPv6 is broken on this network.** The Supabase CLI prefers IPv6 and fails
   with `TransportError`. ➜ **Do all Supabase setup in the browser (dashboard),
   not the CLI.** Browsers and `curl` fall back to IPv4 automatically, so the
   deployed app is unaffected.

2. **The project folder is named `M&E`** — the `&` breaks `npm run` on Windows.
   ➜ Either rename the folder to remove the `&` (e.g. `M-and-E`) so `npm run dev`
   works, OR run tools directly via Node:
   - Dev server: `node node_modules/vite/bin/vite.js`
   - Build: `node node_modules/vite/bin/vite.js build`
   - Tests: `node node_modules/vitest/vitest.mjs run`
   (Run these from inside the `app/` folder. Hosting providers build in their own
   Linux environment, so the `&` never affects the deployed site.)

Supabase project ref for this project: `djwcndqdxwsnycnclbcf`

---

## 3. Status — already completed

- [x] All app code and the 3 Edge Functions are written.
- [x] The 3 Edge Functions are deployed via the dashboard: `surveys`,
      `send-survey-emails`, `admin-users`.
- [x] Edge Function secrets to set in the dashboard: `SMTP_USER`, `SMTP_PASS`,
      `EMAIL_FROM`, `APP_URL` (see Step 5 below).

## Remaining steps: 4 → 8 below.

---

## 4. Step 1 — Database (Supabase SQL Editor, browser)

Open Supabase Dashboard → **SQL Editor** → **New query**. Paste the FULL contents
of each file below and click **Run**, one at a time, **in this exact order**:

1. `supabase/migrations/20260603000001_schema.sql`  (tables + triggers)
2. `supabase/migrations/20260603000002_rls.sql`      (security policies)
3. `supabase/migrations/20260603000003_vpi_trigger.sql` (VPI calculation)
4. `supabase/migrations/20260603000004_surveys.sql`  (survey lifecycle)
5. `supabase/migrations/20260603000005_custom_surveys.sql` (custom surveys)
6. `supabase/migrations/20260603000006_access_requests.sql` (signup requests)
7. `supabase/seed.sql`  (optional sample data + the admin login)

Each run should report success. After file 4, you'll have a login:
- **Email:** `admin@afrivate.com`
- **Password:** `Afrivate2026!`  ← change this after first login.

> If file 4 errors on the `auth.users` insert (some projects differ), create the
> admin manually instead: Dashboard → **Authentication → Add user** (email +
> password, mark email confirmed), then in SQL Editor run:
> `update public.profiles set role = 'ADMIN' where email = 'YOUR_EMAIL';`

---

## 5. Step 2 — Frontend environment file

In the `app/` folder, copy `.env.example` to `.env` and fill in two values from
Supabase Dashboard → **Settings → API**:

```
VITE_SUPABASE_URL="https://djwcndqdxwsnycnclbcf.supabase.co"
VITE_SUPABASE_ANON_KEY="<the anon / public key>"
```

Use the **anon public** key (NOT the service_role key — that one is secret and
must never go in the frontend).

---

## 6. Step 3 — Run locally to confirm it works

From inside `app/`:

```bash
npm install
# then EITHER (if you renamed the folder to remove '&'):
npm run dev
# OR (works regardless of the '&' issue):
node node_modules/vite/bin/vite.js
```

Open the printed URL (usually http://localhost:5173) and sign in with the admin
account. You should see the dashboard with the seeded demo data. Optionally run
the unit tests: `node node_modules/vitest/vitest.mjs run` (9 tests should pass).

---

## 7. Step 4 — Deploy the frontend (Netlify)

The repo includes `netlify.toml` at the project root — Netlify reads it automatically.

### Where secrets go (read this first)

| Secret | Where it lives | Why |
|--------|----------------|-----|
| `VITE_SUPABASE_URL` | **Netlify** env vars | Public; baked into the browser bundle at build time |
| `VITE_SUPABASE_ANON_KEY` | **Netlify** env vars | Public anon key — safe in frontend |
| `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | **Supabase** Edge Function secrets | Server-only; never put on Netlify |
| `APP_URL`, `LOGO_URL` | **Supabase** Edge Function secrets | Survey links + email logo URL |

**Do not** put Gmail passwords or `service_role` keys in Netlify. The React app has no server — email runs in Supabase Edge Functions.

### 7a. Connect the site

1. Push this repo to GitHub.
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** → GitHub.
3. Netlify should auto-detect from `netlify.toml`:
   - **Base directory:** `app`
   - **Build command:** `npm ci && npm run build`
   - **Publish directory:** `app/dist`
4. Before deploying, open **Site configuration → Environment variables** and add:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://djwcndqdxwsnycnclbcf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon public key |

5. Click **Deploy site**. You'll get a URL like `https://random-name.netlify.app`.
6. Optional: **Domain management** → add a custom domain (e.g. `mande.afrivate.com`).

SPA routing is handled by `netlify.toml` (`/* → /index.html`) so survey links like `/survey/volunteer/<token>` work on refresh.

### 7b. If the repo isn't on GitHub yet

```bash
git init
git add .
git commit -m "Afrivate M&E platform"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

`.gitignore` excludes `node_modules`, `dist`, and `.env`.

---

## 8. Step 5 — Configure Gmail SMTP (Supabase Dashboard)

Survey emails are sent from **afrivatehr@gmail.com** via Gmail SMTP.

### 8a. Create a Gmail App Password

1. Sign in to **afrivatehr@gmail.com**
2. Enable **2-Step Verification** on the Google account (required)
3. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Create an app password (name it e.g. "Afrivate M&E")
5. Copy the 16-character password (no spaces)

### 8b. Set Edge Function secrets

Supabase Dashboard → **Edge Functions → Secrets** → add:

| Secret | Value |
|--------|-------|
| `SMTP_USER` | `afrivatehr@gmail.com` |
| `SMTP_PASS` | the 16-character app password |
| `EMAIL_FROM` | `Afrivate M&E <afrivatehr@gmail.com>` |
| `APP_URL` | your Netlify URL (e.g. `https://mande.netlify.app`) |

Remove any old `PLUNK_API_KEY` or `PLUNK_API_URL` secrets if present.

Then redeploy the email function (Dashboard → Edge Functions → `send-survey-emails` → paste updated code → Deploy, or use CLI).

---

## 9. Step 6 — Point survey links at the live site

Now that you have the real URL, update the `APP_URL` secret so emailed survey
links go to production (not localhost):

Supabase Dashboard → **Edge Functions → Secrets** → edit `APP_URL` to your
deployed URL, e.g. `https://your-site.netlify.app`. (No redeploy of functions
needed — secrets are read at runtime.)

---

## 10. Step 7 — End-to-end verification

1. Open the live URL, sign in as admin, and **change the admin password**
   (Supabase Dashboard → Authentication, or create a fresh admin and remove the
   seed one in the app's Settings page).
2. Go to **Deployments → New deployment**. Use a volunteer email and an org
   contact email you control. Save.
3. Both addresses should receive a survey invitation email (sent from afrivatehr@gmail.com).
   - If emails don't arrive: check spam; confirm `SMTP_PASS` is a Gmail **app password** (not the login password); confirm 2-Step Verification is on for the Google account.
4. Open a survey link, submit it. Submit the matching second survey.
5. Once BOTH surveys for a deployment are in, the dashboard shows that
   volunteer's VPI score and category (the database trigger computes it).

---

## 11. Reference

**Edge Function names (must match exactly — the app calls them by name):**
`surveys`, `send-survey-emails`, `admin-users`.

**Edge Function secrets (set in dashboard):**
| Secret | Example | Purpose |
|---|---|---|
| `SMTP_USER` | `afrivatehr@gmail.com` | Gmail account for sending |
| `SMTP_PASS` | 16-char app password | Gmail app password (not login password) |
| `SMTP_HOST` | `smtp.gmail.com` | Optional — default is Gmail |
| `SMTP_PORT` | `587` | Optional — default 587 |
| `EMAIL_FROM` | `Afrivate M&E <afrivatehr@gmail.com>` | Sender shown to recipients |
| `APP_URL` | `https://your-site.netlify.app` | Base URL in survey links and email logo |

(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected by
Supabase automatically — do not add them.)

**Frontend env vars (`app/.env` locally, Netlify env vars in production):**
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only.

**Security:**
- Never commit `.env` (already gitignored).
- Never put the `service_role` key in the frontend or in chat.
- Rotate any key that gets exposed.

---

## 12. Troubleshooting

- **Supabase CLI says `TransportError` / `Could not resolve host`** → IPv6 issue
  on this network. Use the dashboard (browser) instead, as this guide does.
- **`npm run dev` fails with a broken path** → the `&` in the folder name. Rename
  the folder or use the `node node_modules/vite/bin/vite.js` form.
- **Login works but pages are empty / errors about Supabase** → `app/.env` is
  missing or has the wrong URL/anon key, or Step 1 (database SQL) wasn't run.
- **Survey link says "invalid/expired"** → the deployment's tokens weren't created
  (re-create the deployment, or use "Resend survey emails" on the Deployments
  page), or the link is past its expiry (set in Settings, default 14 days).
- **Refreshing a survey URL 404s on the host** → ensure `netlify.toml` is at the
  repo root (SPA redirect to `/index.html`).
