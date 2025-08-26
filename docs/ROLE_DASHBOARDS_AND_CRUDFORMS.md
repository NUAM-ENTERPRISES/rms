# ROLE_DASHBOARDS.md – Affiniks RMS

> **Purpose**: A living, implementation-ready specification for **role-based landing dashboards** and **CRUD form standards** in Affiniks RMS. Build **feature-first** (widgets + APIs) and **compose per role** via config. This doc is binding for Cursor/developers.

---

## 0) Core Principles

- **Feature-first** development: Projects, Clients, Candidates, Documentation, Interviews, Processing → each delivers reusable **widgets** and **APIs**.
- **Role-based composition**: Dashboards are **configs** that combine widgets with role-based filters. No forked UIs per role.
- **Security**: Backend RBAC/guards enforce data scope. Frontend only hides/disables.
- **Consistency**: Each widget = React component + RTK Query endpoint + Tailwind/ShadCN, A11y compliant.

---

## 1) Widget Registry (Frontend)

Create a central registry for lazy-loaded widgets. Keys are stable and used in dashboard configs.

```ts
// web/src/app/dashboard/widgets/registry.ts
export const widgetRegistry = {
  "projects-quota": () => import("./ProjectsQuotaWidget"),
  "client-overview": () => import("./ClientOverviewWidget"),
  "global-pipeline": () => import("./GlobalPipelineWidget"),
  "exec-alerts": () => import("./ExecAlertsWidget"),

  "team-projects": () => import("./TeamProjectsWidget"),
  "team-performance": () => import("./TeamPerformanceWidget"),
  "pending-approvals": () => import("./PendingApprovalsWidget"),
  "sla-alerts": () => import("./SlaAlertsWidget"),

  "assigned-projects": () => import("./AssignedProjectsWidget"),
  "my-candidates": () => import("./MyCandidatesWidget"),
  "today-interviews": () => import("./TodayInterviewsWidget"),
  bottlenecks: () => import("./BottlenecksWidget"),

  "verification-queue": () => import("./VerificationQueueWidget"),
  "expiry-tracker": () => import("./ExpiryTrackerWidget"),
  "verification-sla": () => import("./VerificationSlaWidget"),

  "processing-pipeline": () => import("./ProcessingPipelineWidget"),
  "processing-exceptions": () => import("./ProcessingExceptionsWidget"),
  "joining-calendar": () => import("./JoiningCalendarWidget"),
} as const;
```

Each widget must:

- Export a default React component.
- Be **self-contained**: data via RTK Query, props optional.
- Respect \`\` permission checks for actions.
- Be responsive and accessible (keyboard/focus, ARIA).

---

## 2) Role → Dashboard Composition (Config-Driven)

Define which widgets load for each role, in which order, with optional layout hints.

```ts
// web/src/app/dashboard/config.ts
import { widgetRegistry } from "./widgets/registry";

type WidgetKey = keyof typeof widgetRegistry;
export type DashboardItem = {
  key: WidgetKey;
  cols?: number;
  minH?: number;
  props?: Record<string, unknown>;
};

export const dashboards: Record<string, DashboardItem[]> = {
  CEO: [
    { key: "projects-quota", cols: 12 },
    { key: "client-overview", cols: 12 },
    { key: "global-pipeline", cols: 12 },
    { key: "exec-alerts", cols: 12 },
  ],
  Director: [
    { key: "projects-quota", cols: 12 },
    { key: "client-overview", cols: 12 },
    { key: "global-pipeline", cols: 12 },
    { key: "sla-alerts", cols: 12 },
  ],
  Manager: [
    { key: "team-projects", cols: 12 },
    { key: "team-performance", cols: 12 },
    { key: "pending-approvals", cols: 6 },
    { key: "sla-alerts", cols: 6 },
  ],
  "Team Head": [
    { key: "team-projects", cols: 12 },
    { key: "bottlenecks", cols: 12 },
    { key: "today-interviews", cols: 12 },
  ],
  "Team Lead": [
    { key: "team-projects", cols: 12 },
    { key: "my-candidates", cols: 12 },
    { key: "today-interviews", cols: 12 },
  ],
  Recruiter: [
    { key: "assigned-projects", cols: 12 },
    { key: "my-candidates", cols: 12 },
    { key: "today-interviews", cols: 12 },
    { key: "sla-alerts", cols: 12 },
  ],
  "Documentation Executive": [
    { key: "verification-queue", cols: 12 },
    { key: "expiry-tracker", cols: 12 },
    { key: "verification-sla", cols: 12 },
  ],
  "Processing Executive": [
    { key: "processing-pipeline", cols: 12 },
    { key: "processing-exceptions", cols: 12 },
    { key: "joining-calendar", cols: 12 },
  ],
};

export const rolePriority = [
  "CEO",
  "Director",
  "Manager",
  "Team Head",
  "Team Lead",
  "Recruiter",
  "Documentation Executive",
  "Processing Executive",
] as const;
```

**Resolver** determines the primary role and returns the layout:

```ts
// web/src/app/dashboard/resolve-dashboard.ts
import { dashboards, rolePriority } from "./config";

