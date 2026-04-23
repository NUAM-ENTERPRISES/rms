import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  GraduationCap,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Star,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Screening, 
  SCREENING_DECISION, 
  TRAINING_PRIORITY, 
  TRAINING_STATUS,
  TRAINING_TYPE,
  TrainingAssignment 
} from "@/features/screening-coordination/types";
import { useUpdateScreeningDecisionMutation } from "../data/interviews.endpoints";
import { useGetTrainingAssignmentsQuery } from "../../training/data/training.endpoints";

const updateScreeningTrainingSchema = z.object({
  decision: z.nativeEnum(SCREENING_DECISION),
  remarks: z.string().optional(),
  strengths: z.string().optional(),
  overallRating: z.coerce.number().min(0).max(100),
  goodLooking: z.coerce.number().min(1).max(5),
  fairness: z.coerce.number().min(1).max(5),
  languageProficiency: z.string(),
  trainingType: z.nativeEnum(TRAINING_TYPE).optional(),
  focusAreas: z.array(z.string()).optional(),
  priority: z.nativeEnum(TRAINING_PRIORITY).optional(),
  targetCompletionDate: z.string().optional(),
  trainingNotes: z.string().optional(),
});

type UpdateScreeningTrainingFormValues = z.infer<typeof updateScreeningTrainingSchema>;

interface UpdateScreeningTrainingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screening: Screening | null;
}

