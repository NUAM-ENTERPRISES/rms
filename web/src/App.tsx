import { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import AuthProvider from "@/app/providers/auth-provider";
import ProtectedRoute from "@/app/router/protected-route";
import RouteErrorBoundary from "@/components/atoms/RouteErrorBoundary";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import AppLayout from "@/layout/AppLayout";
import { useAppSelector } from "@/app/hooks";

// Lazy load pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const CreateProjectPage = lazy(() => import("@/pages/CreateProjectPage"));
const ProjectDetailPage = lazy(() => import("@/pages/ProjectDetailPage"));
const CandidatesPage = lazy(() => import("@/pages/CandidatesPage"));
const TeamsPage = lazy(() => import("@/pages/TeamsPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const ClientsPage = lazy(() => import("@/pages/ClientsPage"));

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
                path="/interviews"
                element={
                  <RouteErrorBoundary>
                    <ProtectedRoute>
                      <AppLayout>
                        <div className="p-8">
                          <h1 className="text-2xl font-bold">Interviews</h1>
                          <p className="text-muted-foreground">
                            Interview scheduling and management
                          </p>
                        </div>
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
                          <h1 className="text-2xl font-bold">Notifications</h1>
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
                path="/documents"
                element={
                  <RouteErrorBoundary>
                    <ProtectedRoute>
                      <AppLayout>
                        <div className="p-8">
                          <h1 className="text-2xl font-bold">Documents</h1>
                          <p className="text-muted-foreground">
                            Document management page
                          </p>
                        </div>
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
      </AuthProvider>
    </Router>
  );
}

export default App;
