export interface RecruiterDocsUploadPayload {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  compressionApplied?: boolean;
  originalFileSize?: number;
  documentId?: string;
}

/** Normalize POST /upload/document/:candidateId responses. */
export function readUploadPayload(
  response: unknown,
): RecruiterDocsUploadPayload | null {
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
  const documentId =
    nestedDocument &&
    typeof nestedDocument === "object" &&
    typeof (nestedDocument as { id?: unknown }).id === "string"
      ? (nestedDocument as { id: string }).id
      : typeof payload.id === "string"
        ? payload.id
        : undefined;

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
    documentId,
  };
}

export function readCreatedDocumentId(response: unknown): string {
  if (!response || typeof response !== "object") {
    throw new Error("Document was created but no document ID was returned.");
  }
  const id = (response as { data?: { id?: string } }).data?.id;
  if (!id) {
    throw new Error("Document was created but no document ID was returned.");
  }
  return id;
}
