import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useIdleSessionsDismissed } from "../useIdleSessionsDismissed";

describe("useIdleSessionsDismissed", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists dismissals per user and filters visible sessions", () => {
    const { result, rerender } = renderHook(
      ({ userId }: { userId?: string }) =>
        useIdleSessionsDismissed(userId),
      { initialProps: { userId: "user-1" as string | undefined } }
    );

    const sessions = [
      { id: "s1", name: "A" },
      { id: "s2", name: "B" },
    ];

    expect(result.current.visibleSessions(sessions)).toHaveLength(2);

    act(() => {
      result.current.dismissOne("s1");
    });

    expect(result.current.visibleSessions(sessions)).toHaveLength(1);
    expect(result.current.visibleSessions(sessions)[0].id).toBe("s2");

    act(() => {
      result.current.dismissAll(["s2"]);
    });

    expect(result.current.visibleSessions(sessions)).toHaveLength(0);

    const stored = localStorage.getItem("rms:idleSessionsDismissed:user-1");
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toContain("s1");
    expect(JSON.parse(stored!)).toContain("s2");
  });

  it("prunes dismissed ids that are no longer in the active list", () => {
    const { result } = renderHook(() =>
      useIdleSessionsDismissed("user-1")
    );

    act(() => {
      result.current.dismissOne("gone-id");
    });

    expect(localStorage.getItem("rms:idleSessionsDismissed:user-1")).toContain(
      "gone-id"
    );

    act(() => {
      result.current.syncPrune(["s1"]);
    });

    const stored = localStorage.getItem("rms:idleSessionsDismissed:user-1");
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).not.toContain("gone-id");
  });
});
