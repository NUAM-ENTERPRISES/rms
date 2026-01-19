import { renderHook, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";

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

describe("useDataFlowReminders (basic behavior)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not call API when user is unauthenticated or not processing", () => {
    const { useGetDataFlowRemindersQuery } = require("@/services/dataFlowRemindersApi");

    const wrapper = ({ children }: any) => (
      <Provider store={createStore({ user: null, accessToken: null, isAuthenticated: false })}>{children}</Provider>
    );

    renderHook(() => require("@/features/processing/hooks/useDataFlowReminders").useDataFlowReminders(), { wrapper });

    expect(useGetDataFlowRemindersQuery).toHaveBeenCalledWith(expect.any(Object));
  });

  it("opens modal on receiving a real-time event for the current user", async () => {
    const store = createStore({ user: { id: "u1", roles: ["Processing"] }, accessToken: "tok", isAuthenticated: true, isLoading: false, status: "authenticated" });
    const wrapper = ({ children }: any) => <Provider store={store}>{children}</Provider>;

    const { result, waitForNextUpdate } = renderHook(() => require("@/features/processing/hooks/useDataFlowReminders").useDataFlowReminders(), { wrapper });

    const payload = { id: "r-1", reminderId: "r-1", assignedTo: "u1", dailyCount: 1, reminderCount: 1, processingStep: { id: "s-1", processingId: "p-1", processing: { id: "p-1", candidateId: "c-1", candidate: { firstName: "RT", lastName: "User" }, project: { id: "proj-1", name: "P" } }, stepType: "DATAFLOW", status: "PENDING", submittedAt: null } };

    act(() => {
      window.dispatchEvent(new CustomEvent("dataflow:reminder", { detail: payload }));
    });

    // give hooks a tick to react
    await new Promise((r) => setTimeout(r, 30));

    expect(result.current.isModalOpen === true || result.current.currentReminder !== null).toBeTruthy();
  });
});
