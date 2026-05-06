import { useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { MapPin, Video, PhoneCall, Save, Calendar, Clock, Plane, Home } from "lucide-react";
import { useGetInterviewQuery, useUpdateInterviewMutation } from "../api";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const editInterviewSchema = z
  .object({
    scheduledTime: z.date({
      message: "Please select a date and time",
    }),
    mode: z.enum(["video", "phone", "in-person"]),
    accommodation: z.boolean(),
    duration: z.coerce.number().min(5).max(480).optional(),
    notes: z.string().optional(),
    meetingLink: z.string().optional(),
    airTicket: z.enum(["none", "up-and-down", "up-only", "down-only"]).optional(),
  })
  .superRefine((data, ctx) => {
    // Meeting link is optional. If provided, validate it's a proper URL.
    if (data.meetingLink && data.meetingLink.trim() !== "") {
      try {
        // eslint-disable-next-line no-new
        new URL(data.meetingLink as string);
      } catch (e) {
        ctx.addIssue({
          path: ["meetingLink"],
          message: "Please enter a valid meeting link (valid URL)",
          code: z.ZodIssueCode.custom,
        });
      }
    }
  });

type EditInterviewForm = z.infer<typeof editInterviewSchema>;

interface EditInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string;
}

export default function EditInterviewDialog({
  open,
  onOpenChange,
  interviewId,
}: EditInterviewDialogProps) {
  const { data: interviewData, isLoading } = useGetInterviewQuery(interviewId);
  const [updateInterview, { isLoading: isUpdating }] =
    useUpdateInterviewMutation();

  const form = useForm<EditInterviewForm>({
    resolver: zodResolver(editInterviewSchema) as any,
    defaultValues: {
      scheduledTime: undefined,
      mode: "video",
      duration: 30,
      notes: "",
      meetingLink: "",
      accommodation: false,
      airTicket: "none",
    },
  });

  // Populate form when interview data loads
  useEffect(() => {
    if (interviewData?.data) {
      const interview = interviewData.data;
      const scheduledDate = new Date(interview.scheduledTime);

      form.reset({
        scheduledTime: scheduledDate,
        mode: (interview.mode as "video" | "phone" | "in-person") || "video",
        duration: interview.duration || 30,
        notes: interview.notes || "",
        meetingLink: interview.meetingLink || "",
        accommodation: !!interview.accommodation,
        airTicket: (interview.airTicket as any) || "none",
      });
    }
  }, [interviewData, form]);

  const handleSubmit = async (data: EditInterviewForm) => {
    if (!data.scheduledTime) {
      toast.error("Please select date and time");
      return;
    }

    try {
      const airTicketUp = data.airTicket === 'up-only' || data.airTicket === 'up-and-down';
      const airTicketDown = data.airTicket === 'down-only' || data.airTicket === 'up-and-down';

      const interviewUpdateData = {
        scheduledTime: data.scheduledTime.toISOString(),
        mode: data.mode,
        duration: data.duration,
        notes: data.notes,
        meetingLink: data.meetingLink?.trim() || undefined,
        accommodation: data.accommodation,
        airTicket: data.airTicket === 'none' ? undefined : data.airTicket,
        airTicketUp,
        airTicketDown,
      };

      await updateInterview({
        id: interviewId,
        data: interviewUpdateData as any,
      }).unwrap();
      toast.success("Interview updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update interview:", error);
      toast.error("Failed to update interview");
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Interview</DialogTitle>
          <DialogDescription>
            Update the interview details and schedule.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date and Time */}
              <FormField
                control={form.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      Date & Time *
                    </FormLabel>
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
                    <FormLabel className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-slate-500" />
                      Interview Mode *
                    </FormLabel>
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

              {/* Duration */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-slate-700">
                      <Clock className="h-4 w-4 text-slate-500" />
                      Duration (minutes)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Air Ticket */}
              <FormField
                control={form.control}
                name="airTicket"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-slate-700">
                      <Plane className="h-4 w-4 text-slate-500" />
                      Air Ticket
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select air ticket type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Not Requested</SelectItem>
                        <SelectItem value="up-and-down">Up and Down</SelectItem>
                        <SelectItem value="up-only">Up Only</SelectItem>
                        <SelectItem value="down-only">Down Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Meeting Link - only for video mode (optional) */}
            {form.watch("mode") === "video" && (
              <FormField
                control={form.control}
                name="meetingLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Link</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://zoom.us/meeting/xxx" type="url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Accommodation */}
            <FormField
              control={form.control}
              name="accommodation"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4 border rounded-md border-slate-200">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <Home className="h-4 w-4 text-emerald-500" />
                      Accommodation Required
                    </FormLabel>
                  </div>
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
                disabled={isUpdating}
                className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Interview
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
