import { describe, it, expect, vi } from "vitest";
import {
  handleCountryCoverageTransferNotifications,
  handleCountryCoverageTransferSync,
} from "./country-coverage-transfer-handler";

describe("country-coverage-transfer-handler", () => {
  it("invalidates coverage tags on recruiter_country_coverage_transferred notification", () => {
    const dispatch = vi.fn();
    const invalidateTags = vi.fn((tags) => ({ type: "invalidate", payload: tags }));

    const handled = handleCountryCoverageTransferNotifications({
      notification: {
        type: "recruiter_country_coverage_transferred",
        title: "Country Coverage Transferred",
        message: "Emma moved to Ireland",
      },
      dispatch,
      invalidateTags,
    });

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.arrayContaining([
          "CountryCoverage",
          "User",
          "Candidate",
          "RecruiterAssignment",
          { type: "Candidate", id: "LIST" },
        ]),
      }),
    );
  });

  it("handles role_notification when meta.type is recruiter_country_coverage_transferred", () => {
    const dispatch = vi.fn();
    const invalidateTags = vi.fn((tags) => ({ type: "invalidate", payload: tags }));

    const handled = handleCountryCoverageTransferNotifications({
      notification: {
        type: "role_notification",
        meta: { type: "recruiter_country_coverage_transferred" },
        message: "Coverage moved",
      },
      dispatch,
      invalidateTags,
    });

    expect(handled).toBe(true);
  });

  it("invalidates tags on RecruiterCountryCoverageTransferred data sync", () => {
    const dispatch = vi.fn();
    const invalidateTags = vi.fn((tags) => ({ type: "invalidate", payload: tags }));

    const handled = handleCountryCoverageTransferSync(
      {
        type: "RecruiterCountryCoverageTransferred",
        message: "Coverage transferred",
      },
      { dispatch, invalidateTags },
    );

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.arrayContaining(["CountryCoverage", "User"]),
      }),
    );
  });

  it("returns false for unrelated notifications", () => {
    const handled = handleCountryCoverageTransferNotifications({
      notification: { type: "candidate_transferred" },
      dispatch: vi.fn(),
      invalidateTags: vi.fn(),
    });
    expect(handled).toBe(false);
  });
});
