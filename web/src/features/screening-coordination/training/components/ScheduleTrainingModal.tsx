import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Calendar, Users, Video, Phone, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBulkCreateSessionsMutation } from "../data/training.endpoints";
import { TrainingAssignment } from "../../types";

const scheduleSchema = z.object({
  sessionDate: z.string().min(1, "Session date & time is required"),
  duration: z.coerce.number().min(15).max(480),
  mode: z.enum(["video", "phone", "in_person"]),
  topic: z.string().optional(),
  meetingLink: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface ScheduleTrainingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssignments: TrainingAssignment[];
  onSuccess?: () => void;
}

export default function ScheduleTrainingModal({
  open,
  onOpenChange,
  selectedAssignments,
  onSuccess,
}: ScheduleTrainingModalProps) {
  const [bulkCreateSessions, { isLoading }] = useBulkCreateSessionsMutation();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema) as any,
    defaultValues: {
      sessionDate: "",
      duration: 60,
      mode: "video",
      topic: "",
      meetingLink: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        sessionDate: "",
        duration: 60,
        mode: "video",
        topic: "",
        meetingLink: "",
      });
    }
  }, [open, form]);

  const onSubmit = async (values: ScheduleFormValues) => {
    try {
      if (selectedAssignments.length === 0) {
        toast.error("No assignments selected");
        return;
      }

      await bulkCreateSessions({
        trainingAssignmentIds: selectedAssignments.map((a) => a.id),
        sessionDate: new Date(values.sessionDate).toISOString(),
        duration: values.duration,
        mode: values.mode,
        topic: values.topic,
        meetingLink: values.meetingLink,
      }).unwrap();

      toast.success(
        `Training successfully scheduled for ${selectedAssignments.length} candidate(s)`
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to schedule training");
    }
  };

  const isBatch = selectedAssignments.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            {isBatch ? "Bulk Schedule Training" : "Schedule Training Session"}
          </DialogTitle>
          <DialogDescription>
            {isBatch
              ? `Configure a shared training session for ${selectedAssignments.length} candidates.`
              : "Set the date, time, and mode for this training session."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {!isBatch && selectedAssignments[0] && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Users className="w-4 h-4 text-slate-500" />
                  Candidate: {selectedAssignments[0].candidateProjectMap?.candidate?.firstName} {selectedAssignments[0].candidateProjectMap?.candidate?.lastName}
                </div>
                <div className="text-xs text-slate-500 mt-1 ml-6">
                  Project: {selectedAssignments[0].candidateProjectMap?.project?.title}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sessionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="video">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4" /> Video Call
                          </div>
                        </SelectItem>
                        <SelectItem value="phone">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" /> Phone Call
                          </div>
                        </SelectItem>
                        <SelectItem value="in_person">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> In-Person
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Behavioral Prep" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="meetingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Link (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://meet.google.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isBatch ? "Schedule for All" : "Schedule Session"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
