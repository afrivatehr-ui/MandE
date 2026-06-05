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
2. Click **Create Deployment** button

### Step 2: Fill Deployment Form

| Field | Details |
|-------|---------|
| **Volunteer** | Select from dropdown (or create if new) |
| **Organisation** | Select partner organisation |
| **Role Title** | e.g., "Community Health Data Analyst" |
| **Start Date** | When volunteer begins |
| **End Date** | When volunteer finishes |
| **Status** | Usually "ACTIVE" initially |

### Step 3: Create

- Click **Create Deployment**
- System automatically generates **2 survey tokens**:
  - One for volunteer self-report
  - One for organisation feedback

### Important Notes

- **Survey tokens** are valid until 14 days after end date (configurable in Settings)
- Invitation emails are sent automatically on creation; you can **Resend** or copy **Links** anytime from the Deployments page
- Invitations are only sent for surveys that are **Published** (manage on the Surveys page)
- Both surveys must be completed for VPI to calculate

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
2. On a survey card, click **Edit & view responses**. A panel opens with three tabs:
   - **Responses** — every person who has completed the survey (volunteer/supervisor, organisation, role, date, key scores, VPI). Click any row to read the full answers. Download a **single response** or **all responses** as CSV.
   - **Questions** — the full question set (read-only; questions are standardised so VPI stays comparable).
   - **Settings** — edit the title, description, **status**, **scheduled release date**, and default link expiry, then **Save**. (Viewers see this read-only.)

### Previewing / filling a survey (see the respondent experience)

You don't need a real token or deployment to experience a survey:

1. Go to **Surveys**.
2. Click **Preview & fill** on a survey card (or the **Preview & fill** button inside the editor).
3. The survey opens **full-screen exactly as a volunteer or organisation respondent sees it**, using sample details.
4. Fill it out and submit — a **"Preview" banner** stays at the top and **nothing is saved**. Use **Preview again** to restart or **Close preview** to return.

### Creating your own (custom) survey

Beyond the two built-in surveys, Admin/HR can create **custom standalone surveys** (e.g. a mid-deployment check-in or a partner pulse survey).

1. On the **Surveys** page click **+ New survey**.
2. Enter a **title**, optional **audience** and **description**.
3. Add questions — choose a type for each:
   - **Rating (1–5 agreement)** — Strongly disagree → Strongly agree
   - **Scale (slider)** — a numeric range you define (e.g. 0–10)
   - **Multiple choice** — one option from a list
   - **Long text** — open written answer
   Reorder with ↑/↓ and remove with ✕.
4. Tick **Publish immediately**, or leave it to save as a **Draft**.
5. Click **Create survey**.

The survey appears as its own card. Open it → **Settings** to copy its **public link** (`/survey/custom/…`) and share it with anyone — no deployment needed. Responses appear under the **Responses** tab and can be downloaded as CSV, just like the built-in surveys. Custom surveys are standalone and **do not affect VPI scoring**.

> Built-in surveys (Volunteer / Organisation) cannot be deleted and their questions are fixed, because they power the VPI engine. Custom surveys can be freely edited (status) and deleted.

### Survey actions (publish / unpublish / close / delete)

Each survey card has quick actions (Admin/HR):

