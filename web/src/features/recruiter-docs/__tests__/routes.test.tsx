import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RecruiterDocsDetailPage from "@/features/recruiter-docs/views/RecruiterDocsDetailPage";

describe("recruiter-docs routing", () => {
  it("renders RecruiterDocsDetailPage for /recruiter-docs/:projectId/:candidateId", async () => {
    render(
      <MemoryRouter initialEntries={["/recruiter-docs/proj-1/cand-1"]}>
        <Routes>
          <Route path="/recruiter-docs/:projectId/:candidateId" element={<RecruiterDocsDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // The detail page renders the "Candidate Specific Documents" section
    const heading = await screen.findByText(/Candidate Specific Documents/i);
    expect(heading).toBeInTheDocument();
  });
});
