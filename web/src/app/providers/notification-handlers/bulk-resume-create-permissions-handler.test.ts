import { describe, it, expect, vi } from "vitest";
import {
  handleBulkResumeCreatePermissionsSync,
  BULK_RESUME_CREATE_PERMISSIONS_SYNC_TYPE,
} from "./bulk-resume-create-permissions-handler";

describe("bulk-resume-create-permissions-handler", () => {
  it("handles BulkResumeCreatePermissionsUpdated data:sync payloads", () => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({
      auth: {
        user: {
          id: "user-1",
          permissions: ["write:candidates"],
          roles: ["Recruiter"],
        },
      },
    }));

    const handled = handleBulkResumeCreatePermissionsSync(
      {
        type: BULK_RESUME_CREATE_PERMISSIONS_SYNC_TYPE,
        userId: "user-1",
        updatedAt: new Date().toISOString(),
        roles: ["Recruiter"],
        permissions: ["write:candidates", "write:candidates_bulk_resume"],
        userVersion: 2,
      },
      dispatch as never,
      getState as never,
    );

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalled();
  });

  it("ignores unrelated sync types", () => {
    const dispatch = vi.fn();
    const getState = vi.fn();
    expect(
      handleBulkResumeCreatePermissionsSync(
        { type: "Other", userId: "x", updatedAt: "", roles: [], permissions: [], userVersion: 1 },
        dispatch as never,
        getState as never,
      ),
    ).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
