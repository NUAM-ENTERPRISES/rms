import { baseApi } from "@/app/api/baseApi";
import type {
  ApplyBundleResult,
  BundleSegment,
  DocumentBundle,
  UpdateSegmentPayload,
} from "./document-bundle.dto";

export const documentBundleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Uploads a merged PDF and queues classification. Returns immediately. */
    createDocumentBundle: builder.mutation<
      { success: boolean; bundle: { id: string; status: string } },
      { candidateId: string; file: File }
    >({
      query: ({ candidateId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/candidates/${candidateId}/document-bundles`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: "CandidateDocumentBundle", id: candidateId },
      ],
    }),

    getDocumentBundle: builder.query<
      { success: boolean; bundle: DocumentBundle },
      string
    >({
      query: (bundleId) => `/candidate-document-bundles/${bundleId}`,
      providesTags: (_result, _error, bundleId) => [
        { type: "CandidateDocumentBundle", id: bundleId },
      ],
    }),

    updateBundleSegment: builder.mutation<
      { success: boolean; segment: BundleSegment },
      { bundleId: string; segmentId: string; changes: UpdateSegmentPayload }
    >({
      query: ({ bundleId, segmentId, changes }) => ({
        url: `/candidate-document-bundles/${bundleId}/segments/${segmentId}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: (_result, _error, { bundleId }) => [
        { type: "CandidateDocumentBundle", id: bundleId },
      ],
    }),

    applyDocumentBundle: builder.mutation<
      { success: boolean } & ApplyBundleResult,
      { bundleId: string; candidateId: string }
    >({
      query: ({ bundleId }) => ({
        url: `/candidate-document-bundles/${bundleId}/apply`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { bundleId, candidateId }) => [
        { type: "CandidateDocumentBundle", id: bundleId },
        { type: "CandidateDocumentBundle", id: candidateId },
        "Document",
        "Candidate",
      ],
    }),
  }),
});

export const {
  useCreateDocumentBundleMutation,
  useGetDocumentBundleQuery,
  useUpdateBundleSegmentMutation,
  useApplyDocumentBundleMutation,
} = documentBundleApi;