export function UpdateScreeningTrainingModal({
  open,
  onOpenChange,
  screening,
}: UpdateScreeningTrainingModalProps) {
  const [step, setStep] = useState(1);
  const [focusAreaInput, setFocusAreaInput] = useState("");
  const [updateDecision, { isLoading: isUpdating }] = useUpdateScreeningDecisionMutation();

  // Get existing training assignments from the screening object if provided
  const trainingAssignments = (screening as any)?.trainingAssignments || [];

  // Fetch all training assignments for this candidate-project map to show history
  const { data: trainingHistoryData, isLoading: isLoadingHistory } = useGetTrainingAssignmentsQuery(
    { candidateProjectMapId: screening?.candidateProjectMapId },
    { skip: !screening?.candidateProjectMapId || !open }
  );

  // Combine fetched history with any assignments already present in the screening object
  const trainingHistory = trainingHistoryData?.data?.items || trainingAssignments;

  const form = useForm({
    resolver: zodResolver(updateScreeningTrainingSchema),
    defaultValues: {
      decision: SCREENING_DECISION.APPROVED,
      remarks: "",
      strengths: "",
      overallRating: 0,
      goodLooking: 3,
      fairness: 3,
      languageProficiency: "Basic Interface",
      trainingType: TRAINING_TYPE.TECHNICAL,
      focusAreas: [] as string[],
      priority: TRAINING_PRIORITY.MEDIUM,
      targetCompletionDate: "",
      trainingNotes: "",
    },
  });

  const { watch, setValue, reset, trigger } = form;
  const decisionValue = watch("decision");
  const focusAreas = (watch("focusAreas") as string[]) || [];

  useEffect(() => {
    if (screening && open) {
      setStep(1);
      reset({
        decision: (screening.decision as SCREENING_DECISION) || SCREENING_DECISION.APPROVED,
        remarks: screening.remarks || "",
        overallRating: (screening as any).overallRating || 0,
        strengths: screening.strengths || "",
        goodLooking: screening.goodLooking || 3,
        fairness: screening.fairness || 3,
        languageProficiency: screening.languageProficiency || "Basic Interface",
        trainingType: TRAINING_TYPE.TECHNICAL,
        focusAreas: [],
        priority: TRAINING_PRIORITY.MEDIUM,
        targetCompletionDate: "",
        trainingNotes: "",
      });
    }
  }, [screening, open, reset]);

  const onFormSubmit = async (values: UpdateScreeningTrainingFormValues) => {
    try {
      const payload: any = {
        decision: values.decision,
        remarks: values.remarks,
        goodLooking: values.goodLooking,
        overallRating: values.overallRating,
        fairness: values.fairness,
        languageProficiency: values.languageProficiency,
        strengths: values.strengths,
      };

      if (values.decision === SCREENING_DECISION.NEEDS_TRAINING) {
        payload.trainingType = values.trainingType;
        payload.focusAreas = values.focusAreas;
        payload.priority = values.priority;
        payload.targetCompletionDate = values.targetCompletionDate || undefined;
        payload.trainingNotes = values.trainingNotes || undefined;
      }

      await updateDecision({
        id: screening?.id || "",
        data: payload,
      }).unwrap();

      toast.success("Screening decision updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || "Failed to update screening decision";
      toast.error(errorMessage);
    }
  };

  const handleNext = async () => {
    const isStep1Valid = await trigger([
      "decision",
      "remarks",
      "strengths",
      "goodLooking",
      "fairness",
      "languageProficiency",
    ]);
    if (isStep1Valid) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const addFocusArea = (area: string) => {
    const trimmed = area.trim();
    if (trimmed && !focusAreas.includes(trimmed)) {
      setValue("focusAreas", [...focusAreas, trimmed] as string[]);
    }
  };

  const removeFocusArea = (area: string) => {
    setValue(
      "focusAreas",
      focusAreas.filter((a) => a !== area) as string[]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case TRAINING_STATUS.COMPLETED:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300 shadow-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            COMPLETED
          </Badge>
        );
      case TRAINING_STATUS.IN_PROGRESS:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300 shadow-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            <TrendingUp className="w-3 h-3 mr-1" />
            IN PROGRESS
          </Badge>
        );
      case TRAINING_STATUS.CANCELLED:
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-300 shadow-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            <AlertCircle className="w-3 h-3 mr-1" />
            CANCELLED
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-600 bg-slate-100 border-slate-300 font-bold text-[10px]">
            <Clock className="w-3 h-3 mr-1" />
            {status.toUpperCase()}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] md:max-w-[1100px] lg:max-w-[1200px] max-h-[82vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 bg-slate-900 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight leading-none">
                Screening Evaluation
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1">
                Finalizing result for <span className="text-indigo-400 font-semibold">{screening?.candidateProjectMap?.candidate?.firstName} {screening?.candidateProjectMap?.candidate?.lastName}</span>
              </DialogDescription>
            </div>
            {decisionValue === SCREENING_DECISION.NEEDS_TRAINING && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl border border-white/10">
                <div className="flex gap-1">
                  <div className={cn("w-2 h-2 rounded-full transition-all", step === 1 ? "bg-indigo-400" : "bg-white/20")} />
                  <div className={cn("w-2 h-2 rounded-full transition-all", step === 2 ? "bg-indigo-400" : "bg-white/20")} />
                </div>
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest border-l border-white/20 pl-2">
                  Step {step} of 2
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-5 scrollbar-thin scrollbar-thumb-slate-300">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-5">
              {step === 1 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Section: Decision Form */}
                  <div className="lg:col-span-7">
                    <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
                      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-5">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Evaluation Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-5">
                        <FormField
                          control={form.control}
                          name="decision"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Final Decision</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm font-semibold">
                                    <SelectValue placeholder="Select decision" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl shadow-xl border-slate-100">
                                  <SelectItem value={SCREENING_DECISION.APPROVED} className="font-semibold text-emerald-600 text-sm">Passed & Recommended</SelectItem>
                                  <SelectItem value={SCREENING_DECISION.REJECTED} className="font-semibold text-red-600 text-sm">Rejected</SelectItem>
                                  <SelectItem value={SCREENING_DECISION.ON_HOLD} className="font-semibold text-amber-600 text-sm">On Hold</SelectItem>
                                  <SelectItem value={SCREENING_DECISION.NEEDS_TRAINING} className="font-semibold text-indigo-600 text-sm">Needs Training (Internal)</SelectItem>
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
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Overall Rating <span className="text-[9px] text-slate-400 font-normal">(0-100)</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  {...field}
                                  value={(field.value as any) ?? ""}
                                  className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm font-semibold"
                                  placeholder="Enter rating (0-100)"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-5 bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50">
                          <FormField
                            control={form.control}
                            name="goodLooking"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex justify-between items-center mb-3">
                                  <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Appearance</FormLabel>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black text-indigo-600">{(field.value as number)}</span>
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                          key={s}
                                          className={cn("w-2.5 h-2.5", s <= (field.value as number) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <FormControl>
                                  <div className="relative pt-1">
                                    <input
                                      type="range"
                                      min="1"
                                      max="5"
                                      step="1"
                                      value={(field.value as number)}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700 transition-all"
                                    />
                                    <div className="flex justify-between mt-2 px-0.5">
                                      {["Poor", "Fair", "Good", "Great", "Elite"].map((label, val) => (
                                        <span key={val} className={cn("text-[8px] font-bold uppercase tracking-tighter", (field.value as number) === val + 1 ? "text-indigo-600" : "text-slate-300")}>{label}</span>
                                      ))}
                                    </div>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="fairness"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex justify-between items-center mb-3">
                                  <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fairness</FormLabel>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black text-indigo-600">{(field.value as number)}</span>
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <CheckCircle2
                                          key={s}
                                          className={cn("w-2.5 h-2.5", s <= (field.value as number) ? "text-emerald-500" : "text-slate-200")}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <FormControl>
                                  <div className="relative pt-1">
                                    <input
                                      type="range"
                                      min="1"
                                      max="5"
                                      step="1"
                                      value={(field.value as number)}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700 transition-all"
                                    />
                                    <div className="flex justify-between mt-2 px-0.5">
                                      {["Low", "Basic", "Avg", "High", "Full"].map((label, val) => (
                                        <span key={val} className={cn("text-[8px] font-bold uppercase tracking-tighter", (field.value as number) === val + 1 ? "text-indigo-600" : "text-slate-300")}>{label}</span>
                                      ))}
                                    </div>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="languageProficiency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Language Skills</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm font-medium">
                                    <SelectValue placeholder="Select proficiency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="Poor" className="text-sm">Poor</SelectItem>
                                  <SelectItem value="Basic Interface" className="text-sm">Basic Interface</SelectItem>
                                  <SelectItem value="Basic" className="text-sm">Basic</SelectItem>
                                  <SelectItem value="Intermediate" className="text-sm">Intermediate</SelectItem>
                                  <SelectItem value="Fluent" className="text-sm">Fluent</SelectItem>
                                  <SelectItem value="Excellent" className="text-sm">Excellent</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="strengths"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Strengths</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="What stood out positively?" 
                                    {...field} 
                                    className="min-h-[100px] rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-sm resize-none p-3"
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
                                <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Remarks</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Notes for the team..." 
                                    {...field} 
                                    className="min-h-[100px] rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-sm resize-none p-3"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Section: Training History */}
                  <div className="lg:col-span-5">
                    <Card className="border-none shadow-sm ring-1 ring-slate-200 h-full flex flex-col overflow-hidden bg-white">
                      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-5">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                          Training History
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 flex-1 overflow-y-auto">
                        {isLoadingHistory ? (
                          <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <LoadingSpinner size="lg" className="text-indigo-600" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading...</p>
                          </div>
                        ) : trainingHistory.length > 0 ? (
                          <div className="space-y-3">
                            {trainingHistory.map((training: TrainingAssignment) => (
                              <div 
                                key={training.id} 
                                className="group bg-white border border-slate-100 rounded-2xl p-4 transition-all duration-200 hover:shadow-md hover:border-indigo-100"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shrink-0">
                                    <GraduationCap className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <h4 className="text-sm font-bold text-slate-800 capitalize leading-none">{training.trainingType}</h4>
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-black text-slate-500 rounded uppercase">#{(training as any).trainingAttempt || 1}</span>
                                      </div>
                                      {getStatusBadge(training.status)}
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-2">
                                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-md">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(training.assignedAt), "MMM dd, yyyy")}
                                      </span>

                                      {training.completedAt && (
                                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                                          <CheckCircle2 className="w-3 h-3" />
                                          {format(new Date(training.completedAt), "MMM dd, yyyy")}
                                        </span>
                                      )}

                                      {(training as any).sessionType && (
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium border border-slate-100 px-2 py-0.5 rounded-md capitalize">
                                          <Clock className="w-3 h-3 text-indigo-400" />
                                          {(training as any).sessionType}
                                        </span>
                                      )}
                                    </div>

                                    {training.focusAreas && training.focusAreas.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2.5">
                                        {training.focusAreas.map((area, idx) => (
                                          <span key={idx} className="text-[9px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold border border-indigo-100 uppercase tracking-tight">
                                            {area}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {(training.notes || (training as any).improvementNotes) && (
                                      <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
                                        {training.notes && (
                                          <div className="bg-slate-50/80 p-2 rounded-lg ring-1 ring-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Pre-Training Notes</p>
                                            <p className="text-[11px] text-slate-600 italic line-clamp-2 leading-relaxed">"{training.notes}"</p>
                                          </div>
                                        )}
                                        {(training as any).improvementNotes && (
                                          <div className="bg-emerald-50/50 p-2 rounded-lg ring-1 ring-emerald-100">
                                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter mb-1">Trainer Feedback</p>
                                            <p className="text-[11px] text-emerald-800 italic line-clamp-2 leading-relaxed">"{(training as any).improvementNotes}"</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                            <div className="w-14 h-14 bg-slate-50 ring-1 ring-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-300">
                              <GraduationCap className="w-7 h-7" />
                            </div>
                            <h5 className="text-sm font-bold text-slate-600">No Training Yet</h5>
                            <p className="text-xs text-slate-400 mt-1">No training assignments for this nomination.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                /* Step 2: Training configuration (only if decision is NEEDS_TRAINING) */
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-amber-900">Training Assignment Required</h4>
                      <p className="text-sm text-amber-700 font-medium mt-1 leading-relaxed">
                        Since you marked this candidate as "Needs Training", you must configure the initial training plan. 
                        A new training workflow will be triggered upon submission.
                      </p>
                    </div>
                  </div>

                  <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b py-4">
                      <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-600" />
                        Training Parameters
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <FormField
                            control={form.control}
                            name="trainingType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-slate-600 uppercase tracking-wider">Training Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 rounded-xl">
                                      <SelectValue placeholder="Select training type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl">
                                    {Object.entries(TRAINING_TYPE).map(([_, value]) => (
                                      <SelectItem key={value as string} value={value as string} className="capitalize">
                                        {(value as string).replace("_", " ")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-slate-600 uppercase tracking-wider">Priority Level</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 rounded-xl">
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl">
                                    <SelectItem value={TRAINING_PRIORITY.LOW} className="text-slate-600">Low Priority</SelectItem>
                                    <SelectItem value={TRAINING_PRIORITY.MEDIUM} className="text-blue-600">Medium Priority</SelectItem>
                                    <SelectItem value={TRAINING_PRIORITY.HIGH} className="text-red-600">High Priority</SelectItem>
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
                                <FormLabel className="text-xs font-bold text-slate-600 uppercase tracking-wider">Target Completion Date</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <Input 
                                      type="date" 
                                      {...field} 
                                      className="h-11 pl-10 rounded-xl border-slate-200" 
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Focus Areas</Label>
                            <div className="flex gap-2">
                              <Input
                                value={focusAreaInput}
                                onChange={(e) => setFocusAreaInput(e.target.value)}
                                placeholder="Add specific improvement area..."
                                className="h-11 rounded-xl border-slate-200"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addFocusArea(focusAreaInput);
                                    setFocusAreaInput("");
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-11 px-6 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                onClick={() => {
                                  addFocusArea(focusAreaInput);
                                  setFocusAreaInput("");
                                }}
                              >
                                Add
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                              {focusAreas.length > 0 ? focusAreas.map((area) => (
                                <div
                                  key={area}
                                  className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-indigo-100 group transition-all hover:bg-indigo-100"
                                >
                                  {area}
                                  <button
                                    type="button"
                                    onClick={() => removeFocusArea(area)}
                                    className="hover:text-red-600 bg-white/50 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                  >
                                    ×
                                  </button>
                                </div>
                              )) : (
                                <p className="text-[11px] text-slate-400 font-medium">No focus areas added yet.</p>
                              )}
                            </div>
                          </div>

                          <FormField
                            control={form.control}
                            name="trainingNotes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-slate-600 uppercase tracking-wider">Training Notes</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Provide context or specific tips for the trainer..." 
                                    {...field} 
                                    className="min-h-[140px] rounded-xl border-slate-200 focus:ring-amber-500/20 text-sm resize-none"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </form>
          </Form>
        </div>

        <DialogFooter className="px-5 py-3 bg-white border-t shrink-0 flex items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            type="button" 
            onClick={() => onOpenChange(false)}
            className="text-slate-500 font-bold hover:bg-slate-50"
          >
            Cancel
          </Button>
          
          <div className="flex items-center gap-3">
            {decisionValue === SCREENING_DECISION.NEEDS_TRAINING && step === 2 && (
              <Button 
                variant="outline" 
                type="button" 
                onClick={handleBack}
                disabled={isUpdating}
                className="rounded-xl border-slate-200 font-bold text-slate-600"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Evaluation Details
              </Button>
            )}

            {decisionValue === SCREENING_DECISION.NEEDS_TRAINING && step === 1 ? (
              <Button 
                type="button" 
                onClick={handleNext}
                className="min-w-[160px] h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 font-bold text-xs uppercase tracking-widest"
              >
                Configure Training
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={isUpdating} 
                onClick={form.handleSubmit(onFormSubmit)}
                className={cn(
                  "min-w-[160px] h-11 rounded-xl shadow-lg font-bold text-xs uppercase tracking-widest",
                  decisionValue === SCREENING_DECISION.REJECTED 
                    ? "bg-red-600 hover:bg-red-700 shadow-red-200" 
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                )}
              >
                {isUpdating ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                {decisionValue === SCREENING_DECISION.NEEDS_TRAINING ? "Assign & Update" : "Update Decision"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

