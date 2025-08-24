import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery.ts";

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

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Auth"],
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials: LoginRequest) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    refresh: builder.mutation<RefreshTokenResponse, void>({
      query: () => ({
        url: "/auth/refresh",
        method: "POST",
      }),
    }),
    me: builder.query<MeResponse, void>({
      query: () => "/auth/me",
      providesTags: ["Auth"],
    }),
    logout: builder.mutation<LogoutResponse, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshMutation,
  useMeQuery,
  useLogoutMutation,
} = authApi;
