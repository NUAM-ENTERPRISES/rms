import { baseApi } from "@/app/api/baseApi";
import type {
  CreateCollectionPayload,
  CreateEventPayload,
  CumulativeReceivedItem,
  ListCollectionsParams,
  OriginalDocumentCollection,
  OriginalDocumentCollectionEvent,
} from "./types";

export interface OriginalDocumentCollectionStats {
  totalCollections: number;
  totalEvents: number;
  totalDocumentsCollected: number;
  completedCollections: number;
  pendingCollections: number;
  inLocker: number;
  thisMonthCollections: number;
  byType: Record<string, number>;
}

const candidateTag = (candidateId: string) => ({
  type: "OriginalDocumentCollection" as const,
  id: `candidate-${candidateId}`,
});

export const originalDocumentCollectionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOriginalDocumentCollectionStats: builder.query<
      { success: boolean; data: OriginalDocumentCollectionStats },
      void
    >({
      query: () => "/original-document-collections/stats",
      providesTags: [{ type: "OriginalDocumentCollection", id: "STATS" }],
    }),

    getOriginalDocumentCollections: builder.query<
      {
        success: boolean;
        data: {
          collections: OriginalDocumentCollection[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        };
      },
      ListCollectionsParams | void
    >({
      query: (params) => ({
        url: "/original-document-collections",
        params: params ?? {},
      }),
      providesTags: (result) =>
        result?.data?.collections
          ? [
              ...result.data.collections.map((c) => ({
                type: "OriginalDocumentCollection" as const,
                id: c.id,
              })),
              { type: "OriginalDocumentCollection", id: "LIST" },
            ]
          : [{ type: "OriginalDocumentCollection", id: "LIST" }],
    }),

    getOriginalDocumentCollection: builder.query<
      { success: boolean; data: OriginalDocumentCollection },
      string
    >({
      query: (id) => `/original-document-collections/${id}`,
      providesTags: (_result, _error, id) => [
        { type: "OriginalDocumentCollection", id },
      ],
    }),

    getCandidateOriginalDocumentCollections: builder.query<
      {
        success: boolean;
        data: {
          candidate: {
            id: string;
            firstName: string;
            lastName: string;
            lockerFileNumber?: string | null;
          } | null;
          collection: OriginalDocumentCollection | null;
          events: OriginalDocumentCollectionEvent[];
          cumulativeReceived: CumulativeReceivedItem[];
        };
      },
      string
    >({
      query: (candidateId) =>
        `/original-document-collections/candidates/${candidateId}`,
      providesTags: (_result, _error, candidateId) => [
        candidateTag(candidateId),
      ],
    }),

    createOriginalDocumentCollection: builder.mutation<
      { success: boolean; data: OriginalDocumentCollection },
      CreateCollectionPayload
    >({
      query: (body) => ({
        url: "/original-document-collections",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "OriginalDocumentCollection", id: "LIST" },
        { type: "OriginalDocumentCollection", id: "STATS" },
        "Candidate",
        candidateTag(arg.candidateId),
      ],
    }),

    addOriginalDocumentCollectionEvent: builder.mutation<
      { success: boolean; data: OriginalDocumentCollection },
      { collectionId: string; body: CreateEventPayload }
    >({
      query: ({ collectionId, body }) => ({
        url: `/original-document-collections/${collectionId}/events`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, _error, { collectionId }) => [
        { type: "OriginalDocumentCollection", id: collectionId },
        { type: "OriginalDocumentCollection", id: "LIST" },
        { type: "OriginalDocumentCollection", id: "STATS" },
        ...(result?.data?.candidateId
          ? [candidateTag(result.data.candidateId)]
          : []),
      ],
    }),

    updateOriginalDocumentCollectionEvent: builder.mutation<
      { success: boolean; data: OriginalDocumentCollection },
      {
        collectionId: string;
        eventId: string;
        body: Partial<CreateEventPayload>;
      }
    >({
      query: ({ collectionId, eventId, body }) => ({
        url: `/original-document-collections/${collectionId}/events/${eventId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, _error, { collectionId }) => [
        { type: "OriginalDocumentCollection", id: collectionId },
        { type: "OriginalDocumentCollection", id: "LIST" },
        ...(result?.data?.candidateId
          ? [candidateTag(result.data.candidateId)]
          : []),
      ],
    }),

    uploadCollectionMerge: builder.mutation<
      {
        success: boolean;
        data: OriginalDocumentCollection;
        mergedDocumentId: string;
      },
      { id: string; files: File[] }
    >({
      query: ({ id, files }) => {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        return {
          url: `/original-document-collections/${id}/upload-merge`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (result, _error, { id }) => [
        { type: "OriginalDocumentCollection", id },
        { type: "OriginalDocumentCollection", id: "LIST" },
        { type: "OriginalDocumentCollection", id: "STATS" },
        "Document",
        ...(result?.data?.candidateId
          ? [candidateTag(result.data.candidateId)]
          : []),
      ],
    }),

    submitCollectionToLocker: builder.mutation<
      { success: boolean; data: OriginalDocumentCollection },
      { id: string; lockerFileNumber: string }
    >({
      query: ({ id, lockerFileNumber }) => ({
        url: `/original-document-collections/${id}/submit-to-locker`,
        method: "POST",
        body: { lockerFileNumber },
      }),
      invalidatesTags: (result, _error, { id }) => [
        { type: "OriginalDocumentCollection", id },
        { type: "OriginalDocumentCollection", id: "LIST" },
        { type: "OriginalDocumentCollection", id: "STATS" },
        "Candidate",
        ...(result?.data?.candidateId
          ? [candidateTag(result.data.candidateId)]
          : []),
      ],
    }),

    completeOriginalDocumentCollection: builder.mutation<
      {
        success: boolean;
        data: OriginalDocumentCollection;
        syncedDocTypes: string[];
      },
      string
    >({
      query: (id) => ({
        url: `/original-document-collections/${id}/complete`,
        method: "POST",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;
          dispatch(
            originalDocumentCollectionsApi.util.updateQueryData(
              "getOriginalDocumentCollection",
              id,
              (draft) => {
                if (draft?.data && result.data) {
                  draft.data = result.data;
                }
              },
            ),
          );
        } catch {
          // invalidatesTags below will refetch on failure recovery
        }
      },
      invalidatesTags: (result, _error, id) => [
        { type: "OriginalDocumentCollection", id },
        { type: "OriginalDocumentCollection", id: "LIST" },
        { type: "OriginalDocumentCollection", id: "STATS" },
        "Processing",
        ...(result?.data?.candidateId
          ? [candidateTag(result.data.candidateId)]
          : []),
      ],
    }),

    exportOriginalDocumentCollections: builder.query<
      string,
      ListCollectionsParams | void
    >({
      query: (params) => ({
        url: "/original-document-collections/export",
        params: params ?? {},
        responseHandler: (response) => response.text(),
      }),
    }),
  }),
});

export const {
  useGetOriginalDocumentCollectionStatsQuery,
  useGetOriginalDocumentCollectionsQuery,
  useGetOriginalDocumentCollectionQuery,
  useGetCandidateOriginalDocumentCollectionsQuery,
  useCreateOriginalDocumentCollectionMutation,
  useAddOriginalDocumentCollectionEventMutation,
  useUpdateOriginalDocumentCollectionEventMutation,
  useUploadCollectionMergeMutation,
  useSubmitCollectionToLockerMutation,
  useCompleteOriginalDocumentCollectionMutation,
  useLazyExportOriginalDocumentCollectionsQuery,
} = originalDocumentCollectionsApi;
