# Screenings API — Renamed Routes (Mock Interviews → Screenings) ✅

This document lists all HTTP endpoints and route changes performed in the backend refactor from *mock interviews* → *screenings*. Please update the frontend API calls, client-side links, and any hard-coded routes accordingly.

---

## Summary
- All routes under `/mock-interviews` are now under `/screenings`.
- Candidate-Projects route `send-to-mock-interview` renamed to `send-to-screening`.
- Template routes under `/mock-interview-templates` are now `/screening-templates`.
- Notification job links and candidate-project internal links referencing `mock-interview` were updated (or need updating in frontend if stored client-side).
- RBAC permission strings changed from `*_mock_interviews` to `*_screenings` (see section below).

---

## Route mapping (Old → New)

- POST  `/mock-interviews` → POST `/screenings`
  - Summary: Schedule a new interview → Schedule a new screening
  - Controller: `ScreeningsController#create`

- GET   `/mock-interviews` → GET `/screenings`
  - Summary: List all mock interviews → List all screenings
  - Controller: `ScreeningsController#findAll`

- GET   `/mock-interviews/coordinator/:coordinatorId/stats` → GET `/screenings/coordinator/:coordinatorId/stats`
  - Summary: Coordinator statistics

- GET   `/mock-interviews/assigned-mock-interviews` → GET `/screenings/assigned-screenings`
  - Summary: List candidate-project assignments with sub-status `screening_assigned`

- GET   `/mock-interviews/upcoming` → GET `/screenings/upcoming`
  - Summary: Upcoming scheduled screenings

- GET   `/mock-interviews/candidate-project/:candidateProjectMapId/history` → GET `/screenings/candidate-project/:candidateProjectMapId/history`
  - Summary: Interview-level history events for the candidate-project

- GET   `/mock-interviews/:id` → GET `/screenings/:id`
  - Summary: Retrieve single screening details

- PATCH `/mock-interviews/:id` → PATCH `/screenings/:id`
  - Summary: Update scheduling details

- POST  `/mock-interviews/:id/complete` → POST `/screenings/:id/complete`
  - Summary: Complete the screening with assessment

- DELETE `/mock-interviews/:id` → DELETE `/screenings/:id`
  - Summary: Delete a pending screening

- PATCH `/mock-interviews/:id/template` → PATCH `/screenings/:id/template`
  - Summary: Change or assign a template for a screening

- POST `/mock-interviews/assign-to-main-interview` → POST `/screenings/assign-to-main-interview`
  - Summary: Assign candidate to main interview via screenings module (unchanged semantics, different module)


### Candidate-Projects specific
- POST `/candidate-projects/:id/send-to-mock-interview` → POST `/candidate-projects/:id/send-to-screening`
  - Summary: Send candidate to screening (used by the candidate-projects controller)
  - Note: Permission `schedule:mock_interviews` → `schedule:screenings`


### Template endpoints (Mock Interview Templates → Screening Templates)
- POST  `/mock-interview-templates` → POST `/screening-templates`
- GET   `/mock-interview-templates` → GET `/screening-templates`
- GET   `/mock-interview-templates/role/:roleId` → GET `/screening-templates/role/:roleId`
- GET   `/mock-interview-templates/:id` → GET `/screening-templates/:id`
- PATCH `/mock-interview-templates/:id` → PATCH `/screening-templates/:id`
- DELETE `/mock-interview-templates/:id` → DELETE `/screening-templates/:id`
- POST `/mock-interview-templates/:id/items` → POST `/screening-templates/:id/items`
- PATCH `/mock-interview-templates/:id/items/:itemId` → PATCH `/screening-templates/:id/items/:itemId`


## Notification links and client-side deep links
There are server-side notification messages that build links to screening resources (previously mock-interview links). Update frontend routes for these links.

Examples found in backend (update frontend equivalents):

- Server notification link: `/mock-interviews/${mockInterviewId}` → `/screenings/${screeningId}`
- Candidate-project deep link: `/candidate-projects/${candidateProjectMapId}/mock-interview/${mockInterviewId}` → `/candidate-projects/${candidateProjectMapId}/screening/${screeningId}`

