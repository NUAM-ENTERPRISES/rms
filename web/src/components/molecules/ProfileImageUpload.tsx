import React, { useState, useRef } from "react";
import { User, Upload, X, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProfileImageUploadProps {
  currentImageUrl?: string;
  onImageSelected?: (file: File) => void;
  onImageRemove?: () => void;
  uploading?: boolean;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
  xl: "w-40 h-40",
};

export const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  currentImageUrl,
  onImageSelected,
  onImageRemove,
  uploading = false,
  disabled = false,
  className,
  size = "lg",
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImageUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error(
        "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image."
      );
      return;
    }

    // Validate file size (max 5MB)
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(
        `File size exceeds ${maxSizeMB}MB. Please upload a smaller image.`
      );
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Notify parent
    onImageSelected?.(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageRemove?.();
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Image Preview Area */}
      <div className="relative group">
        <div
          className={cn(
            "relative rounded-full border-4 border-slate-200 bg-slate-100 overflow-hidden",
            sizeClasses[size],
            !disabled &&
              !uploading &&
              "cursor-pointer hover:border-blue-400 transition-colors",
            uploading && "opacity-70"
          )}
          onClick={handleClick}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <User
                className={cn(
                  size === "sm" && "h-8 w-8",
                  size === "md" && "h-12 w-12",
                  size === "lg" && "h-16 w-16",
                  size === "xl" && "h-20 w-20"
                )}
              />
            </div>
          )}

          {/* Uploading Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}

          {/* Hover Overlay */}
          {!disabled && !uploading && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-8 w-8 text-white" />
            </div>
          )}
        </div>

        {/* Remove Button */}
        {previewUrl && !disabled && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg z-10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Upload Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled || uploading}
        className="gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {previewUrl ? "Change Photo" : "Upload Photo"}
          </>
        )}
      </Button>

      {/* Help Text */}
      <p className="text-xs text-slate-500 text-center max-w-xs">
        JPG, PNG, WebP or GIF (max 5MB)
      </p>
    </div>
  );
};

export default ProfileImageUpload;
