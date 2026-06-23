import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PDFViewer } from "@/components/molecules/PDFViewer";

vi.mock("@/app/hooks", () => ({
  useAppSelector: (selector: (state: { auth: { accessToken: string | null } }) => unknown) =>
    selector({ auth: { accessToken: "test-token" } }),
}));

describe("PDFViewer blob URL lifecycle", () => {
  const parentBlobUrl = "blob:http://localhost/parent-preview";

  beforeEach(() => {
    vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses parent-owned blob URLs directly without fetching", () => {
    render(
      <PDFViewer
        fileUrl={parentBlobUrl}
        fileName="resume.pdf"
        isOpen
        onClose={() => {}}
      />,
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not revoke parent-owned blob URLs on close", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const onClose = vi.fn();

    const { rerender } = render(
      <PDFViewer
        fileUrl={parentBlobUrl}
        fileName="resume.pdf"
        isOpen
        onClose={onClose}
      />,
    );

    rerender(
      <PDFViewer
        fileUrl={parentBlobUrl}
        fileName="resume.pdf"
        isOpen={false}
        onClose={onClose}
      />,
    );

    expect(revokeSpy).not.toHaveBeenCalledWith(parentBlobUrl);
  });
});
