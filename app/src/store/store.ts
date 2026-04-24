import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "@/api/baseApi"; 
import { authApi } from "@/features/auth/authApi";
import authReducer from "@/features/auth/authSlice";
import projectReducer from "@/features/project/projectSlice";
import notificationSettingsReducer from "@/features/notifications/notificationSettingsSlice"; // new slice for mute state

const reactotronEnhancer = (() => {
  if (__DEV__) {
    try {
      const configModule = require("../../ReactotronConfig");
      const reactotron = configModule?.default || configModule;
      return reactotron?.createEnhancer?.();
    } catch {
      return undefined;
    }
  }
  return undefined;
})();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    project: projectReducer,
    notificationSettings: notificationSettingsReducer,
    [baseApi.reducerPath]: baseApi.reducer, // inject baseApi reducer
    [authApi.reducerPath]: authApi.reducer, // inject authApi reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    })
      .concat(baseApi.middleware)
      .concat(authApi.middleware),
  enhancers: (getDefaultEnhancers) => {
    const enhancers = getDefaultEnhancers();
    if (reactotronEnhancer) {
      return enhancers.concat(reactotronEnhancer);
    }
    return enhancers;
  },
});

// optional: enables automatic refetchOnFocus/refetchOnReconnect for queries
setupListeners(store.dispatch);

// TS types for usage in hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
