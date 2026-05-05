import { render, screen } from "@testing-library/react";
import type { Candidate } from "../api";
import { CandidateProfileCompletion } from "./CandidateProfileCompletion";

function minimalCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: "c1",
    firstName: "Jane",
    lastName: "Doe",
    contact: "",
    dateOfBirth: "1990-01-01",
    email: "jane@test.com",
    countryCode: "+91",
    mobileNumber: "9000000000",
    source: "manual",
    currentStatus: { id: 1, statusName: "Untouched" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("CandidateProfileCompletion", () => {
  it("renders percent from profileCompletion when provided", () => {
    render(
      <CandidateProfileCompletion
        variant="compact"
        candidate={minimalCandidate({
          profileCompletion: {
            percent: 72,
            requiredCount: 9,
            completedCount: 6,
            missing: [{ kind: "document", key: "resume", label: "Resume" }],
            breakdown: {
              personal: { completed: 3, total: 3 },
              documents: { completed: 3, total: 6 },
            },
          },
        })}
      />
    );

    expect(screen.getByRole("button", { name: /72 percent/i })).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
  });
});
