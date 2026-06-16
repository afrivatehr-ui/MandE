# Afrivate M&E Platform

Internal Monitoring & Evaluation web app for AfriVate Technologies Ltd. It tracks
volunteer deployments, collects feedback from volunteers and partner organisations,
auto-calculates a Volunteer Performance Index (VPI), and presents dashboards,
scorecards, and exportable reports.

## Architecture

A React frontend talking directly to **Supabase** (Postgres + Auth + Row Level
Security + Edge Functions). There is no separate Node/Express server to maintain.

```
MandE/
├── app/                    React frontend (Netlify via netlify.toml)
│   └── src/                pages, components, api, utils, store
├── supabase/
│   ├── migrations/         SQL schema, RLS, VPI triggers
│   ├── seed.sql            Demo data
│   └── functions/          surveys, send-survey-emails, admin-users, request-access
├── netlify.toml
├── README.md
├── DEPLOYMENT.md
└── MANDE_SYSTEM_WALKTHROUGH.md
```

| Spec backend piece | Here |
|---|---|
| PostgreSQL + Prisma | Supabase Postgres + SQL migrations |
| JWT + bcrypt auth | Supabase Auth |
| Role middleware (ADMIN/HR/VIEWER) | `profiles` table + RLS policies |
| Express REST API | `supabase-js` from React |
| VPI calc trigger | Postgres trigger (source of truth) |
| Nodemailer | `send-survey-emails` Edge Function + Gmail SMTP |
| Puppeteer / json2csv | client-side `@react-pdf/renderer` + `papaparse` |
| Docker | not needed (Supabase hosted) |

## Prerequisites

- Node.js 18+
- A Supabase project (you have one)
- Gmail account **afrivatehr@gmail.com** with a [Google App Password](https://myaccount.google.com/apppasswords) for SMTP (requires 2-Step Verification)

## 1. Database setup

Apply the SQL in order. Easiest path without extra tooling: open the Supabase
dashboard -> **SQL Editor** and run each file's contents in this order:

1. `supabase/migrations/20260603000001_schema.sql`
2. `supabase/migrations/20260603000002_rls.sql`
3. `supabase/migrations/20260603000003_vpi_trigger.sql`
4. `supabase/migrations/20260603000004_surveys.sql`
5. `supabase/migrations/20260603000005_custom_surveys.sql`
6. `supabase/migrations/20260603000006_access_requests.sql`
7. `supabase/migrations/20260607000007_deployment_survey_targets.sql`
8. `supabase/migrations/20260607000008_deployment_both_parties.sql`
9. `supabase/migrations/20260608000009_vpi_recalc_archive.sql`
10. `supabase/migrations/20260609000010_access_roles_contact.sql`
11. `supabase/migrations/20260610000011_audit_fixes.sql`
12. `supabase/migrations/20260610000012_audit_followup.sql`
13. `supabase/migrations/20260611000013_audit_followup2.sql`
14. `supabase/migrations/20260612000014_audit_followup3.sql`
15. `supabase/seed.sql`  (optional sample data; creates the admin login below)

Or, with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push          # applies migrations
# then run seed.sql via the SQL editor or psql
```

Seed login (change immediately): **admin@afrivate.com** / **Afrivate2026!**

## 2. Edge Functions

Supabase auto-injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` into functions. You only set the email/app secrets:

```bash
supabase secrets set SMTP_USER="afrivatehr@gmail.com"
supabase secrets set SMTP_PASS="your-16-char-gmail-app-password"
supabase secrets set EMAIL_FROM="Afrivate M&E <afrivatehr@gmail.com>"
supabase secrets set APP_URL="https://your-app-domain"   # used in survey links
supabase secrets set ADMIN_NOTIFY_EMAILS="admin@example.com"   # optional extra admin inboxes
supabase secrets set SEND_EMAIL_HOOK_SECRET="your-hook-secret"   # auth email hook (see DEPLOYMENT.md)

supabase functions deploy surveys --no-verify-jwt
supabase functions deploy send-survey-emails
supabase functions deploy admin-users
supabase functions deploy request-access --no-verify-jwt
supabase functions deploy send-auth-email --no-verify-jwt
```

Or set the same secrets in Supabase Dashboard → **Edge Functions → Secrets**.

`surveys` is reached by anonymous respondents using the public anon key; token
validation happens inside the function. The other two require an authenticated
ADMIN/HR caller.

## 3. Frontend

```bash
cd app
cp .env.example .env        # fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open the printed URL and sign in.

Deploy the frontend on **Netlify** (see `DEPLOYMENT.md` and root `netlify.toml`).
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify env vars.
Email secrets (`SMTP_*`, `APP_URL`) go in **Supabase** Edge Function secrets, not Netlify.

### Windows note (important for this folder)

The project folder name `M&E` contains an `&`, which breaks npm's script runner
on Windows (`npm run dev`/`build` fail with a path error). Two options:

- Recommended: rename the folder to remove the `&` (e.g. `M-and-E`), then
  `npm run dev` works normally.
- Or invoke the tools directly via Node:
  - Dev:   `node node_modules/vite/bin/vite.js`
  - Build: `node node_modules/vite/bin/vite.js build`
  - Test:  `node node_modules/vitest/vitest.mjs run`

## VPI scoring

```
VPI% = ((Task + Professionalism + Impact + (Overall / 2)) / 4) x 20
```

- Category A (>= 80%): High Performer - Retain & Recognise
- Category B (60-79%): Developing - Develop & Monitor
- Category C (< 60%): Needs Intervention - Urgent Review

The org-rated survey is the primary score; the deployment VPI is written by a
database trigger only once both surveys are submitted.

## Roles

- **ADMIN** - full access incl. user management and settings
- **HR** - read all data + create/manage volunteers, orgs, deployments
- **VIEWER** - read-only (dashboards and reports)

Volunteers and supervisors are not app users; they complete surveys via unique
tokenised links sent by email.
