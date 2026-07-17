import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransferCountryCoverageDialog } from "../TransferCountryCoverageDialog";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

vi.mock("@/components/molecules/CountrySelect", () => ({
  CountrySelect: ({
    value,
    onValueChange,
  }: {
    value?: string;
    onValueChange?: (code: string) => void;
  }) => (
    <button
      type="button"
      onClick={() => onValueChange?.("IE")}
      aria-label="Select destination country"
    >
      {value || "Select destination country..."}
    </button>
  ),
}));

vi.mock("@/components/molecules", () => ({
  ImageViewer: ({ title }: { title: string }) => (
    <div aria-label={`Photo of ${title}`} />
  ),
}));

const transferMock = vi.fn();
const previewMock = vi.fn();
const peersMock = vi.fn();

vi.mock("../../api/countryCoverageApi", () => ({
  useGetCountryCoverageTransferPreviewQuery: (...args: unknown[]) =>
    previewMock(...args),
  useGetCountryCoverageTransferPeersQuery: (...args: unknown[]) =>
    peersMock(...args),
  useTransferCountryCoverageMutation: () => [
    transferMock,
    { isLoading: false },
  ],
}));

describe("TransferCountryCoverageDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transferMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        message: "Transferred",
        data: {},
      }),
    });
    previewMock.mockReturnValue({
      data: {
        success: true,
        data: {
          sourceUser: { id: "emma", name: "Emma", email: "emma@example.com" },
          sourceCountryCode: "GCC",
          sourceCountryCodes: ["SA", "AE", "QA", "OM", "BH", "KW"],
          positiveCandidates: [
            {
              id: "c1",
              firstName: "Ada",
              lastName: "Lovelace",
              name: "Ada Lovelace",
              email: "ada@example.com",
              mobileNumber: "9876543210",
              phoneCountryCode: "+91",
              profileImage: null,
              statusName: "Interested",
            },
            {
              id: "c2",
              firstName: "Grace",
              lastName: "Hopper",
              name: "Grace Hopper",
              email: "grace@example.com",
              mobileNumber: "9123456780",
              phoneCountryCode: "+91",
              profileImage: null,
              statusName: "Future",
            },
          ],
          allPositiveCandidateIds: ["c1", "c2"],
          currentCoverages: [
            {
              countryCode: "SA",
              countryName: "Saudi Arabia",
              sectorScopes: ["HEALTHCARE"],
            },
          ],
          requiresCandidateHandoff: true,
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    peersMock.mockReturnValue({
      data: {
        success: true,
        data: {
          peers: [
            {
              id: "peer1",
              name: "Peer Recruiter",
              email: "peer@example.com",
              coveredCountryCodes: ["SA"],
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
  });

  it("loads peers via separate API when dropdown opens", async () => {
    const user = userEvent.setup();

    render(
      <TransferCountryCoverageDialog
        open
        onOpenChange={vi.fn()}
        sourceCountryCode="GCC"
        userId="emma"
        userName="Emma"
      />,
    );

    expect(previewMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
      expect.anything(),
    );
    expect(peersMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true }),
    );

    await user.click(
      screen.getByRole("button", { name: /select a peer recruiter/i }),
    );

    expect(peersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceCountryCode: "GCC",
        userId: "emma",
        page: 1,
        limit: 10,
      }),
      expect.objectContaining({ skip: false }),
    );
    expect(screen.getByRole("option", { name: /peer recruiter/i })).toBeInTheDocument();
  });

  it("pages peers without changing preview page args", async () => {
    const user = userEvent.setup();
    peersMock.mockImplementation((args: { page?: number }) => ({
      data: {
        success: true,
        data: {
          peers: [
            {
              id: `peer-${args?.page ?? 1}`,
              name: `Peer Page ${args?.page ?? 1}`,
              email: "peer@example.com",
              coveredCountryCodes: ["SA"],
            },
          ],
          pagination: {
            page: args?.page ?? 1,
            limit: 10,
            total: 12,
            totalPages: 2,
          },
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    }));

    render(
      <TransferCountryCoverageDialog
        open
        onOpenChange={vi.fn()}
        sourceCountryCode="GCC"
        userId="emma"
        userName="Emma"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /select a peer recruiter/i }),
    );
    expect(screen.getByText("Peer Page 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next peers page/i }));

    expect(peersMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10 }),
      expect.anything(),
    );
    expect(screen.getByText("Peer Page 2")).toBeInTheDocument();
    // Candidate preview stays on page 1 — peer paging uses the peers API only.
    expect(previewMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
      expect.anything(),
    );
    expect(previewMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything(),
    );
  });

  it("submits transfer with selected peer and all candidates", async () => {
    const user = userEvent.setup();

    render(
      <TransferCountryCoverageDialog
        open
        onOpenChange={vi.fn()}
        sourceCountryCode="GCC"
        userId="emma"
        userName="Emma"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /select a peer recruiter/i }),
    );
    await user.click(screen.getByRole("option", { name: /peer recruiter/i }));
    await user.click(
      screen.getByRole("button", { name: /select destination country/i }),
    );

    await user.click(screen.getByRole("button", { name: /review & confirm/i }));
    await user.click(screen.getByRole("button", { name: /confirm transfer/i }));

    expect(transferMock).toHaveBeenCalledWith({
      sourceCountryCode: "GCC",
      userId: "emma",
      destinationCountryCode: "IE",
      targetRecruiterId: "peer1",
      candidateIds: ["c1", "c2"],
      reason: undefined,
    });
  });
});
