import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MissingDocumentActions } from "./MissingDocumentActions";

vi.mock("./RequestMissingDocumentModal", () => ({
  RequestMissingDocumentModal: () => null,
}));

describe("MissingDocumentActions", () => {
  it("renders upload and request actions for missing documents", () => {
    render(
      <MissingDocumentActions
        requirement={{ docType: "resume", documentName: "Resume" }}
        candidateProjectMapId="cpm-1"
        canUpload
        canRequest
        onUpload={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Reupload" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request" })).toBeInTheDocument();
  });

  it("shows requested state and hides request when upload already requested", () => {
    render(
      <MissingDocumentActions
        requirement={{
          docType: "resume",
          documentName: "Resume",
          uploadRequested: true,
        }}
        candidateProjectMapId="cpm-1"
        canUpload
        canRequest
        onUpload={vi.fn()}
      />,
    );

    expect(screen.getByText("Requested from recruiter")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reupload" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });

  it("calls onUpload when upload is clicked", async () => {
    const onUpload = vi.fn();
    const user = userEvent.setup();

    render(
      <MissingDocumentActions
        requirement={{ docType: "passport", documentName: "Passport" }}
        candidateProjectMapId="cpm-1"
        canUpload
        canRequest
        onUpload={onUpload}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(onUpload).toHaveBeenCalledTimes(1);
  });
});
