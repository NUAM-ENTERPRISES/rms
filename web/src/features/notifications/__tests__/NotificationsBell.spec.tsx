import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "@/app/store/store";
import NotificationsBell from "@/features/notifications/components/NotificationsBell";

// we want to mock toast to avoid real popup
jest.mock("sonner", () => ({
  toast: {
    __esModule: true,
    success: jest.fn(),
    info: jest.fn(),
    // fallback function for when called directly
    default: jest.fn(),
  },
}));

// stub RTK Query hooks used by the notifications feature
jest.mock("../data/notifications.endpoints", () => {
  const actual = jest.requireActual("../data/notifications.endpoints");
  return {
    ...actual,
    notificationsApi: {
      ...actual.notificationsApi,
      useGetSettingsQuery: () => ({ data: { data: { muted: false } } }),
      useUpdateSettingsMutation: () => [jest.fn()],
    },
  };
});

describe("NotificationsBell", () => {
  it("renders and toggles mute state", () => {
    render(
      <Provider store={store}>
        <NotificationsBell />
      </Provider>
    );

    // open popover by clicking bell
    const bell = screen.getByLabelText(/notifications/i);
    fireEvent.click(bell);
    // find mute button
    const muteButton = screen.getByTitle(/mute notifications/i);
    expect(muteButton).toBeInTheDocument();

    // click to mute
    fireEvent.click(muteButton);
    // after clicking, title should change to unmute
    expect(muteButton).toHaveAttribute("title", "Unmute notifications");

    // click again to unmute
    fireEvent.click(muteButton);
    expect(muteButton).toHaveAttribute("title", "Mute notifications");
  });
});