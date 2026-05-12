import { lazy } from "react";
import { Navigate } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import { useAppSelector } from "@/app/hooks";
import { ROLE_NAMES } from "@/config/role-names";

const CREDashboardPage = lazy(() => import("@/pages/CREDashboardPage"));
const AdminDashboardPage = lazy(
  () => import("@/features/admin-dashboard/views/AdminDashboardPage")
);
const ProjectsPage = lazy(
  () => import("@/features/projects/views/ProjectsPage")
);
const CandidateOverviewPage = lazy(
  () => import("@/features/candidates/views/CandidateOverviewPage")
);
const DocumentVerificationPage = lazy(
  () => import("@/features/documents/views/DocumentVerificationPage")
);
const ProcessingDashboardPage = lazy(
  () => import("@/features/processing/views/ProcessingDashboardPage")
);

export function RoleBasedRedirect() {
  const { user } = useAppSelector((state) => state.auth);

  if (user?.roles.some((role) => role === "CRE")) {
    return (
      <AppLayout>
        <CREDashboardPage />
      </AppLayout>
    );
  }

  if (user?.roles.some((role) => role === "Processing Executive")) {
    return (
      <AppLayout>
        <ProcessingDashboardPage />
      </AppLayout>
    );
  }

  if (
    user?.roles.some((role) =>
      ["Recruiter", "Team Head", "Team Lead"].includes(role)
    )
  ) {
    return (
      <AppLayout>
        <CandidateOverviewPage />
      </AppLayout>
    );
  }

  if (user?.roles.some((role) => ["CEO", "Director", "Manager"].includes(role))) {
    return (
      <AppLayout>
        <AdminDashboardPage />
      </AppLayout>
    );
  }

  if (user?.roles.includes("Screening Trainer")) {
    return <Navigate to="/screenings" replace />;
  }

  if (user?.roles.includes("Interview Coordinator")) {
    return <Navigate to="/interviews" replace />;
  }

  if (user?.roles.includes("Documentation Executive")) {
    return (
      <AppLayout>
        <DocumentVerificationPage />
      </AppLayout>
    );
  }

  if (user?.roles.includes(ROLE_NAMES.AGENT_COORDINATOR)) {
    return <Navigate to="/agents" replace />;
  }

  return (
    <AppLayout>
      <ProjectsPage />
    </AppLayout>
  );
}
