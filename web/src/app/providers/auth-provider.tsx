import { useEffect, useState, ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
  setCredentials,
  clearCredentials,
  setStatus,
} from "@/features/auth/authSlice";
import { authApi } from "@/services/authApi";
import LoadingScreen from "../../components/atoms/LoadingScreen";

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch();
  const { accessToken, status } = useAppSelector((s) => s.auth);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (accessToken) {
          dispatch(setStatus("authenticated"));
          if (mounted) setBootstrapped(true);
          return;
        }

        const res = await dispatch(
          authApi.endpoints.refresh.initiate()
        ).unwrap();
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

          if (!user) {
            const me = await dispatch(authApi.endpoints.me.initiate()).unwrap();
            dispatch(
              setCredentials({
                user: me.data,
                accessToken: at,
                refreshToken: res.data.refreshToken,
              })
            );
          }
          dispatch(setStatus("authenticated"));
        } else {
          dispatch(clearCredentials());
          dispatch(setStatus("anonymous"));
        }
      } catch (error) {
        console.log("Silent refresh failed, user needs to login");
        dispatch(clearCredentials());
        dispatch(setStatus("anonymous"));
      } finally {
        if (mounted) setBootstrapped(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [dispatch, accessToken]);

  if (!bootstrapped || status === "loading") {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
