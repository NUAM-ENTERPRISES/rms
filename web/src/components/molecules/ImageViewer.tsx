import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface ImageViewerProps {
  /** Image source URL (primary) */
  src?: string | null;
  /** Fallback image URL used when src is not provided */
  fallbackSrc?: string;
  /** Large-view dialog title */
  title?: string;
  /** Avatar size classes (tailwind) */
  className?: string;
  /** Optional aria-label for the avatar/button */
  ariaLabel?: string;
  /** Whether to show the desktop hover preview */
  enableHoverPreview?: boolean;
  /** Hover preview placement relative to the avatar (desktop) */
  hoverPosition?: "right" | "left";
  /** Optional preview size classes for the hover preview container (tailwind) */
  previewClassName?: string;
}

/**
 * ImageViewer
 * - Avatar (clickable & keyboard accessible)
 * - Desktop hover preview
 * - Dialog with full-size image
 * - Graceful fallbacks (initials via AvatarFallback)
 *
 * Designed to be fully-typed and reusable across the app.
 */
export const ImageViewer: React.FC<ImageViewerProps> = ({
  src,
  fallbackSrc,
  title = "Profile image",
  className = "h-16 w-16",
  ariaLabel,
  enableHoverPreview = true,
  hoverPosition = "right",
  previewClassName = "w-56 h-56",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHover, setShowHover] = useState(false);

  const initials = title
    .split(" ")
    .map((s) => s[0])
    .splice(0, 2)
    .join("")
    .toUpperCase();

  const imageSrc = src || fallbackSrc || "";

  const previewPlacementClass = hoverPosition === "left"
    ? "right-full mr-4 origin-top-right"
    : "left-full ml-4 origin-top-left";

  const previewShowClass = showHover
    ? "opacity-100 scale-100 translate-x-0"
    : "opacity-0 scale-95 -translate-x-2";

  return (
    <>
      <div
        className={cn("relative inline-block overflow-visible", className)}
        onMouseEnter={() => enableHoverPreview && setShowHover(true)}
        onMouseLeave={() => enableHoverPreview && setShowHover(false)}
      >
        <Avatar
          className={`${className} cursor-pointer`}
          role="button"
          tabIndex={0}
          aria-label={ariaLabel || `View full image for ${title}`}
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
        >
          {imageSrc ? (
            <AvatarImage src={imageSrc} alt={title} />
          ) : (
            <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Hover preview (desktop) */}
        {enableHoverPreview && (
          <div
            className={`pointer-events-none hidden md:block absolute z-50 top-1/2 -translate-y-1/2 ${previewPlacementClass} ${previewClassName} rounded-lg overflow-hidden bg-white shadow-2xl transition-all duration-200 transform ` +
              previewShowClass}
            aria-hidden={!showHover}
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={`${title} preview`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 font-semibold">
                {initials}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-size viewer dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-3xl max-w-[95vw] p-0">
          <DialogHeader className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Full-size image — right-click to open in new tab / save
              </DialogDescription>
            </div>
            <div className="text-sm text-slate-500">Right-click → Open image in new tab to download</div>
          </DialogHeader>

          <div className="flex items-center justify-center bg-slate-50 p-6">
            {/* Fixed-size responsive container prevents dialog resizing between images */}
            <div className="w-full max-w-3xl h-[64vh] max-h-[80vh] flex items-center justify-center">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={title}
                  width={1200}
                  height={800}
                  className="max-h-[64vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
                  <div className="text-2xl font-semibold text-slate-700">{initials}</div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageViewer;
