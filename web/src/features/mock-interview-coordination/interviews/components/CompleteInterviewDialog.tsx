import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";

const completeInterviewSchema = z.object({
  decision: z.enum(["approved", "needs_training", "rejected"]),
  remarks: z.string().optional(),
  strengths: z.string().optional(),
  areasOfImprovement: z.string().optional(),
});

type CompleteInterviewFormValues = z.infer<typeof completeInterviewSchema>;

interface CompleteInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CompleteInterviewFormValues) => Promise<void>;
  isLoading?: boolean;
  overallScorePct?: number; // 0-100
  derivedRating?: number; // 1-5
}

export function CompleteInterviewDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  overallScorePct,
  derivedRating,
}: CompleteInterviewDialogProps) {
  const form = useForm<CompleteInterviewFormValues>({
    resolver: zodResolver(completeInterviewSchema),
    defaultValues: {
      decision: "approved",
      remarks: "",
      strengths: "",
      areasOfImprovement: "",
    },
  });

  const handleSubmit = async (data: CompleteInterviewFormValues) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Mock Interview</DialogTitle>
          <DialogDescription>
            Provide overall assessment and decision for this interview.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Overall preview (computed from question scores) */}
            <div className="rounded-md border p-3 bg-muted">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Overall Score</div>
                <div className="text-sm">{typeof overallScorePct === 'number' ? `${overallScorePct.toFixed(1)}%` : '—'}</div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-muted-foreground">Derived Rating (1-5)</div>
                <div className="text-xs text-muted-foreground">{typeof derivedRating === 'number' ? `${derivedRating}/5` : '—'}</div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="decision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select decision..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="needs_training">Needs Training</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="strengths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strengths</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What did the candidate do well?"
                      {...field}
                      disabled={isLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="areasOfImprovement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Areas of Improvement</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What areas need improvement?"
                      {...field}
                      disabled={isLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>General Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional comments or notes..."
                      {...field}
                      disabled={isLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <LoadingSpinner className="mr-2 h-4 w-4" />}
                Complete Interview
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
