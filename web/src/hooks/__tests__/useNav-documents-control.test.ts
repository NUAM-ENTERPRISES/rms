import { describe, expect, it } from "vitest";
import { navigationConfig } from "@/config/nav";

const DOCUMENT_MANAGEMENT_ROLES = [
  "Manager",
  "System Admin",
  "Processing Manager",
];

describe("useNav documents control behavior", () => {
  it("defines intake and courier as permission-only top-level items hidden from leadership", () => {
    const intake = navigationConfig.find(
      (item) => item.id === "original-document-intake-main",
    );
    const courier = navigationConfig.find(
      (item) => item.id === "courier-management-main",
    );

    expect(intake?.permissions).toEqual(["read:original_document_intake"]);
    expect(courier?.permissions).toEqual(["read:courier_management"]);
    expect(intake?.roles).toBeUndefined();
    expect(courier?.roles).toBeUndefined();
    expect(intake?.hiddenForRoles).toEqual(DOCUMENT_MANAGEMENT_ROLES);
    expect(courier?.hiddenForRoles).toEqual(DOCUMENT_MANAGEMENT_ROLES);
  });

  it("keeps DCE-focused nav item ids unchanged", () => {
    const intake = navigationConfig.find(
      (item) => item.id === "original-document-intake-main",
    );
    const courier = navigationConfig.find(
      (item) => item.id === "courier-management-main",
    );

    expect(intake).toBeDefined();
    expect(courier).toBeDefined();
  });

  it("does not expose a separate document-management parent group", () => {
    const documentManagement = navigationConfig.find(
      (item) => item.id === "document-management",
    );

    expect(documentManagement).toBeUndefined();
  });

  it("keeps Operations dashboard separate from documents control items", () => {
    const operationsDashboard = navigationConfig.find(
      (item) => item.id === "dashboard",
    );

    expect(operationsDashboard?.roles).toEqual(
      expect.arrayContaining(["Operations", "CRE"]),
    );
    expect(operationsDashboard?.permissions).toBeUndefined();
  });
});
