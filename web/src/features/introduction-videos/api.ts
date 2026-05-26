import { baseApi } from "@/app/api/baseApi";
import { putFileToPresignedUrl } from "./uploadToSpaces";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

export interface IntroductionVideoDocument {
  id: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  fileSize?: number;
  status: string;
  uploadedBy?: string;
  createdAt: string;
  remarks?: string | null;
}

export interface IntroductionVideoVerification {
  id: string;
  status: string;
  rejectionReason?: string | null;
  resubmissionRequested?: boolean;
  createdAt: string;
  updatedAt: string;
  document: IntroductionVideoDocument | null;
}

export interface CandidateIntroductionVideoItem {
  projectId: string;
  projectTitle: string;
  roleCatalogId?: string | null;
  roleLabel?: string | null;
  introductionVideoRequired: boolean;
  candidateProjectMapId: string;
  video: {
    verificationId: string;
    documentId: string;
    fileUrl: string;
    fileName: string;
    mimeType?: string;
    status: string;
    rejectionReason?: string | null;
    uploadedAt: string;
    remarks?: string | null;
  } | null;
}

export interface CandidateIntroductionVideoLibraryItem {
  documentId: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  status: string;
  uploadedAt: string;
  remarks?: string | null;
}

export interface ReusableIntroductionVideoItem {
  documentId: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  status: string;
  remarks?: string | null;
  uploadedAt: string;
  isLibrary: boolean;
  linkedProjects: Array<{ projectId: string; projectTitle: string }>;
}

export interface ListReusableIntroductionVideosArgs {
  candidateId: string;
  page?: number;
  limit?: number;
  search?: string;
  excludeProjectId?: string;
}

export interface ListCandidateIntroductionVideosArgs {
  candidateId: string;
  page?: number;
  limit?: number;
  libraryPage?: number;
  libraryLimit?: number;
  projectId?: string;
  roleCatalogId?: string;
}

export interface IntroductionVideosPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PresignedIntroductionVideoUploadArgs {
  candidateId: string;
  file: File;
  remarks?: string;
  projectId?: string;
  mode?: "upload" | "reupload";
  onProgress?: (percent: number) => void;
}

interface InitiateIntroductionVideoUploadResponse {
  success: boolean;
  data: {
    uploadUrl: string;
    storageKey: string;
    fileUrl: string;
    fileName: string;
    expiresIn: number;
  };
}

async function performPresignedIntroductionVideoUpload(
  fetchWithBQ: (arg: {
    url: string;
    method: string;
    body: Record<string, unknown>;
  }) => Promise<{ data?: unknown; error?: FetchBaseQueryError }>,
  {
    candidateId,
    file,
    remarks,
    projectId,
    mode = "upload",
    onProgress,
  }: PresignedIntroductionVideoUploadArgs,
) {
  const mimeType = file.type || "video/mp4";

  const initiateResult = await fetchWithBQ({
    url: `/candidates/${candidateId}/introduction-videos/upload/initiate`,
    method: "POST",
    body: {
      fileName: file.name,
      mimeType,
      fileSize: file.size,
      ...(remarks ? { remarks } : {}),
      ...(projectId ? { projectId, mode } : {}),
    },
  });

  if (initiateResult.error) {
    return { error: initiateResult.error };
  }

  const initiateBody = initiateResult.data as InitiateIntroductionVideoUploadResponse;

  try {
    await putFileToPresignedUrl(
      initiateBody.data.uploadUrl,
      file,
      mimeType,
      onProgress,
    );
  } catch (error) {
    return {
      error: {
        status: "CUSTOM_ERROR",
        error: error instanceof Error ? error.message : "Upload failed",
      } as FetchBaseQueryError,
    };
  }

  const confirmResult = await fetchWithBQ({
    url: `/candidates/${candidateId}/introduction-videos/upload/confirm`,
    method: "POST",
    body: {
      storageKey: initiateBody.data.storageKey,
      fileName: initiateBody.data.fileName,
      mimeType,
      fileSize: file.size,
      ...(remarks ? { remarks } : {}),
      ...(projectId ? { projectId, mode } : {}),
    },
  });

  if (confirmResult.error) {
    return { error: confirmResult.error };
  }

  return { data: confirmResult.data };
}

