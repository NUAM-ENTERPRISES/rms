import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUpdateCandidateStatusMutation } from "../api";
import { useGetCandidateStatusesQuery } from "@/services/candidatesApi";
import {
  Loader2,
  AlertCircle,
  UserCheck,
  XCircle,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  Briefcase,
  CheckCircle,
  FileText,
  Award,
  UserX,
  Target,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusUpdateSchema = z.object({
  currentStatusId: z.string().min(1, "Please select a status"),
  reason: z.string().optional(),
  onHoldDurationDays: z.string().optional(),
  futureYear: z.string().optional(),
});

type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  currentStatus: string;
  candidateName: string;
}

const statusConfigMap: Record<string, any> = {
  untouched: {
    color: "from-orange-400 to-orange-600",
    bgColor: "bg-orange-50",
    iconColor: "text-orange-500",
    icon: AlertCircle,
  },
  interested: {
    color: "from-green-400 to-green-600",
    bgColor: "bg-green-50",
    iconColor: "text-green-500",
    icon: UserCheck,
  },
  "not interested": {
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50",
    iconColor: "text-red-500",
    icon: XCircle,
  },
  "not eligible": {
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50",
    iconColor: "text-red-500",
    icon: XCircle,
  },
  "other enquiry": {
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-500",
    icon: Mail,
  },
  future: {
    color: "from-indigo-400 to-indigo-600",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-500",
    icon: Calendar,
  },
  "on hold": {
    color: "from-yellow-400 to-yellow-600",
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-500",
    icon: Clock,
  },
  onhold: {
    color: "from-yellow-400 to-yellow-600",
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-500",
    icon: Clock,
  },
  rnr: {
    color: "from-pink-400 to-pink-600",
    bgColor: "bg-pink-50",
    iconColor: "text-pink-500",
    icon: AlertCircle,
  },
  qualified: {
    color: "from-emerald-400 to-emerald-600",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-500",
    icon: CheckCircle2,
  },
  working: {
    color: "from-blue-400 to-blue-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
    icon: Briefcase,
  },
  selected: {
    icon: CheckCircle,
    color: "from-green-400 to-green-600",
    bgColor: "bg-green-50",
    iconColor: "text-green-500",
  },
  rejected: {
    icon: XCircle,
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50",
    iconColor: "text-red-500",
  },
  "in-process": {
    icon: FileText,
    color: "from-indigo-400 to-indigo-600",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-500",
  },
  shortlisted: {
    icon: UserCheck,
    color: "from-cyan-400 to-cyan-600",
    bgColor: "bg-cyan-50",
    iconColor: "text-cyan-500",
  },
  interviewed: {
    icon: Calendar,
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-500",
  },
  offered: {
    icon: Award,
    color: "from-orange-400 to-orange-600",
    bgColor: "bg-orange-50",
    iconColor: "text-orange-500",
  },
  placed: {
    icon: Briefcase,
    color: "from-emerald-400 to-emerald-600",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-500",
  },
  withdrawn: {
    icon: UserX,
    color: "from-rose-400 to-rose-600",
    bgColor: "bg-rose-50",
    iconColor: "text-rose-500",
  },
  default: {
    color: "from-gray-400 to-gray-600",
    bgColor: "bg-gray-50",
    iconColor: "text-gray-500",
    icon: AlertCircle,
  },
};

const getStatusConfig = (statusName?: string) => {
  const name = (statusName || "").toLowerCase().trim();
  return statusConfigMap[name] || statusConfigMap.default;
};

