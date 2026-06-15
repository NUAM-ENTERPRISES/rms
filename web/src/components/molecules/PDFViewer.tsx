/**
 * PDF Viewer component - molecule for displaying PDF files
 * A general-purpose PDF viewer that can be used throughout the application
 * Following FE_GUIDELINES.md molecules pattern
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/app/hooks";

export interface PDFViewerProps {
  /** PDF file URL to display */
  fileUrl: string;
  /** File name for display */
  fileName?: string;
  /** Whether the viewer is open */
  isOpen: boolean;
  /** Callback when viewer is closed */
  onClose: () => void;
  /** Whether to show download button */
  showDownload?: boolean;
  /** Whether to show zoom controls */
  showZoomControls?: boolean;
  /** Whether to show rotation controls */
  showRotationControls?: boolean;
  /** Whether to show fullscreen toggle */
  showFullscreenToggle?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Bust CDN/browser cache when the file at fileUrl is replaced (e.g. document id) */
  cacheKey?: string;
}

/**
 * Check if a URL is external (e.g., S3, Cloudinary) vs internal API
 */
function isExternalUrl(url: string): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url, window.location.origin);
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
    const apiOrigin = new URL(apiBase).origin;
    // If URL is not on the same origin as the API, it's external (e.g., S3 signed URL)
    return urlObj.origin !== apiOrigin && urlObj.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function appendCacheBust(url: string, versionKey: string) {
  return `${url}${url.includes("?") ? "&" : "?"}_cb=${encodeURIComponent(versionKey)}`;
}

function isBlobUrl(url: string | null) {
  return Boolean(url?.startsWith("blob:"));
}

export function PDFViewer({
  fileUrl,
  fileName = "Document",
  isOpen,
  onClose,
  showDownload = true,
  showZoomControls = true,
  showRotationControls = true,
  showFullscreenToggle = true,
  className = "",
  cacheKey,
}: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Get access token for authenticated PDF fetches
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  /**
   * Fetch PDF with authentication and convert to blob URL
   * This prevents iframe from making unauthenticated requests that could corrupt session
   */
  const fetchPdfAsBlob = useCallback(
    async (url: string, versionKey?: string): Promise<string | null> => {
      try {
        const headers: HeadersInit = {};

        if (!isExternalUrl(url) && accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const cacheBust = versionKey ?? String(Date.now());
        const fetchUrl = appendCacheBust(url, cacheBust);

        const response = await fetch(fetchUrl, {
          headers,
          credentials: isExternalUrl(url) ? "omit" : "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (err) {
        console.error("Error fetching PDF:", err);
        return null;
      }
    },
    [accessToken],
  );

  const clearPreviewUrl = useCallback((url: string | null) => {
    if (isBlobUrl(url)) {
      URL.revokeObjectURL(url!);
    }
  }, []);

  // Reset state and load PDF when file URL changes
  useEffect(() => {
    if (!fileUrl || !isOpen) {
      setPreviewUrl((previous) => {
        clearPreviewUrl(previous);
        return null;
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setZoom(100);
    setRotation(0);

    const versionKey = cacheKey ?? fileUrl;

    // CDN / Spaces URLs: iframe can load cross-origin PDFs; fetch() is blocked by CORS
    if (isExternalUrl(fileUrl)) {
      setPreviewUrl((previous) => {
        clearPreviewUrl(previous);
        return appendCacheBust(fileUrl, versionKey);
      });
      return;
    }

    let isMounted = true;
    fetchPdfAsBlob(fileUrl, versionKey).then((url) => {
      if (isMounted) {
        if (url) {
          setPreviewUrl((previous) => {
            clearPreviewUrl(previous);
            return url;
          });
        } else {
          setError("Failed to load PDF. Please try again.");
          setIsLoading(false);
        }
      } else if (url) {
        URL.revokeObjectURL(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [fileUrl, isOpen, cacheKey, fetchPdfAsBlob, clearPreviewUrl]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      clearPreviewUrl(previewUrl);
    };
  }, [previewUrl, clearPreviewUrl]);

  const displayUrl = previewUrl;

  const pdfViewerSrc = useMemo(() => {
    if (!displayUrl) return null;
    const [base] = displayUrl.split("#");
    return `${base}#toolbar=1&navpanes=0&scrollbar=1&view=FitH&zoom=${zoom}`;
  }, [displayUrl, zoom]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(
      "Failed to load PDF. The file may be corrupted or the URL is invalid."
    );
  };

  // Fallback timeout for PDFs that don't trigger onLoad event
  useEffect(() => {
    if (displayUrl && isLoading) {
      const fallbackTimeout = setTimeout(() => {
        setIsLoading(false);
      }, 3000); // 3 second fallback timeout

      return () => clearTimeout(fallbackTimeout);
    }
  }, [displayUrl, isLoading]);

  const handleDownload = () => {
    // Open the PDF in a new tab for download
    window.open(fileUrl, "_blank");
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleClose = () => {
    setIsFullscreen(false);
    setZoom(100);
    setRotation(0);
    setPreviewUrl((previous) => {
      clearPreviewUrl(previous);
      return null;
    });
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex min-h-0 flex-col h-[92vh] w-[95vw] max-w-7xl overflow-hidden p-0 shadow-2xl sm:max-w-7xl",
          isFullscreen && "h-screen w-screen max-w-none sm:max-w-none",
          className
        )}
      >
        <DialogHeader className="flex-shrink-0 border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  {fileName}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  PDF Document Viewer
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Toolbar */}
              {showZoomControls && (
                <div className="flex items-center gap-1 border border-slate-200 rounded-md">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="px-2 py-1 text-xs font-medium text-slate-600 min-w-[3rem] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 300}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {showRotationControls && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRotate}
                  className="h-8 w-8 p-0"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              )}

              {showFullscreenToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFullscreenToggle}
                  className="h-8 w-8 p-0"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              )}

              {showDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-slate-600">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex h-full min-h-[20rem] items-center justify-center p-4">
              <div className="text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                <p className="mb-2 text-sm text-slate-600">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}

          {!error && pdfViewerSrc && (
            <div className="h-full min-h-0 overflow-auto bg-slate-100 p-2">
              <div
                className="mx-auto flex min-h-full w-full justify-center"
                style={{
                  transform: rotation ? `rotate(${rotation}deg)` : undefined,
                  transformOrigin: "center center",
                }}
              >
                <iframe
                  ref={iframeRef}
                  key={`${pdfViewerSrc}-${rotation}`}
                  src={pdfViewerSrc}
                  className="w-full max-w-full border-0 bg-white shadow-sm"
                  style={{
                    height: isFullscreen
                      ? "calc(100vh - 5.5rem)"
                      : "calc(92vh - 6rem)",
                    minHeight: "70vh",
                  }}
                  onLoad={handleLoad}
                  onError={handleError}
                  title={fileName}
                />
              </div>
            </div>
          )}

          {!error && !pdfViewerSrc && !isLoading && (
            <div className="flex h-full min-h-[20rem] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-slate-600">Preparing PDF...</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
