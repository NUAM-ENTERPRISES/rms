import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  formatPassportDisplay,
  TruncatedPassportText,
} from "@/features/agents/components/TruncatedPassportText";

describe("formatPassportDisplay", () => {
  it("truncates passports longer than 10 characters", () => {
    expect(formatPassportDisplay("78787877877")).toEqual({
      display: "7878787787…",
      full: "78787877877",
    });
  });

  it("returns em dash when empty", () => {
    expect(formatPassportDisplay("")).toEqual({ display: "—", full: null });
  });
});

describe("TruncatedPassportText", () => {
  it("shows full passport when 10 characters or fewer", () => {
    render(<TruncatedPassportText passportNumber="AB1234567" />);
    expect(screen.getByText("AB1234567")).toBeInTheDocument();
  });
});
