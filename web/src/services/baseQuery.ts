import type { BaseQueryApi } from "@reduxjs/toolkit/query";
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
    // Note: Don't set Content-Type for FormData - browser sets it automatically with boundary
    return headers;
  },
});

/**
 * One in-flight `/auth/refresh` at a time. Parallel API calls that get 401
 * otherwise each trigger their own refresh (duplicate network + race).
 */
let refreshPromise: Promise<boolean> | null = null;

/** RTK `fetchBaseQuery` expects `{}`; generics widen RTKQ callers’ argument as unknown */
function asRtKQExtras(extraOptions: unknown): object {
  return typeof extraOptions === "object" && extraOptions !== null
    ? extraOptions
    : {};
}

function getSharedRefreshPromise(
  api: BaseQueryApi,
  extraOptions: unknown,
): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async (): Promise<boolean> => {
      const refreshResult = await baseQuery(
        {
          url: "/auth/refresh",
          method: "POST",
        },
        api,
        asRtKQExtras(extraOptions),
      );

      if (refreshResult.data) {
        const refreshData = refreshResult.data as RefreshResponse;
        const at = refreshData.data.accessToken;
        const user = refreshData.data.user;

        if (at && user) {
          api.dispatch(
            setCredentials({
              user: user,
              accessToken: at,
              refreshToken: refreshData.data.refreshToken,
            }),
          );
          return true;
        }
        api.dispatch(clearCredentials());
        return false;
      }
      api.dispatch(clearCredentials());
      return false;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const extras = asRtKQExtras(extraOptions);

  let result = await baseQuery(args, api, extras);

  if (result.error && result.error.status === 401) {
    const ok = await getSharedRefreshPromise(api, extraOptions);

    if (ok) {
      result = await baseQuery(args, api, extras);
    }
  }

  return result;
};
