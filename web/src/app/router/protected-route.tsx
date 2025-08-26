import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { toast } from "sonner";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import { authApi } from "@/services/authApi";
import { setCredentials } from "@/features/auth/authSlice";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
  permissions?: string[];
}

export default function ProtectedRoute({
  children,
  roles,
  permissions,
}: ProtectedRouteProps) {
  const location = useLocation();
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
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // Check role requirements
  if (roles && roles.length > 0 && user) {
    const hasRequiredRole = roles.some((role) => user.roles.includes(role));
    if (!hasRequiredRole) {
      toast.error("Insufficient permissions to access this page");
      // Redirect based on user role - only Manager+ go to dashboard, others to projects
      if (
        user.roles.some((role) => ["CEO", "Director", "Manager"].includes(role))
      ) {
        return <Navigate to="/dashboard" replace />;
      }
      return <Navigate to="/projects" replace />;
    }
  }

  // Check permission requirements
  if (permissions && permissions.length > 0 && user) {
    const hasRequiredPermission = permissions.some(
      (permission) =>
        user.permissions.includes(permission) || user.permissions.includes("*")
    );
    if (!hasRequiredPermission) {
      toast.error("Insufficient permissions to access this page");
      // Redirect based on user role - only Manager+ go to dashboard, others to projects
      if (
        user.roles.some((role) => ["CEO", "Director", "Manager"].includes(role))
      ) {
        return <Navigate to="/dashboard" replace />;
      }
      return <Navigate to="/projects" replace />;
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
}
