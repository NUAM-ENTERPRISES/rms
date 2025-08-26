import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import AuthProvider from "@/app/providers/auth-provider";
import ProtectedRoute from "@/app/router/protected-route";
import RouteErrorBoundary from "@/components/atoms/RouteErrorBoundary";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import AppLayout from "@/layout/AppLayout";

// Lazy load pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const CandidatesPage = lazy(() => import("@/pages/CandidatesPage"));
const TeamsPage = lazy(() => import("@/pages/TeamsPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));

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
                    <ProtectedRoute>
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
                    <ProtectedRoute permissions={["read:projects"]}>
                      <AppLayout>
                        <ProjectsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                }
              />

              <Route
                path="/candidates"
                element={
                  <RouteErrorBoundary>
                    <ProtectedRoute permissions={["read:candidates"]}>
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
                    <ProtectedRoute permissions={["read:teams"]}>
                      <AppLayout>
                        <TeamsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                }
              />

              <Route
                path="/clients"
                element={
                  <RouteErrorBoundary>
                    <ProtectedRoute permissions={["read:clients"]}>
                      <AppLayout>
                        <div className="p-8">
                          <h1 className="text-2xl font-bold">Clients</h1>
                          <p className="text-muted-foreground">
                            Client management page
                          </p>
                        </div>
                      </AppLayout>
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                }
              />

              <Route
                path="/documents"
                element={
                  <RouteErrorBoundary>
                    <ProtectedRoute permissions={["read:documents"]}>
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
                    <ProtectedRoute roles={["CEO", "Director", "Manager"]} permissions={["read:users"]}>
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
                    <ProtectedRoute roles={["CEO", "Director", "Manager"]} permissions={["read:roles"]}>
                      <AppLayout>
                        <div className="p-8">
                          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
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
                    <ProtectedRoute roles={["CEO", "Director", "Manager"]} permissions={["read:teams"]}>
                      <AppLayout>
                        <div className="p-8">
                          <h1 className="text-2xl font-bold">Team Management</h1>
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
                      <AppLayout>
                        <DashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                }
              />

              {/* 404 route */}
              <Route
                path="*"
                element={
                  <RouteErrorBoundary>
                    <AppLayout>
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <h1 className="text-4xl font-bold">404</h1>
                          <p className="text-muted-foreground">Page not found</p>
                        </div>
                      </div>
                    </AppLayout>
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
