import { useState, useCallback, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Phone, ArrowRight } from "lucide-react";
import { CountryCodeSelect } from "@/components/molecules";
import { BrandLogo } from "@/components/molecules/BrandLogo";
import { useLoginMutation } from "@/services/authApi";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials } from "@/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { LoginSuccessTransition } from "@/components/organisms/LoginSuccessTransition";
import { LoginAmbientBackground } from "@/components/organisms/LoginAmbientBackground";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
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

const LOGIN_HEADLINE_TEXT = "Building Bridges. Breaking Barriers.";

interface TypewriterHeadlineProps {
  text: string;
  typeSpeedMs?: number;
  deleteSpeedMs?: number;
  holdMs?: number;
  restartDelayMs?: number;
  loop?: boolean;
  onComplete?: () => void;
  className?: string;
}

type TypewriterPhase = "typing" | "deleting" | "restarting";

function TypewriterHeadline({
  text,
  typeSpeedMs = 55,
  deleteSpeedMs = 28,
  holdMs = 2200,
  restartDelayMs = 500,
  loop = true,
  onComplete,
  className,
}: TypewriterHeadlineProps) {
  const [charCount, setCharCount] = useState(0);
  const [phase, setPhase] = useState<TypewriterPhase>("typing");
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    setCharCount(0);
    setPhase("typing");
    hasCompletedRef.current = false;
  }, [text]);

  useEffect(() => {
    let timeoutId: number;

    if (phase === "typing") {
      if (charCount < text.length) {
        timeoutId = window.setTimeout(
          () => setCharCount((count) => count + 1),
          typeSpeedMs,
        );
      } else {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete?.();
        }
        if (loop) {
          timeoutId = window.setTimeout(() => setPhase("deleting"), holdMs);
        }
      }
    } else if (phase === "deleting") {
      if (charCount > 0) {
        timeoutId = window.setTimeout(
          () => setCharCount((count) => count - 1),
          deleteSpeedMs,
        );
      } else {
        timeoutId = window.setTimeout(
          () => setPhase("restarting"),
          restartDelayMs,
        );
      }
    } else if (phase === "restarting") {
      timeoutId = window.setTimeout(() => setPhase("typing"), 120);
    }

    return () => window.clearTimeout(timeoutId);
  }, [
    phase,
    charCount,
    text,
    typeSpeedMs,
    deleteSpeedMs,
    holdMs,
    restartDelayMs,
    loop,
    onComplete,
  ]);

  const displayedText = text.slice(0, charCount);
  const lastChar = displayedText.slice(-1);
  const headText = displayedText.slice(0, -1);
  const isActivelyTyping = phase === "typing" && charCount < text.length;

  return (
    <h2
      className={cn(
        "relative text-center text-xl font-bold tracking-tight md:text-2xl xl:text-3xl",
        className,
      )}
      aria-label={text}
    >
      <span className="animate-login-hero-gradient bg-gradient-to-r from-primary-300 via-accent-300 to-primary-200 bg-clip-text text-transparent">
        {headText}
      </span>
      {lastChar && (
        <span
          key={charCount}
          className={cn(
            "animate-login-hero-gradient bg-gradient-to-r from-primary-300 via-accent-300 to-primary-200 bg-clip-text text-transparent",
            isActivelyTyping && "animate-login-typewriter-pop",
          )}
        >
          {lastChar === " " ? "\u00A0" : lastChar}
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          "ml-1 inline-block h-[0.95em] w-[3px] translate-y-[0.1em] rounded-full",
          "bg-gradient-to-b from-primary-200 via-accent-300 to-primary-400",
          "shadow-[0_0_14px_rgba(147,197,253,0.9)]",
          isActivelyTyping
            ? "opacity-100"
            : "animate-login-typewriter-cursor",
        )}
      />
    </h2>
  );
}