- **Publish** — make it live and start collecting responses (also enables invitation emails for built-ins).
- **Unpublish** — return it to **Draft** so it can be published again later.
- **Close** — stop accepting new responses.
- **Reopen** — re-publish a closed survey.
- **Delete** — permanently remove a **custom** survey and its responses (built-ins can't be deleted).

You can also change status/schedule and edit details in **Edit → Settings**.

### Sending real survey invitations

Invitations are **automated** and sent from the **Deployments** page:

1. Create a deployment (this auto-generates the two survey tokens). Survey emails are sent immediately to the volunteer and organisation contact.
2. To re-send, use the **Resend** action on the deployment row.
3. To share manually instead, use **Links** on the deployment row to copy the survey URLs.

**Publish-gating:** invitations are only sent for surveys that are **Published**. If, for example, the Volunteer survey is in Draft, creating/resending a deployment will email the organisation but **skip the volunteer**, and the app will tell you which survey was skipped. A respondent opening a link for a non-Published survey sees a **"Survey not open"** message.

> Automated emails require the `PLUNK_API_KEY` secret on the `send-survey-emails` Edge Function (see DEPLOYMENT.md). Without it, generate the deployment and share the copied links manually.

---

## VPI Score Calculation

### Formula

```
VPI% = ((taskPerf + professionalism + impact + (overall/2)) / 4) × 20
```

### What It Measures

**From Organisation Survey (Primary VPI):**
- **Task Performance** (avg of 6 questions, 1-5 scale)
  - Completed tasks to standard
  - Skills demonstrated
  - Met deadlines
  - Initiative shown
  - Work quality
  - Minimal supervision needed
  
- **Professionalism** (avg of 5 questions, 1-5 scale)
  - Professional behaviour
  - Clear communication
  - Policy adherence
  - Punctuality
  - Team integration
  
- **Impact** (avg of 4 questions, 1-5 scale)
  - Measurable value created
  - Mission support
  - Irreplaceable contribution
  - Positive effect on staff morale
  
- **Overall Effectiveness** (1 question, 1-10 scale → normalized to 1-5)
  - General supervisor rating of the volunteer

### Calculation Example

```
Task Performance:  4.0 (avg of 6 ratings)
Professionalism:   4.2 (avg of 5 ratings)
Impact:            3.8 (avg of 4 ratings)
Overall Eff:       9/2 = 4.5 (from 1-10 scale)

VPI = ((4.0 + 4.2 + 3.8 + 4.5) / 4) × 20
    = (16.5 / 4) × 20
    = 4.125 × 20
    = 82.5%
```

### VPI Categories & Actions

| Category | VPI Range | Action Flag | Description |
|----------|-----------|-------------|-------------|
| **A** | ≥ 80% | Retain & Recognise | High performer - fast-track, formal recognition |
| **B** | 60-79% | Develop & Monitor | Developing - structured support, monitoring |
| **C** | < 60% | Urgent Review | Needs intervention - coaching, re-deployment decision |

### Volunteer Survey (Supporting Data)

Self-report measures satisfaction in 4 dimensions:
- **Onboarding & Support** - Clear briefing, welcome, tools, Afrivate support, contact person
- **Work Experience** - Skills match, meaningful impact, responsibility, workload, feedback, learning
- **Organisational Environment** - Culture, safety, collaboration, communication
- **Overall Satisfaction** - 1-10 rating + NPS (0-10) + would volunteer again

*Note: Volunteer VPI is proxy; org survey is primary.*

---

## Interpreting Results

### Dashboard Overview

**Available in Dashboard view:**

- **Total Volunteers** - Active in current cycle (clickable → Volunteers list)
- **Average VPI** - Mean org-rated VPI across all deployments
- **A-Players** - Count with VPI ≥ 80% (clickable → Deployments filtered)
- **B-Players** - Count with VPI 60-79% (clickable → Deployments filtered)
- **C-Players** - Count with VPI < 60% (clickable → Deployments filtered, orange alert if > 0)
- **Partner Orgs** - Active organisations (clickable → Organisations list)

**Charts:**
- **Performance Distribution** - Bar chart of A/B/C spread
- **Dimension Radar** - Org-rated averages: Task Perf, Professionalism, Impact
- **Recent Submissions** - Latest 5 survey completions
- **Action Flags** - Count by category with recommended actions

### Deployment Detail View

1. Go to **Deployments**
2. Click any deployment
3. View:
   - **Deployment info** - Volunteer, org, role, dates
   - **VPI score & category** - If both surveys done
   - **Survey status** - Volunteer/org submitted?
   - **Action flag** - Retain/Develop/Review
   - **Volunteer survey details** - Self-assessment responses
   - **Organisation survey details** - Supervisor ratings
   - **Section breakdowns** - Dimension averages

### Reports Page

1. Go to **Reports**
2. View multiple report types:
   - **Performance Summary** - All deployments with VPI/category/flag
   - **By Organisation** - Breakdown per partner
   - **By Dimension** - Average scores across all volunteers
   - **Action Items** - Grouped by category (Retain/Develop/Urgent Review)

---

## Dashboard Guide

### Main View

**Top Section (KPI Cards - All Clickable):**
- Purple cards: Total Volunteers, Average VPI
- Performance cards: A-Players, B-Players, C-Players, Partner Orgs

**Chart Section:**
- Performance distribution (how many A/B/C)
- Dimension averages radar chart
- Recent survey submissions timeline
- Action flags by category

### Navigation from Dashboard

- Click **Total Volunteers** → See volunteers list
- Click **Performance cards** → See deployments view
- Click **Partner Orgs** → See organisations
- Click chart items → Filter to that group

### Empty State

If no deployments exist:
- Button: **Go to deployments** → Create first deployment

---

## Settings & Administration

### User Management (Admin Only)

1. Go to **Settings**
2. **Pending access requests** section:
   - View new signups requesting access
   - Select role and approve/reject
   - Approved users can immediately log in

3. **User management** section:
   - Change existing user roles
   - Remove users (cannot remove own admin account)
   - Invite new users directly (without signup request)

### Survey Token Expiry

1. Go to **Settings**
2. **Survey token expiry** section
3. Set days after deployment end date links remain valid
4. Default: 14 days
5. Applies to NEW deployments only

### Email Configuration

Emails are sent via **Plunk** (https://useplunk.com).

- **Plunk API Key** - the *secret* key (starts with `sk_`), required for automated survey invitations
- **Email From** - sender address (the domain must be verified in Plunk)
- **App URL** - base URL for survey links

*These are set via Supabase CLI, not in this UI:*
```bash
supabase secrets set PLUNK_API_KEY=sk_xxx
supabase secrets set EMAIL_FROM="Afrivate M&E <surveys@yourdomain.org>"
supabase secrets set APP_URL="https://mande.afrivate.com"
supabase functions deploy send-survey-emails
```

---

## Common Workflows

### Workflow 1: Onboard a New HR Staff Member

1. Have them go to `/signup`
2. Request access as **HR**
3. You approve from Settings
4. They can now create deployments and send surveys

### Workflow 2: Evaluate a Volunteer's Performance

1. **Create Deployment** with volunteer's details
2. **Send survey links** to:
   - Volunteer (self-report)
   - Supervisor (organisation feedback)
3. **Wait for submissions** (both required for VPI)
4. **View results** in Deployments detail or Reports
5. **Check action flag** for HR recommendation
6. **Take action** (retain/develop/review)

### Workflow 3: Generate Performance Report

1. Go to **Reports** page
2. Choose report type:
   - All volunteers (performance summary)
   - By organisation
   - By dimension (which skills strongest/weakest)
   - Action items (grouped by category)
3. Export or print for leadership review

### Workflow 4: Identify C-Players for Intervention

1. Dashboard shows **C-Players count**
2. Click card to filter to C-category
3. Review individual deployment details
4. Check **action flag: Urgent Review**
5. Contact volunteer/organisation for feedback
6. Decide: coaching, re-deployment, or exit

---

## Troubleshooting

### I don't see pending access requests in Settings

**Solution:**
- Ensure you're logged in as ADMIN
- Refresh page (Cmd+R)
- Check if there actually are pending requests (no requests = empty)

### Survey links show 404

**Solution:**
- Ensure deployment was created successfully
- Use the **Links** action on the deployment row to copy a fresh link
- Confirm the link hasn't expired (default 14 days after end date)

### Survey shows "Survey not open"

**Solution:**
- The survey's status is not **Published**. Go to **Surveys** → open the survey → **Settings** → set status to **Published** → **Save**.

### "Couldn't load surveys" / table not found

**Solution:**
- The `surveys` table migration hasn't been applied. Apply `supabase/migrations/20260603000004_surveys.sql` (via `supabase db push` or the Supabase SQL Editor), then refresh. The page still works read-only until then.

### VPI not calculating

**Solution:**
- **Both surveys must be submitted** - VPI only appears after both done
- Check deployment status (should be ACTIVE)
- Refresh page to reload data

### Can't send surveys

**Solution:**
- Confirm the survey is **Published** (Surveys → Settings) — Draft/Scheduled surveys are skipped when sending
- For automated emails, set the `PLUNK_API_KEY` secret on the `send-survey-emails` Edge Function in Supabase
- Otherwise, use the **Links** action on a deployment to copy/share links manually

### "Email sent" but nothing arrives (most common email issue)

The app reports the **real** delivery result (e.g. "Sent to Volunteer", "Could not send to Organisation (…)"). If the message is accepted but recipients get nothing, it's almost always the **sender domain**:

- Emails are sent via **Plunk**. The `EMAIL_FROM` address must be on a domain you have **verified in Plunk** (Plunk dashboard → Settings → Identity/Domain → add the SPF/DKIM DNS records).
- Make sure `PLUNK_API_KEY` is the **secret** key (starts with `sk_`), not the public key.
- **Fix:**
  ```bash
  npx supabase secrets set PLUNK_API_KEY=sk_xxx
  npx supabase secrets set EMAIL_FROM="Afrivate M&E <surveys@yourdomain.org>"
  npx supabase secrets set APP_URL="https://your-app-domain"
  npx supabase functions deploy send-survey-emails
  ```
- Also confirm the volunteer/organisation records have **valid email addresses**.

### User role change not taking effect

**Solution:**
- User must **log out and log back in** for role change to apply
- Tell user to restart browser session

---

## Key Metrics Summary

| Metric | Source | Use Case |
|--------|--------|----------|
| **VPI%** | Org survey | Primary performance score |
| **Category (A/B/C)** | VPI range | Quick classification |
| **Action Flag** | Category | HR recommendation |
| **Task Performance** | Org survey section | Skills quality |
| **Professionalism** | Org survey section | Conduct/behaviour |
| **Impact** | Org survey section | Organisational value |
| **Volunteer Satisfaction** | Volunteer survey | Experience quality |
| **NPS Score** | Volunteer survey (0-10) | Afrivate brand health |

---

## Quick Reference: Survey Question Breakdown

### Organisation Effectiveness Survey (Org-Rated)

**Section 2: Task Performance** (6 Qs, 1-5 scale)
- Tasks completed to standard
- Skills demonstrated
- Deadlines met
- Initiative
- Work quality
- Minimal supervision

**Section 3: Professionalism & Conduct** (5 Qs, 1-5 scale)
- Professional behaviour
- Communication
- Policy adherence
- Punctuality
- Team integration

**Section 4: Impact & Value** (4 Qs, 1-5 scale)
- Measurable value
- Mission support
- Irreplaceable contribution
- Staff morale effect

**Section 5: Overall Assessment** (3 Qs)
- Overall effectiveness (1-10)
- Would request again? (Yes/Unsure/No)
- Same volunteer? (Yes/Unsure/No)

### Volunteer Self-Report Survey (Volunteer-Rated)

**Section 2: Onboarding & Support** (5 Qs, 1-5 scale)
- Clear briefing
- Felt welcome
- Tools available
- Afrivate pre-deployment support
- Knew who to contact

**Section 3: Work Experience** (6 Qs, 1-5 scale)
- Skills matched
- Meaningful impact
- Appropriate responsibility
- Manageable workload
- Useful feedback
- Learning opportunities

**Section 4: Organisational Environment** (4 Qs, 1-5 scale)
- Inclusive culture
- Safe environment
- Collaborative staff
- Clear communication

**Section 5: Overall Satisfaction** (3 Qs)
- Overall satisfaction (1-10)
- Afrivate recommendation (0-10, NPS)
- Would volunteer again? (Yes/Yes with reservations/No/Unsure)

**Section 6: Open Feedback** (4 optional text fields)
- Org strengths
- Org improvements
- Afrivate improvements
- Other comments

---

## Support & Further Questions

For technical issues or feature requests:
- Check the Supabase dashboard for data consistency
- Review RLS policies if data access denied
- Ensure `.env` file is correctly configured with Supabase credentials

**System built with:** React, Supabase, Tailwind CSS, Recharts
**Last updated:** June 2026
