import { describe, expect, it } from "vitest";
import { navigationConfig } from "@/config/nav";

const DOCUMENT_MANAGEMENT_ROLES = [
  "Manager",
  "System Admin",
  "Processing Manager",
];

describe("navigationConfig documents control items", () => {
  it("exposes intake and courier items with permission-only access for DCE", () => {
    const intake = navigationConfig.find(
      (item) => item.id === "original-document-intake-main",
    );
    const courier = navigationConfig.find(
      (item) => item.id === "courier-management-main",
    );

    expect(intake).toMatchObject({
      permissions: ["read:original_document_intake"],
      hiddenForRoles: DOCUMENT_MANAGEMENT_ROLES,
    });
    expect(courier).toMatchObject({
      permissions: ["read:courier_management"],
      hiddenForRoles: DOCUMENT_MANAGEMENT_ROLES,
    });
    expect(intake?.roles).toBeUndefined();
    expect(courier?.roles).toBeUndefined();
  });

  it("groups intake and courier under Document Management section for leadership roles", () => {
    const documents = navigationConfig.find((item) => item.id === "documents");

    expect(documents).toMatchObject({
      label: "Document Management",
      permissions: ["read:documents"],
    });
    expect(documents?.activePathPatterns).toEqual(
      expect.arrayContaining(["^/original-documents", "^/courier-management"]),
    );
    expect(documents?.children?.map((child) => child.id)).toEqual([
      "document-verification",
      "original-document-intake",
      "courier-management",
    ]);
    expect(
      documents?.children?.find((child) => child.id === "original-document-intake"),
    ).toMatchObject({
      label: "Original Document Intake",
      path: "/original-documents",
      permissions: ["read:original_document_intake"],
      roles: ["CEO", "Director", "Manager", "Processing Manager", "System Admin"],
      matchRolesOrPermissions: true,
    });
    expect(
      documents?.children?.find((child) => child.id === "courier-management"),
    ).toMatchObject({
      label: "Courier Management",
      path: "/courier-management",
      permissions: ["read:courier_management"],
      roles: ["CEO", "Director", "Manager", "Processing Manager", "System Admin"],
      matchRolesOrPermissions: true,
    });
  });
});