export const introductionVideosApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCandidateIntroductionVideos: builder.query<
      {
        success: boolean;
        data: CandidateIntroductionVideoItem[];
        library: CandidateIntroductionVideoLibraryItem[];
        libraryPagination: IntroductionVideosPagination;
        pagination: IntroductionVideosPagination;
      },
      ListCandidateIntroductionVideosArgs
    >({
      query: ({
        candidateId,
        page = 1,
        limit = 10,
        libraryPage = 1,
        libraryLimit = 10,
        projectId,
        roleCatalogId,
      }) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        params.set("libraryPage", String(libraryPage));
        params.set("libraryLimit", String(libraryLimit));
        if (projectId && projectId !== "all") {
          params.set("projectId", projectId);
        }
        if (roleCatalogId && roleCatalogId !== "all") {
          params.set("roleCatalogId", roleCatalogId);
        }
        return `/candidates/${candidateId}/introduction-videos?${params.toString()}`;
      },
      providesTags: (_result, _error, { candidateId }) => [
        { type: "IntroductionVideo", id: candidateId },
      ],
    }),
    getReusableIntroductionVideos: builder.query<
      {
        success: boolean;
        data: ReusableIntroductionVideoItem[];
        pagination: IntroductionVideosPagination;
      },
      ListReusableIntroductionVideosArgs
    >({
      query: ({
        candidateId,
        page = 1,
        limit = 10,
        search,
        excludeProjectId,
      }) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search?.trim()) {
          params.set("search", search.trim());
        }
        if (excludeProjectId) {
          params.set("excludeProjectId", excludeProjectId);
        }
        return `/candidates/${candidateId}/introduction-videos/reusable?${params.toString()}`;
      },
      providesTags: (_result, _error, { candidateId }) => [
        { type: "IntroductionVideo", id: `${candidateId}-reusable` },
      ],
    }),
    getProjectIntroductionVideo: builder.query<
      {
        success: boolean;
        data: {
          introductionVideoRequired: boolean;
          candidateProjectMapId: string;
          introductionVideo: IntroductionVideoVerification | null;
        };
      },
      { candidateId: string; projectId: string }
    >({
      query: ({ candidateId, projectId }) =>
        `/candidates/${candidateId}/projects/${projectId}/introduction-video`,
      providesTags: (_result, _error, { candidateId, projectId }) => [
        { type: "IntroductionVideo", id: `${candidateId}-${projectId}` },
        "RecruiterDocuments",
        "DocumentVerification",
      ],
    }),
    uploadCandidateIntroductionVideo: builder.mutation<
      {
        success: boolean;
        data: { document: IntroductionVideoDocument };
      },
      PresignedIntroductionVideoUploadArgs
    >({
      queryFn: (args, _api, _extraOptions, fetchWithBQ) =>
        performPresignedIntroductionVideoUpload(fetchWithBQ, args),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: "IntroductionVideo", id: candidateId },
        { type: "IntroductionVideo", id: `${candidateId}-reusable` },
        "RecruiterDocuments",
        "DocumentVerification",
        "DocumentSummary",
      ],
    }),
    uploadIntroductionVideo: builder.mutation<
      { success: boolean; data: { introductionVideo: IntroductionVideoVerification } },
      PresignedIntroductionVideoUploadArgs & { projectId: string }
    >({
      queryFn: (args, _api, _extraOptions, fetchWithBQ) =>
        performPresignedIntroductionVideoUpload(fetchWithBQ, {
          ...args,
          mode: "upload",
        }),
      invalidatesTags: (_result, _error, { candidateId, projectId }) => [
        { type: "IntroductionVideo", id: candidateId },
        { type: "IntroductionVideo", id: `${candidateId}-reusable` },
        { type: "IntroductionVideo", id: `${candidateId}-${projectId}` },
        "RecruiterDocuments",
        "DocumentVerification",
        "DocumentSummary",
      ],
    }),
    reuseIntroductionVideo: builder.mutation<
      { success: boolean; data: { introductionVideo: IntroductionVideoVerification } },
      { candidateId: string; projectId: string; documentId: string }
    >({
      query: ({ candidateId, projectId, documentId }) => ({
        url: `/candidates/${candidateId}/projects/${projectId}/introduction-video/reuse`,
        method: "POST",
        body: { documentId },
      }),
      invalidatesTags: (_result, _error, { candidateId, projectId }) => [
        { type: "IntroductionVideo", id: candidateId },
        { type: "IntroductionVideo", id: `${candidateId}-reusable` },
        { type: "IntroductionVideo", id: `${candidateId}-${projectId}` },
        "RecruiterDocuments",
        "DocumentVerification",
        "DocumentSummary",
      ],
    }),
    reuploadIntroductionVideo: builder.mutation<
      { success: boolean; data: { introductionVideo: IntroductionVideoVerification } },
      PresignedIntroductionVideoUploadArgs & { projectId: string }
    >({
      queryFn: (args, _api, _extraOptions, fetchWithBQ) =>
        performPresignedIntroductionVideoUpload(fetchWithBQ, {
          ...args,
          mode: "reupload",
        }),
      invalidatesTags: (_result, _error, { candidateId, projectId }) => [
        { type: "IntroductionVideo", id: candidateId },
        { type: "IntroductionVideo", id: `${candidateId}-reusable` },
        { type: "IntroductionVideo", id: `${candidateId}-${projectId}` },
        "RecruiterDocuments",
        "DocumentVerification",
        "DocumentSummary",
      ],
    }),
  }),
});

export const {
  useGetCandidateIntroductionVideosQuery,
  useGetReusableIntroductionVideosQuery,
  useGetProjectIntroductionVideoQuery,
  useUploadCandidateIntroductionVideoMutation,
  useUploadIntroductionVideoMutation,
  useReuseIntroductionVideoMutation,
  useReuploadIntroductionVideoMutation,
} = introductionVideosApi;
