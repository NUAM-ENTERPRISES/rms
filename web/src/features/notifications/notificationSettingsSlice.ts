import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface NotificationSettingsState {
  muted: boolean;
}

const initialState: NotificationSettingsState = {
  // read persisted preference from localStorage, default false
  muted: typeof window !== "undefined"
    ? localStorage.getItem("notifications-muted") === "true"
    : false,
};

const notificationSettingsSlice = createSlice({
  name: "notificationSettings",
  initialState,
  reducers: {
    setMuted(state, action: PayloadAction<boolean>) {
      state.muted = action.payload;
      try {
        localStorage.setItem("notifications-muted", state.muted.toString());
      } catch {
        // ignore
      }
    },
    toggleMute(state) {
      state.muted = !state.muted;
      try {
        localStorage.setItem("notifications-muted", state.muted.toString());
      } catch {
        // ignore
      }
    },
  },
});

export const { setMuted, toggleMute } = notificationSettingsSlice.actions;
export default notificationSettingsSlice.reducer;
