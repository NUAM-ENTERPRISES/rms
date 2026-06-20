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
import { OFFER_LETTER_UPLOAD_REQUEST_TITLE } from "@/features/interviews/utils/offerLetter";
import { useRequestOfferLetterUploadMutation } from "../api";

const requestOfferLetterSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters explaining what is needed."),
});

type RequestOfferLetterForm = z.infer<typeof requestOfferLetterSchema>;

export interface RequestOfferLetterUploadModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateProjectMapId: string;
  candidateName: string;
  projectTitle: string;
  roleCatalogId?: string;
  onSuccess?: () => void;
}

export function RequestOfferLetterUploadModal({
  isOpen,
  onOpenChange,
  candidateId,
  candidateProjectMapId,
  candidateName,
  projectTitle,
  roleCatalogId,
  onSuccess,
}: RequestOfferLetterUploadModalProps) {
  const [requestOfferLetterUpload, { isLoading }] =
    useRequestOfferLetterUploadMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestOfferLetterForm>({
    resolver: zodResolver(requestOfferLetterSchema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (!isOpen) {
      reset({ reason: "" });
    }
  }, [isOpen, reset]);

  const onSubmit = async (values: RequestOfferLetterForm) => {
    try {
      await requestOfferLetterUpload({
        candidateId,
        candidateProjectMapId,
        reason: values.reason.trim(),
        roleCatalogId,
      }).unwrap();
      toast.success("Offer letter upload request sent to recruiter.");
      onSuccess?.();
      onOpenChange(false);
      reset({ reason: "" });
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to send offer letter upload request.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-amber-600" aria-hidden />
            Request Offer Letter Upload
          </DialogTitle>
          <DialogDescription>
            The recruiter will see your note under{" "}
            <strong>{OFFER_LETTER_UPLOAD_REQUEST_TITLE}</strong> for{" "}
            <strong>{candidateName}</strong> on <strong>{projectTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offer-letter-request-reason">
              Note for recruiter <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="offer-letter-request-reason"
              rows={4}
              placeholder="e.g. Candidate passed the interview. Please call them to collect the signed offer letter and upload it here."
              aria-invalid={Boolean(errors.reason)}
              aria-describedby={
                errors.reason ? "offer-letter-request-reason-error" : undefined
              }
              {...register("reason")}
            />
            {errors.reason ? (
              <p
                id="offer-letter-request-reason-error"
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
