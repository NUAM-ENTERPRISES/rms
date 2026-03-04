import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Briefcase,
  Users,
  Clock,
  Plane,
  Shield,
  HeartPulse,
  Globe,
  Home,
  UtensilsCrossed,
  Car,
  Calendar,
  User,
  FileEdit,
  Eye,
  EyeOff,
  Sparkles,
  ClipboardCheck,
  Target,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import React from "react";
import { cn } from "@/lib/utils";
interface ProjectInfoCardProps {
  project: {
    id: string;
    title: string;
    description?: string | null;
    deadline?: string | null;
    status?: string;
    priority?: string;
    projectType?: string;
    resumeEditable?: boolean;
    groomingRequired?: string | null;
    hideContactInfo?: boolean;
    requiredScreening?: boolean;
    minAge?: number;
    maxAge?: number;
    genderRequirement?: string;
    country?: {
      code: string;
      name: string;
      region?: string;
      flag?: string;
      flagName?: string;
    } | string | null;
    client?: {
      id: string;
      name: string;
    } | null;
    creator?: {
      id: string;
      name: string;
      email?: string;
    } | null;
  };
  role: {
    id: string;
    designation: string;
    quantity?: number;
    priority?: string;
    minExperience?: number;
    maxExperience?: number;
    employmentType?: string;
    visaType?: string;
    backgroundCheckRequired?: boolean;
    drugScreeningRequired?: boolean;
    genderRequirement?: string;
    minAge?: number;
    maxAge?: number;
    accommodation?: boolean;
    food?: boolean;
    transport?: boolean;
    salaryRange?: string | null;
    roleCatalog?: {
      id: string;
      name: string;
      label: string;
      shortName?: string;
      description?: string;
    };
  };
  mainStatus?: {
    label: string;
    color?: string;
  };
  subStatus?: {
    label: string;
  };
}

