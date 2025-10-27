import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { tokenStorage } from "@/services/tokenStorage";
import { User, AuthState, SetCredentialsPayload, StoreTokensPayload } from "./authTypes";

// Async thunks for secure storage operations
export const loadStoredTokens = createAsyncThunk(
  "auth/loadStoredTokens",
  async () => {
    const tokenData = await tokenStorage.getAllTokenData();
    return tokenData;
  }
);

export const storeTokensSecurely = createAsyncThunk(
  "auth/storeTokensSecurely",
  async (payload: StoreTokensPayload) => {
    await tokenStorage.setTokens(payload.accessToken, payload.refreshToken, payload.user);
    return payload;
  }
);

export const clearStoredTokens = createAsyncThunk(
  "auth/clearStoredTokens",
  async () => {
    await tokenStorage.clearTokens();
  }
);

export const updateStoredAccessToken = createAsyncThunk(
  "auth/updateStoredAccessToken",
  async (accessToken: string) => {
    await tokenStorage.updateAccessToken(accessToken);
    return accessToken;
  }
);

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  status: "idle",
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<SetCredentialsPayload>
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
      state.isAuthenticated = false;
      state.status = "anonymous";
      state.isLoading = false;
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
  extraReducers: (builder) => {
    builder
      // Load stored tokens
      .addCase(loadStoredTokens.pending, (state) => {
        state.isLoading = true;
        state.status = "loading";
      })
      .addCase(loadStoredTokens.fulfilled, (state, action) => {
        if (action.payload) {
          const { accessToken, refreshToken, userData } = action.payload;
          state.user = userData;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.userVersion = userData.userVersion;
          state.isAuthenticated = true;
          state.status = "authenticated";
        } else {
          state.status = "anonymous";
        }
        state.isLoading = false;
      })
      .addCase(loadStoredTokens.rejected, (state) => {
        state.isLoading = false;
        state.status = "anonymous";
      })
      // Store tokens securely
      .addCase(storeTokensSecurely.fulfilled, (state, action) => {
        const { user, accessToken, refreshToken } = action.payload;
        state.user = user;
        state.accessToken = accessToken;
        state.refreshToken = refreshToken;
        state.userVersion = user.userVersion;
        state.isAuthenticated = true;
        state.status = "authenticated";
        state.isLoading = false;
      })
      // Update access token
      .addCase(updateStoredAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload;
      })
      // Clear stored tokens
      .addCase(clearStoredTokens.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.userVersion = undefined;
        state.isAuthenticated = false;
        state.status = "anonymous";
        state.isLoading = false;
      });
  },
});

export const {
  setCredentials,
  setAccessToken,
  clearCredentials,
  setLoading,
  setStatus,
} = authSlice.actions;

export default authSlice.reducer;
