# Interview Status History

This document describes the newly added InterviewStatusHistory model and behavior implemented when scheduling interviews.

What was added
- Prisma model `InterviewStatusHistory` (table: `interview_status_history`) — stores status change events for both mock interviews (mockInterviewId) and client/main interviews (interviewId).

When records are created
- Mock interviews (POST /mock-interviews) now:
  - create the `mock_interviews` record
  - update the candidate project's `subStatus` to `MOCK_INTERVIEW_SCHEDULED`
  - create a `candidate_project_status_history` entry
  - create an `interview_status_history` entry linking to the new mock interview (type: "mock", status: "scheduled") and record the human-friendly `changedByName` (scheduler/coordinator name) where available.

- Client/main interviews (POST /interviews) now, when tied to a candidateProjectMap:
  - create the `interviews` record
  - update `subStatus` to `INTERVIEW_SCHEDULED`
  - create a `candidate_project_status_history` entry
  - create an `interview_status_history` entry linking to the interview (type: "client", status: "scheduled") and record the human-friendly `changedByName` (scheduler's name) where available.

Notes for migrations
- After pulling these code changes, run Prisma migration generation and run the migration to update the database schema, then regenerate the Prisma client.

Suggested commands (run locally):
```bash
npx prisma migrate dev --name add_interview_status_history
npx prisma generate
```

Front-end / API notes
- No change to the request body for scheduling an interview. No additional fields are required.
- New audit records are created automatically by the backend for both mock and client interviews.
