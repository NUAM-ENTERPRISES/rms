import { baseApi } from "@/app/api/baseApi";

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface UploadResponse {
  success: boolean;
  data: UploadResult;
  message: string;
}

// Offer letter upload returns a richer payload: both the stored document and its verification metadata
export interface OfferLetterDocument extends UploadResult {
  id: string;
  candidateId: string;
  docType: string;
  uploadedBy: string;
  verifiedBy: string | null;
  status: "pending" | "verified" | "rejected";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  fileSize: number;
  mimeType: string;
  roleCatalogId: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  verifiedAt: string | null;
}

export interface OfferLetterVerification {
  id: string;
  candidateProjectMapId: string;
  documentId: string;
  roleCatalogId: string;
  status: "pending" | "verified" | "rejected";
  notes: string | null;
  rejectionReason: string | null;
  resubmissionRequested: boolean;
}

export interface OfferLetterUploadData {
  document: OfferLetterDocument;
  verification: OfferLetterVerification;
}

interface OfferLetterUploadResponse {
  success: boolean;
  data: OfferLetterUploadData;
  message: string;
}

export const uploadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadUserProfileImage: builder.mutation<
      UploadResponse,
      { userId: string; file: File }
    >({
      query: ({ userId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/upload/profile-image/user/${userId}`,
          method: "POST",
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: ["User"],
    }),

    uploadCandidateProfileImage: builder.mutation<
      UploadResponse,
      { candidateId: string; file: File }
    >({
      query: ({ candidateId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/upload/profile-image/candidate/${candidateId}`,
          method: "POST",
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: ["Candidate"],
    }),

    uploadDocument: builder.mutation<
      UploadResponse,
      { candidateId: string; file: File; docType: string }
    >({
      query: ({ candidateId, file, docType }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("docType", docType);
        return {
          url: `/upload/document/${candidateId}`,
          method: "POST",
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: ["Document", "Candidate"],
    }),

    uploadResume: builder.mutation<
      UploadResponse,
      { candidateId: string; file: File; roleCatalogId?: string }
    >({
      query: ({ candidateId, file, roleCatalogId }) => {
        const formData = new FormData();
        formData.append("file", file);
        if (roleCatalogId) {
          formData.append("roleCatalogId", roleCatalogId);
        }
        return {
          url: `/upload/resume/${candidateId}`,
          method: "POST",
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: ["Candidate"],
    }),

    uploadOfferLetter: builder.mutation<
      OfferLetterUploadResponse,
      {
        candidateId: string;
        file: File;
        projectId: string;
        roleCatalogId: string;
        notes?: string;
      }
    >({
      query: ({ candidateId, file, projectId, roleCatalogId, notes }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);
        formData.append("roleCatalogId", roleCatalogId);
        if (notes) {
          formData.append("notes", notes);
        }
        return {
          url: `/upload/offer-letter/${candidateId}`,
          method: "POST",
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: ["Candidate", "Document", "Interview", "ProcessingSummary"],
    }),

    deleteFile: builder.mutation<{ success: boolean; message: string }, string>(
      {
        query: (fileUrl) => ({
          url: "/upload/file",
          method: "DELETE",
          body: { fileUrl },
        }),
        invalidatesTags: ["User", "Candidate", "Document"],
      }
    ),
  }),
});

export const {
  useUploadUserProfileImageMutation,
  useUploadCandidateProfileImageMutation,
  useUploadDocumentMutation,
  useUploadResumeMutation,
  useUploadOfferLetterMutation,
  useDeleteFileMutation,
} = uploadApi;
