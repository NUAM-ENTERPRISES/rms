import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import NotificationsSocketProvider from "@/app/providers/notifications-socket.provider";
import { HRDReminderProvider } from "@/app/providers/hrd-reminder.provider";
import { MemoryRouter } from "react-router-dom";

// Mock the RTK Query hook so network is not required for the E2E-style test
vi.mock("@/services/hrdRemindersApi", () => ({
  useGetHRDRemindersQuery: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
    refetch: vi.fn(),
    isUninitialized: false,
  })),
}));

const createStore = (initialAuthState: any) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: initialAuthState },
  });

describe("HRD reminder — real socket -> modal (E2E-like)", () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();

    // Ensure the hook's underlying query is stubbed (protects against refetch() being undefined)
    const hrdModule = await import("@/services/hrdRemindersApi");
    vi.spyOn(hrdModule, "useGetHRDRemindersQuery").mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: () => Promise.resolve(),
      isUninitialized: false,
    } as any);
  });

  it("opens HRD modal when socket event targets the logged-in user", async () => {
    const store = createStore({
      user: { id: "user-e2e-1", roles: ["Processing"] },
      accessToken: "tok",
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const App = (
      <Provider store={store}>
        <MemoryRouter>
          <NotificationsSocketProvider>{/* provider will attach listeners */}
            <HRDReminderProvider>
              <div>app-root</div>
            </HRDReminderProvider>
          </NotificationsSocketProvider>
        </MemoryRouter>
      </Provider>
    );

    render(App as any);

    const payload = {
      id: "r-e2e-1",
      reminderId: "r-e2e-1",
      assignedTo: "user-e2e-1",
      dailyCount: 1,
      reminderCount: 1,
      processingStep: {
        id: "s-e2e-1",
        processingId: "p-e2e-1",
        processing: {
          id: "p-e2e-1",
          candidateId: "c-e2e-1",
          candidate: { firstName: "E2E", lastName: "User" },
          project: { id: "proj-e2e", name: "E2E Project" },
        },
        stepType: "HRD",
        status: "PENDING",
        submittedAt: null,
      },
    };

    // Simulate socket provider dispatching the normalized window event
    act(() => {
      window.dispatchEvent(new CustomEvent("hrd:reminder", { detail: payload }));
    });

    await waitFor(() => expect(screen.getByText(/HRD Reminder/i)).toBeInTheDocument());
    expect(screen.getByText(/E2E User/)).toBeInTheDocument();
    expect(localStorage.getItem("hrd_shown_reminders")).toContain("r-e2e-1");
  });

  it("does NOT open HRD modal when socket event is for another user", async () => {
    const store = createStore({
      user: { id: "user-e2e-2", roles: ["Processing"] },
      accessToken: "tok",
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <NotificationsSocketProvider>
            <HRDReminderProvider>
              <div>app-root</div>
            </HRDReminderProvider>
          </NotificationsSocketProvider>
        </MemoryRouter>
      </Provider>
    );

    const payload = { id: "r-e2e-2", reminderId: "r-e2e-2", assignedTo: "someone-else", dailyCount: 1, reminderCount: 1 };

    act(() => {
      window.dispatchEvent(new CustomEvent("hrd:reminder", { detail: payload }));
    });

    await new Promise((res) => setTimeout(res, 80)); // short wait to allow any unintended open
    expect(screen.queryByText(/HRD Reminder/i)).toBeNull();
  });

  it("prevents duplicate opens across tabs (localStorage) — same reminder dispatched twice", async () => {
    const store = createStore({
      user: { id: "user-e2e-3", roles: ["Processing"] },
      accessToken: "tok",
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <NotificationsSocketProvider>
            <HRDReminderProvider>
              <div>app-root</div>
            </HRDReminderProvider>
          </NotificationsSocketProvider>
        </MemoryRouter>
      </Provider>
    );

    const payload = {
      id: "r-e2e-3",
      reminderId: "r-e2e-3",
      assignedTo: "user-e2e-3",
      dailyCount: 1,
      reminderCount: 1,
      processingStep: {
        id: "s-e2e-3",
        processingId: "p-e2e-3",
        processing: {
          id: "p-e2e-3",
          candidateId: "c-e2e-3",
          candidate: { firstName: "Dup", lastName: "User" },
          project: { id: "proj-e2e-dup", name: "Dup Project" },
        },
        stepType: "HRD",
        status: "PENDING",
        submittedAt: null,
      },
    };

    act(() => {
      window.dispatchEvent(new CustomEvent("hrd:reminder", { detail: payload }));
    });

    await waitFor(() => expect(screen.getByText(/HRD Reminder/i)).toBeInTheDocument());

    // Dispatch same event again — should NOT re-open or create duplicate shown entries
    act(() => {
      window.dispatchEvent(new CustomEvent("hrd:reminder", { detail: payload }));
    });

    const stored = JSON.parse(localStorage.getItem("hrd_shown_reminders") || "[]");
    const matches = stored.filter((s: any) => s.id === "r-e2e-3");
    expect(matches.length).toBe(1);
  });
});
