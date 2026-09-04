import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { BundleReviewWizard } from "../components/BundleReviewWizard";
import type {
  BundleProfileSuggestions,
  BundleSegment,
} from "../data/document-bundle.dto";

vi.mock("@/components/molecules/DepartmentSelect", () => ({
  DepartmentSelect: ({
    label,
    value,
    onValueChange,
  }: {
    label?: string;
    value?: string;
    onValueChange?: (id: string) => void;
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={value ?? ""}
        onChange={(event) => onValueChange?.(event.target.value)}
      />
    </label>
  ),
}));

vi.mock("@/components/molecules/JobTitleSelect", () => ({
  JobTitleSelect: ({
    label,
    onRoleChange,
  }: {
    label?: string;
    onRoleChange?: (
      role: { id: string; name: string; label?: string } | null,
    ) => void;
  }) => (
    <label>
      {label}
      <button
        type="button"
        onClick={() =>
          onRoleChange?.({ id: "r_staff", name: "staff_nurse", label: "Staff Nurse" })
        }
      >
        Pick role
      </button>
    </label>
  ),
}));

vi.mock("../components/BundleProfileReview", () => ({
  BundleProfileReview: () => <div>profile review</div>,
  validateProfileSuggestions: () => null,
}));

vi.mock("@/components/molecules/PDFViewer", () => ({
  PDFViewer: ({
    isOpen,
    fileName,
  }: {
    isOpen: boolean;
    fileName?: string;
  }) => (isOpen ? <div role="dialog">{fileName}</div> : null),
}));

vi.mock("../data/document-bundle.endpoints", () => ({
  usePreviewBundlePagesQuery: () => ({
    data: new Blob(["pdf"], { type: "application/pdf" }),
    isFetching: false,
  }),
}));

const PREVIEW_BLOB_URL = "blob:http://localhost/segment-preview";

beforeAll(() => {
  URL.createObjectURL = () => PREVIEW_BLOB_URL;
  URL.revokeObjectURL = () => undefined;
});

function segment(overrides: Partial<BundleSegment> = {}): BundleSegment {
  return {
    id: "seg_resume",
    bundleId: "bundle_1",
    startPage: 1,
    endPage: 1,
    docType: "resume",
    docName: null,
    confidence: 0.9,
    extracted: null,
    warnings: null,
    status: "suggested",
    sortOrder: 0,
    documentId: null,
    error: null,
    ...overrides,
  };
}

const emptyProfile: BundleProfileSuggestions = {
  qualifications: [],
  workExperiences: [],
  resumeRole: {
    departmentId: "d_icu",
    roleCatalogId: "r_staff",
    departmentLabel: "ICU",
    roleLabel: "Staff Nurse",
  },
  identity: null,
};

describe("BundleReviewWizard", () => {
  it("shows steps in recruiter order", () => {
    render(
      <BundleReviewWizard
        candidateName="Laya Nair"
        bundleId="bundle_1"
        fileUrl="https://example.com/bundle.pdf"
        pageCount={6}
        segments={[
          segment({ id: "resume", docType: "resume" }),
          segment({ id: "photo", docType: "passport_photo", startPage: 3 }),
          segment({ id: "pass", docType: "passport_copy", startPage: 4 }),
        ]}
        profile={emptyProfile}
        isSaving={false}
        isApplying={false}
        onSegmentChange={vi.fn()}
        onProfileChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText("1 Resume")).toBeInTheDocument();
    expect(screen.getByText("2 Passport Photo")).toBeInTheDocument();
    expect(screen.getByText("3 Passport")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resume" })).toBeInTheDocument();
  });

  it("skips the current document and advances", async () => {
    const user = userEvent.setup();
    const onSegmentChange = vi.fn().mockResolvedValue(undefined);

    render(
      <BundleReviewWizard
        candidateName="Laya Nair"
        bundleId="bundle_1"
        fileUrl="https://example.com/bundle.pdf"
        pageCount={6}
        segments={[
          segment({ id: "resume", docType: "resume" }),
          segment({ id: "photo", docType: "passport_photo", startPage: 3 }),
        ]}
        profile={emptyProfile}
        isSaving={false}
        isApplying={false}
        onSegmentChange={onSegmentChange}
        onProfileChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Skip" }));

    expect(onSegmentChange).toHaveBeenCalledWith(
      "resume",
      expect.objectContaining({ status: "rejected" }),
    );
    expect(
      screen.getByRole("heading", { name: "Passport Photo" }),
    ).toBeInTheDocument();
  });

  it("blocks Next on resume until department and role are set", async () => {
    const user = userEvent.setup();
    const onSegmentChange = vi.fn();

    render(
      <BundleReviewWizard
        candidateName="Laya Nair"
        bundleId="bundle_1"
        fileUrl="https://example.com/bundle.pdf"
        pageCount={6}
        segments={[segment()]}
        profile={{
          ...emptyProfile,
          resumeRole: { departmentId: null, roleCatalogId: null },
        }}
        isSaving={false}
        isApplying={false}
        onSegmentChange={onSegmentChange}
        onProfileChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save to profile" }));

    expect(
      screen.getByText(/department and role for the resume/i),
    ).toBeInTheDocument();
    expect(onSegmentChange).not.toHaveBeenCalled();
  });

  it("confirms every unskipped document when saving, not only the last step", async () => {
    const user = userEvent.setup();
    const onSegmentChange = vi.fn().mockResolvedValue(undefined);
    const onApply = vi.fn();

    render(
      <BundleReviewWizard
        candidateName="Laya Nair"
        bundleId="bundle_1"
        fileUrl="https://example.com/bundle.pdf"
        pageCount={6}
        segments={[
          segment({ id: "resume", docType: "resume" }),
          segment({
            id: "degree",
            docType: "degree_certificate",
            startPage: 2,
          }),
          segment({ id: "photo", docType: "passport_photo", startPage: 3 }),
          segment({
            id: "pass",
            docType: "passport_copy",
            startPage: 4,
            extracted: { documentNumber: "Y4403682" },
          }),
        ]}
        profile={{
          ...emptyProfile,
          identity: { passportNumber: "Y4403682" },
        }}
        isSaving={false}
        isApplying={false}
        onSegmentChange={onSegmentChange}
        onProfileChange={vi.fn()}
        onApply={onApply}
      />,
    );

    await user.click(screen.getByRole("button", { name: /4 / }));
    await user.click(screen.getByRole("button", { name: "Save to profile" }));

    await waitFor(() => {
      expect(onApply).toHaveBeenCalled();
    });

    expect(onSegmentChange).toHaveBeenCalledWith(
      "resume",
      expect.objectContaining({ status: "confirmed" }),
    );
    expect(onSegmentChange).toHaveBeenCalledWith(
      "degree",
      expect.objectContaining({ status: "confirmed" }),
    );
    expect(onSegmentChange).toHaveBeenCalledWith(
      "photo",
      expect.objectContaining({ status: "confirmed" }),
    );
    expect(onSegmentChange).toHaveBeenCalledWith(
      "pass",
      expect.objectContaining({
        status: "confirmed",
        extracted: expect.objectContaining({ documentNumber: "Y4403682" }),
      }),
    );
  });

  it("requires passport number before saving the passport step", async () => {
    const user = userEvent.setup();

    render(
      <BundleReviewWizard
        candidateName="Laya Nair"
        bundleId="bundle_1"
        fileUrl="https://example.com/bundle.pdf"
        pageCount={6}
        segments={[
          segment({
            id: "pass",
            docType: "passport_copy",
            extracted: { expiryDate: "2030-01-01" },
          }),
        ]}
        profile={emptyProfile}
        isSaving={false}
        isApplying={false}
        onSegmentChange={vi.fn()}
        onProfileChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save to profile" }));

    expect(screen.getByText(/passport number is required/i)).toBeInTheDocument();
  });

  it("previews only this document and opens either this file or the merged PDF", async () => {
    const user = userEvent.setup();

    render(
      <BundleReviewWizard
        candidateName="Laya Nair"
        bundleId="bundle_1"
        fileUrl="https://example.com/bundle.pdf"
        fileName="LAYA_TL.pdf"
        pageCount={6}
        segments={[segment()]}
        profile={emptyProfile}
        isSaving={false}
        isApplying={false}
        onSegmentChange={vi.fn()}
        onProfileChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByTitle("Resume preview")).toHaveAttribute(
      "src",
      PREVIEW_BLOB_URL,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View Resume" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Resume.pdf");

    await user.click(screen.getByRole("button", { name: "View merged PDF" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("LAYA_TL.pdf");
  });
});
