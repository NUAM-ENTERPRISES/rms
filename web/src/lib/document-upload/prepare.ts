import { toast } from "sonner";
import {
  effectiveMaxBytes,
  effectiveMaxMB,
  formatBytes,
} from "./constants";
import {
  canServerCompressImage,
  needsServerCompression,
  validateDocumentFile,
} from "./validate";
import { getDocumentTypeConfig, type DocumentType } from "@/constants/document-types";
import { isPdfMime } from "./constants";

export interface PrepareUploadResult {
  file: File;
  wasCompressed: boolean;
  originalSize: number;
  /** True when file still exceeds cap but server will attempt compression on upload. */
  serverWillCompress: boolean;
}

export interface PrepareUploadOptions {
  /** Show Sonner toasts (default true). */
  showToasts?: boolean;
}

export async function prepareDocumentFileForUpload(
  file: File,
  docType: string,
  options: PrepareUploadOptions = {}
): Promise<PrepareUploadResult> {
  const { showToasts = true } = options;
  const originalSize = file.size;
  const targetBytes = effectiveMaxBytes(docType);

  const validation = validateDocumentFile(file, docType);
  if (!validation.ok && validation.errorCode !== "FILE_TOO_LARGE") {
    if (showToasts && validation.message) {
      toast.error(validation.message);
    }
    throw new Error(validation.message ?? "This file cannot be uploaded.");
  }

  if (file.size <= targetBytes) {
    return { file, wasCompressed: false, originalSize, serverWillCompress: false };
  }

  if (canServerCompressImage(file)) {
    if (showToasts) {
      toast.info(
        `This photo is ${formatBytes(file.size)}. We will compress it during upload so it fits the ${effectiveMaxMB(docType)} MB limit for ${getDocumentTypeConfig(docType as DocumentType)?.displayName ?? "this document"}.`,
      );
    }
    return {
      file,
      wasCompressed: false,
      originalSize,
      serverWillCompress: true,
    };
  }

  if (isPdfMime(file.type) || file.name.toLowerCase().endsWith(".pdf")) {
    if (showToasts) {
      toast.info(
        `This PDF is ${formatBytes(file.size)}. We will compress it during upload so it fits the ${effectiveMaxMB(docType)} MB limit for ${getDocumentTypeConfig(docType as DocumentType)?.displayName ?? "this document"}.`,
      );
    }
    return {
      file,
      wasCompressed: false,
      originalSize,
      serverWillCompress: true,
    };
  }

  if (needsServerCompression(file, docType)) {
    const config = getDocumentTypeConfig(docType as DocumentType);
    const maxMb = effectiveMaxMB(docType);
    if (showToasts) {
      toast.info(
        `This file is larger than ${maxMb} MB for ${config?.displayName ?? docType}. We will try to compress it during upload.`,
      );
    }
    return {
      file,
      wasCompressed: false,
      originalSize,
      serverWillCompress: true,
    };
  }

  const maxMb = effectiveMaxMB(docType);
  const message = `This file is ${formatBytes(file.size)}. ${getDocumentTypeConfig(docType as DocumentType)?.displayName ?? "This document"} must be ${maxMb} MB or smaller. Please choose a smaller file.`;
  if (showToasts) toast.error(message);
  throw new Error(message);
}
