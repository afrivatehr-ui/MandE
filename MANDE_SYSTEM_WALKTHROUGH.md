# Afrivate M&E System - Complete Walkthrough Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Getting Started](#getting-started)
4. [Managing Users & Access Requests](#managing-users--access-requests)
5. [Creating Deployments](#creating-deployments)
6. [Surveys: Managing, Previewing & Sending](#surveys-managing-previewing--sending)
7. [VPI Score Calculation](#vpi-score-calculation)
8. [Interpreting Results](#interpreting-results)
9. [Dashboard Guide](#dashboard-guide)
10. [Settings & Administration](#settings--administration)

---

## System Overview

**Afrivate M&E** is a **Monitoring & Evaluation platform** that tracks volunteer performance through:
- **Volunteer self-assessment surveys** - How volunteers felt about their experience
- **Organisation feedback surveys** - How supervisors rated the volunteer's work
- **Automated VPI scoring** - Composite performance index combining both perspectives
- **Performance categorization** - A/B/C player classification with action flags

### Key Concepts

| Term | Definition |
|------|-----------|
| **Deployment** | A volunteer assigned to an organization for a specific date range |
| **VPI** | Volunteer Performance Index (0-100%), combining org effectiveness rating + volunteer satisfaction |
| **Category** | A (≥80%), B (60-79%), C (<60%) - used to classify performance levels |
| **Action Flag** | Recommended HR action: Retain & Recognise (A), Develop & Monitor (B), Urgent Review (C) |

---

## User Roles & Permissions

### ADMIN
- Full system access
- Approve/reject user access requests
- Manage user roles (ADMIN, HR, VIEWER)
- Invite new users
- View all data
- Create, edit, delete deployments
- Send survey invitations

### HR
- Create and manage deployments
- Send survey invitations
- View all volunteer and organisation data
- Cannot manage users or system settings

### VIEWER
- Read-only access to all data
- Cannot create or edit deployments
- Cannot send surveys
- Cannot manage users

---

## Getting Started

### 1. First-Time Admin Setup

**Your First Admin Account** (from seed data):
```
Email:    admin@afrivate.com
Password: Afrivate2026!  (CHANGE AFTER FIRST LOGIN)
```

**Add a Second Admin (e.g., afrivatehr@gmail.com):**
1. Go to **Settings** page (admin only)
2. Click **Invite a new user** at the bottom
3. Fill in:
   - Full name: `M&E Administrator`
   - Email: `afrivatehr@gmail.com`
   - Role: `ADMIN`
   - Temp password: Any 8+ character password
4. Click **Invite user**
5. Share credentials with the user
6. They can change password on first login

### 2. Signup & Access Request Workflow

**For new staff to request access:**
1. Go to `/signup` (or click "Request access" on login page)
2. Fill in:
   - Email
   - Full name
   - Organisation (optional)
   - Role requested (VIEWER / HR / ADMIN)
   - Password (8+ characters)
3. Click **Request Access**
4. Account created with **VIEWER** role (default, limited access)

**For admins to approve requests:**
1. Go to **Settings**
2. See **Pending access requests** section (at top, highlighted in orange)
3. Select desired role from dropdown (VIEWER / HR / ADMIN)
4. Click **Approve** to grant access OR **Reject** to deny

Once approved, user can sign in with their credentials.

---

## Managing Users & Access Requests

### Viewing All Users (Admin Only)

1. Go to **Settings → User management**
2. See all active staff users with their roles
3. To change a user's role: Select new role from dropdown
4. To remove a user: Click **Remove** (confirmation required)

### Pending Requests

**In Settings, top section shows:**
- User name, email, organisation
- Requested role
- Actions: Approve (with role selection) or Reject

---

## Creating Deployments

### Step 1: Go to Deployments Page

1. Click **Deployments** in the main menu
2. Click **+ New deployment**

### Step 2: Choose who receives the survey email

| Option | Who gets emailed | What you must select |
|--------|------------------|----------------------|
| **Volunteer only** | Volunteer self-report survey | Volunteer (recipient) **and** organisation they served at (context) |
| **Organisation only** | Organisation effectiveness survey | Organisation (recipient) **and** volunteer being rated (context) |
| **Both parties** | Both survey emails | Volunteer **and** organisation |

Every deployment always records **both** a volunteer and an organisation so surveys and emails show the correct names.

### Step 3: Fill the form

| Field | Details |
|-------|---------|
| **Volunteer** | Select or create. Email required only when the volunteer receives the survey. |
| **Organisation** | Select or create. Contact email required only when the organisation receives the survey. |
| **Role Title** | e.g., "Community Health Data Analyst" |
| **Start / End Date** | Placement period |

### Step 4: Create

- Click **Create & email…** (label varies by target)
- Tokens are generated only for the survey type(s) chosen
- Emails send from **afrivatehr@gmail.com** with Afrivate branding
- Use **Email V** / **Email O** to resend one party; **Links** to copy URLs

### Important Notes

- **Survey tokens** expire 14 days after end date (Settings)
- Surveys must be **Published** before invitation emails send
- **Paired deployment VPI:** both surveys required; org score is primary
- **Organisation-only:** org VPI written when org survey submitted
- **Volunteer-only:** volunteer self-report VPI written when volunteer survey submitted
- Emails are responsive, include the Afrivate logo, and say **do not reply**

---

## Surveys: Managing, Previewing & Sending

> The old **"Survey Testing"** page has been replaced by a production **Surveys** page (`/surveys` in the menu, visible to **Admin** and **HR**). The old `/survey-test` URL now redirects here automatically.

Afrivate runs **two standard surveys**, each managed from this page:

- **Volunteer Self-Report Survey** — completed by the volunteer.
- **Organisation Feedback Survey** — completed by the partner organisation's supervisor.

Each survey is shown as a card with its **status**, **live response count**, last response date, and default link expiry.

### Survey statuses (lifecycle)

| Status | Meaning | Effect |
|--------|---------|--------|
| **Draft** | Being prepared | Not collecting responses; invitation emails for this survey are **skipped** |
| **Scheduled** | Set to go live on a chosen date | Not yet collecting responses |
| **Published** | Live | **Collecting responses**; invitation emails are sent and links work |
| **Closed** | Retired | **Stops accepting new responses**; existing links show "Survey not open" |

Both surveys ship as **Published** by default.

### Editing a survey & viewing responses (Admin/HR)

1. Go to **Surveys** in the menu.
2. On a survey card, click **Edit & view responses**.
3. A panel opens with three tabs:
   - **Responses** — every person who has completed the survey. Click any row to read full answers. Download a single response or all responses as CSV.
   - **Questions** — the full question set (read-only).
   - **Settings** — edit title/description/status/schedule/default expiry, then **Save**.

### Previewing / filling a survey (see the respondent experience)

You don't need a real token or deployment to experience a survey:

1. Go to **Surveys**.
2. Click **Preview & fill** on a survey card.
3. The survey opens full-screen and includes a **Preview** banner (nothing is saved).

### Creating your own (custom) survey

Beyond the two built-in surveys, Admin/HR can create custom standalone surveys.

1. On the **Surveys** page click **+ New survey**.
2. Enter a title, optional audience/description.
3. Add questions (rating/scale/multiple choice/long text).
4. Publish immediately or save as a Draft.

Custom surveys are standalone (no impact on VPI scoring). They get a shareable link at:
`/survey/custom/<id>`.

> Built-in surveys (Volunteer / Organisation) cannot be deleted; their questions are fixed because they power the VPI engine.

### Sending real survey invitations

Invitations are automated from the **Deployments** page.

- Choose whether the volunteer, organisation, or both receive survey emails.
- Tokens are generated per survey type selected.
- Invitation emails are sent only for surveys that are **Published**.

Implementation detail (code-level):
- `Deployments.jsx` calls `sendSurveyEmails(deployment.id, expiryDays, types)`.
- That invokes the Supabase Edge Function `send-survey-emails` via `app/src/api/data.js`.
- The email function returns a delivery report used to show accurate “sent / skipped / missing / failed” toasts.


---

## VPI Score Calculation

The platform uses one core formula:

```
VPI% = ((taskPerf + professionalism + impact + (overall10 ÷ 2)) / 4) × 20
```

- Dimension scores are section averages on a 1–5 scale.
- `overall10` is an overall 1–10 question, halved to normalise to 1–5.
- A database trigger calculates the final VPI and stores it.

### Organisation effectiveness survey (primary VPI for paired deployments)

Org-rated survey drives the primary VPI when a deployment is “paired” (both surveys submitted):
- `org_vpi` is stored from the org response

### Volunteer self-report survey (supporting / standalone)

Volunteer survey uses the same formula but maps answers into the volunteer proxy dimensions.

---

## Interpreting Results

(Existing operational guidance unchanged.)

---

## Dashboard Guide

(Existing operational guidance unchanged.)

---

## Settings & Administration

(Existing operational guidance unchanged.)

---

## System Architecture Notes (code-level: updated)

### 1) Frontend runtime model

- React app is mounted in `app/src/main.jsx` with `react-router-dom` and `@tanstack/react-query`.
- Route-level orchestration is in `app/src/App.jsx`:
  - **Public** survey routes:
    - `/survey/volunteer/:token` → `VolunteerSurvey`
    - `/survey/org/:token` → `OrgSurvey`
    - `/survey/custom/:id` → `CustomSurvey`
  - **Authenticated** routes wrapped by `ProtectedRoute` + `AppLayout`.

### 2) Auth + role

- Supabase client lives in `app/src/lib/supabase.js`.
- `useAuthStore` in `app/src/store/authStore.js` loads the Supabase session and then fetches the user profile (`profiles` table) to get the `role`.
- The UI uses helper checks (`isWriter`, `isAdmin`) to gate writer-only actions (e.g., creating/editing surveys).

### 3) Respondent survey flow (tokenised)

Token-based survey taking is implemented as:
- `app/src/components/survey/SurveyPage.jsx`
  - Calls `getSurveyContext(token)` (anonymous call via Edge Function gateway)
  - Handles states:
    - loading
    - error (bad/expired token)
    - alreadySubmitted
    - accepting=false → “Survey not open”
  - Renders `SurveyFlow` with the correct built-in config:
    - `ORG_SURVEY` vs `VOLUNTEER_SURVEY`
- `app/src/components/survey/SurveyFlow.jsx`
  - Builds an ordered step list:
    - Identification
    - 1..N Likert sections
    - Optional overall section
    - Optional feedback section
  - Enforces step validation before Next/Submit.

Submission uses:
- `app/src/api/surveys.js` → `submitSurvey(token, answers)`
- After successful submit, `SurveyPage` shows a confirmation recap (depends on org vs volunteer).

### 4) Custom surveys (standalone)

- `app/src/pages/surveys/CustomSurvey.jsx`
  - Loads definition and `accepting` via `getCustomSurvey(id)`.
  - On submit, splits the optional respondent identity fields:
    - `__name`, `__email`
  - Calls `submitCustomSurvey(surveyId, answers, respondent)`.

### 5) Staff survey management UI

- `app/src/pages/surveys/Surveys.jsx` shows survey cards and opens `SurveyManager`.
- `app/src/pages/surveys/SurveyManager.jsx` provides a 3-tab panel:
  - Responses (search + CSV export + response details)
  - Questions (read-only structure)
  - Settings (status lifecycle + schedule + default expiry + share link for custom)
- `app/src/pages/surveys/SurveyBuilder.jsx` creates a custom survey definition:
  - rating → Likert section
  - scale → slider dimensions
  - choice → radio options
  - text → feedback fields

### 6) Preview behaviour

- `app/src/pages/surveys/SurveyPreview.jsx`
  - Renders `SurveyFlow` in a “Preview” mode by passing sample context and using a no-op submit handler.
  - A “Preview again” button restarts the flow.

### 7) Where backend “truth” lives

- The VPI result shown in dashboards comes from database trigger logic (per README).
- The app’s staff UI reads stored computed values and raw answers from Supabase tables.
- Respondent submissions are routed through Supabase Edge Functions (token validation + persistence).

---

## Common Workflows

(Existing operational guidance unchanged.)

---

## Troubleshooting

(Existing operational guidance unchanged.)

---

## System Audit (known gaps & operational checklist)

(Existing checklist unchanged.)

---

## Support & Further Questions

(Existing support guidance unchanged.)

**System built with:** React, Supabase, Tailwind CSS, Recharts
**Last updated:** June 2026

