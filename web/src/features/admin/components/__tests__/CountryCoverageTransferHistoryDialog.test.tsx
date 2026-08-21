import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CountryCoverageTransferHistoryDialog } from "../CountryCoverageTransferHistoryDialog";

vi.mock("@/hooks/useCan", () => ({
  useCan: () => true,
}));

const historyMock = vi.fn();
const candidatesMock = vi.fn();

vi.mock("../../api/countryCoverageApi", () => ({
  useGetCountryCoverageTransferHistoryQuery: (...args: unknown[]) =>
    historyMock(...args),
  useGetCountryCoverageTransferHistoryCandidatesQuery: (...args: unknown[]) =>
    candidatesMock(...args),
}));

describe("CountryCoverageTransferHistoryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    historyMock.mockReturnValue({
      data: {
        success: true,
        data: {
          items: [
            {
              id: "t1",
              createdAt: "2026-07-17T10:00:00.000Z",
              reason: "Move to Ireland",
              transferMode: "manual",
              candidateCount: 400,
              sourceUser: { id: "emma", name: "Emma" },
              transferredBy: { id: "manager1", name: "Department Head" },
              sourceCountryCode: "SA",
              sourceCountryCodes: ["SA"],
              destinationCountryCode: "IE",
              destinationCountryCodes: ["IE"],
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    candidatesMock.mockReturnValue({
      data: {
        success: true,
        data: {
          transferId: "t1",
          createdAt: "2026-07-17T10:00:00.000Z",
          candidateCount: 400,
          items: [
            {
              candidateId: "c1",
              candidateName: "Abhi Kumar",
              statusName: "Interested",
              fromRecruiter: { id: "emma", name: "Emma" },
              toRecruiter: { id: "john", name: "John" },
            },
          ],
          pagination: { page: 1, limit: 10, total: 400, totalPages: 40 },
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
  });

  it("loads candidate handoffs on expand with pagination", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CountryCoverageTransferHistoryDialog
          open
          onOpenChange={vi.fn()}
          countryCode="IE"
          countryName="Ireland"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /coverage transfer history — ie/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.textContent === "Emma coverage moved"),
    ).toBeInTheDocument();
    expect(screen.getByText(/400 candidates/i)).toBeInTheDocument();
    expect(screen.queryByText("Abhi Kumar")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /view candidate handoffs \(400\)/i }),
    );

    expect(candidatesMock).toHaveBeenCalledWith({
      countryCode: "IE",
      transferId: "t1",
      page: 1,
      limit: 10,
    });
    expect(screen.getByText("Abhi Kumar")).toBeInTheDocument();
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText(/interested/i)).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 40 · 400 candidates/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next candidates page/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abhi Kumar" }),
    ).toHaveAttribute("href", "/candidates/c1");
  });
});
