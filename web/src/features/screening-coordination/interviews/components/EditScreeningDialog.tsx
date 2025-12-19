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
import { MapPin, Video, PhoneCall, Save } from "lucide-react";
import { useGetScreeningQuery, useUpdateScreeningMutation } from "../data";
import { toast } from "sonner";

const editScreeningSchema = z
  .object({
    scheduledTime: z.date({ message: "Please select a date and time" }),
    mode: z.enum(["video", "phone", "in-person"]),
    meetingLink: z.string().optional(),
    notes: z.string().optional(),
    // Allow number inputs (which can come through as strings) and coerce to number or undefined
    duration: z.preprocess((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      return Number(v);
    }, z.number().min(0).optional()),
  })
  .superRefine((data, ctx) => {
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

type EditScreeningForm = z.infer<typeof editScreeningSchema>;

interface EditScreeningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Accept either `screeningId` or `interviewId` to be forgiving with prop naming
  screeningId?: string;
  interviewId?: string;
}

export default function EditScreeningDialog({
  open,
  onOpenChange,
  screeningId,
  interviewId,
}: EditScreeningDialogProps) {
  const id = screeningId || interviewId || "";
  const { data: interviewData, isLoading } = useGetScreeningQuery(id);
  const [updateScreening, { isLoading: isUpdating }] = useUpdateScreeningMutation();

  const form = useForm<EditScreeningForm>({
    resolver: zodResolver(editScreeningSchema),
    defaultValues: {
      scheduledTime: undefined,
      mode: "video",
      meetingLink: "",
      notes: "",
      duration: undefined,
    },
  });

  useEffect(() => {
    if (interviewData?.data) {
      const iv = interviewData.data;
      form.reset({
        scheduledTime: iv.scheduledTime ? new Date(iv.scheduledTime) : undefined,
        mode: (iv.mode as "video" | "phone" | "in-person") || "video",
        meetingLink: iv.meetingLink || "",
        notes: iv.notes || "",
        duration: iv.duration || undefined,
      });
    }
  }, [interviewData, form]);

  const handleSubmit = async (data: EditScreeningForm) => {
    if (!data.scheduledTime) {
      toast.error("Please select date and time");
      return;
    }

    try {
        if (!id) {
          toast.error("Screening ID is missing");
          return;
        }

        await updateScreening({
          id,
        data: {
          scheduledTime: data.scheduledTime.toISOString(),
          mode: data.mode,
          meetingLink: data.meetingLink?.trim() || undefined,
          notes: data.notes || undefined,
          duration: data.duration,
        },
      }).unwrap();

      toast.success("Screening updated successfully");
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to update screening:", err);
      toast.error("Failed to update screening");
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
          <DialogTitle>Edit Screening</DialogTitle>
            <DialogDescription>Update the screening details and schedule.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="scheduledTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time *</FormLabel>
                  <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} placeholder="Select screening date and time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Screening Mode *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select screening mode" />
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

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="Duration in minutes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-6 border-slate-200 hover:border-slate-300">
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating} className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Screening
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
