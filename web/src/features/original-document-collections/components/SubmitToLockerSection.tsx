import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Archive,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Pencil,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSubmitCollectionToLockerMutation } from "../api";
import { submitToLockerSchema } from "../schemas/collection-form.schema";
import type { OriginalDocumentCollection } from "../types";
import { cn } from "@/lib/utils";

interface SubmitToLockerSectionProps {
  collection: OriginalDocumentCollection;
  onUpdated?: () => void;
}

type LockerFormValues = { lockerFileNumber: string };

function getLockerFileNumber(collection: OriginalDocumentCollection) {
  return collection.lockerFileNumber?.trim() ?? "";
}

export function SubmitToLockerSection({
  collection,
  onUpdated,
}: SubmitToLockerSectionProps) {
  const [submitToLocker, { isLoading }] = useSubmitCollectionToLockerMutation();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isCompleted = collection.status === "completed";
  const isSubmitted = Boolean(collection.lockerSubmittedAt);
  const showForm = !isCompleted && (!isSubmitted || isEditing);

  const form = useForm<LockerFormValues>({
    resolver: zodResolver(submitToLockerSchema),
    defaultValues: {
      lockerFileNumber: getLockerFileNumber(collection),
    },
  });

  const startEditing = () => {
    form.reset({ lockerFileNumber: getLockerFileNumber(collection) });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    form.reset({ lockerFileNumber: getLockerFileNumber(collection) });
    setIsEditing(false);
  };

  const onSubmit = async () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    const values = form.getValues();
    try {
      await submitToLocker({
        id: collection.id,
        lockerFileNumber: values.lockerFileNumber,
      }).unwrap();
      toast.success(
        isSubmitted ? "Locker file number updated" : "Submitted to locker",
      );
      setShowConfirmModal(false);
      setIsEditing(false);
      onUpdated?.();
    } catch {
      toast.error(
        isSubmitted
          ? "Failed to update locker file number"
          : "Failed to submit to locker",
      );
    }
  };

  const candidateName = `${collection.candidate.firstName || ""} ${collection.candidate.lastName || ""}`.trim();

  return (
    <Card>
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" />
          Submit to locker
        </CardTitle>
        <CardDescription>
          Record the physical locker file number after placing originals in the
          locker.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {isSubmitted ? (
          <div className="relative overflow-hidden rounded-xl border-2 border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100/80 p-5 shadow-[0_0_24px_rgba(16,185,129,0.18)] ring-1 ring-emerald-200/60">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-300/30 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-green-300/25 blur-2xl" />

            <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.45)] ring-4 ring-emerald-100">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-950">
                    Submitted to locker
                  </p>
                  <p className="text-xs text-emerald-700/90">
                    Physical originals recorded in locker
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-100/80 text-emerald-800 shadow-sm"
                >
                  Complete
                </Badge>
                {!isCompleted && !isEditing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-emerald-300 bg-white/70 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
                    onClick={startEditing}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="relative space-y-3">
              <div className="rounded-lg border border-emerald-200/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                  Locker file number
                </p>
                <p className="font-mono text-2xl font-bold tracking-widest text-emerald-950">
                  {collection.lockerFileNumber}
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-emerald-200/70 bg-white/60 p-3.5 backdrop-blur-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs font-medium text-emerald-800">
                    Submitted on{" "}
                    {format(
                      new Date(collection.lockerSubmittedAt!),
                      "dd MMM yyyy, h:mm a",
                    )}
                  </p>
                  {collection.lockerSubmittedBy ? (
                    <p className="text-sm font-semibold text-emerald-950">
                      by {collection.lockerSubmittedBy.name}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-start gap-2">
              <Archive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Ready to submit
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Enter the locker file number after placing originals in the
                  locker.
                </p>
              </div>
            </div>
          </div>
        )}

        {showForm ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="lockerFileNumber">Locker file number *</Label>
              <Input
                id="lockerFileNumber"
                {...form.register("lockerFileNumber")}
                className={cn(
                  "font-mono",
                  form.formState.errors.lockerFileNumber && "border-destructive",
                )}
                placeholder="Enter locker file number"
              />
              {form.formState.errors.lockerFileNumber ? (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {form.formState.errors.lockerFileNumber.message}
                </p>
              ) : null}
            </div>

            {!collection.mergedDocumentId ? (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Upload merged scan before submitting to locker.
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={isLoading || !collection.mergedDocumentId}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {isEditing ? "Save file number" : "Submit to locker"}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isSubmitted
                ? "Confirm locker file number"
                : "Confirm locker submission"}
            </DialogTitle>
            <DialogDescription>
              {isSubmitted
                ? "Verify the updated locker file number is correct."
                : "Verify the locker file number is correct before submitting."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Candidate</p>
              <p className="text-sm font-medium text-foreground">
                {candidateName}
              </p>
              {collection.candidate.candidateCode ? (
                <p className="font-mono text-xs text-muted-foreground">
                  {collection.candidate.candidateCode}
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Locker file number</p>
              <p className="font-mono text-2xl font-semibold text-foreground">
                {form.getValues("lockerFileNumber")}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmSubmit} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSubmitted ? (
                "Confirm update"
              ) : (
                "Confirm & submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
