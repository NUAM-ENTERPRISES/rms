import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportRowEditor } from "../components/ImportRowEditor";
import type { ImportRow, NormalizedRow, RecruiterOption } from "../data/dto";

vi.mock("@/shared/hooks/useQualificationsLookup", () => ({
  useQualificationsLookup: () => ({
    qualifications: [
      { id: "q_bsc_nursing", name: "BSc Nursing", shortName: "BSc Nursing" },
    ],
    isLoading: false,
    error: undefined,
    success: true,
  }),
}));

const RECRUITERS: RecruiterOption[] = [
  { id: "u_siva", name: "Siva", email: "siva@affiniks.com" },
  { id: "u_fernandez", name: "Fernandez", email: "fernandez@affiniks.com" },
];

function normalized(overrides: Partial<NormalizedRow> = {}): NormalizedRow {
  return {
    firstName: "Abhi",
    lastName: "Kumar",
    countryCode: "+91",
    mobileNumber: "7893578949",
    email: null,
    passportNumber: null,
    gender: "MALE",
    category: "NURSE",
    qualification: "BSc Nursing",
    department: "ICU",
    licensingExam: undefined,
    dataFlow: undefined,
    preferredCountries: [],
    remarks: undefined,
    source: "meta",
    rawLeadSource: "METAA",
    ...overrides,
  } as NormalizedRow;
}

function row(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: "row_1",
    batchId: "batch_1",
    sheetName: "SIVA",
    rowNumber: 4,
    rawData: {},
    normalized: normalized(),
    mapping: null,
    issues: null,
    status: "ready",
    recruiterId: "u_siva",
    candidateId: null,
    error: null,
    ...overrides,
  };
}

describe("ImportRowEditor", () => {
  const props = {
    recruiters: RECRUITERS,
    onSave: vi.fn(),
    onSkip: vi.fn(),
    onCatalogChange: vi.fn(),
    onProposeQualification: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefills the parsed values so a clean row needs no typing", () => {
    render(<ImportRowEditor row={row()} {...props} />);

    expect(screen.getByDisplayValue("Abhi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("7893578949")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+91")).toBeInTheDocument();
  });

  it("saves the corrected values", async () => {
    const user = userEvent.setup();
    render(<ImportRowEditor row={row()} {...props} />);

    const firstName = screen.getByLabelText(/first name/i);
    await user.clear(firstName);
    await user.type(firstName, "Abhilash");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(props.onSave).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: "Abhilash" })
      );
    });
  });

  it("refuses to save a row with no first name", async () => {
    const user = userEvent.setup();
    render(<ImportRowEditor row={row()} {...props} />);

    await user.clear(screen.getByLabelText(/first name/i));
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("refuses to save a mobile number that is not plain digits", async () => {
    const user = userEvent.setup();
    render(<ImportRowEditor row={row()} {...props} />);

    const mobile = screen.getByLabelText(/mobile/i);
    await user.clear(mobile);
    await user.type(mobile, "789 357 8949");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/6 to 15 digits/i)).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("refuses to save a country code without the leading plus", async () => {
    const user = userEvent.setup();
    render(<ImportRowEditor row={row()} {...props} />);

    const countryCode = screen.getByLabelText(/country code/i);
    await user.clear(countryCode);
    await user.type(countryCode, "91");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/format like \+91/i)).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("shows the issues that stop a row from importing", () => {
    render(
      <ImportRowEditor
        row={row({
          status: "duplicate",
          issues: [
            {
              type: "DUPLICATE_IN_DATABASE",
              severity: "error",
              message: "Already in the CRM as Abhi Kumar (AFF-0007).",
            },
          ],
        })}
        {...props}
      />
    );

    expect(screen.getByText(/AFF-0007/)).toBeInTheDocument();
  });

  it("lets a reviewer skip a row instead of fixing it", async () => {
    const user = userEvent.setup();
    render(<ImportRowEditor row={row()} {...props} />);

    await user.click(screen.getByRole("button", { name: /skip/i }));

    expect(props.onSkip).toHaveBeenCalled();
  });
});
