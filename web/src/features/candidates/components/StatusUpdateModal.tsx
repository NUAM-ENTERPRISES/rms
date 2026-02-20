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
  Edit
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusUpdateSchema = z.object({
  currentStatusId: z.string().min(1, "Please select a status"),
  reason: z.string().optional(),
});

type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  currentStatus: string;
  candidateName: string;
}

// Reuse colors from CandidatePipeline
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
    },
  });

  const currentConfig = getStatusConfig(currentStatus);
  const CurrentIcon = currentConfig.icon;

  const handleSubmit = async (data: StatusUpdateFormData) => {
    try {
      await updateStatus({
        candidateId,
        status: {
          currentStatusId: parseInt(data.currentStatusId),
          reason: data.reason,
        },
      }).unwrap();

      toast.success("Candidate status updated successfully");
      onClose();
      form.reset();
    } catch (error) {
      console.error("Failed to update candidate status:", error);
      toast.error("Failed to update candidate status");
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const statuses = statusesData?.data || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden p-0">
        <DialogHeader className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-16 translate-x-16" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md shadow-inner">
              <Target className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Update Status
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Move <span className="text-white font-medium">{candidateName}</span> through the pipeline
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="p-6 space-y-6"
          >
            {/* Current Status Showcase */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-inner flex items-center justify-between">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                  Current Status
                </label>
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg bg-gradient-to-br shadow-sm", currentConfig.color)}>
                     <CurrentIcon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-bold text-slate-900 capitalize leading-none">
                    {currentStatus || "Untouched"}
                  </span>
                </div>
              </div>
              <div className="h-10 w-[1px] bg-slate-200" />
              <div className="text-right">
              
              </div>
            </div>

            <FormField
              control={form.control}
              name="currentStatusId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Edit className="h-3.5 w-3.5 text-slate-400" />
                    Update Status
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingStatuses}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 border-slate-200 shadow-sm transition-all focus:ring-2 focus:ring-blue-500/20 rounded-xl">
                        <SelectValue placeholder="Select target status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px] rounded-xl border-slate-200 shadow-xl">
                      {isLoadingStatuses ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        </div>
                      ) : (
                        statuses.map((status) => {
                          const config = getStatusConfig(status.statusName);
                          const Icon = config.icon;
                          return (
                            <SelectItem 
                              key={status.id} 
                              value={status.id.toString()}
                              className="focus:bg-slate-50 cursor-pointer p-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg bg-gradient-to-br shadow-sm", config.color)}>
                                  <Icon className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-sm capitalize">
                                    {status.statusName}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-medium">
                                    {config.description || "Move to " + status.statusName}
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
                  <FormLabel className="text-sm font-bold text-slate-700">Internal Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any specific comments about this transition..."
                      className="min-h-[100px] resize-none border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-3 sm:gap-0 pt-2 pb-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
                className="hover:bg-slate-100 rounded-xl font-bold text-slate-600"
              >
                Dismiss
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold px-8 shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Change
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

