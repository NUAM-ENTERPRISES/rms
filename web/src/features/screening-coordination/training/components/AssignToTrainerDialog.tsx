import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { TRAINING_TYPE, TRAINING_PRIORITY } from "../../types";

const assignToTrainerSchema = z.object({
  trainingType: z.string().min(1, "Training type is required"),
  focusAreas: z.array(z.string()).min(1, "At least one focus area is required"),
  priority: z.string().optional(),
  targetCompletionDate: z.string().optional(),
  notes: z.string().optional(),
});

type AssignToTrainerFormValues = z.infer<typeof assignToTrainerSchema>;

interface AssignToTrainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AssignToTrainerFormValues) => Promise<void>;
  isLoading?: boolean;
  candidateName?: string;
  screeningId?: string;
}

export function AssignToTrainerDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  candidateName,
}: AssignToTrainerDialogProps) {
  const [focusAreaInput, setFocusAreaInput] = useState("");
  
  const form = useForm<AssignToTrainerFormValues>({
    resolver: zodResolver(assignToTrainerSchema),
    defaultValues: {
      trainingType: "",
      focusAreas: [],
      priority: "medium",
      targetCompletionDate: "",
      notes: "",
    },
  });

  const focusAreas = form.watch("focusAreas");

  useEffect(() => {
    if (!open) {
      form.reset();
      setFocusAreaInput("");
    }
  }, [open, form]);

  const handleAddFocusArea = () => {
    const trimmed = focusAreaInput.trim();
    if (trimmed && !focusAreas.includes(trimmed)) {
      form.setValue("focusAreas", [...focusAreas, trimmed]);
      setFocusAreaInput("");
    }
  };

  const handleRemoveFocusArea = (area: string) => {
    form.setValue(
      "focusAreas",
      focusAreas.filter((a) => a !== area)
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddFocusArea();
    }
  };

  const handleSubmit = async (data: AssignToTrainerFormValues) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Training</DialogTitle>
          <DialogDescription>
            Assign training to {candidateName || "this candidate"} to help improve their skills.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="trainingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training Type *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select training type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TRAINING_TYPE.INTERVIEW_SKILLS}>
                        Interview Skills
                      </SelectItem>
                      <SelectItem value={TRAINING_TYPE.TECHNICAL}>
                        Technical
                      </SelectItem>
                      <SelectItem value={TRAINING_TYPE.COMMUNICATION}>
                        Communication
                      </SelectItem>
                      <SelectItem value={TRAINING_TYPE.ROLE_SPECIFIC}>
                        Role Specific
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="focusAreas"
              render={() => (
                <FormItem>
                  <FormLabel>Focus Areas *</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add focus area..."
                        value={focusAreaInput}
                        onChange={(e) => setFocusAreaInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        onClick={handleAddFocusArea}
                        disabled={!focusAreaInput.trim() || isLoading}
                        variant="outline"
                      >
                        Add
                      </Button>
                    </div>
                    {focusAreas.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {focusAreas.map((area) => (
                          <div
                            key={area}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-primary/10 text-sm"
                          >
                            <span>{area}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFocusArea(area)}
                              className="ml-1 hover:text-destructive"
                              disabled={isLoading}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TRAINING_PRIORITY.LOW}>Low</SelectItem>
                      <SelectItem value={TRAINING_PRIORITY.MEDIUM}>Medium</SelectItem>
                      <SelectItem value={TRAINING_PRIORITY.HIGH}>High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetCompletionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Completion Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={isLoading}
                    />
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
                    <Textarea
                      placeholder="Additional notes or instructions..."
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
                Assign Training
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
