export type ProcessingDocumentMap = Record<
  string,
  Array<{ id: string; status?: string; fileName?: string }>
>;

export interface PendingVerificationDocument {
  docType: string;
  label: string;
  documentId: string;
  fileName?: string;
}

function buildVerifyAllNotes(
  doc: PendingVerificationDocument,
  notesPrefix?: string,
  sharedNotes?: string,
): string {
  const trimmedNotes = sharedNotes?.trim();
  if (trimmedNotes) {
    return notesPrefix ? `${notesPrefix}: ${trimmedNotes}` : trimmedNotes;
  }

  return notesPrefix
    ? `${notesPrefix}: ${doc.label}`
    : `${doc.label} verified via Verify All`;
}

export function getPendingVerificationDocuments(
  requiredDocuments: Array<{ docType: string; label?: string }>,
  candidateDocsByDocType: ProcessingDocumentMap,
  processingDocsByDocType: ProcessingDocumentMap,
): PendingVerificationDocument[] {
  return requiredDocuments
    .filter((req) => {
      const processingList = processingDocsByDocType[req.docType] || [];
      if (processingList.length > 0) return false;

      const candidateList = candidateDocsByDocType[req.docType] || [];
      const candidateDoc = candidateList[0];
      return Boolean(candidateDoc?.id);
    })
    .map((req) => {
      const candidateDoc = candidateDocsByDocType[req.docType][0];
      return {
        docType: req.docType,
        label: req.label || req.docType,
        documentId: candidateDoc.id,
        fileName: candidateDoc.fileName,
      };
    });
}

export async function verifyAllPendingProcessingDocuments(options: {
  pendingDocs: PendingVerificationDocument[];
  processingStepId: string;
  verifyDocument: (args: {
    documentId: string;
    processingStepId: string;
    notes?: string;
  }) => Promise<unknown>;
  notesPrefix?: string;
  sharedNotes?: string;
}): Promise<{ verifiedCount: number; failedCount: number }> {
  const { pendingDocs, processingStepId, verifyDocument, notesPrefix, sharedNotes } =
    options;

  let verifiedCount = 0;
  let failedCount = 0;

  for (const doc of pendingDocs) {
    try {
      await verifyDocument({
        documentId: doc.documentId,
        processingStepId,
        notes: buildVerifyAllNotes(doc, notesPrefix, sharedNotes),
      });
      verifiedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return { verifiedCount, failedCount };
}
