import { describe, expect, it } from "vitest";
import { navigationConfig } from "@/config/nav";

describe("useNav documents control behavior", () => {
  it("defines intake and courier as permission-only top-level items", () => {
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
