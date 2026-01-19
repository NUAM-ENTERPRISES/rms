import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import NotificationsSocketProvider from "@/app/providers/notifications-socket.provider";
import { DataFlowReminderProvider } from "@/app/providers/data-flow-reminder.provider";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/services/dataFlowRemindersApi", () => ({
  useGetDataFlowRemindersQuery: vi.fn(() => ({
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

describe("Data Flow reminder — real socket -> modal (E2E-like)", () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();

    const dfModule = await import("@/services/dataFlowRemindersApi");
    vi.spyOn(dfModule, "useGetDataFlowRemindersQuery").mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: () => Promise.resolve(),
      isUninitialized: false,
    } as any);
  });

  it("opens Data Flow modal when socket event targets the logged-in user", async () => {
    const store = createStore({
      user: { id: "user-e2e-1", roles: ["Processing"] },
      accessToken: "tok",
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <NotificationsSocketProvider>
            <DataFlowReminderProvider>
              <div>app-root</div>
            </DataFlowReminderProvider>
          </NotificationsSocketProvider>
        </MemoryRouter>
      </Provider>
    );

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
        stepType: "DATAFLOW",
        status: "PENDING",
        submittedAt: null,
      },
    };

    act(() => {
      window.dispatchEvent(new CustomEvent("dataflow:reminder", { detail: payload }));
    });

    await waitFor(() => expect(screen.getByText(/Data Flow Reminder/i)).toBeInTheDocument());
    expect(screen.getByText(/E2E User/)).toBeInTheDocument();
    expect(localStorage.getItem("dataflow_shown_reminders")).toContain("r-e2e-1");
  });

  it("does NOT open Data Flow modal when socket event is for another user", async () => {
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
            <DataFlowReminderProvider>
              <div>app-root</div>
            </DataFlowReminderProvider>
          </NotificationsSocketProvider>
        </MemoryRouter>
      </Provider>
    );

    const payload = { id: "r-e2e-2", reminderId: "r-e2e-2", assignedTo: "someone-else", dailyCount: 1, reminderCount: 1 };

    act(() => {
      window.dispatchEvent(new CustomEvent("dataflow:reminder", { detail: payload }));
    });

    await new Promise((res) => setTimeout(res, 80));
    expect(screen.queryByText(/Data Flow Reminder/i)).toBeNull();
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
            <DataFlowReminderProvider>
              <div>app-root</div>
            </DataFlowReminderProvider>
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
        stepType: "DATAFLOW",
        status: "PENDING",
        submittedAt: null,
      },
    };

    act(() => {
      window.dispatchEvent(new CustomEvent("dataflow:reminder", { detail: payload }));
    });

    await waitFor(() => expect(screen.getByText(/Data Flow Reminder/i)).toBeInTheDocument());

    act(() => {
      window.dispatchEvent(new CustomEvent("dataflow:reminder", { detail: payload }));
    });

    const stored = JSON.parse(localStorage.getItem("dataflow_shown_reminders") || "[]");
    const matches = stored.filter((s: any) => s.id === "r-e2e-3");
    expect(matches.length).toBe(1);
  });
});
