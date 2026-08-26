import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { toast } from "sonner";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import { authApi } from "@/services/authApi";
import { setCredentials } from "@/features/auth/authSlice";

import { ROLE_NAMES } from "@/config/role-names";
import { canAccess } from "@/shared/utils/canAccess";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
  permissions?: string[];
  /**
   * When true with both roles and permissions, allow role OR permission.
   */
  matchRolesOrPermissions?: boolean;
}

export default function ProtectedRoute({
  children,
  roles,
  permissions,
  matchRolesOrPermissions,
}: ProtectedRouteProps) {
  const dispatch = useAppDispatch();
  const { status, user, userVersion, accessToken, refreshToken } =
    useAppSelector((state) => state.auth);

  // Background revalidation when userVersion changes
  useEffect(() => {
    if (user?.userVersion && userVersion && user.userVersion !== userVersion) {
      // User data has changed, refresh in background
      dispatch(authApi.endpoints.me.initiate())
        .unwrap()
        .then((me) => {
          // Update user data without blocking UI
          dispatch(
            setCredentials({
              user: me.data,
              accessToken: accessToken || "",
              refreshToken: refreshToken || "",
            })
          );
        })
        .catch(() => {
          // Silent fail - user can continue with current data
        });
    }
  }, [user?.userVersion, userVersion, dispatch]);

  // Show loading while bootstrapping
  if (status === "loading") {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  function denyAccessToastAndRedirect(): React.ReactElement {
    toast.error("Insufficient permissions to access this page");
    if (user?.roles.includes("Processing Manager")) {
      return <Navigate to="/processing-admin" replace />;
    }
    if (user?.roles.includes(ROLE_NAMES.PROJECT_COORDINATOR)) {
      return <Navigate to="/project-coordinator/dashboard" replace />;
    }
    if (user?.roles.includes("Interview Coordinator")) {
      return <Navigate to="/interviews" replace />;
    }
    if (
      user?.roles.some((role) =>
        ["Managing Director", "Director", "Manager", "Recruiter Manager"].includes(role)
      )
    ) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/projects" replace />;
  }

  if (
    user &&
    !canAccess(user, { roles, permissions, matchRolesOrPermissions })
  ) {
    return denyAccessToastAndRedirect();
  }

  return <>{children}</>;
}
