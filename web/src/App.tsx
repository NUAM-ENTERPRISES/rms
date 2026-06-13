import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import AuthProvider from "@/app/providers/auth-provider";
import NotificationsSocketProvider from "@/app/providers/notifications-socket.provider";
import { RNRReminderProvider } from "@/app/providers/rnr-reminder.provider";
import { CallbackReminderProvider } from "@/app/providers/callback-reminder.provider";
import { ProcessingReminderProvider } from "@/app/providers/processing-reminder.provider";
import ProtectedRoute from "@/app/router/protected-route";
import { RoleBasedRedirect } from "@/app/router/RoleBasedRedirect";
import RouteErrorBoundary from "@/components/atoms/RouteErrorBoundary";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import AppLayout from "@/layout/AppLayout";
import CandidateProjectDetailsPage from "@/features/candidates/views/CandidateProjectDetailsPage";
import { ROLE_NAMES, LEGACY_CRE_ROLE_NAME } from "@/config/role-names";

// Lazy load pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const OperationsDashboardPage = lazy(() => import("@/pages/OperationsDashboardPage"));
const AdminDashboardPage = lazy(
  () => import("@/features/admin-dashboard/views/AdminDashboardPage")
);
const ProjectCoordinatorDashboardPage = lazy(
  () =>
    import(
      "@/features/project-coordinator-dashboard/views/ProjectCoordinatorDashboardPage"
    )
);

// Feature-based views
const ProjectsPage = lazy(
  () => import("@/features/projects/views/ProjectsPage")
);
const CreateProjectPage = lazy(
  () => import("@/features/projects/views/MultiStepCreateProjectPage")
);
const EditProjectPage = lazy(
  () => import("@/features/projects/views/MultiStepEditProjectPage")
);
const ProjectDetailPage = lazy(
  () => import("@/features/projects/views/ProjectDetailPage")
);
const ProjectEligibleCandidatesPage = lazy(
  () => import("@/features/projects/views/ProjectEligibleCandidatesPage")
);

const CandidatesPage = lazy(
  () => import("@/features/candidates/views/CandidatesPage")
);
const CreateCandidatePage = lazy(
  () => import("@/features/candidates/views/CreateCandidatePage")
);
const EditCandidatePage = lazy(
  () => import("@/features/candidates/views/EditCandidatePage")
);
const CandidateDetailPage = lazy(
  () => import("@/features/candidates/views/CandidateDetailPage")
);
const CandidateNominationPage = lazy(
  () => import("@/features/candidates/views/CandidateNominationPage")
);
const ProjectCandidatesOverviewPage = lazy(
  () => import("@/features/candidates/views/ProjectCandidatesOverviewPage")
);
const CandidateOverviewPage = lazy(
  () => import("@/features/candidates/views/CandidateOverviewPage")
);
const CandidateProjectWorkflowPage = lazy(
  () => import("@/features/candidates/views/CandidateProjectWorkflowPage")
);
const CandidateDocumentationWorkflowPage = lazy(
  () => import("@/features/candidates/views/CandidateDocumentationWorkflowPage")
);
const CandidateInterviewWorkflowPage = lazy(
  () => import("@/features/candidates/views/CandidateInterviewWorkflowPage")
);
const CandidateScreeningWorkflowPage = lazy(
  () => import("@/features/candidates/views/CandidateScreeningWorkflowPage")
);
const CandidateProcessingWorkflowPage = lazy(
  () => import("@/features/candidates/views/CandidateProcessingWorkflowPage")
);
const RecruiterAnalyticsPage = lazy(
  () => import("@/features/analytics/pages/RecruiterAnalyticsPage")
);
const PublicLeadRegistrationPage = lazy(
  () => import("@/features/candidates/views/PublicLeadRegistrationPage")
);


const TeamsPage = lazy(() => import("@/features/teams/views/TeamsPage"));
const CreateTeamPage = lazy(
  () => import("@/features/teams/views/CreateTeamPage")
);
const EditTeamPage = lazy(() => import("@/features/teams/views/EditTeamPage"));
const TeamDetailPage = lazy(
  () => import("@/features/teams/views/TeamDetailPage")
);

const ClientsPage = lazy(() => import("@/features/clients/views/ClientsPage"));
const ClientDetailPage = lazy(
  () => import("@/features/clients/views/ClientDetailPage")
);
const CreateClientPage = lazy(
  () => import("@/features/clients/views/CreateClientPage")
);
const EditClientPage = lazy(
  () => import("@/features/clients/views/EditClientPage")
);

