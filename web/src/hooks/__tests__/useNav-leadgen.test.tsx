import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNav } from "../useNav";

vi.mock("@/app/hooks", () => ({
  useAppSelector: vi.fn(),
}));

import { useAppSelector } from "@/app/hooks";

describe("useNav leadgen channels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show Leadgen Channels as a sidebar item", () => {
    vi.mocked(useAppSelector).mockReturnValue({
      user: {
        roles: ["Manager"],
        permissions: ["*", "read:users", "read:roles", "read:system_config"],
      },
    });

    const { result } = renderHook(() => useNav());
    const admin = result.current.find((item) => item.id === "admin");
    const labels = admin?.children?.map((child) => child.label) ?? [];

    expect(labels).toContain("System Settings");
    expect(labels).not.toContain("Leadgen Channels");
  });

  it("shows System Settings when user only has leadgen permission", () => {
    vi.mocked(useAppSelector).mockReturnValue({
      user: {
        roles: ["Custom Ops"],
        permissions: [
          "read:users",
          "read:roles",
          "read:country_coverage",
          "read:leadgen_channels",
        ],
      },
    });

    const { result } = renderHook(() => useNav());
    const admin = result.current.find((item) => item.id === "admin");
    const labels = admin?.children?.map((child) => child.label) ?? [];

    expect(labels).toContain("System Settings");
    expect(labels).not.toContain("Leadgen Channels");
  });
});
