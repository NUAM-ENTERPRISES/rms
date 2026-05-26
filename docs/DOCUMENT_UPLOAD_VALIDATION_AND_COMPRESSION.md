# Document upload validation and compression

## Overview

Candidate document uploads are validated on the **web client** (immediate Sonner toasts) and normalized on the **backend** (compression safety net before S3). This keeps behavior consistent across:

- Recruiter docs detail (`UploadDocumentModal`, `CandidateUploadDocumentModal`)
- Documentation verification (`CandidateDocumentVerificationPage`)
- Processing steps (`processing/UploadDocumentModal`)
- Send to Client CSV attachments (`SendToClientModal`, `BulkSendToClientModal`)

Introduction video uploads (up to 100 MB, presigned flow) are **not** covered here.

## Size limits

| Limit | Value | Where enforced |
|--------|--------|----------------|
| System multipart target | **10 MB** | Multer default for profile images; post-compression target for documents |
| Document route ingress | **30 MB** | Per-route `FileInterceptor` on document/resume/offer-letter endpoints |
| Per document type | **1–10 MB** (see `DOCUMENT_TYPE_CONFIG`) | `effectiveMaxMB(docType) = min(10, type max)` |
| Combined email attachments | **20 MB** | Send to Client modals |
| CSV attachment | **10 MB** | `validateCsvAttachment` |

## Frontend library

Location: [`web/src/lib/document-upload/`](../web/src/lib/document-upload/)

### `validateDocumentFile(file, docType)`

Runs on file pick. Checks:

- Known document type
- Allowed extension (from `document-types` constants)
- MIME vs extension (when `file.type` is set)
- Size vs `effectiveMaxMB` (allows oversized **images** and **PDFs** that will be compressed)

Returns `{ ok, errorCode?, message? }`. Show `message` with `toast.error`.

### `prepareDocumentFileForUpload(file, docType)`

Runs before upload submit:

- **Images**: `browser-image-compression` until under cap (toast: compressing…)
- **PDF**: passes through; toast notes server will compress (requires 30 MB ingress)
- **Other types** over cap: error toast with max MB guidance

### `validateCsvAttachment(file)`

CSV-only, max 10 MB. Used in Send to Client flows.

### `getUploadErrorMessage(error)`

Maps RTK Query / API errors (including 413) to user-facing upload messages.

## Backend

### Route Multer limits

[`upload.controller.ts`](../backend/src/upload/upload.controller.ts) document routes use `UPLOAD_ACCEPT_BUFFER_BYTES` (30 MB).

Profile image routes keep the global **10 MB** module limit.

### PDF compression (`pdf-compressor.ts` + `qpdf-compress`)

[`pdf-compressor.ts`](../backend/src/upload/pdf-compressor.ts) keeps the file as **PDF** (no conversion to JPEG):

1. **Lossless** pass — structural optimization (streams, metadata, dedup)
2. **Lossy** passes (up to 3) — re-encodes embedded images, downscales to ~72 DPI via [`qpdf-compress`](https://www.npmjs.com/package/qpdf-compress)
3. **Ghostscript** (optional) — if `gs` is on `PATH` or `GHOSTSCRIPT_PATH` is set, tries `/ebook` then `/screen` presets

Dependency: `qpdf-compress` (native addon, prebuilt binaries for macOS/Linux/Windows).

### `UploadCompressionService`

[`upload-compression.service.ts`](../backend/src/upload/upload-compression.service.ts):

- **Images**: `sharp` resize + JPEG quality steps (uploaded images only, not PDFs)
- **PDF**: `compressPdfToTarget()` as above
- **CSV / DOC / DOCX**: no compression; `BadRequestException` if still over `effectiveMaxBytes`

Called from `UploadService.uploadDocument()` and `uploadResume()` before `uploadFile()`.

### Per-type max alignment

`uploadDocument()` uses `getEffectiveMaxMB(docType)` instead of a hardcoded 20 MB.

## Toast message catalog

| Situation | Example message |
|-----------|------------------|
| Wrong extension | `Please upload a valid file. Allowed: PDF, JPG, PNG (max 5 MB for Passport).` |
| Wrong CSV | `Please upload only CSV files.` |
| CSV too large | `CSV file is too large (12.00 MB). Maximum size is 10 MB.` |
| File too large (no compress) | `File is too large (12.40 MB). Maximum for this document is 5 MB.` |
| Compressing image | `Large image detected — compressing before upload…` |
| Compressing PDF (client) | `Large PDF detected — the server will compress it during upload.` |
| After image compress | `File compressed from 14.20 MB to 4.80 MB.` |
| Combined email over 20 MB | `Total attachment size (22.50 MB) exceeds the 20 MB limit…` |
| API / Multer 413 | `Upload failed — file exceeds the 10 MB system limit.` |

## Adding a new upload surface

1. Import `validateDocumentFile`, `prepareDocumentFileForUpload`, `buildAcceptAttribute`, `effectiveMaxMB` from `@/lib/document-upload`.
2. On **file change**: `validateDocumentFile` → toast + inline error if invalid.
3. On **submit**: `prepareDocumentFileForUpload` then POST multipart.
4. In **catch**: `toast.error(getUploadErrorMessage(error))`.
5. Show helper text: allowed formats + `effectiveMaxMB(docType)`.
6. Ensure backend `docType` exists in `DOCUMENT_TYPE_META` with correct `maxSizeMB`.

## Testing

### Frontend

```bash
cd web && npx vitest run src/lib/document-upload/__tests__/validate.test.ts
```

### Backend

```bash
cd backend && npm test -- upload-compression.service.spec.ts
```

### Manual QA

1. Recruiter Docs detail → upload requirement: wrong extension → toast; large JPG → auto-compress → success.
2. Documentation verification → inline upload: same checks.
3. Processing visa step → upload modal: format/size hints.
4. Send to Client → attach 11 MB CSV → rejected; combined selections over 20 MB → toast on send.

## Known limitations

- **PDF compression** uses lossy image re-encoding inside the PDF; text-heavy vector PDFs may shrink less than scanned resumes.
- Extremely large scans may still exceed the per-type cap after all passes; users must re-export manually.
- **Ghostscript** is optional; install `gs` on the server for an extra compression fallback.
- **CSV / Word** files cannot be auto-compressed; users must reduce file size manually.
- **Per-type caps below 10 MB** (e.g. passport photo 1 MB) are enforced after compression; a 15 MB image may compress under 10 MB but still fail a 1 MB type limit.
