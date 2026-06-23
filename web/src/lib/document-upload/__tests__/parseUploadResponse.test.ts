import { describe, it, expect } from "vitest";
import {
  parseDocumentUploadResponse,
  getCreatedDocumentId,
} from "../validate";

describe("parseDocumentUploadResponse", () => {
  it("parses wrapped upload payload with file fields", () => {
    const parsed = parseDocumentUploadResponse({
      success: true,
      data: {
        fileName: "passport.pdf",
        fileUrl: "https://cdn.example.com/passport.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        document: null,
      },
    });

    expect(parsed).toEqual({
      fileName: "passport.pdf",
      fileUrl: "https://cdn.example.com/passport.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      compressionApplied: false,
      originalFileSize: undefined,
      document: null,
    });
  });

  it("returns null when fileName or fileUrl is missing", () => {
    expect(
      parseDocumentUploadResponse({
        success: true,
        data: { fileName: "only-name.pdf", document: null },
      }),
    ).toBeNull();
  });

  it("extracts nested document id when work experience auto-creates a record", () => {
    const parsed = parseDocumentUploadResponse({
      success: true,
      data: {
        fileName: "experience.pdf",
        fileUrl: "https://cdn.example.com/experience.pdf",
        document: { id: "doc-1" },
      },
    });

    expect(parsed?.document).toEqual({ id: "doc-1" });
  });
});

describe("getCreatedDocumentId", () => {
  it("returns nested document id", () => {
    expect(
      getCreatedDocumentId({ success: true, data: { id: "doc-99" } }),
    ).toBe("doc-99");
  });

  it("throws when id is missing", () => {
    expect(() => getCreatedDocumentId({ success: true, data: {} })).toThrow(
      "Document was created but no document ID was returned.",
    );
  });
});
