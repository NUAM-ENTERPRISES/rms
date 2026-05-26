/** Post-compression / validation target for standard document multipart uploads. */
export const SYSTEM_MULTIPART_MAX_MB = 10;

/** Ingress limit on document routes before server-side compression. */
export const UPLOAD_ACCEPT_BUFFER_MB = 30;

export const UPLOAD_ACCEPT_BUFFER_BYTES =
  UPLOAD_ACCEPT_BUFFER_MB * 1024 * 1024;

import { DOCUMENT_TYPE_META } from '../common/constants/document-types';

export function getEffectiveMaxMB(docType: string): number {
  const meta = DOCUMENT_TYPE_META[docType as keyof typeof DOCUMENT_TYPE_META];
  const typeMax = meta?.maxSizeMB ?? SYSTEM_MULTIPART_MAX_MB;
  return Math.min(SYSTEM_MULTIPART_MAX_MB, typeMax);
}

export function getEffectiveMaxBytes(docType: string): number {
  return getEffectiveMaxMB(docType) * 1024 * 1024;
}
