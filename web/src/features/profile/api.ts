import { baseApi } from "@/app/api/baseApi";
import type { SessionAvailability } from "@/shared/types/session-availability";

// Profile interfaces
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  mobileNumber: string;
  countryCode: string;
  dateOfBirth?: string;
  profileImage?: string;
  location?: string;
  timezone?: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
  lastLogin: string;
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    theme: string;
    language: string;
  };
  stats: {
    candidatesManaged: number;
    projectsCreated: number;
    documentsVerified: number;
  };
}

export interface LoginSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  loginAt: string;
  lastActivityAt?: string;
  isActive: boolean;
  isCurrent: boolean;
  availability?: SessionAvailability;
  availabilityUpdatedAt?: string | null;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  mobileNumber?: string;
  countryCode?: string;
  dateOfBirth?: string;
  location?: string;
  timezone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Profile API endpoints
export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<{ success: boolean; data: UserProfile }, void>({
      query: () => "/users/profile",
      providesTags: ["User"],
    }),

    getSessions: builder.query<{ success: boolean; data: LoginSession[] }, void>({
      query: () => "/users/profile/sessions",
      providesTags: ["User"],
    }),

    setSessionAvailability: builder.mutation<
      {
        success: boolean;
        data: { availability: SessionAvailability };
        message: string;
      },
      { availability: SessionAvailability }
    >({
      query: (body) => ({
        url: "/users/profile/session/availability",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),

    updateProfile: builder.mutation<
      { success: boolean; data: UserProfile; message: string },
      UpdateProfileRequest
    >({
      query: (profileData) => ({
        url: "/users/profile",
        method: "PUT",
        body: profileData,
      }),
      invalidatesTags: ["User"],
    }),

    changePassword: builder.mutation<
      { success: boolean; message: string },
      ChangePasswordRequest
    >({
      query: (passwordData) => ({
        url: "/users/profile/change-password",
        method: "POST",
        body: passwordData,
      }),
    }),

    deleteAccount: builder.mutation<
      { success: boolean; message: string },
      void
    >({
      query: () => ({
        url: "/users/profile",
        method: "DELETE",
      }),
    }),

    uploadProfileImage: builder.mutation<
      { success: boolean; data: { profileImage: string }; message: string },
      { profileImage: string }
    >({
      query: (imageData) => ({
        url: "/users/profile/upload-image",
        method: "POST",
        body: imageData,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useGetSessionsQuery,
  useSetSessionAvailabilityMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useUploadProfileImageMutation,
} = profileApi;
