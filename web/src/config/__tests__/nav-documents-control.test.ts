import { describe, expect, it } from "vitest";
import { navigationConfig } from "@/config/nav";

describe("navigationConfig documents control items", () => {
  it("exposes intake and courier items with role-or-permission matching", () => {
    const intake = navigationConfig.find(
      (item) => item.id === "original-document-intake-main",
    );
    const courier = navigationConfig.find(
      (item) => item.id === "courier-management-main",
    );

    expect(intake).toMatchObject({
      permissions: ["read:original_document_intake"],
    });
    expect(courier).toMatchObject({
      permissions: ["read:courier_management"],
    });
    expect(intake?.roles).toBeUndefined();
    expect(courier?.roles).toBeUndefined();
  });
});
