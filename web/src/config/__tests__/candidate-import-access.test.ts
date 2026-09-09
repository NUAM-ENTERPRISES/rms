import { describe, expect, it } from "vitest";
import { CANDIDATE_IMPORT_AND_AI_ROLES } from "../candidate-import-access";
import { ROLE_NAMES } from "../role-names";
import { canAccess } from "@/shared/utils/canAccess";

describe("candidate import access", () => {
  it("lets a Recruitment Executive use import and AI classify by role", () => {
    const recruiter = {
      roles: ["Recruitment Executive"],
      permissions: ["write:candidates"],
    };

    expect(
      canAccess(recruiter, {
        roles: [...CANDIDATE_IMPORT_AND_AI_ROLES],
        permissions: ["import:candidates"],
        matchRolesOrPermissions: true,
      }),
    ).toBe(true);
    expect(
      canAccess(recruiter, {
        roles: [...CANDIDATE_IMPORT_AND_AI_ROLES],
        permissions: ["ai_classify:candidate_documents"],
        matchRolesOrPermissions: true,
      }),
    ).toBe(true);
  });

  it("still lets a Manager through by wildcard permission", () => {
    expect(
      canAccess(
        { roles: [ROLE_NAMES.MANAGER], permissions: ["*"] },
        {
          roles: [...CANDIDATE_IMPORT_AND_AI_ROLES],
          permissions: ["import:candidates"],
          matchRolesOrPermissions: true,
        },
      ),
    ).toBe(true);
  });
});
