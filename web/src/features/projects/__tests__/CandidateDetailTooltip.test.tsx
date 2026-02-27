import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { CandidateDetailTooltip } from "../components/CandidateDetailTooltip";

describe("CandidateDetailTooltip - additional fields", () => {
  it("renders qualification, years of experience and department", async () => {
    const candidate = {
      id: "c1",
      firstName: "Q",
      lastName: "Tester",
      email: "email@example.com",
      countryCode: "+91",
      mobileNumber: "9999999999",
      candidateQualifications: [
        { id: "cq1", name: "Bachelor of Science", level: "bachelor", field: "Nursing", university: "XYZ" },
      ],
      totalExperience: 5,
      matchScore: { roleDepartmentLabel: "Emergency Department" },
    } as any;

    render(
      <CandidateDetailTooltip candidate={candidate}>
        <button>Open</button>
      </CandidateDetailTooltip>
    );

    await userEvent.hover(screen.getByText("Open"));

    // Qualification label + value (tooltip may render duplicates for accessibility)
    expect((await screen.findAllByText(/Qualification:/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Bachelor of Science/i)).length).toBeGreaterThan(0);

    // Experience (human friendly) and numeric years
    expect((await screen.findAllByText(/Experience/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Total Experience:/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Years:/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/5 years/i)).length).toBeGreaterThan(0);

    // Department under Personal
    expect((await screen.findAllByText(/Personal/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Department:/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Emergency Department/i)).length).toBeGreaterThan(0);

    // contact details should also render
    expect((await screen.findAllByText(/email@example.com/)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/\+91 9999999999/)).length).toBeGreaterThan(0);
  });

  it("shows detailed work experience entries when provided", async () => {
    const candidate = {
      id: "c2",
      firstName: "Work",
      lastName: "Hist",
      workExperiences: [
        { companyName: "Acme Hospital", jobTitle: "Staff Nurse", startDate: "2019-02-01", endDate: "2021-08-01", location: "Mumbai" },
        { companyName: "City Clinic", jobTitle: "Senior Nurse", startDate: "2021-09-01" },
      ],
    } as any;

    render(
      <CandidateDetailTooltip candidate={candidate}>
        <button>Open</button>
      </CandidateDetailTooltip>
    );

    await userEvent.hover(screen.getByText("Open"));

    // Work history header + entries
    expect((await screen.findAllByText(/Work history/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Staff Nurse/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Acme Hospital/i)).length).toBeGreaterThan(0);
    // formatted as `YYYY - YYYY`
    expect((await screen.findAllByText(/2019 - 2021/i)).length).toBeGreaterThan(0);

    expect((await screen.findAllByText(/Senior Nurse/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/City Clinic/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/2021 - Present/i)).length).toBeGreaterThan(0);
  });
});