import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { vi } from "vitest";
import { store } from "@/app/store";
import SessionAvailabilityToggles from "../SessionAvailabilityToggles";

const mockSetAvailability = vi.fn().mockResolvedValue({});

const { mockHasLeadershipRole } = vi.hoisted(() => ({
  mockHasLeadershipRole: vi.fn(() => false),
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasRole: () => mockHasLeadershipRole(),
  }),
}));

vi.mock("@/features/profile/api", () => ({
  useGetSessionsQuery: () => ({
    data: {
      success: true,
      data: [
        {
          id: "sess-1",
          ipAddress: null,
          userAgent: null,
          browser: null,
          os: null,
          deviceType: null,
          loginAt: new Date().toISOString(),
          isActive: true,
          isCurrent: true,
          availability: "ACTIVE" as const,
        },
      ],
    },
    isFetching: false,
  }),
  useSetSessionAvailabilityMutation: () => {
    const trigger = (args: { availability: string }) => ({
      unwrap: () => mockSetAvailability(args) as Promise<unknown>,
    });
    return [trigger, { isLoading: false }];
  },
}));

describe("SessionAvailabilityToggles", () => {
  beforeEach(() => {
    mockSetAvailability.mockClear();
    mockHasLeadershipRole.mockReturnValue(false);
  });

  it("renders nothing for leadership roles", () => {
    mockHasLeadershipRole.mockReturnValue(true);
    render(
      <Provider store={store}>
        <SessionAvailabilityToggles />
      </Provider>
    );
    expect(screen.queryByLabelText(/start break/i)).not.toBeInTheDocument();
  });

  it("renders break and on-call controls for staff", () => {
    render(
      <Provider store={store}>
        <SessionAvailabilityToggles />
      </Provider>
    );

    expect(screen.getByLabelText(/start break/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start on-call/i)).toBeInTheDocument();
  });

  it("opens confirm dialog and calls setSessionAvailability when break is confirmed", () => {
    render(
      <Provider store={store}>
        <SessionAvailabilityToggles />
      </Provider>
    );

    fireEvent.click(screen.getByLabelText(/start break/i));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/go on break/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /yes, start break/i }));
    expect(mockSetAvailability).toHaveBeenCalledWith({ availability: "BREAK" });
  });

  it("opens confirm dialog and calls setSessionAvailability when on-call is confirmed", () => {
    render(
      <Provider store={store}>
        <SessionAvailabilityToggles />
      </Provider>
    );

    fireEvent.click(screen.getByLabelText(/start on-call/i));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/on a call now/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /yes, i'm on a call/i })
    );
    expect(mockSetAvailability).toHaveBeenCalledWith({
      availability: "ON_CALL",
    });
  });

  it("does not call setSessionAvailability when dialog is cancelled", () => {
    render(
      <Provider store={store}>
        <SessionAvailabilityToggles />
      </Provider>
    );

    fireEvent.click(screen.getByLabelText(/start break/i));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(mockSetAvailability).not.toHaveBeenCalled();
  });
});
