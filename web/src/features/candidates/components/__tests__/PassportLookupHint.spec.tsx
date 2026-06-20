import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PassportLookupHint } from "@/features/candidates/components/PassportLookupHint";

describe("PassportLookupHint", () => {
  it("shows existing candidate summary when found", () => {
    render(
      <PassportLookupHint
        passportInput="AB123"
        debouncedPassport="AB123"
        isFetching={false}
        lookup={{
          found: true,
          candidate: {
            id: "c1",
            candidateCode: "AFF001",
            firstName: "Jane",
            lastName: "Doe",
            email: "jane@test.com",
            countryCode: "+91",
            mobileNumber: "9876543210",
          },
        }}
      />,
    );

    expect(screen.getByText(/Passport already registered/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/AFF001/)).toBeInTheDocument();
    expect(screen.getByText(/jane@test.com/)).toBeInTheDocument();
    expect(screen.getByText(/\+91 9876543210/)).toBeInTheDocument();
  });

  it("hides phone line when candidate has no contact", () => {
    render(
      <PassportLookupHint
        passportInput="XY999"
        debouncedPassport="XY999"
        isFetching={false}
        lookup={{
          found: true,
          candidate: {
            id: "c2",
            candidateCode: null,
            firstName: "No",
            lastName: "Phone",
            email: null,
            countryCode: null,
            mobileNumber: null,
          },
        }}
      />,
    );

    expect(screen.queryByText(/^Phone:/)).not.toBeInTheDocument();
  });

  it("shows new-candidate indicator when passport not found", () => {
    render(
      <PassportLookupHint
        passportInput="ZZ000"
        debouncedPassport="ZZ000"
        isFetching={false}
        lookup={{ found: false }}
      />,
    );

    expect(screen.getByText(/new candidate/i)).toBeInTheDocument();
  });

  it("renders nothing on network error (does not block user)", () => {
    const { container } = render(
      <PassportLookupHint
        passportInput="ERR1"
        debouncedPassport="ERR1"
        isFetching={false}
        isError
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
