import { describe, expect, it, vi } from "vitest";
import {
  prefersDirectSpacesUpload,
  putFileToPresignedUrl,
  uploadIntroductionVideoViaApi,
} from "../uploadToSpaces";

describe("prefersDirectSpacesUpload", () => {
  it("returns false on localhost by default", () => {
    vi.stubGlobal("window", {
      location: { hostname: "localhost" },
    });
    vi.stubEnv("VITE_INTRO_VIDEO_DIRECT_UPLOAD", undefined);

    expect(prefersDirectSpacesUpload()).toBe(false);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns true when explicitly enabled", () => {
    vi.stubGlobal("window", {
      location: { hostname: "localhost" },
    });
    vi.stubEnv("VITE_INTRO_VIDEO_DIRECT_UPLOAD", "true");

    expect(prefersDirectSpacesUpload()).toBe(true);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns true on production host by default", () => {
    vi.stubGlobal("window", {
      location: { hostname: "app.example.com" },
    });
    vi.stubEnv("VITE_INTRO_VIDEO_DIRECT_UPLOAD", undefined);

    expect(prefersDirectSpacesUpload()).toBe(true);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});

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

describe("uploadIntroductionVideoViaApi", () => {
  it("uploads candidate library video through the API", async () => {
    class MockXMLHttpRequest {
      upload = {
        onprogress: null as ((event: ProgressEvent) => void) | null,
      };
      status = 200;
      responseText = JSON.stringify({ success: true, data: { document: { id: "doc1" } } });
      withCredentials = false;
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn(function send(this: MockXMLHttpRequest, body: FormData) {
        expect(body.get("file")).toBeInstanceOf(File);
        expect(body.get("remarks")).toBe("Intro remarks");
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
    const response = await uploadIntroductionVideoViaApi({
      apiBaseUrl: "http://localhost:3000/api/v1",
      accessToken: "token",
      candidateId: "c1",
      file,
      remarks: "Intro remarks",
    });

    expect(response).toEqual({
      success: true,
      data: { document: { id: "doc1" } },
    });
    vi.unstubAllGlobals();
  });
});
