import {
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { Platform } from "react-native";
import type { RootState } from "@/store/store";
import { User } from "@/features/auth/authTypes";
import { 
  setCredentials, 
  clearCredentials, 
  storeTokensSecurely, 
  clearStoredTokens,
  updateStoredAccessToken 
} from "@/features/auth/authSlice";

interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
  message: string;
}

// Use 10.0.2.2 for Android emulator to access host's localhost
const getBaseUrl = () => {
  if (process.env.API_URL) return process.env.API_URL;
  return Platform.OS === 'android' 
    ? "http://10.0.2.2:3000/api/v1" 
    : "http://localhost:3000/api/v1";
};

const baseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  credentials: "include", // only if your backend uses httpOnly cookies
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
    // Get current refresh token from state
    const state = api.getState() as RootState;
    const refreshToken = state.auth.refreshToken;
    
    if (!refreshToken) {
      // No refresh token available - clear tokens and redirect to login
      console.log('❌ No refresh token available, redirecting to login');
      api.dispatch(clearStoredTokens());
      return result;
    }

    // Try to refresh token with the current refresh token
    const refreshResult = await baseQuery(
      { 
        url: "/auth/mobile-refresh", 
        method: "POST",
        body: { refreshToken } // Send refresh token in request body
      },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      const refreshData = refreshResult.data as RefreshResponse;
      console.log('✅ Token refresh successful');
      const at = refreshData.data.accessToken;
      const user = refreshData.data.user;

      if (at && user) {
        // Store tokens securely and update Redux state
        api.dispatch(
          storeTokensSecurely({
            user,
            accessToken: at,
            refreshToken: refreshData.data.refreshToken,
          })
        );

        // retry original query
        result = await baseQuery(args, api, extraOptions);
      } else {
        console.log('❌ Invalid refresh response data');
        api.dispatch(clearStoredTokens());
      }
    } else {
      console.log('❌ Token refresh failed, clearing tokens');
      api.dispatch(clearStoredTokens());
    }
  }

  return result;
};
