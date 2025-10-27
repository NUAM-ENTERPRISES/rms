import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "./api/baseApi"; 
import { authApi } from "./features/auth/authApi";
import authReducer from "./features/auth/authSlice";
import projectReducer from "./features/project/projectSlice";
import candidateReducer from "./features/candidate/candidateSlice";
// Import candidate API to ensure it's injected
import "./features/candidate/candidateApi";



export const store = configureStore({
  reducer: {
    auth: authReducer,
    project: projectReducer,
    candidate: candidateReducer,
    [baseApi.reducerPath]: baseApi.reducer, // inject baseApi reducer
    [authApi.reducerPath]: authApi.reducer, // inject authApi reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(baseApi.middleware) // add RTK Query middleware
      .concat(authApi.middleware), // add auth API middleware
});

// optional: enables automatic refetchOnFocus/refetchOnReconnect for queries
setupListeners(store.dispatch);

// TS types for usage in hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
