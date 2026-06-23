import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CandidateCountryRestrictionsSection } from "./CandidateCountryRestrictionsSection";
import * as candidatesApi from "@/features/candidates/api";

vi.mock("@/features/candidates/api", async () => {
  const actual = await vi.importActual("@/features/candidates/api");
  return {
    ...actual,
    useGetCandidateCountryRestrictionsQuery: vi.fn(),
    useLiftCandidateCountryRestrictionMutation: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("CandidateCountryRestrictionsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(candidatesApi.useLiftCandidateCountryRestrictionMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ] as never);
  });

  it("shows N/A when there are no active restrictions", () => {
    vi.mocked(candidatesApi.useGetCandidateCountryRestrictionsQuery).mockReturnValue({
      data: {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
    } as never);

    render(
      <CandidateCountryRestrictionsSection
        candidateId="cand-1"
        canEdit={false}
      />,
    );

    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Manage country restrictions/i })).not.toBeInTheDocument();
  });

  it("shows restriction badges and manage icon for editors", () => {
    vi.mocked(candidatesApi.useGetCandidateCountryRestrictionsQuery).mockReturnValue({
      data: {
        items: [
          {
            id: "r1",
            candidateId: "cand-1",
            countryCode: "SA",
            restrictionType: "processing_step_cancel",
            reason: "Cancelled during Data Flow",
            restrictedAt: "2026-06-22T10:00:00.000Z",
            isActive: true,
            country: { code: "SA", name: "Saudi Arabia" },
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
    } as never);

    render(
      <CandidateCountryRestrictionsSection
        candidateId="cand-1"
        canEdit
      />,
    );

    expect(screen.getByText("Saudi Arabia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Manage country restrictions/i })).toBeInTheDocument();
  });

  it("hides manage icon for read-only users", () => {
    vi.mocked(candidatesApi.useGetCandidateCountryRestrictionsQuery).mockReturnValue({
      data: {
        items: [
          {
            id: "r1",
            candidateId: "cand-1",
            countryCode: "SA",
            restrictionType: "processing_step_cancel",
            reason: "Cancelled during Data Flow",
            restrictedAt: "2026-06-22T10:00:00.000Z",
            isActive: true,
            country: { code: "SA", name: "Saudi Arabia" },
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
    } as never);

    render(
      <CandidateCountryRestrictionsSection
        candidateId="cand-1"
        canEdit={false}
      />,
    );

    expect(screen.getByText("Saudi Arabia")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Manage country restrictions/i })).not.toBeInTheDocument();
  });
});
