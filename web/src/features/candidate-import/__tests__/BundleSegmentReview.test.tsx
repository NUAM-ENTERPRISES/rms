import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BundleSegmentReview, validateRange } from "../components/BundleSegmentReview";
import type { BundleSegment } from "../data/document-bundle.dto";

function segment(overrides: Partial<BundleSegment> = {}): BundleSegment {
  return {
    id: "seg_1",
    bundleId: "bundle_1",
    startPage: 2,
    endPage: 3,
    docType: "passport_copy",
    docName: null,
    confidence: 0.92,
    extracted: { documentNumber: "P1234567", fullName: "Visithra Rajesh" },
    warnings: null,
    status: "suggested",
    sortOrder: 0,
    documentId: null,
    error: null,
    ...overrides,
  };
}

describe("validateRange", () => {
  it("accepts a range inside the file", () => {
    expect(validateRange("2", "3", 14)).toBeNull();
  });

  it("rejects a range that runs past the end of the file", () => {
    expect(validateRange("2", "20", 14)).toContain("only has 14 pages");
  });

  it("rejects a last page that comes before the first", () => {
    expect(validateRange("5", "2", 14)).toContain("cannot come before");
  });

  it("rejects page zero, since pages are 1-based", () => {
    expect(validateRange("0", "2", 14)).toContain("start at 1");
  });

  it("rejects a non-numeric page", () => {
    expect(validateRange("abc", "2", 14)).toContain("whole numbers");
  });
});

describe("BundleSegmentReview", () => {
  const noop = () => {};

  it("shows the detected page range and document type", () => {
    render(
      <BundleSegmentReview
        segment={segment()}
        pageCount={14}
        isSaving={false}
        onChange={noop}
      />
    );

    expect(screen.getByText(/Pages 2–3/)).toBeInTheDocument();
    expect(screen.getByText(/92% sure/)).toBeInTheDocument();
  });

  it("describes a single-page document without a range", () => {
    render(
      <BundleSegmentReview
        segment={segment({ startPage: 4, endPage: 4 })}
        pageCount={14}
        isSaving={false}
        onChange={noop}
      />
    );

    expect(screen.getByText(/Page 4$/)).toBeInTheDocument();
  });

  it("surfaces a profile mismatch so it cannot be confirmed unnoticed", () => {
    render(
      <BundleSegmentReview
        segment={segment({
          warnings: [
            'Candidate mismatch: passport number "P9999999" does not match "P1234567" on the profile.',
          ],
        })}
        pageCount={14}
        isSaving={false}
        onChange={noop}
      />
    );

    expect(
      screen.getByLabelText("Candidate mismatch errors")
    ).toBeInTheDocument();
    expect(screen.getByText(/P9999999/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm/i })
    ).toBeDisabled();
  });

  it("blocks confirming a work document named for another candidate", () => {
    render(
      <BundleSegmentReview
        segment={segment({
          docType: "experience_certificate",
          warnings: [
            'Candidate mismatch: document names "Anjali Menon" but this profile is "Visithra Rajesh". Upload this candidate\'s own documents (including work certificates).',
          ],
        })}
        pageCount={14}
        isSaving={false}
        onChange={noop}
      />
    );

    expect(screen.getByText("Candidate mismatch")).toBeInTheDocument();
    expect(
      screen.getByText(/does not belong to this candidate/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm/i })
    ).toBeDisabled();
  });

  it("confirms a segment with its current page range and type", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <BundleSegmentReview
        segment={segment()}
        pageCount={14}
        isSaving={false}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /confirm/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "confirmed",
        startPage: 2,
        endPage: 3,
        docType: "passport_copy",
      })
    );
  });

  it("blocks confirming while the page range is invalid", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <BundleSegmentReview
        segment={segment()}
        pageCount={14}
        isSaving={false}
        onChange={onChange}
      />
    );

    const lastPage = screen.getByLabelText("Last page");
    await user.clear(lastPage);
    await user.type(lastPage, "99");

    expect(screen.getByRole("alert")).toHaveTextContent("only has 14 pages");
    expect(screen.getByRole("button", { name: /confirm/i })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("skips a segment without saving any edits to it", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <BundleSegmentReview
        segment={segment()}
        pageCount={14}
        isSaving={false}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /skip/i }));

    expect(onChange).toHaveBeenCalledWith({ status: "rejected" });
  });

  it("locks an already-saved segment so documents are never rewritten", () => {
    render(
      <BundleSegmentReview
        segment={segment({ status: "applied" })}
        pageCount={14}
        isSaving={false}
        onChange={noop}
      />
    );

    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.queryByLabelText("Last page")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /confirm/i })
    ).not.toBeInTheDocument();
  });

  it("shows why a segment failed to save", () => {
    render(
      <BundleSegmentReview
        segment={segment({
          status: "failed",
          error: "This candidate has no preferred role yet.",
        })}
        pageCount={14}
        isSaving={false}
        onChange={noop}
      />
    );

    expect(
      screen.getByText(/no preferred role yet/)
    ).toBeInTheDocument();
  });
});