const LOGIN_GLOBE_LOTTIE_SRC = "/animations/login-globe.json";

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/p/Affiniks-international-100094319629273/",
    icon: FaFacebookF,
    hoverClass: "hover:border-blue-400/40 hover:bg-blue-500/15 hover:text-blue-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.35)]",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/affiniks_international_?igsh=dGEyYjgwZ3owOTNs",
    icon: FaInstagram,
    hoverClass: "hover:border-pink-400/40 hover:bg-pink-500/15 hover:text-pink-300 hover:shadow-[0_0_20px_rgba(236,72,153,0.35)]",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/affiniksinternational/?originalSubdomain=in",
    icon: FaLinkedinIn,
    hoverClass: "hover:border-sky-400/40 hover:bg-sky-500/15 hover:text-sky-300 hover:shadow-[0_0_20px_rgba(56,189,248,0.35)]",
  },
  {
    label: "X",
    href: "https://x.com/affinikse",
    icon: FaXTwitter,
    hoverClass: "hover:border-slate-300/40 hover:bg-white/10 hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@affiniksinternational7688",
    icon: FaYoutube,
    hoverClass: "hover:border-red-400/40 hover:bg-red-500/15 hover:text-red-300 hover:shadow-[0_0_20px_rgba(248,113,113,0.35)]",
  },
  // {
  //   label: "WhatsApp",
  //   href: "https://wa.me/",
  //   icon: FaWhatsapp,
  //   hoverClass: "hover:border-emerald-400/40 hover:bg-emerald-500/15 hover:text-emerald-300 hover:shadow-[0_0_20px_rgba(52,211,153,0.35)]",
  // },
] as const;

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
  const [headlineComplete, setHeadlineComplete] = useState(false);
  const handleHeadlineComplete = useCallback(() => {
    setHeadlineComplete(true);
  }, []);

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
    <div className="relative min-h-screen flex bg-background dark:bg-slate-950">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
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
          {/* Login Card - plain glass surface */}
          <Card className="relative overflow-hidden rounded-[26px] border border-border bg-card/95 backdrop-blur-xl shadow-lg dark:border-white/10 dark:bg-slate-950/35 dark:shadow-none">
            <CardContent className="px-8 pt-8 pb-0">
              {/* Logo & Brand Label - right side logo UI */}
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center mb-8"
              >
                {/* Logo Container with Glow (no box) */}
                <div className="relative group mb-6">
                  {/* Outer Glow */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition duration-1000" />

                  {/* Logo (theme-aware) */}
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <BrandLogo variant="auth" />
                  </motion.div>

                  {/* Floating Particles Effect */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-10 w-2 h-2 bg-blue-400/60 rounded-full animate-ping" />
                    <div className="absolute bottom-2 right-8 w-1.5 h-1.5 bg-purple-400/60 rounded-full animate-ping delay-300" />
                    <div className="absolute top-8 right-4 w-1 h-1 bg-pink-400/60 rounded-full animate-ping delay-700" />
                  </div>
                </div>

                {/* Brand Name */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="mt-4"
                >
                  <span className="text-xs text-muted-foreground dark:text-gray-400 tracking-widest font-medium">
                    AFFINIKS
                  </span>
                </motion.div>
              </motion.div>
              {/* Header inside card */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-foreground dark:text-white mb-2">
                  Welcome back
                </h1>
                <p className="text-muted-foreground dark:text-white text-sm">
                  Sign in to your Affiniks RMS account
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="mobileNumber"
                    className="text-sm font-medium text-muted-foreground dark:text-slate-300"
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
                            className="h-12 min-h-12 w-full text-base md:text-sm bg-muted border-border text-foreground shadow-xs focus:border-primary/50 focus:ring-primary/20 data-[placeholder]:text-muted-foreground [&_svg]:text-muted-foreground dark:bg-white/5 dark:border-white/10 dark:text-white dark:data-[placeholder]:text-slate-500 dark:[&_svg]:text-slate-400"
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
                        className="pl-10 h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500"
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
                    className="text-sm font-medium text-muted-foreground dark:text-slate-300"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-12 h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500"
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
                      <span className="bg-gradient-to-r from-card via-card to-card/85 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_12px_rgba(255,255,255,0.35)] transition-all duration-300 ease-out group-hover:tracking-wide group-hover:drop-shadow-[0_0_18px_rgba(255,255,255,0.55)]">
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
                <p className="text-xs text-muted-foreground dark:text-white">
                  Protected by enterprise-grade security
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Right side - Headline + Lottie + subtext with running spin animation glow */}
      <div className="relative z-10 hidden flex-[1.4] flex-col items-center justify-center gap-8 p-8 lg:flex">
        {/* Running spin animation as ambient background glow (no border, no box) */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          aria-hidden
        >
          <div className="absolute h-[60rem] w-[60rem] animate-login-panel-border rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#818cf8_72deg,#c084fc_144deg,#6366f1_216deg,transparent_288deg)] opacity-25 blur-3xl" />
        </div>

        {/* Content wrapper */}
        <div className="relative z-10 flex w-full flex-col items-center justify-center gap-8">
        {/* Lottie globe */}
        <div className="relative flex items-center justify-center">
          <DotLottieReact
            src={LOGIN_GLOBE_LOTTIE_SRC}
            loop
            autoplay
            className="relative z-10 h-auto w-[52rem] max-w-full"
          />
        </div>

        {/* Animated headline (below the globe) */}
        <TypewriterHeadline
          text={LOGIN_HEADLINE_TEXT}
          loop={false}
          onComplete={handleHeadlineComplete}
          className="font-['Poppins',sans-serif]"
        />

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={
            headlineComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }
          }
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-xl text-center text-sm leading-relaxed text-slate-300 md:text-base"
        >
          We empower organizations to transcend borders, turning global hiring
          challenges into seamless, barrier-free opportunities for growth.
        </motion.p>

        {/* Social media icons */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: { staggerChildren: 0.08, delayChildren: 0.75 },
            },
          }}
          className="flex flex-col items-center gap-4"
        >
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400"
          >
            Connect with us
          </motion.p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon, hoverClass }) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit Affiniks on ${label}`}
                variants={{
                  hidden: { opacity: 0, y: 16, scale: 0.9 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                whileHover={{ y: -4, scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "group relative flex h-11 w-11 items-center justify-center rounded-full",
                  "border border-white/10 bg-white/5 text-slate-300 backdrop-blur-md",
                  "transition-[box-shadow,background-color,border-color,color] duration-300",
                  hoverClass,
                )}
              >
                <span
                  className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden
                />
                <Icon className="relative z-10 h-4 w-4" aria-hidden />
              </motion.a>
            ))}
          </div>
        </motion.div>
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
