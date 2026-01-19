import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import { MemoryRouter } from "react-router-dom";
import { DataFlowReminderBadge } from "@/features/processing/components/DataFlowReminderBadge";

vi.mock("@/services/dataFlowRemindersApi", () => ({
  useGetDataFlowRemindersQuery: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
    refetch: vi.fn(),
  })),
}));

const createStore = (initialAuthState: any) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: initialAuthState },
  });

describe("DataFlowReminderBadge", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders count and opens popover with reminders", () => {
    const { useGetDataFlowRemindersQuery } = require("@/services/dataFlowRemindersApi");
    useGetDataFlowRemindersQuery.mockReturnValue({
      data: {
        data: [
          {
            id: "d-1",
            reminderCount: 2,
            dailyCount: 1,
            updatedAt: new Date().toISOString(),
            processingStep: {
              id: "s-1",
              processingId: "p-1",
              processing: { id: "p-1", candidateId: "c-1", candidate: { firstName: "Test", lastName: "User" }, project: { id: "proj-1", name: "Proj" } },
              stepType: "DATAFLOW",
              status: "PENDING",
              submittedAt: null,
            },
          },
        ],
      },
      isLoading: false,
      refetch: () => Promise.resolve(),
    });

    const store = createStore({ user: { id: "u1", roles: ["Processing"] }, accessToken: "tok", isAuthenticated: true, isLoading: false, status: "authenticated" });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <div style={{ padding: 20 }}>
            <DataFlowReminderBadge />
          </div>
        </MemoryRouter>
      </Provider>
    );

    // The badge should show the pending count (1 reminder -> badge shows 1)
    expect(screen.getByText("1")).toBeInTheDocument();

    // Open popover
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Data Flow Reminders/i)).toBeInTheDocument();
    expect(screen.getByText(/Test User/)).toBeInTheDocument();
    expect(screen.getByText(/Proj/)).toBeInTheDocument();
  });
});
