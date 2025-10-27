import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "@/services/baseQueryWithReauth";
import { storeTokensSecurely, clearStoredTokens } from "./authSlice";
import {
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RefreshResponse,
    UserProfileResponse,
} from "./authTypes";

/**
 * RTK Query API for Authentication
 * Handles login, logout, and token refresh securely for mobile apps
 */
export const authApi = createApi({
    reducerPath: "authApi", // unique key in the store
    baseQuery: baseQueryWithReauth, // base query with automatic token refresh
    endpoints: (builder) => ({
        // ------------------ LOGIN ------------------
        login: builder.mutation<LoginResponse, LoginRequest>({
            query: (credentials) => ({
                url: "/auth/mobile-login",
                method: "POST",
                body: credentials,
            }),

            // Runs automatically after the query is triggered
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                try {
                    // Wait for login API to finish
                    const { data } = await queryFulfilled;
                    if (data.success && data.data) {
                        // Store tokens securely (Keychain / EncryptedStorage)
                        dispatch(
                            storeTokensSecurely({
                                user: data.data.user,
                                accessToken: data.data.accessToken,
                                refreshToken: data.data.refreshToken,
                            })
                        );
                    }
                } catch (error) {
                    console.error("❌ Login failed:", error);
                }
            },
        }),

        // ------------------ LOGOUT ------------------
        logout: builder.mutation<LogoutResponse, void>({
            query: () => ({
                url: "/auth/mobile-logout",
                method: "POST",
            }),

            // Whether the logout succeeds or fails, clear stored tokens
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                } catch (error) {
                    console.warn("⚠️ Logout request failed:", error);
                } finally {
                    dispatch(clearStoredTokens());
                }
            },
        }),

        // ------------------ REFRESH TOKEN ------------------
        refreshToken: builder.mutation<RefreshResponse, void>({
            query: () => ({
                url: "/auth/mobile-refresh",
                method: "POST",
            }),
        }),

        // ---------------------- USER PROFILE--------------------------
        me: builder.query<UserProfileResponse, void>({
            query: () => ({
                url: "/auth/me",
                method: "GET",
            }),
        }),

    }),
});

// Export hooks for use in components
export const {
    useLoginMutation,
    useLogoutMutation,
    useRefreshTokenMutation,
    useMeQuery,
} = authApi;
