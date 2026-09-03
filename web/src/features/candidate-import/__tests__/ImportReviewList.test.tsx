import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  IMPORT_ROW_PAGE_SIZE,
  ImportRowList,
  paginateRows,
} from "../components/ImportRowList";
import { RecruiterCombobox } from "../components/RecruiterCombobox";
import type { ImportRow, NormalizedRow, RecruiterOption } from "../data/dto";

vi.mock("@/hooks", () => ({
  useDebounce: <T,>(value: T) => value,
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: <T,>(value: T) => value,
}));

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
    qualification: "",
    department: "",
    licensingExam: undefined,
    dataFlow: undefined,
    preferredCountries: [],
    remarks: undefined,
    source: "meta",
    rawLeadSource: "METAA",
    ...overrides,
  } as NormalizedRow;
}

function makeRow(index: number): ImportRow {
  return {
    id: `row_${index}`,
    batchId: "batch_1",
    sheetName: "SIVA",
    rowNumber: index + 1,
    rawData: {},
    normalized: normalized({
      firstName: `Person${String(index + 1).padStart(2, "0")}`,
      lastName: null,
      mobileNumber: `90000000${String(index).padStart(2, "0")}`,
    }),
    mapping: null,
    issues: null,
    status: "ready",
    recruiterId: "u_siva",
    candidateId: null,
    error: null,
  };
}

describe("paginateRows", () => {
  it("pages at the import list limit of 20", () => {
    const items = Array.from({ length: 45 }, (_, index) => index);
    const first = paginateRows(items, 1, IMPORT_ROW_PAGE_SIZE);
    const second = paginateRows(items, 2, IMPORT_ROW_PAGE_SIZE);
    const third = paginateRows(items, 3, IMPORT_ROW_PAGE_SIZE);

    expect(IMPORT_ROW_PAGE_SIZE).toBe(20);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(20);
    expect(third.items).toHaveLength(5);
    expect(third.totalPages).toBe(3);
    expect(third.start).toBe(40);
    expect(third.end).toBe(45);
  });

  it("clamps an out-of-range page back into the list", () => {
    const result = paginateRows([1, 2, 3], 99, 20);
    expect(result.page).toBe(1);
    expect(result.items).toEqual([1, 2, 3]);
  });
});

describe("ImportRowList", () => {
  it("shows twenty candidates per page and pages to the rest", async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 25 }, (_, index) => makeRow(index));
    const onSelect = vi.fn();

    render(
      <ImportRowList
        rows={rows}
        selectedRowId="row_0"
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("Person01")).toBeInTheDocument();
    expect(screen.getByText("Person20")).toBeInTheDocument();
    expect(screen.queryByText("Person21")).not.toBeInTheDocument();
    expect(screen.getByText("1–20 of 25")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next page/i }));

    expect(screen.getByText("Person21")).toBeInTheDocument();
    expect(screen.getByText("21–25 of 25")).toBeInTheDocument();
  });

  it("filters the list by name search", async () => {
    const user = userEvent.setup();
    const rows = [makeRow(0), makeRow(1)];
    rows[1].normalized.firstName = "SILVIMOL";

    render(
      <ImportRowList
        rows={rows}
        selectedRowId="row_0"
        onSelect={vi.fn()}
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: /search candidates/i }),
      "silvimol",
    );

    expect(screen.getByText("SILVIMOL")).toBeInTheDocument();
    expect(screen.queryByText("Person01")).not.toBeInTheDocument();
  });
});

describe("RecruiterCombobox", () => {
  const recruiters: RecruiterOption[] = Array.from({ length: 12 }, (_, index) => ({
    id: `u_${index}`,
    name: `Recruiter ${index + 1}`,
    email: `r${index + 1}@affiniks.com`,
  }));

  it("searches recruiters and paginates the dropdown", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <RecruiterCombobox
        recruiters={recruiters}
        value=""
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByText("Recruiter 1")).toBeInTheDocument();
    expect(screen.getByText("Recruiter 10")).toBeInTheDocument();
    expect(screen.queryByText("Recruiter 11")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /next recruiters page/i }),
    );
    expect(screen.getByText("Recruiter 11")).toBeInTheDocument();

    const search = screen.getByRole("textbox", { name: /search recruiters/i });
    await user.clear(search);
    await user.type(search, "r12@affiniks.com");

    expect(await screen.findByText("Recruiter 12")).toBeInTheDocument();
    expect(screen.queryByText("Recruiter 11")).not.toBeInTheDocument();

    await user.click(screen.getByText("Recruiter 12"));
    expect(onValueChange).toHaveBeenCalledWith("u_11");
  });
});
