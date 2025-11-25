import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCompleteSessionMutation } from "../data";
import { TrainingSession, TRAINING_PERFORMANCE } from "../../types";

const completeSessionSchema = z.object({
  performanceRating: z.enum(
    ["excellent", "good", "satisfactory", "needs_improvement"],
    {
      required_error: "Performance rating is required",
    }
  ),
  notes: z.string().optional(),
  feedback: z.string().optional(),
});

type CompleteSessionFormValues = z.infer<typeof completeSessionSchema>;

interface CompleteSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: TrainingSession;
}

export function CompleteSessionDialog({
  open,
  onOpenChange,
  session,
}: CompleteSessionDialogProps) {
  const [completeSession, { isLoading }] = useCompleteSessionMutation();

  const form = useForm<CompleteSessionFormValues>({
    resolver: zodResolver(completeSessionSchema),
    defaultValues: {
      performanceRating: undefined,
      notes: "",
      feedback: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (values: CompleteSessionFormValues) => {
    try {
      await completeSession({
        id: session.id,
        data: values,
      }).unwrap();

      toast.success("Training session marked as complete");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to complete session");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            Complete Training Session
          </DialogTitle>
          <DialogDescription>
            Provide feedback and performance rating for this training session.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="performanceRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Performance Rating *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="border-muted/50 focus:ring-green-500/20 focus:border-green-500">
                        <SelectValue placeholder="Select performance rating" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TRAINING_PERFORMANCE.EXCELLENT}>
                        Excellent
                      </SelectItem>
                      <SelectItem value={TRAINING_PERFORMANCE.GOOD}>
                        Good
                      </SelectItem>
                      <SelectItem value={TRAINING_PERFORMANCE.SATISFACTORY}>
                        Satisfactory
                      </SelectItem>
                      <SelectItem
                        value={TRAINING_PERFORMANCE.NEEDS_IMPROVEMENT}
                      >
                        Needs Improvement
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Document what was covered in this session, observations, and key outcomes..."
                      rows={4}
                      {...field}
                      className="resize-none border-muted/50 focus-visible:ring-green-500/20 focus-visible:border-green-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback for Candidate</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide constructive feedback and recommendations for the candidate..."
                      rows={4}
                      {...field}
                      className="resize-none border-muted/50 focus-visible:ring-green-500/20 focus-visible:border-green-500"
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
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Session
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
