import { render, screen } from "@testing-library/react";
import { PipelineStatusDotLegend } from "../components/PipelineStatusDotLegend";

describe("PipelineStatusDotLegend", () => {
  it("renders pipeline status labels with accessible list", () => {
    render(<PipelineStatusDotLegend />);

    expect(
      screen.getByRole("list", { name: "Candidate card status colors" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nominated")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Interview")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Deployed")).toBeInTheDocument();
    expect(screen.getByText("Eligible")).toBeInTheDocument();
  });
});
