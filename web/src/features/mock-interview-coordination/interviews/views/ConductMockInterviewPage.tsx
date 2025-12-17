import { useParams, useNavigate } from "react-router-dom";
import { useGetMockInterviewQuery, useAssignTemplateToInterviewMutation, useCompleteMockInterviewMutation } from "../data/interviews.endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Calendar, Clock, MapPin, User, CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import type { MockInterview, MockInterviewTemplate } from "../../types";
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
import { CompleteInterviewDialog } from "../components/CompleteInterviewDialog";

export default function ConductMockInterviewPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  
  const { data, isLoading, error } = useGetMockInterviewQuery(interviewId || "", {
    skip: !interviewId,
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
  const templates: MockInterviewTemplate[] =
    (templatesByRole?.data as MockInterviewTemplate[] | undefined) ??
    (allTemplatesData?.data as MockInterviewTemplate[] | undefined) ??
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
  const selectedTemplate: MockInterviewTemplate | undefined =
    templates.find((t) => t.id === selectedTemplateId) ?? templates[0];

  useEffect(() => {
    if (!selectedTemplateId && templates?.length) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const [assignTemplateToInterview, { isLoading: assignMutationLoading }] = useAssignTemplateToInterviewMutation();
  const [completeMockInterview, { isLoading: completeMutationLoading }] = useCompleteMockInterviewMutation();

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

    if (!interviewId) {
      toast.error("Interview ID is missing");
      return;
    }

    try {
      await assignTemplateToInterview({ id: interviewId, templateId: selectedTemplateId }).unwrap();
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
    if (!interviewId || !interview) {
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

      await completeMockInterview({ id: interviewId, data: payload }).unwrap();
      toast.success("Interview completed successfully!");
      setCompleteInterviewOpen(false);
      setChecklistItems({});
      // Navigate to My Interviews list page after successful completion
      navigate('/mock-interviews');
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to complete interview");
    }
  };

  // Safely extract interview data
  const interview = (data?.data || (data as any)) as MockInterview | undefined;

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
        <div className="text-sm text-muted-foreground bg-muted p-4 rounded">
          <p className="font-mono">Interview ID: {interviewId}</p>
          <p className="text-xs mt-2">If you're seeing this error, please check that the interview ID is correct and the interview exists in the system.</p>
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
      <div>
        <h1 className="text-3xl font-bold">Conduct Mock Interview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interview for {candidate?.firstName} {candidate?.lastName}
        </p>
      </div>

      {/* Candidate Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Candidate Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Candidate Name</p>
            <p className="text-base font-medium">
              {candidate?.firstName} {candidate?.lastName}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-base font-medium">{candidate?.email || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="text-base font-medium">{candidate?.phone || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Position Applied</p>
            <p className="text-base font-medium">{roleNeeded?.designation}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Project</p>
            <p className="text-base font-medium">{project?.title}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Coordinator</p>
            <p className="text-base font-medium">
              {coordinator?.name || "Unassigned"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Interview Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-lg">Interview Details</CardTitle>
            <div className="flex items-center gap-3">
              <Badge className="text-sm">
                {interview.status || "Status N/A"}
              </Badge>

              {interview.overallRating && (
                <div className="text-xs text-muted-foreground text-right">
                  <div className="text-sm font-medium">{interview.overallRating}/5</div>
                  <div className="text-xs">Rating</div>
                </div>
              )}

              {interview.overallScore && (
                <div className="text-xs text-muted-foreground text-right">
                  <div className="text-sm font-medium">{interview.overallScore}%</div>
                  <div className="text-xs">Score</div>
                </div>
              )}

              {interview.decision && (
                <Badge
                  variant={
                    interview.decision === "SELECTED" ? "default" : "destructive"
                  }
                  className="text-xs"
                >
                  {interview.decision}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scheduled Time */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Time</p>
                <p className="text-base font-medium">
                  {interview.scheduledTime
                    ? new Date(interview.scheduledTime).toLocaleString()
                    : "Not scheduled"}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-base font-medium">
                  {interview.duration ? `${interview.duration} minutes` : "N/A"}
                </p>
              </div>
            </div>

            {/* Mode */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <p className="text-base font-medium">
                  <Badge variant="outline">{interview.mode || "N/A"}</Badge>
                </p>
              </div>
            </div>

            {/* Meeting Link (always show — displays fallback when missing) */}
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Meeting Link</p>
                {interview.meetingLink ? (
                  <a
                    href={interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-medium text-blue-600 hover:underline"
                  >
                    Join Meeting
                  </a>
                ) : (
                  <p className="text-base font-medium text-muted-foreground">No link</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interview Status moved into Interview Details header above */}

      {/* Feedback Section */}
      {interview.conductedAt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Feedback & Remarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {interview.remarks && (
              <div>
                <p className="text-sm text-muted-foreground">Remarks</p>
                <p className="text-base mt-1 whitespace-pre-wrap">
                  {interview.remarks}
                </p>
              </div>
            )}
            {interview.strengths && (
              <div>
                <p className="text-sm text-muted-foreground">Strengths</p>
                <p className="text-base mt-1 whitespace-pre-wrap">
                  {interview.strengths}
                </p>
              </div>
            )}
            {interview.areasOfImprovement && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Areas of Improvement
                </p>
                <p className="text-base mt-1 whitespace-pre-wrap">
                  {interview.areasOfImprovement}
                </p>
              </div>
            )}
            {interview.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-base mt-1 whitespace-pre-wrap">
                  {interview.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interview Template Section */}
      {!interview.templateId || isUpdatingTemplate ? (
        // Show template selector if no template is assigned OR updating
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {isUpdatingTemplate ? "Update Template" : "Select Template for this Interview"}
              </CardTitle>
              <div className="flex items-center gap-2">
                {isUpdatingTemplate && (
                  <Button 
                    onClick={handleCancelUpdate}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                )}
                <Button 
                  onClick={handleSelectTemplate}
                  disabled={!selectedTemplateId || isLoadingByRole || isLoadingAll}
                  size="sm"
                >
                  {isUpdatingTemplate ? "Update Template" : "Select Template for Interview"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Left: Selector */}
              <div className="col-span-1">
                <Label className="mb-2">Choose template</Label>

                {/* Loading state */}
                {(isLoadingByRole || isLoadingAll) && (
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/50 px-3 py-2 text-sm">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-b-transparent border-slate-400"></div>
                    <span className="text-sm text-muted-foreground">Loading templates...</span>
                  </div>
                )}

                {/* Empty state */}
                {!isLoadingByRole && !isLoadingAll && templates.length === 0 && (
                  <div className="rounded-md border border-slate-200 bg-muted p-3 text-sm text-muted-foreground">
                    No templates available for this role.
                  </div>
                )}

                {/* Select box */}
                {!isLoadingByRole && !isLoadingAll && templates.length > 0 && (
                  <Select value={selectedTemplateId ?? undefined} onValueChange={(v) => setSelectedTemplateId(v)}>
                    <SelectTrigger className="h-11 w-full bg-white/50 border-slate-200">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>

                    <SelectContent className="max-h-[300px]">
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Optional meta */}
                {selectedTemplate && (
                  <div className="mt-3 text-xs text-muted-foreground bg-muted rounded p-2">
                    <div className="font-medium">{selectedTemplate.name}</div>
                    {selectedTemplate.description && (
                      <div className="mt-1">{selectedTemplate.description}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Items list */}
              <div className="md:col-span-2 col-span-1">
                <div className="text-sm text-muted-foreground mb-2">Template items</div>

                {!selectedTemplate && (
                  <div className="rounded-md border border-slate-200 bg-muted p-4 text-sm text-muted-foreground">
                    Select a template to view its items.
                  </div>
                )}

                {selectedTemplate && selectedTemplate.items?.length === 0 && (
                  <div className="rounded-md border border-slate-200 bg-muted p-4 text-sm text-muted-foreground">
                    No items in this template.
                  </div>
                )}

                {selectedTemplate && (selectedTemplate.items ?? []).length > 0 && (() => {
                  // Group items by category
                  const itemsByCategory = (selectedTemplate.items ?? []).reduce((acc, item) => {
                    if (!acc[item.category]) {
                      acc[item.category] = [];
                    }
                    acc[item.category]!.push(item);
                    return acc;
                  }, {} as Record<string, typeof selectedTemplate.items>);

                  // Sort items within each category by order
                  Object.keys(itemsByCategory).forEach(category => {
                    itemsByCategory[category]!.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                  });

                  return (
                    <div className="space-y-6">
                      {Object.entries(itemsByCategory).map(([category, items]) => (
                        <div key={category} className="rounded-md border border-slate-200 p-4 bg-white/30">
                          {/* Category header */}
                          <div className="text-base font-semibold mb-3 text-primary border-b pb-2">
                            {category}
                          </div>
                          
                          {/* Items in this category */}
                          <div className="space-y-2">
                            {(items ?? []).map((item) => (
                              <div key={item.id} className="flex gap-2 text-sm">
                                <span className="font-medium text-muted-foreground min-w-[20px]">
                                  {item.order ?? 0},
                                </span>
                                <span className="flex-1">{item.criterion}</span>
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Interview Questions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Template: <span className="font-medium">{interview.template?.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  Template Assigned
                </Badge>
                <Button 
                  onClick={handleUpdateTemplate}
                  variant="outline"
                  size="sm"
                >
                  Update Template
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                    <div key={category} className="rounded-md border border-slate-200 p-5 bg-gradient-to-br from-white to-slate-50">
                      {/* Category header */}
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-primary/30">
                        <div className="text-lg font-bold text-primary">
                          {category}
                        </div>
                        <Badge variant="secondary" className="text-xs">
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
                              <div className="flex gap-3 p-3 rounded-md bg-white border border-slate-200 hover:border-primary/40 transition-colors">
                                <CollapsibleTrigger 
                                  className="flex items-start gap-3 flex-1 text-left"
                                >
                                  {isChecked ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                  )}
                                  <span className="font-bold text-primary min-w-[24px] text-base">
                                    {item.order ?? idx}.
                                  </span>
                                  <span className="flex-1 text-base leading-relaxed">{item.criterion}</span>
                                </CollapsibleTrigger>
                              </div>
                              
                              {isChecked && (
                                <CollapsibleContent>
                                  <div className="mt-2 ml-10 p-4 bg-slate-50 rounded-md border border-slate-200 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Checkbox 
                                        checked={itemData?.passed ?? true}
                                        onCheckedChange={(checked) => 
                                          handleUpdateChecklistItem(item.id, 'passed', checked)
                                        }
                                      />
                                      <Label className="text-sm font-medium">Passed</Label>
                                    </div>
                                    
                                    
                                    
                                    <div className="space-y-1">
                                      <Label className="text-sm font-medium">Score (out of 100)</Label>
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
                                        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${itemData?.score === undefined ? 'border-red-500' : 'border-input'}`}
                                        placeholder="Enter score (0-100)"
                                      required />
                                      {itemData?.score === undefined && (
                                        <p className="text-xs text-red-600">Score is required for this question.</p>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-1">
                                      <Label className="text-sm font-medium">Notes</Label>
                                      <Textarea 
                                        value={itemData?.notes ?? ''}
                                        onChange={(e) => 
                                          handleUpdateChecklistItem(item.id, 'notes', e.target.value)
                                        }
                                        placeholder="Add notes about this criterion..."
                                        rows={3}
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

                  {/* Complete Interview button placed after all questions */}
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={handleCompleteInterview}
                      variant="default"
                      size="sm"
                      disabled={hasValidationErrors}
                      className="w-full sm:w-auto"
                    >
                      Complete Interview
                    </Button>
                  </div>
                </div>
              );
            })() : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No questions found in this template.</p>
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
      <CompleteInterviewDialog
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
