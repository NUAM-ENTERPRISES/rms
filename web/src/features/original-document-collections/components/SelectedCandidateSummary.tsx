import type { ComponentType } from "react";
import { format } from "date-fns";
import {
  Briefcase,
  Calendar,
  Loader2,
  Mail,
  Phone,
  UserCircle2,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useGetCandidateByIdQuery } from "@/features/candidates/api";
import { cn } from "@/lib/utils";

type SelectedCandidateSummaryProps = {
  candidateId: string;
  className?: string;
};

type RecruiterInfo = {
  id?: string;
  name?: string;
  email?: string;
};

type CandidateWithAssignments = {
  recruiter?: RecruiterInfo | null;
  recruiterAssignments?: Array<{
    isActive?: boolean;
    recruiter?: RecruiterInfo | null;
  }>;
};

function formatPhoneDisplay(candidate: {
  countryCode?: string | null;
  mobileNumber?: string | null;
  contact?: string;
}): string {
  const code = candidate.countryCode?.trim();
  const mobile =
    candidate.mobileNumber?.trim() || candidate.contact?.trim() || "";
  if (!mobile) return "—";
  return `${code ? `${code} ` : ""}${mobile}`;
}

function resolveAssignedRecruiter(
  candidate: CandidateWithAssignments,
): RecruiterInfo | null {
  return (
    candidate.recruiter ??
    candidate.recruiterAssignments?.find((assignment) => assignment.isActive)
      ?.recruiter ??
    candidate.recruiterAssignments?.[0]?.recruiter ??
    null
  );
}

function formatGender(gender?: string | null): string {
  if (!gender?.trim()) return "—";
  const normalized = gender.trim().toLowerCase();
  if (normalized === "male" || normalized === "m") return "Male";
  if (normalized === "female" || normalized === "f") return "Female";
  if (normalized === "other") return "Other";
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
}

function formatDateOfBirth(dateOfBirth?: string | null): string {
  if (!dateOfBirth || dateOfBirth === "0001-01-01T00:00:00.000Z") return "—";
  try {
    return format(new Date(dateOfBirth), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

function getStatusBadgeClass(statusName?: string): string {
  switch (statusName?.toLowerCase()) {
    case "interested":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "untouched":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "not interested":
    case "not_interested":
      return "border-red-200 bg-red-50 text-red-700";
    case "on hold":
    case "on_hold":
      return "border-purple-200 bg-purple-50 text-purple-700";
    case "qualified":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function SummaryField({
  icon: Icon,
  label,
  value,
  subValue,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subValue?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2.5",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="truncate text-sm font-medium text-slate-800">{value}</dd>
        {subValue ? (
          <p className="truncate text-xs text-muted-foreground">{subValue}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SelectedCandidateSummary({
  candidateId,
  className,
}: SelectedCandidateSummaryProps) {
  const { data: candidate, isLoading, isError } = useGetCandidateByIdQuery(
    candidateId,
    { skip: !candidateId },
  );

  if (!candidateId) return null;

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading candidate details...
      </div>
    );
  }

  if (isError || !candidate) {
    return (
      <div
        className={cn(
          "rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive",
          className,
        )}
      >
        Unable to load candidate details. Please try selecting again.
      </div>
    );
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();
  const recruiter = resolveAssignedRecruiter(candidate);
  const statusName = candidate.currentStatus?.statusName?.trim();
  const professionLabel =
    candidate.professionType?.label?.trim() ||
    candidate.professionType?.name?.trim() ||
    "—";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-white/80 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="h-14 w-14 shrink-0 border border-slate-200 shadow-sm">
            <AvatarImage
              src={candidate.profileImage || undefined}
              alt={fullName}
            />
            <AvatarFallback className="bg-gradient-to-br from-slate-500 to-slate-600 text-sm font-semibold text-white">
              {`${candidate.firstName?.charAt(0) ?? ""}${candidate.lastName?.charAt(0) ?? ""}`.toUpperCase() ||
                "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-slate-900">{fullName}</p>
            {candidate.candidateCode ? (
              <p className="font-mono text-xs text-muted-foreground">
                {candidate.candidateCode}
              </p>
            ) : null}
            <p className="mt-1 text-sm text-muted-foreground">
              Selected for original document intake
            </p>
          </div>
        </div>
        {statusName ? (
          <Badge
            variant="outline"
            className={cn(
              "w-fit shrink-0 px-2.5 py-1 text-xs font-medium",
              getStatusBadgeClass(statusName),
            )}
          >
            {statusName}
          </Badge>
        ) : null}
      </div>

      <dl className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryField
          icon={Mail}
          label="Email"
          value={candidate.email?.trim() || "—"}
        />
        <SummaryField
          icon={Phone}
          label="Phone"
          value={formatPhoneDisplay(candidate)}
        />
        <SummaryField
          icon={Users}
          label="Gender"
          value={formatGender(candidate.gender)}
        />
        <SummaryField
          icon={Calendar}
          label="Date of Birth"
          value={formatDateOfBirth(candidate.dateOfBirth)}
        />
        <SummaryField
          icon={Briefcase}
          label="Profession"
          value={professionLabel}
        />
        <SummaryField
          icon={UserCircle2}
          label="Recruiter"
          value={recruiter?.name?.trim() || "Not assigned"}
          subValue={recruiter?.email}
          className="sm:col-span-2 lg:col-span-1"
        />
      </dl>
    </div>
  );
}
