import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Providers } from "./app/providers";
import { PrivateRoute } from "./components/PrivateRoute.tsx";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { Toaster } from "./components/ui/sonner";

// Lazy load pages
const LoginPage = lazy(() => import("./pages/LoginPage.tsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.tsx"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage.tsx"));
const CandidatesPage = lazy(() => import("./pages/CandidatesPage.tsx"));
const UsersPage = lazy(() => import("./pages/UsersPage.tsx"));

function App() {
  return (
    <Providers>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <PrivateRoute>
                <ProjectsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/candidates"
            element={
              <PrivateRoute>
                <CandidatesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute>
                <UsersPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </Suspense>
      <Toaster />
    </Providers>
  );
}

export default App;
