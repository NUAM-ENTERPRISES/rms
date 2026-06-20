import { baseApi } from "@/app/api/baseApi";
import type { RootState } from "@/app/store";
import {
  prefersDirectSpacesUpload,
  putFileToPresignedUrl,
  uploadIntroductionVideoViaApi,
} from "./uploadToSpaces";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
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

async function performLegacyIntroductionVideoUpload(
  api: BaseQueryApi,
  args: PresignedIntroductionVideoUploadArgs,
) {
  const state = api.getState() as RootState;

  try {
    const data = await uploadIntroductionVideoViaApi({
      apiBaseUrl: import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1",
      accessToken: state.auth.accessToken,
      candidateId: args.candidateId,
      file: args.file,
      remarks: args.remarks,
      projectId: args.projectId,
      mode: args.mode,
      onProgress: args.onProgress,
    });

    return { data };
  } catch (error) {
    if (error && typeof error === "object" && "status" in error) {
      return {
        error: {
          status: (error as { status: number | string }).status,
          data: (error as { data?: unknown }).data,
        } as FetchBaseQueryError,
      };
    }

    return {
      error: {
        status: "CUSTOM_ERROR",
        error: error instanceof Error ? error.message : "Upload failed",
      } as FetchBaseQueryError,
    };
  }
}

async function performPresignedIntroductionVideoUpload(
  fetchWithBQ: (
    arg: {
      url: string;
      method: string;
      body: Record<string, unknown>;
    },
  ) => Promise<{ data?: unknown; error?: FetchBaseQueryError }>,
  api: BaseQueryApi,
  {
    candidateId,
    file,
    remarks,
    projectId,
    mode = "upload",
    onProgress,
  }: PresignedIntroductionVideoUploadArgs,
) {
  if (!prefersDirectSpacesUpload()) {
    return performLegacyIntroductionVideoUpload(api, {
      candidateId,
      file,
      remarks,
      projectId,
      mode,
      onProgress,
    });
  }

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
  } catch {
    return performLegacyIntroductionVideoUpload(api, {
      candidateId,
      file,
      remarks,
      projectId,
      mode,
      onProgress,
    });
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
      queryFn: (args, api, _extraOptions, fetchWithBQ) =>
        performPresignedIntroductionVideoUpload(
          fetchWithBQ as (
            arg: {
              url: string;
              method: string;
              body: Record<string, unknown>;
            },
          ) => Promise<{ data?: unknown; error?: FetchBaseQueryError }>,
          api,
          args,
        ) as any,
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
      queryFn: (args, api, _extraOptions, fetchWithBQ) =>
        performPresignedIntroductionVideoUpload(
          fetchWithBQ as (
            arg: {
              url: string;
              method: string;
              body: Record<string, unknown>;
            },
          ) => Promise<{ data?: unknown; error?: FetchBaseQueryError }>,
          api,
          {
            ...args,
            mode: "upload",
          },
        ) as any,
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
      queryFn: async (args, api, _extraOptions, fetchWithBQ) =>
        performPresignedIntroductionVideoUpload(
          fetchWithBQ as (
            arg: {
              url: string;
              method: string;
              body: Record<string, unknown>;
            },
          ) => Promise<{ data?: unknown; error?: FetchBaseQueryError }>,
          api,
          {
            ...args,
            mode: "reupload",
          },
        ) as any,
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
