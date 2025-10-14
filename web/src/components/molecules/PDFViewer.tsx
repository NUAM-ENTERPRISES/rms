/**
 * PDF Viewer component - molecule for displaying PDF files
 * A general-purpose PDF viewer that can be used throughout the application
 * Following FE_GUIDELINES.md molecules pattern
 */

import { useState, useRef, useEffect } from "react";
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
}: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset state when file URL changes
  useEffect(() => {
    if (fileUrl) {
      setIsLoading(true);
      setError(null);
      setZoom(100);
      setRotation(0);

      // Set a timeout to handle cases where PDF doesn't load
      const timeout = setTimeout(() => {
        if (isLoading) {
          setError(
            "PDF is taking too long to load. Please try again or check your connection."
          );
          setIsLoading(false);
        }
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [fileUrl, isLoading]);

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
          "flex flex-col h-[92vh] w-[95vw] max-w-7xl overflow-hidden p-0 shadow-2xl sm:max-w-7xl",
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

        <div className="flex-1 overflow-hidden p-2">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-slate-600">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-sm text-slate-600 mb-2">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}

          {!error && (
            <div className="h-full w-full overflow-hidden bg-white">
              <iframe
                ref={iframeRef}
                src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                className="h-full w-full border-0 min-h-[600px]"
                onLoad={handleLoad}
                onError={handleError}
                title={fileName}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center top",
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
