import {
  getDocumentTypeConfig,
  getAllowedFormatsString,
  isValidFileExtension,
  type DocumentType,
} from "@/constants/document-types";
import { extractApiErrorMessage } from "@/shared/constants/account-status";
import {
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
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (!error || typeof error !== "object") {
    return "The upload did not complete. Please try again.";
  }
  const err = error as {
    data?: unknown;
    error?: string;
    status?: number | string;
  };
  const fromData = extractApiErrorMessage(err.data);
  if (fromData) {
    return humanizeUploadTransportMessage(fromData);
  }
  if (err.status === 413) {
    return `This file is too large to send. Please upload a file of ${UPLOAD_ACCEPT_BUFFER_MB} MB or less.`;
  }
  if (typeof err.error === "string" && err.error.length > 0) {
    return humanizeUploadTransportMessage(err.error);
  }
  return "The upload did not complete. Please try again.";
}

function humanizeUploadTransportMessage(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("file too large") ||
    lower.includes("payload too large") ||
    lower.includes("request entity too large")
  ) {
    return `This file is too large to send. Please upload a file of ${UPLOAD_ACCEPT_BUFFER_MB} MB or less.`;
  }
  return message;
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
      message: "Please select a valid document type before uploading a file.",
    };
  }

  if (!isValidFileExtension(docType as DocumentType, file.name)) {
    const allowed = getAllowedFormatsString(docType as DocumentType);
    const maxMb = effectiveMaxMB(docType);
    return {
      ok: false,
      errorCode: "INVALID_EXTENSION",
      message: `This file type is not allowed for ${buildTypeLabel(docType)}. Please upload ${allowed}.`,
    };
  }

  if (file.type && !isMimeCompatibleWithExtension(file.name, file.type)) {
    const allowed = getAllowedFormatsString(docType as DocumentType);
    return {
      ok: false,
      errorCode: "INVALID_MIME",
      message: `This file does not match its file name. Please upload ${allowed} for ${buildTypeLabel(docType)}.`,
    };
  }

  const maxMb = effectiveMaxMB(docType);
  const sizeMb = bytesToMB(file.size);

  if (sizeMb > UPLOAD_ACCEPT_BUFFER_MB) {
    return {
      ok: false,
      errorCode: "FILE_TOO_LARGE",
      message: `This file is ${formatSizeMb(sizeMb)}. You can upload up to ${UPLOAD_ACCEPT_BUFFER_MB} MB. Please choose a smaller file.`,
    };
  }

  if (sizeMb > maxMb) {
    if (
      canServerCompressImage(file) ||
      isPdfMime(file.type) ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      return { ok: true };
    }
    return {
      ok: false,
      errorCode: "FILE_TOO_LARGE",
      message: `This file is ${formatSizeMb(sizeMb)}. ${buildTypeLabel(docType)} must be ${maxMb} MB or smaller, and this file type cannot be compressed automatically. Please upload a smaller PDF or image.`,
    };
  }

  return { ok: true };
}

function formatSizeMb(sizeMb: number): string {
  return `${sizeMb} MB`;
}

/** JPEG/PNG/WebP images compressed on the server via sharp (requires 30MB ingress). */
export function canServerCompressImage(file: File): boolean {
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
  if (canServerCompressImage(file)) return false;
  if (isPdfMime(file.type) || file.name.toLowerCase().endsWith(".pdf")) {
    return false;
  }
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
      message: `This CSV file is ${formatSizeMb(sizeMb)}. Please upload a CSV of ${CSV_ATTACHMENT_MAX_MB} MB or less.`,
    };
  }
  return { ok: true };
}

export interface ParsedDocumentUpload {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  compressionApplied?: boolean;
  originalFileSize?: number;
  document?: { id: string } | null;
}

/** Normalize POST /upload/document/:candidateId responses for create/reuse flows. */
export function parseDocumentUploadResponse(
  response: unknown,
): ParsedDocumentUpload | null {
  if (!response || typeof response !== "object") return null;

  const root = response as Record<string, unknown>;
  const payload =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const fileName =
    typeof payload.fileName === "string" ? payload.fileName : undefined;
  const fileUrl =
    typeof payload.fileUrl === "string" ? payload.fileUrl : undefined;

  if (!fileName || !fileUrl) return null;

  const nestedDocument = payload.document;
  const document =
    nestedDocument &&
    typeof nestedDocument === "object" &&
    typeof (nestedDocument as { id?: unknown }).id === "string"
      ? { id: (nestedDocument as { id: string }).id }
      : typeof payload.id === "string"
        ? { id: payload.id }
        : null;

  return {
    fileName,
    fileUrl,
    fileSize:
      typeof payload.fileSize === "number" ? payload.fileSize : undefined,
    mimeType:
      typeof payload.mimeType === "string" ? payload.mimeType : undefined,
    compressionApplied: payload.compressionApplied === true,
    originalFileSize:
      typeof payload.originalFileSize === "number"
        ? payload.originalFileSize
        : undefined,
    document,
  };
}

export function getCreatedDocumentId(response: unknown): string {
  if (!response || typeof response !== "object") {
    throw new Error("Document was created but no document ID was returned.");
  }
  const data = (response as { data?: { id?: string } }).data;
  if (data?.id) return data.id;
  throw new Error("Document was created but no document ID was returned.");
}
