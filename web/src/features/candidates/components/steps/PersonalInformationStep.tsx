import React, { useEffect, useState } from "react";
import {
  Control,
  Controller,
  FieldErrors,
  useWatch,
  UseFormSetValue,
} from "react-hook-form";
import type { CreateCandidateFormData } from "@/features/candidates/createCandidateFormSchema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCodeSelect, SelectAgent, PhysicalAddressFields } from "@/components/molecules";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetAgentProjectsQuery } from "@/features/agents/api";
import { useDebounce } from "@/hooks";
import { SKIN_TONES, SMARTNESS_LEVELS, CANDIDATE_SOURCES, LANGUAGE_PROFICIENCY_LEVELS } from "@/constants/candidate-constants";
import { ProfileImageUpload } from "@/components/molecules/ProfileImageUpload";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Ruler,
  Weight,
  Sparkles,
  Building2,
  Languages,
  Brain,
  ChevronsUpDown,
  X,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";

const LINKED_PROJECTS_PAGE_SIZE = 8;

// ---------------------------------------------------------------------------
// Self-contained multi-select — owns its own open state so field.onChange
// re-renders don't unmount the Popover and make items appear disabled.
// ---------------------------------------------------------------------------
interface AgentProjectsMultiSelectProps {
  projects: Array<{
    projectId: string;
    project?: {
      title: string;
      client?: { name: string } | null;
    } | null;
  }>;
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Merged titles from loaded pages — used for trigger chips when id is not on current page */
  titlesByProjectId: Record<string, string>;
  page: number;
  totalPages: number;
  totalLinked: number;
  onPageChange: (page: number) => void;
  isFetching: boolean;
  pageSize: number;
  searchInput: string;
  onSearchChange: (value: string) => void;
}

