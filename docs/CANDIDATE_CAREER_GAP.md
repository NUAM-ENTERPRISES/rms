# Candidate Career Gap Analysis

## Overview

Career gap analysis calculates **idle time in a candidate’s employment timeline** from recorded work experience and qualifications. It helps recruiters see:

- total merged work experience (months),
- total career gap time (months),
- the longest single gap,
- a breakdown of each gap with type, dates, and label.

Gaps are computed on the **backend** and shown on the **Candidate Overview** tab in the web app.

---

## What counts as a gap

| Situation | Counted as gap? |
|-----------|-----------------|
| Time **between two jobs** (after merging overlaps), longer than **30 days** | **Yes** — `between_jobs` |
| Candidate has **no current job** and last role ended more than **30 days** ago | **Yes** — `current_unemployment` |
| Long idle time (**> 12 months**) after **latest completed** degree before first job | **Yes** — `education_to_work` |
| Studying (e.g. BSc → MSc) with no jobs recorded | **No** — study is not an employment gap |
| First job within **12 months** of latest completed graduation | **No** — normal post-graduation transition |
| Ongoing qualification (`isCompleted: false`) | **No** education-to-work gap flagged |
| Overlapping concurrent jobs | **No** between-job gap; experience is merged |
| Job change within **30 days** | **No** — treated as normal transition |

### Reference example (nursing)

| Period | Gap? |
|--------|------|
| BSc Nursing completed 2020 → MSc Nursing completed 2023 | No (study) |
| MSc 2023 → first job 2024 | No (< 12 months after graduation) |
| Aster Hospital 2024–2025 | Employment |
| Next job starts 2026 (after Aster ended ~2025) | **Yes — ~1 year `between_jobs` gap** |

---

## Data required

Ensure the candidate profile has accurate:

1. **Work experience** (`WorkExperience` records)
   - `startDate`, `endDate` (or `isCurrent: true`)
   - `companyName` (used in gap labels)

2. **Qualifications** (`CandidateQualification` records) — optional but recommended
   - `graduationYear`
   - `isCompleted` (true when degree is finished)
   - Linked `qualification.name` (used in education gap labels)

No separate “gap” field is stored in the database. Gaps are **calculated on read**.

---

## How to check in the UI

1. Open **Candidates** and select a candidate.
2. Go to the **Overview** tab (`CandidateDetailPage` → `CandidateOverview`).
3. Look for:

   **Candidate Information**
   - **Experience** — merged total from `careerGapAnalysis` on candidate detail
   - **Career Gap** — total gap duration, or “No gaps” / “N/A”
   - Amber badge when longest gap ≥ 12 months

   **Work Experience section**
   - Green banner: **Total Experience**, **Total Gap**, **Positions**
   - **Career gap breakdown** list (when gaps exist): type badge, label, date range, duration

4. After adding, editing, or deleting work experience or qualifications, refetch the candidate detail (`GET /candidates/:id`) — gap data updates via the embedded `careerGapAnalysis` field.

---

## How to check via API

Career gap data is included on the **candidate detail** response only (not on list endpoints).

### Endpoint

```http
GET /api/v1/candidates/:candidateId
Authorization: Bearer <access_token>
```

Read the nested field: `data.careerGapAnalysis`.

### Example request (curl)

```bash
curl -s \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/api/v1/candidates/CANDIDATE_ID"
```

Adjust base URL and API prefix to match your environment.

### Example response (excerpt)

```json
{
  "success": true,
  "data": {
    "id": "candidate123",
    "firstName": "Jane",
    "workExperiences": [ "..."],
    "qualifications": [ "..." ],
    "careerGapAnalysis": {
      "totalExperienceMonths": 12,
      "totalGapMonths": 12,
      "longestGapMonths": 12,
      "hasCurrentEmployment": false,
      "gaps": [
        {
          "type": "between_jobs",
          "startDate": "2025-01-01",
          "endDate": "2026-01-01",
          "months": 12,
          "label": "Between Aster Hospital and City Clinic"
        }
      ]
    }
  },
  "message": "Candidate retrieved successfully"
}
```

