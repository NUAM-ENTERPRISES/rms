import {
  getDocumentTypeConfig,
  type DocumentType,
} from "@/constants/document-types";

/** Must match backend Multer post-compression target. */
export const SYSTEM_MULTIPART_MAX_MB = 10;

/** Server ingress buffer before compression (backend only). */
export const UPLOAD_ACCEPT_BUFFER_MB = 30;

/** Combined email attachment limit (Send to Client). */
export const EMAIL_COMBINED_ATTACHMENT_MAX_MB = 20;

export const CSV_ATTACHMENT_MAX_MB = SYSTEM_MULTIPART_MAX_MB;

const MB = 1024 * 1024;

export function effectiveMaxMB(docType: string): number {
  const config = getDocumentTypeConfig(docType as DocumentType);
  const typeMax = config?.maxSizeMB ?? SYSTEM_MULTIPART_MAX_MB;
  return Math.min(SYSTEM_MULTIPART_MAX_MB, typeMax);
}

export function effectiveMaxBytes(docType: string): number {
  return effectiveMaxMB(docType) * MB;
}

export function bytesToMB(bytes: number): number {
  return Number((bytes / MB).toFixed(2));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(2)} MB`;
}

/** Build HTML accept attribute from allowed formats. */
export function buildAcceptAttribute(docType: string): string {
  const config = getDocumentTypeConfig(docType as DocumentType);
  if (!config?.allowedFormats?.length) {
    return ".pdf,.jpg,.jpeg,.png";
  }
  return config.allowedFormats.map((f) => `.${f}`).join(",");
}

const EXTENSION_MIME: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg", "image/jpg"],
  jpeg: ["image/jpeg", "image/jpg"],
  png: ["image/png"],
  webp: ["image/webp"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  csv: ["text/csv", "application/vnd.ms-excel"],
  txt: ["text/plain"],
  mp4: ["video/mp4"],
  webm: ["video/webm"],
  mov: ["video/quicktime"],
  avi: ["video/x-msvideo"],
};

export function isMimeCompatibleWithExtension(
  filename: string,
  mimeType: string
): boolean {
  if (!mimeType) return true;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const allowed = EXTENSION_MIME[ext];
  if (!allowed) return true;
  return allowed.some(
    (m) => mimeType === m || mimeType.startsWith(m.split("/")[0] + "/")
  );
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isPdfMime(mimeType: string): boolean {
  return mimeType === "application/pdf";
}