export function StatusUpdateModal({
  isOpen,
  onClose,
  candidateId,
  currentStatus,
  candidateName,
}: StatusUpdateModalProps) {
  const [updateStatus, { isLoading }] = useUpdateCandidateStatusMutation();
  const { data: statusesData, isLoading: isLoadingStatuses } =
    useGetCandidateStatusesQuery();

  const form = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      currentStatusId: "",
      reason: "",
      onHoldDurationDays: undefined,
      futureYear: undefined,
    },
  });

  const currentConfig = getStatusConfig(currentStatus);
  const CurrentIcon = currentConfig.icon;

  const handleSubmit = async (data: StatusUpdateFormData) => {
    const selectedStatus = statuses.find(
      (status) => String(status.id) === data.currentStatusId,
    );
    const selectedStatusName = (selectedStatus?.statusName || '').toLowerCase();

    const onHoldDurationDays = data.onHoldDurationDays
      ? Number(data.onHoldDurationDays)
      : undefined;
    const futureYear = data.futureYear ? Number(data.futureYear) : undefined;

    if (selectedStatusName === 'on hold') {
      if (!onHoldDurationDays || onHoldDurationDays <= 0) {
        toast.error('Please enter a valid on-hold duration (days).');
        return;
      }
    }

    if (selectedStatusName === 'future') {
      const currentYear = new Date().getFullYear();
      if (!futureYear || futureYear < currentYear) {
        toast.error(`Please enter a valid future year >= ${currentYear}.`);
        return;
      }
    }

    try {
      await updateStatus({
        candidateId,
        status: {
          currentStatusId: parseInt(data.currentStatusId),
          reason: data.reason,
          onHoldDurationDays:
            selectedStatusName === 'on hold' ? onHoldDurationDays : undefined,
          futureYear:
            selectedStatusName === 'future' ? futureYear : undefined,
        },
      }).unwrap();

      toast.success('Candidate status updated successfully');
      onClose();
      form.reset();
    } catch (error) {
      console.error('Failed to update candidate status:', error);
      toast.error('Failed to update candidate status');
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const rawStatuses = statusesData?.data || [];
  const statuses = rawStatuses.filter(
    (status) => (status.statusName || '').toLowerCase() !== 'qualified',
  );

  const selectedStatusId = form.watch('currentStatusId');
  const selectedStatusName = (
    statuses.find((status) => String(status.id) === selectedStatusId)?.statusName ||
    ''
  ).toLowerCase();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] border-none shadow-2xl bg-white rounded-3xl overflow-hidden p-0 gap-0">
        {/* Modern Header with Dynamic Background */}
        <DialogHeader className="p-8 pb-10 bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white text-left relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <Badge variant="secondary" className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border-none px-2 py-0 mb-2 uppercase tracking-tighter text-[10px] font-bold">
                Pipeline Management
              </Badge>
              <DialogTitle className="text-2xl font-extrabold tracking-tight">
                Update Status
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm font-medium">
                Changing status for <span className="text-indigo-300 font-semibold">{candidateName}</span>
              </DialogDescription>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-2xl">
              <Target className="h-6 w-6 text-indigo-400" />
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-8 py-6 space-y-8 bg-slate-50/50"
          >
            {/* Visual Transition Indicator */}
            <div className="flex items-center justify-between gap-4 px-4 py-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm relative group transition-all hover:shadow-md">
                <div className="flex-1 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">From</span>
                    <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-md ring-4 ring-white transition-transform group-hover:scale-105", currentConfig.color)}>
                        <CurrentIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="mt-2 font-bold text-slate-700 text-xs capitalize">{currentStatus || "Untouched"}</span>
                </div>

                <div className="flex flex-col items-center justify-center">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <ArrowRight className="h-4 w-4 text-slate-400 animate-pulse" />
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">To</span>
                    <div className="p-2.5 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 text-slate-400 shadow-inner ring-4 ring-white">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="mt-2 font-bold text-slate-400 text-xs">Selection</span>
                </div>
            </div>

            <div className="space-y-5">
                <FormField
                control={form.control}
                name="currentStatusId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                        Select New Stage
                    </FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoadingStatuses}
                    >
                        <FormControl>
                        <SelectTrigger className="h-14 bg-white border-slate-200/80 shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-base font-medium">
                            <SelectValue placeholder="Where are they now?" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[350px] rounded-2xl border-slate-200 shadow-2xl p-2">
                        {isLoadingStatuses ? (
                            <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            </div>
                        ) : (
                            statuses.map((status) => {
                            const config = getStatusConfig(status.statusName);
                            const Icon = config.icon;
                            return (
                                <SelectItem 
                                key={status.id} 
                                value={status.id.toString()}
                                className="rounded-xl focus:bg-indigo-50 cursor-pointer p-3 my-1 transition-colors"
                                >
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg bg-gradient-to-br shadow-sm", config.color)}>
                                    <Icon className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                    <p className="font-bold text-slate-900 text-sm capitalize">
                                        {status.statusName}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        Pipeline Stage {status.id}
                                    </p>
                                    </div>
                                </div>
                                </SelectItem>
                            );
                            })
                        )}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Notes & Rationale</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Why is this candidate moving? (Optional)"
                        className="min-h-[110px] resize-none bg-white border-slate-200/80 shadow-sm focus:ring-4 focus:ring-indigo-500/10 rounded-2xl p-4 text-sm leading-relaxed"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                {selectedStatusName === 'on hold' && (
                  <FormField
                    control={form.control}
                    name="onHoldDurationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                          On Hold Duration (Days)
                        </FormLabel>
                        <FormControl>
                          <input
                            type="number"
                            min={1}
                            placeholder="Enter number of days on hold"
                            className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedStatusName === 'future' && (
                  <FormField
                    control={form.control}
                    name="futureYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                          Future Year
                        </FormLabel>
                        <FormControl>
                          <input
                            type="number"
                            min={new Date().getFullYear()}
                            placeholder="Enter target year (e.g., 2027)"
                            className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-200/60">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 h-12 hover:bg-slate-200/50 rounded-2xl font-bold text-slate-500 transition-colors"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                )}
                Update Status
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}