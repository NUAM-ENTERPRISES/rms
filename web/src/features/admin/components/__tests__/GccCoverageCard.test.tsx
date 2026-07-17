import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GccCoverageCard } from "../GccCoverageCard";

describe("GccCoverageCard", () => {
  it("renders as a country-style GCC card with flags and user count", () => {
    render(
      <MemoryRouter>
        <GccCoverageCard
          gcc={{
            code: "GCC",
            name: "GCC",
            userCount: 1,
            healthcareCount: 1,
            nonHealthcareCount: 0,
            countryCodes: ["SA", "AE", "QA", "OM", "BH", "KW"],
          }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: /view users covering gcc/i }),
    ).toHaveAttribute("href", "/admin/country-coverage/GCC");
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Healthcare: 1")).toBeInTheDocument();
    expect(screen.getByText("KW")).toBeInTheDocument();
    expect(screen.queryByText(/regional overview/i)).not.toBeInTheDocument();
  });
});
