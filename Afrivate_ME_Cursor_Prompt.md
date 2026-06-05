# Afrivate M&E Web App — Full Build Specification for Cursor AI

> **What this is:** A complete, production-ready specification for building Afrivate's
> internal Monitoring & Evaluation (M&E) web application. Hand this document to Cursor
> and instruct it to build the app end-to-end. All design decisions, data models,
> component structures, and logic are defined here — Cursor should not make assumptions
> outside of what is written.

---

## 0. Project Context

**Client:** AfriVate Technologies Ltd. (RC: 9210092) — Abuja, Nigeria
**System:** Volunteer M&E Platform — tracks volunteer deployments, collects feedback from
volunteers and partner organisations, auto-calculates performance scores, and presents
executive dashboards and scorecards.

**The two actors in this system:**
1. **Deployed Volunteers** — complete a self-report survey after each deployment
2. **Partner Organisation Supervisors** — complete an effectiveness survey rating the volunteer

**The M&E team / HR** — log, review, manage, and export all data.

---

## 1. Tech Stack

Use this exact stack. Do not deviate.

```
Frontend:   React 18 + Vite
Styling:    Tailwind CSS (custom theme — see Section 3)
Routing:    React Router v6
State:      Zustand
Backend:    Node.js + Express
Database:   PostgreSQL (via Prisma ORM)
Auth:       JWT (access + refresh tokens) — bcrypt for passwords
Email:      Nodemailer (SMTP) — for survey dispatch
PDF export: Puppeteer (server-side) or react-pdf (client-side)
CSV export: json2csv (server-side)
Hosting:    Dockerised — docker-compose with app + postgres services
```

---

## 2. User Roles & Access Control

Three roles. Enforce at route + API level.

| Role | Access |
|------|--------|
| `ADMIN` | Full access — all volunteers, all orgs, all data, user management, exports |
| `HR` | All volunteer and org data, can log entries, cannot manage users |
| `VIEWER` | Read-only — dashboard and reports only, no data entry |

Volunteers and org supervisors are **not users of the app** — they access surveys
via unique tokenised URLs sent by email. No login required for survey submission.

---

## 3. Brand & Design System

### 3.1 Color Palette

Implement as Tailwind CSS custom theme in `tailwind.config.js`:

```js
colors: {
  afri: {
    purple:   '#8D4087',   // PRIMARY — backgrounds, headings, buttons, borders
    lavender: '#F0E7F6',   // Light backgrounds, card surfaces
    black:    '#000000',   // Body text, icon outlines
    white:    '#FFFFFF',   // Text on purple, primary surface
    // Extended (use sparingly — promotional/status only, never for UI chrome)
    green:    '#317D34',   // Growth, success states
    blue:     '#1D45CF',   // Info, digital, innovation
    yellow:   '#EFDA0E',   // Celebration, max 10% usage
    orange:   '#ED620A',   // CTAs, urgency
    red:      '#EB1111',   // Critical alerts only
  }
}
```

### 3.2 Color Rules (MUST ENFORCE)

- Purple background → white text only
- White background → purple headings, black body text
- Lavender background → purple or black text only
- Purple + lavender together: always valid
- **FORBIDDEN:** red + purple, yellow as primary bg, black backgrounds,
  multiple extended palette colors together, orange + purple without white separation

### 3.3 Typography

Load via Google Fonts in `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
```

Apply in Tailwind config:

```js
fontFamily: {
  heading: ['Poppins', 'sans-serif'],
  body:    ['Roboto', 'sans-serif'],
}
```

**Type scale:**
- H1 (hero/page title): Poppins Bold, 36–40px
- H2 (section header): Poppins SemiBold, 24–28px
- H3 (subheading): Poppins Medium, 18–20px
- Body: Roboto Regular, 14–16px, line-height 1.6
- Caption/label: Roboto Regular, 11–12px
- Minimum visible text: 11px — never go below this

### 3.4 Spacing & Layout

- Minimum padding on all page edges: 48px
- Heading-to-body margin: 8–12px
- Paragraph spacing: 16px
- Whitespace is intentional — give every element room to breathe

### 3.5 Logo Usage Rules

- Purple/dark backgrounds → use WHITE logo version
- White/lavender backgrounds → use PURPLE logo version
- Profile picture / favicon → Africa icon only (no wordmark) on #8D4087 background
- Logo minimum width: 120px digital, 25mm print
- Clear space on all sides = height of capital "A" in wordmark
- Logo placement: top-left on digital interfaces

