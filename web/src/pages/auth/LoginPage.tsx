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
  /** Force light-on-dark text (for the always-dark globe panel). */
  onDarkBackground?: boolean;
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
  onDarkBackground = false,
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

  const headlineGradient = onDarkBackground
    ? "animate-login-hero-gradient bg-gradient-to-r from-slate-100 via-slate-300 to-slate-100 bg-clip-text text-transparent"
    : "animate-login-hero-gradient bg-gradient-to-r from-foreground via-muted-foreground to-foreground bg-clip-text text-transparent dark:from-slate-100 dark:via-slate-300 dark:to-slate-100";

  const cursorClasses = onDarkBackground
    ? "bg-gradient-to-b from-slate-200 via-slate-400 to-slate-300 shadow-[0_0_14px_rgba(255,255,255,0.35)]"
    : "bg-gradient-to-b from-foreground/80 via-muted-foreground to-foreground/60 shadow-[0_0_14px_rgba(148,163,184,0.45)] dark:from-slate-200 dark:via-slate-400 dark:to-slate-300 dark:shadow-[0_0_14px_rgba(255,255,255,0.35)]";

  return (
    <h2
      className={cn(
        "relative text-center text-xl font-bold tracking-tight md:text-2xl xl:text-3xl",
        className,
      )}
      aria-label={text}
    >
      <span className={headlineGradient}>
        {headText}
      </span>
      {lastChar && (
        <span
          key={charCount}
          className={cn(
            headlineGradient,
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
          cursorClasses,
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
    <div className="relative min-h-screen flex bg-background">
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
          className="relative z-10 w-full max-w-lg"
        >
          {/* Login Card - plain glass surface */}
          <Card className="relative overflow-hidden rounded-[26px] border border-border bg-card/95 backdrop-blur-xl shadow-lg dark:border-white/10 dark:bg-black/40 dark:shadow-none">
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
                  <div className="absolute -inset-4 bg-gradient-to-r from-slate-400/20 via-slate-300/15 to-slate-400/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition duration-1000 dark:from-white/10 dark:via-white/5 dark:to-white/10" />

                  {/* Logo (theme-aware) */}
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <BrandLogo variant="auth" />
                  </motion.div>

                  {/* Floating Particles Effect */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-10 w-2 h-2 bg-slate-400/40 rounded-full animate-ping dark:bg-white/30" />
                    <div className="absolute bottom-2 right-8 w-1.5 h-1.5 bg-slate-300/40 rounded-full animate-ping delay-300 dark:bg-white/25" />
                    <div className="absolute top-8 right-4 w-1 h-1 bg-slate-400/40 rounded-full animate-ping delay-700 dark:bg-white/20" />
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
                            className="h-12 min-h-12 w-full text-base md:text-sm bg-muted border-border text-foreground shadow-xs focus:border-border focus:ring-muted/40 data-[placeholder]:text-muted-foreground [&_svg]:text-muted-foreground dark:bg-white/5 dark:border-white/10 dark:text-white dark:data-[placeholder]:text-slate-500 dark:[&_svg]:text-slate-400 dark:focus:border-white/20 dark:focus:ring-white/10"
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
                        className="pl-10 h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-muted/40 transition-all duration-200 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
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
                      className="pl-10 pr-12 h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-muted/40 transition-all duration-200 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                      {...register("password", {
                        onChange: () => clearRootError(),
                      })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 hover:bg-muted text-muted-foreground dark:hover:bg-white/10 dark:text-slate-400"
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
                    "group relative h-12 w-full overflow-hidden rounded-xl border border-border p-0",
                    "bg-foreground text-background",
                    "font-semibold shadow-lg shadow-black/10",
                    "transition-[box-shadow,transform,background-color] duration-300 ease-out",
                    "hover:bg-foreground/90 hover:shadow-xl hover:scale-[1.02]",
                    "active:scale-[0.98]",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "disabled:pointer-events-none disabled:opacity-60 disabled:scale-100",
                    "dark:border-white/15 dark:bg-white dark:text-black dark:shadow-black/40",
                    "dark:hover:bg-slate-100",
                    "before:pointer-events-none before:absolute before:inset-0 before:rounded-xl",
                    "before:bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.35)_50%,transparent_75%)]",
                    "before:translate-x-[-120%] before:transition-transform before:duration-700 before:ease-out",
                    "hover:before:translate-x-[120%]",
                  )}
                >
                  {/* Ambient highlight pulse */}
                  <span
                    className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-40 animate-pulse group-hover:opacity-0 group-disabled:opacity-0 dark:via-black/5"
                    aria-hidden
                  />

                  {isLoading ? (
                    <span className="relative z-10 flex items-center justify-center gap-2 px-4">
                      <span className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                      <span>Signing in...</span>
                    </span>
                  ) : (
                    <span className="relative z-10 flex w-full items-center justify-center gap-2.5 px-4">
                      <span className="font-semibold">Sign in to dashboard</span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 transition-all duration-300 ease-out group-hover:translate-x-1.5 group-hover:scale-110"
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

      {/* Right side - Headline + Lottie + subtext */}
      <div className="relative z-10 hidden flex-[1.4] flex-col items-center justify-center gap-8 p-8 lg:flex">
        {/* Running spin animation as ambient background glow (no border, no box) */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          aria-hidden
        >
          <div className="absolute h-[60rem] w-[60rem] animate-login-panel-border rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(148,163,184,0.18)_72deg,rgba(255,255,255,0.08)_144deg,rgba(100,116,139,0.16)_216deg,transparent_288deg)] opacity-20 blur-3xl dark:opacity-15" />
        </div>

        {/* Content wrapper */}
        <div className="relative z-10 flex w-full flex-col items-center justify-center gap-8">
        {/* Lottie globe — animation strokes are near-white, so invert them to dark in light mode only */}
        <div className="relative flex items-center justify-center">
          <DotLottieReact
            src={LOGIN_GLOBE_LOTTIE_SRC}
            loop
            autoplay
            className="relative z-10 h-auto w-[52rem] max-w-full invert dark:invert-0"
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
          className="max-w-xl text-center text-sm leading-relaxed text-muted-foreground md:text-base dark:text-slate-300"
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
            className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground dark:text-slate-400"
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
                  "border border-border bg-muted/50 text-muted-foreground backdrop-blur-md",
                  "dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
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
