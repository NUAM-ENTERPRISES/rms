import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CandidateCountryRestrictionsIndicator } from "./CandidateCountryRestrictionsIndicator";
import { useGetCandidateCountryRestrictionsQuery } from "@/features/candidates/api";

vi.mock("@/features/candidates/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/candidates/api")>();
  return {
    ...actual,
    useGetCandidateCountryRestrictionsQuery: vi.fn(),
  };
});

const mockedUseGetRestrictions = vi.mocked(useGetCandidateCountryRestrictionsQuery);

describe("CandidateCountryRestrictionsIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when there are no active restrictions", () => {
    mockedUseGetRestrictions.mockReturnValue({
      data: {
        items: [],
        pagination: { page: 1, limit: 5, total: 0, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
    } as ReturnType<typeof useGetCandidateCountryRestrictionsQuery>);

    const { container } = render(
      <CandidateCountryRestrictionsIndicator candidateId="candidate-1" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders restricted icon and tooltip details for active restrictions", async () => {
    const user = userEvent.setup();

    mockedUseGetRestrictions.mockReturnValue({
      data: {
        items: [
          {
            id: "restriction-1",
            candidateId: "candidate-1",
            countryCode: "AE",
            restrictionType: "processing_step_cancel",
            reason: "Cancelled during Data Flow",
            sourceMeta: {
              stepKey: "data_flow",
              projectTitle: "Dubai Hospital",
            },
            restrictedAt: "2026-06-19T11:00:00.000Z",
            isActive: true,
            country: { code: "AE", name: "United Arab Emirates" },
            restrictedBy: { id: "mgr-1", name: "Manager One" },
          },
        ],
        pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
    } as ReturnType<typeof useGetCandidateCountryRestrictionsQuery>);

    render(
      <CandidateCountryRestrictionsIndicator
        candidateId="candidate-1"
        highlightCountryCode="AE"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /1 active country restriction/i,
    });
    expect(trigger).toBeInTheDocument();

    await user.hover(trigger);

    const tooltipHeaders = await screen.findAllByText("Country restrictions");
    expect(tooltipHeaders.length).toBeGreaterThan(0);
    expect(screen.getAllByText("United Arab Emirates").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cancelled during Data Flow").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dubai Hospital/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Manager One/).length).toBeGreaterThan(0);
  });
});
