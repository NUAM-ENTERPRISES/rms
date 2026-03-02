import { useParams, useNavigate } from "react-router-dom";
import { useGetScreeningQuery, useAssignTemplateToScreeningMutation, useCompleteScreeningMutation } from "../data/interviews.endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Calendar, Clock, MapPin, User, CheckCircle2, Circle, Loader2, Link, Search, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import type { Screening, ScreeningTemplate } from "../../types";
import {
  useGetTemplatesByRoleQuery,
  useGetTemplatesQuery,
} from "../../templates/data/templates.endpoints";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/molecules/ConfirmationDialog";
import ImageViewer from "@/components/molecules/ImageViewer";
import { getAge } from "@/utils";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { CompleteScreeningDialog } from "../components/CompleteScreeningDialog";
import { useDebounce } from "@/hooks";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
const TEMPLATES_PER_PAGE = 10;

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

  // Template search and pagination state
  const [templateSearch, setTemplateSearch] = useState("");
  const [templatePage, setTemplatePage] = useState(1);
  const debouncedTemplateSearch = useDebounce(templateSearch, 300);

  // Templates handling: fetch by role when available, otherwise fetch all active templates with pagination
  // These hooks must be invoked on every render (even while the interview data is loading)
  const { data: templatesByRole, isLoading: isLoadingByRole } = useGetTemplatesByRoleQuery(
    roleIdFromResponse ? { roleId: roleIdFromResponse, isActive: true } : (null as any),
    { skip: !roleIdFromResponse }
  );

  const { data: allTemplatesData, isLoading: isLoadingAll } = useGetTemplatesQuery(
    { isActive: true, search: debouncedTemplateSearch || undefined, page: templatePage, limit: TEMPLATES_PER_PAGE },
    { skip: !!roleIdFromResponse }
  );

  // Build the templates list and selection state before any early returns so hooks order remains stable
  // Handle both old format (data is array) and new format (data.items is array with pagination)
  const templates: ScreeningTemplate[] = (() => {
    if (templatesByRole?.data) {
      // Templates by role - could be array or {items: array}
      const roleData = templatesByRole.data as any;
      return Array.isArray(roleData) ? roleData : (roleData?.items ?? []);
    }
    if (allTemplatesData?.data) {
      // All templates - could be array or {items: array}
      const allData = allTemplatesData.data as any;
      return Array.isArray(allData) ? allData : (allData?.items ?? []);
    }
    return [];
  })();

  // Get pagination meta from response (new format has data.pagination)
  const templatesMeta = (allTemplatesData?.data as any)?.pagination || (allTemplatesData as any)?.meta || {};
  const totalTemplates = templatesMeta.total || templates.length;
  const totalPages = templatesMeta.totalPages || Math.ceil(totalTemplates / TEMPLATES_PER_PAGE) || 1;

  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string | null>(null);
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
    templates.find((t) => t.id === selectedTemplateId);

  // Reset page when search changes
  useEffect(() => {
    setTemplatePage(1);
  }, [debouncedTemplateSearch]);

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
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6 dark:text-white">
      {/* Header */}
      <div className="relative">
  {/* Premium Header with Aurora Glow */}
  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-2xl blur-3xl opacity-20 animate-pulse-slow"></div>
  
  <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-b border-indigo-200/50 dark:border-slate-700 rounded-2xl shadow-xl">
    <div className="space-y-1 flex-1 min-w-0">
      <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
        Conduct Screening
      </h1>
      <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
        Interview for {candidate?.firstName} {candidate?.lastName}
      </p>
    </div>

    {/* Optional Status/Progress Indicator */}
    {interview?.status && (
      <Badge 
        variant="outline" 
        className="text-sm px-4 py-1.5 bg-white/80 dark:bg-slate-800/80 border-indigo-300 dark:border-slate-600 text-indigo-700 shadow-sm dark:text-indigo-200"
      >
        {interview.status}
      </Badge>
    )}
  </div>
