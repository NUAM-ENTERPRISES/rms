import { useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useRequestMissingDocumentUploadMutation } from "../api";

const requestMissingDocumentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters explaining what is needed."),
});

type RequestMissingDocumentForm = z.infer<typeof requestMissingDocumentSchema>;

export interface RequestMissingDocumentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateProjectMapId: string;
  docType: string;
  documentLabel: string;
  roleCatalogId?: string;
  onSuccess?: () => void;
}

export function RequestMissingDocumentModal({
  isOpen,
  onOpenChange,
  candidateProjectMapId,
  docType,
  documentLabel,
  roleCatalogId,
  onSuccess,
}: RequestMissingDocumentModalProps) {
  const [requestMissingUpload, { isLoading }] =
    useRequestMissingDocumentUploadMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestMissingDocumentForm>({
    resolver: zodResolver(requestMissingDocumentSchema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (!isOpen) {
      reset({ reason: "" });
    }
  }, [isOpen, reset]);

  const onSubmit = async (values: RequestMissingDocumentForm) => {
    try {
      await requestMissingUpload({
        candidateProjectMapId,
        docType,
        reason: values.reason.trim(),
        roleCatalogId,
      }).unwrap();
      toast.success("Upload request sent to recruiter.");
      onSuccess?.();
      onOpenChange(false);
      reset({ reason: "" });
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to send upload request.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" aria-hidden />
            Request Missing Document
          </DialogTitle>
          <DialogDescription>
            Ask the recruiter to upload <strong>{documentLabel}</strong>. A
            notification will be sent with your note.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="missing-doc-reason">
              Note for recruiter <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="missing-doc-reason"
              rows={4}
              placeholder="Explain which document is missing and what the recruiter should upload..."
              aria-invalid={Boolean(errors.reason)}
              aria-describedby={
                errors.reason ? "missing-doc-reason-error" : undefined
              }
              {...register("reason")}
            />
            {errors.reason ? (
              <p
                id="missing-doc-reason-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.reason.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
