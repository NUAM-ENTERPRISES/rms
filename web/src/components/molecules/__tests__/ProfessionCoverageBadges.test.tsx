import { render, screen } from "@testing-library/react";
import { ProfessionCoverageBadges } from "../ProfessionCoverageBadges";

describe("ProfessionCoverageBadges", () => {
  it("shows Any healthcare coverage", () => {
    render(
      <ProfessionCoverageBadges
        handlesAllProfessions
        recruiterSectorScope="HEALTHCARE"
      />,
    );
    expect(screen.getByText("Any · Healthcare")).toBeInTheDocument();
  });

  it("shows Any all professions for Both", () => {
    render(
      <ProfessionCoverageBadges
        handlesAllProfessions
        recruiterSectorScope="BOTH"
      />,
    );
    expect(screen.getByText("Any · All professions")).toBeInTheDocument();
  });

  it("shows explicit profession labels", () => {
    render(
      <ProfessionCoverageBadges
        scopes={[
          {
            id: "s1",
            professionTypeId: "pt_nurse",
            professionType: {
              id: "pt_nurse",
              name: "nurse",
              label: "Nurse",
              sector: "HEALTHCARE",
            },
          },
        ]}
      />,
    );
    expect(screen.getByText(/Nurse/)).toBeInTheDocument();
    expect(screen.getByText(/Healthcare/)).toBeInTheDocument();
  });
});
