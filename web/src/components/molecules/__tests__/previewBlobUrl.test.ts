import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useEffect, useState } from "react";

/**
 * Mirrors the blob URL lifecycle used by CandidateResumeList preview state.
 */
function usePreviewBlobUrl(selectedFile: File | null) {
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewBlobUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  return previewBlobUrl;
}

describe("preview blob URL lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates one blob URL per file and revokes on file change", async () => {
    const createSpy = vi.spyOn(URL, "createObjectURL");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    const fileA = new File(["a"], "a.pdf", { type: "application/pdf" });
    const fileB = new File(["b"], "b.pdf", { type: "application/pdf" });

    createSpy.mockReturnValueOnce("blob:a").mockReturnValueOnce("blob:b");

    const { result, rerender } = renderHook(
      ({ file }) => usePreviewBlobUrl(file),
      { initialProps: { file: fileA as File | null } },
    );

    await waitFor(() => {
      expect(result.current).toBe("blob:a");
    });
    expect(createSpy).toHaveBeenCalledTimes(1);

    rerender({ file: fileB });

    await waitFor(() => {
      expect(result.current).toBe("blob:b");
    });

    expect(revokeSpy).toHaveBeenCalledWith("blob:a");
    expect(createSpy).toHaveBeenCalledTimes(2);
  });

  it("revokes blob URL on unmount", async () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:unmount");

    const file = new File(["a"], "a.pdf", { type: "application/pdf" });
    const { unmount } = renderHook(() => usePreviewBlobUrl(file));

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    unmount();

    expect(revokeSpy).toHaveBeenCalledWith("blob:unmount");
  });
});
