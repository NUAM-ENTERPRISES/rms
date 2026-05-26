import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import {
  effectiveMaxBytes,
  effectiveMaxMB,
  formatBytes,
  isImageMime,
  isPdfMime,
} from "./constants";
import {
  canClientCompress,
  needsServerCompression,
  validateDocumentFile,
} from "./validate";
import { getDocumentTypeConfig, type DocumentType } from "@/constants/document-types";

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
    throw new Error(validation.message ?? "Invalid file");
  }

  if (file.size <= targetBytes) {
    return { file, wasCompressed: false, originalSize, serverWillCompress: false };
  }

  if (canClientCompress(file)) {
    if (showToasts) {
      toast.info("Large image detected — compressing before upload…");
    }
    const compressed = await compressImageToTarget(file, targetBytes);
    if (compressed.size <= targetBytes) {
      if (showToasts && compressed.size < originalSize) {
        toast.success(
          `File compressed from ${formatBytes(originalSize)} to ${formatBytes(compressed.size)}.`
        );
      }
      return {
        file: compressed,
        wasCompressed: compressed.size < originalSize,
        originalSize,
        serverWillCompress: false,
      };
    }
    if (showToasts) {
      toast.error(
        `Could not compress image below ${effectiveMaxMB(docType)} MB. Please use a smaller image.`
      );
    }
    throw new Error("Image compression failed");
  }

  if (isPdfMime(file.type) || file.name.toLowerCase().endsWith(".pdf")) {
    if (showToasts) {
      toast.info(
        `Large PDF (${formatBytes(file.size)}) — compressing on upload to fit the ${effectiveMaxMB(docType)} MB limit…`
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
        `Large file detected — the server will attempt to compress it during upload (max ${maxMb} MB for ${config?.displayName ?? docType}).`
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
  const message = `File is too large (${formatBytes(file.size)}). Maximum for this document is ${maxMb} MB.`;
  if (showToasts) toast.error(message);
  throw new Error(message);
}

async function compressImageToTarget(
  file: File,
  targetBytes: number
): Promise<File> {
  const qualities = [0.85, 0.7, 0.55, 0.4, 0.3];
  const maxWidths = [2400, 1920, 1600, 1280, 1024];

  let best: File = file;

  for (let i = 0; i < qualities.length; i++) {
    const maxWidthOrHeight = maxWidths[i] ?? 1024;
    const quality = qualities[i] ?? 0.3;
    try {
      const blob = await imageCompression(file, {
        maxSizeMB: targetBytes / (1024 * 1024),
        maxWidthOrHeight,
        useWebWorker: true,
        initialQuality: quality,
        fileType: isImageMime(file.type) ? file.type : undefined,
      });
      const out = new File([blob], file.name, {
        type: blob.type || file.type || "image/jpeg",
        lastModified: Date.now(),
      });
      best = out;
      if (out.size <= targetBytes) return out;
    } catch {
      // try next step
    }
  }

  return best;
}
