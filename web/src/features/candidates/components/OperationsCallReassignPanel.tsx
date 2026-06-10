import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRightLeft, Loader2, User } from "lucide-react";
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
import { useGetCandidateStatusesQuery } from "@/services/candidatesApi";
import type { TransferToRecruiterPayload } from "@/components/molecules/TransferCandidateModal";

const reassignFormSchema = z.object({
  currentStatusId: z.string().min(1, "Please select a status for the recruiter"),
  reason: z
    .string()
    .trim()
    .min(1, "Operations status note is required for the recruiter"),
  onHoldUntil: z.string().optional(),
  futureDate: z.string().optional(),
});

type ReassignFormData = z.infer<typeof reassignFormSchema>;

export type OperationsCallReassignPanelProps = {
  candidateName: string;
  currentRecruiterName: string;
  currentStatus: string;
  isSubmitting?: boolean;
  onBack: () => void;
  onConfirm: (payload: TransferToRecruiterPayload) => void | Promise<void>;
};

export function OperationsCallReassignPanel({
  candidateName,
  currentRecruiterName,
  currentStatus,
  isSubmitting = false,
  onBack,
  onConfirm,
}: OperationsCallReassignPanelProps) {
  const { data: statusesData, isLoading: isLoadingStatuses } =
    useGetCandidateStatusesQuery();

  const form = useForm<ReassignFormData>({
    resolver: zodResolver(reassignFormSchema),
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
    if (isLoadingStatuses || statuses.length === 0) return;
    if (form.getValues("currentStatusId")) return;

    const interested = statuses.find(
      (s) => (s.statusName || "").toLowerCase() === "interested",
    );
    if (interested) {
      form.setValue("currentStatusId", String(interested.id), {
        shouldValidate: true,
      });
      return;
    }

    const untouched = statuses.find(
      (s) => (s.statusName || "").toLowerCase() === "untouched",
    );
    if (untouched) {
      form.setValue("currentStatusId", String(untouched.id), {
        shouldValidate: true,
      });
    }
  }, [isLoadingStatuses, statuses, form]);

  const handleSubmit = async (data: ReassignFormData) => {
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
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-indigo-800">
            <ArrowRightLeft className="h-4 w-4 shrink-0" />
            <p className="text-sm font-semibold">Reassign to recruiter</p>
          </div>
          <p className="text-xs text-indigo-700 leading-relaxed">
            Record Operations status for the recruiter. The candidate will return
            to the recruiter pipeline as untouched after reassign.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-800">{candidateName}</p>
              <p className="text-xs text-slate-500">
                Recruiter: {currentRecruiterName || "Unassigned"} · Current:{" "}
                <span className="capitalize">{currentStatus || "Unknown"}</span>
              </p>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="currentStatusId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Operations status</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoadingStatuses || isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingStatuses ? "Loading statuses…" : "Select status"
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

        {(selectedStatusName === "on hold" || selectedStatusName === "onhold") && (
          <FormField
            control={form.control}
            name="onHoldUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>On hold until</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
                <FormLabel>Available from</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
              <FormLabel>Operations status note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What should the recruiter know?"
                  className="min-h-[72px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            disabled={isSubmitting || isLoadingStatuses}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reassigning…
              </span>
            ) : (
              "Confirm Reassign"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
