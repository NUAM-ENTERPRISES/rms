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
} from "lucide-react";

interface ProjectInfoCardProps {
  project: {
    id: string;
    title: string;
    description?: string | null;
    country?: string | null;
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

  return (
    <Card className="border-0 shadow-xl overflow-hidden bg-white h-fit">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-100 py-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          Project & Role
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Project Info - Compact */}
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-blue-600 font-bold uppercase">Project</p>
              <h3 className="text-sm font-black text-slate-900 truncate">{project.title}</h3>
              {project.country && (
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Globe className="h-3 w-3" /> {typeof project.country === 'object' ? project.country.name : project.country}
                </p>
              )}
            </div>
            {role.priority && (
              <Badge className={`text-[10px] px-1.5 py-0 ${getPriorityBadge(role.priority)}`}>
                {role.priority}
              </Badge>
            )}
          </div>
        </div>

        {/* Role Info - Compact Grid */}
        <div className="grid grid-cols-2 gap-2">
          <RoleInfoItem icon={<Briefcase className="h-3 w-3 text-violet-500" />} label="Role" value={role.designation} />
          <RoleInfoItem icon={<Users className="h-3 w-3 text-blue-500" />} label="Openings" value={role.quantity ? `${role.quantity}` : "N/A"} />
          <RoleInfoItem icon={<Clock className="h-3 w-3 text-amber-500" />} label="Exp" value={role.minExperience !== undefined ? `${role.minExperience}-${role.maxExperience}y` : "N/A"} />
          <RoleInfoItem icon={<Plane className="h-3 w-3 text-emerald-500" />} label="Visa" value={role.visaType || "N/A"} capitalize />
        </div>

        {/* Status - Compact */}
        {(mainStatus || subStatus) && (
          <div className="flex gap-2">
            {mainStatus && (
              <div className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="text-[10px] font-bold text-slate-800 truncate">{mainStatus.label}</span>
              </div>
            )}
            {subStatus && (
              <div className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-blue-50 border border-blue-100">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold text-blue-800 truncate">{subStatus.label}</span>
              </div>
            )}
          </div>
        )}

        {/* Requirements & Benefits - Compact Icons */}
        <div className="flex gap-3 justify-between">
          <div className="flex gap-1.5">
            <IconChip icon={<Shield className="h-3 w-3" />} active={role.backgroundCheckRequired} title="Background Check" />
            <IconChip icon={<HeartPulse className="h-3 w-3" />} active={role.drugScreeningRequired} title="Drug Screening" />
          </div>
          <div className="flex gap-1.5">
            <IconChip icon={<Home className="h-3 w-3" />} active={role.accommodation} title="Accommodation" color="emerald" />
            <IconChip icon={<UtensilsCrossed className="h-3 w-3" />} active={role.food} title="Food" color="emerald" />
            <IconChip icon={<Car className="h-3 w-3" />} active={role.transport} title="Transport" color="emerald" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleInfoItem({ icon, label, value, capitalize = false }: { icon: React.ReactNode; label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
      <div className="flex items-center gap-1 text-slate-400 mb-0.5">
        {icon}
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      <p className={`text-xs font-bold text-slate-800 truncate ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

function IconChip({ icon, active, title, color = "rose" }: { icon: React.ReactNode; active?: boolean; title: string; color?: "rose" | "emerald" }) {
  const colorClasses = color === "emerald" 
    ? active ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
    : active ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400";
  
  return (
    <div className={`p-1.5 rounded-md ${colorClasses}`} title={title}>
      {icon}
    </div>
  );
}