Files to inspect in backend for matching changes you may need to reflect in frontend:
- `src/jobs/notifications.processor.ts` (builds links with `/mock-interviews`)

> Note: If the frontend expects the page path `/candidate-projects/:id/mock-interview/:mid` adjust to `/candidate-projects/:id/screening/:sid` or whichever route structure your frontend uses for the screening details page.


## RBAC / Permission names to update
- `read:mock_interviews` → `read:screenings`
- `write:mock_interviews` → `write:screenings`
- `manage:mock_interviews` → `manage:screenings`
- `conduct:mock_interviews` → `conduct:screenings`
- `schedule:mock_interviews` → `schedule:screenings`

If your frontend checks permissions client-side, update those checks accordingly.


## DTO / Request body names (if shared with frontend types)
If the frontend uses shared DTO names or generated types (TypeScript interfaces), consider updating or regenerating them after the changes:
- `CreateMockInterviewDto` → `CreateScreeningDto`
- `UpdateMockInterviewDto` → `UpdateScreeningDto`
- `CompleteMockInterviewDto` → `CompleteScreeningDto`
- `SendToMockInterviewDto` → `SendToScreeningDto`
- Template DTOs: `CreateMockInterviewTemplateDto` → `CreateScreeningTemplateDto`, `UpdateMockInterviewTemplateDto` → `UpdateScreeningTemplateDto`


## Quick checklist for frontend update
1. Replace route strings and deep-link paths as shown above.
2. Update any permission checks that reference `*_mock_interviews` permission names.
3. Update any local DTO/type imports (if using codegen or shared types).
4. Verify notifications: search for `/mock-interviews` and `/mock-interview` across frontend codebase and replace accordingly.
5. Run frontend integration tests and E2E tests to validate navigation and API calls.


## Notes & Caveats
- This change is a breaking API change. Coordinate frontend deployments with backend deployment to avoid downtime.
 - Database and business-status constants (`SCREENING_*`) are now used across the codebase; if your UI checks these string values, coordinate with us before production rollout.

---

## Backend DB & file changes (detailed) 🔧

This section lists the concrete changes already applied in the backend (DB schema, migration, and major files) so your frontend updates can be exact and complete.

- **Prisma schema changes (completed)**
  - `MockInterview` model → `Screening` model (Prisma model name and logic updated in `prisma/schema.prisma`). The table is mapped with `@@map("screenings")`.
  - `MockInterviewChecklistItem` → `ScreeningChecklistItem` (`@@map("screening_checklist_items")`).
  - `MockInterviewTemplate` → `ScreeningTemplate` (`@@map("screening_templates")`).
  - `MockInterviewTemplateItem` → `ScreeningTemplateItem` (`@@map("screening_template_items")`).

- **Migration (SQL) added**
  - File: `prisma/migrations/20251217_rename_mock_interview_to_screening/migration.sql`
  - Contents: ALTER TABLE RENAME statements to rename tables and related FK/column names (e.g., `mock_interviews` → `screenings`, template/checklist tables, and column renames such as `mock_interview_id` → `screening_id` where applicable).
  - Note: apply this migration on a staging DB snapshot and verify data/FK integrity before production rollout.

- **Field renames in other models**
  - `TrainingAssignment.mockInterviewId` → `TrainingAssignment.screeningId` (Prisma model updated; code updated to normalize DTOs to `screeningId`).
  - Other code now references `screeningId` consistently where training/assignment logic is involved.

- **Notification & event changes**
  - Outbox/notification event names and payload fields updated where applicable: e.g., `CandidateSentToMockInterview` → `CandidateSentToScreening` (payload keys changed), and deep link paths now use `/screenings`.
  - Files to note: `src/notifications/outbox.service.ts`, `src/jobs/notifications.processor.ts` (deep links built here were updated to `/screenings` and `/candidate-projects/:id/screening/:sid`).

