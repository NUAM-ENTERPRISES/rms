import { describe, it, expect } from "vitest";
import {
  validateDocumentFile,
  validateCsvAttachment,
  canServerCompressImage,
  effectiveMaxMB,
} from "../index";
import { DOCUMENT_TYPE } from "@/constants/document-types";
import { SYSTEM_MULTIPART_MAX_MB } from "../constants";

describe("validateDocumentFile", () => {
  it("rejects unknown document type", () => {
    const file = new File(["x"], "test.pdf", { type: "application/pdf" });
    const result = validateDocumentFile(file, "not_a_real_type");
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("UNKNOWN_DOC_TYPE");
  });

  it("rejects invalid extension for passport", () => {
    const file = new File(["x"], "doc.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const result = validateDocumentFile(file, DOCUMENT_TYPE.PASSPORT);
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("INVALID_EXTENSION");
  });

  it("accepts valid passport pdf within size", () => {
    const file = new File([new Uint8Array(1024)], "passport.pdf", {
      type: "application/pdf",
    });
    const result = validateDocumentFile(file, DOCUMENT_TYPE.PASSPORT);
    expect(result.ok).toBe(true);
  });

  it("effective max caps passport at 5MB not 10", () => {
    expect(effectiveMaxMB(DOCUMENT_TYPE.PASSPORT)).toBe(5);
  });

  it("effective max for OTHER is 10MB", () => {
    expect(effectiveMaxMB(DOCUMENT_TYPE.OTHER)).toBe(
      Math.min(SYSTEM_MULTIPART_MAX_MB, 10)
    );
  });
});

describe("validateCsvAttachment", () => {
  it("rejects non-csv", () => {
    const file = new File(["x"], "data.pdf", { type: "application/pdf" });
    const result = validateCsvAttachment(file);
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("INVALID_CSV");
  });

  it("accepts small csv", () => {
    const file = new File(["a,b\n1,2"], "data.csv", { type: "text/csv" });
    const result = validateCsvAttachment(file);
    expect(result.ok).toBe(true);
  });
});

describe("canServerCompressImage", () => {
  it("returns true for jpeg", () => {
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    expect(canServerCompressImage(file)).toBe(true);
  });

  it("returns false for pdf", () => {
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    expect(canServerCompressImage(file)).toBe(false);
  });
});
