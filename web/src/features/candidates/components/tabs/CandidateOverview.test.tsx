import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CandidateOverview } from "./CandidateOverview";
import type { Candidate } from "../../api";

vi.mock("@/shared", () => ({
  FlagIcon: () => null,
}));

vi.mock("@/components/molecules", () => ({
  CandidateResumeList: () => null,
}));

vi.mock("@/components/molecules/PDFViewer", () => ({
  PDFViewer: () => null,
}));

vi.mock("../CandidateActivitySnapshot", () => ({
  CandidateActivitySnapshot: () => null,
}));

vi.mock("../CandidateCountryRestrictionsSection", () => ({
  CandidateCountryRestrictionsSection: () => null,
}));

const baseCandidate = {
  id: "cand-1",
  firstName: "Ada",
  lastName: "Lovelace",
  contact: "+919876543210",
  source: "manual",
  dateOfBirth: "1990-01-01T00:00:00.000Z",
  currentStatus: { id: 1, statusName: "Untouched" },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  mobileNumber: "9876543210",
  countryCode: "+91",
} as Candidate;

const noop = () => undefined;

describe("CandidateOverview current / overseas contact", () => {
  it("renders current contact number and overseas address when present", () => {
    render(
      <CandidateOverview
        candidate={{
          ...baseCandidate,
          currentContactCountryCode: "+971",
          currentContactNumber: "501234567",
          currentAddress: "Marina Walk 12",
          currentAddressPincode: "00000",
          currentAddressCountryCode: "AE",
          currentAddressCountry: { code: "AE", name: "United Arab Emirates" },
          currentAddressState: { id: "st-dubai", name: "Dubai", code: "DU" },
        }}
        canWriteCandidates={false}
        openAddModal={noop}
        openEditModal={noop}
      />,
    );

    expect(screen.getByText("Current / overseas contact")).toBeInTheDocument();
    expect(screen.getByText("+971 501234567")).toBeInTheDocument();
    expect(screen.getByText("United Arab Emirates")).toBeInTheDocument();
    expect(screen.getByText("Dubai")).toBeInTheDocument();
    expect(screen.getByText("Marina Walk 12")).toBeInTheDocument();
    expect(screen.getByText("00000")).toBeInTheDocument();
  });

  it("renders N/A for empty current contact fields", () => {
    render(
      <CandidateOverview
        candidate={baseCandidate}
        canWriteCandidates={false}
        openAddModal={noop}
        openEditModal={noop}
      />,
    );

    expect(screen.getByText("Current / overseas contact")).toBeInTheDocument();
    expect(screen.getByText("Current contact number")).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });
});
