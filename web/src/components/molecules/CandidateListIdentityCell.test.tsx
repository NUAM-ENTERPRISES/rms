import { render, screen } from "@testing-library/react";
import { CandidateListIdentityCell } from "./CandidateListIdentityCell";

describe("CandidateListIdentityCell", () => {
  it("shows only the first name when the last name is null", () => {
    render(
      <CandidateListIdentityCell
        firstName="Abhijith"
        lastName={null}
      />,
    );

    expect(screen.getByText("Abhijith")).toBeInTheDocument();
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });
});
