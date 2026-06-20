import { Link } from "react-router-dom";
import { Building2, Briefcase, FolderKanban, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const quickActions = [
  {
    label: "Add New Client",
    description: "Onboard a new client into the system",
    to: "/clients",
    icon: Building2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    hoverBg: "hover:bg-emerald-50/80",
    border: "border-emerald-100",
  },
  {
    label: "Create Project",
    description: "Start a new hiring project for a client",
    to: "/projects/create",
    icon: Briefcase,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    hoverBg: "hover:bg-indigo-50/80",
    border: "border-indigo-100",
  },
  {
    label: "View All Projects",
    description: "Browse and manage all your projects",
    to: "/projects",
    icon: FolderKanban,
    color: "text-amber-600",
    bg: "bg-amber-50",
    hoverBg: "hover:bg-amber-50/80",
    border: "border-amber-100",
  },
] as const;

export default function CoordinatorQuickActions() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.to}
              to={action.to}
              className={cn(
                "group flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-sm",
                action.border,
                action.hoverBg
              )}
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  action.bg
                )}
              >
                <Icon className={cn("h-5 w-5", action.color)} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700">
                  {action.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
