# HRD Reminder Flow (Implementation & Integration) ✅

This document captures the full HRD reminder design, implementation details, API contract, and frontend integration patterns used in this project.

---

## 1. Overview 💡
HRD reminders notify processing users when a processing step requiring hard copy documents (HRD) remains incomplete. The system uses:
- Prisma/Postgres to store reminder records (`hRDReminder`)
- BullMQ + Redis for scheduling delayed jobs
- NestJS services/controllers and a Bull worker to process reminders
- Notifications and optional realtime socket events for frontend popups

---

## 2. Key files & modules 🔧
- Backend
  - `src/hrd-reminders/hrd-reminders.service.ts` — scheduling, reset, cancel, trigger now
  - `src/hrd-reminders/hrd-reminders.controller.ts` — endpoints: `GET /hrd-reminders/hrd-scheduler`, `DELETE /hrd-reminders/:id/dismiss`
  - `src/jobs/hrd-reminder.processor.ts` — Bull worker that runs reminders, marks sent/completed, schedules follow-ups
  - `src/processing/processing.controller.ts` — `POST /processing/steps/:stepId/hrd-trigger` (manual trigger)
  - Prisma model: `hRDReminder` (see schema in `prisma/schema.prisma`)
- Frontend (examples implemented)
  - RTK Query endpoints (`getMyHRDReminders` -> `/hrd-reminders/hrd-scheduler`)
  - `useHRDReminders` hook (polling & localStorage guard)
  - `HRDReminderModal` for popup UI

---

## 3. Data model (important fields) 🧾
Prisma `hRDReminder` contains (summary):
- `id` (string)
- `processingStepId` (FK)
- `processingCandidateId` (FK)
- `assignedTo` (user id string | nullable)
- `scheduledFor` (datetime)
- `status` (`pending` | `sent` | `completed`)
- `reminderCount` (number) — total sent
- `dailyCount` (number) — sent today
- `daysCompleted` (number)
- `sentAt` (datetime | null)
- `createdAt` / `updatedAt`

---

## 4. System config (HRD_SETTINGS) ⚙️
Stored in `system_config` as `HRD_SETTINGS` with shape (important keys):
```json
{
  "daysAfterSubmission": 15,
  "dailyTimes": ["09:00"],
  "remindersPerDay": 1,
  "totalDays": 3,
  "delayBetweenReminders": 1440,
  "escalate": { "enabled": false, "afterDays": 3, "assignmentStrategy": "round_robin" },
  "testMode": { "enabled": false, "immediateDelayMinutes": 1 }
}
```

> Note: `testMode.enabled` should be `false` in production; set to `true` only for local developer testing (it forces quick runs).
- `testMode.enabled` forces quick runs for development/testing.

---

## 5. Scheduling logic (summary) ⏱️
1. When a step is submitted (or manually triggered), `HrdRemindersService.createHRDReminder`:
   - resolves `assignedTo` (step.assignedTo || processingCandidate.assignedProcessingTeamUserId)
   - computes `scheduledFor` using `daysAfterSubmission` + `dailyTimes`
   - respects `testMode` (forces short delay)
   - upserts a `hRDReminder` record and enqueues a Bull job with a delay (delay = scheduledFor - now)
2. `HrdReminderProcessor` runs the job:
   - verifies step still pending / not completed
   - updates reminder counters (`reminderCount`, `dailyCount`, `sentAt`)
   - creates a Notification (if assignedTo exists)
   - emits a socket event (recommended) so frontend can show a popup
   - schedules follow-up reminders up to `totalDays` or marks reminder `completed`
3. `HrdRemindersService.cancelHRDRemindersForStep` is called when a step is verified or completed to cancel pending jobs and mark records `completed`.

---

## 6. API endpoints (what frontend uses) 🔗
- GET `/api/v1/hrd-reminders/hrd-scheduler`
  - Returns reminders for the current user (pending & recent sent)
  - Response: `{ success: true, data: HRDReminder[], message: '...' }`
- DELETE `/api/v1/hrd-reminders/:reminderId/dismiss`
  - Dismisses/completes a reminder (only by assigned user / permitted role)
- POST `/api/v1/processing/steps/:stepId/hrd-trigger`
  - Manual trigger to enqueue an immediate reminder for the step (useful for testing)

Note: update frontend calls from `my-reminders` → `hrd-scheduler`.

---

## 7. Real-time contract (recommended) ⚡
Emit a socket event when a reminder is sent so the frontend can popup immediately:
- Event name: `hrdReminder.sent` (or use existing `notification` channel)
- Payload example:
```json
{
  "type":"hrdReminder.sent",
  "payload":{
    "reminderId":"...",
    "stepId":"...",
    "processingId":"...",
    "scheduledFor":"2026-01-16T06:17:39.889Z",
    "sentAt":"2026-01-16T11:47:39.889Z",
    "assignedToId":"user_123",
    "title":"HRD Reminder",
    "body":"Please complete HRD verification for candidate John Doe.",
    "route":"/processing/proc_22/steps/..."
  }
}
```
Implementation notes:
- Emit to `user:{userId}` room or `step:{stepId}` room (server-side socket must authorize and join rooms).
- Frontend listens and shows popup (toast/modal) with actionable button (Open processing page).

---

## 8. Frontend integration (how to display popup) 🖥️
Two options:
- Polling (simple): poll `GET /hrd-reminders/hrd-scheduler` every 10–30s and show modal when `dailyCount` increases.
- Real-time (recommended): socket listen for `hrdReminder.sent` and `open` a popup immediately.

Best practices implemented in the frontend:
- Track shown reminders in `localStorage` (e.g., `hrd_shown_reminders`) to prevent duplicate popups
- Use an optimistic update when user calls trigger endpoint
- Provide actions: **View Processing**, **Dismiss** (call `DELETE /hrd-reminders/:id/dismiss`)

---

## 9. Testing checklist ✅
- For development: you may seed `HRD_SETTINGS` with `testMode.enabled = true` to force quick reminder runs (do not enable in production).
- [ ] Call `POST /processing/steps/:stepId/hrd-trigger` and confirm a reminder is created and a job runs (check logs)
- [ ] Confirm `hrd-scheduler` returns the reminder for the assigned user
- [ ] Verify `hrdReminder.sent` socket event is emitted and frontend shows popup
- [ ] Trigger a step completion and confirm pending reminders are cancelled
- [ ] Run the backfill script if assignedTo is missing for old records

---

## 10. Troubleshooting & notes ⚠️
- If frontend never sees popup: check (1) socket auth/room join, (2) whether the processor created a Notification or emitted the event, (3) assignedTo was null (processor will log this)
- If reminders are scheduled at wrong times: verify `dailyTimes`, `daysAfterSubmission`, and timezone formatting on the frontend
- In production, ensure `testMode` is disabled

---

## 11. References & files 📁
- `src/hrd-reminders/hrd-reminders.service.ts`
- `src/hrd-reminders/hrd-reminders.controller.ts`
- `src/jobs/hrd-reminder.processor.ts`
- `src/processing/processing.controller.ts` (trigger endpoint)
- Prisma schema: `prisma/schema.prisma` migration: `20260114165326_add_hrd_reminder`

---

If you want, I can also:
- Add a short NestJS socket emit snippet inside `HrdReminderProcessor` to send `hrdReminder.sent`, or
- Create a ready-to-drop React hook + small `HRDReminderPopup` component for your frontend (socket + fallback polling).

Which one should I add next? ✨
