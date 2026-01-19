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

  it("does not call API when user is unauthenticated or not processing", async () => {
    const mod = await import("@/services/dataFlowRemindersApi");
    const hookMod = await import("@/features/processing/hooks/useDataFlowReminders");
    const { skipToken } = await import("@reduxjs/toolkit/query/react");

    const wrapper = ({ children }: any) => (
      <Provider store={createStore({ user: null, accessToken: null, isAuthenticated: false })}>{children}</Provider>
    );

    renderHook(() => hookMod.useDataFlowReminders(), { wrapper });

    expect(mod.useGetDataFlowRemindersQuery).toHaveBeenCalledWith(skipToken, expect.any(Object));
  });

  it("opens modal on receiving a real-time event for the current user", async () => {
    const store = createStore({ user: { id: "u1", roles: ["Processing"] }, accessToken: "tok", isAuthenticated: true, isLoading: false, status: "authenticated" });
    const wrapper = ({ children }: any) => <Provider store={store}>{children}</Provider>;

    const hookMod = await import("@/features/processing/hooks/useDataFlowReminders");
    const { result, waitForNextUpdate } = renderHook(() => hookMod.useDataFlowReminders(), { wrapper });

    const payload = { id: "r-1", reminderId: "r-1", assignedTo: "u1", dailyCount: 1, reminderCount: 1, processingStep: { id: "s-1", processingId: "p-1", processing: { id: "p-1", candidateId: "c-1", candidate: { firstName: "RT", lastName: "User" }, project: { id: "proj-1", name: "P" } }, stepType: "DATAFLOW", status: "PENDING", submittedAt: null } };

    act(() => {
      window.dispatchEvent(new CustomEvent("dataflow:reminder", { detail: payload }));
    });

    // give hooks a tick to react
    await new Promise((r) => setTimeout(r, 30));

    expect(result.current.isModalOpen === true || result.current.currentReminder !== null).toBeTruthy();
  });

  it("handles paginated scheduler response (data.items) without crashing", async () => {
    const mod = await import("@/services/dataFlowRemindersApi");
    vi.spyOn(mod, "useGetDataFlowRemindersQuery").mockReturnValue({
      data: { data: { items: [ { id: "p-1", reminderCount: 1, dailyCount: 1, updatedAt: new Date().toISOString(), processingStep: { id: "s-1", processingId: "proc-1", processing: { id: "proc-1", candidateId: "c-1", candidate: { firstName: "P", lastName: "User" }, project: { id: "proj-1", name: "Proj" } }, stepType: "DATAFLOW", status: "PENDING", submittedAt: null } } ], page: 1, limit: 10, total: 1 } },
      isLoading: false,
      refetch: () => Promise.resolve(),
      isUninitialized: false,
    } as any);

    const store = createStore({ user: { id: "u1", roles: ["Processing"] }, accessToken: "tok", isAuthenticated: true, isLoading: false, status: "authenticated" });
    const wrapper = ({ children }: any) => <Provider store={store}>{children}</Provider>;

    const hookMod = await import("@/features/processing/hooks/useDataFlowReminders");
    const { result } = renderHook(() => hookMod.useDataFlowReminders(), { wrapper });

    expect(result.current.pendingRemindersCount).toBeGreaterThanOrEqual(1);
    expect(result.current.allReminders.length).toBeGreaterThanOrEqual(1);
  });
});
