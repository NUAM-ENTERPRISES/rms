import { describe, it, expect } from "vitest";
import { readUploadPayload, readCreatedDocumentId } from "./readUploadPayload";

describe("readUploadPayload", () => {
  it("parses wrapped upload payload", () => {
    expect(
      readUploadPayload({
        success: true,
        data: {
          fileName: "passport.pdf",
          fileUrl: "https://cdn.example.com/passport.pdf",
          fileSize: 1024,
          document: null,
        },
      }),
    ).toMatchObject({
      fileName: "passport.pdf",
      fileUrl: "https://cdn.example.com/passport.pdf",
      fileSize: 1024,
    });
  });

  it("returns null when file fields are missing", () => {
    expect(
      readUploadPayload({ success: true, data: { fileName: "only.pdf" } }),
    ).toBeNull();
  });
});

describe("readCreatedDocumentId", () => {
  it("returns nested id", () => {
    expect(
      readCreatedDocumentId({ success: true, data: { id: "doc-1" } }),
    ).toBe("doc-1");
  });
});