### 3.6 UI Tone

The app is used by an internal HR/M&E team but may be shown to external partners.
Keep the interface: **professional, clean, African-centred, never clinical or sterile**.
Use the Poppins/Roboto pairing strictly. No AI-default aesthetics (no purple gradients
on white, no cookie-cutter card designs).

---

## 4. Database Schema (Prisma)

Create `prisma/schema.prisma` with the following models:

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(VIEWER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum Role {
  ADMIN
  HR
  VIEWER
}

model Volunteer {
  id               String       @id @default(cuid())
  volunteerId      String       @unique  // e.g. AV-2026-001
  fullName         String
  email            String
  phone            String?
  deployments      Deployment[]
  createdAt        DateTime     @default(now())
}

model Organisation {
  id           String       @id @default(cuid())
  name         String       @unique
  contactName  String?
  contactEmail String?
  sector       String?
  deployments  Deployment[]
  createdAt    DateTime     @default(now())
}

model Deployment {
  id             String              @id @default(cuid())
  volunteer      Volunteer           @relation(fields: [volunteerId], references: [id])
  volunteerId    String
  organisation   Organisation        @relation(fields: [organisationId], references: [id])
  organisationId String
  roleTitle      String
  startDate      DateTime
  endDate        DateTime
  status         DeploymentStatus    @default(ACTIVE)
  volSurvey      VolunteerSurvey?
  orgSurvey      OrgSurvey?
  vpiScore       Float?              // Auto-calculated after both surveys complete
  vpiCategory    String?             // "A", "B", or "C"
  actionFlag     String?             // "Retain & Recognise", "Develop & Monitor", "Urgent Review"
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
}

enum DeploymentStatus {
  ACTIVE
  COMPLETED
  AWAITING_SURVEYS
  SURVEYS_COMPLETE
}

// === VOLUNTEER SELF-REPORT SURVEY ===
model VolunteerSurvey {
  id           String     @id @default(cuid())
  deployment   Deployment @relation(fields: [deploymentId], references: [id])
  deploymentId String     @unique
  submittedAt  DateTime   @default(now())
  surveyToken  String     @unique  // UUID used in survey URL

  // Section 2: Onboarding & Support (1–5 Likert)
  s2_clearBriefing       Int
  s2_feltWelcome         Int
  s2_toolsAvailable      Int
  s2_afrivateSupport     Int
  s2_knewWhoToContact    Int

  // Section 3: Work Experience (1–5 Likert)
  s3_skillsMatched       Int
  s3_meaningfulImpact    Int
  s3_appropriateResponsibility Int
  s3_manageableWorkload  Int
  s3_usefulFeedback      Int
  s3_learningOpportunities Int

  // Section 4: Organisational Environment (1–5 Likert)
  s4_inclusiveCulture    Int
  s4_safeEnvironment     Int
  s4_collaborativeStaff  Int
  s4_clearCommunication  Int

  // Section 5: Overall (different scales)
  s5_overallSatisfaction Int   // 1–10
  s5_npsScore            Int   // 0–10 (Net Promoter Score)
  s5_volunteerAgain      String  // "Yes, definitely" | "Yes, with reservations" | "No" | "Unsure"

  // Section 6: Open feedback
  s6_orgStrengths        String?
  s6_orgImprovements     String?
  s6_afrivateImprovements String?
  s6_otherComments       String?

  // Calculated section averages (stored for dashboard efficiency)
  onboardingAvg          Float
  workExpAvg             Float
  orgEnvAvg              Float
  volunteerVpi           Float
}

// === ORGANISATION EFFECTIVENESS SURVEY ===
model OrgSurvey {
  id              String     @id @default(cuid())
  deployment      Deployment @relation(fields: [deploymentId], references: [id])
  deploymentId    String     @unique
  submittedAt     DateTime   @default(now())
  surveyToken     String     @unique
  supervisorName  String
  supervisorTitle String

  // Section 2: Task Performance (1–5 Likert)
  s2_tasksCompleted      Int
  s2_skillsDemonstrated  Int
  s2_deadlinesMet        Int
  s2_initiative          Int
  s2_workQuality         Int
  s2_minimalSupervision  Int

  // Section 3: Professionalism & Conduct (1–5 Likert)
  s3_professionalBehaviour Int
  s3_clearCommunication    Int
  s3_policyAdherence       Int
  s3_punctuality           Int
  s3_teamIntegration       Int

  // Section 4: Impact & Organisational Value (1–5 Likert)
  s4_measurableValue       Int
  s4_missionSupport        Int
  s4_irreplaceableContrib  Int
  s4_moralEffect           Int

  // Section 5: Overall Assessment
  s5_overallEffectiveness  Int     // 1–10
  s5_requestAgain          String  // "Yes, definitely" | "Yes, with requirements" | "No" | "Unsure"
  s5_requestSameVol        String  // "Yes" | "No" | "Unsure"

  // Section 6: Open feedback
  s6_strengths             String?
  s6_improvements          String?
  s6_afrivateImprovements  String?
  s6_otherFeedback         String?

  // Calculated section averages
  taskPerfAvg              Float
  professionalismAvg       Float
  impactAvg                Float
  orgVpi                   Float
}
```

---

## 5. VPI Scoring Engine

Create `src/utils/vpiEngine.js` (used on both server and client):

```js
/**
 * Volunteer Performance Index (VPI) Calculation
 *
 * VPI% = ((taskPerf + professionalism + impact + (overall / 2)) / 4) × 20
 *
 * All dimension scores are on a 1–5 scale.
 * The overall score (1–10) is halved to normalise to 1–5 before averaging.
 * Result is multiplied by 20 to produce a 0–100 percentage.
 *
 * When both org survey and volunteer survey exist, the org-rated VPI is
 * treated as the primary score. If only one exists, use whichever is available.
 */

export function calculateVPI({ taskPerf, professionalism, impact, overall10 }) {
  const overallNorm = overall10 / 2;
  return ((taskPerf + professionalism + impact + overallNorm) / 4) * 20;
}

export function getCategory(vpi) {
  if (vpi >= 80) return 'A';
  if (vpi >= 60) return 'B';
  return 'C';
}

export function getActionFlag(category) {
  const flags = {
    A: 'Retain & Recognise',
    B: 'Develop & Monitor',
    C: 'Urgent Review',
  };
  return flags[category];
}

export function getActionDescription(category) {
  const descriptions = {
    A: 'High Performer — retain, fast-track, and formally recognise.',
    B: 'Developing Performer — monitor and provide structured development support.',
    C: 'Needs Intervention — urgent review, coaching, or re-deployment decision required.',
  };
  return descriptions[category];
}

// Calculate section averages from org survey response object
export function calcOrgSectionAvgs(survey) {
  const taskPerf = avg([
    survey.s2_tasksCompleted, survey.s2_skillsDemonstrated, survey.s2_deadlinesMet,
    survey.s2_initiative, survey.s2_workQuality, survey.s2_minimalSupervision
  ]);
  const professionalism = avg([
    survey.s3_professionalBehaviour, survey.s3_clearCommunication,
    survey.s3_policyAdherence, survey.s3_punctuality, survey.s3_teamIntegration
  ]);
  const impact = avg([
    survey.s4_measurableValue, survey.s4_missionSupport,
    survey.s4_irreplaceableContrib, survey.s4_moralEffect
  ]);
  const vpi = calculateVPI({ taskPerf, professionalism, impact, overall10: survey.s5_overallEffectiveness });
  return { taskPerf, professionalism, impact, vpi };
}

// Calculate section averages from volunteer survey response object
export function calcVolSectionAvgs(survey) {
  const onboarding = avg([
    survey.s2_clearBriefing, survey.s2_feltWelcome, survey.s2_toolsAvailable,
    survey.s2_afrivateSupport, survey.s2_knewWhoToContact
  ]);
  const workExp = avg([
    survey.s3_skillsMatched, survey.s3_meaningfulImpact, survey.s3_appropriateResponsibility,
    survey.s3_manageableWorkload, survey.s3_usefulFeedback, survey.s3_learningOpportunities
  ]);
  const orgEnv = avg([
    survey.s4_inclusiveCulture, survey.s4_safeEnvironment,
    survey.s4_collaborativeStaff, survey.s4_clearCommunication
  ]);
  // Volunteer VPI uses section averages as proxy dimensions
  const vpi = calculateVPI({
    taskPerf: workExp,
    professionalism: onboarding,
    impact: orgEnv,
    overall10: survey.s5_overallSatisfaction
  });
  return { onboarding, workExp, orgEnv, vpi };
}

function avg(arr) {
  const valid = arr.filter(v => v !== null && v !== undefined);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
}
```

---

## 6. API Routes

### Auth
```
POST   /api/auth/login          — { email, password } → { accessToken, refreshToken, user }
POST   /api/auth/refresh        — { refreshToken } → { accessToken }
POST   /api/auth/logout
GET    /api/auth/me
```

### Users (ADMIN only)
```
GET    /api/users
POST   /api/users               — create new HR/VIEWER user
PATCH  /api/users/:id
DELETE /api/users/:id
```

### Volunteers
```
GET    /api/volunteers          — list all, with latest VPI and deployment count
POST   /api/volunteers          — create volunteer record
GET    /api/volunteers/:id      — full profile with all deployments and surveys
PATCH  /api/volunteers/:id
```

### Organisations
```
GET    /api/organisations       — list, with avg VPI across all their volunteers
POST   /api/organisations
GET    /api/organisations/:id   — scorecard: all volunteers deployed, avg scores
PATCH  /api/organisations/:id
```

### Deployments
```
GET    /api/deployments         — filterable by status, org, date range, category
POST   /api/deployments         — create deployment → auto-generate survey tokens → send emails
GET    /api/deployments/:id     — full detail: volunteer, org, both surveys, VPI
PATCH  /api/deployments/:id/status
POST   /api/deployments/:id/send-surveys  — resend survey invitation emails
```

### Surveys (public — no auth required, token-based)
```
GET    /api/surveys/volunteer/:token   — get deployment context for volunteer survey form
POST   /api/surveys/volunteer/:token   — submit volunteer survey → trigger VPI calc
GET    /api/surveys/org/:token         — get deployment context for org survey form
POST   /api/surveys/org/:token         — submit org survey → trigger VPI calc
```

### Dashboard & Analytics
```
GET    /api/dashboard/summary          — KPIs: total vols, avg VPI, A/B/C counts, org count
GET    /api/dashboard/vpi-distribution — VPI scores for all volunteers (for bar chart)
GET    /api/dashboard/dimension-avgs   — programme averages per dimension (for radar chart)
GET    /api/dashboard/flags            — all C-category volunteers needing intervention
GET    /api/dashboard/org-ranking      — orgs ranked by avg volunteer VPI
```

### Exports
```
GET    /api/exports/dashboard.csv      — all deployment+VPI data as CSV
GET    /api/exports/report.pdf         — quarterly M&E report as PDF
```

---

## 7. Email Templates

When a deployment is created, send two emails automatically.

### Volunteer Survey Email
**Subject:** `Your Afrivate deployment feedback — [Org Name]`

```
Dear [Volunteer Name],

Thank you for your service at [Organisation Name] from [Start Date] to [End Date].

Please take 5–10 minutes to share your experience. Your feedback directly 
improves how Afrivate supports future volunteers.

All responses are confidential.

[COMPLETE YOUR SURVEY →]
https://[app-domain]/survey/volunteer/[token]

This link is unique to your deployment and expires 14 days after your deployment end date.

The Afrivate M&E Team
AfriVate Technologies Ltd.
```

### Organisation Survey Email
**Subject:** `Volunteer effectiveness feedback — [Volunteer Name] | Afrivate`

```
Dear [Supervisor Name],

Thank you for hosting [Volunteer Name] at [Organisation Name].

Your feedback is essential for measuring volunteer effectiveness and improving 
future deployments. Please complete this form within 5 working days.

All responses are treated confidentially.

[COMPLETE YOUR SURVEY →]
https://[app-domain]/survey/org/[token]

This link is unique to this deployment and expires 14 days after deployment end.

The Afrivate M&E Team
AfriVate Technologies Ltd.
```

---

## 8. Frontend Pages & Components

### 8.1 Public Survey Pages (no auth)

#### `/survey/volunteer/:token`

Multi-step form. One section per page with a progress indicator.

**Step 1 — Identification (read-only, pre-filled from token)**
- Full name (display only)
- Volunteer ID (display only)
- Partner Organisation (display only)
- Deployment period: Start date → End date (display only)
- Role / Assignment Title (display only)

**Step 2 — Onboarding & Support**
Rate each 1–5 (Strongly Disagree → Strongly Agree). Use a clean 5-button toggle per question.
- I received a clear briefing on my role and responsibilities before starting.
- The partner organisation made me feel welcome on arrival.
- I had access to the tools and resources I needed to do my work.
- Afrivate provided adequate pre-deployment support.
- I knew who to contact if I had a problem during my deployment.

**Step 3 — Work Experience**
Same 1–5 format:
- My skills were well-matched to the tasks I was assigned.
- My work had a visible, meaningful impact.
- I was given appropriate levels of responsibility.
- The workload was manageable and well-structured.
- I received useful feedback from my supervisor at the organisation.
- I had opportunities to learn and develop new skills.

**Step 4 — Organisational Environment**
Same 1–5 format:
- The organisation's culture was inclusive and respectful.
- I felt safe and comfortable in the work environment.
- Staff at the organisation were collaborative and supportive.
- Communication within the organisation was clear and effective.

**Step 5 — Overall Satisfaction**
- Overall satisfaction: 1–10 slider with label (Very Dissatisfied → Very Satisfied)
- NPS: 0–10 slider (Not at all likely → Extremely likely to recommend Afrivate)
- Would you volunteer with this organisation again? (4-option radio)

**Step 6 — Open Feedback (all optional)**
- What did the organisation do particularly well? (textarea)
- What could the organisation improve? (textarea)
- What could Afrivate do better to support your deployment? (textarea)
- Any other comments or suggestions? (textarea)

**Step 7 — Confirmation**
"Thank you, [Name]. Your response has been recorded."
Show a summary card of their submission.

#### `/survey/org/:token`

Same multi-step structure.

**Step 1 — Details (pre-filled)**
- Organisation name, supervisor name + title (editable — supervisor fills their name/title)
- Volunteer name (display only), Volunteer ID, Role, Deployment dates (all display only)

**Step 2 — Task Performance** (1–5)
- The volunteer completed all assigned tasks to a satisfactory standard.
- The volunteer demonstrated the skills required for their role.
- The volunteer met deadlines and managed their time effectively.
- The volunteer showed initiative and problem-solving ability.
- The quality of the volunteer's work met our organisational expectations.
- The volunteer required minimal supervision to deliver results.

**Step 3 — Professionalism & Conduct** (1–5)
- The volunteer behaved professionally at all times.
- The volunteer communicated clearly and respectfully with staff.
- The volunteer adhered to our organisational policies and procedures.
- The volunteer was punctual and consistent in attendance.
- The volunteer integrated well with our team and culture.

**Step 4 — Impact & Organisational Value** (1–5)
- The volunteer's contribution created measurable value for our organisation.
- The volunteer's work directly supported our mission or operational goals.
- We would have struggled to achieve the same outcomes without this volunteer.
- The volunteer's presence had a positive effect on staff morale.

**Step 5 — Overall Assessment**
- Overall effectiveness: 1–10 slider
- Would you request an Afrivate volunteer again? (4-option radio)
- Would you request the same volunteer again? (3-option radio)

**Step 6 — Open Feedback** (all optional)
- What were this volunteer's greatest strengths?
- What areas should this volunteer improve on?
- What could Afrivate do to improve the volunteer matching or onboarding process?
- Any other feedback or comments?

**Step 7 — Confirmation**

### 8.2 Authenticated App Pages

#### `/login`
Centred card, purple header with white Afrivate logo, email + password fields, sign in button (purple).

#### `/dashboard` (default after login)

**Top KPI row — 6 cards:**
- Total Volunteers (this cycle)
- Average VPI Score (%)
- A-Players (≥80%)
- B-Players (60–79%)
- C-Players (<60%) — highlighted in red if > 0
- Active Partner Organisations

**Charts row (2 columns):**
- Left: VPI Score Distribution — bar chart, bars colour-coded (green/amber/red by category)
- Right: Programme Dimension Averages — radar chart (Task, Professionalism, Impact, Overall)

**Bottom row (2 columns):**
- Action Flags: list of all Category C volunteers with org name, VPI score, and "Schedule Review" button
- Recent Submissions: last 5 survey completions with volunteer name, org, badge, timestamp

#### `/volunteers`
Searchable, filterable table.

**Filters:** search by name/org, filter by category (A/B/C), filter by organisation, filter by deployment period.

**Table columns:**
- Volunteer Name + ID
- Organisation
- Deployment Period
- Task Perf. (score bar)
- Professionalism (score bar)
- Impact (score bar)
- VPI % (bold)
- Category (coloured badge: green A / amber B / red C)
- Action Flag
- Survey status (org submitted? vol submitted? — two icons)
- View button → opens volunteer detail page

#### `/volunteers/:id`
Full volunteer profile:
- Header: name, ID, avatar initials circle (purple background)
- Current VPI ring / donut showing score and category
- Dimension breakdown: 4 score cards (Task, Prof., Impact, Overall)
- Deployment history: table of all deployments with VPI per cycle
- Survey responses: expandable sections for org survey and vol survey answers
- Qualitative feedback: strengths, development areas, notes
- Action flag with recommended next step

#### `/organisations`
Organisation performance page.

**Ranking table:** orgs sorted by avg VPI descending.
Columns: Org Name, Volunteers Deployed, Avg Task, Avg Prof, Avg Impact, Avg VPI, Tier, Repeat Request Rate

**Individual org scorecard (click through):**
- Org header with sector, contact info
- Aggregate scores across all volunteers (radar chart)
- Table of every volunteer deployed to this org with their individual VPI
- Repeat request rate (% of surveys where supervisor said "Yes, definitely" to requesting again)
- Open feedback aggregated: best quotes from supervisors

#### `/deployments`
Create and manage deployments.

**Create Deployment form:**
- Select volunteer (searchable dropdown or create new)
- Select organisation (searchable dropdown or create new)
- Role / Assignment Title
- Start date + End date
- On save: deployment created → survey tokens generated → emails sent to both parties

**Deployments table:**
- Filter by status: Active | Awaiting Surveys | Surveys Complete
- Columns: Volunteer, Org, Period, Status, Survey indicators, VPI (if complete), Actions
- Actions: View, Resend survey emails, Mark complete

#### `/reports`
M&E reporting page.

**Summary snapshot:** programme stats for selected period (this month / quarter / year / custom range)

**Review cadence panel:**
- Weekly: check responses
- Monthly: compile org averages, share with Programme team
- Quarterly: Executive review
- Annually: framework audit

**Export controls:**
- Download all data as CSV
- Generate quarterly PDF report (formatted with Afrivate branding)

**VPI scoring reference** (always visible as reference card)

#### `/settings` (ADMIN only)
- User management: list, invite, change role, deactivate
- Email SMTP configuration
- App domain/URL configuration
- Survey token expiry setting (default: 14 days)

---

## 9. Component Library

Build these reusable components:

```
<VPIBadge category="A|B|C" />               — coloured badge
<VPIRing score={87.3} category="A" />        — circular progress ring
<ScoreBar value={4.2} max={5} />             — inline horizontal bar
<ActionFlag category="A|B|C" />             — coloured flag chip with icon
<SurveyStatus volDone orgDone />             — two icon indicators
<DeploymentCard deployment={...} />
<LikertInput value={v} onChange={fn} />      — 1–5 button toggle for survey forms
<SliderInput min max value label />          — styled range slider
<DataTable columns rows ... />               — sortable, filterable table base
<KPICard label value sub color />           — summary metric card
<SectionHeading label icon />
<EmptyState icon title description cta />
<ConfirmDialog />
<Toast />
```

---

## 10. Survey Form UX Rules

- Mobile-first. Many supervisors and volunteers will complete on phone.
- Each step fits on one screen — no scrolling within a step if avoidable.
- Progress bar at top: "Step 2 of 6 — Work Experience"
- Previous/Next buttons. Final step: Submit button (purple, full width on mobile).
- 1–5 Likert: render as 5 clearly labelled buttons (1 = Strongly Disagree, 5 = Strongly Agree).
  Not radio buttons. Not a slider. Actual buttons that highlight when selected.
- Show the label for each extreme (1 and 5). Middle values (2, 3, 4) show number only.
- Sliders (1–10 scales): show current value prominently. Label both endpoints.
- All required fields must be validated before Next is enabled.
- On submission error: show inline error, do not reset the form.
- The survey must work on a slow 3G connection. No heavy animations.
- After submission: confirmation page stays visible — don't redirect away.

---

## 11. VPI Calculation Trigger

After either survey is submitted via the API:

1. Check if the corresponding other survey for this deployment also exists.
2. If **both surveys exist**:
   - Use org survey to calculate primary VPI: `calcOrgSectionAvgs(orgSurvey)`
   - Also store volunteer-rated VPI from vol survey: `calcVolSectionAvgs(volSurvey)`
   - Write `vpiScore`, `vpiCategory`, `actionFlag` to the `Deployment` record
   - Update `deployment.status` to `SURVEYS_COMPLETE`
3. If **only one survey exists**: store partial score on the survey record only.
   Do not write to Deployment yet.
4. Return the updated deployment in the API response.

---

## 12. PDF Report Structure

When generating the quarterly PDF report (`/api/exports/report.pdf`):

**Page 1 — Cover**
- Afrivate logo (purple on white)
- "Volunteer Performance Report — Q[N] [Year]"
- Generated date
- Prepared by: Afrivate M&E Team

**Page 2 — Executive Summary**
- KPI grid: total volunteers, avg VPI, A/B/C counts, active orgs
- One-paragraph narrative (auto-generated from data)

**Page 3 — VPI Distribution**
- Bar chart of all volunteers colour-coded by category
- Table: Name, Org, VPI%, Category, Action Flag

**Page 4 — Organisation Scorecards**
- Table ranked by avg VPI
- Repeat request rate per org

**Page 5 — Action Items**
- Category C volunteers requiring intervention
- Category A volunteers recommended for recognition

**Page 6 — Appendix: Scoring Reference**
- VPI formula
- Category definitions
- Review cadence

---

## 13. File Structure

```
afrivate-me/
├── client/
│   ├── src/
│   │   ├── components/         ← reusable UI components
│   │   ├── pages/
│   │   │   ├── auth/           ← Login
│   │   │   ├── dashboard/
│   │   │   ├── volunteers/
│   │   │   ├── organisations/
│   │   │   ├── deployments/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── surveys/        ← public, no auth
│   │   ├── store/              ← Zustand stores
│   │   ├── utils/
│   │   │   └── vpiEngine.js
│   │   ├── hooks/
│   │   ├── api/                ← axios API client + query functions
│   │   └── assets/
│   │       └── logo/           ← PLACE AFRIVATE LOGOS HERE
│   └── tailwind.config.js
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/         ← auth, role-check, error handler
│   │   ├── services/
│   │   │   ├── vpiService.js
│   │   │   ├── emailService.js
│   │   │   └── exportService.js
│   │   └── utils/
│   │       └── vpiEngine.js    ← shared with client
│   └── prisma/
│       └── schema.prisma
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 14. Environment Variables (`.env.example`)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/afrivate_me"

# Auth
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="me@afrivate.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="Afrivate M&E <me@afrivate.com>"

# App
APP_URL="https://me.afrivate.com"
NODE_ENV="production"
PORT=4000
```

---

## 15. Cursor Instructions

When building this app with Cursor, follow this order:

1. **Scaffold** — run `npm create vite@latest client -- --template react`, set up Express server, configure Prisma, run `npx prisma db push`
2. **Auth** — implement JWT login/refresh, protect routes, set up role middleware
3. **Database seed** — create a seed script with 1 ADMIN user, 2 sample volunteers, 2 orgs, 3 deployments
4. **VPI engine** — implement `vpiEngine.js` first and write unit tests for it before anything else
5. **Survey forms** — build public volunteer and org survey pages (most critical user-facing feature)
6. **Dashboard** — implement KPI cards and charts using Chart.js or Recharts
7. **Volunteer and Org pages** — registry, detail views, scorecards
8. **Deployments** — create/manage deployments, email dispatch
9. **Exports** — CSV and PDF generation
10. **Settings** — user management

**Do not skip the seed script.** It must produce realistic sample data so the dashboard
is not empty on first load.

**Logo assets:** The user will provide Afrivate logo files. Place them in
`client/src/assets/logo/`. Reference them in the app as:
- `logo-white.svg` — white version (for purple/dark backgrounds)
- `logo-purple.svg` — purple version (for white/lavender backgrounds)
- `icon-only.svg` — Africa icon, no wordmark (for favicon, compact UI)

---

## 16. Quality Standards

- All API responses follow `{ success: true, data: {...} }` or `{ success: false, error: "..." }`
- All database queries go through Prisma — no raw SQL except for complex analytics
- Input validation on all POST/PATCH routes (use Zod or express-validator)
- Survey tokens are UUID v4, one-time use (mark as used after submission)
- Passwords hashed with bcrypt (salt rounds: 12)
- CORS configured to allow only the client origin
- Error boundaries on all React pages
- Loading and empty states on every data-fetching component
- The app must be fully functional with no data (empty state) and with full data

