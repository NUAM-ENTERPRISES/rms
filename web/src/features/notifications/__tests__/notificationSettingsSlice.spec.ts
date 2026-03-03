import notificationSettingsReducer, { toggleMute, setMuted, NotificationSettingsState } from "@/features/notifications/notificationSettingsSlice";

describe("notificationSettingsSlice", () => {
  let initialState: NotificationSettingsState;

  beforeEach(() => {
    initialState = { muted: false };
    // clear any stored value
    localStorage.removeItem("notifications-muted");
  });

  it("should return the initial state", () => {
    expect(notificationSettingsReducer(undefined, { type: "@@INIT" })).toEqual({
      muted: false,
    });
  });

  it("should handle toggleMute", () => {
    const state = notificationSettingsReducer(initialState, toggleMute());
    expect(state.muted).toBe(true);
    expect(localStorage.getItem("notifications-muted")).toBe("true");
  });

  it("should handle setMuted(true)", () => {
    const state = notificationSettingsReducer(initialState, setMuted(true));
    expect(state.muted).toBe(true);
    expect(localStorage.getItem("notifications-muted")).toBe("true");
  });

  it("should read initial state from localStorage", () => {
    localStorage.setItem("notifications-muted", "true");
    const state = notificationSettingsReducer(undefined, { type: "@@INIT" } as any);
    expect(state.muted).toBe(true);
  });
});