import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeft,
  ClipboardCheck,
  User,
  Building2,
  Briefcase,
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  Loader2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useGetMockInterviewQuery,
  useCompleteMockInterviewMutation,
} from "../data";
import { useGetTemplatesByRoleQuery } from "../../templates/data";
import {
  MOCK_INTERVIEW_DECISION,
  MOCK_INTERVIEW_CATEGORY,
  ChecklistItemInput,
} from "../../types";

// Validation schema
const completionSchema = z.object({
  overallRating: z.coerce
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  decision: z.string().min(1, "Decision is required"),
  remarks: z.string().optional(),
  strengths: z.string().optional(),
  areasOfImprovement: z.string().optional(),
  checklistItems: z.array(
    z.object({
      category: z.string(),
      criterion: z.string(),
      passed: z.boolean(),
      rating: z.coerce.number().int().min(1).max(5).optional(),
      notes: z.string().optional(),
    })
  ),
});

type CompletionFormValues = z.infer<typeof completionSchema>;

export default function ConductMockInterviewPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();

  const [checklistState, setChecklistState] = useState<
    Record<string, { passed: boolean; rating?: number; notes?: string }>
  >({});

  // Fetch interview details
  const {
    data: interviewData,
    isLoading: isLoadingInterview,
    error: interviewError,
  } = useGetMockInterviewQuery(interviewId!);

  const interview = interviewData?.data;

  // Fetch checklist template for the candidate's role
  // Use roleCatalog.id (not roleNeeded.id) since templates are linked to RoleCatalog
  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useGetTemplatesByRoleQuery(
    {
      roleId: interview?.candidateProjectMap?.roleCatalog?.id || "",
      isActive: true,
    },
    { skip: !interview?.candidateProjectMap?.roleCatalog?.id }
  );

  const [completeMockInterview, { isLoading: isSubmitting }] =
    useCompleteMockInterviewMutation();

  const templates = templatesData?.data || [];

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, typeof templates> = {};
    templates.forEach((template) => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });
    return grouped;
  }, [templates]);

  const form = useForm<CompletionFormValues>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      overallRating: 3,
      decision: "",
      remarks: "",
      strengths: "",
      areasOfImprovement: "",
      checklistItems: [],
    },
  });

  // Initialize checklist state from templates
  useEffect(() => {
    if (templates.length > 0) {
      const initialState: typeof checklistState = {};
      templates.forEach((template) => {
        initialState[template.id] = {
          passed: false,
          rating: undefined,
          notes: "",
        };
      });
      setChecklistState(initialState);
    }
  }, [templates]);

  const handleChecklistChange = (
    templateId: string,
    field: keyof (typeof checklistState)[string],
    value: any
  ) => {
    setChecklistState((prev) => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [field]: value,
      },
    }));
  };

  const onSubmit = async (data: CompletionFormValues) => {
    try {
      // Build checklist items from state
      const checklistItems: ChecklistItemInput[] = templates.map(
        (template) => ({
          category: template.category,
          criterion: template.criterion,
          passed: checklistState[template.id]?.passed || false,
          rating: checklistState[template.id]?.rating,
          notes: checklistState[template.id]?.notes,
        })
      );

      const payload = {
        ...data,
        checklistItems,
      };

      await completeMockInterview({
        id: interviewId!,
        data: payload,
      }).unwrap();

      toast.success("Mock interview completed successfully");
      navigate("/mock-interviews");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to complete mock interview");
    }
  };

  const isLoading = isLoadingInterview || isLoadingTemplates;
  const hasError = interviewError || templatesError;

  // Calculate pass percentage
  const passedCount = Object.values(checklistState).filter(
    (item) => item.passed
  ).length;
  const totalCount = templates.length;
  const passPercentage =
    totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  const categoryLabels: Record<string, string> = {
    [MOCK_INTERVIEW_CATEGORY.TECHNICAL_SKILLS]: "Technical Skills",
    [MOCK_INTERVIEW_CATEGORY.COMMUNICATION]: "Communication",
    [MOCK_INTERVIEW_CATEGORY.PROFESSIONALISM]: "Professionalism",
    [MOCK_INTERVIEW_CATEGORY.ROLE_SPECIFIC]: "Role Specific",
  };

  const modeIcons: Record<string, any> = {
    video: Video,
    phone: Phone,
    in_person: MapPin,
  };

  const ModeIcon = interview ? modeIcons[interview.mode] : Video;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasError || !interview) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load interview details. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (interview.conductedAt) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This interview has already been completed on{" "}
            {format(new Date(interview.conductedAt), "MMM dd, yyyy")}. You
            cannot conduct it again.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/mock-interviews")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header with gradient */}
      <div className="mb-8 relative">
        <div className="absolute -top-6 -left-6 w-96 h-96 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -z-10" />
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/mock-interviews")}
            className="hover:bg-primary/5 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              Conduct Mock Interview
            </h1>
            <p className="text-muted-foreground mt-2">
              Evaluate the candidate and provide detailed feedback
            </p>
          </div>
        </div>
      </div>

      {/* Candidate & Interview Info */}
      <Card className="mb-6 border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent rounded-xl" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            Interview Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Candidate
            </div>
            <div className="font-semibold">
              {interview.candidateProjectMap?.candidate
                ? `${interview.candidateProjectMap.candidate.firstName} ${interview.candidateProjectMap.candidate.lastName}`
                : "Unknown"}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Project
            </div>
            <div className="font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {interview.candidateProjectMap?.project?.title || "Unknown"}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Role
            </div>
            <div className="font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {interview.candidateProjectMap?.roleNeeded?.designation ||
                "Unknown"}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Interview Mode
            </div>
            <div className="font-semibold flex items-center gap-2 capitalize">
              <ModeIcon className="h-4 w-4" />
              {interview.mode.replace("_", " ")}
            </div>
          </div>
          {interview.scheduledTime && (
            <>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Scheduled Date
                </div>
                <div className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(interview.scheduledTime), "MMM dd, yyyy")}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Scheduled Time
                </div>
                <div className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(new Date(interview.scheduledTime), "hh:mm a")} (
                  {interview.duration} min)
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Evaluation Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Evaluation Checklist */}
          <Card className="border-border/50">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.02] to-transparent rounded-xl" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-green-500/10">
                    <ClipboardCheck className="h-4 w-4 text-green-600" />
                  </div>
                  Evaluation Checklist
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-semibold",
                      passPercentage >= 70
                        ? "bg-green-50 text-green-700 border-green-200"
                        : passPercentage >= 50
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    )}
                  >
                    {passedCount} / {totalCount} passed ({passPercentage}%)
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {templates.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No evaluation template found for this role. Please create a
                    template first.
                  </AlertDescription>
                </Alert>
              ) : (
                Object.entries(templatesByCategory).map(
                  ([category, categoryTemplates]) => (
                    <div key={category}>
                      <h3 className="font-semibold text-lg mb-3">
                        {categoryLabels[category] || category}
                      </h3>
                      <div className="space-y-4">
                        {categoryTemplates.map((template) => (
                          <Card
                            key={template.id}
                            className="border-l-4 border-l-primary/20"
                          >
                            <CardContent className="pt-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {template.criterion}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={
                                      checklistState[template.id]?.passed ||
                                      false
                                    }
                                    onCheckedChange={(checked) =>
                                      handleChecklistChange(
                                        template.id,
                                        "passed",
                                        checked
                                      )
                                    }
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-muted-foreground block mb-1">
                                      Rating (1-5)
                                    </label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="5"
                                      value={
                                        checklistState[template.id]?.rating ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleChecklistChange(
                                          template.id,
                                          "rating",
                                          parseInt(e.target.value) || undefined
                                        )
                                      }
                                      className="h-9"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs text-muted-foreground block mb-1">
                                    Notes
                                  </label>
                                  <Textarea
                                    placeholder="Optional notes for this criterion..."
                                    value={
                                      checklistState[template.id]?.notes || ""
                                    }
                                    onChange={(e) =>
                                      handleChecklistChange(
                                        template.id,
                                        "notes",
                                        e.target.value
                                      )
                                    }
                                    className="min-h-[60px] resize-none"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {Object.keys(templatesByCategory).indexOf(category) <
                        Object.keys(templatesByCategory).length - 1 && (
                        <Separator className="mt-6" />
                      )}
                    </div>
                  )
                )
              )}
            </CardContent>
          </Card>

          {/* Overall Assessment */}
          <Card className="border-border/50">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent rounded-xl" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-500/10">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                Overall Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="overallRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overall Rating *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>Rate 1-5 stars</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="decision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decision *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select decision..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={MOCK_INTERVIEW_DECISION.APPROVED}>
                            Approved - Ready for Client Interview
                          </SelectItem>
                          <SelectItem
                            value={MOCK_INTERVIEW_DECISION.NEEDS_TRAINING}
                          >
                            Needs Training
                          </SelectItem>
                          <SelectItem value={MOCK_INTERVIEW_DECISION.REJECTED}>
                            Rejected
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                        disabled={isSubmitting}
                        className="min-h-[80px]"
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
                        disabled={isSubmitting}
                        className="min-h-[80px]"
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
                    <FormLabel>Additional Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional comments or observations..."
                        {...field}
                        disabled={isSubmitting}
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/mock-interviews")}
              disabled={isSubmitting}
              className="hover:bg-muted/50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || templates.length === 0}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all min-w-[180px]"
            >
              {isSubmitting && <LoadingSpinner className="mr-2 h-4 w-4" />}
              {!isSubmitting && <ClipboardCheck className="mr-2 h-4 w-4" />}
              Complete Interview
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
