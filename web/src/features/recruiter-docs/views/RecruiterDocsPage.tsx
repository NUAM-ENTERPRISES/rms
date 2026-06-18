import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronDown,
  ArrowUpRight,
  Phone,
  UserPlus,
  ClipboardList,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useGetRecruiterDocumentsQuery,
  useGetRecruiterVerifiedRejectedDocumentsQuery,
  type RecruiterDocumentsResponse,
} from "@/features/documents/api";
import { useGetProjectsQuery, useGetProjectQuery } from "@/services/projectsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { getStatusConfig, CandidateProjectStatus } from "@/constants/statuses";
import * as Icons from "lucide-react";
import { ImageViewer } from "@/components/molecules";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MandatoryDocumentsGrid } from "../components/MandatoryDocumentsGrid";
import { ProjectDocumentsProgressGrid } from "../components/ProjectDocumentsProgressGrid";
import { VerificationDocumentsProgressGrid } from "../components/VerificationDocumentsProgressGrid";
import {
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
} from "@/features/documents/api";
import { useUploadDocumentMutation } from "@/features/candidates/api";
import { getUploadErrorMessage } from "@/lib/document-upload";
import { toast } from "sonner";
import { DateUtils } from "@/shared/utils/date";
import { FlagIcon } from "@/shared";

const CandidateUploadDocumentModal = React.lazy(
  () => import("../components/CandidateUploadDocumentModal"),
);

