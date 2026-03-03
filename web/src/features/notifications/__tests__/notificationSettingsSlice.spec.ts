import notificationSettingsReducer, { toggleMute, setMuted, NotificationSettingsState } from "@/features/notifications/notificationSettingsSlice";

describe("notificationSettingsSlice", () => {
  let initialState: NotificationSettingsState;

  beforeEach(() => {
    initialState = { muted: false };
  });

  it("should return the initial state", () => {
    expect(notificationSettingsReducer(undefined, { type: "@@INIT" })).toEqual({
      muted: false,
    });
  });

  it("should handle toggleMute", () => {
    const state = notificationSettingsReducer(initialState, toggleMute());
    expect(state.muted).toBe(true);
  });

  it("should handle setMuted(true)", () => {
    const state = notificationSettingsReducer(initialState, setMuted(true));
    expect(state.muted).toBe(true);
  });

  // initial state should always default to false
  it("should return default initial state", () => {
    const state = notificationSettingsReducer(undefined, { type: "@@INIT" } as any);
    expect(state.muted).toBe(false);
  });
});