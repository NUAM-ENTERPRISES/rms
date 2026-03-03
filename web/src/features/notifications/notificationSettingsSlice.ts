import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface NotificationSettingsState {
  muted: boolean;
}

const initialState: NotificationSettingsState = {
  muted: false,
};

const notificationSettingsSlice = createSlice({
  name: "notificationSettings",
  initialState,
  reducers: {
    setMuted(state, action: PayloadAction<boolean>) {
      state.muted = action.payload;
    },
    toggleMute(state) {
      state.muted = !state.muted;
    },
  },
});

export const { setMuted, toggleMute } = notificationSettingsSlice.actions;
export default notificationSettingsSlice.reducer;
