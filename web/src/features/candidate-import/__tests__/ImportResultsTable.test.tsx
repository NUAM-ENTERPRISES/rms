import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ImportResultsTable } from "../components/ImportResultsTable";
import type { ImportRowResult } from "../data/dto";

function result(
  overrides: Partial<ImportRowResult> & Pick<ImportRowResult, "rowId">,
): ImportRowResult {
  return {
    sheetName: "DILJITH",
    rowNumber: 2,
    success: true,
    candidateId: "cand_1",
    candidateCode: "AFF-0001",
    firstName: "SILVIMOL",
    lastName: null,
    countryCode: "+91",
    mobileNumber: "9527714734",
    email: null,
    professionLabel: "Nurse",
    gender: "FEMALE",
    ...overrides,
  };
}

describe("ImportResultsTable", () => {
  it("shows created candidates with name, profession, phone and profile link", () => {
    render(
      <MemoryRouter>
        <ImportResultsTable
          results={[
            result({ rowId: "r1" }),
            result({
              rowId: "r2",
              rowNumber: 3,
              firstName: "SANJANA",
              candidateId: "cand_2",
              candidateCode: "AFF-0002",
              mobileNumber: "9000000001",
            }),
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("SILVIMOL")).toBeInTheDocument();
    expect(screen.getByText("SANJANA")).toBeInTheDocument();
    expect(screen.getAllByText("Nurse")).toHaveLength(2);
    expect(screen.getByText(/\+91 9527714734/)).toBeInTheDocument();
    expect(screen.getByText("AFF-0001")).toBeInTheDocument();

    const link = screen.getAllByRole("link", { name: /open profile/i })[0];
    expect(link).toHaveAttribute("href", "/candidates/cand_1");
  });

  it("filters to failed rows and shows the error", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ImportResultsTable
          results={[
            result({ rowId: "ok" }),
            result({
              rowId: "bad",
              success: false,
              candidateId: undefined,
              candidateCode: null,
              firstName: "FAILEDONE",
              error: "Duplicate mobile number",
            }),
          ]}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /^failed$/i }));

    expect(screen.getByText("FAILEDONE")).toBeInTheDocument();
    expect(screen.getByText("Duplicate mobile number")).toBeInTheDocument();
    expect(screen.queryByText("SILVIMOL")).not.toBeInTheDocument();
  });
});
