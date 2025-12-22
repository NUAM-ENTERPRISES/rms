import { useParams, useNavigate } from "react-router-dom";
import { useGetScreeningQuery, useAssignTemplateToScreeningMutation, useCompleteScreeningMutation } from "../data/interviews.endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Calendar, Clock, MapPin, User, CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import type { Screening, ScreeningTemplate } from "../../types";
import {
  useGetTemplatesByRoleQuery,
  useGetTemplatesQuery,
} from "../../templates/data/templates.endpoints";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/molecules/ConfirmationDialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { CompleteScreeningDialog } from "../components/CompleteScreeningDialog";
import { format } from "date-fns";
import { Link } from "lucide-react";


export default function ConductScreeningPage() {
  const { screeningId, interviewId } = useParams<{ screeningId?: string; interviewId?: string }>();
  // Support route param named either `screeningId` or `interviewId` (legacy mismatch)
  const routeId = screeningId || interviewId || "";
  const navigate = useNavigate();
  
  const { data, isLoading, error } = useGetScreeningQuery(routeId, {
    skip: !routeId,
  });

  // Extract role id from response early so we can call template hooks before any early returns
  const roleIdFromResponse = (data as any)?.data?.candidateProjectMap?.roleNeeded?.id as
    | string
    | undefined;

  // Templates handling: fetch by role when available, otherwise fetch all active templates
  // These hooks must be invoked on every render (even while the interview data is loading)
  const { data: templatesByRole, isLoading: isLoadingByRole } = useGetTemplatesByRoleQuery(
    roleIdFromResponse ? { roleId: roleIdFromResponse, isActive: true } : (null as any),
    { skip: !roleIdFromResponse }
  );

  const { data: allTemplatesData, isLoading: isLoadingAll } = useGetTemplatesQuery(
    { isActive: true },
    { skip: !!roleIdFromResponse }
  );

  // Build the templates list and selection state before any early returns so hooks order remains stable
  const templates: ScreeningTemplate[] =
    (templatesByRole?.data as ScreeningTemplate[] | undefined) ??
    (allTemplatesData?.data as ScreeningTemplate[] | undefined) ??
    [];

  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string | null>(templates?.[0]?.id ?? null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
  
  // Checklist items state - track evaluation for each question
  const [checklistItems, setChecklistItems] = useState<Record<string, {
    passed: boolean;
    score?: number;
    notes?: string;
  }>>({});
  const [completeInterviewOpen, setCompleteInterviewOpen] = useState(false);

  // Keep selected template object in sync when templates change (also declared early)
  const selectedTemplate: ScreeningTemplate | undefined =
    templates.find((t) => t.id === selectedTemplateId) ?? templates[0];

  useEffect(() => {
    if (!selectedTemplateId && templates?.length) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const [assignTemplateToScreening, { isLoading: assignMutationLoading }] = useAssignTemplateToScreeningMutation();
  const [completeScreening, { isLoading: completeMutationLoading }] = useCompleteScreeningMutation();

  // Validation: all selected items must have a score
  const selectedItems = Object.values(checklistItems);
  const hasValidationErrors = selectedItems.length === 0 || selectedItems.some(
    (item) => item.score === undefined || isNaN(item.score as number)
  );

  const handleSelectTemplate = () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template first");
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleUpdateTemplate = () => {
    // Reset to current interview template if exists, otherwise first template
    if (interview?.templateId) {
      setSelectedTemplateId(interview.templateId);
    }
    setIsUpdatingTemplate(true);
  };

  const handleCancelUpdate = () => {
    setIsUpdatingTemplate(false);
    // Reset to current interview template if exists
    if (interview?.templateId) {
      setSelectedTemplateId(interview.templateId);
    }
  };

  const handleConfirmTemplate = async () => {
    if (!selectedTemplateId) return;

    if (!routeId) {
      toast.error("Interview ID is missing");
      return;
    }

    try {
      await assignTemplateToScreening({ id: routeId, templateId: selectedTemplateId }).unwrap();
      toast.success("Template assigned successfully");
      setConfirmDialogOpen(false);
      setIsUpdatingTemplate(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to assign template");
    }
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklistItems(prev => {
      const current = prev[itemId];
      if (current) {
        // Remove if already exists
        const { [itemId]: _, ...rest } = prev;
        return rest;
      } else {
        // Add with default values
        return {
          ...prev,
          [itemId]: {
            passed: true,
            // score is mandatory; start as undefined so user must fill
            notes: '',
          },
        };
      }
    });
  };

  const handleUpdateChecklistItem = (itemId: string, field: 'passed' | 'score' | 'notes', value: any) => {
    setChecklistItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleCompleteInterview = () => {
    if (!interview?.templateId || !interview?.template?.items?.length) {
      toast.error("Please assign a template first");
      return;
    }
    setCompleteInterviewOpen(true);
  };

  const handleSubmitCompleteInterview = async (formData: {
    decision: string;
    remarks?: string;
    strengths?: string;
    areasOfImprovement?: string;
  }) => {
    if (!routeId || !interview) {
      toast.error("Interview data not found");
      return;
    }

    try {
      // Build checklistItems array from state
      const checklistItemsArray = Object.entries(checklistItems).map(([itemId, data]) => {
        const templateItem = interview.template?.items?.find(item => item.id === itemId);
        return {
          templateItemId: itemId,
          category: templateItem?.category || "",
          criterion: templateItem?.criterion || "",
          passed: data.passed,
          notes: data.notes || "",
          score: data.score || 0,
        };
      });

      // Validate mandatory score for each selected item
      const hasInvalidScore = checklistItemsArray.some(ci => ci.score === undefined || isNaN(ci.score as number));
      if (hasInvalidScore) {
        toast.error("Please enter a score for each selected question.");
        return;
      }

      // Compute overall rating (integer 0-100) from selected item scores
      const overallRating = (() => {
        const count = checklistItemsArray.length;
        if (count === 0) return 0;
        const total = checklistItemsArray.reduce((acc, ci) => acc + (ci.score ?? 0), 0);
        // Ensure integer per backend DTO (IsInt)
        const avg = total / count;
        // Clamp between 0 and 100, then round to nearest integer
        const clamped = Math.max(0, Math.min(100, avg));
        return Math.round(clamped);
      })();

      const payload = {
        ...formData,
        overallRating,
        checklistItems: checklistItemsArray,
      };

      await completeScreening({ id: routeId, data: payload }).unwrap();
      toast.success("Interview completed successfully!");
      setCompleteInterviewOpen(false);
      setChecklistItems({});
      // Navigate to My Interviews list page after successful completion
      navigate('/screenings');
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to complete interview");
    }
  };

  // Safely extract interview data
  const interview = (data?.data || (data as any)) as Screening | undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading interview details...</p>
        </div>
      </div>
    );
  }

  if (error || !interview?.id) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error ? "Failed to load interview details" : "Interview not found"}
          </AlertDescription>
        </Alert>
        <div className="text-sm text-muted-foreground bg-muted p-4 rounded space-y-2">
          <p className="font-mono">Screening ID: {routeId || "(missing)"}</p>
          <p className="text-xs">If you're seeing this error, please check that the interview ID is correct and the interview exists in the system.</p>
          <div className="pt-2">
            <Button variant="ghost" onClick={() => navigate('/screenings')}>Back to Screenings</Button>
          </div>
        </div>
      </div>
    );
  }

  const candidate = interview.candidateProjectMap?.candidate;
  const project = interview.candidateProjectMap?.project;
  const roleNeeded = interview.candidateProjectMap?.roleNeeded;
  const coordinator = interview.coordinator;



  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="relative">
  {/* Premium Header with Aurora Glow */}
  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-2xl blur-3xl opacity-20 animate-pulse-slow"></div>
  
  <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white/95 backdrop-blur-xl border-b border-indigo-200/50 rounded-2xl shadow-xl">
    <div className="space-y-1 flex-1 min-w-0">
      <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
        Conduct Screening
      </h1>
      <p className="text-base text-slate-600 font-medium">
        Interview for {candidate?.firstName} {candidate?.lastName}
      </p>
    </div>

    {/* Optional Status/Progress Indicator */}
    {interview?.status && (
      <Badge 
        variant="outline" 
        className="text-sm px-4 py-1.5 bg-white/80 border-indigo-300 text-indigo-700 shadow-sm"
      >
        {interview.status}
      </Badge>
    )}
  </div>
</div>

      {/* Candidate Details */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30">
  <CardContent className="p-6">
    <h3 className="text-xl font-bold text-indigo-700 mb-5 flex items-center gap-2">
      <User className="h-5 w-5" />
      Candidate Information
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
      <div>
        <p className="text-xs text-slate-500 mb-1">Name</p>
        <p className="font-semibold text-slate-900">
          {candidate?.firstName} {candidate?.lastName}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Email</p>
        <p className="font-medium text-slate-900 break-all">{candidate?.email || "N/A"}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Phone</p>
        <p className="font-medium text-slate-900">{candidate?.phone || "N/A"}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Position Applied</p>
        <p className="font-semibold text-slate-900">{roleNeeded?.designation || "N/A"}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Project</p>
        <p className="font-semibold text-slate-900">{project?.title || "N/A"}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Coordinator</p>
        <p className="font-semibold text-slate-900">{coordinator?.name || "Unassigned"}</p>
      </div>
    </div>
  </CardContent>
</Card>

      {/* Interview Details */}
     <Card className="border-0 shadow-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30 transition-all duration-300 hover:shadow-3xl hover:ring-indigo-300/50">
  <CardHeader className="pb-3 border-b border-indigo-200/50">
    <div className="flex items-center justify-between w-full">
      <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
        Interview Details
      </CardTitle>
      <div className="flex items-center gap-4">
        {/* Status Badge */}
        <Badge className="text-base px-4 py-1.5 bg-white/90 shadow-sm border border-indigo-200/50 text-indigo-700 font-medium">
          {interview.status || "Pending"}
        </Badge>

        {/* Rating */}
        {interview.overallRating && (
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{interview.overallRating}/5</div>
            <div className="text-xs text-slate-500">Rating</div>
          </div>
        )}

        {/* Score */}
        {interview.overallScore && (
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{interview.overallScore}%</div>
            <div className="text-xs text-slate-500">Score</div>
          </div>
        )}

        {/* Decision */}
        {interview.decision && (
          <Badge
            variant={interview.decision === "SELECTED" ? "default" : "destructive"}
            className="text-base px-4 py-1.5 shadow-sm font-medium"
          >
            {interview.decision}
          </Badge>
        )}
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
      {/* Scheduled Time */}
      <div className="flex items-start gap-3">
        <Calendar className="h-5 w-5 text-indigo-600 mt-0.5" />
        <div>
          <p className="text-xs text-slate-500 mb-1">Scheduled Time</p>
          <p className="font-medium text-slate-900">
            {interview.scheduledTime
              ? format(new Date(interview.scheduledTime), "MMMM d, yyyy 'at' h:mm a")
              : "Not scheduled"}
          </p>
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-indigo-600 mt-0.5" />
        <div>
          <p className="text-xs text-slate-500 mb-1">Duration</p>
          <p className="font-medium text-slate-900">
            {interview.duration ? `${interview.duration} minutes` : "N/A"}
          </p>
        </div>
      </div>

      {/* Mode */}
      <div className="flex items-start gap-3">
        <MapPin className="h-5 w-5 text-indigo-600 mt-0.5" />
        <div>
          <p className="text-xs text-slate-500 mb-1">Mode</p>
          <Badge variant="outline" className="text-sm px-3 py-1 bg-white/80 border-indigo-200/50">
            {interview.mode || "N/A"}
          </Badge>
        </div>
      </div>

      {/* Meeting Link */}
      <div className="flex items-start gap-3">
        <Link className="h-5 w-5 text-indigo-600 mt-0.5" />
        <div>
          <p className="text-xs text-slate-500 mb-1">Meeting Link</p>
          {interview.meetingLink ? (
            <a
              href={interview.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-indigo-600 hover:underline hover:text-indigo-700 break-all transition-colors"
            >
              Join Meeting
            </a>
          ) : (
            <p className="text-sm text-slate-500">No link</p>
          )}
        </div>
      </div>
    </div>
  </CardContent>
</Card>

      {/* Interview Status moved into Interview Details header above */}

      {/* Feedback Section */}
      {interview.conductedAt && (
       <Card className="border-0 shadow-2xl bg-gradient-to-br from-emerald-50/90 to-teal-50/90 rounded-2xl overflow-hidden ring-1 ring-teal-200/30 hover:shadow-3xl transition-all duration-300">
  <CardHeader className="pb-3 border-b border-teal-200/50">
    <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
      <CheckCircle2 className="h-6 w-6" />
      Feedback & Remarks
    </CardTitle>
  </CardHeader>
  <CardContent className="p-6 space-y-6">
    {interview.remarks && (
      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-700">Remarks</p>
        <p className="text-base text-slate-800 whitespace-pre-wrap leading-relaxed bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-emerald-200/50 shadow-inner">
          {interview.remarks}
        </p>
      </div>
    )}

    {interview.strengths && (
      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-700">Strengths</p>
        <p className="text-base text-slate-800 whitespace-pre-wrap leading-relaxed bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-emerald-200/50 shadow-inner">
          {interview.strengths}
        </p>
      </div>
    )}

    {interview.areasOfImprovement && (
      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-700">Areas of Improvement</p>
        <p className="text-base text-slate-800 whitespace-pre-wrap leading-relaxed bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-emerald-200/50 shadow-inner">
          {interview.areasOfImprovement}
        </p>
      </div>
    )}

    {interview.notes && (
      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-700">Notes</p>
        <p className="text-base text-slate-800 whitespace-pre-wrap leading-relaxed bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-emerald-200/50 shadow-inner">
          {interview.notes}
        </p>
      </div>
    )}

    {/* Subtle empty state if no feedback */}
    {!interview.remarks && !interview.strengths && !interview.areasOfImprovement && !interview.notes && (
      <div className="text-center py-8 text-slate-500">
        <p className="text-sm">No feedback recorded yet</p>
      </div>
    )}
  </CardContent>
</Card>
      )}

      {/* Interview Template Section */}
      {!interview.templateId || isUpdatingTemplate ? (
        // Show template selector if no template is assigned OR updating
       <Card className="border-0 shadow-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30 transition-all duration-300 hover:shadow-3xl hover:ring-indigo-300/50">
  <CardHeader className="pb-3 border-b border-indigo-200/50">
    <div className="flex items-center justify-between w-full">
      <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
        {isUpdatingTemplate ? "Update Template" : "Select Template"}
      </CardTitle>

      <div className="flex items-center gap-3">
        {isUpdatingTemplate && (
          <Button
            onClick={handleCancelUpdate}
            variant="outline"
            size="sm"
            className="h-9 px-4 text-sm rounded-lg border-indigo-300 hover:bg-indigo-50 transition-all"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSelectTemplate}
          disabled={!selectedTemplateId || isLoadingByRole || isLoadingAll}
          size="sm"
          className="h-9 px-5 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
        >
          {isUpdatingTemplate ? "Update Template" : "Select Template"}
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {/* Left: Selector */}
      <div className="col-span-1">
        <Label className="mb-2 text-sm font-medium text-indigo-700">Choose Template</Label>

        {/* Loading State */}
        {(isLoadingByRole || isLoadingAll) && (
          <div className="flex items-center gap-2 rounded-lg border border-indigo-200/50 bg-white/50 px-4 py-2.5 text-sm shadow-inner">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span className="text-slate-600">Loading templates...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingByRole && !isLoadingAll && templates.length === 0 && (
          <div className="rounded-lg border border-indigo-200/50 bg-muted/50 p-4 text-sm text-slate-600 shadow-inner">
            No templates available for this role
          </div>
        )}

        {/* Template Selector */}
        {!isLoadingByRole && !isLoadingAll && templates.length > 0 && (
          <Select value={selectedTemplateId ?? undefined} onValueChange={(v) => setSelectedTemplateId(v)}>
            <SelectTrigger className="h-10 text-sm rounded-lg border-indigo-200/50 bg-white/90 shadow-inner hover:shadow-md focus:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400">
              <SelectValue placeholder="Select a template..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl text-sm max-h-[320px]">
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id} className="py-2">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Selected Template Meta */}
        {selectedTemplate && (
          <div className="mt-4 p-3 rounded-lg bg-white/70 backdrop-blur-sm border border-indigo-200/50 shadow-sm">
            <div className="font-medium text-indigo-700 text-sm">{selectedTemplate.name}</div>
            {selectedTemplate.description && (
              <div className="mt-1 text-xs text-slate-600">{selectedTemplate.description}</div>
            )}
          </div>
        )}
      </div>

      {/* Right: Items Preview */}
      <div className="md:col-span-2">
        <div className="text-sm font-medium text-indigo-700 mb-2">Template Items</div>

        {!selectedTemplate && (
          <div className="rounded-lg border border-indigo-200/50 bg-muted/50 p-5 text-sm text-slate-600 shadow-inner">
            Select a template to preview its items
          </div>
        )}

        {selectedTemplate && selectedTemplate.items?.length === 0 && (
          <div className="rounded-lg border border-indigo-200/50 bg-muted/50 p-5 text-sm text-slate-600 shadow-inner">
            No items in this template
          </div>
        )}

        {selectedTemplate && (selectedTemplate.items ?? []).length > 0 && (() => {
          const itemsByCategory = (selectedTemplate.items ?? []).reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
          }, {} as Record<string, typeof selectedTemplate.items>);

          Object.keys(itemsByCategory).forEach(category => {
            itemsByCategory[category].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          });

          return (
            <div className="space-y-5">
              {Object.entries(itemsByCategory).map(([category, items]) => (
                <div key={category} className="rounded-xl border border-indigo-200/50 bg-white/60 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-indigo-200/50">
                    <div className="text-base font-semibold text-indigo-700 capitalize">
                      {category}
                    </div>
                    <Badge variant="secondary" className="text-xs px-3 py-1">
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3 text-sm p-2 rounded-lg hover:bg-indigo-50/50 transition-colors">
                        <span className="font-medium text-indigo-600 min-w-[20px]">
                          {item.order ?? 0}.
                        </span>
                        <span className="flex-1 text-slate-800">{item.criterion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  </CardContent>
</Card>
      ) : (
        // Show assigned template with questions when template is assigned
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30 transition-all duration-300 hover:shadow-3xl hover:ring-indigo-300/50">
  <CardHeader className="pb-3 border-b border-indigo-200/50">
    <div className="flex items-center justify-between w-full">
      <div className="space-y-1">
        <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Interview Questions
        </CardTitle>
        <p className="text-sm text-indigo-600/80 font-medium">
          Template: <span className="font-bold text-indigo-700">{interview.template?.name || "N/A"}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Badge className="text-sm px-3 py-1 bg-white/90 shadow-sm border border-indigo-200/50 text-indigo-700 font-medium">
          Template Assigned
        </Badge>
        <Button
          onClick={handleUpdateTemplate}
          variant="outline"
          size="sm"
          className="h-9 px-4 text-sm rounded-lg border-indigo-300 hover:bg-indigo-50 transition-all hover:shadow-md"
        >
          Update Template
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-6">
    {interview.template?.items && interview.template.items.length > 0 ? (() => {
      // Group items by category
      const itemsByCategory = interview.template.items.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, typeof interview.template.items>);

      // Sort items within each category by order
      Object.keys(itemsByCategory).forEach(category => {
        itemsByCategory[category].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      });

      return (
        <div className="space-y-6">
          {Object.entries(itemsByCategory).map(([category, items]) => (
            <div key={category} className="rounded-xl border border-indigo-200/50 bg-white/70 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-shadow">
              {/* Category header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-200/50">
                <div className="text-xl font-bold text-indigo-700 capitalize">
                  {category}
                </div>
                <Badge variant="secondary" className="text-xs px-3 py-1 bg-indigo-100/80 text-indigo-700">
                  {items.length} {items.length === 1 ? 'question' : 'questions'}
                </Badge>
              </div>

              {/* Items in this category */}
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const isChecked = !!checklistItems[item.id];
                  const itemData = checklistItems[item.id];

                  return (
                    <Collapsible key={item.id} open={isChecked} onOpenChange={(open) => {
                      if (open && !isChecked) {
                        handleToggleChecklistItem(item.id);
                      } else if (!open && isChecked) {
                        handleToggleChecklistItem(item.id);
                      }
                    }}>
                      <div className="flex gap-3 p-3 rounded-lg bg-white/80 border border-indigo-200/50 hover:border-indigo-400/50 transition-colors shadow-sm">
                        <CollapsibleTrigger className="flex items-start gap-3 flex-1 text-left">
                          {isChecked ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                          )}
                          <span className="font-bold text-indigo-600 min-w-[24px] text-base">
                            {item.order ?? idx}.
                          </span>
                          <span className="flex-1 text-base leading-relaxed text-slate-900">
                            {item.criterion}
                          </span>
                        </CollapsibleTrigger>
                      </div>

                      {isChecked && (
                        <CollapsibleContent>
                          <div className="mt-3 ml-10 p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-indigo-200/50 shadow-md space-y-4">
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={itemData?.passed ?? true}
                                onCheckedChange={(checked) => 
                                  handleUpdateChecklistItem(item.id, 'passed', checked)
                                }
                              />
                              <Label className="text-sm font-medium text-indigo-700">Passed</Label>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-indigo-700">Score (out of 100)</Label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={itemData?.score ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const next = v === '' ? undefined : parseFloat(v);
                                  handleUpdateChecklistItem(item.id, 'score', next);
                                }}
                                aria-invalid={itemData?.score === undefined}
                                className={`flex h-9 w-full rounded-lg border bg-white/80 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 ${itemData?.score === undefined ? 'border-red-500' : 'border-indigo-200/50'}`}
                                placeholder="Enter score (0-100)"
                                required
                              />
                              {itemData?.score === undefined && (
                                <p className="text-xs text-red-600">Score is required for this question.</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-indigo-700">Notes</Label>
                              <Textarea 
                                value={itemData?.notes ?? ''}
                                onChange={(e) => 
                                  handleUpdateChecklistItem(item.id, 'notes', e.target.value)
                                }
                                placeholder="Add notes about this criterion..."
                                rows={3}
                                className="rounded-lg border border-indigo-200/50 bg-white/80 focus:border-indigo-400 focus:ring-indigo-400/40"
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Complete Interview Button */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleCompleteInterview}
              variant="default"
              size="lg"
              disabled={hasValidationErrors}
              className="px-8 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-base"
            >
              Complete Interview
            </Button>
          </div>
        </div>
      );
    })() : (
      <div className="text-center py-8 text-slate-500 bg-white/50 rounded-xl border border-indigo-200/50">
        <p className="text-base font-medium">No questions found in this template.</p>
      </div>
    )}
  </CardContent>
</Card>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmTemplate}
        title="Assign Template to Interview"
        description={
          <div className="space-y-2">
            <p>
              Are you sure you want to assign the template <strong>{selectedTemplate?.name}</strong> to this interview?
            </p>
            {selectedTemplate?.items && selectedTemplate.items.length > 0 && (
              <p className="text-sm text-muted-foreground">
                This will add {selectedTemplate.items.length} question(s) to the interview checklist.
              </p>
            )}
          </div>
        }
        confirmText="Assign Template"
        cancelText="Cancel"
        isLoading={assignMutationLoading}
        variant="default"
      />

      {/* Complete Interview Dialog */}
      <CompleteScreeningDialog
        open={completeInterviewOpen}
        onOpenChange={setCompleteInterviewOpen}
        onSubmit={handleSubmitCompleteInterview}
        isLoading={completeMutationLoading}
        overallScorePct={(Object.values(checklistItems).length
          ? Object.values(checklistItems).reduce((acc, item) => acc + (item.score ?? 0), 0) / Object.values(checklistItems).length
          : undefined) as number | undefined}
        derivedRating={(Object.values(checklistItems).length
          ? Math.max(1, Math.round((((Object.values(checklistItems).reduce((acc, item) => acc + (item.score ?? 0), 0) / Object.values(checklistItems).length) / 100) * 5)))
          : undefined) as number | undefined}
      />
    </div>
  );
}
