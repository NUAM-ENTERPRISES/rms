import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, Replace } from "lucide-react";
import { cn } from "@/lib/utils";

const introductionVideoUploadSchema = z.object({
  remarks: z
    .string()
    .max(2000, "Remarks must be 2000 characters or less")
    .optional(),
});

type IntroductionVideoUploadFormValues = z.infer<
  typeof introductionVideoUploadSchema
>;

export interface IntroductionVideoUploadPayload {
  file: File;
  remarks?: string;
}

export interface IntroductionVideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: IntroductionVideoUploadPayload) => Promise<void>;
  isSubmitting?: boolean;
  uploadProgress?: number;
  variant?: "upload" | "reupload";
  description?: string;
  idPrefix?: string;
}

export function IntroductionVideoUploadModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  uploadProgress,
  variant = "upload",
  description,
  idPrefix = "intro-video",
}: IntroductionVideoUploadModalProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const isReupload = variant === "reupload";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IntroductionVideoUploadFormValues>({
    resolver: zodResolver(introductionVideoUploadSchema),
    defaultValues: { remarks: "" },
  });

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      reset({ remarks: "" });
    }
  }, [isOpen, reset]);

  const submitForm = handleSubmit(async (values) => {
    if (!selectedFile) {
      return;
    }

    const trimmedRemarks = values.remarks?.trim();
    await onSubmit({
      file: selectedFile,
      remarks: trimmedRemarks || undefined,
    });
  });

  const defaultDescription = isReupload
    ? "Replace the current introduction video. Accepted formats: MP4, WebM, MOV. Maximum size: 100MB."
    : "Accepted formats: MP4, WebM, MOV. Maximum size: 100MB.";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReupload ? (
              <Replace className="h-5 w-5 text-amber-600" aria-hidden />
            ) : (
              <Upload className="h-5 w-5 text-primary" aria-hidden />
            )}
            {isReupload
              ? "Re-upload Introduction Video"
              : "Upload Introduction Video"}
          </DialogTitle>
          <DialogDescription>
            {description ?? defaultDescription}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submitForm}>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-file`}>Video file</Label>
            <Input
              id={`${idPrefix}-file`}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              aria-required="true"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] ?? null)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-remarks`}>Remarks</Label>
            <Textarea
              id={`${idPrefix}-remarks`}
              placeholder="Optional notes about this introduction video"
              rows={3}
              className={cn(errors.remarks && "border-destructive")}
              {...register("remarks")}
            />
            {errors.remarks ? (
              <p className="text-sm text-destructive">{errors.remarks.message}</p>
            ) : null}
          </div>

          {isSubmitting && typeof uploadProgress === "number" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Uploading to storage</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} aria-label="Upload progress" />
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedFile || isSubmitting}
            >
              {isSubmitting ? "Uploading..." : isReupload ? "Re-upload" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default IntroductionVideoUploadModal;