</div>

      {/* Candidate & Project Details - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate Details */}
       <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30 h-fit dark:from-indigo-950/60 dark:to-purple-950/50 dark:ring-indigo-700/30">
  <CardContent className="p-6">
    <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mb-5 flex items-center gap-2">
      <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      Candidate Information
    </h3>

    <div className="flex items-start gap-5">
      <div className="flex-shrink-0">
        <ImageViewer
          src={candidate?.profileImage}
          fallbackSrc={""}
          title={`${candidate?.firstName || ""} ${candidate?.lastName || ""}`.trim() || "Profile image"}
          className="h-20 w-20 rounded-lg ring-1 ring-slate-200/60 dark:ring-slate-700/60"
          enableHoverPreview={true}
          previewClassName="w-72 h-72"
          hoverPosition="right"
        />
      </div>

      <div className="w-full space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Name</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {candidate?.firstName} {candidate?.lastName}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Email</p>
            <p className="font-medium text-slate-800 dark:text-slate-200 break-all">
              {candidate?.email || "N/A"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Phone</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {candidate?.phone || "N/A"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">DOB / Age</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {candidate?.dateOfBirth
                ? new Date(candidate.dateOfBirth).toLocaleDateString()
                : "N/A"}
              {candidate?.dateOfBirth && getAge(candidate.dateOfBirth)
                ? ` (${getAge(candidate.dateOfBirth)} yrs)`
                : ""}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Gender</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {candidate?.gender
                ? candidate.gender.charAt(0) + candidate.gender.slice(1).toLowerCase()
                : "N/A"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Position Applied</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {roleNeeded?.designation || roleNeeded?.name || "N/A"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Coordinator</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {coordinator?.name || "Unassigned"}
            </p>
          </div>

          {candidate?.referralCompanyName && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Referral</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {candidate.referralCompanyName}
              </p>
            </div>
          )}
        </div>

        {/* Qualifications */}
        {candidate?.qualifications?.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Qualifications</p>
            <ul className="space-y-2 text-sm">
              {candidate.qualifications.map((q: any) => (
                <li key={q.id} className="text-slate-800 dark:text-slate-200">
                  <div className="font-medium">
                    {q.qualification?.shortName || q.qualification?.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {q.university
                      ? `${q.university}${q.graduationYear ? ` • ${q.graduationYear}` : ""}`
                      : ""}
                    {q.gpa !== undefined && q.gpa !== null ? ` • GPA ${q.gpa}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Work experience */}
        {candidate?.workExperiences?.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Work Experience</p>
            <ul className="space-y-2.5 text-sm">
              {candidate.workExperiences
                .slice()
                .sort((a: any, b: any) => (new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime()))
                .slice(0, 3)
                .map((w: any) => (
                  <li key={w.id} className="text-slate-800 dark:text-slate-200">
                    <div className="font-medium">
                      {w.jobTitle || "Role"}
                      {w.companyName ? ` • ${w.companyName}` : ""}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {w.startDate ? format(new Date(w.startDate), "MMM yyyy") : ""}
                      {w.endDate
                        ? ` — ${format(new Date(w.endDate), "MMM yyyy")}`
                        : w.isCurrent
                        ? " — Present"
                        : ""}
                    </div>
                  </li>
                ))}
              {candidate.workExperiences.length > 3 && (
                <li className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  +{candidate.workExperiences.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Candidate contacts */}
        {candidate?.candidateContacts?.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Contacts</p>
            <ul className="space-y-2 text-sm">
              {candidate.candidateContacts.slice(0, 2).map((c: any) => (
                <li key={c.id} className="text-slate-800 dark:text-slate-200">
                  <div className="font-medium">
                    {c.name || c.type || "Contact"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {c.phone ? c.phone : ""}
                    {c.email ? ` • ${c.email}` : ""}
                    {c.relationship ? ` • ${c.relationship}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  </CardContent>
</Card>

        {/* Project Details */}
       <Card className="border-0 shadow-xl bg-gradient-to-br from-white/90 to-slate-50 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30 h-fit dark:from-slate-900/90 dark:to-slate-800/70 dark:ring-indigo-800/30">
  <CardContent className="p-6">
    <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mb-5 flex items-center gap-2">
      <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      Project Information
    </h3>

    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Title</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{project?.title || "N/A"}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Client</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {project?.client?.name || project?.client || "N/A"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Country</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {project?.country?.name || project?.country || "N/A"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Deadline</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {project?.deadline ? format(new Date(project.deadline), "MMM d, yyyy") : "N/A"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Priority</p>
          <Badge
            variant={project?.priority === 'HIGH' || project?.priority === 'URGENT' ? 'destructive' : 'secondary'}
            className="text-xs dark:bg-slate-700 dark:text-slate-200"
          >
            {project?.priority || "N/A"}
          </Badge>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Project Type</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {project?.projectType || project?.type || "N/A"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Status</p>
          <Badge variant="outline" className="text-xs dark:border-slate-600 dark:text-slate-300">
            {project?.status || "N/A"}
          </Badge>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Grooming</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {project?.grooming ? 'Yes' : 'No'}
          </p>
        </div>
      </div>

      {project?.description && (
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Description</p>
          <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap line-clamp-4 leading-relaxed">
            {project.description}
          </p>
        </div>
      )}

      {(project?.clientEmail || project?.clientPhone) && (
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Client Contacts</p>
          <div className="text-sm space-y-1">
            {project?.clientEmail && (
              <a
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline text-xs block"
                href={`mailto:${project.clientEmail}`}
              >
                {project.clientEmail}
              </a>
            )}
            {project?.clientPhone && (
              <span className="text-slate-800 dark:text-slate-200 text-xs">
                {project.clientPhone}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Role Needed Details */}
      {roleNeeded && (
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Role Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-indigo-50/60 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/40">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Designation</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {roleNeeded.designation || roleNeeded.name || "N/A"}
              </p>
            </div>
            {roleNeeded.shortName && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Short Name</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{roleNeeded.shortName}</p>
              </div>
            )}
            {roleNeeded.quantity && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Quantity</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{roleNeeded.quantity}</p>
              </div>
            )}
            {roleNeeded.salaryRange && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Salary Range</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{roleNeeded.salaryRange}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {project?.roleCatalog && (
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Role Catalog</p>
          <p className="text-sm text-slate-900 dark:text-slate-100">
            {project.roleCatalog?.name || project.roleCatalog || "N/A"}
          </p>
        </div>
      )}

      {/* Additional Project Fields */}
      {(project?.createdAt || project?.updatedAt) && (
        <div className="grid grid-cols-2 gap-5 text-sm pt-3 border-t border-slate-200 dark:border-slate-700">
          {project?.createdAt && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Created</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {format(new Date(project.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          )}
          {project?.updatedAt && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Updated</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {format(new Date(project.updatedAt), "MMM d, yyyy")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  </CardContent>
</Card>
      </div>

      {/* Interview Details */}
  <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30 transition-all duration-300 hover:shadow-3xl hover:ring-indigo-300/50 dark:from-indigo-950/70 dark:to-purple-950/50 dark:ring-indigo-700/40 dark:hover:ring-indigo-600/60">
  <CardHeader className="pb-4 border-b border-indigo-200/50 dark:border-indigo-800/40">
    <div className="flex items-center justify-between w-full flex-wrap gap-4">
      <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
        Interview Details
      </CardTitle>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Status Badge */}
        <Badge className="text-base px-4 py-1.5 bg-white/90 dark:bg-slate-800/90 shadow-sm border border-indigo-200/50 dark:border-slate-600 text-indigo-700 dark:text-indigo-200 font-medium">
          {interview.status || "Pending"}
        </Badge>

        {/* Rating */}
        {interview.overallRating && (
          <div className="text-right min-w-[80px]">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {interview.overallRating}/5
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Rating</div>
          </div>
        )}

        {/* Score */}
        {interview.overallScore && (
          <div className="text-right min-w-[80px]">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {interview.overallScore}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Score</div>
          </div>
        )}

        {/* Decision */}
        {interview.decision && (
          <Badge
            variant={interview.decision === "SELECTED" || interview.decision === "APPROVED" ? "default" : "destructive"}
            className="text-base px-4 py-1.5 shadow-sm font-medium dark:bg-opacity-90"
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
        <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Scheduled Time</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {interview.scheduledTime
              ? format(new Date(interview.scheduledTime), "MMMM d, yyyy 'at' h:mm a")
              : "Not scheduled"}
          </p>
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Duration</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {interview.duration ? `${interview.duration} minutes` : "N/A"}
          </p>
        </div>
      </div>

      {/* Mode */}
      <div className="flex items-start gap-3">
        <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Mode</p>
          <Badge
            variant="outline"
            className="text-sm px-3 py-1 bg-white/80 dark:bg-slate-800/80 border-indigo-200/50 dark:border-indigo-700/50 dark:text-slate-100 font-medium"
          >
            {interview.mode || "N/A"}
          </Badge>
        </div>
      </div>

      {/* Meeting Link */}
      <div className="flex items-start gap-3">
        <Link className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Meeting Link</p>
          {interview.meetingLink ? (
            <a
              href={interview.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline break-all transition-colors inline-flex items-center gap-1"
            >
              Join Meeting
              <span className="text-xs opacity-70">↗</span>
            </a>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No link</p>
          )}
        </div>
      </div>
    </div>
  </CardContent>
</Card>

      {/* Interview Status moved into Interview Details header above */}

      {/* Feedback Section */}
      {interview.conductedAt && (
       <Card className="border-0 shadow-2xl bg-gradient-to-br from-emerald-50/90 to-teal-50/90 rounded-2xl overflow-hidden ring-1 ring-teal-200/30 hover:shadow-3xl hover:ring-teal-300/50 transition-all duration-300 dark:from-emerald-950/60 dark:to-teal-950/50 dark:ring-teal-800/40 dark:hover:ring-teal-700/60">
  <CardHeader className="pb-4 border-b border-teal-200/50 dark:border-teal-800/40">
    <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2.5">
      <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
      Feedback & Remarks
    </CardTitle>
  </CardHeader>

  <CardContent className="p-6 space-y-6">
    {interview.remarks && (
      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Remarks</p>
        <div className="bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm p-5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50 shadow-inner">
          <p className="text-base leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
            {interview.remarks}
          </p>
        </div>
      </div>
    )}

    {interview.strengths && (
      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Strengths</p>
        <div className="bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm p-5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50 shadow-inner">
          <p className="text-base leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
            {interview.strengths}
          </p>
        </div>
      </div>
    )}

    {interview.areasOfImprovement && (
      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Areas of Improvement</p>
        <div className="bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm p-5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50 shadow-inner">
          <p className="text-base leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
            {interview.areasOfImprovement}
          </p>
        </div>
      </div>
    )}

    {interview.notes && (
      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Notes</p>
        <div className="bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm p-5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50 shadow-inner">
          <p className="text-base leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
            {interview.notes}
          </p>
        </div>
      </div>
    )}

    {/* Empty state */}
    {!interview.remarks && !interview.strengths && !interview.areasOfImprovement && !interview.notes && (
      <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-200/50 dark:border-slate-700">
        <p className="text-base font-medium">No feedback recorded yet</p>
        <p className="text-sm mt-1">Feedback will appear here once added</p>
      </div>
    )}
  </CardContent>
</Card>
      )}

      {/* Interview Template Section */}
      {!interview.templateId || isUpdatingTemplate ? (
        // Show template selector if no template is assigned OR updating
     <Card className="border-0 shadow-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30 transition-all duration-300 hover:shadow-3xl hover:ring-indigo-300/50 dark:from-indigo-950/70 dark:to-purple-950/60 dark:ring-indigo-700/40 dark:hover:ring-indigo-600/60">
  <CardHeader className="pb-4 border-b border-indigo-200/50 dark:border-indigo-800/40">
    <div className="flex items-center justify-between w-full flex-wrap gap-4">
      <div className="space-y-1">
        <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          {isUpdatingTemplate ? "Update Template" : "Select Template"}
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Choose an interview template to evaluate the candidate
        </p>
      </div>

      <div className="flex items-center gap-3">
        {isUpdatingTemplate && (
          <Button
            onClick={handleCancelUpdate}
            variant="outline"
            size="sm"
            className="h-9 px-4 text-sm rounded-lg border-indigo-300 hover:bg-indigo-50 dark:border-indigo-700 dark:hover:bg-indigo-950/40 dark:text-indigo-300 transition-all"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSelectTemplate}
          disabled={!selectedTemplateId || isLoadingByRole || isLoadingAll}
          size="sm"
          className="h-9 px-5 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-700 dark:to-purple-800 dark:hover:from-indigo-600 dark:hover:to-purple-700 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] text-white"
        >
          {isUpdatingTemplate ? "Update Template" : "Assign Template"}
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-6">
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Left: Template List with Search */}
      <div className="lg:col-span-2 space-y-5">
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Search Templates</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search by name..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="pl-9 h-10 rounded-lg border-indigo-200/50 bg-white/90 dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>

        {/* Loading State */}
        {(isLoadingByRole || isLoadingAll) && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200/50 bg-white/60 dark:bg-slate-800/60 px-4 py-10 text-sm shadow-inner dark:text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-600 dark:text-slate-300">Loading templates...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingByRole && !isLoadingAll && templates.length === 0 && (
          <div className="rounded-xl border border-indigo-200/50 bg-white/60 dark:bg-slate-800/60 p-8 text-center shadow-inner dark:text-slate-300">
            <FileText className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-500 mb-4" />
            <p className="text-base font-medium text-slate-700 dark:text-slate-200">No templates found</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {templateSearch ? "Try a different search term" : "No templates available for this role"}
            </p>
          </div>
        )}

        {/* Template List */}
        {!isLoadingByRole && !isLoadingAll && templates.length > 0 && (
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all duration-200 group",
                  selectedTemplateId === t.id
                    ? "border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 ring-2 ring-indigo-400/30 shadow-md"
                    : "border-indigo-200/50 bg-white/80 dark:bg-slate-800/70 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:bg-white/90 dark:hover:bg-slate-750 hover:shadow-md"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <FileText
                        className={cn(
                          "h-4.5 w-4.5 flex-shrink-0",
                          selectedTemplateId === t.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                        )}
                      />
                      <p
                        className={cn(
                          "font-semibold truncate",
                          selectedTemplateId === t.id
                            ? "text-indigo-800 dark:text-indigo-200"
                            : "text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300"
                        )}
                      >
                        {t.name}
                      </p>
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                        {t.description}
                      </p>
                    )}

                    <div className="flex items-center flex-wrap gap-2 mt-2.5">
                      <Badge
                        variant="secondary"
                        className="text-xs px-2.5 py-0.5 bg-indigo-100/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                      >
                        {t.items?.length || 0} questions
                      </Badge>
                      {t.role && (
                        <Badge
                          variant="outline"
                          className="text-xs px-2.5 py-0.5 border-slate-300 dark:border-slate-600"
                        >
                          {t.role.shortName || t.role.name}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {selectedTemplateId === t.id && (
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoadingByRole && !isLoadingAll && totalPages > 1 && (
          <div className="flex items-center justify-between pt-5 border-t border-indigo-200/50 dark:border-indigo-800/40">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page {templatePage} of {totalPages} • {totalTemplates} templates
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTemplatePage(p => Math.max(1, p - 1))}
                disabled={templatePage <= 1}
                className="h-8 w-8 p-0 rounded-lg border-indigo-200/50 dark:border-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (templatePage <= 3) {
                    pageNum = i + 1;
                  } else if (templatePage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = templatePage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={templatePage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTemplatePage(pageNum)}
                      className={cn(
                        "h-8 w-8 p-0 rounded-lg text-xs",
                        templatePage === pageNum
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : "border-indigo-200/50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                      )}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setTemplatePage(p => Math.min(totalPages, p + 1))}
                disabled={templatePage >= totalPages}
                className="h-8 w-8 p-0 rounded-lg border-indigo-200/50 dark:border-slate-600"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Items Preview */}
      <div className="lg:col-span-3">
        <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3">Template Preview</div>

        {!selectedTemplate && (
          <div className="rounded-xl border border-indigo-200/50 bg-white/60 dark:bg-slate-800/60 p-10 text-center shadow-inner dark:text-slate-300">
            <FileText className="h-14 w-14 mx-auto text-slate-300 dark:text-slate-500 mb-4" />
            <p className="text-base font-medium text-slate-700 dark:text-slate-200">No template selected</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Select a template from the list to preview its questions
            </p>
          </div>
        )}

        {selectedTemplate && (
          <div className="rounded-xl border border-indigo-200/50 bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm p-6 shadow-sm dark:border-indigo-800/40">
            {/* Selected Template Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-indigo-200/50 dark:border-indigo-800/40 mb-5">
              <div>
                <h4 className="font-bold text-lg text-indigo-800 dark:text-indigo-200">
                  {selectedTemplate.name}
                </h4>
                {selectedTemplate.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {selectedTemplate.description}
                  </p>
                )}
              </div>
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200/50 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/40 px-3 py-1">
                {selectedTemplate.items?.length || 0} Questions
              </Badge>
            </div>

            {/* Questions Preview */}
            {selectedTemplate.items?.length === 0 && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <p className="text-sm">No questions in this template</p>
              </div>
            )}

            {(selectedTemplate.items ?? []).length > 0 && (() => {
              const itemsByCategory = (selectedTemplate.items ?? []).reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                (acc[item.category] ??= []).push(item);
                return acc;
              }, {} as Record<string, typeof selectedTemplate.items>);

              Object.keys(itemsByCategory).forEach(category => {
                itemsByCategory[category]!.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
              });

              return (
                <div className="space-y-5 max-h-[520px] overflow-y-auto pr-2">
                  {Object.entries(itemsByCategory).map(([category, items]) => (
                    <div
                      key={category}
                      className="rounded-xl border border-indigo-100/70 dark:border-indigo-800/40 bg-indigo-50/40 dark:bg-indigo-950/30 p-5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 capitalize flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400"></span>
                          {category.replace(/_/g, ' ')}
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs px-3 py-1 bg-white/80 dark:bg-slate-800/80 dark:text-slate-200"
                        >
                          {items?.length} {items?.length === 1 ? 'question' : 'questions'}
                        </Badge>
                      </div>

                      <div className="space-y-2.5">
                        {items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-3 text-sm p-3 rounded-lg bg-white/70 dark:bg-slate-800/60 hover:bg-white/90 dark:hover:bg-slate-750 transition-colors border border-slate-100 dark:border-slate-700"
                          >
                            <span className="font-medium text-indigo-600 dark:text-indigo-400 min-w-[28px] mt-0.5">
                              {item.order ?? 0}.
                            </span>
                            <span className="text-slate-800 dark:text-slate-200">
                              {item.criterion}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  </CardContent>
</Card>
      ) : (
        // Show assigned template with questions when template is assigned
   <Card className="border-0 shadow-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30 transition-all duration-300 hover:shadow-3xl hover:ring-indigo-300/50 dark:from-indigo-950/70 dark:to-purple-950/60 dark:ring-indigo-700/40 dark:hover:ring-indigo-600/60">
  <CardHeader className="pb-4 border-b border-indigo-200/50 dark:border-indigo-800/40">
    <div className="flex items-center justify-between w-full flex-wrap gap-4">
      <div className="space-y-1">
        <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Interview Questions
        </CardTitle>
        <p className="text-sm text-indigo-600/80 dark:text-indigo-400/90 font-medium">
          Template: <span className="font-bold text-indigo-700 dark:text-indigo-300">{interview.template?.name || "N/A"}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Badge className="text-sm px-3 py-1 bg-white/90 dark:bg-slate-800/90 shadow-sm border border-indigo-200/50 dark:border-slate-600 text-indigo-700 dark:text-indigo-200 font-medium">
          Template Assigned
        </Badge>
        <Button
          onClick={handleUpdateTemplate}
          variant="outline"
          size="sm"
          className="h-9 px-4 text-sm rounded-lg border-indigo-300 hover:bg-indigo-50 dark:border-indigo-700 dark:hover:bg-indigo-950/40 dark:text-indigo-300 transition-all hover:shadow-md"
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
        <div className="space-y-7">
          {Object.entries(itemsByCategory).map(([category, items]) => (
            <div 
              key={category} 
              className="rounded-xl border border-indigo-200/50 dark:border-indigo-800/40 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Category header */}
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-indigo-200/50 dark:border-indigo-800/40">
                <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300 capitalize flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400"></span>
                  {category.replace(/_/g, ' ')}
                </div>
                <Badge 
                  variant="secondary" 
                  className="text-xs px-3 py-1 bg-indigo-100/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                >
                  {items.length} {items.length === 1 ? 'question' : 'questions'}
                </Badge>
              </div>

              {/* Items in this category */}
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const isChecked = !!checklistItems[item.id];
                  const itemData = checklistItems[item.id];

                  return (
                    <Collapsible 
                      key={item.id} 
                      open={isChecked} 
                      onOpenChange={(open) => {
                        if (open && !isChecked) {
                          handleToggleChecklistItem(item.id);
                        } else if (!open && isChecked) {
                          handleToggleChecklistItem(item.id);
                        }
                      }}
                    >
                      <div className={cn(
                        "flex gap-3 p-4 rounded-xl transition-all duration-200",
                        isChecked 
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-300/60 dark:border-indigo-700/50 shadow-sm" 
                          : "bg-white/80 dark:bg-slate-800/70 border border-indigo-200/50 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600/60 hover:shadow-sm"
                      )}>
                        <CollapsibleTrigger className="flex items-start gap-3 flex-1 text-left group">
                          {isChecked ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-1 flex-shrink-0 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                          )}
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 min-w-[28px] text-base mt-0.5">
                            {item.order ?? idx}.
                          </span>
                          <span className="flex-1 text-base leading-relaxed text-slate-900 dark:text-slate-100 group-hover:text-indigo-800 dark:group-hover:text-indigo-200 transition-colors">
                            {item.criterion}
                          </span>
                        </CollapsibleTrigger>
                      </div>

                      {isChecked && (
                        <CollapsibleContent>
                          <div className="mt-4 ml-9 p-5 bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-indigo-200/60 dark:border-indigo-800/50 shadow-md space-y-5">
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={itemData?.passed ?? true}
                                onCheckedChange={(checked) => 
                                  handleUpdateChecklistItem(item.id, 'passed', checked)
                                }
                                className="border-indigo-400 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:border-indigo-600 dark:data-[state=checked]:bg-indigo-700"
                              />
                              <Label className="text-sm font-medium text-indigo-700 dark:text-indigo-300 cursor-pointer">
                                Passed
                              </Label>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Score (out of 100)</Label>
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
                                className={cn(
                                  "flex h-10 w-full rounded-lg border bg-white/90 dark:bg-slate-800/90 px-3 py-2 text-sm ring-offset-background dark:text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                                  itemData?.score === undefined 
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-400/40" 
                                    : "border-indigo-200/60 dark:border-indigo-700/50 focus:border-indigo-400"
                                )}
                                placeholder="Enter score (0-100)"
                                required
                              />
                              {itemData?.score === undefined && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  Score is required for this question.
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Notes</Label>
                              <Textarea 
                                value={itemData?.notes ?? ''}
                                onChange={(e) => 
                                  handleUpdateChecklistItem(item.id, 'notes', e.target.value)
                                }
                                placeholder="Add notes about this criterion..."
                                rows={3}
                                className="rounded-lg border border-indigo-200/60 dark:border-indigo-700/50 bg-white/90 dark:bg-slate-800/90 focus:border-indigo-400 focus:ring-indigo-400/40 dark:text-white transition-all"
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
          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleCompleteInterview}
              variant="default"
              size="lg"
              disabled={hasValidationErrors}
              className="px-10 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-700 dark:to-purple-800 dark:hover:from-indigo-600 dark:hover:to-purple-700 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-base font-medium text-white"
            >
              Complete Interview
            </Button>
          </div>
        </div>
      );
    })() : (
      <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-indigo-200/50 dark:border-indigo-800/40 shadow-inner">
        <p className="text-base font-medium">No questions found in this template.</p>
        <p className="text-sm mt-2">Template may be empty or not loaded correctly.</p>
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
