import { useEffect, useState } from "react";
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
  FormDescription,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { TRAINING_TYPE, TRAINING_PRIORITY, SCREENING_DECISION } from "@/features/screening-coordination/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const completeInterviewSchema = z.object({
  decision: z.enum(Object.values(SCREENING_DECISION) as [string, ...string[]]).optional().refine(val => !!val, { message: "Please select a decision" }),
  overallRating: z.coerce.number().min(1, "Score must be at least 1%").max(100, "Score cannot exceed 100%"),
  remarks: z.string().optional(),
  strengths: z.string().optional(),
  areasOfImprovement: z.string().optional(),
  trainingType: z.string().optional(),
  focusAreas: z.array(z.string()).optional(),
  priority: z.enum(Object.values(TRAINING_PRIORITY) as [string, ...string[]]).optional(),
  targetCompletionDate: z.string().optional(),
  trainingNotes: z.string().optional(),
});

export type CompleteInterviewFormValues = z.infer<typeof completeInterviewSchema>;


interface CompleteInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CompleteInterviewFormValues) => Promise<void>;
  isLoading?: boolean;
  overallScorePct?: number; // 0-100
  derivedRating?: number; // 1-5
  checklistItems?: Record<string, {
    passed: boolean;
    score?: number;
    notes?: string;
  }>;
  checklistMetadata?: any[]; // The actual template items for labels
  assessmentRatings?: {
    goodLooking?: number;
    fairness?: number;
    languageProficiency?: string;
  };
}