### Gap types

| `type` | Meaning |
|--------|---------|
| `between_jobs` | Idle time between two employment periods |
| `education_to_work` | More than 12 months after latest completed degree before first job |
| `current_unemployment` | No current role; idle since last job ended |

### Swagger

In local/dev, open Swagger UI and find **Candidates** → **Get candidate by ID**. The response includes `careerGapAnalysis`.

---

## Calculation rules (backend)

Implementation: [`backend/src/candidates/utils/employment-timeline.util.ts`](../backend/src/candidates/utils/employment-timeline.util.ts)

Constants:

- `MIN_GAP_DAYS = 30`
- `EDUCATION_TO_WORK_GRACE_MONTHS = 12`

Steps:

1. Build date ranges from work experience (`endDate` = today if `isCurrent`).
2. Sort by `startDate`, merge overlapping ranges.
3. **Between jobs:** gap from `merged[i].end` to `merged[i+1].start` if > 30 days.
4. **Education to work:** latest completed `graduationYear` → Dec 31; compare to earliest job; flag only if idle > 12 months and no ongoing qualification.
5. **Current unemployment:** if no `isCurrent` job, gap from last end to today if > 30 days.

Computed in [`backend/src/candidates/candidates.service.ts`](../backend/src/candidates/candidates.service.ts) → `findOne()` attaches `careerGapAnalysis` to the candidate detail payload.

---

## Frontend integration

| File | Role |
|------|------|
| [`web/src/features/candidates/api.ts`](../web/src/features/candidates/api.ts) | `Candidate.careerGapAnalysis` type on detail response |
| [`web/src/features/candidates/components/tabs/CandidateOverview.tsx`](../web/src/features/candidates/components/tabs/CandidateOverview.tsx) | UI: Career Gap field, banner, breakdown |
| [`web/src/features/candidates/views/CandidateDetailPage.tsx`](../web/src/features/candidates/views/CandidateDetailPage.tsx) | Loads candidate via `useGetCandidateByIdQuery` |

Data source: `candidate.careerGapAnalysis` from the single candidate detail fetch (no separate gap request).

---

## Manual test checklist

1. **Nursing scenario** — BSc 2020, MSc 2023, job 2024, Aster 2024–2025, next job 2026 → one `between_jobs` gap only.
2. **Two jobs, 1 year apart** — gap appears in UI and API.
3. **Overlapping jobs** — no between-job gap; experience not double-counted.
4. **MSc 2023, first job 2024** — no `education_to_work` gap.
5. **Last job ended, not current** — `current_unemployment` if idle > 30 days.
6. **Edit work experience** — overview gap updates after save.

---

## Automated tests

Run backend unit tests:

```bash
cd backend
npx jest src/candidates/utils/__tests__/employment-timeline.util.spec.ts
```

Tests cover merging overlaps, nursing scenario, education grace period, ongoing qualifications, current unemployment, and empty history.

---

## Related fields

- **`Candidate.totalExperience`** — manual override on the candidate record; can differ from merged timeline when recruiters account for breaks differently. Career gap analysis always uses **work experience + qualification** records, not this override alone.
- **Eligibility / matching** — other modules may still use `totalExperience` or their own experience helpers; career gap is a **profile insight** on overview, not an eligibility gate unless product adds that later.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Gap shows “N/A” | No work experience records on the candidate |
| Expected gap missing | Gap may be ≤ 30 days; or jobs overlap and were merged |
| Education gap missing | First job within 12 months of latest degree, or ongoing qualification |
| Total experience differs from sum of jobs | Overlapping jobs are merged (correct behavior) |
| API 404 | Invalid `candidateId` |
| UI not updating | Confirm work experience / qualification save succeeded; refetch `GET /candidates/:id` |
