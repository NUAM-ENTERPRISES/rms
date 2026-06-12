import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Archive, Loader2, AlertTriangle, CheckCircle2, Lock, User } from "lucide-react";
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

export function SubmitToLockerSection({
  collection,
  onUpdated,
}: SubmitToLockerSectionProps) {
  const [submitToLocker, { isLoading }] = useSubmitCollectionToLockerMutation();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isCompleted = collection.status === "completed";

  const form = useForm<LockerFormValues>({
    resolver: zodResolver(submitToLockerSchema),
    defaultValues: {
      lockerFileNumber:
        collection.lockerFileNumber ??
        collection.candidate.lockerFileNumber ??
        "",
    },
  });

  const onSubmit = async (values: LockerFormValues) => {
    // Show confirmation modal before submitting
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    const values = form.getValues();
    try {
      await submitToLocker({
        id: collection.id,
        lockerFileNumber: values.lockerFileNumber,
      }).unwrap();
      toast.success("Submitted to locker");
      setShowConfirmModal(false);
      onUpdated?.();
    } catch {
      toast.error("Failed to submit to locker");
    }
  };

  const candidateName = `${collection.candidate.firstName || ""} ${collection.candidate.lastName || ""}`.trim();

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-amber-50/50 to-transparent py-2.5 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
            <Lock className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <CardTitle className="text-sm font-semibold">
            Step 3: Submit to Locker
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {collection.lockerSubmittedAt ? (
          <div className="rounded-lg border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-semibold text-emerald-900">
                  Submitted to Locker
                </p>
              </div>
              <Badge
                variant="outline"
                className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px] px-2 py-0.5"
              >
                Complete
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="rounded-md bg-white/80 border border-emerald-200 p-3">
                <p className="text-[10px] font-medium text-emerald-600 mb-1">
                  LOCKER FILE NUMBER
                </p>
                <p className="text-lg font-bold text-emerald-900 font-mono tracking-wider">
                  {collection.lockerFileNumber}
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-white/80 border border-emerald-200 p-2.5">
                <User className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-emerald-600">
                    Submitted on {format(new Date(collection.lockerSubmittedAt), "dd MMM yyyy, h:mm a")}
                  </p>
                  {collection.lockerSubmittedBy && (
                    <p className="text-xs text-emerald-800 font-medium">
                      by {collection.lockerSubmittedBy.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <Archive className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-900">
                  Ready to Submit
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Enter the physical locker file number after placing originals in the locker.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isCompleted && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label 
                htmlFor="lockerFileNumber"
                className="text-xs font-semibold text-slate-700"
              >
                Locker File Number *
              </Label>
              <Input
                id="lockerFileNumber"
                {...form.register("lockerFileNumber")}
                className={cn(
                  "font-mono text-sm border-2 focus:border-amber-400 focus:ring-amber-400",
                  form.formState.errors.lockerFileNumber
                    ? "border-red-300"
                    : "border-slate-300"
                )}
                placeholder="Enter locker file number"
              />
              {form.formState.errors.lockerFileNumber && (
                <div className="flex items-start gap-1.5 rounded-md bg-red-50 border border-red-200 p-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">
                    {form.formState.errors.lockerFileNumber.message}
                  </p>
                </div>
              )}
            </div>

            {!collection.mergedDocumentId && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600">
                    Upload merged scan before submitting to locker.
                  </p>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading || !collection.mergedDocumentId}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Submit to Locker
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Confirm Locker Submission
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  Please verify the file number is correct
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
              <p className="text-xs font-medium text-blue-600 mb-1">
                Candidate
              </p>
              <p className="text-sm font-bold text-blue-900">{candidateName}</p>
              {collection.candidate.candidateCode && (
                <p className="text-xs font-mono text-blue-600 mt-0.5">
                  {collection.candidate.candidateCode}
                </p>
              )}
            </div>

            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-xs font-medium text-emerald-600 mb-1">
                Locker File Number
              </p>
              <p className="text-2xl font-bold text-emerald-900 font-mono">
                {form.getValues("lockerFileNumber")}
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-900">
                    Important
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Please ensure the locker file number is correct. This will
                    be used to track the physical documents in the locker.
                  </p>
                </div>
              </div>
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
            <Button
              onClick={handleConfirmSubmit}
              disabled={isLoading}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Confirm & Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
