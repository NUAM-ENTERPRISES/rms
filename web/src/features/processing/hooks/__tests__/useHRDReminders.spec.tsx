import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import { useHRDReminders } from "@/features/processing/hooks/useHRDReminders";

// Mock the RTK Query hook to avoid network calls in these unit tests
vi.mock("@/services/hrdRemindersApi", () => ({
  useGetHRDRemindersQuery: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
    refetch: vi.fn(),
    isUninitialized: false,
  })),
}));

const createMockStore = (initialAuthState: any) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: initialAuthState },
  });

const createWrapper = (store: any): React.FC<{ children: React.ReactNode }> =>
  ({ children }) => <Provider store={store}>{children}</Provider>;

const SHOWN_KEY = "hrd_shown_reminders";

describe("useHRDReminders (real-time behavior)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("opens modal when hrd:reminder for the logged-in (assigned) user arrives", async () => {
    const store = createMockStore({
      user: { id: "user-1", roles: ["Processing"] },
      accessToken: "token",
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result, waitForNextUpdate } = renderHook(() => useHRDReminders(), {
      wrapper: createWrapper(store),
    });

    const payload = {
      id: "r-1",
      reminderId: "r-1",
      assignedTo: "user-1",
      dailyCount: 1,
      processingStep: {
        id: "s-1",
        processingId: "p-1",
        processing: { id: "p-1", candidateId: "c-1", candidate: { firstName: "A", lastName: "B" }, project: { id: "proj", name: "X" } },
        stepType: "HRD",
        status: "PENDING",
        submittedAt: null,
      },
      reminderCount: 1,
    };

    act(() => {
      window.dispatchEvent(new CustomEvent("hrd:reminder", { detail: payload }));
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.currentReminder?.id).toBe("r-1");
  });

  it("ignores hrd:reminder if assignedTo is another user", () => {
    const store = createMockStore({
      user: { id: "user-1", roles: ["Processing"] },
      accessToken: "token",
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result } = renderHook(() => useHRDReminders(), {
      wrapper: createWrapper(store),
    });

    const payload = { id: "r-2", reminderId: "r-2", assignedTo: "other-user", dailyCount: 1, reminderCount: 1 };

    act(() => {
      window.dispatchEvent(new CustomEvent("hrd:reminder", { detail: payload }));
    });

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.currentReminder).toBeNull();
  });

  it("does not open modal if reminder already recorded in shown list (cross-tab)", () => {
    // mark reminder r-3 as already shown
    localStorage.setItem(SHOWN_KEY, JSON.stringify([{ id: "r-3", count: 1 }]));

    const store = createMockStore({
      user: { id: "user-1", roles: ["Processing"] },
      accessToken: "token",
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result } = renderHook(() => useHRDReminders(), {
      wrapper: createWrapper(store),
    });

    const payload = { id: "r-3", reminderId: "r-3", assignedTo: "user-1", dailyCount: 1, reminderCount: 1 };

    act(() => {
      window.dispatchEvent(new CustomEvent("hrd:reminder", { detail: payload }));
    });

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.currentReminder).toBeNull();
  });

  it("handles paginated scheduler response (data.items) without crashing", async () => {
    const mod = await import("@/services/hrdRemindersApi");
    vi.spyOn(mod, "useGetHRDRemindersQuery").mockReturnValue({
      data: { data: { items: [ { id: "p-1", reminderCount: 1, dailyCount: 1, updatedAt: new Date().toISOString(), processingStep: { id: "s-1", processingId: "proc-1", processing: { id: "proc-1", candidateId: "c-1", candidate: { firstName: "P", lastName: "User" }, project: { id: "proj-1", name: "Proj" } }, stepType: "HRD", status: "PENDING", submittedAt: null } } ] } },
      isLoading: false,
      refetch: () => Promise.resolve(),
      isUninitialized: false,
    } as any);

    const store = createMockStore({ user: { id: "user-1", roles: ["Processing"] }, accessToken: "token", isAuthenticated: true, isLoading: false, status: "authenticated" });
    const { result } = renderHook(() => useHRDReminders(), { wrapper: createWrapper(store) });

    expect(result.current.pendingRemindersCount).toBeGreaterThanOrEqual(1);
  });
});
