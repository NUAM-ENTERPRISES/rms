import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightLeft, User, Loader2 } from "lucide-react";
import { useGetCandidateStatusesQuery } from "@/services/candidatesApi";
import { cn } from "@/lib/utils";

const transferFormSchema = z.object({
  currentStatusId: z.string().min(1, "Please select a status for the recruiter"),
  reason: z
    .string()
    .trim()
    .min(1, "Operations status note is required for the recruiter"),
  onHoldUntil: z.string().optional(),
  futureDate: z.string().optional(),
});

type TransferFormData = z.infer<typeof transferFormSchema>;

export type TransferToRecruiterPayload = {
  currentStatusId: number;
  reason: string;
  onHoldUntil?: string;
  futureDate?: string;
};

interface TransferCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: TransferToRecruiterPayload) => Promise<void>;
  candidateName: string;
  currentRecruiterName: string;
  currentStatus: string;
  isSubmitting: boolean;
}

export const TransferCandidateModal: React.FC<TransferCandidateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  currentRecruiterName,
  currentStatus,
  isSubmitting,
}) => {
  const { data: statusesData, isLoading: isLoadingStatuses } =
    useGetCandidateStatusesQuery(undefined, { skip: !isOpen });

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      currentStatusId: "",
      reason: "",
      onHoldUntil: "",
      futureDate: "",
    },
  });

  const statuses = useMemo(
    () =>
      (statusesData?.data ?? []).filter(
        (status) => (status.statusName || "").toLowerCase() !== "qualified",
      ),
    [statusesData],
  );

  const selectedStatusId = form.watch("currentStatusId");
  const selectedStatusName = (
    statuses.find((status) => String(status.id) === selectedStatusId)
      ?.statusName || ""
  ).toLowerCase();

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      currentStatusId: "",
      reason: "",
      onHoldUntil: "",
      futureDate: "",
    });
  }, [isOpen, form]);

  useEffect(() => {
    if (!isOpen || isLoadingStatuses || statuses.length === 0) return;
    if (form.getValues("currentStatusId")) return;

    const untouched = statuses.find(
      (s) => (s.statusName || "").toLowerCase() === "untouched",
    );
    if (untouched) {
      form.setValue("currentStatusId", String(untouched.id), {
        shouldValidate: true,
      });
    }
  }, [isOpen, isLoadingStatuses, statuses, form]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleSubmit = async (data: TransferFormData) => {
    const payload: TransferToRecruiterPayload = {
      currentStatusId: parseInt(data.currentStatusId, 10),
      reason: data.reason.trim(),
    };

    if (selectedStatusName === "on hold" || selectedStatusName === "onhold") {
      if (!data.onHoldUntil) {
        form.setError("onHoldUntil", {
          message: "On hold until date is required",
        });
        return;
      }
      payload.onHoldUntil = data.onHoldUntil;
    }

    if (selectedStatusName === "future") {
      if (!data.futureDate) {
        form.setError("futureDate", {
          message: "Future date is required",
        });
        return;
      }
      payload.futureDate = data.futureDate;
    }

    await onConfirm(payload);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-6 pt-6 pb-8 shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <ArrowRightLeft className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-white text-lg font-semibold">
                Reassign Candidate
              </DialogTitle>
            </div>
            <p className="text-indigo-100 text-sm mt-1 ml-0.5">
              Record Operations status; recruiter will see candidate as untouched
            </p>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col min-h-0 flex-1 overflow-hidden"
          >
            <div className="px-6 -mt-4 pb-2 space-y-4 overflow-y-auto flex-1">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center">
                    <User className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                      Candidate
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {candidateName}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center">
                    <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                      Current recruiter
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {currentRecruiterName || "Unassigned"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Operations status now:{" "}
                      <span className="font-medium capitalize">
                        {currentStatus || "Unknown"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="currentStatusId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Operations status
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingStatuses || isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white">
                          <SelectValue
                            placeholder={
                              isLoadingStatuses
                                ? "Loading statuses..."
                                : "Select status"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-64">
                        {statuses.map((status) => (
                          <SelectItem
                            key={status.id}
                            value={String(status.id)}
                            className="capitalize"
                          >
                            {status.statusName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(selectedStatusName === "on hold" ||
                selectedStatusName === "onhold") && (
                <FormField
                  control={form.control}
                  name="onHoldUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">
                        On hold until
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-10 rounded-xl border-slate-200"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedStatusName === "future" && (
                <FormField
                  control={form.control}
                  name="futureDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">
                        Available from
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-10 rounded-xl border-slate-200"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Operations status note
                      <span className="text-red-500 font-normal"> *</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Required — what should the recruiter know?"
                        className="min-h-[72px] resize-none text-sm rounded-xl border-slate-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="px-6 pb-6 pt-2 flex gap-2 shrink-0 border-t border-slate-100 bg-white">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting || isLoadingStatuses}
                className={cn(
                  "flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600",
                  "hover:from-indigo-700 hover:to-purple-700 text-white shadow-md font-semibold",
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reassigning...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    Confirm Reassign
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
