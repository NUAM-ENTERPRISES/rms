import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MissingDocumentActions } from "./MissingDocumentActions";

vi.mock("./RequestMissingDocumentModal", () => ({
  RequestMissingDocumentModal: () => null,
}));

describe("MissingDocumentActions", () => {
  it("renders request and upload actions for missing documents", () => {
    render(
      <MissingDocumentActions
        requirement={{ docType: "resume", documentName: "Resume" }}
        candidateProjectMapId="cpm-1"
        canRequest
        canUpload
        onUpload={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request for resubmission" })).toBeInTheDocument();
  });

  it("shows requested state with upload when recruiter request is pending", () => {
    const onUpload = vi.fn();

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
        canUpload
        onUpload={onUpload}
      />,
    );

    expect(screen.getByText("Requested from recruiter")).toBeInTheDocument();
    expect(screen.getByText("Please upload the certificate.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request for resubmission" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });

  it("calls onUpload when documentation team uploads a missing document", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();

    render(
      <MissingDocumentActions
        requirement={{ docType: "passport", documentName: "Passport" }}
        candidateProjectMapId="cpm-1"
        canUpload
        onUpload={onUpload}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Request for resubmission" })).not.toBeInTheDocument();
  });

  it("renders nothing when neither request nor upload is allowed", () => {
    const { container } = render(
      <MissingDocumentActions
        requirement={{ docType: "passport", documentName: "Passport" }}
        candidateProjectMapId="cpm-1"
        canRequest={false}
        canUpload={false}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
