# Work Experience Document Profiling and Upload

## Purpose

This document describes the candidate work experience profiling logic and upload functionality for experience-related documents.

The goal is to support:
- profile completion tracking for candidate documents,
- upload of documents tied to work experience and candidate profile requirements,
- previewing existing documents in the candidate experience flow,
- consistent document type handling for experience letters.

## Key Components

### `DocumentUploadSection`

Path: `web/src/features/candidates/components/DocumentUploadSection.tsx`

This component is responsible for:
- displaying the candidate's uploaded documents,
- computing profile completion status for required documents,
- presenting missing required documents as upload suggestions,
- opening the upload modal for selected document types,
- previewing documents via `PDFViewer`.

### `CandidateUploadDocumentModal`

Path: `web/src/features/recruiter-docs/components/CandidateUploadDocumentModal.tsx`

This modal handles:
- selecting a document type,
- choosing a file to upload,
- previewing the selected file before upload,
- validating file type and size,
- uploading the file metadata back to the application.

### `DocumentUpload`

Path: `web/src/components/molecules/DocumentUpload.tsx`

This reusable component provides the generic document upload UI with drag-and-drop support, file validation, and a document list.
It is used as the foundational upload widget in candidates and document management flows.

## Profiling Logic

### Profile Completion Computation

The upload section uses `getCandidateProfileCompletion()` to compute:
- how many required documents are already uploaded,
- how many documents are missing,
- which document types are still required.

This is used to render the status summary and the missing document cards.

### Missing Document Cards

When required documents are missing, `DocumentUploadSection` renders a card for each missing item with:
- label describing the missing document,
- a button to upload that specific document type.

Clicking the button sets `preselectedDocType` and opens `CandidateUploadDocumentModal`.

## Upload Flow

### Upload Form Submission

The modal upload flow is:
1. User selects a document type and file.
2. The component validates file size and type.
3. `CandidateUploadDocumentModal` calls `onUpload` with `file` and `meta`.
4. `DocumentUploadSection` constructs `FormData` and calls `uploadDocument({ candidateId, formData })`.
5. After the upload service responds, it creates a document record via `createDocument()`.
6. The UI refreshes the document list by calling `refetch()` or `onRefresh()`.

### Experience Document Metadata

The upload logic passes additional metadata when available:
- `docType`
- `documentNumber`
- `expiryDate`
- `notes`
- `roleCatalogId`

This ensures uploaded documents are tracked with the correct type and extra details.

## Work Experience Document Preview

The section provides direct preview actions:
- an eye button opens documents in `PDFViewer` when the file is PDF,
- otherwise the file opens in a new browser tab,
- download buttons are also available for each document.

This is part of delivering a seamless experience for reviewing work experience attachments.

## Document Type Handling

Path: `web/src/constants/document-types.ts`

The work experience flow relies on canonical document type constants.
Experience documents use:
- `DOCUMENT_TYPE.EXPERIENCE_LETTERS` (`experience_letters`)
- `DOCUMENT_TYPE.EXPERIENCE_LETTER` (`experience_letter`)

To avoid duplicate options in the upload UI, the modal hides the legacy singular `EXPERIENCE_LETTER` type while still supporting both values in the codebase.

## Notes

- The document upload modal and profile completion cards live together in the candidate documents experience.
- The workflow is designed to encourage completing candidate profile requirements while keeping upload and preview logic clear.
- This implementation supports both work experience-specific upload actions and generic candidate document management.
