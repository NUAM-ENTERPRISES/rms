import { describe, expect, it, vi } from "vitest";
import { putFileToPresignedUrl } from "../uploadToSpaces";

describe("putFileToPresignedUrl", () => {
  it("uploads file via PUT and reports progress", async () => {
    class MockXMLHttpRequest {
      upload = {
        onprogress: null as ((event: ProgressEvent) => void) | null,
      };
      status = 200;
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn(function send(this: MockXMLHttpRequest) {
        this.upload.onprogress?.({
          lengthComputable: true,
          loaded: 50,
          total: 100,
        } as ProgressEvent);
        this.onload?.();
      });
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
    }

    vi.stubGlobal(
      "XMLHttpRequest",
      MockXMLHttpRequest as unknown as typeof XMLHttpRequest
    );

    const file = new File(["video"], "intro.mp4", { type: "video/mp4" });
    const onProgress = vi.fn();

    await putFileToPresignedUrl(
      "https://spaces.example.com/presigned",
      file,
      "video/mp4",
      onProgress
    );

    expect(onProgress).toHaveBeenCalledWith(50);
    vi.unstubAllGlobals();
  });
});
