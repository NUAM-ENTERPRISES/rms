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
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/molecules";
import { MapPin, Video, PhoneCall, Plus, Users } from "lucide-react";
import { useGetProjectsQuery } from "@/features/projects/api";
import { useCreateInterviewMutation, useCreateBulkInterviewsMutation } from "../api";
import { toast } from "sonner";

const scheduleInterviewSchema = z
  .object({
    candidateProjectMapId: z.string().optional(),
    candidateProjectMapIds: z.array(z.string()).optional(),
    scheduledTime: z.date({
      message: "Please select a date and time",
    }),
    mode: z.enum(["video", "phone", "in-person"]),
    location: z.string().optional(),
    airTicket: z.enum(["up-and-down", "up-only", "down-only"]).optional(),
    accommodation: z.boolean().optional(),
    // meetingLink is optional; if provided, validate as URL, but allow empty string
    meetingLink: z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.string().url().optional()),
    notes: z.string().optional(),
  })
  .refine(
    (values) => values.mode !== "in-person" || !!values.location?.trim(),
    {
      path: ["location"],
      message: "Location is required for in-person interviews",
    }
  );

type ScheduleInterviewForm = z.infer<typeof scheduleInterviewSchema>;

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCandidateProjectMapId?: string;
  initialCandidateProjectMapIds?: string[];
  initialCandidateName?: string;
  initialProjectName?: string;
}

export default function ScheduleInterviewDialog({
  open,
  onOpenChange,
  initialCandidateProjectMapId,
  initialCandidateProjectMapIds,
  initialCandidateName,
  initialProjectName,
}: ScheduleInterviewDialogProps) {
  const { data: projectsData } = useGetProjectsQuery(
    {
      status: "active",
      page: 1,
      limit: 10,
    },
    {
      skip: !!initialCandidateProjectMapId || !!initialCandidateProjectMapIds, // Skip fetching projects if we already have candidate mapping(s)
    }
  );

  const [createInterview, { isLoading: isCreatingSingle }] =
    useCreateInterviewMutation();
  const [createBulkInterviews, { isLoading: isCreatingBulk }] =
    useCreateBulkInterviewsMutation();

  const isCreating = isCreatingSingle || isCreatingBulk;

  const form = useForm<ScheduleInterviewForm>({
    mode: "onChange",
    resolver: zodResolver(scheduleInterviewSchema) as any,
    defaultValues: {
      candidateProjectMapId: initialCandidateProjectMapId ?? undefined,
      candidateProjectMapIds: initialCandidateProjectMapIds ?? undefined,
      scheduledTime: undefined,
      mode: "video",
      location: "",
      airTicket: undefined,
      accommodation: false,
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
  }, [modeValue, form]);

  // Reset form values when initial props change / dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        candidateProjectMapId: initialCandidateProjectMapId ?? undefined,
        candidateProjectMapIds: initialCandidateProjectMapIds ?? undefined,
        scheduledTime: undefined,
        mode: "video",
        location: "",
        airTicket: undefined,
        accommodation: false,
        meetingLink: undefined,
        notes: "",
      });
    }
  }, [open, initialCandidateProjectMapId, initialCandidateProjectMapIds, form]);

  const handleSubmit = async (data: ScheduleInterviewForm) => {
    if (!data.scheduledTime) {
      toast.error("Please select a date and time");
      return;
    }

    const airTicketUp = data.airTicket === 'up-only' || data.airTicket === 'up-and-down';
    const airTicketDown = data.airTicket === 'down-only' || data.airTicket === 'up-and-down';

    try {
      if (initialCandidateProjectMapIds && initialCandidateProjectMapIds.length > 0) {
        const bulkData = initialCandidateProjectMapIds.map((id) => ({
          candidateProjectMapId: id,
          scheduledTime: data.scheduledTime.toISOString(),
          mode: data.mode,
          location: data.location,
          meetingLink: data.meetingLink,
          notes: data.notes,
          airTicket: data.airTicket,
          airTicketUp,
          airTicketDown,
          accommodation: data.accommodation,
        }));
        await createBulkInterviews(bulkData).unwrap();
        toast.success(`${bulkData.length} Interviews scheduled successfully`);
      } else {
        const interviewData = {
          candidateProjectMapId: data.candidateProjectMapId,
          scheduledTime: data.scheduledTime.toISOString(),
          mode: data.mode,
          location: data.location,
          meetingLink: data.meetingLink,
          notes: data.notes,
          airTicket: data.airTicket,
          airTicketUp,
          airTicketDown,
          accommodation: data.accommodation,
        };
        await createInterview(interviewData as any).unwrap();
        toast.success("Interview scheduled successfully");
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Failed to schedule interview:", error);
      const message =
        error?.data?.message ||
        error?.error ||
        error?.message ||
        (typeof error === "string" ? error : undefined) ||
        "Failed to schedule interview";
      toast.error(message);
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
            {initialCandidateProjectMapIds && initialCandidateProjectMapIds.length > 0 ? (
              <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                      Bulk Scheduling
                    </p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      Scheduling interviews for {initialCandidateProjectMapIds.length} candidates at once.
                    </p>
                  </div>
                </div>
              </div>
            ) : initialCandidateProjectMapId ? (
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

            {modeValue === "in-person" && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        placeholder="Enter interview location"
                        className="w-full rounded-md border border-input px-3 py-2 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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

            {/* Air Ticket */}
            <FormField
              control={form.control}
              name="airTicket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Air ticket</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select air ticket type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="up-and-down">Up and Down</SelectItem>
                        <SelectItem value="up-only">Up Only</SelectItem>
                        <SelectItem value="down-only">Down Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Accommodation */}
            <FormField
              control={form.control}
              name="accommodation"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="m-0">Accommodation required</FormLabel>
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
                    {initialCandidateProjectMapIds && initialCandidateProjectMapIds.length > 0 
                      ? `Bulk Schedule ${initialCandidateProjectMapIds.length} Interviews`
                      : "Schedule Interview"}
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
