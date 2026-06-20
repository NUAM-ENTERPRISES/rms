import { useState, useCallback, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Phone, ArrowRight } from "lucide-react";
import { CountryCodeSelect } from "@/components/molecules";
import { useLoginMutation } from "@/services/authApi";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials } from "@/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { LoginSuccessTransition } from "@/components/organisms/LoginSuccessTransition";
import { LoginAmbientBackground } from "@/components/organisms/LoginAmbientBackground";
import { cn } from "@/lib/utils";
import {
  BLOCKED_ACCOUNT_MESSAGE,
  BLOCKED_ACCOUNT_SESSION_KEY,
  BLOCKED_ACCOUNT_QUERY_PARAM,
  isBlockedAccountMessage,
  extractApiErrorMessage,
} from "@/shared/constants/account-status";


function getLoginErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    if ("data" in error) {
      const message = extractApiErrorMessage(
        (error as { data: unknown }).data,
      );
      if (message) return message;
    }
    if (
      "status" in error &&
      (error as { status: unknown }).status === "FETCH_ERROR"
    ) {
      return "Unable to reach the server. Check your connection and try again.";
    }
    if (
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }
  }
  return "Invalid mobile number or password";
}

const loginSchema = z.object({
  countryCode: z
    .string()
    .min(1, "Country code is required")
    .regex(/^\+[1-9]\d{0,3}$/, "Please select a valid country code"),
  mobileNumber: z
    .string()
    .min(1, "Mobile number is required")
    .regex(/^\d{6,15}$/, "Please enter a valid mobile number (6-15 digits)"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

// RmsRightPanel Component
interface RmsRightPanelProps {
  className?: string;
  logoSrc?: string;
  statLine?: string;
  headline?: string;
  subhead?: string;
  ctaTitle?: string;
  ctaSubhead?: string;
}

function RmsRightPanel({
  className = "",
  logoSrc,
  statLine = "Streamlining healthcare recruitment with advanced technology and proven expertise.",
  headline = "Welcome to Affiniks RMS",
  subhead = "Comprehensive recruitment management system empowers healthcare staffing with intelligent candidate matching, automated workflows, and real-time collaboration—from initial screening to successful placement.",
  ctaTitle = "Access your recruitment dashboard",
  ctaSubhead = "Manage candidates, track placements, monitor performance metrics, and collaborate with your team in one unified platform.",
}: RmsRightPanelProps) {
  return (
    <div
      className={cn(
        "relative z-10 hidden flex-1 items-center justify-center p-8 lg:flex",
        className
      )}
    >
      <div className="relative ml-[40px] h-full w-full min-h-[32rem] rounded-[28px] p-[2px] shadow-[0_0_48px_rgba(99,102,241,0.22)]">
        {/* Animated gradient border */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]"
          aria-hidden
        >
          <div className="absolute inset-[-160%] animate-login-panel-border bg-[conic-gradient(from_0deg,transparent_0deg,#818cf8_72deg,#c084fc_144deg,#6366f1_216deg,transparent_288deg)] opacity-90" />
        </div>
        <div
          className="pointer-events-none absolute -inset-1 rounded-[30px] bg-gradient-to-br from-primary-500/25 via-accent-500/15 to-primary-400/25 blur-xl opacity-80"
          aria-hidden
        />

        <div className="relative h-full overflow-hidden rounded-[26px] border border-white/10 bg-slate-950/35 backdrop-blur-xl">
        {/* Hero Mark - Stylized "A" */}
        <div className="absolute top-20 right-16 w-48 h-48 opacity-10 pointer-events-none">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient
                id="heroGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#141518" />
                <stop offset="100%" stopColor="#0D0E10" />
              </linearGradient>
            </defs>
            <path
              d="M100 20 L180 180 L160 180 L100 40 L40 180 L20 180 Z"
              fill="url(#heroGradient)"
            />
            <path d="M80 120 L120 120 L100 80 Z" fill="#0D0E10" />
          </svg>
        </div>

        {/* Diagonal Streaks */}
        <div className="absolute top-32 right-24 w-32 h-1 bg-gradient-to-r from-[#6EE7F9] to-[#A78BFA] opacity-15 blur-sm transform rotate-45"></div>
        <div className="absolute top-40 right-16 w-24 h-1 bg-gradient-to-r from-[#6EE7F9] to-[#A78BFA] opacity-20 blur-sm transform rotate-45"></div>

        {/* Star Specks */}
        <div className="absolute top-28 right-32 w-1 h-1 bg-white opacity-4 rounded-full"></div>
        <div className="absolute top-36 right-20 w-1.5 h-1.5 bg-white opacity-3 rounded-full"></div>
        <div className="absolute top-44 right-28 w-1 h-1 bg-white opacity-4 rounded-full"></div>
        <div className="absolute top-52 right-12 w-1.5 h-1.5 bg-white opacity-3 rounded-full"></div>

        {/* Content Container */}
        <div className="relative z-10 pt-12 px-10 pb-10 h-full flex flex-col mt-8">
          {/* Logo & Brand Label */}
          <motion.div
  initial={{ opacity: 0, y: -30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  className="flex flex-col items-center mb-10"
>
  {/* Logo Container with Glass + Glow */}
  <div className="relative group mb-6">
    {/* Outer Glow */}
    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition duration-1000" />

    {/* Logo Card */}
    <div className="relative p-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl">
      {logoSrc ? (
        <motion.img
          whileHover={{ scale: 1.05 }}
          src={logoSrc}
          alt="Affiniks logo"
          className="h-20 w-auto drop-shadow-2xl"
        />
      ) : (
        <motion.div
          whileHover={{ scale: 1.1, rotate: 360 }}
          transition={{ duration: 0.6 }}
          className="h-20 w-20 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl"
        >
          <span className="text-white text-4xl font-black tracking-tighter">A</span>
        </motion.div>
      )}
    </div>

    {/* Floating Particles Effect (Optional Magic) */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-10 w-2 h-2 bg-blue-400/60 rounded-full animate-ping" />
      <div className="absolute bottom-2 right-8 w-1.5 h-1.5 bg-purple-400/60 rounded-full animate-ping delay-300" />
      <div className="absolute top-8 right-4 w-1 h-1 bg-pink-400/60 rounded-full animate-ping delay-700" />
    </div>
  </div>

  {/* Brand Name - Premium Typography */}
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.5, duration: 1 }}
    className="mt-4"
  >
   <span className="text-xs text-gray-400 tracking-widest font-medium drop-shadow-2xl drop-shadow-amber-200">
              AFFINIKS
    </span>
  </motion.div>

  {/* Subtle Tagline (Optional) */}
  {/* <motion.p
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.8 }}
    className="mt-4 text-sm font-medium text-gray-400 tracking-widest"
  >
    Excellence in Every Connection
  </motion.p> */}
</motion.div>
          {/* Main Heading */}
          <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-widest mt-2 leading-tight drop-shadow-2xl drop-shadow-amber-200 ml-[90px]">
            {headline}
          </h2>

          {/* Body Copy */}
          <p className="text-sm text-gray-300 mt-3 leading-relaxed max-w-md ml-[90px]">
            {subhead}
          </p>

          {/* Metric Line */}
          <p className="text-xs text-gray-400 mt-4 font-medium ml-[90px]">{statLine}</p>

          {/* CTA Bubble Card */}
          <div className="mt-16 w-3/4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-primary/10 backdrop-blur-sm ring-1 ring-white/10 ml-[90px]">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-lg md:text-xl font-bold text-white leading-tight">
                    {ctaTitle}
                  </h3>
                  <p className="text-sm text-gray-300 mt-2 max-w-[46ch] leading-relaxed">
                    {ctaSubhead}
                  </p>
                </div>

                {/* Avatar Stack */}
                <div className="flex items-center -space-x-2">
                  <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-slate-950/80">
                    JD
                  </div>
                  <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-slate-950/80">
                    SM
                  </div>
                  <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-slate-950/80">
                    RK
                  </div>
                  <div className="w-7 h-7 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-slate-950/80">
                    +2
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1" />
        </div>
        </div>
      </div>
    </div>
  );
}

interface LoginTransitionState {
  userName: string;
  nextUrl: string | null;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginTransition, setLoginTransition] =
    useState<LoginTransitionState | null>(null);
  const pendingNavigationRef = useRef<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const isTransitioning = loginTransition !== null;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      countryCode: "+91",
      mobileNumber: "",
      password: "",
    },
  });

  useEffect(() => {
    const fromRedirect =
      searchParams.get(BLOCKED_ACCOUNT_QUERY_PARAM) === "1";
    const stored = sessionStorage.getItem(BLOCKED_ACCOUNT_SESSION_KEY);
    sessionStorage.removeItem(BLOCKED_ACCOUNT_SESSION_KEY);

    const message = isBlockedAccountMessage(stored ?? undefined)
      ? stored!
      : fromRedirect
        ? BLOCKED_ACCOUNT_MESSAGE
        : null;

    if (message) {
      setError("root", { message });
      toast.error(message);
    }

    if (fromRedirect) {
      const next = new URLSearchParams(searchParams);
      next.delete(BLOCKED_ACCOUNT_QUERY_PARAM);
      setSearchParams(next, { replace: true });
    }
  }, [setError, searchParams, setSearchParams]);

  const clearRootError = useCallback(() => {
    if (errors.root) {
      clearErrors("root");
    }
  }, [clearErrors, errors.root]);

  const completeLoginNavigation = useCallback(() => {
    const nextUrl = pendingNavigationRef.current;
    const destination =
      nextUrl && nextUrl.startsWith("/") ? decodeURIComponent(nextUrl) : "/";

    pendingNavigationRef.current = null;
    navigate(destination);
  }, [navigate]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data).unwrap();
      const loginData = result.data;
      const accessToken = loginData?.accessToken;
      const user = loginData?.user;

      if (result.success !== false && accessToken && user) {
        sessionStorage.removeItem(BLOCKED_ACCOUNT_SESSION_KEY);

        dispatch(
          setCredentials({
            user,
            accessToken,
            refreshToken: loginData.refreshToken ?? "",
          }),
        );

        const userName = user.name || "User";
        toast.success(`Welcome back, ${userName}!`);

        const nextParam = searchParams.get("next");
        const nextUrl =
          nextParam && nextParam.startsWith("/") ? nextParam : null;

        pendingNavigationRef.current = nextUrl;
        setLoginTransition({ userName, nextUrl });
      } else {
        const message = result.message || "Login failed";
        setError("root", { message });
        toast.error(message);
      }
    } catch (error: unknown) {
      const errorMessage = getLoginErrorMessage(error);
      setError("root", { message: errorMessage });
      toast.error(errorMessage);
    }
  };

  return (
    <div className="relative min-h-screen flex bg-slate-950">
      <LoginSuccessTransition
        isVisible={isTransitioning}
        userName={loginTransition?.userName}
        onComplete={completeLoginNavigation}
      />

      <AnimatePresence>
        {!isTransitioning && (
          <motion.div
            key="login-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="relative flex min-h-screen w-full flex-1"
          >
            <LoginAmbientBackground />

      {/* Left side - Login Form */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="w-full max-w-lg"
        >
          {/* Login Card */}
          <Card className="overflow-hidden border-white/10 bg-slate-950/75 shadow-[0_0_80px_-12px_rgba(99,102,241,0.4)] backdrop-blur-2xl">
            <CardContent className="px-8 pt-8 pb-0">
              {/* Logo and Header */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative mb-6 text-center"
              >
                <div className="relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,theme(colors.primary.500/0.2),transparent_60%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,theme(colors.accent.500/0.2),transparent_60%)]" />
                  <motion.img
                    src="/logo.png"
                    alt="Affiniks RMS"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative z-10 h-16 w-auto md:h-[4.25rem]"
                  />
                </div>
              </motion.div>
              {/* Header inside card */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">
                  Welcome back
                </h1>
                <p className="text-white text-sm">
                  Sign in to your Affiniks RMS account
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="mobileNumber"
                    className="text-sm font-medium text-slate-300"
                  >
                    Mobile Number
                  </Label>
                  <div className="grid grid-cols-[10.5rem_1fr] gap-2 items-center">
                    <div className="min-w-0">
                      <Controller
                        name="countryCode"
                        control={control}
                        render={({ field }) => (
                          <CountryCodeSelect
                            name={field.name}
                            value={field.value}
                            onValueChange={(value) => {
                              clearRootError();
                              field.onChange(value);
                            }}
                            placeholder="Code"
                            error={errors.countryCode?.message}
                            className="h-12 min-h-12 w-full text-base md:text-sm bg-white/5 border-white/10 text-white shadow-xs focus:border-primary/50 focus:ring-primary/20 data-[placeholder]:text-slate-500 [&_svg]:text-slate-400"
                          />
                        )}
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        id="mobileNumber"
                        type="tel"
                        placeholder="9876543210"
                        className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200"
                        {...register("mobileNumber", {
                          onChange: () => clearRootError(),
                        })}
                      />
                    </div>
                  </div>
                  {errors.countryCode && (
                    <p className="text-sm text-red-400 mt-1">
                      {errors.countryCode.message}
                    </p>
                  )}
                  {errors.mobileNumber && (
                    <p className="text-sm text-red-400 mt-1">
                      {errors.mobileNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-300"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200"
                      {...register("password", {
                        onChange: () => clearRootError(),
                      })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 hover:bg-white/10 text-slate-400"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-400 mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {errors.root && (
                  <Alert
                    variant="destructive"
                    className="bg-red-950/50 border-red-500/30"
                  >
                    <AlertDescription className="text-red-300">
                      {errors.root.message}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || isTransitioning}
                  className={cn(
                    "group relative h-12 w-full overflow-hidden rounded-xl border-0 p-0",
                    "bg-gradient-to-r from-primary via-primary to-accent",
                    "font-semibold text-white shadow-lg shadow-primary/35",
                    "transition-[box-shadow,transform] duration-300 ease-out",
                    "hover:shadow-xl hover:shadow-primary/55 hover:scale-[1.02]",
                    "active:scale-[0.98]",
                    "focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                    "disabled:pointer-events-none disabled:opacity-60 disabled:scale-100 disabled:shadow-lg",
                    "before:pointer-events-none before:absolute before:inset-0 before:rounded-xl",
                    "before:bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.35)_50%,transparent_75%)]",
                    "before:translate-x-[-120%] before:transition-transform before:duration-700 before:ease-out",
                    "hover:before:translate-x-[120%]",
                    "after:pointer-events-none after:absolute after:inset-0 after:rounded-xl",
                    "after:ring-1 after:ring-inset after:ring-white/20 after:opacity-80",
                    "hover:after:ring-white/40"
                  )}
                >
                  {/* Ambient highlight pulse */}
                  <span
                    className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-primary-400/0 via-white/10 to-accent-400/0 opacity-60 animate-pulse group-hover:opacity-0 group-disabled:opacity-0"
                    aria-hidden
                  />
                  <span
                    className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-primary-400/50 via-accent-400/40 to-primary-400/50 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />

                  {isLoading ? (
                    <span className="relative z-10 flex items-center justify-center gap-2 px-4">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Signing in...</span>
                    </span>
                  ) : (
                    <span className="relative z-10 flex w-full items-center justify-center gap-2.5 px-4">
                      <span className="bg-gradient-to-r from-white via-white to-white/85 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_12px_rgba(255,255,255,0.35)] transition-all duration-300 ease-out group-hover:tracking-wide group-hover:drop-shadow-[0_0_18px_rgba(255,255,255,0.55)]">
                        Sign in to dashboard
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-white transition-all duration-300 ease-out group-hover:translate-x-1.5 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                        aria-hidden
                      />
                    </span>
                  )}
                </Button>
              </form>

              {/* <div className="mt-8 space-y-4">
                <div className="text-center">
                  <Button
                    variant="link"
                    className="text-sm text-slate-600 hover:text-primary transition-colors"
                  >
                    Forgot your password?
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white/70 text-slate-500">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-12 border-slate-200 bg-white/50 hover:bg-white/80 text-slate-700 font-medium rounded-xl transition-all duration-200"
                >
                  Request access to system
                </Button>
              </div> */}
              {/* Footer */}
              <div className="text-center mt-8">
                <p className="text-xs text-white">
                  Protected by enterprise-grade security
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Right side - RmsRightPanel */}
      <RmsRightPanel logoSrc="/logo.png" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