export function resolveDashboardForUser(user: { roles: string[] }) {
  const role =
    user.roles.sort(
      (a, b) => rolePriority.indexOf(a as any) - rolePriority.indexOf(b as any)
    )[0] ?? "Recruiter";
  return dashboards[role] ?? dashboards.Recruiter;
}
```

---

## 3) Dashboard Shell (Frontend Page)

```tsx
// web/src/pages/DashboardPage.tsx
import React, { Suspense } from "react";
import { widgetRegistry } from "@/app/dashboard/widgets/registry";
import { resolveDashboardForUser } from "@/app/dashboard/resolve-dashboard";
import { useAppSelector } from "@/app/hooks";

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user)!;
  const layout = resolveDashboardForUser(user);

  return (
    <main className="container py-6 space-y-4">
      {layout.map(({ key, props }, i) => {
        const LazyWidget = React.lazy(widgetRegistry[key]);
        return (
          <section
            key={key + i}
            className="rounded-2xl border bg-card p-4 shadow-soft"
          >
            <Suspense fallback={<div className="h-24 animate-pulse" />}>
              <LazyWidget {...(props ?? {})} />
            </Suspense>
          </section>
        );
      })}
    </main>
  );
}
```

---

## 4) Data Scoping & Security (Backend)

- **Global Guards**: `JwtAuthGuard` + `PermissionsGuard` registered as `APP_GUARD`.
- **@Public()** only for `/auth/login`, `/auth/refresh`, `/health`, and signed webhooks.
- **Scope**: All list/read endpoints must accept server-side scope filters (e.g., recruiterId/teamId) inferred from the JWT; do not trust client filters for access control.
- **Auditing**: Log widget API calls for visibility (aggregate usage later).

---

## 5) Example Widgets (Behavior Specs)

**AssignedProjectsWidget (Recruiter-first)**

- Shows projects where current user is in the recruiter assignment.
- Columns: Project name (client), roles & open quota, deadline (SLA color), last activity.
- Actions: “Open Project”, “Add Candidate to Project”.

**MyCandidatesWidget**

- Shows candidates where `ownerId = currentUser.id`.
- Chips for stages: New / Docs Pending / Verified / Shortlisted / Interview / Selected / Processing.
- Quick actions: message candidate, request docs, schedule interview (if permission).

**TeamProjectsWidget**

- Same table as AssignedProjectsWidget but scoped to `teamId` and aggregated.
- Manager/Head/Lead see rollups and can drill down.

**VerificationQueueWidget**

- List of candidates with uploaded docs awaiting verification.
- Actions: Verify/Reject/Request change; SLA timer badges.

**ProcessingPipelineWidget**

- Kanban across stages: QVP → Medical → Visa → Travel → Joined.
- Drag-drop later; start with action menus per card.

**SlaAlertsWidget**

- Unified alerts for delays: verification pending >Xh, interview not scheduled >Yh, processing overdue.

---

# CRUD_FORMS.md – Standards for Projects, Clients, Candidates & More

> **Goal**: Uniform, accessible, high-UX forms with strong validation.

## A) Global Form Principles

- **Library**: React Hook Form + Zod schema validation.
- **UI**: ShadCN Form primitives; Tailwind tokens; no inline styles.
- **A11y**: Labels bound to inputs; keyboard focus; error text with `aria-describedby`.
- **Validation**: Client (Zod) + Server (DTO/class-validator). Always both.
- **Error Handling**: Show field errors inline; toast for non-field/server errors.
- **Save Patterns**:

  - Create/Edit use explicit **Save**.
  - Autosave only for drafts with clear status and last saved timestamp.

- **Optimistic Updates**: Only when easily reversible; otherwise show loading states.
- **File Uploads**: Use signed URLs (DO Spaces/S3). Show progress; validate type/size.
- **Date/Time**: Use a standard date picker; store ISO; display locale.
- **Selects**: Async searchable selects for Clients, Projects, Recruiters; debounce queries.
- **Audit**: Include `createdBy/updatedBy` from JWT on server side; don’t trust client.

## B) Common Form Components (Atoms/Molecules)

- `TextField`, `EmailField`, `PhoneField` (with mask), `NumberField`, `Textarea`.
- `SelectAsync` (RTK-Query backed), `MultiSelectAsync`.
- `DatePicker`, `DateTimePicker`.
- `FileDropzone` (drag & drop + click), `FileList` (with delete).
- `AddressGroup` (country/state/city with dependent selects).
- `FormRow`, `FormSection`, `FormActions` (Save/Cancel disabled states).

## C) Project Form (Create/Edit)

**Purpose**: Define a client requirement (Project) with role quotas and deadlines.

**Fields**:

- Client (async select) – required
- Project Title – required, min 3 chars
- Description – optional, multiline
- Priority – enum (High/Normal/Low)
- Deadline – required (date)
- Roles & Quotas – **repeatable group**:

  - Role (e.g., Doctor/Nurse/Lab Tech) – required
  - Specialization (optional)
  - Min Experience (years) – number ≥ 0
  - Quota – required, integer ≥ 1

- Location (country / city) – optional
- Attachments – optional (JD PDFs)

**Validation**:

- At least one role-quota must exist.
- Deadline must be ≥ today.

**Actions**:

- Save Draft / Publish Project
- After save: show shortcut to “Add Candidates”.

## D) Client Form (Create/Edit)

**Fields**:

- Client Type (Corporate / Hospital / Sub-Agency / Individual) – required
- Legal Name – required
- Primary Contact (name, email, phone) – required
- Billing Address – optional
- Contract Terms (text) – optional
- Notes – optional

**Validation**: Email format, phone length, required names.

**Actions**: Save; link to create first Project.

## E) Candidate Intake Form (Manual)

**Fields**:

- Full Name – required
- Email, Phone – required
- Role Applying For – required (select)
- Total Experience (years) – number ≥ 0
- Current Location – optional
- Source (Meta / Referral / Walk-in / Other) – required
- Resume Upload – optional (PDF, DOCX)
- Assign to Projects – **multi-select** (suggested by auto-allocation when saved)

**Validation**:

- Contact fields required; file type/size checks.

**Actions**:

- Save → triggers auto-allocation service (async) and shows suggested matches.

F) Documentation Verification Form

Fields:
• Passport – upload + number + expiry date
• License / Registration – upload + number + expiry date (mandatory for doctors/nurses)
• Education Certificates – multiple file uploads
• Police Clearance / Background Check – optional upload
• Verification Status – enum: Pending | Verified | Rejected | Needs Fix
• Rejection/Correction Reason – required when status is not Verified
• Verifier Notes – free-text field for internal notes

Validation Rules:
• Required docs depend on candidate’s role (e.g., medical license required for doctors).
• File formats allowed: PDF, JPG, PNG.
• Maximum file size (configurable, e.g., 5 MB).
• Expiry dates must be future-dated (server-side re-check).

Actions:
• Verify Now → marks as Verified, stamps verifier ID + timestamp.
• Reject & Notify → sets status to Rejected, sends templated notification (email/SMS) with reason.
• Request Resubmission → sets status to Needs Fix, triggers secure upload link for candidate to re-upload docs.

Security / Audit:
• Every action is logged in audit logs (actorId, candidateId, action, timestamp).
• Document access/download is logged for compliance.
• Only Documentation Executives + Managers have write permissions.

⸻

G) Interview Scheduling Form

Fields:
• Candidate(s) – multi-select of verified candidates
• Project – auto-filled (from candidate’s assignment)
• Client – auto-filled (from project)
• Interview Type – enum: Online | Offline
• Interview Mode – enum: Panel | 1:1
• Interview Date & Time – datetime picker (with timezone)
• Interview Panel Members – multi-select of client-side users/interviewers
• Location / Meeting Link – conditional:
• Offline → physical address
• Online → video conferencing link (Zoom, Teams, etc.)
• Candidate Instructions – text field (visible in candidate portal/email)

Validation Rules:
• Cannot schedule candidates who are not Verified.
• Time must be in the future.
• Panel members required if type = Panel.
• Meeting link required if type = Online.

Actions:
• Schedule & Notify → saves and sends calendar invites + SMS/email notifications.
• Reschedule → cancels old slot, creates new one with updated invites.
• Cancel Interview → updates status, notifies candidate + panel.

Security / Audit:
• Only Managers, Team Heads, and Recruiters with assigned candidates can schedule.
• All changes logged (createdBy, updatedBy, timestamp).
• Integration with calendar APIs (future phase).

H) Processing Stage Form

Once candidates are Selected post-interview, they enter Processing.

Stages (each is a form tab/section): 1. Qualification Verification Program (QVP)
• Fields: QVP status (Pending | Passed | Failed), certificate uploads, verifier notes.
• Validation: If Failed, candidate flagged for reallocation/disqualification. 2. Document Collection (Originals)
• Fields: Passport originals received (yes/no), license originals, degree originals.
• Validation: Required for international placements. 3. Medical Examination
• Fields: Test results upload, medical clearance (Fit | Unfit).
• Validation: If Unfit, candidate disqualified permanently. 4. Visa Processing
• Fields: Visa application number, status (Applied | Approved | Rejected), expiry date.
• Validation: Expiry date must be future-dated. 5. Travel & Joining
• Fields: Flight details, ticket upload, joining date.
• Validation: Joining date cannot be earlier than visa approval date.

Global Processing Fields:
• Assigned Processing Executive – dropdown of processing staff.
• Overall Processing Status – enum: In Progress | Completed | On Hold | Disqualified.
• Notes / Remarks – free-text for internal tracking.

Actions:
• Mark Stage Complete → moves candidate to next stage.
• Reallocate Candidate → sends back to eligible project pool.
• Disqualify Candidate → sets final status = Disqualified, with reason.
• Generate Reports → export candidate processing details to Excel/PDF.

Security / Audit:
• Only Processing Executives and Managers can update.
• Every stage transition logged (who, when, old status, new status).
• Disqualification requires elevated role (Manager+).
