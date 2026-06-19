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

  it("groups intake and courier under Document Management for leadership roles", () => {
    const documentManagement = navigationConfig.find(
      (item) => item.id === "document-management",
    );

    expect(documentManagement).toMatchObject({
      label: "Document Management",
      roles: DOCUMENT_MANAGEMENT_ROLES,
      activePathPatterns: ["^/original-documents", "^/courier-management"],
    });
    expect(documentManagement?.children).toHaveLength(2);
    expect(documentManagement?.children?.[0]).toMatchObject({
      id: "document-management-intake",
      label: "Original Document Intake",
      path: "/original-documents",
      permissions: ["read:original_document_intake"],
      roles: DOCUMENT_MANAGEMENT_ROLES,
      matchRolesOrPermissions: true,
    });
    expect(documentManagement?.children?.[1]).toMatchObject({
      id: "document-management-courier",
      label: "Courier Management",
      path: "/courier-management",
      permissions: ["read:courier_management"],
      roles: DOCUMENT_MANAGEMENT_ROLES,
      matchRolesOrPermissions: true,
    });
  });

  it("hides duplicate intake under Documents for Document Management roles", () => {
    const documents = navigationConfig.find((item) => item.id === "documents");
    const intakeChild = documents?.children?.find(
      (child) => child.id === "original-document-intake",
    );

    expect(intakeChild?.hiddenForRoles).toEqual(DOCUMENT_MANAGEMENT_ROLES);
  });
});
