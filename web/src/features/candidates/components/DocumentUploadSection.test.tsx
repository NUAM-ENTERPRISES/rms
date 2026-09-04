import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentUploadSection } from "./DocumentUploadSection";

const mockUseGetDocumentsQuery = vi.fn();
const mockUseGetWorkExperiencesQuery = vi.fn();
const mockUseUploadDocumentMutation = vi.fn();
const mockUseUploadResumeMutation = vi.fn();
const mockUseCreateDocumentMutation = vi.fn();
const mockUseUpdateDocumentMutation = vi.fn();
const mockUseDeleteDocumentMutation = vi.fn();
const mockUseCan = vi.fn();
const mockDeleteDocument = vi.fn();

vi.mock("../api", () => ({
  useGetDocumentsQuery: (...args: unknown[]) => mockUseGetDocumentsQuery(...args),
  useGetWorkExperiencesQuery: (...args: unknown[]) =>
    mockUseGetWorkExperiencesQuery(...args),
  useUploadDocumentMutation: (...args: unknown[]) =>
    mockUseUploadDocumentMutation(...args),
}));

vi.mock("@/features/documents/api", () => ({
  useCreateDocumentMutation: (...args: unknown[]) =>
    mockUseCreateDocumentMutation(...args),
  useUpdateDocumentMutation: (...args: unknown[]) =>
    mockUseUpdateDocumentMutation(...args),
  useDeleteDocumentMutation: (...args: unknown[]) =>
    mockUseDeleteDocumentMutation(...args),
}));

vi.mock("@/services/uploadApi", () => ({
  useUploadResumeMutation: (...args: unknown[]) =>
    mockUseUploadResumeMutation(...args),
}));

vi.mock("@/hooks/useCan", () => ({
  useCan: (permission: string) => mockUseCan(permission),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/molecules/PDFViewer", () => ({
  PDFViewer: () => null,
}));

vi.mock("@/components/molecules/ResumeUploadRoleModal", () => ({
  ResumeUploadRoleModal: () => null,
}));

vi.mock("@/components/molecules/ResumeReuploadModal", () => ({
  ResumeReuploadModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>resume-reupload-modal</div> : null,
}));

vi.mock("../../recruiter-docs/components/CandidateUploadDocumentModal", () => ({
  default: ({
    isOpen,
    mode,
  }: {
    isOpen: boolean;
    mode?: string;
  }) => (isOpen ? <div>upload-modal-{mode ?? "upload"}</div> : null),
}));

vi.mock("../../recruiter-docs/components/PassportDocumentDetailsDialog", () => ({
  PassportDocumentDetailsDialog: () => null,
}));

vi.mock("./EditCandidateDocumentDialog", () => ({
  EditCandidateDocumentDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>edit-document-dialog</div> : null,
}));

const sampleDoc = {
  id: "doc-1",
  docType: "passport_photo",
  docName: "Passport Photo",
  fileName: "photo.jpg",
  fileUrl: "https://example.com/photo.jpg",
  mimeType: "image/jpeg",
  status: "pending",
  createdAt: "2026-09-04T05:31:00.000Z",
};

const idleMutation = () =>
  vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue(undefined) });

describe("DocumentUploadSection repository actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCan.mockImplementation(
      (permission: string) =>
        permission === "write:documents" || permission === "manage:documents",
    );
    mockUseGetDocumentsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetWorkExperiencesQuery.mockReturnValue({ data: [] });
    mockUseUploadDocumentMutation.mockReturnValue([idleMutation()]);
    mockUseUploadResumeMutation.mockReturnValue([idleMutation()]);
    mockUseCreateDocumentMutation.mockReturnValue([idleMutation()]);
    mockUseUpdateDocumentMutation.mockReturnValue([idleMutation()]);
    mockDeleteDocument.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(undefined),
    });
    mockUseDeleteDocumentMutation.mockReturnValue([mockDeleteDocument]);
  });

  it("shows reupload and delete actions for uploaded documents", async () => {
    render(
      <DocumentUploadSection
        candidateId="cand-1"
        data={[sampleDoc]}
        isLoading={false}
      />,
    );

    expect(
      await screen.findByRole("button", { name: /reupload passport photo/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete passport photo/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit passport photo/i }),
    ).toBeInTheDocument();
  });

  it("hides delete when the user cannot manage documents", async () => {
    mockUseCan.mockImplementation(
      (permission: string) => permission === "write:documents",
    );

    render(
      <DocumentUploadSection
        candidateId="cand-1"
        data={[sampleDoc]}
        isLoading={false}
      />,
    );

    expect(
      await screen.findByRole("button", { name: /reupload passport photo/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete passport photo/i }),
    ).not.toBeInTheDocument();
  });

  it("soft-deletes after the user confirms", async () => {
    const user = userEvent.setup();

    render(
      <DocumentUploadSection
        candidateId="cand-1"
        data={[sampleDoc]}
        isLoading={false}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /delete passport photo/i }),
    );

    expect(
      await screen.findByText(/it will be soft-deleted and kept in history/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete document/i }));

    expect(mockDeleteDocument).toHaveBeenCalledWith("doc-1");
  });

  it("opens the resume reupload modal for resume documents", async () => {
    const user = userEvent.setup();

    render(
      <DocumentUploadSection
        candidateId="cand-1"
        data={[
          {
            ...sampleDoc,
            id: "resume-1",
            docType: "resume",
            docName: "Staff Nurse CV",
            fileName: "resume.pdf",
            mimeType: "application/pdf",
          },
        ]}
        isLoading={false}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /reupload staff nurse cv/i }),
    );

    expect(await screen.findByText("resume-reupload-modal")).toBeInTheDocument();
  });

  it("opens the document upload modal in reupload mode for other types", async () => {
    const user = userEvent.setup();

    render(
      <DocumentUploadSection
        candidateId="cand-1"
        data={[sampleDoc]}
        isLoading={false}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /reupload passport photo/i }),
    );

    expect(await screen.findByText("upload-modal-reupload")).toBeInTheDocument();
  });

  it("opens the edit dialog for document type changes", async () => {
    const user = userEvent.setup();

    render(
      <DocumentUploadSection
        candidateId="cand-1"
        data={[sampleDoc]}
        isLoading={false}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /edit passport photo/i }),
    );

    expect(await screen.findByText("edit-document-dialog")).toBeInTheDocument();
  });

  it("hides edit when the user cannot write documents", async () => {
    mockUseCan.mockReturnValue(false);

    render(
      <DocumentUploadSection
        candidateId="cand-1"
        data={[sampleDoc]}
        isLoading={false}
      />,
    );

    expect(
      await screen.findByRole("button", { name: /view passport photo/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit passport photo/i }),
    ).not.toBeInTheDocument();
  });
});
