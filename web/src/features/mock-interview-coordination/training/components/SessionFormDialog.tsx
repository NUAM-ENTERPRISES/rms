import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCreateSessionMutation } from "../data";

const sessionFormSchema = z.object({
  sessionDate: z.string().min(1, "Session date is required"),
  sessionType: z.enum(["video", "phone", "in_person"], {
    required_error: "Session type is required",
  }),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  topicsCovered: z.string().optional(),
  plannedActivities: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainingId: string;
}

export function SessionFormDialog({
  open,
  onOpenChange,
  trainingId,
}: SessionFormDialogProps) {
  const [createSession, { isLoading }] = useCreateSessionMutation();

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      sessionDate: "",
      sessionType: "video",
      duration: 60,
      topicsCovered: "",
      plannedActivities: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (values: SessionFormValues) => {
    try {
      // Parse topics from comma-separated string
      const topicsArray = values.topicsCovered
        ? values.topicsCovered
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      await createSession({
        trainingId,
        data: {
          ...values,
          topicsCovered: topicsArray,
        },
      }).unwrap();

      toast.success("Training session created successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create session");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Schedule Training Session
          </DialogTitle>
          <DialogDescription>
            Add a new training session with details about the session type,
            duration, and topics.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sessionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        className="border-muted/50 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sessionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border-muted/50 focus:ring-emerald-500/20 focus:border-emerald-500">
                          <SelectValue placeholder="Select session type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="video">Video Call</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="in_person">In Person</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="border-muted/50 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="topicsCovered"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topics to Cover</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter topics separated by commas (e.g., Communication, Presentation, Technical Skills)"
                      {...field}
                      className="border-muted/50 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plannedActivities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planned Activities</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the planned activities for this session..."
                      rows={3}
                      {...field}
                      className="resize-none border-muted/50 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Session
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
