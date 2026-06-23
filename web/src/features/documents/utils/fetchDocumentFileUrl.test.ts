import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDocumentFileUrl } from "./fetchDocumentFileUrl";

const mockInitiate = vi.fn();
const mockDispatch = vi.fn();

vi.mock("@/app/store", () => ({
  store: {
    dispatch: (...args: unknown[]) => mockDispatch(...args),
  },
}));

vi.mock("../api", () => ({
  documentsApi: {
    endpoints: {
      getDocumentById: {
        initiate: (...args: unknown[]) => mockInitiate(...args),
      },
    },
  },
}));

describe("fetchDocumentFileUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitiate.mockReturnValue("initiate-result");
  });

  it("returns fileUrl from getDocumentById response", async () => {
    mockDispatch.mockResolvedValue({
      data: { data: { fileUrl: "https://example.com/doc.pdf" } },
    });

    const url = await fetchDocumentFileUrl("doc-1");

    expect(mockInitiate).toHaveBeenCalledWith("doc-1", { forceRefetch: true });
    expect(url).toBe("https://example.com/doc.pdf");
  });

  it("returns null when document id is missing or response has no url", async () => {
    expect(await fetchDocumentFileUrl("")).toBeNull();

    mockDispatch.mockResolvedValue({ data: { data: {} } });
    expect(await fetchDocumentFileUrl("doc-1")).toBeNull();
  });
});
