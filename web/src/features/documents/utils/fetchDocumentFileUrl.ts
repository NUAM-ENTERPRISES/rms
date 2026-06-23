import { store } from "@/app/store";
import { documentsApi } from "../api";

/** Resolve a document file URL on demand (e.g. after slim requirements list). */
export async function fetchDocumentFileUrl(
  documentId: string,
): Promise<string | null> {
  if (!documentId) return null;

  const result = await store.dispatch(
    documentsApi.endpoints.getDocumentById.initiate(documentId, {
      forceRefetch: true,
    }),
  );

  if ("data" in result && result.data?.data?.fileUrl) {
    return result.data.data.fileUrl;
  }

  return null;
}

export async function resolveDocumentFileUrl(options: {
  documentId: string;
  fileUrl?: string | null;
}): Promise<string | null> {
  if (options.fileUrl) {
    return options.fileUrl;
  }
  return fetchDocumentFileUrl(options.documentId);
}