export function CompleteScreeningDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  overallScorePct,
  checklistItems = {},
  checklistMetadata = [],
  assessmentRatings = {},
}: CompleteInterviewDialogProps) {
  const form = useForm<CompleteInterviewFormValues>({
    resolver: zodResolver(completeInterviewSchema) as any,
    defaultValues: {
      decision: undefined as any,
      overallRating: 0,
      remarks: "",
      strengths: "",
      areasOfImprovement: "",
      trainingType: TRAINING_TYPE.TECHNICAL,
      focusAreas: [],
      priority: TRAINING_PRIORITY.MEDIUM,
      targetCompletionDate: "",
      trainingNotes: "",
    },
  });

  const [focusAreaInput, setFocusAreaInput] = useState("");

  // Keep overallRating in sync with calculated score when it changes, 
  // but only if the user hasn't manually touched it or when dialog opens
  useEffect(() => {
    if (open) {
      // If we have checklist items, calculate the score. Otherwise, use 0 or current value.
      const hasItems = Object.keys(checklistItems).length > 0;
      const calculatedScore = hasItems ? Math.round(overallScorePct || 0) : form.getValues("overallRating") || 0;
      
      form.reset({
        decision: undefined as any,
        overallRating: calculatedScore,
        remarks: "",
        strengths: "",
        areasOfImprovement: "",
        trainingType: TRAINING_TYPE.TECHNICAL,
        focusAreas: [],
        priority: TRAINING_PRIORITY.MEDIUM,
        targetCompletionDate: "",
        trainingNotes: "",
      });
    }
  }, [open, overallScorePct, form, checklistItems]);

  const handleSubmit = async (data: CompleteInterviewFormValues) => {
    await onSubmit(data);
    form.reset();
  };

  const addFocusArea = () => {
    const value = focusAreaInput.trim();
    if (!value) return;
    const existing = form.getValues("focusAreas") || [];
    if (!existing.includes(value)) {
      form.setValue("focusAreas", [...existing, value]);
    }
    setFocusAreaInput("");
  };

  const removeFocusArea = (area: string) => {
    const existing = form.getValues("focusAreas") || [];
    form.setValue("focusAreas", existing.filter((a) => a !== area));
  };

  const currentDecision = form.watch("decision");
  const currentRating = form.watch("overallRating");
  const focusAreas = form.watch("focusAreas");
  
  // Convert rating to number to ensure validation works even if it's a string from input
  const ratingValue = Number(currentRating);
  const isFormValid =
    !!currentDecision &&
    !isNaN(ratingValue) &&
    ratingValue > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-h-[75vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Screening</DialogTitle>
          <DialogDescription>
            Provide overall assessment and decision for this screening.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Overall Assessment Summary */}
            <div className="space-y-3">
              <div className="rounded-xl border p-4 bg-indigo-50/50 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-indigo-900">Calculated Score</div>
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 font-bold">
                    {typeof overallScorePct === 'number' ? `${overallScorePct.toFixed(1)}%` : '—'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 py-2 border-t border-indigo-100 mt-2">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Appearance</p>
                    <p className="text-sm font-bold text-slate-700">{assessmentRatings.goodLooking}/5</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Fairness</p>
                    <p className="text-sm font-bold text-slate-700">{assessmentRatings.fairness}/5</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Language</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{assessmentRatings.languageProficiency || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Checklist Review Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">CHECKLIST PREVIEW</span>
                  <span className="text-[10px] text-slate-400">{Object.keys(checklistItems).length} Items</span>
                </div>
                <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100">
                  {Object.entries(checklistItems).map(([id, data]) => {
                    const meta = checklistMetadata.find(m => m.id === id);
                    return (
                      <div key={id} className="p-3 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-start gap-2">
                          {data.passed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                              {meta?.criterion || 'Criterion Not Found'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                                Score: {data.score}%
                              </span>
                              {data.notes && (
                                <span className="text-[10px] text-slate-400 italic truncate">
                                  "{data.notes}"
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(checklistItems).length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No items evaluated.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="decision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decision</FormLabel>
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
                        <SelectItem value={SCREENING_DECISION.APPROVED}>Approved</SelectItem>
                        <SelectItem value={SCREENING_DECISION.NEEDS_TRAINING}>Needs Training</SelectItem>
                        <SelectItem value={SCREENING_DECISION.ON_HOLD}>On Hold</SelectItem>
                        <SelectItem value={SCREENING_DECISION.REJECTED}>Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="overallRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Final Overall Score (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0-100"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      {Object.keys(checklistItems).length > 0 
                        ? "Pre-filled from checklist (editable)" 
                        : "Enter manually (no template items evaluated)"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {currentDecision === SCREENING_DECISION.NEEDS_TRAINING && (
              <div className="space-y-4 p-4 border border-rose-100 rounded-lg bg-rose-50">
                <p className="text-sm font-semibold text-rose-700">Training Assignment Details</p>

                <FormField
                  control={form.control}
                  name="trainingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Training Type</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value)}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select training type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={TRAINING_TYPE.INTERVIEW_SKILLS}>Interview Skills</SelectItem>
                          <SelectItem value={TRAINING_TYPE.TECHNICAL}>Technical</SelectItem>
                          <SelectItem value={TRAINING_TYPE.COMMUNICATION}>Communication</SelectItem>
                          <SelectItem value={TRAINING_TYPE.ROLE_SPECIFIC}>Role Specific</SelectItem>
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
                      <FormLabel>Focus Areas</FormLabel>
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Add focus area..."
                          value={focusAreaInput}
                          onChange={(e) => setFocusAreaInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addFocusArea();
                            }
                          }}
                          disabled={isLoading}
                        />
                        <Button type="button" onClick={addFocusArea} disabled={!focusAreaInput.trim() || isLoading}>
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(focusAreas || []).map((area) => (
                          <span key={area} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-100 text-rose-700">
                            {area}
                            <button type="button" onClick={() => removeFocusArea(area)} className="font-bold" disabled={isLoading}>
                              ×
                            </button>
                          </span>
                        ))}
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
                        onValueChange={(value) => field.onChange(value)}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
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
                  name="trainingNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Training Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Optional notes for trainer..."
                          {...field}
                          disabled={isLoading}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button type="submit" disabled={isLoading || !isFormValid}>
                {isLoading && <LoadingSpinner className="mr-2 h-4 w-4" />}
                Complete Screening
              </Button>
            </span>
          </TooltipTrigger>
          {!isFormValid && (
            <TooltipContent>
              <p>Please select a decision and enter an overall rating.</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </DialogFooter>
  </form>
</Form>
</DialogContent>
</Dialog>
);
}
