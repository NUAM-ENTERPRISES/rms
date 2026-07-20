import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { DocumentAttestationModal } from "./DocumentAttestationModal";

const mockRefetch = vi.fn();
const mockUploadCourierAttestation = vi.fn();
const mockUploadCourierAttestationMerged = vi.fn();
const mockReuploadProcessingDocument = vi.fn();
const mockUseCan = vi.fn();

const baseData = {
  isDocumentAttestationCompleted: false,
  step: { id: "step-1", status: "pending" },
  processingCandidate: {
    id: "pc-1",
    candidate: { id: "cand-1", firstName: "Jane", lastName: "Doe" },
    project: { id: "proj-1", title: "Saudi MOH" },
    role: null,
  },
  requiredDocuments: [
    {
      docType: "degree_certificate",
      label: "Degree Certificate",
      mandatory: true,
    },
    {
      docType: "registration_certificate",
      label: "Registration Certificate",
      mandatory: true,
    },
  ],
  processing_documents: [],
  candidateDocuments: [],
  courierAttestationDocuments: [],
  individualCourierAttestationDocuments: [],
  mergedCourierAttestationGroups: [],
  counts: {
    totalMandatory: 2,
    verifiedCount: 0,
    missingCount: 2,
  },
};

let mockQueryData: typeof baseData = baseData;

vi.mock("@/hooks/useCan", () => ({
  useCan: (perm: string) => mockUseCan(perm),
}));

vi.mock("@/features/processing/context/ProcessingActionLockContext", () => ({
  useProcessingActionLock: () => ({ isLocked: false }),
}));

vi.mock("@/services/processingApi", () => ({
  useGetDocumentAttestationRequirementsQuery: () => ({
    data: mockQueryData,
    isLoading: false,
    error: undefined,
    refetch: mockRefetch,
  }),
  useCompleteStepMutation: () => [vi.fn(), { isLoading: false }],
  useReuploadProcessingDocumentMutation: () => [
    mockReuploadProcessingDocument,
    { isLoading: false },
  ],
  useVerifyProcessingDocumentMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/features/candidates/api", () => ({
  useUploadDocumentMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/services/documentsApi", () => ({
  useCreateDocumentMutation: () => [vi.fn()],
}));

vi.mock("@/features/documents/api", () => ({
  useReuseDocumentMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/features/courier-shipments/api", () => ({
  useUploadCourierAttestationMutation: () => [
    mockUploadCourierAttestation,
    { isLoading: false },
  ],
  useUploadCourierAttestationMergedMutation: () => [
    mockUploadCourierAttestationMerged,
    { isLoading: false },
  ],
}));

vi.mock("@/components/molecules/PDFViewer", () => ({
  PDFViewer: () => null,
}));

vi.mock("../../components/UploadDocumentModal", () => ({
  default: ({
    isOpen,
    onUpload,
    pdfOnly,
  }: {
    isOpen: boolean;
    onUpload: (file: File) => Promise<void>;
    pdfOnly?: boolean;
  }) =>
    isOpen ? (
      <div>
        <span>{pdfOnly ? "pdf-only-upload" : "standard-upload"}</span>
        <button
          type="button"
          onClick={() =>
            onUpload(
              new File(["pdf"], "replacement.pdf", {
                type: "application/pdf",
              }),
            )
          }
        >
          Confirm upload
        </button>
      </div>
    ) : null,
}));

vi.mock("../../components/VerifyProcessingDocumentModal", () => ({
  default: () => null,
}));

vi.mock("../../components/CompleteProcessingStepModal", () => ({
  default: () => null,
}));

vi.mock("../../components/VerifyAllDocumentsControl", () => ({
  default: () => null,
}));

vi.mock("../../components/ProcessingStepActionButtons", () => ({
  ProcessingStepActionButtons: () => null,
}));

vi.mock("../../components/ProcessingActionLockBanner", () => ({
  ProcessingActionLockBanner: () => null,
}));

