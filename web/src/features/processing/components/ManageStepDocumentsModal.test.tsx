import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ManageStepDocumentsModal from "./ManageStepDocumentsModal";

const mockCreateRule = vi.fn();
const mockUpdateRule = vi.fn();
const mockDeleteRule = vi.fn();
const mockUseCan = vi.fn();

let mockQueryData = {
  countryCode: "IN",
  rules: [] as Array<{
    id: string;
    docType: string;
    label: string;
    mandatory: boolean;
    sourceCountryCode: string;
    isEditable: boolean;
    overridesGlobal?: boolean;
  }>,
  existingCountryDocTypes: [] as string[],
  existingGlobalDocTypes: [] as string[],
};

vi.mock("@/hooks/useCan", () => ({
  useCan: (perm: string) => mockUseCan(perm),
}));

vi.mock("@/services/processingApi", () => ({
  useGetStepRequirementRulesQuery: () => ({
    data: mockQueryData,
    isLoading: false,
  }),
  useCreateStepRequirementRuleMutation: () => [
    mockCreateRule,
    { isLoading: false },
  ],
  useUpdateStepRequirementRuleMutation: () => [
    mockUpdateRule,
    { isLoading: false },
  ],
  useDeleteStepRequirementRuleMutation: () => [
    mockDeleteRule,
    { isLoading: false },
  ],
}));

describe("ManageStepDocumentsModal", () => {
  beforeEach(() => {
    mockQueryData = {
      countryCode: "IN",
      rules: [],
      existingCountryDocTypes: [],
      existingGlobalDocTypes: [],
    };
    mockCreateRule.mockReset();
    mockUpdateRule.mockReset();
    mockDeleteRule.mockReset();
    mockUseCan.mockReset();
    mockUseCan.mockReturnValue(true);
    mockCreateRule.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ success: true }),
    });
  });

  it("shows permission warning when user lacks write:processing", () => {
    mockUseCan.mockReturnValue(false);

    render(
      <ManageStepDocumentsModal
        isOpen
        onClose={vi.fn()}
        processingId="pc-1"
        stepKey="hrd"
        stepLabel="HRD"
      />,
    );

    expect(screen.getByText(/write:processing/i)).toBeInTheDocument();
    expect(
      screen.getByText(/manage step document requirements/i),
    ).toBeInTheDocument();
  });

  it("shows add controls and scope selector for users with write permission", () => {
    render(
      <ManageStepDocumentsModal
        isOpen
        onClose={vi.fn()}
        processingId="pc-1"
        stepKey="hrd"
        stepLabel="HRD"
      />,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add requirement/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /this country \(IN\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /global \(all countries\)/i }),
    ).toBeInTheDocument();
    expect(mockCreateRule).not.toHaveBeenCalled();
  });

  it("allows country-scope add when only a global rule exists for doc type", () => {
    mockQueryData = {
      countryCode: "IN",
      rules: [
        {
          id: "all-1",
          docType: "degree_certificate",
          label: "Degree Certificate",
          mandatory: true,
          sourceCountryCode: "ALL",
          isEditable: true,
        },
      ],
      existingCountryDocTypes: [],
      existingGlobalDocTypes: ["degree_certificate"],
    };

    render(
      <ManageStepDocumentsModal
        isOpen
        onClose={vi.fn()}
        processingId="pc-1"
        stepKey="hrd"
        stepLabel="HRD"
      />,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(
      screen.queryByText(/all types already added/i),
    ).not.toBeInTheDocument();
  });

  it("shows overrides global badge on country override rules", () => {
    mockQueryData = {
      countryCode: "IN",
      rules: [
        {
          id: "in-1",
          docType: "degree_certificate",
          label: "Degree Certificate",
          mandatory: false,
          sourceCountryCode: "IN",
          isEditable: true,
          overridesGlobal: true,
        },
      ],
      existingCountryDocTypes: ["degree_certificate"],
      existingGlobalDocTypes: ["degree_certificate"],
    };

    render(
      <ManageStepDocumentsModal
        isOpen
        onClose={vi.fn()}
        processingId="pc-1"
        stepKey="hrd"
        stepLabel="HRD"
      />,
    );

    expect(screen.getByText(/overrides global/i)).toBeInTheDocument();
  });

  it("shows global warning when global scope is selected", async () => {
    const user = userEvent.setup();

    render(
      <ManageStepDocumentsModal
        isOpen
        onClose={vi.fn()}
        processingId="pc-1"
        stepKey="hrd"
        stepLabel="HRD"
      />,
    );

    await user.click(
      screen.getByRole("tab", { name: /global \(all countries\)/i }),
    );

    expect(screen.getByText(/this affects all countries/i)).toBeInTheDocument();
  });
});
