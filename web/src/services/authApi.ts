import { baseApi } from "@/app/api/baseApi";

interface LoginRequest {
  email: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  teamIds?: string[];
  userVersion?: number;
}

interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  message: string;
}

interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
  message: string;
}

interface MeResponse {
  success: boolean;
  data: User;
  message: string;
}

interface LogoutResponse {
  success: boolean;
  message: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials: LoginRequest) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),
    refresh: builder.mutation<RefreshTokenResponse, void>({
      query: () => ({
        url: "/auth/refresh",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),
    me: builder.query<MeResponse, void>({
      query: () => "/auth/me",
      providesTags: ["Auth"],
      keepUnusedDataFor: 600, // Keep user data for 10 minutes
    }),
    logout: builder.mutation<LogoutResponse, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshMutation,
  useMeQuery,
  useLogoutMutation,
} = authApi;
