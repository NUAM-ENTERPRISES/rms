import { baseApi } from "@/app/api/baseApi";
import type {
  ApproveCatalogValuePayload,
  ImportBatch,
  ImportRowResult,
  RecruiterOption,
  UpdateImportRowPayload,
} from "./dto";

export const candidateImportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Uploads a workbook and queues it. Returns before parsing finishes. */
    createImportBatch: builder.mutation<
      { success: boolean; batch: { id: string; status: string } },
      {
        file: File;
        defaultRecruiterId?: string;
        activeTabsOnly?: boolean;
      }
    >({
      query: ({ file, defaultRecruiterId, activeTabsOnly }) => {
        const formData = new FormData();
        formData.append("file", file);
        if (defaultRecruiterId) {
          formData.append("defaultRecruiterId", defaultRecruiterId);
        }
        if (activeTabsOnly !== undefined) {
          formData.append("activeTabsOnly", String(activeTabsOnly));
        }
        return {
          url: "/candidate-import/batches",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["CandidateImport"],
    }),

    getImportBatch: builder.query<
      { success: boolean; batch: ImportBatch },
      string
    >({
      query: (batchId) => `/candidate-import/batches/${batchId}`,
      providesTags: (_result, _error, batchId) => [
        { type: "CandidateImport", id: batchId },
      ],
    }),

    getImportRecruiters: builder.query<
      { success: boolean; recruiters: RecruiterOption[] },
      void
    >({
      query: () => "/candidate-import/recruiters",
    }),

    updateImportRow: builder.mutation<
      { success: boolean },
      { batchId: string; rowId: string; changes: UpdateImportRowPayload }
    >({
      query: ({ batchId, rowId, changes }) => ({
        url: `/candidate-import/batches/${batchId}/rows/${rowId}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: (_result, _error, { batchId }) => [
        { type: "CandidateImport", id: batchId },
      ],
    }),

    setSheetOwners: builder.mutation<
      { success: boolean },
      { batchId: string; owners: Record<string, string> }
    >({
      query: ({ batchId, owners }) => ({
        url: `/candidate-import/batches/${batchId}/sheet-owners`,
        method: "PATCH",
        body: { owners },
      }),
      invalidatesTags: (_result, _error, { batchId }) => [
        { type: "CandidateImport", id: batchId },
      ],
    }),

    approveCatalogValue: builder.mutation<
      {
        success: boolean;
        result: { id: string; name: string; label: string; created: boolean };
      },
      { batchId: string; payload: ApproveCatalogValuePayload }
    >({
      query: ({ batchId, payload }) => ({
        url: `/candidate-import/batches/${batchId}/catalog-values`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { batchId }) => [
        { type: "CandidateImport", id: batchId },
        "Qualification",
        "RoleCatalog",
        "RoleDepartment",
      ],
    }),

    confirmImport: builder.mutation<
      {
        success: boolean;
        imported: number;
        failed: number;
        results: ImportRowResult[];
      },
      { batchId: string; rowIds?: string[] }
    >({
      query: ({ batchId, rowIds }) => ({
        url: `/candidate-import/batches/${batchId}/confirm`,
        method: "POST",
        body: rowIds?.length ? { rowIds } : {},
      }),
      invalidatesTags: (_result, _error, { batchId }) => [
        { type: "CandidateImport", id: batchId },
        "Candidate",
        "AdminDashboard",
      ],
    }),
  }),
});

export const {
  useCreateImportBatchMutation,
  useGetImportBatchQuery,
  useGetImportRecruitersQuery,
  useUpdateImportRowMutation,
  useSetSheetOwnersMutation,
  useApproveCatalogValueMutation,
  useConfirmImportMutation,
} = candidateImportApi;
