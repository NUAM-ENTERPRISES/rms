import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CountryCoverageCard } from "../CountryCoverageCard";

describe("CountryCoverageCard", () => {
  it("renders country name, code, and user count", () => {
    render(
      <MemoryRouter>
        <CountryCoverageCard
          country={{
            code: "SA",
            name: "Saudi Arabia",
            userCount: 12,
            healthcareCount: 8,
            nonHealthcareCount: 5,
            isGcc: true,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Saudi Arabia/i)).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("Healthcare: 8")).toBeInTheDocument();
    expect(screen.getByText("Non-healthcare: 5")).toBeInTheDocument();

    const link = screen.getByRole("link", {
      name: /view users covering saudi arabia/i,
    });
    expect(link).toHaveAttribute("href", "/admin/country-coverage/SA");
  });
});