const AgentsPage = lazy(() => import("@/features/agents/views/AgentsPage"));
const AgentDetailsPage = lazy(() => import("@/features/agents/views/AgentDetailsPage"));

const InterviewsPage = lazy(
  () => import("@/features/interviews/views/InterviewsPage")
);
const MyInterviewsListPage = lazy(
  () => import("@/features/interviews/views/MyInterviewsListPage")
);
const AssignedInterviewsListPage = lazy(
  () => import("@/features/interviews/views/AssignedInterviewsListPage")
);
const ShortlistingListPage = lazy(
  () => import("@/features/interviews/views/ShortlistingListPage")
);
const ShortlistedCandidatesPage = lazy(
  () => import("@/features/interviews/views/ShortlistedCandidatesPage")
);
const NotShortlistedCandidatesPage = lazy(
  () => import("@/features/interviews/views/NotShortlistedCandidatesPage")
);
const UpcomingInterviewsListPage = lazy(
  () => import("@/features/interviews/views/UpcomingInterviewsListPage")
);
const PassedCandidatesPage = lazy(
  () => import("@/features/interviews/views/PassedCandidatesPage")
);

const InterviewDetailPage = lazy(
  () => import("@/features/interviews/views/InterviewDetailPage")
);

// Mock Interview Coordination
const ScreeningsDashboardPage = lazy(
  () =>
    import(
      "@/features/screening-coordination/interviews/views/ScreeningsDashboardPage"
    )
);

const ScreeningsListPage = lazy(
  () => import("@/features/screening-coordination/interviews/views/ScreeningsListPage")
);

const RecruiterDocsPage = lazy(
  () => import("@/features/recruiter-docs/views/RecruiterDocsPage")
);

const RecruiterDocsDetailPage = lazy(
  () => import("@/features/recruiter-docs/views/RecruiterDocsDetailPage")
);

const UpcomingScreeningsListPage = lazy(
  () =>
    import(
      "@/features/screening-coordination/interviews/views/UpcomingScreeningsListPage"
    )
);

const AssignedScreeningsListPage = lazy(
  () =>
    import(
      "@/features/screening-coordination/interviews/views/AssignedScreeningsListPage"
    )
);

const ScreeningDetailsPage = lazy(
  () =>
    import(
      "@/features/screening-coordination/interviews/views/ScreeningDetailsPage"
    )
);

const TemplatesPage = lazy(() => import("@/features/screening-coordination/templates/views/TemplatesPage"));
const TemplateDetailPage = lazy(
  () =>
    import(
      "@/features/screening-coordination/templates/views/TemplateDetailPage"
    )
);
const TrainingListPage = lazy(
  () =>
    import(
      "@/features/screening-coordination/training/views/TrainingListPage"
    )
);
const TrainingDetailPage = lazy(
  () =>
    import(
      "@/features/screening-coordination/training/views/TrainingDetailPage"
    )
);
const ConductTrainingPage = lazy(
  () =>
    import(
      "@/features/screening-coordination/training/views/ConductTrainingPage"
    )
);
const BasicTrainingPage = lazy(
  () =>
    import(
      "@/features/screening-coordination/training/views/BasicTrainingPage"
    )
);
const ConductScreeningPage = lazy(
  () =>
    import(
      "@/features/screening-coordination/interviews/views/ConductScreeningPage"
    )
);
// ScreeningPage removed — not used

const DocumentUploadPage = lazy(
  () => import("@/features/documents/views/DocumentUploadPage")
);
const DocumentVerificationPage = lazy(
  () => import("@/features/documents/views/DocumentVerificationPage")
);
const CandidateDocumentVerificationPage = lazy(
  () => import("@/features/documents/views/CandidateDocumentVerificationPage")
);

const UsersPage = lazy(() => import("@/features/admin/views/UsersPage"));
const UserDetailPage = lazy(
  () => import("@/features/admin/views/UserDetailPage")
);
const CreateUserPage = lazy(
  () => import("@/features/admin/views/CreateUserPage")
);
const EditUserPage = lazy(() => import("@/features/admin/views/EditUserPage"));
const SystemSettingsPage = lazy(
  () => import("@/features/admin/views/SystemSettingsPage")
);
const SessionsMonitoringPage = lazy(
  () => import("@/features/admin/views/SessionsMonitoringPage")
);

