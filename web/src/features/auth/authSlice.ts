import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  teamIds?: string[];
  userVersion?: number;
}

export type SessionAccountStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  status: "idle" | "loading" | "authenticated" | "anonymous";
  userVersion?: number;
  /** Set by real-time socket; falls back to profile query when null. */
  sessionAccountStatus: SessionAccountStatus | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  status: "idle",
  sessionAccountStatus: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>
    ) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.userVersion = user.userVersion;
      state.isAuthenticated = true;
      state.status = "authenticated";
      state.isLoading = false;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.userVersion = undefined;
      state.sessionAccountStatus = null;
      state.isAuthenticated = false;
      state.status = "anonymous";
      state.isLoading = false;
    },
    setSessionAccountStatus: (
      state,
      action: PayloadAction<SessionAccountStatus>,
    ) => {
      state.sessionAccountStatus = action.payload;
    },
    updateUserAuthorization: (
      state,
      action: PayloadAction<{
        permissions: string[];
        roles?: string[];
        userVersion?: number;
      }>,
    ) => {
      if (!state.user) return;
      state.user.permissions = action.payload.permissions;
      if (action.payload.roles) {
        state.user.roles = action.payload.roles;
      }
      if (action.payload.userVersion !== undefined) {
        state.user.userVersion = action.payload.userVersion;
        state.userVersion = action.payload.userVersion;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      state.status = action.payload
        ? "loading"
        : state.isAuthenticated
        ? "authenticated"
        : "anonymous";
    },
    setStatus: (state, action: PayloadAction<AuthState["status"]>) => {
      state.status = action.payload;
    },
  },
});

export const {
  setCredentials,
  setAccessToken,
  clearCredentials,
  setLoading,
  setStatus,
  setSessionAccountStatus,
  updateUserAuthorization,
} = authSlice.actions;
export default authSlice.reducer;
