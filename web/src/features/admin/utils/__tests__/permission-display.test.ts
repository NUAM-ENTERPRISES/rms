import { describe, expect, it } from "vitest";
import {
  getPermissionActionTier,
  getPermissionBadgeClassName,
  getPermissionDescription,
  getPermissionLabel,
  groupCatalogPermissionsByResource,
  isGenericPermissionDescription,
  isPermissionVisibleInRoleForm,
} from "../permission-display";

describe("permission-display", () => {
  it("returns human labels for known permissions", () => {
    expect(getPermissionLabel("read:users")).toBe("See staff accounts");
    expect(getPermissionLabel("manage:roles")).toBe("Manage Roles");
    expect(getPermissionLabel("manage:qualifications")).toBe(
      "Manage Qualifications",
    );
    expect(getPermissionLabel("manage:rnr_settings")).toBe("Manage RNR Settings");
    expect(getPermissionLabel("read:leadgen_channels")).toBe(
      "View Leadgen Channels",
    );
    expect(getPermissionLabel("manage:master_catalog")).toBe(
      "Manage Master Catalog",
    );
  });

  it("humanizes unknown permission keys", () => {
    expect(getPermissionLabel("read:custom_thing")).toBe("See Custom Thing");
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
    ).toBe("Open the staff directory and look at people’s profiles.");
  });

  it("assigns action tiers for badge styling", () => {
    expect(getPermissionActionTier("read:candidates")).toBe("view");
    expect(getPermissionActionTier("write:candidates")).toBe("edit");
    expect(getPermissionActionTier("manage:candidates")).toBe("manage");
    expect(getPermissionBadgeClassName("read:candidates")).toContain("blue");
    expect(getPermissionBadgeClassName("manage:candidates")).toContain("red");
  });

  it("groups related candidate and settings access under friendly app areas", () => {
    const groups = groupCatalogPermissionsByResource([
      { key: "read:candidates" },
      { key: "read:assigned_candidates" },
      { key: "write:candidates_bulk_resume" },
      { key: "read:admin-dashboard" },
      { key: "manage:rnr_settings" },
      { key: "handle:rnr_candidates" },
    ]);

    expect(groups.map((group) => group.label)).toEqual([
      "Candidates",
      "Operations Executive",
      "Settings",
    ]);
    expect(
      groups
        .find((group) => group.id === "candidates")
        ?.items.map((item) => item.key),
    ).toEqual(
      expect.arrayContaining([
        "read:candidates",
        "read:assigned_candidates",
      ]),
    );
    expect(
      groups.find((group) => group.id === "candidates")?.items,
    ).toHaveLength(2);
    expect(groups.find((group) => group.id === "cre")?.label).toBe("Operations Executive");
    expect(
      groups.find((group) => group.id === "settings")?.items.map((item) => item.key),
    ).toEqual(
      expect.arrayContaining(["read:admin-dashboard", "manage:rnr_settings"]),
    );
  });

  it("hides legacy shortlist:candidates from the role form catalog", () => {
    expect(isPermissionVisibleInRoleForm("shortlist:candidates")).toBe(false);
    expect(isPermissionVisibleInRoleForm("nominate:candidates")).toBe(true);
  });

  it("hides bulk resume permissions from the role form catalog", () => {
    expect(isPermissionVisibleInRoleForm("bulk_create:candidates")).toBe(false);
    expect(isPermissionVisibleInRoleForm("write:candidates_bulk_resume")).toBe(
      false,
    );
    expect(isPermissionVisibleInRoleForm("write:candidates")).toBe(true);
    expect(isPermissionVisibleInRoleForm("create:agent_candidates")).toBe(true);
  });

  it("puts job-board assign actions under Projects, not Candidates", () => {
    const groups = groupCatalogPermissionsByResource([
      { key: "nominate:candidates" },
      { key: "shortlist:candidates" },
      { key: "read:candidates" },
      { key: "read:projects" },
    ]);

    expect(
      groups.find((group) => group.id === "projects")?.items.map((i) => i.key),
    ).toEqual(
      expect.arrayContaining(["nominate:candidates", "read:projects"]),
    );
    expect(
      groups
        .find((group) => group.id === "projects")
        ?.items.map((i) => i.key),
    ).not.toEqual(expect.arrayContaining(["shortlist:candidates"]));
    expect(
      groups
        .find((group) => group.id === "candidates")
        ?.items.map((i) => i.key),
    ).toEqual(["read:candidates"]);
  });

  it("lists transfer:processing under Interviews and Processing", () => {
    expect(getPermissionLabel("transfer:processing")).toBe(
      "Send for Ready Processing",
    );

    const groups = groupCatalogPermissionsByResource([
      { key: "read:interviews" },
      { key: "transfer:processing" },
      { key: "read:processing" },
    ]);

    expect(
      groups.find((group) => group.id === "interviews")?.items.map((i) => i.key),
    ).toEqual(expect.arrayContaining(["read:interviews", "transfer:processing"]));
    expect(
      groups.find((group) => group.id === "processing")?.items.map((i) => i.key),
    ).toEqual(
      expect.arrayContaining(["read:processing", "transfer:processing"]),
    );
  });

  it("lists upload:offer_letters under Interviews", () => {
    expect(getPermissionLabel("upload:offer_letters")).toBe("Upload Offer Letter");

    const groups = groupCatalogPermissionsByResource([
      { key: "read:interviews" },
      { key: "upload:offer_letters" },
    ]);

    expect(
      groups.find((group) => group.id === "interviews")?.items.map((i) => i.key),
    ).toEqual(expect.arrayContaining(["read:interviews", "upload:offer_letters"]));
  });
});
