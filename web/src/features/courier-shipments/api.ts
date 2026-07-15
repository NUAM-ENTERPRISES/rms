import { baseApi } from "@/app/api/baseApi";
import type {
  AddressSnapshot,
  AttestationEligibleDocument,
  AttestationListPagination,
  AttestationProjectOption,
  CollectionDocsResponse,
  CourierAttestationUpload,
  CourierCandidateGroup,
  CourierShipment,
  CourierShipmentStats,
  CreateShipmentPayload,
  DispatchShipmentPayload,
  ListShipmentsParams,
  MarkHandoverPayload,
  MarkReceivedPayload,
  PipelineSummary,
  UpdateCourierTrackingPayload,
} from "./types";

const candidateTag = (candidateId: string) => ({
  type: "CourierShipment" as const,
  id: `candidate-${candidateId}`,
});

export const courierShipmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCourierShipmentStats: builder.query<
      { success: boolean; data: CourierShipmentStats },
      void
    >({
      query: () => "/courier-shipments/stats",
      providesTags: [{ type: "CourierShipment", id: "STATS" }],
    }),

    getCourierCandidateGroups: builder.query<
      {
        success: boolean;
        data: {
          groups: CourierCandidateGroup[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        };
      },
      ListShipmentsParams | void
    >({
      query: (params) => ({
        url: "/courier-shipments/candidate-groups",
        params: params ?? {},
      }),
      providesTags: [{ type: "CourierShipment", id: "CANDIDATE_GROUPS" }],
    }),

    getCourierShipments: builder.query<
      {
        success: boolean;
        data: {
          shipments: CourierShipment[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        };
      },
      ListShipmentsParams | void
    >({
      query: (params) => ({
        url: "/courier-shipments",
        params: params ?? {},
      }),
      providesTags: (result) =>
        result?.data?.shipments
          ? [
              ...result.data.shipments.map((s) => ({
                type: "CourierShipment" as const,
                id: s.id,
              })),
              { type: "CourierShipment", id: "LIST" },
            ]
          : [{ type: "CourierShipment", id: "LIST" }],
    }),

    getCourierShipment: builder.query<
      { success: boolean; data: CourierShipment },
      string
    >({
      query: (id) => `/courier-shipments/${id}`,
      providesTags: (_result, _error, id) => [
        { type: "CourierShipment", id },
      ],
    }),

    getCandidateCourierShipments: builder.query<
      { success: boolean; data: CourierShipment[] },
      string
    >({
      query: (candidateId) =>
        `/courier-shipments/candidates/${candidateId}`,
      providesTags: (_result, _error, candidateId) => [
        candidateTag(candidateId),
      ],
    }),

    getCandidateCourierPipeline: builder.query<
      { success: boolean; data: PipelineSummary },
      string
    >({
      query: (candidateId) =>
        `/courier-shipments/candidates/${candidateId}/pipeline`,
      providesTags: (_result, _error, candidateId) => [
        candidateTag(candidateId),
        { type: "CourierShipment", id: `pipeline-${candidateId}` },
      ],
    }),

    getCourierOfficeAddresses: builder.query<
      { success: boolean; data: Record<string, AddressSnapshot & { label?: string }> },
      void
    >({
      query: () => "/courier-shipments/office-addresses",
      providesTags: [{ type: "CourierOfficeAddresses", id: "LIST" }],
    }),

    getCourierCollectionDocs: builder.query<
      { success: boolean; data: CollectionDocsResponse },
      string
    >({
      query: (candidateId) =>
        `/courier-shipments/candidates/${candidateId}/collection-docs`,
      providesTags: (_result, _error, candidateId) => [
        { type: "CourierShipment", id: `docs-${candidateId}` },
      ],
    }),

    createCourierShipment: builder.mutation<
      { success: boolean; data: CourierShipment },
      CreateShipmentPayload
    >({
      query: (body) => ({
        url: "/courier-shipments",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CourierShipment", id: "LIST" },
        { type: "CourierShipment", id: "CANDIDATE_GROUPS" },
        { type: "CourierShipment", id: "STATS" },
        candidateTag(arg.candidateId),
        { type: "Candidate", id: arg.candidateId },
        "Candidate",
      ],
    }),

    dispatchCourierShipment: builder.mutation<
      { success: boolean; data: CourierShipment },
      { id: string; body: DispatchShipmentPayload }
    >({
      query: ({ id, body }) => ({
        url: `/courier-shipments/${id}/dispatch`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, _error, { id }) => [
        { type: "CourierShipment", id },
        { type: "CourierShipment", id: "LIST" },
        { type: "CourierShipment", id: "CANDIDATE_GROUPS" },
        { type: "CourierShipment", id: "STATS" },
        ...(result?.data?.candidateId
          ? [candidateTag(result.data.candidateId)]
          : []),
      ],
    }),

    handoverCourierShipment: builder.mutation<
      { success: boolean; data: CourierShipment },
      { id: string; body: MarkHandoverPayload }
    >({
      query: ({ id, body }) => ({
        url: `/courier-shipments/${id}/handover`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, _error, { id }) => [
        { type: "CourierShipment", id },
        { type: "CourierShipment", id: "LIST" },
        { type: "CourierShipment", id: "CANDIDATE_GROUPS" },
        { type: "CourierShipment", id: "STATS" },
        ...(result?.data?.candidateId
          ? [candidateTag(result.data.candidateId)]
          : []),
      ],
    }),

    receiveCourierShipment: builder.mutation<
      { success: boolean; data: CourierShipment },
      { id: string; body: MarkReceivedPayload }
    >({
      query: ({ id, body }) => ({
        url: `/courier-shipments/${id}/receive`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, _error, { id }) => [
        { type: "CourierShipment", id },
        { type: "CourierShipment", id: "LIST" },
        { type: "CourierShipment", id: "CANDIDATE_GROUPS" },
        { type: "CourierShipment", id: "STATS" },
        ...(result?.data?.candidateId
          ? [candidateTag(result.data.candidateId)]
          : []),
      ],
    }),

    updateCourierTracking: builder.mutation<
      { success: boolean; data: CourierShipment },
      { id: string; body: UpdateCourierTrackingPayload }
    >({
      query: ({ id, body }) => ({
        url: `/courier-shipments/${id}/courier-tracking`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, _error, { id }) => [
        { type: "CourierShipment", id },
        { type: "CourierShipment", id: "LIST" },
        { type: "CourierShipment", id: "CANDIDATE_GROUPS" },
        { type: "CourierShipment", id: "STATS" },
        ...(result?.data?.candidateId
          ? [candidateTag(result.data.candidateId)]
          : []),
      ],
    }),

    getCourierAttestationProjects: builder.query<
      {
        success: boolean;
        data: {
          shipmentId: string;
          shipmentStatus: string;
          defaultProjectId: string | null;
          projects: AttestationProjectOption[];
          pagination: AttestationListPagination;
        };
      },
      { id: string; page?: number; limit?: number }
    >({
      query: ({ id, page = 1, limit = 10 }) => ({
        url: `/courier-shipments/${id}/attestation-projects`,
        params: { page, limit },
      }),
      providesTags: (_result, _error, { id }) => [
        { type: "CourierShipment", id: `${id}-attestation-projects` },
      ],
    }),

    getCourierAttestationEligibility: builder.query<
      {
        success: boolean;
        data: {
          shipmentId: string;
          projectId: string;
          processingCandidateId: string;
          countryCode: string;
          projectTitle: string;
          eligibleDocuments: AttestationEligibleDocument[];
        };
      },
      { id: string; projectId: string }
    >({
      query: ({ id, projectId }) => ({
        url: `/courier-shipments/${id}/attestation-eligibility`,
        params: { projectId },
      }),
      providesTags: (_result, _error, { id, projectId }) => [
        { type: "CourierShipment", id: `${id}-attestation-eligibility-${projectId}` },
      ],
    }),

    getCourierAttestationUploads: builder.query<
      {
        success: boolean;
        data: {
          uploads: CourierAttestationUpload[];
          pagination: AttestationListPagination;
        };
      },
      { id: string; projectId: string; page?: number; limit?: number }
    >({
      query: ({ id, projectId, page = 1, limit = 10 }) => ({
        url: `/courier-shipments/${id}/attestation-uploads`,
        params: { projectId, page, limit },
      }),
      providesTags: (_result, _error, { id, projectId }) => [
        {
          type: "CourierShipment",
          id: `${id}-attestation-uploads-${projectId}`,
        },
      ],
    }),

    uploadCourierAttestation: builder.mutation<
      { success: boolean; data: CourierAttestationUpload; message?: string },
      {
        id: string;
        projectId: string;
        docType: string;
        remarks?: string;
        file: File;
      }
    >({
      query: ({ id, projectId, docType, remarks, file }) => {
        const formData = new FormData();
        formData.append("projectId", projectId);
        formData.append("docType", docType);
        if (remarks?.trim()) {
          formData.append("remarks", remarks.trim());
        }
        formData.append("file", file);
        return {
          url: `/courier-shipments/${id}/attestation-uploads`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { id, projectId }) => [
        { type: "CourierShipment", id },
        { type: "CourierShipment", id: `${id}-attestation-uploads` },
        { type: "CourierShipment", id: `${id}-attestation-uploads-${projectId}` },
        {
          type: "CourierShipment",
          id: `${id}-attestation-eligibility-${projectId}`,
        },
        { type: "CourierShipment", id: `${id}-attestation-projects` },
      ],
    }),

    uploadCourierAttestationMerged: builder.mutation<
      { success: boolean; data: CourierAttestationUpload[]; message?: string },
      {
        id: string;
        projectId: string;
        docTypes: string[];
        remarks?: string;
        file: File;
      }
    >({
      query: ({ id, projectId, docTypes, remarks, file }) => {
        const formData = new FormData();
        formData.append("projectId", projectId);
        docTypes.forEach((docType) => formData.append("docTypes", docType));
        if (remarks?.trim()) {
          formData.append("remarks", remarks.trim());
        }
        formData.append("file", file);
        return {
          url: `/courier-shipments/${id}/attestation-uploads/merged`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { id, projectId }) => [
        { type: "CourierShipment", id },
        { type: "CourierShipment", id: `${id}-attestation-uploads` },
        { type: "CourierShipment", id: `${id}-attestation-uploads-${projectId}` },
        {
          type: "CourierShipment",
          id: `${id}-attestation-eligibility-${projectId}`,
        },
        { type: "CourierShipment", id: `${id}-attestation-projects` },
      ],
    }),

    exportCourierShipments: builder.query<string, ListShipmentsParams | void>({
      query: (params) => ({
        url: "/courier-shipments/export",
        params: params ?? {},
        responseHandler: (response) => response.text(),
      }),
    }),
  }),
});

export const {
  useGetCourierShipmentStatsQuery,
  useGetCourierCandidateGroupsQuery,
  useGetCourierShipmentsQuery,
  useGetCourierShipmentQuery,
  useGetCandidateCourierShipmentsQuery,
  useGetCandidateCourierPipelineQuery,
  useGetCourierOfficeAddressesQuery,
  useGetCourierCollectionDocsQuery,
  useCreateCourierShipmentMutation,
  useDispatchCourierShipmentMutation,
  useHandoverCourierShipmentMutation,
  useReceiveCourierShipmentMutation,
  useUpdateCourierTrackingMutation,
  useGetCourierAttestationProjectsQuery,
  useGetCourierAttestationEligibilityQuery,
  useGetCourierAttestationUploadsQuery,
  useUploadCourierAttestationMutation,
  useUploadCourierAttestationMergedMutation,
  useLazyExportCourierShipmentsQuery,
} = courierShipmentsApi;
