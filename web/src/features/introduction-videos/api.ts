import { baseApi } from "@/app/api/baseApi";

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
  } | null;
}

export const introductionVideosApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCandidateIntroductionVideos: builder.query<
      { success: boolean; data: CandidateIntroductionVideoItem[] },
      string
    >({
      query: (candidateId) => `/candidates/${candidateId}/introduction-videos`,
      providesTags: (_result, _error, candidateId) => [
        { type: "IntroductionVideo", id: candidateId },
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
    uploadIntroductionVideo: builder.mutation<
      { success: boolean; data: { introductionVideo: IntroductionVideoVerification } },
      { candidateId: string; projectId: string; file: File }
    >({
      query: ({ candidateId, projectId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/candidates/${candidateId}/projects/${projectId}/introduction-video`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { candidateId, projectId }) => [
        { type: "IntroductionVideo", id: candidateId },
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
        { type: "IntroductionVideo", id: `${candidateId}-${projectId}` },
        "RecruiterDocuments",
        "DocumentVerification",
        "DocumentSummary",
      ],
    }),
    reuploadIntroductionVideo: builder.mutation<
      { success: boolean; data: { introductionVideo: IntroductionVideoVerification } },
      { candidateId: string; projectId: string; file: File }
    >({
      query: ({ candidateId, projectId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/candidates/${candidateId}/projects/${projectId}/introduction-video/reupload`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { candidateId, projectId }) => [
        { type: "IntroductionVideo", id: candidateId },
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
  useGetProjectIntroductionVideoQuery,
  useUploadIntroductionVideoMutation,
  useReuseIntroductionVideoMutation,
  useReuploadIntroductionVideoMutation,
} = introductionVideosApi;
