import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DocumentIntakeNote,
  VisitIntakeNote,
} from "../DocumentIntakeNote";

describe("DocumentIntakeNote", () => {
  it("renders callout with document note label", () => {
    render(<DocumentIntakeNote text="Original laminated copy" />);

    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText("Document note")).toBeInTheDocument();
    expect(screen.getByText("Original laminated copy")).toBeInTheDocument();
  });

  it("returns null for blank text", () => {
    const { container } = render(<DocumentIntakeNote text="   " />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("VisitIntakeNote", () => {
  it("renders visit notes callout", () => {
    render(<VisitIntakeNote text="Collected at front desk" />);

    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText("Visit notes")).toBeInTheDocument();
    expect(screen.getByText("Collected at front desk")).toBeInTheDocument();
  });
});
