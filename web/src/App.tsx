import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import AuthProvider from "./app/providers/auth-provider";
import ProtectedRoute from "./app/router/protected-route";
import RouteErrorBoundary from "./components/atoms/RouteErrorBoundary";
import LoadingScreen from "./components/atoms/LoadingScreen";

// Lazy load pages
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));

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

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <RouteErrorBoundary>
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                }
              />

              {/* Role-based protected routes */}
              <Route
                path="/admin"
                element={
                  <RouteErrorBoundary>
                    <ProtectedRoute roles={["CEO", "Director", "Manager"]}>
                      <div className="p-8">
                        <h1 className="text-2xl font-bold">Admin Panel</h1>
                        <p className="text-muted-foreground">
                          Only accessible by CEO, Director, or Manager
                        </p>
                      </div>
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                }
              />

              <Route
                path="/candidates"
                element={
                  <RouteErrorBoundary>
                    <ProtectedRoute permissions={["read:candidates"]}>
                      <div className="p-8">
                        <h1 className="text-2xl font-bold">Candidates</h1>
                        <p className="text-muted-foreground">
                          Candidate management page
                        </p>
                      </div>
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
                      <DashboardPage />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                }
              />

              {/* 404 route */}
              <Route
                path="*"
                element={
                  <RouteErrorBoundary>
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold">404</h1>
                        <p className="text-muted-foreground">Page not found</p>
                      </div>
                    </div>
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
