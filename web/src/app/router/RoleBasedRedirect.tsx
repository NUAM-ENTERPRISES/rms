import { lazy } from "react";
import { Navigate } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import { useAppSelector } from "@/app/hooks";
import { isAgentCoordinatorRole, isOperationsRole, ROLE_NAMES } from "@/config/role-names";

const ProjectCoordinatorDashboardPage = lazy(
  () => import("@/features/project-coordinator-dashboard/views/ProjectCoordinatorDashboardPage")
);

const OperationsDashboardPage = lazy(() => import("@/pages/OperationsDashboardPage"));
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

  if (user?.roles.some((role) => isOperationsRole(role))) {
    return (
      <AppLayout>
        <OperationsDashboardPage />
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

  if (user?.roles.some((role) => role === "Processing Manager")) {
    return <Navigate to="/processing-admin" replace />;
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

  if (
    user?.roles.some((role) =>
      ["CEO", "Director", "Manager", "Recruiter Manager"].includes(role)
    )
  ) {
    return (
      <AppLayout>
        <AdminDashboardPage />
      </AppLayout>
    );
  }

  if (user?.roles.includes(ROLE_NAMES.PROJECT_COORDINATOR)) {
    return (
      <AppLayout>
        <ProjectCoordinatorDashboardPage />
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

  if (user?.roles.includes("Documents Control Executive")) {
    return <Navigate to="/original-documents" replace />;
  }

  if (user?.permissions.includes("read:original_document_intake")) {
    return <Navigate to="/original-documents" replace />;
  }

  if (user?.permissions.includes("read:courier_management")) {
    return <Navigate to="/courier-management" replace />;
  }

  if (user?.roles.some(isAgentCoordinatorRole)) {
    return <Navigate to="/agents" replace />;
  }

  return (
    <AppLayout>
      <ProjectsPage />
    </AppLayout>
  );
}