function AgentProjectsMultiSelect({
  projects,
  selected,
  onChange,
  titlesByProjectId,
  page,
  totalPages,
  totalLinked,
  onPageChange,
  isFetching,
  pageSize,
  searchInput,
  onSearchChange,
}: AgentProjectsMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      onSearchChange("");
    }
  };

  const toggle = (pid: string) => {
    if (selected.includes(pid)) {
      onChange(selected.filter((id) => id !== pid));
    } else {
      onChange([...selected, pid]);
    }
  };

  const from = totalLinked === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalLinked);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Select agent linked projects"
            aria-expanded={open}
            className="w-full min-h-[42px] flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
          >
            <span className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {selected.length === 0 ? (
                <span className="text-slate-400 text-sm">Select projects…</span>
              ) : (
                selected.map((pid) => {
                  const label = titlesByProjectId[pid] ?? pid;
                  return (
                    <span
                      key={pid}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 max-w-[200px]"
                    >
                      <span className="truncate">{label}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Remove ${label}`}
                        className="ml-0.5 rounded hover:bg-blue-200 p-0.5 cursor-pointer"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(pid);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            toggle(pid);
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </span>
                  );
                })
              )}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] max-w-[min(100%,20rem)] p-0 overflow-hidden"
          align="start"
          sideOffset={4}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col">
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden />
                <Input
                  value={searchInput}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search projects or clients…"
                  className="h-9 border-slate-200 bg-white pl-9"
                  aria-label="Search linked projects"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="relative">
              {isFetching ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-md bg-white/60 backdrop-blur-[1px]">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-hidden />
                  <span className="sr-only">Loading projects</span>
                </div>
              ) : null}
              <ScrollArea className="h-[260px]">
                <div className="p-2">
                  {projects.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      {searchInput.trim()
                        ? "No projects match your search."
                        : "No linked projects on this page."}
                    </p>
                  ) : (
                    <ul role="listbox" aria-multiselectable className="space-y-0.5">
                      {projects.map((row) => {
                        const pid = row.projectId;
                        const title = row.project?.title ?? pid;
                        const isSelected = selected.includes(pid);
                        const inputId = `agent-linked-proj-${pid.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
                        return (
                          <li key={pid} role="option" aria-selected={isSelected}>
                            <Label
                              htmlFor={inputId}
                              className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm text-slate-800 hover:bg-slate-100"
                            >
                              <Checkbox
                                id={inputId}
                                checked={isSelected}
                                onCheckedChange={() => toggle(pid)}
                                className="mt-0.5 shrink-0"
                                aria-label={title}
                              />
                              <span className="min-w-0 flex-1 leading-snug">
                                <span className="text-slate-900">{title}</span>
                                {row.project?.client?.name ? (
                                  <span className="block truncate text-xs text-slate-500 mt-0.5">
                                    {row.project.client.name}
                                  </span>
                                ) : null}
                              </span>
                            </Label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </ScrollArea>
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-2 py-2">
                <p className="text-[11px] text-slate-500 shrink-0">
                  {totalLinked > 0 ? (
                    <>
                      {from}–{to} of {totalLinked}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1 || isFetching}
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    aria-label="Previous page of linked projects"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[4.5rem] text-center text-xs text-slate-600">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages || isFetching}
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    aria-label="Next page of linked projects"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {selected.length} project{selected.length !== 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-slate-400 hover:text-red-500 transition-colors underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface PersonalInformationStepProps {
  control: Control<CreateCandidateFormData>;
  errors: FieldErrors<CreateCandidateFormData>;
  selectedImage: File | null;
  setSelectedImage: (image: File | null) => void;
  uploadingImage: boolean;
  isLoading: boolean;
  /** Agent Coordinator pipeline: source is always agent */
  lockSourceToAgent?: boolean;
  /** Used to clear declaredProjectIds when agent selection changes */
  setValue?: UseFormSetValue<CreateCandidateFormData>;
}

export const PersonalInformationStep: React.FC<PersonalInformationStepProps> = ({
  control,
  errors,
  selectedImage: _selectedImage,
  setSelectedImage,
  uploadingImage,
  isLoading,
  lockSourceToAgent = false,
  setValue,
}) => {
  const source = useWatch({
    control,
    name: "source",
  });
  const watchedAgentId = useWatch({ control, name: "agentId" }) as string | undefined;
  const trimmedAgentId = watchedAgentId?.trim() || "";

  const [linkedProjectsPage, setLinkedProjectsPage] = useState(1);
  const [linkedProjectsSearchInput, setLinkedProjectsSearchInput] = useState("");
  const linkedProjectsSearchDebounced = useDebounce(linkedProjectsSearchInput, 300);

  useEffect(() => {
    setLinkedProjectsPage(1);
    setLinkedProjectsSearchInput("");
  }, [trimmedAgentId]);

  useEffect(() => {
    setLinkedProjectsPage(1);
  }, [linkedProjectsSearchDebounced]);

  const [projectTitlesById, setProjectTitlesById] = useState<Record<string, string>>({});

  useEffect(() => {
    setProjectTitlesById({});
  }, [trimmedAgentId]);

  const { data: agentProjectsResponse, isFetching: loadingAgentProjects } =
    useGetAgentProjectsQuery(
      {
        id: trimmedAgentId,
        page: linkedProjectsPage,
        limit: LINKED_PROJECTS_PAGE_SIZE,
        search: linkedProjectsSearchDebounced.trim() || undefined,
      },
      { skip: !trimmedAgentId },
    );

  useEffect(() => {
    const rows = agentProjectsResponse?.data ?? [];
    setProjectTitlesById((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        if (r.isActive !== false) {
          next[r.projectId] = r.project?.title ?? r.projectId;
        }
      }
      return next;
    });
  }, [agentProjectsResponse?.data]);

  const linkedProjectsMeta = agentProjectsResponse?.meta;
  const linkedProjectsTotal = linkedProjectsMeta?.total ?? 0;
  const linkedProjects =
    agentProjectsResponse?.data?.filter((row) => row.isActive !== false) ?? [];

  const showNoLinkedProjects =
    Boolean(trimmedAgentId) &&
    !loadingAgentProjects &&
    linkedProjectsTotal === 0 &&
    !linkedProjectsSearchDebounced.trim();

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <User className="h-5 w-5 text-blue-600" />
          Personal Information
        </CardTitle>
        <CardDescription>Basic candidate information and contact details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          {/* Profile Image - Left Side */}
          <div className="flex flex-col items-center">
            <ProfileImageUpload
              onImageSelected={setSelectedImage}
              onImageRemove={() => setSelectedImage(null)}
              uploading={uploadingImage}
              disabled={isLoading || uploadingImage}
              size="md"
            />
          </div>

          {/* Form Fields - Right Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div className="space-y-2">
              <Label
                htmlFor="firstName"
                className="text-slate-700 font-medium"
              >
                First Name *
              </Label>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="firstName"
                    placeholder="John"
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">
                  {errors.firstName.message as string}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label
                htmlFor="lastName"
                className="text-slate-700 font-medium"
              >
                Last Name *
              </Label>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="lastName"
                    placeholder="Doe"
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">
                  {errors.lastName.message as string}
                </p>
              )}
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-500" />
                Contact Number *
              </Label>
              <div className="flex gap-2">
                <div className="w-32 flex-shrink-0">
                  <Controller
                    name="countryCode"
                    control={control}
                    render={({ field }) => (
                      <CountryCodeSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        name={field.name}
                        placeholder="Code"
                        error={errors.countryCode?.message as string}
                      />
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Controller
                    name="mobileNumber"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="mobileNumber"
                        type="tel"
                        placeholder="9876543210"
                        className="h-11 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                </div>
              </div>
              {errors.mobileNumber && (
                <p className="text-sm text-red-600">
                  {errors.mobileNumber.message as string}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-slate-700 font-medium"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="john.doe@example.com"
                      className="h-11 pl-10 bg-white border-slate-200"
                    />
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">
                  {errors.email.message as string}
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label
                htmlFor="dateOfBirth"
                className="text-slate-700 font-medium"
              >
                Date of Birth (optional)
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Controller
                  name="dateOfBirth"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="dateOfBirth"
                      type="date"
                      className="h-11 pl-10 bg-white border-slate-200"
                    />
                  )}
                />
              </div>
              {errors.dateOfBirth && (
                <p className="text-sm text-red-600">
                  {errors.dateOfBirth.message as string}
                </p>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Gender *
              </Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-200">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && (
                <p className="text-sm text-red-600">
                  {errors.gender.message as string}
                </p>
              )}
            </div>

            {setValue ? (
              <PhysicalAddressFields
                control={control}
                setValue={setValue}
                errors={errors}
                disabled={isLoading}
                title="Candidate address (optional)"
              />
            ) : null}

            {/* Source */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Source
              </Label>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={lockSourceToAgent}
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-200">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {CANDIDATE_SOURCES.map((src) => (
                        <SelectItem key={src.id} value={src.id}>
                          {src.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.source && (
                <p className="text-sm text-red-600">
                  {errors.source.message as string}
                </p>
              )}
            </div>

            {/* Conditional Agent Selection + declared projects (intent, not nomination) */}
            {(source === "agent" || lockSourceToAgent) ? (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    Select Agent *
                  </Label>
                  <Controller
                    name="agentId"
                    control={control}
                    render={({ field }) => (
                      <SelectAgent
                        value={field.value}
                        onValueChange={(next) => {
                          const prev =
                            typeof field.value === "string"
                              ? field.value.trim()
                              : "";
                          const normalized =
                            typeof next === "string" ? next.trim() : "";
                          if (prev !== normalized) {
                            setValue?.("declaredProjectIds", [], {
                              shouldValidate: false,
                            });
                          }
                          field.onChange(next);
                        }}
                        placeholder="Select an agent"
                        error={errors.agentId?.message as string | undefined}
                        activeOnly
                        pageSize={10}
                      />
                    )}
                  />
                </div>

                {trimmedAgentId ? (
                  <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4 max-w-sm">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Label className="text-slate-800 font-semibold flex items-center gap-2 text-sm">
                          <FolderKanban className="h-4 w-4 text-blue-500" />
                          Agent Linked Projects
                        </Label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Select projects for this candidate&apos;s future nominations.
                        </p>
                      </div>
                      {loadingAgentProjects && (
                        <span className="text-[11px] text-slate-400 mt-1 shrink-0">Loading…</span>
                      )}
                    </div>

                    {!loadingAgentProjects && showNoLinkedProjects ? (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                        <FolderKanban className="h-4 w-4 text-amber-500 shrink-0" />
                        <p className="text-xs text-amber-700">
                          No linked projects for this agent yet. Add them under Agent settings first.
                        </p>
                      </div>
                    ) : (
                      <Controller
                        name="declaredProjectIds"
                        control={control}
                        render={({ field }) => (
                          <AgentProjectsMultiSelect
                            projects={linkedProjects}
                            selected={field.value ?? []}
                            onChange={field.onChange}
                            titlesByProjectId={projectTitlesById}
                            page={linkedProjectsMeta?.page ?? 1}
                            totalPages={linkedProjectsMeta?.totalPages ?? 1}
                            totalLinked={linkedProjectsTotal}
                            onPageChange={setLinkedProjectsPage}
                            isFetching={loadingAgentProjects}
                            pageSize={LINKED_PROJECTS_PAGE_SIZE}
                            searchInput={linkedProjectsSearchInput}
                            onSearchChange={setLinkedProjectsSearchInput}
                          />
                        )}
                      />
                    )}

                    {errors.declaredProjectIds?.message ? (
                      <p className="text-sm text-red-600">
                        {errors.declaredProjectIds.message as string}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}

            {/* Physical Information subsection */}
            <div className="col-span-full">
              <h3 className="text-lg font-semibold text-slate-800 mt-6">
                Physical Information
              </h3>
            </div>

            {/* Height */}
            <div className="space-y-2">
              <Label htmlFor="height" className="text-slate-700 font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4 text-slate-500" />
                Height (cm)
              </Label>
              <Controller
                name="height"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="height"
                    type="number"
                    step="0.1"
                    placeholder="175"
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-slate-700 font-medium flex items-center gap-2">
                <Weight className="h-4 w-4 text-slate-500" />
                Weight (kg)
              </Label>
              <Controller
                name="weight"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="weight"
                    type="number"
                    step="0.1"
                    placeholder="70"
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
            </div>

            {/* Skin Tone */}
            <div className="space-y-2">
              <Label htmlFor="skinTone" className="text-slate-700 font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-500" />
                Skin Tone
              </Label>
              <Controller
                name="skinTone"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-200">
                      <SelectValue placeholder="Select skin tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKIN_TONES.map((tone) => (
                        <SelectItem key={tone} value={tone}>
                          {tone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Language Proficiency */}
            <div className="space-y-2">
              <Label htmlFor="languageProficiency" className="text-slate-700 font-medium flex items-center gap-2">
                <Languages className="h-4 w-4 text-slate-500" />
                Language Proficiency
              </Label>
              <Controller
                name="languageProficiency"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-200">
                      <SelectValue placeholder="Select language proficiency" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_PROFICIENCY_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Smartness */}
            <div className="space-y-2">
              <Label htmlFor="smartness" className="text-slate-700 font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-slate-500" />
                Smartness
              </Label>
              <Controller
                name="smartness"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-200">
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      {SMARTNESS_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalInformationStep;