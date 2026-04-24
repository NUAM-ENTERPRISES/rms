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
  storeTokensSecurely,
  clearStoredTokens,
} from "@/features/auth/authSlice";

/**
 * Refresh API response type
 */
interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
  message: string;
}

/**
 * Detect Android Emulator
 */
const isAndroidEmulator = () => {
  if (Platform.OS !== "android") return false;

  const fingerprint = Platform.constants?.Fingerprint || "";
  return fingerprint.toLowerCase().includes("generic");
};

/**
 * Base URL handler
 */
const getBaseUrl = () => {
  // 1️⃣ ENV (highest priority)
  if (process.env.API_URL?.trim()) {
    console.log("🌐 Using ENV API_URL:", process.env.API_URL);
    return process.env.API_URL;
  }

  // 2️⃣ DEV mode handling
  if (__DEV__) {
    if (isAndroidEmulator()) {
      const EMULATOR_URL = "http://10.0.2.2:3000/api/v1";
      console.log("📱 Using Android Emulator URL:", EMULATOR_URL);
      return EMULATOR_URL;
    }

    const DEVICE_URL = "http://192.168.1.2:3000/api/v1";
    console.log("📱 Using Real Device URL:", DEVICE_URL);
    return DEVICE_URL;
  }

  // 3️⃣ Production fallback
  const PROD_URL = "https://api.yourdomain.com/api/v1";
  return PROD_URL;
};

/**
 * Base Query
 */
const baseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  timeout: 15000,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

/**
 * Base Query with Auto Refresh Token
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // Debug
  if (result.error) {
    console.tron?.error("❌ API ERROR:", result.error);
  }

  // 🔁 Handle 401
  if (result.error && result.error.status === 401) {
    const state = api.getState() as RootState;
    const refreshToken = state.auth.refreshToken;

    if (!refreshToken) {
      console.log("❌ No refresh token → logout");
      api.dispatch(clearStoredTokens());
      return result;
    }

    console.log("🔄 Attempting token refresh...");

    const refreshResult = await baseQuery(
      {
        url: "/auth/mobile-refresh",
        method: "POST",
        body: { refreshToken },
      },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      const refreshData = refreshResult.data as RefreshResponse;

      const { accessToken, refreshToken: newRefreshToken, user } =
        refreshData.data;

      if (accessToken && user) {
        console.log("✅ Token refreshed");

        api.dispatch(
          storeTokensSecurely({
            user,
            accessToken,
            refreshToken: newRefreshToken,
          })
        );

        // retry original request
        result = await baseQuery(args, api, extraOptions);
      } else {
        console.log("❌ Invalid refresh data");
        api.dispatch(clearStoredTokens());
      }
    } else {
      console.log("❌ Refresh failed");
      api.dispatch(clearStoredTokens());
    }
  }

  return result;
};