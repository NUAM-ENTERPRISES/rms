# Client Reupload Workflow After Send-to-Client

## Overview

This workflow adds a client-driven reupload path for candidates whose documents were already sent to the client, but the client later requests clearer or corrected documents.

It preserves the existing send-to-client history and moves the candidate back into document verification so the recruiter/documentation team can fix the issue, then resend when ready.

## Real example: Abhi

1. Abhi’s documents are verified and the documentation team clicks **Send to Client**.
2. Abhi moves into `submitted_to_client` and appears in the interview coordinator / shortlist workflow.
3. The client replies by email saying Abhi’s resume is not clear or the spelling is wrong.
4. The documentation team opens Abhi’s document verification page and clicks the new button:
   - **Button label:** `Client revision requested`
5. A modal opens asking for the client feedback reason.
6. After submitting, Abhi moves back into the document verification workflow with a meaningful status.
7. The documentation team can reject, resubmit, and reverify the documents again.
8. Once the documents are corrected, the team can click **Complete Verification** again and resend to the client.

## New status

### Proposed new status name

- `client_revision_requested`
- Label: `Client Revision Requested`

This status clearly communicates that:
- the candidate was already sent to the client,
- the client asked for corrections,
- the process is now back in document verification.

## Intended behavior

1. Candidate documents are verified and the recruiter clicks **Send to Client**.
2. The candidate moves to `submitted_to_client`.
3. If the client requests a revision, the documentation team clicks **Client revision requested** on the candidate’s document page.
4. The candidate moves from `submitted_to_client` into the document workflow under `client_revision_requested`.
5. Documents can now be rejected, resubmitted, and verified again.
6. After correction, the team completes verification again and resends to the client.
7. The original send-to-client history remains intact for audit.

## UI flow

### Button

- Button text: `Client revision requested`
- Placement: candidate document verification page, near the existing send/complete buttons
- Behavior:
  - opens a modal
  - asks for a reason
  - submits the request

### Modal

- Title: `Client revision requested`
- Fields:
  - required reason textarea
- Action:
  - submit request
  - update candidate status
  - keep sent history
  - record the reason in the document verification history table

### History

- Record the action in both `DocumentVerificationHistory` and `CandidateProjectStatusHistory`.
- Store the reason text, the actor (`documentation team`), and the source event (`Client revision requested`).
- This should create a clear audit trail showing when Abhi was reopened after client feedback.

### Recruiter notification

- Notify Abhi’s recruiter when the documentation team submits the client revision request.
- Notification content should include the candidate name and the reason, for example:
  - `Client revision requested: resume clarity issue. Please review the client feedback and update documents.`

## Status transition

- Before: `documents_verified` → `submitted_to_client`
- New path: `submitted_to_client` → `client_revision_requested`
- After correction: `client_revision_requested` → `verification_in_progress` / `pending_documents` → `documents_verified` → `submitted_to_client`

## Backend changes

- Add a new API endpoint:
  - `POST /documents/request-client-reupload`
- Add a new status constant:
  - `client_revision_requested`
- Add a new database seed status:
  - `client_revision_requested` in `backend/prisma/seed.ts`
- Add a new project substatus if using the new workflow seed:
  - `client_revision_requested` in `backend/prisma/seeds/seed-candidate-project-status.ts`
- Update workflow transitions so `submitted_to_client` can move to `client_revision_requested`.
- Preserve forward history; do not delete or fail existing `DocumentForwardHistory` records.

## Frontend changes

- Add a new status mapping and label for `client_revision_requested` in:
  - `web/src/constants/statuses.ts`
  - `web/src/features/candidates/constants.ts`
- Add a reopen button on `web/src/features/documents/views/CandidateDocumentVerificationPage.tsx`
  - visible when current candidate status is `submitted_to_client`
  - opens a reason modal
  - submits the request
- Send the request to the new API endpoint.

## Verification checklist

- [ ] New API endpoint accepts `candidateProjectMapId` and reason.
- [ ] New status `client_revision_requested` is seeded and available.
- [ ] Candidate status changes correctly from `submitted_to_client` to `client_revision_requested`.
- [ ] Candidate appears again in document verification for rework.
- [ ] Documents can be rejected, resubmitted, verified again, and completed.
- [ ] Existing send-to-client history remains visible and unchanged.

## Relevant files

- `backend/src/documents/documents.controller.ts`
- `backend/src/documents/documents.service.ts`
- `backend/src/documents/dto/`
- `backend/src/common/constants/statuses.ts`
- `backend/prisma/seed.ts`
- `backend/prisma/seeds/seed-candidate-project-status.ts`
- `web/src/constants/statuses.ts`
- `web/src/features/candidates/constants.ts`
- `web/src/features/documents/views/CandidateDocumentVerificationPage.tsx`
- `web/src/features/documents/api.ts`
- `web/src/features/documents/components/SendToClientModal.tsx` (optional UX)

## Notes

- The first release should support a single-candidate reopen flow.
- Bulk reopen can be added later.
- If you want more detail, I can also provide exact code snippets for the button, modal, new DTO, and backend endpoint.
