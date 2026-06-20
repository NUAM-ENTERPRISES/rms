import { baseApi } from "@/app/api/baseApi";
import {
  buildProcessingStatusChangeInvalidationTags,
} from "@/app/providers/notification-handlers/processing-status-change-handler";
import {
  ProcessingCandidateSummary,
  ProcessingHistoryEntry,
  ProcessingStepKey,
  ProcessingStepStatus,
  ProcessingStep,
  ProcessingCandidate,
} from "../types";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
};

type Paginated<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages?: number;
    totalPages?: number;
  };
};

export type ProcessingCandidatesQuery = {
  search?: string;
  projectId?: string;
  roleCatalogId?: string;
  status?: "assigned" | "in_progress" | "completed" | "cancelled" | "on_hold" | "all" | "visa_stamped";
  step?: string;
  filterType?: "visa_stamped" | "total_processing" | "awaiting_requests";
  page?: number;
  limit?: number;
  recruiterId?: string;
  assignedToId?: string;
  countryCodes?: string;
  sector?: string;
  fileNumber?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const processingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProcessingCandidates: builder.query<
      ApiResponse<{
        candidates: ProcessingCandidate[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>,
      { projectId: string } & ProcessingCandidatesQuery
    >({
      query: ({ projectId, ...params }) => ({
        url: `/processing/project/${projectId}`,
        params,
      }),
      providesTags: ["ProcessingSummary"],
    }),
    getAllProcessingCandidates: builder.query<
      ApiResponse<{
        candidates: ProcessingCandidate[];
        counts: {
          assigned: number;
          in_progress: number;
          completed: number;
          cancelled: number;
          on_hold: number;
          steps?: Record<string, number>;
        };
        pagination: {
          page: number;
          limit: number;
          total: number;
        };
      }>,
      ProcessingCandidatesQuery
    >({
      query: (params) => ({
        url: "/processing/all-candidates",
        params: params ?? undefined,
      }),
      providesTags: (result) =>
        result
          ? [{ type: "ProcessingSummary", id: "LIST" }]
          : [{ type: "ProcessingSummary", id: "LIST" }],
    }),

    // Admin endpoint: GET /processing/admin/all-candidates
    getAllProcessingCandidatesAdmin: builder.query<
      ApiResponse<{
        candidates: ProcessingCandidate[];
        counts: {
          all: number;
          assigned: number;
          in_progress: number;
          completed: number;
          cancelled: number;
          on_hold: number;
          visa_stamped?: number;
          pendingStatusChangeRequests?: number;
          steps?: Record<string, number>;
        };
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages?: number;
        };
      }>,
      ProcessingCandidatesQuery & { filterType?: "visa_stamped" | "total_processing" | "awaiting_requests" }
    >({
      query: (params) => ({
        url: "/processing/admin/all-candidates",
        params: params ?? undefined,
      }),
      providesTags: () => [{ type: "ProcessingSummary", id: "LIST" }],
    }),
    getCandidatesToTransfer: builder.query<
      ApiResponse<{
        interviews: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>,
      ProcessingCandidatesQuery | void
    >({
      query: (params) => ({
        url: "/processing/candidates-to-transfer",
        params: params ?? undefined,
      }),
      providesTags: (result) =>
        result
          ? [{ type: "ProcessingSummary", id: "LIST" }]
          : [{ type: "ProcessingSummary", id: "LIST" }],
    }),
    getProcessingDetail: builder.query<
      ApiResponse<{
        candidate: ProcessingCandidateSummary["candidate"];
        project: ProcessingCandidateSummary["project"];
        steps: ProcessingStep[];
      }>,
      string
    >({
      query: (candidateProjectMapId) => ({
        url: `/processing/${candidateProjectMapId}`,
      }),
      providesTags: (_, __, id) => [{ type: "Processing", id }],
    }),
    getProcessingHistory: builder.query<
      ApiResponse<ProcessingHistoryEntry[]>,
      string
    >({
      query: (candidateProjectMapId) => ({
        url: `/processing/${candidateProjectMapId}/history`,
      }),
      providesTags: (_, __, id) => [{ type: "ProcessingHistory", id }],
    }),
    updateProcessingStep: builder.mutation<
      ApiResponse<ProcessingStep>,
      {
        candidateProjectMapId?: string;
        stepKey?: ProcessingStepKey;
        stepId?: string;
        status?: ProcessingStepStatus;
        notes?: string;
        notApplicableReason?: string;
      }
    >({
      query: ({ candidateProjectMapId, stepKey, stepId, ...body }) => {
        if (candidateProjectMapId && stepKey && typeof stepKey === 'string') {
          const normalizedStepKey = stepKey.toLowerCase();
          return {
            url: `/processing/${candidateProjectMapId}/steps/${normalizedStepKey}`,
            method: "PATCH",
            body,
          };
        }

        if (stepId) {
          return {
            url: `/processing/steps/${stepId}/status`,
            method: "POST",
            body,
          };
        }

        throw new Error('Missing candidateProjectMapId+stepKey or stepId for updateProcessingStep');
      },
      invalidatesTags: (_, __, { candidateProjectMapId }) => [
        { type: "Processing", id: candidateProjectMapId },
        { type: "ProcessingHistory", id: candidateProjectMapId },
        "ProcessingSummary",
      ],
    }),
    transferToProcessing: builder.mutation<
      ApiResponse<any>,
      {
        candidateIds: string[];
        projectId: string;
        roleCatalogId: string;
        assignedProcessingTeamUserId: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/processing/transfer-to-processing",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProcessingSummary"],
    }),
    getCandidateHistory: builder.query<
      ApiResponse<{
        id: string;
        candidateId: string;
        projectId: string;
        roleCatalogId: string;
        processingStatus: string;
        candidate: {
          firstName: string;
          lastName: string;
          email?: string;
        };
        project: {
          title: string;
        };
        role: {
          designation: string;
        };
        assignedTo?: {
          id: string;
          name: string;
        };
        history: Array<{
          id: string;
          status: string;
          notes?: string;
          createdAt: string;
          changedBy?: {
            id: string;
            name: string;
          };
          recruiter?: {
            id: string;
            name: string;
          };
        }>;
      }>,
      { candidateId: string; projectId: string; roleCatalogId: string }
    >({
      query: ({ candidateId, projectId, roleCatalogId }) => ({
        url: `/processing/candidate-history/${candidateId}/${projectId}/${roleCatalogId}`,
      }),
      providesTags: (_, __, { candidateId, projectId, roleCatalogId }) => [
        { type: "ProcessingHistory", id: `${candidateId}-${projectId}-${roleCatalogId}` },
      ],
    }),
    getCandidateProcessingDetails: builder.query<
      ApiResponse<{
        id: string;
        candidateId: string;
        projectId: string;
        roleNeededId: string;
        assignedProcessingTeamUserId: string;
        processingStatus: string;
        step?: string | null;
        notes?: string;
        createdAt: string;
        updatedAt: string;
        candidate: {
          id: string;
          firstName: string;
          lastName: string;
          candidateCode?: string | null;
          email?: string;
          mobileNumber?: string;
          countryCode?: string;
          dateOfBirth?: string;
          gender?: string;
          source?: string;
          totalExperience?: number;
          currentEmployer?: string | null;
          currentRole?: string | null;
          highestEducation?: string | null;
          university?: string | null;
          agent?: {
            id: string;
            name: string;
            agentType?: string | null;
          } | null;
          qualifications: Array<{
            id: string;
            candidateId: string;
            qualificationId: string;
            university?: string;
            graduationYear?: number;
            gpa?: number;
            isCompleted?: boolean;
            notes?: string;
            qualification?: {
              id: string;
              name: string;
              shortName?: string;
              level?: string;
              field?: string;
              program?: string;
              description?: string;
              isActive?: boolean;
            };
          }>;
        };
        project: {
          id: string;
          title: string;
          country?: string | {
            code: string;
            name: string;
            region?: string;
            flag?: string;
            flagName?: string;
          } | null;
        };
        role: {
          id: string;
          projectId: string;
          roleCatalogId?: string;
          designation: string;
          quantity?: number;
          priority?: string;
          minExperience?: number;
          maxExperience?: number;
          skills?: any[];
          employmentType?: string;
          visaType?: string;
          backgroundCheckRequired?: boolean;
          drugScreeningRequired?: boolean;
          genderRequirement?: string;
          minAge?: number;
          maxAge?: number;
          accommodation?: boolean;
          food?: boolean;
          transport?: boolean;
          salaryRange?: string | null;
          roleCatalog?: {
            id: string;
            name: string;
            label: string;
            shortName?: string;
            description?: string;
            isActive?: boolean;
          };
        };
        assignedTo?: {
          id: string;
          name: string;
          email?: string;
          mobileNumber?: string;
        };
        fileNumber?: string;
        candidateProjectMap: {
          id: string;
          candidateId: string;
          projectId: string;
          roleNeededId: string;
          notes?: string;
          recruiterId?: string;
          recruiter?: {
            id: string;
            name: string;
            email?: string;
          };
          mainStatus?: {
            id: string;
            name: string;
            label: string;
            color?: string;
            order?: number;
          };
          subStatus?: {
            id: string;
            name: string;
            label: string;
            color?: string;
            order?: number;
          };
        };
        originalDocumentCollection?: {
          id: string;
          status: string;
          lockerFileNumber?: string | null;
          mergedDocument?: {
            id: string;
            fileName: string;
            fileUrl: string;
            mimeType?: string;
          } | null;
        } | null;
        documentReceivedStep?: {
          status: string;
          templateKey: string;
        } | null;
      }>,
      string
    >({
      query: (processingId) => ({
        url: `/processing/candidate-processing-details/${processingId}`,
      }),
      providesTags: (_, __, id) => [
        { type: "Processing", id },
        { type: "ProcessingDetails", id },
      ],
    }),

    updateProcessingCandidate: builder.mutation<
      ApiResponse<ProcessingCandidate>,
      { id: string; fileNumber: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/processing/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Processing", id }, "ProcessingSummary"],
    }),

    // New: Paginated candidate documents (all project documents)
    getCandidateDocuments: builder.query<
      ApiResponse<Paginated<{
        id: string | null;
        candidateProjectMapId: string | null;
        documentId: string;
        roleCatalogId?: string | null;
        status: string;
        offerLetterReceivedAt?: string | null;
        notes?: string | null;
        createdAt: string;
        updatedAt: string;
        document: {
          id: string;
          candidateId: string;
          docType: string;
          fileName: string;
          fileUrl: string;
          uploadedBy?: string;
          uploadedByUser?: { id: string; name: string; email?: string } | null;
          verifiedBy?: string | null;
          status: string;
          createdAt: string;
          updatedAt: string;
          fileSize?: number;
          mimeType?: string;
          roleCatalogId?: string | null;
          verifiedAt?: string | null;
        };
      }>>,
      { processingId: string; page?: number; limit?: number; search?: string }
    >({
      query: ({ processingId, page = 1, limit = 20, search }) => ({
        url: `/processing/candidate/${processingId}/all-project-documents`,
        params: { page, limit, search },
      }),
      providesTags: (_result, _error, { processingId }) => [
        { type: "ProcessingDocuments", id: processingId },
      ],
    }),

    // New: Paginated processing history for a processing candidate
    getCandidateHistoryPaginated: builder.query<
      ApiResponse<Paginated<{
        id: string;
        processingCandidateId: string;
        status: string;
        step: string;
        changedById?: string;
        recruiterId?: string;
        notes?: string | null;
        createdAt: string;
        changedBy?: { id: string; name: string };
        recruiter?: { id: string; name: string };
        assignedTo?: { id: string; name: string } | null;
      }>>,
      { processingId: string; page?: number; limit?: number; search?: string }
    >({
      query: ({ processingId, page = 1, limit = 20, search }) => ({
        url: `/processing/candidate/${processingId}/history`,
        params: { page, limit, search },
      }),
      providesTags: (_result, _error, { processingId }) => [
        { type: "ProcessingHistory", id: processingId },
      ],
    }),

    getDocumentCollectionHistoryPaginated: builder.query<
      ApiResponse<Paginated<{
        id: string;
        eventNumber: number;
        collectionType: string;
        collectionTypeLabel: string;
        sourceDetail: string;
        documentCount: number;
        lockerFileNumber: string | null;
        collectionStatus: string;
        collectedBy: { id: string; name: string } | null;
        collectedAt: string;
        hasMergedScan: boolean;
        mergedFileName: string | null;
      }>>,
      { processingId: string; page?: number; limit?: number }
    >({
      query: ({ processingId, page = 1, limit = 10 }) => ({
        url: `/processing/candidate/${processingId}/document-collection-history`,
        params: { page, limit },
      }),
      providesTags: (_result, _error, { processingId }) => [
        { type: "ProcessingHistory", id: `${processingId}-doc-collection` },
      ],
    }),

    getCourierHistoryPaginated: builder.query<
      ApiResponse<Paginated<{
        id: string;
        legNumber: number;
        purposeType: string;
        deliveryMode: string;
        status: string;
        trackingId: string | null;
        courierPartner: string | null;
        documentCount: number;
        documentTypes: string[];
        fromAddressLabel: string;
        toAddressLabel: string;
        sentAt: string | null;
        receivedAt: string | null;
        sentBy: { id: string; name: string } | null;
      }>>,
      { processingId: string; page?: number; limit?: number }
    >({
      query: ({ processingId, page = 1, limit = 10 }) => ({
        url: `/processing/candidate/${processingId}/courier-history`,
        params: { page, limit },
      }),
      providesTags: (_result, _error, { processingId }) => [
        { type: "ProcessingHistory", id: `${processingId}-courier` },
      ],
    }),

    createProcessingStatusChangeRequest: builder.mutation<
      ApiResponse<Record<string, unknown>>,
      {
        processingStepId: string;
        requestType:
          | "processing_cancel"
          | "processing_hold"
          | "processing_reactivate";
        reason: string;
      }
    >({
      query: (body) => ({
        url: "/processing/status-change-requests",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) => {
        const data = result?.data as
          | {
              processingCandidateId?: string | null;
              candidateProjectMapId?: string;
            }
          | undefined;

        return buildProcessingStatusChangeInvalidationTags({
          processingCandidateId: data?.processingCandidateId ?? undefined,
          candidateProjectMapId: data?.candidateProjectMapId,
        });
      },
    }),

    getProcessingStatusUpdateContext: builder.query<
      ApiResponse<{
        processingStatus: string;
        anchorStepId: string;
        stepKey: string;
        stepLabel?: string;
        availableRequestTypes: Array<
          "processing_cancel" | "processing_hold" | "processing_reactivate"
        >;
      }>,
      string
    >({
      query: (processingId) => ({
        url: `/processing/${processingId}/status-update-context`,
      }),
      providesTags: (_r, _e, id) => [{ type: "ProcessingDetails", id }],
    }),

    getPendingProcessingStatusChangeRequestForCandidate: builder.query<
      ApiResponse<Record<string, unknown> | null>,
      string
    >({
      query: (processingId) => ({
        url: `/processing/${processingId}/status-change-requests/pending`,
      }),
      providesTags: (_r, _e, id) => [{ type: "ProcessingDetails", id }],
    }),

    getLatestReviewedProcessingStatusChangeRequest: builder.query<
      ApiResponse<Record<string, unknown> | null>,
      string
    >({
      query: (processingId) => ({
        url: `/processing/${processingId}/status-change-requests/latest-reviewed`,
      }),
      providesTags: (_r, _e, id) => [{ type: "ProcessingDetails", id }],
    }),
  }),
});

export const {
  useGetProcessingCandidatesQuery,
  useLazyGetProcessingCandidatesQuery,
  useGetAllProcessingCandidatesQuery,
  useLazyGetAllProcessingCandidatesQuery,
  useGetAllProcessingCandidatesAdminQuery,
  useLazyGetAllProcessingCandidatesAdminQuery,
  useGetCandidatesToTransferQuery,
  useGetProcessingDetailQuery,
  useGetProcessingHistoryQuery,
  useUpdateProcessingStepMutation,
  useTransferToProcessingMutation,
  useGetCandidateHistoryQuery,
  useGetCandidateDocumentsQuery,
  useGetCandidateHistoryPaginatedQuery,
  useGetDocumentCollectionHistoryPaginatedQuery,
  useGetCourierHistoryPaginatedQuery,
  useGetCandidateProcessingDetailsQuery,
  useCreateProcessingStatusChangeRequestMutation,
  useGetProcessingStatusUpdateContextQuery,
  useGetPendingProcessingStatusChangeRequestForCandidateQuery,
  useGetLatestReviewedProcessingStatusChangeRequestQuery,
} = processingApi;
