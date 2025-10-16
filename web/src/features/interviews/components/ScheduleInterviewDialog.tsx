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
  projectId: z.string().min(1, "Please select a project"),
  scheduledTime: z.date({
    message: "Please select a date and time",
  }),
  mode: z.enum(["video", "phone", "in-person"]),
  notes: z.string().optional(),
});

type ScheduleInterviewForm = z.infer<typeof scheduleInterviewSchema>;

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ScheduleInterviewDialog({
  open,
  onOpenChange,
}: ScheduleInterviewDialogProps) {
  const { data: projectsData } = useGetProjectsQuery({
    status: "active",
    page: 1,
    limit: 100,
  });

  const [createInterview, { isLoading: isCreating }] =
    useCreateInterviewMutation();

  const form = useForm<ScheduleInterviewForm>({
    resolver: zodResolver(scheduleInterviewSchema),
    defaultValues: {
      projectId: "",
      scheduledTime: undefined,
      mode: "video",
      notes: "",
    },
  });

  const handleSubmit = async (data: ScheduleInterviewForm) => {
    if (!data.scheduledTime) {
      toast.error("Please select a date and time");
      return;
    }

    try {
      const interviewData = {
        projectId: data.projectId,
        scheduledTime: data.scheduledTime.toISOString(),
        mode: data.mode,
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
            {/* Project Selection */}
            <FormField
              control={form.control}
              name="projectId"
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
                disabled={isCreating}
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