describe("DocumentAttestationModal", () => {
  beforeEach(() => {
    mockQueryData = structuredClone(baseData);
    mockRefetch.mockReset();
    mockUploadCourierAttestation.mockReset();
    mockUploadCourierAttestationMerged.mockReset();
    mockReuploadProcessingDocument.mockReset();
    mockUseCan.mockReset();
    mockUseCan.mockReturnValue(true);
    mockUploadCourierAttestation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ message: "Attested document uploaded" }),
    });
    mockUploadCourierAttestationMerged.mockReturnValue({
      unwrap: vi
        .fn()
        .mockResolvedValue({ message: "Merged attested document uploaded" }),
    });
  });

  it("renders merged courier uploads in a dedicated section instead of per-file rows", () => {
    mockQueryData.individualCourierAttestationDocuments = [];
    mockQueryData.mergedCourierAttestationGroups = [
      {
        documentId: "doc-merged",
        document: {
          id: "doc-merged",
          fileName: "merged.pdf",
          fileUrl: "https://cdn.example/merged.pdf",
          mimeType: "application/pdf",
        },
        shipmentId: "ship-1",
        legNumber: 2,
        uploadedAt: "2026-07-01T10:00:00.000Z",
        uploadedBy: { id: "u1", name: "Staff", email: "staff@test.com" },
        remarks: null,
        coveredDocuments: [
          {
            id: "up-a",
            baseDocType: "degree_certificate",
            attestedDocType: "degree_certificate_attested",
            label: "Degree Certificate",
          },
          {
            id: "up-b",
            baseDocType: "registration_certificate",
            attestedDocType: "registration_certificate_attested",
            label: "Registration Certificate",
          },
        ],
      },
    ];
    mockQueryData.courierAttestationDocuments = [
      {
        id: "up-a",
        baseDocType: "degree_certificate",
        attestedDocType: "degree_certificate_attested",
        document: mockQueryData.mergedCourierAttestationGroups[0].document,
        shipmentId: "ship-1",
        legNumber: 2,
        uploadedAt: "2026-07-01T10:00:00.000Z",
        isMerged: true,
      },
      {
        id: "up-b",
        baseDocType: "registration_certificate",
        attestedDocType: "registration_certificate_attested",
        document: mockQueryData.mergedCourierAttestationGroups[0].document,
        shipmentId: "ship-1",
        legNumber: 2,
        uploadedAt: "2026-07-01T10:00:00.000Z",
        isMerged: true,
      },
    ] as any;
    mockQueryData.counts.missingCount = 2;

    render(
      <DocumentAttestationModal
        isOpen
        onClose={vi.fn()}
        processingId="pc-1"
        candidateProjectMapId="cpm-1"
      />,
    );

    expect(
      screen.getByText(/merged attested documents from courier legs/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/degree certificate \+ registration certificate/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/covered by merged upload/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/courier: pending/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download/i })).toHaveAttribute(
      "href",
      "https://cdn.example/merged.pdf",
    );
  });

  it("shows courier re-upload for individual courier docs and uses courier replace API", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    mockQueryData.individualCourierAttestationDocuments = [
      {
        id: "up-1",
        baseDocType: "degree_certificate",
        attestedDocType: "degree_certificate_attested",
        document: {
          id: "doc-degree",
          fileName: "degree.pdf",
          fileUrl: "https://cdn.example/degree.pdf",
          mimeType: "application/pdf",
          status: "pending",
        },
        shipmentId: "ship-1",
        legNumber: 3,
        uploadedAt: "2026-07-01T10:00:00.000Z",
        isMerged: false,
      },
    ] as any;
    mockQueryData.courierAttestationDocuments =
      mockQueryData.individualCourierAttestationDocuments;
    mockQueryData.counts.missingCount = 1;

    render(
      <DocumentAttestationModal
        isOpen
        onClose={vi.fn()}
        processingId="pc-1"
        candidateProjectMapId="cpm-1"
      />,
    );

    const reuploadButtons = screen.getAllByRole("button", {
      name: /re-upload/i,
    });
    expect(reuploadButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(reuploadButtons[0]);
    expect(screen.getByText("pdf-only-upload")).toBeInTheDocument();

    await user.click(screen.getByText("Confirm upload"));

    expect(mockUploadCourierAttestation).toHaveBeenCalledWith({
      id: "ship-1",
      projectId: "proj-1",
      docType: "degree_certificate_attested",
      file: expect.any(File),
    });
    expect(mockReuploadProcessingDocument).not.toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });
});
