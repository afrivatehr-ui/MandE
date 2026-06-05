# Afrivate M&E Platform

Internal Monitoring & Evaluation web app for AfriVate Technologies Ltd. It tracks
volunteer deployments, collects feedback from volunteers and partner organisations,
auto-calculates a Volunteer Performance Index (VPI), and presents dashboards,
scorecards, and exportable reports.

## Architecture

A React frontend talking directly to **Supabase** (Postgres + Auth + Row Level
Security + Edge Functions). There is no separate Node/Express server to maintain.

```
app/                  React 18 + Vite + Tailwind frontend
  src/
    components/       Reusable UI (Section 9 of the spec) + survey flow
    pages/            auth, dashboard, volunteers, organisations,
                      deployments, reports, settings, surveys (public)
    store/            Zustand stores (auth, toast, settings)
    hooks/            React Query data hooks
    api/              supabase-js data + edge-function clients
    utils/            vpiEngine.js (+ tests), analytics, csv, formatting
    config/           survey question definitions
supabase/
  migrations/         SQL schema, RLS, VPI trigger
  seed.sql            sample admin user + volunteers/orgs/deployments
  functions/
    surveys/          public, token-validated survey GET/submit
    send-survey-emails/  emails invitations via Plunk
    admin-users/      ADMIN-only user create/delete
```

| Spec backend piece | Here |
|---|---|
| PostgreSQL + Prisma | Supabase Postgres + SQL migrations |
| JWT + bcrypt auth | Supabase Auth |
| Role middleware (ADMIN/HR/VIEWER) | `profiles` table + RLS policies |
| Express REST API | `supabase-js` from React |
| VPI calc trigger | Postgres trigger (source of truth) |
| Nodemailer | `send-survey-emails` Edge Function + Plunk |
| Puppeteer / json2csv | client-side `@react-pdf/renderer` + `papaparse` |
| Docker | not needed (Supabase hosted) |

## Prerequisites

- Node.js 18+
- A Supabase project (you have one)
- A [Plunk](https://useplunk.com) account + secret API key and a verified sending domain (for survey emails)

## 1. Database setup

Apply the SQL in order. Easiest path without extra tooling: open the Supabase
dashboard -> **SQL Editor** and run each file's contents in this order:

1. `supabase/migrations/20260603000001_schema.sql`
2. `supabase/migrations/20260603000002_rls.sql`
3. `supabase/migrations/20260603000003_vpi_trigger.sql`
4. `supabase/seed.sql`  (optional sample data; creates the admin login below)

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
supabase secrets set PLUNK_API_KEY=your_plunk_secret_key   # starts with sk_
supabase secrets set EMAIL_FROM="Afrivate M&E <surveys@yourdomain.org>"  # domain verified in Plunk
supabase secrets set APP_URL="https://your-app-domain"   # used in survey links

supabase functions deploy surveys
supabase functions deploy send-survey-emails
supabase functions deploy admin-users
```

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