function formatPhoneForLink(candidate: {
  countryCode?: string;
  mobileNumber?: string;
}) {
  const raw = `${candidate.countryCode ?? ""}${candidate.mobileNumber ?? ""}`;
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

function ProjectNameWithFlag({
  title,
  countryCode,
  titleClassName = "text-sm font-medium text-slate-800",
}: {
  title: string;
  countryCode?: string | null;
  titleClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {countryCode ? (
        <FlagIcon
          countryCode={countryCode}
          size="sm"
          className="shrink-0 rounded-sm"
          aria-label={`Project country ${countryCode}`}
        />
      ) : null}
      <span className={cn("truncate", titleClassName)}>{title}</span>
    </div>
  );
}

const RecruiterDocsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState("pending_documents");
  const [showScreeningOnly, setShowScreeningOnly] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("all");
  
  // Project filter specific states
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPage, setProjectPage] = useState(1);
  const debouncedProjectSearch = useDebounce(projectSearch, 500);
  const [isProjectPopoverOpen, setIsProjectPopoverOpen] = useState(false);
  const [mandatoryUpload, setMandatoryUpload] = useState<{
    candidateId: string;
    docType: string;
  } | null>(null);
  const debouncedSearch = useDebounce(search, 500);

  const { data: projectsData } = useGetProjectsQuery({ 
    limit: 10, 
    search: debouncedProjectSearch, 
    page: projectPage 
  });
  
  const { data: projectDetails } = useGetProjectQuery(selectedProjectId, {
    skip: selectedProjectId === "all",
  });
  
  const roles = projectDetails?.data?.rolesNeeded || [];

  const handleClearFilters = () => {
    setSearch("");
    setShowScreeningOnly(false);
    setSelectedProjectId("all");
    setSelectedRoleId("all");
    setProjectSearch("");
    setProjectPage(1);
    setPage(1);
  };

  const isMandatoryView = statusFilter === "mandatory_documents";
  const isProjectDocsProgressView =
    statusFilter === "nominated" || statusFilter === "pending_documents";
  const isVerifiedOrRejected = statusFilter === "documents_verified" || statusFilter === "rejected_documents";

  const [uploadDocument, { isLoading: isUploadingFile }] =
    useUploadDocumentMutation();
  const [createDocument, { isLoading: isCreatingDocument }] =
    useCreateDocumentMutation();
  const [updateDocument, { isLoading: isUpdatingDocument }] =
    useUpdateDocumentMutation();

  const dashboardCountsParams = useMemo(
    () => ({
      page: 1,
      limit: 1,
      projectId: selectedProjectId === "all" ? undefined : selectedProjectId,
      roleCatalogId: selectedRoleId === "all" ? undefined : selectedRoleId,
    }),
    [selectedProjectId, selectedRoleId],
  );

  const { data: dashboardCountsData } = useGetRecruiterDocumentsQuery(
    dashboardCountsParams,
  );

  const { data: pendingDocsData, isLoading: isPendingLoading, refetch: refetchPendingDocs } = useGetRecruiterDocumentsQuery({
    page,
    limit,
    search: debouncedSearch,
    status: showScreeningOnly ? "InScreening" : (statusFilter === "all" ? undefined : statusFilter),
    projectId: selectedProjectId === "all" ? undefined : selectedProjectId,
    roleCatalogId: selectedRoleId === "all" ? undefined : selectedRoleId,
  }, { skip: isVerifiedOrRejected });

  const { data: verifiedRejectedDocsData, isLoading: isVerifiedRejectedLoading } = useGetRecruiterVerifiedRejectedDocumentsQuery({
    page,
    limit,
    search: debouncedSearch,
    status: showScreeningOnly ? "InScreening" : (statusFilter === "documents_verified" ? "verified" : "rejected"),
    projectId: selectedProjectId === "all" ? undefined : selectedProjectId,
    roleCatalogId: selectedRoleId === "all" ? undefined : selectedRoleId,
  }, { skip: !isVerifiedOrRejected });

  const docsData = isVerifiedOrRejected ? verifiedRejectedDocsData : pendingDocsData;
  const isLoading = isVerifiedOrRejected ? isVerifiedRejectedLoading : isPendingLoading;

  type RecruiterDocCounts = NonNullable<RecruiterDocumentsResponse["counts"]>;
  const stableCountsRef = useRef<RecruiterDocCounts | null>(null);
  const rawCounts = dashboardCountsData?.data?.counts;
  useEffect(() => {
    if (rawCounts) {
      stableCountsRef.current = rawCounts;
    }
  }, [rawCounts]);

  const displayCounts = rawCounts ?? stableCountsRef.current;
  const stats = useMemo(
    () => ({
      nominated: displayCounts?.nominated ?? 0,
      pendingDocuments: displayCounts?.pending ?? 0,
      mandatoryDocuments: displayCounts?.mandatoryDocuments ?? 0,
      verifiedDocuments: displayCounts?.verified ?? 0,
      rejectedDocuments: displayCounts?.rejected ?? 0,
      inScreening: displayCounts?.inScreening ?? 0,
    }),
    [displayCounts],
  );

  const items = docsData?.data?.items || [];
  const pagination = docsData?.data?.pagination;

  const recentSubmissions = items
    .flatMap((item) => 
      (item.documentDetails || []).map((doc) => ({
        ...doc,
        candidateName: `${item.candidate.firstName} ${item.candidate.lastName}`,
        candidateId: item.candidate.id,
        projectTitle: item.project.title,
        projectId: item.project.id
      }))
    )
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 3);

  const pendingItems = items
    .filter((item) => item.progress.docsUploaded < item.progress.totalDocsToUpload)
    .slice(0, 2);

  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return "from-rose-500 to-rose-600";
    if (percentage < 70) return "from-amber-400 to-amber-500";
    if (percentage < 100) return "from-sky-500 to-blue-600";
    return "from-emerald-500 to-emerald-600";
  };

  const navigateToCandidateDocuments = (
    candidateId: string,
    uploadDocType?: string,
  ) => {
    navigate(`/candidates/${candidateId}`, {
      state: {
        activeTab: "documents",
        ...(uploadDocType ? { uploadDocType } : {}),
      },
    });
  };

  const isMandatoryUploading =
    isUploadingFile || isCreatingDocument || isUpdatingDocument;

  const handleMandatoryUploadOpen = (candidateId: string, docType: string) => {
    setMandatoryUpload({ candidateId, docType });
  };

  const handleMandatoryDocumentUpload = async (
    file: File,
    meta: {
      docType: string;
      docName?: string;
      documentNumber?: string;
      expiryDate?: string;
      notes?: string;
      roleCatalogId?: string;
      workExperienceId?: string;
    },
  ) => {
    const candidateId = mandatoryUpload?.candidateId;
    if (!candidateId) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", meta.docType);
      if (meta.roleCatalogId) {
        formData.append("roleCatalogId", meta.roleCatalogId);
      }

      const response = await uploadDocument({
        candidateId,
        formData,
      }).unwrap();

      const uploadData = response.data as {
        fileName: string;
        fileUrl: string;
        fileSize?: number;
        mimeType?: string;
        document?: { id: string };
        id?: string;
      };

      const uploadedDocument =
        uploadData?.document?.id
          ? uploadData.document
          : uploadData?.id
            ? uploadData
            : null;

      const desiredDocName = meta.docName?.trim() || undefined;

      if (uploadedDocument?.id) {
        await updateDocument({
          id: uploadedDocument.id,
          docName: desiredDocName,
          documentNumber: meta.documentNumber,
          expiryDate: DateUtils.toApiDate(meta.expiryDate),
          notes: meta.notes,
        }).unwrap();
      } else {
        await createDocument({
          candidateId,
          docType: meta.docType,
          docName: desiredDocName,
          fileName: uploadData.fileName,
          fileUrl: uploadData.fileUrl,
          fileSize: uploadData.fileSize,
          mimeType: uploadData.mimeType,
          documentNumber: meta.documentNumber,
          expiryDate: DateUtils.toApiDate(meta.expiryDate),
          notes: meta.notes,
          roleCatalogId: meta.roleCatalogId,
          workExperienceId: meta.workExperienceId,
        }).unwrap();
      }

      toast.success("Document uploaded successfully");
      setMandatoryUpload(null);
      if (!isVerifiedOrRejected) {
        void refetchPendingDocs();
      }
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Upload Status for Projects</h1>
          <p className="text-muted-foreground">
            Manage and submit project-related documents for your assigned projects.
          </p>
        </div>
      </div>

      {/* Dashboard Stats Cards */}
      {(() => {
        const tileCards = [
          {
            label: "Upload Pending",
            value: stats?.nominated || 0,
            subtitle: "Awaiting documents",
            icon: UserPlus,
            accent: "indigo",
            isActive: statusFilter === "nominated" && !showScreeningOnly,
            onClick: () => { setStatusFilter("nominated"); setShowScreeningOnly(false); setPage(1); },
          },
          {
            label: "Verification In Progress",
            value: stats?.pendingDocuments || 0,
            subtitle: "Awaiting verification",
            icon: Clock,
            accent: "amber",
            isActive: statusFilter === "pending_documents" && !showScreeningOnly,
            onClick: () => { setStatusFilter("pending_documents"); setShowScreeningOnly(false); setPage(1); },
          },
          {
            label: "Verified",
            value: stats?.verifiedDocuments || 0,
            subtitle: "Approved documents",
            icon: CheckCircle,
            accent: "emerald",
            isActive: statusFilter === "documents_verified" && !showScreeningOnly,
            onClick: () => { setStatusFilter("documents_verified"); setShowScreeningOnly(false); setPage(1); },
          },
          {
            label: "Rejected",
            value: stats?.rejectedDocuments || 0,
            subtitle: "Action required",
            icon: XCircle,
            accent: "red",
            isActive: statusFilter === "rejected_documents" && !showScreeningOnly,
            onClick: () => { setStatusFilter("rejected_documents"); setShowScreeningOnly(false); setPage(1); },
          },
          {
            label: "Mandatory Documents",
            value: stats?.mandatoryDocuments || 0,
            subtitle: "6 profile docs required",
            icon: ClipboardList,
            accent: "sky",
            isActive: statusFilter === "mandatory_documents" && !showScreeningOnly,
            onClick: () => { setStatusFilter("mandatory_documents"); setShowScreeningOnly(false); setPage(1); },
          },
        ] as const;
        const accentMap: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
          indigo:  { card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100", icon: "text-indigo-600",  iconBg: "bg-indigo-100",  value: "text-indigo-700",  ring: "ring-indigo-400/50",  dot: "bg-indigo-500"  },
          sky:     { card: "from-sky-50 via-white to-sky-50/30 border-sky-100",         icon: "text-sky-600",     iconBg: "bg-sky-100",     value: "text-sky-700",     ring: "ring-sky-400/50",     dot: "bg-sky-500"     },
          amber:   { card: "from-amber-50 via-white to-amber-50/30 border-amber-100",   icon: "text-amber-600",   iconBg: "bg-amber-100",   value: "text-amber-700",   ring: "ring-amber-400/50",   dot: "bg-amber-500"   },
          emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", value: "text-emerald-700", ring: "ring-emerald-400/50", dot: "bg-emerald-500" },
          red:     { card: "from-red-50 via-white to-red-50/30 border-red-100",         icon: "text-red-600",     iconBg: "bg-red-100",     value: "text-red-700",     ring: "ring-red-400/50",     dot: "bg-red-500"     },
        };
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {tileCards.map((tile, i) => {
              const Icon = tile.icon;
              const s = accentMap[tile.accent];
              return (
                <motion.button
                  key={tile.label}
                  type="button"
                  onClick={tile.onClick}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                  className={cn(
                    "group relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200 focus:outline-none",
                    s.card,
                    tile.isActive ? `ring-2 shadow-md ${s.ring}` : "hover:-translate-y-0.5 hover:shadow-md"
                  )}
                >
                  {tile.isActive && (
                    <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tile.label}</p>
                      <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{tile.value}</p>
                      <p className="text-xs text-slate-500">{tile.subtitle}</p>
                    </div>
                    <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                      <Icon className={cn("h-5 w-5", s.icon)} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                    <span>{tile.isActive ? "Viewing now" : "Click to filter"}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        );
      })()}

      {/* Project Documents Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Table Header Bar */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 truncate">
                  {showScreeningOnly ? "In Screening Documents" :
                   statusFilter === "nominated" ? "Nominated Candidates" :
                   statusFilter === "mandatory_documents" ? "Candidate Mandatory Documents" :
                   statusFilter === "pending_documents" ? "Upload Pending Documents" :
                   statusFilter === "documents_verified" ? "Verified Documents" :
                   statusFilter === "rejected_documents" ? "Rejected Documents" :
                   "All Project Documents"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {showScreeningOnly ? "Candidates currently in screening phase." :
                   statusFilter === "nominated" ? "Candidates nominated to projects awaiting document upload." :
                   statusFilter === "mandatory_documents" ? "Your assigned candidates missing one or more of the six mandatory profile documents." :
                   statusFilter === "pending_documents" ? "Candidates with pending document uploads." :
                   statusFilter === "documents_verified" ? "Candidates with all documents verified." :
                   statusFilter === "rejected_documents" ? "Candidates with rejected documents." :
                   "Track document submission progress."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full xl:w-auto">
              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 bg-slate-100/80 px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  <Checkbox 
                    id="screening-filter" 
                    checked={showScreeningOnly}
                    onCheckedChange={(checked) => {
                      setShowScreeningOnly(!!checked);
                      setPage(1);
                    }}
                  />
                  <Label htmlFor="screening-filter" className="text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap">
                    In Screening Only
                  </Label>
                </div>

                <Popover open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isProjectPopoverOpen}
                      className="w-[220px] justify-between bg-white border-slate-200 h-9 shadow-sm font-normal"
                    >
                      <div className="truncate flex items-center gap-2 min-w-0">
                        {selectedProjectId === "all" ? (
                          "All Projects"
                        ) : (
                          <ProjectNameWithFlag
                            title={projectDetails?.data?.title || "Loading project..."}
                            countryCode={
                              (projectDetails?.data as { countryCode?: string | null } | undefined)
                                ?.countryCode
                            }
                            titleClassName="text-sm font-normal truncate"
                          />
                        )}
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="flex flex-col">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search projects..."
                            className="pl-7 h-8 text-xs border-none bg-muted/50 focus-visible:ring-0"
                            value={projectSearch}
                            onChange={(e) => {
                              setProjectSearch(e.target.value);
                              setProjectPage(1);
                            }}
                          />
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        <div
                          className={cn(
                            "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            selectedProjectId === "all" && "bg-accent/50"
                          )}
                          onClick={() => {
                            setSelectedProjectId("all");
                            setSelectedRoleId("all");
                            setPage(1);
                            setIsProjectPopoverOpen(false);
                          }}
                        >
                          All Projects
                        </div>
                        {projectsData?.data?.projects?.map((project) => (
                          <div
                            key={project.id}
                            className={cn(
                              "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              selectedProjectId === project.id && "bg-accent/50"
                            )}
                            onClick={() => {
                              setSelectedProjectId(project.id);
                              setSelectedRoleId("all");
                              setPage(1);
                              setIsProjectPopoverOpen(false);
                            }}
                          >
                            <ProjectNameWithFlag
                              title={project.title}
                              countryCode={
                                (project as { countryCode?: string | null }).countryCode
                              }
                              titleClassName="text-sm font-normal truncate"
                            />
                          </div>
                        ))}
                        {projectsData?.data?.projects?.length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No projects found.
                          </div>
                        )}
                      </div>
                      
                      {projectsData?.data?.pagination && projectsData.data.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between p-2 border-t bg-muted/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => setProjectPage((p) => Math.max(1, p - 1))}
                            disabled={Number(projectsData.data.pagination.page) === 1}
                          >
                            <ChevronLeft className="h-3 w-3 mr-1" />
                            Prev
                          </Button>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {projectsData.data.pagination.page} / {projectsData.data.pagination.totalPages}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => setProjectPage((p) => Math.min(projectsData.data.pagination.totalPages, p + 1))}
                            disabled={Number(projectsData.data.pagination.page) === projectsData.data.pagination.totalPages}
                          >
                            Next
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Select
                  value={selectedRoleId}
                  onValueChange={(val) => {
                    setSelectedRoleId(val);
                    setPage(1);
                  }}
                  disabled={selectedProjectId === "all"}
                >
                  <SelectTrigger className="w-[180px] bg-white border-slate-200 h-9 shadow-sm">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.roleCatalogId || role.id}>
                        {role.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search and Clear Row */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 xl:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search projects or candidates..."
                    className="pl-9 h-9 text-sm border-slate-200 bg-white focus:ring-2 focus:ring-blue-100"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <Button 
                  variant="outline"
                  size="sm" 
                  className="h-9 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 gap-2 transition-colors border-slate-200"
                  onClick={handleClearFilters}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Clear</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600" />
            <p className="text-sm font-medium">Loading documents…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FileText className="h-8 w-8 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-600">No documents found</p>
            <p className="text-sm text-slate-400 text-center max-w-xs">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <>
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-gray-200">
              <TableRow className="hover:bg-slate-50/80">
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Candidate</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Project Name</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Project Role</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 min-w-[180px]">
                  {isMandatoryView
                    ? "Mandatory Documents (6)"
                    : isProjectDocsProgressView
                      ? "Upload Progress"
                      : isVerifiedOrRejected
                        ? "Verification Progress"
                        : "Progress"}
                </TableHead>
                <TableHead className="h-10 px-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 w-[100px]">
                  Contact
                </TableHead>
                <TableHead className="h-10 px-4 text-right w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(
                items.map((item) => {
                  const statusConfig = getStatusConfig(item.status.main as CandidateProjectStatus);
                  const StatusIcon = (Icons as any)[statusConfig.icon] || Icons.HelpCircle;
                  const hasResubmission = item.documentDetails?.some(doc => doc.status === "resubmission_required");
                  
                  const screeningStatuses = [
                    "screening_assigned",
                    "screening_scheduled",
                    "screening_completed",
                    "screening_passed",
                    "screening_failed"
                  ];
                  const isInScreening = screeningStatuses.includes(item.status.main) || 
                                       ((item.status as any).sub && screeningStatuses.includes((item.status as any).sub));
                  const phoneDigits = formatPhoneForLink(item.candidate);
                  const mandatorySlots = item.mandatoryDocuments?.slots ?? [];
                  const handleRowNavigate = (e?: React.MouseEvent) => {
                    if (
                      e?.target instanceof Element &&
                      e.target.closest("[data-recruiter-upload-action]")
                    ) {
                      return;
                    }
                    if (isMandatoryView) {
                      return;
                    }
                    navigate(`/recruiter-docs/${item.project.id}/${item.candidate.id}`);
                  };

                  const openCandidateDocuments = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    navigateToCandidateDocuments(item.candidate.id);
                  };
                  
                  return (
                    <TableRow 
                      key={item.candidateProjectMapId}
                      className={cn(
                        "border-b border-gray-100 transition-colors last:border-b-0 group",
                        !isMandatoryView && "cursor-pointer",
                        isMandatoryView ? "hover:bg-sky-50/50" :
                        statusFilter === "nominated" ? "hover:bg-indigo-50/50" :
                        isInScreening ? "bg-red-50/70 hover:bg-red-100/60" :
                        statusFilter === "documents_verified" ? "bg-emerald-50/50 hover:bg-emerald-100/50" :
                        statusFilter === "rejected_documents" ? "bg-rose-50/50 hover:bg-rose-100/50" :
                        hasResubmission ? "bg-amber-100/50 hover:bg-amber-200/50" : 
                        "hover:bg-blue-50/30"
                      )}
                      onClick={(e) => handleRowNavigate(e)}
                    >
                      <TableCell className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          <ImageViewer
                            src={item.candidate.profileImage || null}
                            title={`${item.candidate.firstName || ''} ${item.candidate.lastName || ''}`}
                            className="h-9 w-9 rounded-full ring-2 ring-white shadow-sm shrink-0"
                            ariaLabel={`View profile image for ${item.candidate.firstName || ''} ${item.candidate.lastName || ''}`}
                            enableHoverPreview={true}
                          />
                          <div className="min-w-0">
                            {isMandatoryView ? (
                              <button
                                type="button"
                                className="text-sm font-semibold text-gray-900 truncate block max-w-[160px] text-left hover:text-sky-700 hover:underline"
                                onClick={openCandidateDocuments}
                              >
                                {item.candidate.firstName} {item.candidate.lastName}
                              </button>
                            ) : (
                            <span className="text-sm font-semibold text-gray-900 truncate block max-w-[160px]">{item.candidate.firstName} {item.candidate.lastName}</span>
                            )}
                            {item.candidate.candidateCode ? (
                              <span className="text-xs text-muted-foreground font-mono mt-0.5 truncate block">
                                {item.candidate.candidateCode}
                              </span>
                            ) : null}
                            <span className="text-xs text-slate-400 mt-0.5 truncate block">{item.candidate.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="max-w-[180px]">
                          <ProjectNameWithFlag
                            title={item.project.title}
                            countryCode={item.project.countryCode}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-normal text-xs">
                          {item.project.role?.designation || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <Badge className={`${statusConfig.badgeClass} flex items-center gap-1 w-fit px-2 py-0.5 text-[11px] font-medium capitalize`}>
                            <StatusIcon className="h-3 w-3" />
                            {item.status.subLabel}
                          </Badge>
                          {hasResubmission && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1 w-fit px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              <AlertCircle className="h-2.5 w-2.5" />
                              Resubmit Needed
                            </Badge>
                          )}
                          {item.lastAction && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{item.lastAction.status} by {item.lastAction.performedBy?.split(' ')[0] || "System"}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className="px-4 py-3"
                        data-recruiter-upload-action
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {isMandatoryView ? (
                          <MandatoryDocumentsGrid
                            slots={mandatorySlots}
                            uploaded={item.mandatoryDocuments?.uploaded}
                            required={item.mandatoryDocuments?.required ?? 6}
                            percent={item.mandatoryDocuments?.percent}
                            getProgressColor={getProgressColor}
                            onUploadInline={(docType) =>
                              navigateToCandidateDocuments(
                                item.candidate.id,
                                docType,
                              )
                            }
                            onNavigateToDocuments={() =>
                              navigateToCandidateDocuments(item.candidate.id)
                            }
                          />
                        ) : isProjectDocsProgressView ? (
                          <ProjectDocumentsProgressGrid
                            rows={item.documentChecklist?.rows ?? []}
                            uploaded={item.progress.docsUploaded}
                            required={item.progress.totalDocsToUpload}
                            percent={item.progress.docsPercentage}
                            getProgressColor={getProgressColor}
                            onUploadDocuments={() =>
                              navigate(
                                `/recruiter-docs/${item.project.id}/${item.candidate.id}`,
                              )
                            }
                          />
                        ) : isVerifiedOrRejected ? (
                          <VerificationDocumentsProgressGrid
                            item={item}
                            variant={
                              statusFilter === "documents_verified"
                                ? "verified"
                                : "rejected"
                            }
                            onViewDetails={() =>
                              navigate(
                                `/recruiter-docs/${item.project.id}/${item.candidate.id}`,
                              )
                            }
                          />
                        ) : (
                          <div className="flex flex-col gap-1.5 min-w-[120px]">
                            <div className="flex items-center justify-between text-[10px] font-medium">
                              <span className="text-muted-foreground">
                                {item.progress.docsUploaded} /{" "}
                                {item.progress.totalDocsToUpload} docs
                              </span>
                              <span
                                className={
                                  item.progress.docsPercentage === 100
                                    ? "text-emerald-600"
                                    : ""
                                }
                              >
                                {item.progress.docsPercentage}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80 shadow-inner ring-1 ring-inset ring-border/50">
                              <div
                                className={cn(
                                  "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out",
                                  getProgressColor(item.progress.docsPercentage),
                                )}
                                style={{
                                  width: `${item.progress.docsPercentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div
                          className="flex items-center justify-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 rounded-full text-green-600 flex items-center justify-center hover:bg-green-100 shadow-sm border border-green-100/50"
                                  onClick={() =>
                                    phoneDigits &&
                                    window.open(`https://wa.me/${phoneDigits}`, "_blank")
                                  }
                                  disabled={!phoneDigits}
                                  aria-label={`WhatsApp ${item.candidate.firstName}`}
                                >
                                  <FaWhatsapp className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">
                                  {phoneDigits ? "WhatsApp" : "No phone number"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 rounded-full text-blue-600 flex items-center justify-center hover:bg-blue-100 shadow-sm border border-blue-100/50"
                                  onClick={() =>
                                    phoneDigits &&
                                    (window.location.href = `tel:${phoneDigits}`)
                                  }
                                  disabled={!phoneDigits}
                                  aria-label={`Call ${item.candidate.firstName}`}
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">
                                  {phoneDigits ? "Call" : "No phone number"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View Details"
                            onClick={() => {
                              if (isMandatoryView) {
                                navigate(`/candidates/${item.candidate.id}`, {
                                  state: { activeTab: "documents" },
                                });
                              } else {
                                navigate(`/recruiter-docs/${item.project.id}/${item.candidate.id}`);
                              }
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-6 py-4 gap-3 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{((Number(pagination.page) - 1) * limit) + 1}–{Math.min(Number(pagination.page) * limit, pagination.total)}</span> of{" "}
              <span className="font-semibold text-slate-700">{pagination.total}</span> entries
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={Number(pagination.page) === 1}
                className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((n) => {
                  const curPage = Number(pagination.page);
                  if (pagination.totalPages <= 7 || n === 1 || n === pagination.totalPages || (n >= curPage - 1 && n <= curPage + 1)) {
                    return (
                      <Button
                        key={n}
                        variant={curPage === n ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setPage(n)}
                        className={cn("h-8 w-8 p-0 text-xs", curPage === n ? "bg-blue-600 hover:bg-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
                      >
                        {n}
                      </Button>
                    );
                  } else if (n === curPage - 2 || n === curPage + 2) {
                    return <span key={n} className="text-slate-300 text-xs px-0.5">…</span>;
                  }
                  return null;
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={Number(pagination.page) === pagination.totalPages}
                className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity or Notifications */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-none bg-slate-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Recent Submissions
            </CardTitle>
            <CardDescription>Your latest document uploads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSubmissions.length > 0 ? (
                recentSubmissions.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/recruiter-docs/${doc.projectId}/${doc.candidateId}`)}
                  >
                    <div className="bg-blue-50 p-2.5 rounded-full">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {doc.fileName}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Icons.User className="h-3 w-3" /> {doc.candidateName} • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={
                      doc.status === "verified" 
                        ? "text-emerald-600 border-emerald-200 bg-emerald-50" 
                        : doc.status === "rejected"
                        ? "text-rose-600 border-rose-200 bg-rose-50"
                        : "text-amber-600 border-amber-200 bg-amber-50"
                    }>
                      {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : "N/A"}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No recent submissions</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-slate-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Required Documents
            </CardTitle>
            <CardDescription>Pending items that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingItems.length > 0 ? (
                pendingItems.map((item) => (
                  <div key={item.candidateProjectMapId} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-amber-50 p-2.5 rounded-full">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {item.candidate.firstName} {item.candidate.lastName}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 min-w-0">
                        <Icons.Briefcase className="h-3 w-3 shrink-0" />
                        <ProjectNameWithFlag
                          title={item.project.title}
                          countryCode={item.project.countryCode}
                          titleClassName="text-[11px] text-muted-foreground font-normal truncate"
                        />
                      </p>
                      <p className="text-[10px] font-medium text-amber-600 mt-1">
                        {item.progress.totalDocsToUpload - item.progress.docsUploaded} documents pending
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-full hover:bg-amber-50 hover:text-amber-600"
                      onClick={() => navigate(`/recruiter-docs/${item.project.id}/${item.candidate.id}`)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No pending documents</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <React.Suspense fallback={null}>
        <CandidateUploadDocumentModal
          isOpen={mandatoryUpload != null}
          initialDocType={mandatoryUpload?.docType}
          onClose={() => setMandatoryUpload(null)}
          onUpload={handleMandatoryDocumentUpload}
          isUploading={isMandatoryUploading}
        />
      </React.Suspense>
    </div>
  );
};

export default RecruiterDocsPage;
