export interface InitiateIntroductionVideoUploadData {
  uploadUrl: string;
  storageKey: string;
  fileUrl: string;
  fileName: string;
  expiresIn: number;
}

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function prefersDirectSpacesUpload(): boolean {
  const configured = import.meta.env.VITE_INTRO_VIDEO_DIRECT_UPLOAD;

  if (configured === "true") {
    return true;
  }

  if (configured === "false") {
    return false;
  }

  if (typeof window === "undefined") {
    return true;
  }

  return !LOCAL_DEV_HOSTS.has(window.location.hostname);
}

export interface UploadIntroductionVideoViaApiArgs {
  apiBaseUrl: string;
  accessToken?: string | null;
  candidateId: string;
  file: File;
  remarks?: string;
  projectId?: string;
  mode?: "upload" | "reupload";
  onProgress?: (percent: number) => void;
}

function buildIntroductionVideoUploadUrl({
  apiBaseUrl,
  candidateId,
  projectId,
  mode = "upload",
}: Pick<
  UploadIntroductionVideoViaApiArgs,
  "apiBaseUrl" | "candidateId" | "projectId" | "mode"
>): string {
  const base = apiBaseUrl.replace(/\/$/, "");

  if (projectId) {
    const action = mode === "reupload" ? "reupload" : "";
    return `${base}/candidates/${candidateId}/projects/${projectId}/introduction-video${
      action ? `/${action}` : ""
    }`;
  }

  return `${base}/candidates/${candidateId}/introduction-videos/upload`;
}

export function putFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  mimeType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", mimeType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Direct upload to storage was blocked (usually CORS). Retrying through the API.",
        ),
      );
    };

    xhr.send(file);
  });
}

export function uploadIntroductionVideoViaApi(
  args: UploadIntroductionVideoViaApiArgs,
): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", args.file);

  if (args.remarks?.trim()) {
    formData.append("remarks", args.remarks.trim());
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", buildIntroductionVideoUploadUrl(args));
    xhr.withCredentials = true;

    if (args.accessToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${args.accessToken}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && args.onProgress) {
        args.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let responseBody: unknown = xhr.responseText;

      if (xhr.responseText) {
        try {
          responseBody = JSON.parse(xhr.responseText);
        } catch {
          responseBody = xhr.responseText;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(responseBody);
        return;
      }

      reject({
        status: xhr.status,
        data: responseBody,
      });
    };

    xhr.onerror = () => {
      reject(new Error("Network error during API upload"));
    };

    xhr.send(formData);
  });
}
