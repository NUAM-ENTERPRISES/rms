import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import AuthProvider from "@/app/providers/auth-provider";
import NotificationsSocketProvider from "@/app/providers/notifications-socket.provider";
import ProtectedRoute from "@/app/router/protected-route";
import RouteErrorBoundary from "@/components/atoms/RouteErrorBoundary";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import AppLayout from "@/layout/AppLayout";
import { useAppSelector } from "@/app/hooks";

// Lazy load pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));

// Feature-based views
const ProjectsPage = lazy(
  () => import("@/features/projects/views/ProjectsPage")
);
const CreateProjectPage = lazy(
  () => import("@/features/projects/views/CreateProjectPage")
);
const EditProjectPage = lazy(
  () => import("@/features/projects/views/EditProjectPage")
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

const DocumentUploadPage = lazy(
  () => import("@/features/documents/views/DocumentUploadPage")
);
const DocumentVerificationPage = lazy(
  () => import("@/features/documents/views/DocumentVerificationPage")
);

const UsersPage = lazy(() => import("@/features/admin/views/UsersPage"));
const UserDetailPage = lazy(
  () => import("@/features/admin/views/UserDetailPage")
);
const CreateUserPage = lazy(
  () => import("@/features/admin/views/CreateUserPage")
);
const EditUserPage = lazy(() => import("@/features/admin/views/EditUserPage"));

const NotificationsPage = lazy(
  () => import("@/features/notifications/views/NotificationsPage")
);

// Role-based redirect component
function RoleBasedRedirect() {
  const { user } = useAppSelector((state) => state.auth);

  // Only Manager, Director, and CEO can access dashboard
  // All other roles (Recruiter, Team Head, Team Lead, etc.) go to projects
  if (
    user?.roles.some((role) => ["CEO", "Director", "Manager"].includes(role))
  ) {
    return (
      <AppLayout>
        <DashboardPage />
      </AppLayout>
    );
  }

  // All other roles go to projects page
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
                      <ProtectedRoute permissions={["manage:candidates"]}>
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
                      <ProtectedRoute permissions={["manage:candidates"]}>
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
                      <ProtectedRoute>
                        <AppLayout>
                          <InterviewsPage />
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
                              Stay updated on important updates and assignments
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
                          <div className="p-8">
                            <h1 className="text-2xl font-bold">Profile</h1>
                            <p className="text-muted-foreground">
                              Manage your personal information and preferences
                            </p>
                          </div>
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
                      <ProtectedRoute
                        permissions={["read:projects", "read:candidates"]}
                      >
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
        </NotificationsSocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
