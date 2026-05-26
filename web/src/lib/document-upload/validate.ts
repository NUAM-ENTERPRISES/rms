import {
  getDocumentTypeConfig,
  getAllowedFormatsString,
  isValidFileExtension,
  type DocumentType,
} from "@/constants/document-types";
import {
  SYSTEM_MULTIPART_MAX_MB,
  UPLOAD_ACCEPT_BUFFER_MB,
  effectiveMaxMB,
  bytesToMB,
  isMimeCompatibleWithExtension,
  isPdfMime,
  CSV_ATTACHMENT_MAX_MB,
} from "./constants";

export type DocumentUploadErrorCode =
  | "UNKNOWN_DOC_TYPE"
  | "INVALID_EXTENSION"
  | "INVALID_MIME"
  | "FILE_TOO_LARGE"
  | "INVALID_CSV";

export interface DocumentValidationResult {
  ok: boolean;
  errorCode?: DocumentUploadErrorCode;
  message?: string;
}

export function getUploadErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Upload failed. Please try again.";
  }
  const err = error as {
    data?: { message?: string | string[] };
    error?: string;
    status?: number;
  };
  const msg = err.data?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string" && msg.length > 0) return msg;
  if (err.status === 413) {
    return `Upload failed — file exceeds the ${SYSTEM_MULTIPART_MAX_MB} MB system limit.`;
  }
  if (typeof err.error === "string" && err.error.length > 0) return err.error;
  return "Upload failed. Please try again.";
}

function buildTypeLabel(docType: string): string {
  const config = getDocumentTypeConfig(docType as DocumentType);
  return config?.displayName ?? docType;
}

export function validateDocumentFile(
  file: File,
  docType: string
): DocumentValidationResult {
  const config = getDocumentTypeConfig(docType as DocumentType);
  if (!config) {
    return {
      ok: false,
      errorCode: "UNKNOWN_DOC_TYPE",
      message: "Unknown document type. Please select a valid document type.",
    };
  }

  if (!isValidFileExtension(docType as DocumentType, file.name)) {
    const allowed = getAllowedFormatsString(docType as DocumentType);
    const maxMb = effectiveMaxMB(docType);
    return {
      ok: false,
      errorCode: "INVALID_EXTENSION",
      message: `Please upload a valid file. Allowed: ${allowed} (max ${maxMb} MB for ${buildTypeLabel(docType)}).`,
    };
  }

  if (file.type && !isMimeCompatibleWithExtension(file.name, file.type)) {
    const allowed = getAllowedFormatsString(docType as DocumentType);
    return {
      ok: false,
      errorCode: "INVALID_MIME",
      message: `File type does not match extension. Allowed: ${allowed}.`,
    };
  }

  const maxMb = effectiveMaxMB(docType);
  const sizeMb = bytesToMB(file.size);

  if (sizeMb > UPLOAD_ACCEPT_BUFFER_MB) {
    return {
      ok: false,
      errorCode: "FILE_TOO_LARGE",
      message: `File is too large (${formatSizeMb(sizeMb)}). Maximum upload size is ${UPLOAD_ACCEPT_BUFFER_MB} MB.`,
    };
  }

  if (sizeMb > maxMb) {
    if (canClientCompress(file)) {
      return { ok: true };
    }
    if (
      isPdfMime(file.type) ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      return { ok: true };
    }
    return {
      ok: false,
      errorCode: "FILE_TOO_LARGE",
      message: `File is too large (${formatSizeMb(sizeMb)}). Maximum for this document is ${maxMb} MB. Please use a smaller PDF or image.`,
    };
  }

  return { ok: true };
}

function formatSizeMb(sizeMb: number): string {
  return `${sizeMb} MB`;
}

/** Files we can shrink in the browser before upload. */
export function canClientCompress(file: File): boolean {
  const mime = file.type || "";
  return (
    mime.startsWith("image/") &&
    (mime === "image/jpeg" ||
      mime === "image/jpg" ||
      mime === "image/png" ||
      mime === "image/webp" ||
      /\.(jpe?g|png|webp)$/i.test(file.name))
  );
}

/** PDFs and other large files are compressed on the server (requires 30MB ingress). */
export function needsServerCompression(file: File, docType: string): boolean {
  const maxBytes = effectiveMaxMB(docType) * 1024 * 1024;
  if (file.size <= maxBytes) return false;
  if (canClientCompress(file)) return false;
  return true;
}

export function validateCsvAttachment(file: File): DocumentValidationResult {
  const isCsv =
    file.type === "text/csv" ||
    file.name.toLowerCase().endsWith(".csv");
  if (!isCsv) {
    return {
      ok: false,
      errorCode: "INVALID_CSV",
      message: "Please upload only CSV files.",
    };
  }
  const sizeMb = bytesToMB(file.size);
  if (sizeMb > CSV_ATTACHMENT_MAX_MB) {
    return {
      ok: false,
      errorCode: "FILE_TOO_LARGE",
      message: `CSV file is too large (${formatSizeMb(sizeMb)}). Maximum size is ${CSV_ATTACHMENT_MAX_MB} MB.`,
    };
  }
  return { ok: true };
}