const NotificationsPage = lazy(
  () => import("@/features/notifications/views/NotificationsPage")
);
const ProfilePage = lazy(() => import("@/features/profile/views/ProfilePage"));
const ProcessingDashboardPage = lazy(
  () => import("@/features/processing/views/ProcessingDashboardPage")
);
const ProcessingCandidateDetailsPage = lazy(
  () => import("@/features/processing/views/ProcessingCandidateDetailsPage")
);
const ProcessingAdminDashboardPage = lazy(
  () => import("@/features/processing/views/ProcessingAdminDashboardPage")
);
const DocumentVerificationDashboard = lazy(
  () => import("@/pages/DocumentVerificationDashboard")
);
const OriginalDocumentsRegisterPage = lazy(
  () =>
    import(
      "@/features/original-document-collections/views/OriginalDocumentsRegisterPage"
    )
);
const CreateCollectionPage = lazy(
  () =>
    import(
      "@/features/original-document-collections/views/CreateCollectionPage"
    )
);
const CollectionDetailPage = lazy(
  () =>
    import(
      "@/features/original-document-collections/views/CollectionDetailPage"
    )
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationsSocketProvider>
          <RNRReminderProvider>
            <CallbackReminderProvider>
            <ProcessingReminderProvider>
              <div className="min-h-screen bg-background">
                  <Suspense fallback={<LoadingScreen />}>
                  <Routes>
                  {/* Public routes */}
                  <Route
                    path="/login"
                    element={
                      <RouteErrorBoundary>
                        <LoginPage />
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/register/:shortCode"
                    element={
                      <RouteErrorBoundary>
                        <PublicLeadRegistrationPage />
                      </RouteErrorBoundary>
                    }
                  />

                  {/* Protected routes with AppLayout */}
                  <Route
                    path="/dashboard"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute roles={["CEO", "Director", "Manager", "Recruiter Manager"]}>
                          <AppLayout>
                            <AdminDashboardPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/project-coordinator/dashboard"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute roles={[ROLE_NAMES.PROJECT_COORDINATOR]}>
                          <AppLayout>
                            <ProjectCoordinatorDashboardPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  {/* Operations Dashboard */}
                  <Route
                    path="/operations-dashboard"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute roles={[ROLE_NAMES.OPERATIONS, LEGACY_CRE_ROLE_NAME]}>
                          <AppLayout>
                            <OperationsDashboardPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/cre-dashboard"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute roles={[ROLE_NAMES.OPERATIONS, LEGACY_CRE_ROLE_NAME]}>
                          <AppLayout>
                            <OperationsDashboardPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/processing-dashboard"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute roles={["Processing Executive"]}>
                          <AppLayout>
                            <ProcessingDashboardPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/processing-admin"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          roles={[
                            "CEO",
                            "Director",
                            "Manager",
                            "System Admin",
                            "Processing Manager",
                          ]}
                        >
                          <AppLayout>
                            <ProcessingAdminDashboardPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/projects"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <ProjectsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/projects/overview"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <ProjectCandidatesOverviewPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/projects/create"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["manage:projects"]}>
                          <AppLayout>
                            <CreateProjectPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/projects/:projectId/edit"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["manage:projects"]}>
                          <AppLayout>
                            <EditProjectPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/projects/:projectId"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <ProjectDetailPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/recruiter-docs"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          matchRolesOrPermissions
                          roles={["Recruiter", "System Admin", ROLE_NAMES.AGENT_COORDINATOR]}
                          permissions={["nominate:candidates"]}
                        >
                          <AppLayout>
                            <RecruiterDocsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/recruiter-docs/:projectId"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          matchRolesOrPermissions
                          roles={["Recruiter", "System Admin", ROLE_NAMES.AGENT_COORDINATOR]}
                          permissions={["nominate:candidates"]}
                        >
                          <AppLayout>
                            <RecruiterDocsDetailPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  {/* Support direct link to a specific candidate within project (many places navigate to /recruiter-docs/:projectId/:candidateId) */}
                  <Route
                    path="/recruiter-docs/:projectId/:candidateId"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          matchRolesOrPermissions
                          roles={["Recruiter", "System Admin", ROLE_NAMES.AGENT_COORDINATOR]}
                          permissions={["nominate:candidates"]}
                        >
                          <AppLayout>
                            <RecruiterDocsDetailPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidates"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <CandidatesPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidates/overview"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <CandidateOverviewPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidates/create"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["write:candidates"]}>
                          <AppLayout>
                            <CreateCandidatePage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidates/:id/edit"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["write:candidates"]}>
                          <AppLayout>
                            <EditCandidatePage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidates/:id"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          matchRolesOrPermissions
                          roles={["Recruiter Manager"]}
                          permissions={[
                            "read:candidates",
                            "read:assigned_candidates",
                          ]}
                        >
                          <AppLayout>
                            <CandidateDetailPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidates/:id/documentation-workflow"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <CandidateDocumentationWorkflowPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidates/:id/interview-workflow"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <CandidateInterviewWorkflowPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidates/:id/screening-workflow"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <CandidateScreeningWorkflowPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidates/:id/processing-workflow"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <CandidateProcessingWorkflowPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidates/:candidateId/workflow-details"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <CandidateProjectWorkflowPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidate-project/:candidateId/projects/:projectId"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <CandidateProjectDetailsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/analytics/recruiter"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute roles={["CEO", "Director", "Manager", "Recruiter Manager"]}>
                          <AppLayout>
                            <RecruiterAnalyticsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/teams"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <TeamsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/teams/create"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["manage:teams"]}>
                          <AppLayout>
                            <CreateTeamPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/teams/:teamId"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <TeamDetailPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/teams/:teamId/edit"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["manage:teams"]}>
                          <AppLayout>
                            <EditTeamPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/interviews"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:interviews"]}>
                          <AppLayout>
                            <InterviewsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/interviews/list"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:interviews"]}>
                          <AppLayout>
                            <MyInterviewsListPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/interviews/assigned"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:interviews"]}>
                          <AppLayout>
                            <AssignedInterviewsListPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/interviews/shortlisting"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:interviews"]}>
                          <AppLayout>
                            <ShortlistingListPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/interviews/shortlisted"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:interviews"]}>
                          <AppLayout>
                            <ShortlistedCandidatesPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/interviews/not-shortlisted"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:interviews"]}>
                          <AppLayout>
                            <NotShortlistedCandidatesPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/interviews/upcoming"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:interviews"]}>
                          <AppLayout>
                            <UpcomingInterviewsListPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/interviews/detail/:id"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:interviews"]}>
                          <AppLayout>
                            <InterviewDetailPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/ready-for-processing"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          matchRolesOrPermissions
                          roles={[
                            "CEO",
                            "Director",
                            "Manager",
                            "System Admin",
                            "Processing Manager",
                            "Admin",
                          ]}
                          permissions={["read:processing"]}
                        >
                          <AppLayout>
                            <PassedCandidatesPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  {/* Screening Coordination Routes */}
                  <Route
                    path="/screenings"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:screenings"]}>
                          <AppLayout>
                            <ScreeningsDashboardPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/screenings/list"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:screenings"]}>
                          <AppLayout>
                            <ScreeningsListPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/screenings/assigned"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:screenings"]}>
                          <AppLayout>
                            <AssignedScreeningsListPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/screenings/upcoming"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:screenings"]}>
                          <AppLayout>
                            <UpcomingScreeningsListPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/screenings/:id"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:screenings"]}>
                          <AppLayout>
                            <ScreeningDetailsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/screenings/templates"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          permissions={["read:interview_templates"]}
                        >
                          <AppLayout>
                            <TemplatesPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/screenings/templates/:templateId"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          permissions={["read:interview_templates"]}
                        >
                          <AppLayout>
                            <TemplateDetailPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/screenings/training"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:training"]}>
                          <AppLayout>
                            <TrainingListPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/screenings/training/:id"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:training"]}>
                          <AppLayout>
                            <TrainingDetailPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/screening-coordination/training/conduct"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["write:training"]}>
                          <AppLayout>
                            <ConductTrainingPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  {/* /screenings/screening route removed */}

                  <Route
                    path="/screenings/:interviewId/conduct"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          permissions={["conduct:screenings"]}
                        >
                          <AppLayout>
                            <ConductScreeningPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/basic-training"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:training"]}>
                          <AppLayout>
                            <BasicTrainingPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/notifications"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <div className="p-8">
                              <h1 className="text-2xl font-bold">
                                Notifications
                              </h1>
                              <p className="text-muted-foreground">
                                Stay updated on important updates and
                                assignments
                              </p>
                            </div>
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/profile"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <ProfilePage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/clients"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <ClientsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/clients/create"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["manage:clients"]}>
                          <AppLayout>
                            <CreateClientPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/clients/:id/edit"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["manage:clients"]}>
                          <AppLayout>
                            <EditClientPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/clients/:id"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <ClientDetailPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/documents/upload"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["write:documents"]}>
                          <AppLayout>
                            <DocumentUploadPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/documents/verification"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:documents"]}>
                          <AppLayout>
                            <DocumentVerificationPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/original-documents"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:documents"]}>
                          <AppLayout>
                            <OriginalDocumentsRegisterPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/original-documents/new"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["write:documents"]}>
                          <AppLayout>
                            <CreateCollectionPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/original-documents/:id"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:documents"]}>
                          <AppLayout>
                            <CollectionDetailPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/processingCandidateDetails/:candidateId"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:processing"]}>
                          <AppLayout>
                            <ProcessingCandidateDetailsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/candidates/:candidateId/documents/:projectId"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["verify:documents"]}>
                          <AppLayout>
                            <CandidateDocumentVerificationPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/projects/:projectId/nominate"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["nominate:candidates"]}>
                          <AppLayout>
                            <CandidateNominationPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/projects/:projectId/candidates"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <ProjectEligibleCandidatesPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/agents"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:agents"]}>
                          <AppLayout>
                            <AgentsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/agents/:id"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:agents"]}>
                          <AppLayout>
                            <AgentDetailsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/analytics"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:analytics"]}>
                          <AppLayout>
                            <div className="p-8">
                              <h1 className="text-2xl font-bold">Analytics</h1>
                              <p className="text-muted-foreground">
                                Analytics and reporting page
                              </p>
                            </div>
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/settings"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute permissions={["read:settings"]}>
                          <AppLayout>
                            <div className="p-8">
                              <h1 className="text-2xl font-bold">Settings</h1>
                              <p className="text-muted-foreground">
                                Application settings page
                              </p>
                            </div>
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/admin/sessions"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          roles={["CEO", "Director", "Manager", "Recruiter Manager", "System Admin"]}
                          permissions={["read:users"]}
                        >
                          <AppLayout>
                            <SessionsMonitoringPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  {/* Admin routes */}
                  <Route
                    path="/admin/users"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          roles={["CEO", "Director", "Manager", "Recruiter Manager"]}
                          permissions={["read:users"]}
                        >
                          <AppLayout>
                            <UsersPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/admin/users/create"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          roles={["CEO", "Director", "Manager", "Recruiter Manager"]}
                          permissions={["manage:users"]}
                        >
                          <AppLayout>
                            <CreateUserPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/admin/users/:id"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          roles={["CEO", "Director", "Manager", "Recruiter Manager"]}
                          permissions={["read:users"]}
                        >
                          <AppLayout>
                            <UserDetailPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/admin/users/:id/edit"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          roles={["CEO", "Director", "Manager", "Recruiter Manager"]}
                          permissions={["manage:users"]}
                        >
                          <AppLayout>
                            <EditUserPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/admin/system-settings"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          roles={["CEO", "Director", "Manager", "Recruiter Manager", "System Admin"]}
                          permissions={["read:system_config"]}
                        >
                          <AppLayout>
                            <SystemSettingsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/notifications"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <AppLayout>
                            <NotificationsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/admin/roles"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          roles={["CEO", "Director", "Manager", "Recruiter Manager"]}
                          permissions={["read:roles"]}
                        >
                          <AppLayout>
                            <div className="p-8">
                              <h1 className="text-2xl font-bold">
                                Roles & Permissions
                              </h1>
                              <p className="text-muted-foreground">
                                Role and permission management
                              </p>
                            </div>
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  <Route
                    path="/admin/teams"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          roles={["CEO", "Director", "Manager", "Recruiter Manager"]}
                          permissions={["read:teams"]}
                        >
                          <AppLayout>
                            <div className="p-8">
                              <h1 className="text-2xl font-bold">
                                Team Management
                              </h1>
                              <p className="text-muted-foreground">
                                Advanced team management
                              </p>
                            </div>
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  {/* Default redirect */}
                  <Route
                    path="/"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <RoleBasedRedirect />
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  {/* 404 route */}
                  <Route
                    path="*"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute>
                          <RoleBasedRedirect />
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />
                </Routes>
              </Suspense>

              {/* Global toast notifications */}
              <Toaster
                position="top-right"
                closeButton
                richColors
                duration={3000}
              />
            </div>
            </ProcessingReminderProvider>
            </CallbackReminderProvider>
          </RNRReminderProvider>
        </NotificationsSocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;