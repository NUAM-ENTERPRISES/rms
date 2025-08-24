import {
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/app/store";
import { setCredentials, clearCredentials } from "@/features/auth/authSlice";

interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      roles: string[];
      permissions: string[];
    };
  };
  message: string;
}

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1",
  credentials: "include", // REQUIRED for httpOnly cookie
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to get a new token
    const refreshResult = await baseQuery(
      {
        url: "/auth/refresh",
        method: "POST",
      },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      // Store the new token and user data
      const refreshData = refreshResult.data as RefreshResponse;
      const at = refreshData.data.accessToken;
      const user = refreshData.data.user;
      
      if (at && user) {
        api.dispatch(
          setCredentials({
            user: user,
            accessToken: at,
            refreshToken: refreshData.data.refreshToken,
          })
        );

        // Retry the original query
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(clearCredentials());
      }
    } else {
      // Refresh failed, logout user
      api.dispatch(clearCredentials());
    }
  }

  return result;
};
