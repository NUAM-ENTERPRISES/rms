/**
 * Video Player Modal — reusable molecule for introduction videos and other media previews.
 * Follows the same layout patterns as PDFViewer (centered, toolbar, theater-style viewport).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface VideoPlayerModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Video source URL */
  fileUrl: string;
  /** Display name for the file */
  fileName: string;
  /** Modal heading (defaults to "Introduction Video") */
  title?: string;
  /** Optional subtitle shown under the title (e.g. project name) */
  subtitle?: string;
  /** Whether to show download / open actions */
  showDownload?: boolean;
  /** Additional CSS classes on the dialog content */
  className?: string;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  title = "Introduction Video",
  subtitle,
  showDownload = true,
  className,
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const resetState = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setIsFullscreen(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, fileUrl, resetState]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  const handleDownload = () => {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const toggleFullscreen = async () => {
    const target = containerRef.current;
    if (!target) return;

    try {
      if (!document.fullscreenElement) {
        await target.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen may be blocked; ignore
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          "w-[min(96vw,56rem)] max-w-[calc(100%-1.5rem)] sm:max-w-[min(96vw,56rem)]",
          "h-auto max-h-[92vh]",
          "shadow-2xl border-slate-200",
          className
        )}
        aria-describedby="video-player-description"
      >
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-violet-50 via-white to-purple-50 px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Video className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-lg font-semibold text-slate-900">
                    {title}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="border-violet-200 bg-violet-50 text-violet-700 text-[10px] uppercase tracking-wide"
                  >
                    Video
                  </Badge>
                </div>
                <DialogDescription
                  id="video-player-description"
                  className="truncate text-sm text-slate-600"
                  title={fileName}
                >
                  {subtitle ? `${subtitle} · ` : ""}
                  {fileName}
                </DialogDescription>
              </div>
            </div>

            {showDownload ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-600 hover:text-slate-900"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-600 hover:text-slate-900"
                  onClick={handleDownload}
                  title="Open in new tab"
                  aria-label="Open video in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-600 hover:text-slate-900"
                  onClick={handleDownload}
                  title="Download video"
                  aria-label="Download video"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative flex min-h-[240px] flex-1 items-center justify-center bg-slate-950 px-4 py-6 sm:min-h-[320px] sm:px-6"
        >
          {isLoading && !hasError ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/80">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" aria-hidden />
              <p className="text-sm text-slate-300">Loading video…</p>
            </div>
          ) : null}

          {hasError ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 text-center">
              <Video className="h-10 w-10 text-slate-500" aria-hidden />
              <p className="text-sm font-medium text-slate-200">
                Unable to play this video
              </p>
              <p className="text-xs text-slate-400">
                The file may be unavailable or your browser does not support this format.
              </p>
              {showDownload ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={handleDownload}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in new tab
                </Button>
              ) : null}
            </div>
          ) : (
            <video
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              className={cn(
                "mx-auto block max-h-[min(62vh,520px)] w-full max-w-full rounded-lg shadow-2xl ring-1 ring-white/10",
                "object-contain",
                isLoading && "opacity-0"
              )}
              src={fileUrl}
              aria-label={`Video preview: ${fileName}`}
              onLoadedData={() => setIsLoading(false)}
              onCanPlay={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            >
              <track kind="captions" />
              Your browser does not support video playback.
            </video>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VideoPlayerModal;
