# Work Experience PDF Upload and Preview

## Overview

This document explains the work experience PDF upload flow and the associated preview logic added to the candidate experience section.

The feature enables:
- uploading work-experience-related documents from the candidate UI,
- attaching uploaded documents to a specific `workExperience` record,
- rendering an eye button in the candidate overview to preview linked PDF documents,
- avoiding a new upload modal when previewing existing experience documents.

## Frontend Flow

### Candidate Overview

File: `web/src/features/candidates/components/tabs/CandidateOverview.tsx`

- The work experience section iterates through `candidate.workExperiences`.
- It loads documents from the candidate documents API via `workExperienceDocs`.
- Documents are filtered by `d.workExperienceId === exp.id` for direct association.
- If no linked document exists, the code falls back to shared experience-related documents:
  - `DOCUMENT_TYPE.EXPERIENCE_LETTERS`
  - `DOCUMENT_TYPE.EXPERIENCE_LETTER`
  - `DOCUMENT_TYPE.RELIEVING_LETTER`
  - `DOCUMENT_TYPE.SALARY_SLIP`
  - `DOCUMENT_TYPE.APPOINTMENT_LETTER`
- The eye button only opens the PDF viewer when an experience document exists.
- The upload modal is not opened by the eye button anymore.

### Work Experience Upload Modal

File: `web/src/features/recruiter-docs/components/CandidateUploadDocumentModal.tsx`

- Supports `initialDocType` and `initialWorkExperienceId` props.
- Uses `DOCUMENT_TYPE.EXPERIENCE_LETTERS` for experience documents.
- Hides the legacy singular `DOCUMENT_TYPE.EXPERIENCE_LETTER` option from the upload dropdown to prevent duplicate experience letter choices.
- Allows selecting a document and uploading it to the backend with metadata.

### Work Experience Form Uploads

Files:
- `web/src/components/molecules/QualificationWorkExperienceModal.tsx`
- `web/src/features/candidates/views/CreateCandidatePage.tsx`

- Both pass the `workExperienceId` when uploading a document for a specific experience record.
- This ensures the document is linked to the correct work experience entry.

## Backend Flow

File: `backend/src/upload/upload.controller.ts`

- The upload endpoint now accepts an optional `workExperienceId` field.
- After upload, the backend creates a document record using `documentsService.create()`.
- The document record stores the `workExperienceId` association when provided.

Supported backend request fields include:
- `candidateId`
- `workExperienceId`
- `docType`
- file payload

## Document Types

File: `web/src/constants/document-types.ts`

- The frontend document type constants now include both:
  - `EXPERIENCE_LETTER` = `experience_letter`
  - `EXPERIENCE_LETTERS` = `experience_letters`
- The upload flow uses `experience_letters` as the canonical type for new experience letter uploads.
- The UI configuration contains entries for both constants to support existing data and the new upload path.

## PDF Viewer Behavior

- The candidate overview eye icon now previews the document directly.
- If the selected document is a PDF, the built-in `PDFViewer` component is shown.
- The preview opens only when there is a valid experience document present.

## Notes

- The change prevents duplicate experience letter options in the upload dropdown.
- It also resolves the previous workflow where the eye button could open the upload modal instead of previewing a document.
- The feature improves candidate document traceability by linking uploads to a specific work experience record.
