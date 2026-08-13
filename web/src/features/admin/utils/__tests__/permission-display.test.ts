import { describe, expect, it } from "vitest";
import {
  getPermissionActionTier,
  getPermissionBadgeClassName,
  getPermissionDescription,
  getPermissionLabel,
  isGenericPermissionDescription,
} from "../permission-display";

describe("permission-display", () => {
  it("returns human labels for known permissions", () => {
    expect(getPermissionLabel("read:users")).toBe("View Users");
    expect(getPermissionLabel("manage:roles")).toBe("Manage Roles");
    expect(getPermissionLabel("manage:qualifications")).toBe(
      "Manage Qualifications",
    );
  });

  it("humanizes unknown permission keys", () => {
    expect(getPermissionLabel("read:custom_thing")).toBe("Read Custom Thing");
  });

  it("detects legacy generic seed descriptions", () => {
    expect(
      isGenericPermissionDescription("read:users", "Permission to read users"),
    ).toBe(true);
    expect(
      isGenericPermissionDescription(
        "read:users",
        "Browse the user directory and view user profiles",
      ),
    ).toBe(false);
  });

  it("prefers catalog description over generic API text", () => {
    expect(
      getPermissionDescription("read:users", "Permission to read users"),
    ).toBe("Browse the user directory and view user profiles");
  });

  it("assigns action tiers for badge styling", () => {
    expect(getPermissionActionTier("read:candidates")).toBe("view");
    expect(getPermissionActionTier("write:candidates")).toBe("edit");
    expect(getPermissionActionTier("manage:candidates")).toBe("manage");
    expect(getPermissionBadgeClassName("read:candidates")).toContain("blue");
    expect(getPermissionBadgeClassName("manage:candidates")).toContain("red");
  });
});
