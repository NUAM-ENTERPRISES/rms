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

const NURSE_PROFESSION = {
  id: "prof-nurse",
  name: "nurse",
  label: "Registered Nurse",
  sector: "HEALTHCARE" as const,
};

const DRIVER_PROFESSION = {
  id: "prof-driver",
  name: "driver",
  label: "Driver",
  sector: "NON_HEALTH_CARE" as const,
};

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
              professionTypeId: NURSE_PROFESSION.id,
              professionLabel: NURSE_PROFESSION.label,
              sector: NURSE_PROFESSION.sector,
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
              professionTypeId: DRIVER_PROFESSION.id,
              professionLabel: DRIVER_PROFESSION.label,
              sector: DRIVER_PROFESSION.sector,
            },
          ],
          positiveCandidateProfessions: [
            {
              id: "c1",
              professionTypeId: NURSE_PROFESSION.id,
              professionLabel: NURSE_PROFESSION.label,
              sector: NURSE_PROFESSION.sector,
            },
            {
              id: "c2",
              professionTypeId: DRIVER_PROFESSION.id,
              professionLabel: DRIVER_PROFESSION.label,
              sector: DRIVER_PROFESSION.sector,
            },
          ],
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
              mobileNumber: "9876543210",
              phoneCountryCode: "+91",
              profileImage: null,
              positiveCandidateCount: 7,
              coveredCountryCodes: ["SA"],
              professionScopes: [NURSE_PROFESSION, DRIVER_PROFESSION],
              sectorScopes: ["HEALTHCARE", "NON_HEALTH_CARE"],
            },
            {
              id: "peer2",
              name: "Aysa Ireland",
              email: "aysa@example.com",
              mobileNumber: "9111111111",
              phoneCountryCode: "+353",
              profileImage: null,
              positiveCandidateCount: 3,
              coveredCountryCodes: ["SA"],
              professionScopes: [NURSE_PROFESSION, DRIVER_PROFESSION],
              sectorScopes: ["HEALTHCARE", "NON_HEALTH_CARE"],
            },
          ],
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
  });

  it("submits auto split across selected peers", async () => {
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
      screen.getByRole("button", { name: /select peer recruiters/i }),
    );
    await user.click(
      screen.getByRole("option", {
        name: /peer recruiter, registered nurse, driver, healthcare, non-healthcare, 7 positive candidates/i,
      }),
    );
    await user.click(
      screen.getByRole("option", {
        name: /aysa ireland, registered nurse, driver, healthcare, non-healthcare, 3 positive candidates/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: /select destination country/i }),
    );
    await user.type(
      screen.getByLabelText(/^reason/i),
      "Moving coverage to Ireland",
    );

    await user.click(screen.getByRole("button", { name: /review & confirm/i }));
    expect(screen.getByText(/auto split/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirm & transfer/i }));

    expect(transferMock).toHaveBeenCalledWith({
      sourceCountryCode: "GCC",
      userId: "emma",
      destinationCountryCode: "IE",
      evenSplitAcrossRecruiterIds: ["peer1", "peer2"],
      reason: "Moving coverage to Ireland",
    });
  });

  it("submits manual assignments when peers are chosen per candidate", async () => {
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
      screen.getByRole("button", { name: /select peer recruiters/i }),
    );
    await user.click(
      screen.getByRole("option", {
        name: /peer recruiter, registered nurse, driver, healthcare, non-healthcare, 7 positive candidates/i,
      }),
    );
    await user.click(
      screen.getByRole("option", {
        name: /aysa ireland, registered nurse, driver, healthcare, non-healthcare, 3 positive candidates/i,
      }),
    );

    // Switch off auto split by assigning manually
    await user.selectOptions(
      screen.getByLabelText(/assign ada to recruiter/i),
      "peer1",
    );
    await user.selectOptions(
      screen.getByLabelText(/assign grace to recruiter/i),
      "peer2",
    );

    await user.click(
      screen.getByRole("button", { name: /select destination country/i }),
    );
    await user.type(
      screen.getByLabelText(/^reason/i),
      "Split between Ireland peers",
    );
    await user.click(screen.getByRole("button", { name: /review & confirm/i }));
    await user.click(screen.getByRole("button", { name: /confirm & transfer/i }));

    expect(transferMock).toHaveBeenCalledWith({
      sourceCountryCode: "GCC",
      userId: "emma",
      destinationCountryCode: "IE",
      assignments: [
        { targetRecruiterId: "peer1", candidateIds: ["c1"] },
        { targetRecruiterId: "peer2", candidateIds: ["c2"] },
      ],
      reason: "Split between Ireland peers",
    });
  });

  it("disables review and shows no matching peer when assigned peer lacks profession", async () => {
    const user = userEvent.setup();

    peersMock.mockReturnValue({
      data: {
        success: true,
        data: {
          peers: [
            {
              id: "peer-nurse",
              name: "Nurse Peer",
              email: "nurse@example.com",
              mobileNumber: "9876543210",
              phoneCountryCode: "+91",
              profileImage: null,
              positiveCandidateCount: 5,
              coveredCountryCodes: ["SA"],
              professionScopes: [NURSE_PROFESSION],
              sectorScopes: ["HEALTHCARE"],
            },
            {
              id: "peer-driver",
              name: "Driver Peer",
              email: "driver@example.com",
              mobileNumber: "9111111111",
              phoneCountryCode: "+353",
              profileImage: null,
              positiveCandidateCount: 2,
              coveredCountryCodes: ["SA"],
              professionScopes: [DRIVER_PROFESSION],
              sectorScopes: ["NON_HEALTH_CARE"],
            },
          ],
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    });

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
      screen.getByRole("button", { name: /select peer recruiters/i }),
    );
    await user.click(
      screen.getByRole("option", {
        name: /nurse peer, registered nurse, healthcare, 5 positive candidates/i,
      }),
    );
    await user.click(
      screen.getByRole("option", {
        name: /driver peer, driver, non-healthcare, 2 positive candidates/i,
      }),
    );

    await user.selectOptions(
      screen.getByLabelText(/assign ada to recruiter/i),
      "peer-driver",
    );
    await user.selectOptions(
      screen.getByLabelText(/assign grace to recruiter/i),
      "peer-driver",
    );

    await user.click(
      screen.getByRole("button", { name: /select destination country/i }),
    );
    await user.type(
      screen.getByLabelText(/^reason/i),
      "Attempt mismatched assignment",
    );

    expect(screen.getByText("Can't hand over")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /review & confirm/i }),
    ).toBeDisabled();
  });
});
