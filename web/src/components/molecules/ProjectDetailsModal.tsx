import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Users,
  Briefcase,
  Settings,
  ShieldCheck,
  ClipboardCheck,
  Calendar,
  Building2,
  Clock,
  User,
  Target,
  Layers,
  GraduationCap,
} from "lucide-react";
import { ProjectCountryCell } from "@/components/molecules/domain";
import { FlagIcon } from "@/shared";
import { useCountryValidation } from "@/shared/hooks/useCountriesLookup";
import { formatSalaryRangeWithINRBracket } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { getProjectRoleVisaTypeLabel } from "@/features/projects/constants/project-role-visa-types";
import {
  getConfigValueBadge,
  getProjectStatusBadge,
  statusBadgeClassNames,
} from "@/features/projects/constants/statusBadges";

type ProjectRole = {
  id: string;
  designation?: string;
  quantity?: number;
  minExperience?: number;
  maxExperience?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  genderRequirement?: string;
  employmentType?: string;
  visaType?: string;
  minSalaryRange?: number | null;
  maxSalaryRange?: number | null;
  accommodation?: boolean;
  food?: boolean;
  transport?: boolean;
  backgroundCheckRequired?: boolean;
  drugScreeningRequired?: boolean;
  requiredSkills?: string[];
  notes?: string;
  roleCatalog?: { roleDepartment?: { label?: string } };
  educationRequirementsList?: Array<{
    qualification?: { shortName?: string; name?: string };
  }>;
};

type ProjectDocument = {
  id: string;
  docType: string;
  description?: string;
  mandatory?: boolean;
};

