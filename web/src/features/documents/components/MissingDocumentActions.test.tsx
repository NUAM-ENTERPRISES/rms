import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { MissingDocumentActions } from "./MissingDocumentActions";

vi.mock("./RequestMissingDocumentModal", () => ({
  RequestMissingDocumentModal: () => null,
}));

describe("MissingDocumentActions", () => {
  it("renders only request for resubmission for missing documents", () => {
    render(
      <MissingDocumentActions
        requirement={{ docType: "resume", documentName: "Resume" }}
        candidateProjectMapId="cpm-1"
        canRequest
      />,
    );

    expect(screen.queryByRole("button", { name: "Upload" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request for resubmission" })).toBeInTheDocument();
  });

  it("shows requested state without upload or request buttons when upload already requested", () => {
    render(
      <MissingDocumentActions
        requirement={{
          docType: "resume",
          documentName: "Resume",
          uploadRequested: true,
          uploadRequestReason: "Please upload the certificate.",
        }}
        candidateProjectMapId="cpm-1"
        canRequest
      />,
    );

    expect(screen.getByText("Requested from recruiter")).toBeInTheDocument();
    expect(screen.getByText("Please upload the certificate.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upload" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request for resubmission" })).not.toBeInTheDocument();
  });

  it("renders nothing when request action is not allowed", () => {
    const { container } = render(
      <MissingDocumentActions
        requirement={{ docType: "passport", documentName: "Passport" }}
        candidateProjectMapId="cpm-1"
        canRequest={false}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
