import React from "react";
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
import { DatePicker } from "@/components/molecules";
import { MapPin, Video, PhoneCall, Plus } from "lucide-react";
import { useGetProjectsQuery } from "@/features/projects/api";
import { useCreateInterviewMutation } from "../api";
import { toast } from "sonner";

const scheduleInterviewSchema = z.object({
  candidateProjectMapId: z.string(),
  scheduledTime: z.date({
    message: "Please select a date and time",
  }),
  duration: z.coerce.number().int().min(1).optional(),
  type: z.enum(["technical", "hr", "managerial", "final"]).optional(),
  mode: z.enum(["video", "phone", "in-person"]),
  // meetingLink is optional; if provided, validate as URL, but allow empty string
  meetingLink: z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.string().url().optional()),
  notes: z.string().optional(),
});

type ScheduleInterviewForm = z.infer<typeof scheduleInterviewSchema>;

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCandidateProjectMapId?: string;
  initialCandidateName?: string;
  initialProjectName?: string;
}

export default function ScheduleInterviewDialog({
  open,
  onOpenChange,
  initialCandidateProjectMapId,
  initialCandidateName,
  initialProjectName,
}: ScheduleInterviewDialogProps) {
  const { data: projectsData } = useGetProjectsQuery(
    {
      status: "active",
      page: 1,
      limit: 100,
    },
    {
      skip: !!initialCandidateProjectMapId, // Skip fetching projects if we already have a candidateProjectMapId
    }
  );

  const [createInterview, { isLoading: isCreating }] =
    useCreateInterviewMutation();

  const form = useForm<ScheduleInterviewForm>({
    mode: "onChange",
    resolver: zodResolver(scheduleInterviewSchema) as any,
    defaultValues: {
      candidateProjectMapId: initialCandidateProjectMapId ?? undefined,
      scheduledTime: undefined,
      duration: 60,
      type: "technical",
      mode: "video",
      meetingLink: undefined,
      notes: "",
    },
  });

  const modeValue = form.watch("mode");

  // Clear meetingLink when switching away from video mode to avoid leftover invalid values
  React.useEffect(() => {
    if (modeValue !== "video") {
      form.setValue("meetingLink", undefined, { shouldValidate: true, shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeValue]);

  // Reset form values when initial props change / dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        candidateProjectMapId: initialCandidateProjectMapId ?? undefined,
        scheduledTime: undefined,
        duration: 60,
        type: "technical",
        mode: "video",
        meetingLink: undefined,
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCandidateProjectMapId]);

  const handleSubmit = async (data: ScheduleInterviewForm) => {
    if (!data.scheduledTime) {
      toast.error("Please select a date and time");
      return;
    }

    try {
      const interviewData: any = {
        candidateProjectMapId: data.candidateProjectMapId,
        scheduledTime: data.scheduledTime.toISOString(),
        duration: data.duration,
        type: data.type,
        mode: data.mode,
        meetingLink: data.meetingLink,
        notes: data.notes,
      };

      await createInterview(interviewData as any).unwrap();
      toast.success("Interview scheduled successfully");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Failed to schedule interview:", error);
      toast.error("Failed to schedule interview");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Schedule a new interview for a candidate-project combination.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Candidate & Project Selection */}
            {initialCandidateProjectMapId ? (
              <FormField
                control={form.control}
                name="candidateProjectMapId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Candidate & Project</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        disabled
                        value={`${initialCandidateName || "Candidate"} — ${initialProjectName || "Project"}`}
                        className="w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-sm cursor-not-allowed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="candidateProjectMapId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projectsData?.data?.projects?.map((project: any) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Date and Time */}
            <FormField
              control={form.control}
              name="scheduledTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time *</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select interview date and time"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mode */}
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interview Mode *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interview mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-blue-600" />
                          Video Call
                        </div>
                      </SelectItem>
                      <SelectItem value="phone">
                        <div className="flex items-center gap-2">
                          <PhoneCall className="h-4 w-4 text-green-600" />
                          Phone Call
                        </div>
                      </SelectItem>
                      <SelectItem value="in-person">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-purple-600" />
                          In-Person
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meeting link (only for video mode) */}
            {modeValue === "video" && (
              <FormField
                control={form.control}
                name="meetingLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting link (optional)</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        placeholder="https://meet.example.com/room"
                        className="w-full rounded-md border border-input px-3 py-2 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Duration */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      type="number"
                      min={1}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interview Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interview type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="managerial">Managerial</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      placeholder="Add any additional notes or instructions"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

      

            <DialogFooter className="pt-6 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 px-6 border-slate-200 hover:border-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid || isCreating}
                className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Interview
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
