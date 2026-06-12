import { useLocation } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { isAgentCoordinatorRole, isOperationsRole } from "@/config/role-names";
import { PROJECT_COORDINATOR_ROLE } from "@/config/role-capabilities";
import TypedHeader from "@/components/molecules/TypedHeader";

const ADMIN_PANEL_ROLES = new Set([
  "CEO",
  "Director",
  "Manager",
  "System Admin",
]);

const PROJECT_COORDINATOR_HOME_PATHS = new Set([
  "/",
  "/project-coordinator/dashboard",
]);

const RECRUITER_MANAGER_HOME_PATHS = new Set([
  "/",
  "/dashboard",
  "/operations-dashboard",
  "/cre-dashboard",
  "/candidates/overview",
]);

const PROCESSING_MANAGER_HOME_PATHS = new Set(["/", "/processing-admin"]);

const ADMIN_PANEL_HOME_PATHS = new Set([
  "/",
  "/dashboard",
  "/operations-dashboard",
  "/cre-dashboard",
]);

const RECRUITER_HOME_ROLES = new Set(["Recruiter", "Team Head", "Team Lead"]);

export type DashboardWelcomeHeaderProps = {
  userName?: string;
  subtitle?: string;
  className?: string;
};

/** Normalize pathname for route checks (no trailing slash). */
export function normalizeDashboardPath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * Welcome banner (TypedHeader) is shown only on each role's home dashboard —
 * not on cross-module pages (interviews, processing, documents, screenings)
 * when visited by admin / manager / recruiter manager / processing manager.
 */
export function shouldShowDashboardWelcomeHeader(
  pathname: string,
  roles: string[],
): boolean {
  const path = normalizeDashboardPath(pathname);

  if (roles.includes(PROJECT_COORDINATOR_ROLE)) {
    return PROJECT_COORDINATOR_HOME_PATHS.has(path);
  }

  if (roles.includes("Processing Manager")) {
    return PROCESSING_MANAGER_HOME_PATHS.has(path);
  }

  if (roles.includes("Recruiter Manager")) {
    return RECRUITER_MANAGER_HOME_PATHS.has(path);
  }

  if (roles.some((role) => ADMIN_PANEL_ROLES.has(role))) {
    return ADMIN_PANEL_HOME_PATHS.has(path);
  }

  if (roles.some(isOperationsRole)) {
    return (
      path === "/" ||
      path === "/operations-dashboard" ||
      path === "/cre-dashboard"
    );
  }

  if (roles.some((role) => RECRUITER_HOME_ROLES.has(role))) {
    return path === "/" || path === "/candidates/overview";
  }

  if (roles.includes("Interview Coordinator")) {
    return path === "/" || path === "/interviews";
  }

  if (roles.includes("Documents Control Executive")) {
    return path === "/" || path === "/original-documents";
  }

  if (roles.includes("Documentation Executive")) {
    return path === "/" || path === "/documents/verification";
  }

  if (roles.includes("Processing Executive")) {
    return path === "/" || path === "/processing-dashboard";
  }

  if (roles.includes("Screening Trainer")) {
    return path === "/" || path === "/screenings";
  }

  if (roles.some(isAgentCoordinatorRole)) {
    return path === "/" || path === "/agents";
  }

  return path === "/dashboard";
}

export default function DashboardWelcomeHeader({
  userName,
  subtitle,
  className,
}: DashboardWelcomeHeaderProps) {
  const { pathname } = useLocation();
  const roles = useAppSelector((state) => state.auth.user?.roles) ?? [];

  if (!shouldShowDashboardWelcomeHeader(pathname, roles)) {
    return null;
  }

  return (
    <TypedHeader
      userName={userName}
      subtitle={subtitle}
      className={className}
    />
  );
}