type ProjectDetails = {
  title?: string;
  status?: string;
  priority?: string;
  deadline?: string;
  createdAt?: string;
  countryCode?: string;
  country?: { name?: string; currency?: string };
  client?: { name?: string };
  creator?: { name?: string };
  resumeEditable?: boolean;
  hideContactInfo?: boolean;
  requiredScreening?: boolean;
  groomingRequired?: string;
  projectType?: string;
  sector?: string;
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;
  rolesNeeded?: ProjectRole[];
  documentRequirements?: ProjectDocument[];
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function SectionCard({
  title,
  icon: Icon,
  iconClassName,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-3 py-1.5">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200/80",
            iconClassName
          )}
        >
          <Icon className="h-3 w-3" aria-hidden />
        </div>
        <h3 className="text-xs font-bold text-slate-800">{title}</h3>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function InfoTile({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50/60 px-2 py-1.5">
      <Icon className={cn("h-3 w-3 shrink-0", iconClassName)} aria-hidden />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-xs font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function ConfigBadge({ label, value }: { label: string; value: string }) {
  const style = getConfigValueBadge(value);
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50/50 px-2 py-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <Badge
        variant="outline"
        className={statusBadgeClassNames(
          style,
          "h-5 px-1.5 py-0 text-[9px] normal-case tracking-normal"
        )}
      >
        {style.label}
      </Badge>
    </div>
  );
}

export default function ProjectDetailsModal({
  isOpen,
  onClose,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectDetails | null;
}) {
  const { getCountryCurrency } = useCountryValidation();

  if (!project) return null;

  const projectCurrency =
    project.country?.currency || getCountryCurrency(project.countryCode);
  const statusBadge = getProjectStatusBadge(project.status);
  const totalPositions =
    project.rolesNeeded?.reduce((sum, role) => sum + (role.quantity ?? 0), 0) ?? 0;
  const rolesCount = project.rolesNeeded?.length ?? 0;
  const docsCount = project.documentRequirements?.length ?? 0;
  const daysUntilDeadline = project.deadline
    ? Math.ceil(
        (new Date(project.deadline).setHours(0, 0, 0, 0) -
          new Date().setHours(0, 0, 0, 0)) /
          86400000
      )
    : null;
  const isDeadlineUrgent =
    daysUntilDeadline !== null && daysUntilDeadline <= 14;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!flex h-[min(72vh,680px)] max-h-[72vh] w-[min(96vw,1200px)] !max-w-[min(96vw,1200px)] flex-col gap-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-0 shadow-2xl">
        {/* Header — compact single band */}
        <div className="relative shrink-0 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
          <div
            className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
            aria-hidden
          />

          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
            <div className="relative shrink-0">
              <div className="relative flex h-10 w-14 items-center justify-center rounded-lg border border-indigo-200/70 bg-gradient-to-br from-blue-50 to-indigo-50 p-1 shadow-sm ring-1 ring-white">
                {project.countryCode ? (
                  <FlagIcon
                    countryCode={project.countryCode}
                    size="lg"
                    className="rounded border border-white shadow-sm"
                    aria-label={`Flag of ${project.country?.name || project.countryCode}`}
                  />
                ) : (
                  <ProjectCountryCell
                    countryCode={project.countryCode}
                    countryName={project.country?.name}
                    size="sm"
                    fallbackText="—"
                  />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <DialogTitle className="truncate text-base font-bold text-slate-900">
                  {project.title}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={statusBadgeClassNames(statusBadge, "shrink-0 py-0")}
                >
                  {statusBadge.label}
                </Badge>
              </div>
              <DialogDescription className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500">
                {project.country?.name && (
                  <span className="font-medium text-indigo-700">{project.country.name}</span>
                )}
                {project.client?.name && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" aria-hidden />
                    {project.client.name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" aria-hidden />
                  Due {formatDate(project.deadline)}
                </span>
              </DialogDescription>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
              {[
                { label: "Pos", value: totalPositions, icon: Briefcase, tone: "text-blue-700 bg-blue-50" },
                { label: "Roles", value: rolesCount, icon: Layers, tone: "text-purple-700 bg-purple-50" },
                { label: "Docs", value: docsCount, icon: FileText, tone: "text-amber-700 bg-amber-50" },
                {
                  label: "Days",
                  value:
                    daysUntilDeadline === null
                      ? "—"
                      : daysUntilDeadline < 0
                        ? "!"
                        : daysUntilDeadline,
                  icon: Clock,
                  tone: isDeadlineUrgent
                    ? "text-red-700 bg-red-50"
                    : "text-emerald-700 bg-emerald-50",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ring-1 ring-slate-200/80",
                    stat.tone
                  )}
                >
                  <stat.icon className="h-3 w-3" aria-hidden />
                  <span className="opacity-70">{stat.label}</span>
                  <span className="tabular-nums">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body — native scroll so the bar is always visible when content overflows */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/40 [scrollbar-color:rgb(203_213_225)_rgb(248_250_252)] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100"
          role="region"
          aria-label="Project details"
        >
          <div className="space-y-3 px-4 py-3 sm:px-5">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <SectionCard
                title="Overview"
                icon={Briefcase}
                iconClassName="text-blue-600"
              >
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                <InfoTile
                  label="Client"
                  value={project.client?.name || "—"}
                  icon={Building2}
                  iconClassName="text-orange-500"
                />
                <InfoTile
                  label="Created by"
                  value={project.creator?.name || "—"}
                  icon={User}
                  iconClassName="text-indigo-500"
                />
                <InfoTile
                  label="Deadline"
                  value={formatDate(project.deadline)}
                  icon={Calendar}
                  iconClassName={isDeadlineUrgent ? "text-red-500" : "text-blue-500"}
                />
                <InfoTile
                  label="Created"
                  value={formatDate(project.createdAt)}
                  icon={Clock}
                  iconClassName="text-slate-500"
                />
                <InfoTile
                  label="Priority"
                  value={(project.priority || "medium").toUpperCase()}
                  icon={Target}
                  iconClassName="text-amber-500"
                />
                <InfoTile
                  label="Sector"
                  value={(project.sector || "Healthcare").toUpperCase()}
                  icon={Briefcase}
                  iconClassName="text-emerald-500"
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Configuration"
              icon={Settings}
              iconClassName="text-indigo-600"
            >
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <ConfigBadge
                  label="Resume"
                  value={project.resumeEditable ? "Editable" : "Fixed"}
                />
                <ConfigBadge
                  label="Contact"
                  value={project.hideContactInfo ? "Hidden" : "Visible"}
                />
                <ConfigBadge
                  label="Screening"
                  value={project.requiredScreening ? "Required" : "Not Required"}
                />
                <ConfigBadge
                  label="Type"
                  value={
                    project.projectType === "ministry" ? "Government" : "Private"
                  }
                />
                {project.groomingRequired && (
                  <ConfigBadge
                    label="Grooming"
                    value={
                      project.groomingRequired === "not_specified"
                        ? "None"
                        : project.groomingRequired.charAt(0).toUpperCase() +
                          project.groomingRequired.slice(1)
                    }
                  />
                )}
              </div>

              {(project.licensingExam || project.dataFlow || project.eligibility) && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                  {project.licensingExam && (
                    <Badge
                      variant="outline"
                      className="border-orange-200 bg-orange-50 text-orange-700"
                    >
                      License: {project.licensingExam.toUpperCase()}
                    </Badge>
                  )}
                  {project.dataFlow && (
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-blue-50 text-blue-700"
                    >
                      Data Flow Required
                    </Badge>
                  )}
                  {project.eligibility && (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-700"
                    >
                      Eligibility Required
                    </Badge>
                  )}
                </div>
              )}
            </SectionCard>
            </div>

            {project.rolesNeeded && project.rolesNeeded.length > 0 && (
              <SectionCard
                title={`Roles (${project.rolesNeeded.length})`}
                icon={Users}
                iconClassName="text-purple-600"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {project.rolesNeeded.map((role) => (
                    <div
                      key={role.id}
                      className="rounded-lg border border-slate-200/80 border-l-[3px] border-l-purple-400 bg-white p-2.5 shadow-sm"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-bold text-slate-900">
                            {role.designation}
                          </h4>
                          {role.roleCatalog?.roleDepartment?.label && (
                            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                              {role.roleCatalog.roleDepartment.label}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-purple-200 bg-purple-50 text-purple-700"
                        >
                          {role.quantity ?? 0} pos
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                        <div>
                          <span className="text-slate-400">Experience</span>
                          <p className="font-semibold text-slate-700">
                            {role.minExperience}–{role.maxExperience ?? "Any"}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Age</span>
                          <p className="font-semibold text-slate-700">
                            {role.minAge != null && role.maxAge != null
                              ? `${role.minAge}–${role.maxAge}`
                              : role.minAge != null
                                ? `≥ ${role.minAge}`
                                : role.maxAge != null
                                  ? `≤ ${role.maxAge}`
                                  : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Gender</span>
                          <p className="font-semibold capitalize text-slate-700">
                            {role.genderRequirement || "All"}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Employment</span>
                          <p className="font-semibold text-slate-700">
                            {role.employmentType || "Any"}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Visa</span>
                          <p className="font-semibold text-slate-700">
                            {role.visaType
                              ? getProjectRoleVisaTypeLabel(role.visaType)
                              : "Any"}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Salary</span>
                          <p className="font-semibold text-slate-700">
                            {role.minSalaryRange != null || role.maxSalaryRange != null
                              ? formatSalaryRangeWithINRBracket(
                                  role.minSalaryRange,
                                  role.maxSalaryRange,
                                  projectCurrency
                                )
                              : "As per policy"}
                          </p>
                        </div>
                      </div>

                      {role.educationRequirementsList &&
                        role.educationRequirementsList.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {role.educationRequirementsList.map((edu, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                              >
                                <GraduationCap className="h-3 w-3 text-indigo-500" aria-hidden />
                                {edu.qualification?.shortName ||
                                  edu.qualification?.name}
                              </span>
                            ))}
                          </div>
                        )}

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {role.accommodation && (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                          >
                            Accommodation
                          </Badge>
                        )}
                        {role.food && (
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-[10px] text-blue-700"
                          >
                            Food
                          </Badge>
                        )}
                        {role.transport && (
                          <Badge
                            variant="outline"
                            className="border-purple-200 bg-purple-50 text-[10px] text-purple-700"
                          >
                            Transport
                          </Badge>
                        )}
                      </div>

                      {(role.backgroundCheckRequired || role.drugScreeningRequired) && (
                        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
                          {role.backgroundCheckRequired && (
                            <span className="inline-flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" aria-hidden />
                              Background check
                            </span>
                          )}
                          {role.drugScreeningRequired && (
                            <span className="inline-flex items-center gap-1">
                              <ClipboardCheck className="h-3 w-3" aria-hidden />
                              Drug screening
                            </span>
                          )}
                        </div>
                      )}

                      {role.requiredSkills && role.requiredSkills.length > 0 && (
                        <div className="mt-3 border-t border-slate-100 pt-2.5">
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Skills
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {role.requiredSkills.map((skill, idx) => (
                              <Badge
                                key={`${role.id}-skill-${idx}`}
                                variant="secondary"
                                className="text-[10px] font-medium"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {role.notes && (
                        <p className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2 text-[11px] italic text-slate-600">
                          {role.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {project.documentRequirements && project.documentRequirements.length > 0 && (
              <SectionCard
                title={`Documents (${project.documentRequirements.length})`}
                icon={FileText}
                iconClassName="text-amber-600"
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {project.documentRequirements.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col rounded-lg border border-slate-200/80 border-l-[3px] border-l-amber-400 bg-white p-2.5 shadow-sm"
                    >
                      <p className="truncate text-sm font-semibold capitalize text-slate-800">
                        {doc.docType.replace(/_/g, " ")}
                      </p>
                      {doc.description && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                          {doc.description}
                        </p>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-2 w-fit text-[10px]",
                          doc.mandatory
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        )}
                      >
                        {doc.mandatory ? "Mandatory" : "Optional"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-slate-200/80 bg-white px-4 py-2 sm:px-5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 min-w-[88px] text-xs font-semibold"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
