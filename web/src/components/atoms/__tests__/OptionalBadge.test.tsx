import { render, screen } from "@testing-library/react";
import { OptionalBadge } from "../OptionalBadge";

describe("OptionalBadge", () => {
  it("renders an Optional label for assistive and visual cue", () => {
    render(<OptionalBadge />);
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });
});
