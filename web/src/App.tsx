import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import AuthProvider from "@/app/providers/auth-provider";
import NotificationsSocketProvider from "@/app/providers/notifications-socket.provider";
import { RNRReminderProvider } from "@/app/providers/rnr-reminder.provider";
import { HRDReminderProvider } from "@/app/providers/hrd-reminder.provider";
import { DataFlowReminderProvider } from "@/app/providers/data-flow-reminder.provider";
import ProtectedRoute from "@/app/router/protected-route";
import RouteErrorBoundary from "@/components/atoms/RouteErrorBoundary";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import AppLayout from "@/layout/AppLayout";
import { useAppSelector } from "@/app/hooks";
import CandidateProjectDetailsPage from "@/features/candidates/views/CandidateProjectDetailsPage";

// Lazy load pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const CREDashboardPage = lazy(() => import("@/pages/CREDashboardPage"));

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
const RecruiterOverviewPage = lazy(
  () => import("@/features/analytics/views/RecruiterOverviewPage")
);

const InterviewAnalyticPage = lazy(
  () => import("@/features/analytics/views/InterviewAnalyticPage")
);

const DocumentAnalyticPage = lazy(
  () => import("@/features/analytics/views/DocumentAnalyticPage")
);
const RecruiterDetailPage = lazy(
  () => import("@/features/analytics/views/RecruiterDetailPage")
);
// const TrainingAnalyticsPage = lazy(
//   () => import("@/features/analytics/views/TraningAnalyticsPage")
// );

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
const UpcomingInterviewsListPage = lazy(
  () => import("@/features/interviews/views/UpcomingInterviewsListPage")
);
const PassedCandidatesPage = lazy(
  () => import("@/features/interviews/views/PassedCandidatesPage")
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

// Role-based redirect component
function RoleBasedRedirect() {
  const { user } = useAppSelector((state) => state.auth);

  // CRE role gets their own dashboard
  if (user?.roles.some((role) => role === "CRE")) {
    return (
      <AppLayout>
        <CREDashboardPage />
      </AppLayout>
    );
  }

  // Processing Executive role gets their own dashboard
  if (user?.roles.some((role) => role === "Processing Executive")) {
    return (
      <AppLayout>
        <ProcessingDashboardPage />
      </AppLayout>
    );
  }

  // Only Manager, Director, and CEO can access dashboard
  if (
    user?.roles.some((role) => ["CEO", "Director", "Manager"].includes(role))
  ) {
    return (
      <AppLayout>
        <DashboardPage />
      </AppLayout>
    );
  }

  // Interview coordinators should land on the interviews workspace
  if (user?.roles.includes("Interview Coordinator")) {
    return (
      <AppLayout>
        <InterviewsPage />
      </AppLayout>
    );
  }

  // All other roles (Recruiter, Team Head, Team Lead, etc.) go to projects page
  return (
    <AppLayout>
      <ProjectsPage />
    </AppLayout>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationsSocketProvider>
          <RNRReminderProvider>
            <HRDReminderProvider>
              <DataFlowReminderProvider>
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

                  {/* Protected routes with AppLayout */}
                  <Route
                    path="/dashboard"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute roles={["CEO", "Director", "Manager"]}>
                          <AppLayout>
                            <DashboardPage />
                          </AppLayout>
                        </ProtectedRoute>
                      </RouteErrorBoundary>
                    }
                  />

                  {/* CRE Dashboard */}
                  <Route
                    path="/cre-dashboard"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute roles={["CRE"]}>
                          <AppLayout>
                            <CREDashboardPage />
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
                        <ProtectedRoute roles={["CEO", "Director", "Manager", "System Admin"]}>
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
                        <ProtectedRoute roles={["Recruiter", "System Admin"]}>
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
                        <ProtectedRoute roles={["Recruiter", "System Admin"]}>
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
                        <ProtectedRoute roles={["Recruiter", "System Admin"]}>
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
                        <ProtectedRoute>
                          <AppLayout>
                            <CandidateDetailPage />
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
  path="/analytics/candidates"
  element={
    <RouteErrorBoundary>
      <ProtectedRoute roles={["CEO", "Director", "Manager"]}>
        <AppLayout>
          <RecruiterOverviewPage />
        </AppLayout>
      </ProtectedRoute>
    </RouteErrorBoundary>
  }
/>
<Route
  path="/recruiter/:id"
  element={
    <RouteErrorBoundary>
      <ProtectedRoute roles={["CEO"]}>
        <AppLayout>
          <RecruiterDetailPage />
        </AppLayout>
      </ProtectedRoute>
    </RouteErrorBoundary>
  }
/>

<Route
  path="/analytics/candidates/funnel"
  element={
    <RouteErrorBoundary>
      <ProtectedRoute roles={["CEO", "Director", "Manager"]}>
        <AppLayout>
          <InterviewAnalyticPage />
        </AppLayout>
      </ProtectedRoute>
    </RouteErrorBoundary>
  }
/>

<Route
  path="/analytics/candidates/time"
  element={
    <RouteErrorBoundary>
      <ProtectedRoute roles={["CEO", "Director", "Manager"]}>
        <AppLayout>
          <DocumentAnalyticPage />
        </AppLayout>
      </ProtectedRoute>
    </RouteErrorBoundary>
  }
/>
{/* <Route
  path="/analytics/candidates/screening"
  element={
    <RouteErrorBoundary>
      <ProtectedRoute roles={["CEO", "Director", "Manager"]}>
        <AppLayout>
          <TrainingAnalyticsPage />
        </AppLayout>
      </ProtectedRoute>
    </RouteErrorBoundary>
  }
/> */}

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
                    path="/ready-for-processing"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute roles={["CEO", "Director", "Manager", "System Admin"]}>
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

                  {/* Admin routes */}
                  <Route
                    path="/admin/users"
                    element={
                      <RouteErrorBoundary>
                        <ProtectedRoute
                          roles={["CEO", "Director", "Manager"]}
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
                          roles={["CEO", "Director", "Manager"]}
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
                          roles={["CEO", "Director", "Manager"]}
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
                          roles={["CEO", "Director", "Manager"]}
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
                          roles={["CEO", "Director", "Manager", "System Admin"]}
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
                          roles={["CEO", "Director", "Manager"]}
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
                          roles={["CEO", "Director", "Manager"]}
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
              </DataFlowReminderProvider>
            </HRDReminderProvider>
          </RNRReminderProvider>
        </NotificationsSocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;