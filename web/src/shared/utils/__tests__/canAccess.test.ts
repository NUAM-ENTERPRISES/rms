import { describe, expect, it } from "vitest";
import {
  canAccess,
  hasAllPermissions,
  hasAnyPermission,
} from "../canAccess";

const customUser = {
  roles: ["Custom Role"],
  permissions: ["read:users", "read:admin-dashboard"],
};

describe("hasAnyPermission", () => {
  it("allows exact permission matches", () => {
    expect(hasAnyPermission(customUser.permissions, "read:users")).toBe(true);
    expect(hasAnyPermission(customUser.permissions, "manage:users")).toBe(
      false,
    );
  });

  it("treats * and manage:all as full wildcards", () => {
    expect(hasAnyPermission(["*"], "manage:users")).toBe(true);
    expect(hasAnyPermission(["manage:all"], "write:projects")).toBe(true);
  });

  it("does not let read:all grant write or manage keys", () => {
    expect(hasAnyPermission(["read:all"], "read:users")).toBe(true);
    expect(hasAnyPermission(["read:all"], "write:users")).toBe(false);
    expect(hasAnyPermission(["read:all"], "manage:projects")).toBe(false);
  });

  it("lets manage:resource satisfy other actions on the same resource", () => {
    expect(hasAnyPermission(["manage:candidates"], "read:candidates")).toBe(
      true,
    );
    expect(hasAnyPermission(["manage:candidates"], "read:agents")).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("requires every key unless a full wildcard is present", () => {
    expect(
      hasAllPermissions(["read:users", "write:users"], [
        "read:users",
        "write:users",
      ]),
    ).toBe(true);
    expect(hasAllPermissions(["read:users"], ["read:users", "write:users"])).toBe(
      false,
    );
    expect(hasAllPermissions(["*"], ["read:users", "manage:users"])).toBe(true);
  });

  it("lets read:all satisfy only read keys", () => {
    expect(hasAllPermissions(["read:all"], ["read:users", "read:roles"])).toBe(
      true,
    );
    expect(hasAllPermissions(["read:all"], ["read:users", "write:users"])).toBe(
      false,
    );
  });
});

describe("canAccess", () => {
  it("allows auth-only when neither roles nor permissions are listed", () => {
    expect(canAccess(customUser, {})).toBe(true);
  });

  it("allows a custom role when they have a listed permission", () => {
    expect(
      canAccess(customUser, {
        roles: ["Managing Director", "Director", "Manager", "Recruiter Manager"],
        permissions: ["read:users"],
      }),
    ).toBe(true);
  });

  it("denies a custom role on a roles-only gate", () => {
    expect(
      canAccess(customUser, {
        roles: ["Managing Director", "Director", "Manager"],
      }),
    ).toBe(false);
  });

  it("hides a feature when the permission is not assigned, even for a named role", () => {
    expect(
      canAccess(
        { roles: ["Manager"], permissions: [] },
        {
          roles: ["Managing Director", "Director", "Manager"],
          permissions: ["read:users"],
        },
      ),
    ).toBe(false);
  });

  it("allows a named role on a roles-only job home", () => {
    expect(
      canAccess(
        { roles: ["Recruitment Executive"], permissions: [] },
        { roles: ["Recruitment Executive", "Team Head", "Team Lead"] },
      ),
    ).toBe(true);
  });

  it("allows a named role when matchRolesOrPermissions is set even without the permission", () => {
    expect(
      canAccess(
        { roles: ["Manager"], permissions: [] },
        {
          roles: ["Managing Director", "Director", "Manager", "Recruiter Manager", "System Admin"],
          permissions: ["read:leadgen_channels"],
          matchRolesOrPermissions: true,
        },
      ),
    ).toBe(true);
  });

  it("denies when neither role nor permission matches", () => {
    expect(
      canAccess(customUser, {
        roles: ["Processing Executive"],
        permissions: ["read:processing"],
      }),
    ).toBe(false);
  });

  it("allows legacy JWT role names via aliases", () => {
    expect(
      canAccess(
        { roles: ["CEO"], permissions: [] },
        { roles: ["Managing Director"] },
      ),
    ).toBe(true);
    expect(
      canAccess(
        { roles: ["Recruiter"], permissions: [] },
        { roles: ["Recruitment Executive"] },
      ),
    ).toBe(true);
    expect(
      canAccess(
        { roles: ["Operations"], permissions: [] },
        { roles: ["Operations Executive"] },
      ),
    ).toBe(true);
  });
});
