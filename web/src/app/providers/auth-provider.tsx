import { useEffect, useState, useRef, ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { useLocation } from "react-router-dom";
import {
  setCredentials,
  clearCredentials,
  setStatus,
} from "@/features/auth/authSlice";
import { authApi } from "@/services/authApi";
import { useSessionActivityTracker } from "@/hooks/useSessionActivityTracker";
import LoadingScreen from "@/components/atoms/LoadingScreen";

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { accessToken, status } = useAppSelector((s) => s.auth);
  const [bootstrapped, setBootstrapped] = useState(false);
  const previousPathnameRef = useRef(location.pathname);

  useSessionActivityTracker(status === "authenticated");

  useEffect(() => {
    // Performance measurement
    performance.mark("auth:bootstrapping:start");

    let mounted = true;
    (async () => {
      try {
        const isOnLoginPage = location.pathname === "/login";
        const enteredLoginPage =
          isOnLoginPage && previousPathnameRef.current !== "/login";
        previousPathnameRef.current = location.pathname;

        if (isOnLoginPage) {
          // Clear stale session only when navigating TO /login, not after a fresh login
          if (enteredLoginPage && accessToken) {
            dispatch(clearCredentials());
            dispatch(setStatus("anonymous"));
          } else if (accessToken) {
            dispatch(setStatus("authenticated"));
          } else {
            dispatch(setStatus("anonymous"));
          }
          if (mounted) setBootstrapped(true);
          return;
        }

        // If user already has access token, they're authenticated
        if (accessToken) {
          dispatch(setStatus("authenticated"));
          if (mounted) setBootstrapped(true);
          return;
        }

        // Protected route without tokens: attempt silent refresh

        // User is on a protected route, attempt silent refresh
        performance.mark("auth:refresh:start");
        const res = await dispatch(
          authApi.endpoints.refresh.initiate()
        ).unwrap();
        performance.mark("auth:refresh:end");
        performance.measure(
          "auth:refresh:duration",
          "auth:refresh:start",
          "auth:refresh:end"
        );

        const at = res?.data?.accessToken;
        const user = res?.data?.user;

        if (at && user) {
          dispatch(
            setCredentials({
              user: user,
              accessToken: at,
              refreshToken: res.data.refreshToken,
            })
          );

          // Only call /me if user data is missing from refresh response
          if (!user.id || !user.roles || !user.permissions) {
            performance.mark("auth:me:start");
            const me = await dispatch(authApi.endpoints.me.initiate()).unwrap();
            performance.mark("auth:me:end");
            performance.measure(
              "auth:me:duration",
              "auth:me:start",
              "auth:me:end"
            );

            dispatch(
              setCredentials({
                user: me.data,
                accessToken: at,
                refreshToken: res.data.refreshToken,
              })
            );
          }
          dispatch(setStatus("authenticated"));

          // Start prefetching dashboard data in parallel
          if (mounted) {
            // Prefetch common dashboard data
            dispatch(authApi.util.prefetch("me", undefined, { force: true }));
          }
        } else {
          dispatch(clearCredentials());
          dispatch(setStatus("anonymous"));
        }
      } catch (error) {
        dispatch(clearCredentials());
        dispatch(setStatus("anonymous"));
      } finally {
        if (mounted) {
          setBootstrapped(true);
          performance.mark("auth:bootstrapping:end");
          performance.measure(
            "auth:bootstrapping:total",
            "auth:bootstrapping:start",
            "auth:bootstrapping:end"
          );
          console.timeEnd("auth:bootstrapping:total");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [dispatch, accessToken, location.pathname]);

  if (!bootstrapped || status === "loading") {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
