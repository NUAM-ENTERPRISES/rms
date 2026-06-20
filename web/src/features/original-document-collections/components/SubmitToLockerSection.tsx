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
import { useDebounce } from "@/hooks/useDebounce";
import { extractApiErrorMessage } from "@/shared/constants/account-status";
import {
  useCheckLockerFileNumberAvailabilityQuery,
  useSubmitCollectionToLockerMutation,
} from "../api";
import { LockerFileNumberAvailabilityHint } from "./LockerFileNumberAvailabilityHint";
import { submitToLockerSchema } from "../schemas/collection-form.schema";
import type { OriginalDocumentCollection } from "../types";
import { normalizeLockerFileNumber } from "../utils/lockerFileNumber";
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

  const lockerFileNumber = form.watch("lockerFileNumber");
  const debouncedLockerFileNumber = useDebounce(
    normalizeLockerFileNumber(lockerFileNumber ?? ""),
    400,
  );
  const shouldCheckAvailability = Boolean(debouncedLockerFileNumber);
  const {
    data: availabilityResponse,
    isFetching: isCheckingAvailability,
    isError: isAvailabilityError,
  } = useCheckLockerFileNumberAvailabilityQuery(
    {
      lockerFileNumber: debouncedLockerFileNumber,
      excludeCollectionId: collection.id,
    },
    { skip: !shouldCheckAvailability || !showForm },
  );
  const availability = availabilityResponse?.data;
  const isLockerNumberUnavailable =
    shouldCheckAvailability &&
    !isCheckingAvailability &&
    !isAvailabilityError &&
    availability?.available === false;
  const isLockerNumberPendingCheck =
    shouldCheckAvailability &&
    (isCheckingAvailability ||
      normalizeLockerFileNumber(lockerFileNumber ?? "") !==
        debouncedLockerFileNumber);

  const startEditing = () => {
    form.reset({ lockerFileNumber: getLockerFileNumber(collection) });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    form.reset({ lockerFileNumber: getLockerFileNumber(collection) });
    setIsEditing(false);
  };

  const onSubmit = async () => {
    if (isLockerNumberUnavailable) {
      form.setError("lockerFileNumber", {
        type: "manual",
        message: "This locker file number is already in use",
      });
      toast.error("Enter a unique locker file number before submitting.");
      return;
    }
    if (isLockerNumberPendingCheck) {
      toast.error("Please wait while the locker file number is verified.");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    const values = form.getValues();
    try {
      await submitToLocker({
        id: collection.id,
        lockerFileNumber: normalizeLockerFileNumber(values.lockerFileNumber),
      }).unwrap();
      toast.success(
        isSubmitted ? "Locker file number updated" : "Submitted to locker",
      );
      setShowConfirmModal(false);
      setIsEditing(false);
      onUpdated?.();
    } catch (error) {
      const message = extractApiErrorMessage(
        (error as { data?: unknown })?.data,
      );
      toast.error(
        message ||
          (isSubmitted
            ? "Failed to update locker file number"
            : "Failed to submit to locker"),
      );
      if (message?.toLowerCase().includes("locker file number")) {
        form.setError("lockerFileNumber", {
          type: "manual",
          message,
        });
        setShowConfirmModal(false);
      }
    }
  };

  const candidateName = `${collection.candidate.firstName || ""} ${collection.candidate.lastName || ""}`.trim();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-amber-200/60 bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-violet-50/90 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2.5 text-base text-amber-950">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-[0_4px_14px_rgba(245,158,11,0.35)]">
                <Lock className="h-4 w-4" />
              </div>
              Submit to locker
            </CardTitle>
            <CardDescription className="text-amber-900/70">
              Record the physical locker file number after placing originals in
              the locker.
            </CardDescription>
          </div>
          {isSubmitted ? (
            <Badge
              variant="outline"
              className="shrink-0 gap-1.5 border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              In locker
            </Badge>
          ) : collection.mergedDocumentId ? (
            <Badge
              variant="outline"
              className="shrink-0 gap-1.5 border-amber-300 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800"
            >
              <Archive className="h-3.5 w-3.5" />
              Ready to submit
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="shrink-0 gap-1.5 border-violet-300 bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-800"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Awaiting merge
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 bg-gradient-to-b from-background to-amber-50/20 p-4">
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
          <div className="relative overflow-hidden rounded-xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-100/70 p-4 shadow-[0_0_20px_rgba(245,158,11,0.12)] ring-1 ring-amber-200/50">
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-300/25 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-8 left-1/3 h-16 w-24 rounded-full bg-orange-300/20 blur-2xl"
              aria-hidden
            />

            <div className="relative flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-[0_0_14px_rgba(245,158,11,0.4)]">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  Ready to submit
                </p>
                <p className="mt-0.5 text-xs text-amber-800/85">
                  Enter the locker file number after placing originals in the
                  locker.
                </p>
              </div>
            </div>
          </div>
        )}

        {showForm ? (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/50 via-background to-amber-50/40 p-4 shadow-sm"
          >
            <div className="space-y-2">
              <Label
                htmlFor="lockerFileNumber"
                className="text-sm font-semibold text-violet-950"
              >
                Locker file number *
              </Label>
              <Input
                id="lockerFileNumber"
                {...form.register("lockerFileNumber")}
                className={cn(
                  "border-violet-200/80 bg-white/90 font-mono text-base tracking-wider shadow-sm focus-visible:border-violet-400 focus-visible:ring-violet-200/60",
                  (form.formState.errors.lockerFileNumber ||
                    isLockerNumberUnavailable) &&
                    "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                )}
                placeholder="Enter locker file number"
                aria-invalid={
                  Boolean(form.formState.errors.lockerFileNumber) ||
                  isLockerNumberUnavailable
                }
              />
              <LockerFileNumberAvailabilityHint
                lockerInput={lockerFileNumber ?? ""}
                debouncedLockerFileNumber={debouncedLockerFileNumber}
                isFetching={isCheckingAvailability}
                availability={availability}
                isError={isAvailabilityError}
              />
              {form.formState.errors.lockerFileNumber ? (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {form.formState.errors.lockerFileNumber.message}
                </p>
              ) : !isLockerNumberUnavailable && !isCheckingAvailability ? (
                <p className="text-xs text-violet-700/80">
                  Use a unique physical label from the locker folder or drawer.
                </p>
              ) : null}
            </div>

            {!collection.mergedDocumentId ? (
              <div className="flex items-start gap-3 rounded-lg border border-violet-200/80 bg-violet-50/80 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <p className="text-xs leading-relaxed text-violet-900/90">
                  Upload merged scan before submitting to locker.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-violet-100 pt-3 sm:flex-row sm:justify-end">
              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={isLoading}
                  className="border-violet-200 text-violet-800 hover:bg-violet-50"
                >
                  Cancel
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !collection.mergedDocumentId ||
                  isLockerNumberUnavailable ||
                  isLockerNumberPendingCheck
                }
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_4px_14px_rgba(245,158,11,0.35)] hover:from-amber-600 hover:to-orange-700 disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none"
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
        <DialogContent className="max-w-md overflow-hidden border-amber-200/60 p-0">
          <DialogHeader className="border-b border-amber-200/50 bg-gradient-to-r from-amber-50 via-orange-50/80 to-violet-50/80 px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-[0_0_14px_rgba(245,158,11,0.35)]">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-1 text-left">
                <DialogTitle className="text-amber-950">
                  {isSubmitted
                    ? "Confirm locker file number"
                    : "Confirm locker submission"}
                </DialogTitle>
                <DialogDescription className="text-amber-900/70">
                  {isSubmitted
                    ? "Verify the updated locker file number is correct."
                    : "Verify the locker file number is correct before submitting."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 px-6 py-4">
            <div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-violet-100/40 p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <User className="h-3.5 w-3.5" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">
                  Candidate
                </p>
              </div>
              <p className="text-sm font-semibold text-violet-950">
                {candidateName}
              </p>
              {collection.candidate.candidateCode ? (
                <p className="mt-0.5 font-mono text-xs text-violet-700/80">
                  {collection.candidate.candidateCode}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50 via-orange-50/70 to-amber-100/60 p-4 shadow-[0_0_16px_rgba(245,158,11,0.1)]">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-600">
                Locker file number
              </p>
              <p className="font-mono text-2xl font-bold tracking-widest text-amber-950">
                {normalizeLockerFileNumber(form.getValues("lockerFileNumber"))}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-amber-100 bg-amber-50/30 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isLoading}
              className="border-amber-200 text-amber-900 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={isLoading}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_4px_14px_rgba(245,158,11,0.35)] hover:from-amber-600 hover:to-orange-700"
            >
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
