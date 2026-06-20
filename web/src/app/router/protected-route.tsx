import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { toast } from "sonner";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import { authApi } from "@/services/authApi";
import { setCredentials } from "@/features/auth/authSlice";

import { ROLE_NAMES } from "@/config/role-names";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
  permissions?: string[];
  /**
   * When set, grants access if the user matches ANY of `roles` OR ANY of `permissions`.
   * (Default behavior runs role check and permission checks separately when both are set,
   * which incorrectly requires BOTH.) Use for routes like recruiter docs where coordinators
   * share recruiter-style permissions (`nominate:candidates`) alongside named roles.
   */
  matchRolesOrPermissions?: boolean;
}

function userHasWildcardPermission(user: {
  permissions: string[];
}): boolean {
  return (
    user.permissions.includes("*") ||
    user.permissions.includes("manage:all") ||
    user.permissions.includes("read:all")
  );
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
    if (
      user?.roles.some((role) =>
        ["CEO", "Director", "Manager", "Recruiter Manager"].includes(role)
      )
    ) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/projects" replace />;
  }

  // Match EITHER roles OR permissions (same route as recruiter tools + coordinators)
  if (matchRolesOrPermissions && user) {
    const hasRoleMatch =
      roles && roles.length > 0
        ? roles.some((role) => user.roles.includes(role))
        : false;
    const hasPermMatch =
      permissions && permissions.length > 0
        ? permissions.some(
            (permission) =>
              user.permissions.includes(permission) ||
              userHasWildcardPermission(user),
          )
        : false;

    let allowed = true;
    if (roles?.length && permissions?.length) {
      allowed = hasRoleMatch || hasPermMatch;
    } else if (roles?.length) {
      allowed = hasRoleMatch;
    } else if (permissions?.length) {
      allowed = hasPermMatch;
    }

    if (!allowed) {
      return denyAccessToastAndRedirect();
    }
    return <>{children}</>;
  }

  // Check role requirements
  if (roles && roles.length > 0 && user) {
    const hasRequiredRole = roles.some((role) => user.roles.includes(role));
    if (!hasRequiredRole) {
      return denyAccessToastAndRedirect();
    }
  }

  // Check permission requirements
  if (permissions && permissions.length > 0 && user) {
    const hasRequiredPermission = permissions.some(
      (permission) =>
        user.permissions.includes(permission) ||
        userHasWildcardPermission(user),
    );
    if (!hasRequiredPermission) {
      return denyAccessToastAndRedirect();
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
}