export function ProjectInfoCard({ project, role, mainStatus, subStatus }: ProjectInfoCardProps) {
  const getPriorityBadge = (priority?: string) => {
    const styles: Record<string, string> = {
      high: "bg-rose-100 text-rose-700",
      medium: "bg-amber-100 text-amber-700",
      low: "bg-slate-100 text-slate-600",
    };
    return styles[priority || "medium"] || styles.medium;
  };

  const getStatusBadge = (status?: string) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700",
      inactive: "bg-slate-100 text-slate-600",
      completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-rose-100 text-rose-700",
    };
    return styles[status || "active"] || styles.active;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatGenderRequirement = (gender?: string) => {
    if (!gender || gender === "all") return "All Genders";
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  const formatGrooming = (grooming?: string | null) => {
    if (!grooming) return "Not Required";
    return grooming.charAt(0).toUpperCase() + grooming.slice(1);
  };

  return (
  <Card className="min-h-[950px] border-0 shadow-xl overflow-hidden bg-white dark:bg-black">
  <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/30 border-b border-slate-100 dark:border-slate-800 py-3">
    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/50">
        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>
      Project Details
    </CardTitle>
  </CardHeader>

  <CardContent className="p-4 space-y-4 bg-white dark:bg-black">
    {/* Project Header with Large Flag */}
    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800/50">
      <div className="flex items-start gap-4">
        {/* Large Country Flag */}
        {project.country && typeof project.country === 'object' && project.country.flag && (
          <div className="flex-shrink-0 flex flex-col items-center gap-2 bg-white dark:bg-slate-900 rounded-xl p-3 border-2 border-blue-300 dark:border-blue-700 shadow-lg">
            <div className="text-5xl leading-none drop-shadow-sm">{project.country.flag}</div>
            <div className="text-center">
              <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                {project.country.name}
              </p>
              {project.country.region && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{project.country.region}</p>
              )}
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide">Project</p>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{project.title}</h3>
            </div>
            <div className="flex flex-col gap-1">
              {project.status && (
                <Badge className={`text-[10px] px-2 py-0.5 ${getStatusBadge(project.status)}`}>
                  {project.status}
                </Badge>
              )}
              {project.priority && (
                <Badge className={`text-[10px] px-2 py-0.5 ${getPriorityBadge(project.priority)}`}>
                  {project.priority}
                </Badge>
              )}
            </div>
          </div>

          {/* Project Type & Deadline */}
          <div className="flex flex-wrap gap-2 text-[10px]">
            {project.projectType && (
              <span className="flex items-center gap-1 bg-white dark:bg-slate-900/80 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                <Target className="h-3 w-3 text-violet-500 dark:text-violet-400" />
                <span className="capitalize font-medium text-slate-800 dark:text-slate-200">{project.projectType}</span>
              </span>
            )}
            {project.deadline && (
              <span className="flex items-center gap-1 bg-white dark:bg-slate-900/80 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                <Calendar className="h-3 w-3 text-rose-500 dark:text-rose-400" />
                <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(project.deadline)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Project Settings Grid */}
    <div className="grid grid-cols-2 gap-2">
      <ProjectInfoItem 
        icon={<User className="h-3 w-3 text-blue-500 dark:text-blue-400" />} 
        label="Age Range" 
        value={project.minAge || project.maxAge ? `${project.minAge || '18'} - ${project.maxAge || '60'} years` : "Any"} 
      />
      <ProjectInfoItem 
        icon={<Users className="h-3 w-3 text-violet-500 dark:text-violet-400" />} 
        label="Gender" 
        value={formatGenderRequirement(project.genderRequirement)} 
      />
      <ProjectInfoItem 
        icon={<Sparkles className="h-3 w-3 text-pink-500 dark:text-pink-400" />} 
        label="Grooming" 
        value={formatGrooming(project.groomingRequired)} 
      />
      <ProjectInfoItem 
        icon={<ClipboardCheck className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />} 
        label="Screening" 
        value={project.requiredScreening ? "Required" : "Not Required"} 
      />
    </div>

    {/* Project Flags */}
    <div className="flex flex-wrap gap-2">
      <FlagChip 
        icon={<FileEdit className="h-3 w-3" />} 
        label="Resume Editable" 
        active={project.resumeEditable} 
      />
      <FlagChip 
        icon={project.hideContactInfo ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} 
        label="Contact Hidden" 
        active={project.hideContactInfo} 
      />
    </div>

    {/* Creator Info */}
    {(project.creator || project.client) && (
      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {project.creator && (
            <div className="flex-1">
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Created By</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{project.creator.name}</p>
            </div>
          )}
          {project.client && (
            <div className="flex-1">
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Client</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{project.client.name}</p>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Divider */}
    <div className="border-t border-dashed border-slate-200 dark:border-slate-800" />

    {/* Role Section */}
    <div>
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
        <Briefcase className="h-3 w-3 text-violet-500 dark:text-violet-400" /> Role Details
      </h4>
      
      <div className="grid grid-cols-2 gap-2">
        <RoleInfoItem 
          icon={<Briefcase className="h-3 w-3 text-violet-500 dark:text-violet-400" />} 
          label="Role" 
          value={role.designation} 
        />
        <RoleInfoItem 
          icon={<Users className="h-3 w-3 text-blue-500 dark:text-blue-400" />} 
          label="Openings" 
          value={role.quantity ? `${role.quantity}` : "N/A"} 
        />
        <RoleInfoItem 
          icon={<Clock className="h-3 w-3 text-amber-500 dark:text-amber-400" />} 
          label="Experience" 
          value={role.minExperience !== undefined ? `${role.minExperience}-${role.maxExperience} years` : "N/A"} 
        />
        <RoleInfoItem 
          icon={<Plane className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />} 
          label="Visa Type" 
          value={role.visaType || "N/A"} 
          capitalize 
        />
      </div>
    </div>

    {/* Status - Compact */}
    {(mainStatus || subStatus) && (
      <div className="flex gap-2">
        {mainStatus && (
          <div className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <div className="h-2 w-2 rounded-full bg-orange-500 dark:bg-orange-600" />
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">{mainStatus.label}</span>
          </div>
        )}
        {subStatus && (
          <div className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800/50">
            <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-600" />
            <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 truncate">{subStatus.label}</span>
          </div>
        )}
      </div>
    )}

    {/* Requirements & Benefits */}
    <div className="flex gap-3 justify-between">
      <div className="flex gap-1.5">
        <IconChip 
          icon={<Shield className="h-3 w-3" />} 
          active={role.backgroundCheckRequired} 
          title="Background Check" 
          tooltipText={role.backgroundCheckRequired ? "Background check required" : "Background check not required"} 
        />
        <IconChip 
          icon={<HeartPulse className="h-3 w-3" />} 
          active={role.drugScreeningRequired} 
          title="Drug Screening" 
          tooltipText={role.drugScreeningRequired ? "Drug screening required" : "Drug screening not required"} 
        />
      </div>
      <div className="flex gap-1.5">
        <IconChip 
          icon={<Home className="h-3 w-3" />} 
          active={role.accommodation} 
          title="Accommodation" 
          color="emerald" 
          tooltipText={role.accommodation ? "Accommodation provided" : "Accommodation not provided"} 
        />
        <IconChip 
          icon={<UtensilsCrossed className="h-3 w-3" />} 
          active={role.food} 
          title="Food" 
          color="emerald" 
          tooltipText={role.food ? "Food provided" : "Food not provided"} 
        />
        <IconChip 
          icon={<Car className="h-3 w-3" />} 
          active={role.transport} 
          title="Transport" 
          color="emerald" 
          tooltipText={role.transport ? "Transport provided" : "Transport not provided"} 
        />
      </div>
    </div>
  </CardContent>
</Card>
  );
}

function ProjectInfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement, {
              className: cn(
                "h-3.5 w-3.5",
                (icon as React.ReactElement).props.className || "",
                "text-slate-500 dark:text-slate-400"
              )
            })
          : icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-snug">
        {value || "—"}
      </p>
    </div>
  );
}

function RoleInfoItem({ icon, label, value, capitalize = false }: { icon: React.ReactNode; label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="p-2 rounded-lg bg-violet-50/50 dark:bg-slate-900 border border-violet-100 dark:border-slate-700">
      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-400 mb-0.5">
        {icon}
        <span className="text-[10px] font-bold uppercase text-slate-800 dark:text-slate-200">{label}</span>
      </div>
      <p className={`text-xs font-bold truncate ${capitalize ? "capitalize" : ""} text-slate-800 dark:text-slate-100`}>{value}</p>
    </div>
  );
}

function FlagChip({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold ${
      active 
        ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
        : "bg-slate-100 text-slate-500 border border-slate-200"
    }`}>
      {icon}
      <span>{label}</span>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
    </div>
  );
}

function IconChip({ icon, active, title, color = "rose", tooltipText }: { icon: React.ReactNode; active?: boolean; title: string; color?: "rose" | "emerald"; tooltipText?: string }) {
  const colorClasses = color === "emerald" 
    ? active ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
    : active ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400";

  const content = (
    <div className={`p-1.5 rounded-md ${colorClasses}`} aria-label={title}>
      {icon}
    </div>
  );

  if (tooltipText) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Fallback: use native title attribute for very small hints
  return (
    <div className={`p-1.5 rounded-md ${colorClasses}`} title={title} aria-label={title}>
      {icon}
    </div>
  );
}