- **Routes / Controllers / Services updated**
  - Key backend modules updated to `screening` naming and routes:
    - `src/screening-coordination/screenings/*` (controller, service, DTOs) — routes now under `/screenings`
    - `src/screening-coordination/templates/*` → now handles screening templates (`/screening-templates`)
    - `src/screening-coordination/training/*` — normalized to use `screeningId` and `interviewType: 'screening'` for history entries
    - `src/candidate-projects/candidate-projects.service.ts` — endpoint changed to `/candidate-projects/:id/send-to-screening` and internal call renamed to `sendToScreening`

- **Files modified (not exhaustive, representative list)**
  - `prisma/schema.prisma`
  - `prisma/migrations/20251217_rename_mock_interview_to_screening/migration.sql`
  - `src/screening-coordination/screenings/screenings.service.ts`
  - `src/screening-coordination/screenings/screenings.controller.ts`
  - `src/screening-coordination/templates/screening-templates.service.ts`
  - `src/screening-coordination/training/training.service.ts`
  - `src/candidate-projects/candidate-projects.service.ts`
  - `src/jobs/notifications.processor.ts`
  - `src/notifications/outbox.service.ts`
  - `docs/SCREENING_API_ROUTES.md` (this file)

- **Status & permission strings (pending / follow-up)**
  - RBAC permission strings were updated in many places (e.g., `schedule:mock_interviews` → `schedule:screenings`), but please verify your frontend permission checks and update them if you rely on client-side permission checks.
  - Business status constants such as `SCREENING_STATUS` are used; if your UI checks these string values, coordinate with us before production rollout.

**Update (seeded statuses changed)**
- The candidate-project sub-statuses formerly named `mock_interview_*` in the seeds have been renamed to `screening_*` and the seed file updated accordingly:
  - `mock_interview_assigned` → `screening_assigned`
  - `mock_interview_scheduled` → `screening_scheduled`
  - `mock_interview_completed` → `screening_completed`
  - `mock_interview_passed` → `screening_passed`
  - `mock_interview_failed` → `screening_failed`

  File updated: `prisma/seeds/seed-candidate-project-status.ts`.

Note: Database seed data may still contain legacy status rows if you've already applied seeds previously. When applying the migration to staging, verify and reconcile existing rows (we can provide a small SQL script to migrate existing `name` values if you'd like).

---

## Actionable frontend checklist (detailed) ✅

1. **Search & replace routes and deep links**
   - Replace `/mock-interviews` → `/screenings` and `/mock-interview` → `/screening` in all frontend route strings and deep-link builders.
   - Update candidate-project deep-link format:
     - From `/candidate-projects/:id/mock-interview/:mid` to `/candidate-projects/:id/screening/:sid` (confirm exact route shape used in your frontend).

2. **RBAC / permission strings**
   - Replace occurrences of `*_mock_interviews` with `*_screenings` (e.g., `schedule:mock_interviews` → `schedule:screenings`).

3. **DTO / shared types**
   - If you use generated/shared DTOs, update names (optional) and regenerate types if you consume backend type exports:
     - `CreateMockInterviewDto` → `CreateScreeningDto`
     - `SendToMockInterviewDto` → `SendToScreeningDto`

4. **Notification deep links**
   - Verify notifications that open screening pages use `/screenings/:id` or your app's candidate-project screening route.

5. **End-to-end tests**
   - Update any E2E or integration tests that reference the old routes or permission names and run them to verify navigation and API calls.

---

If you'd like, I can:
- Create a small PR in this repo that highlights all changed backend files (so your frontend PR can reference it), or
- Generate a shell script to search-and-replace the route strings/permissions in your frontend repo (I can run it if you attach the frontend repo), or
- Open a short migration checklist PR describing the staging steps to apply the Prisma migration safely.

Tell me which option you prefer and I’ll proceed. 🔧


---

If you want, I can also:
- Create a small PR diff for the frontend (if you provide the frontend repo) replacing these strings, or
- Generate a script to search & replace these routes across the frontend codebase.

Let me know which option you prefer and I’ll proceed. 🔧