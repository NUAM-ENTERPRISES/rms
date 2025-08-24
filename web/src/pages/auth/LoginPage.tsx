import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import { useLoginMutation } from "@/services/authApi";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials } from "@/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
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
      className={`hidden lg:flex flex-1 items-center justify-center p-8 relative z-10 ${className}`}
    >
      <div className="bg-[#0D0E10] rounded-[28px] overflow-hidden relative w-full h-full">
        {/* Background Texture & Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20"></div>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")`,
          }}
        ></div>

        {/* Hero Mark - Stylized "A" */}
        <div className="absolute top-20 right-16 w-48 h-48 opacity-10">
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
          <div className="flex items-center space-x-3 mb-6">
            {logoSrc ? (
              <img src={logoSrc} alt="Affiniks logo" className="h-16 w-auto" />
            ) : (
              <div className="h-6 w-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">A</span>
              </div>
            )}
          </div>
          <div className="mt-2 mb-8">
            <span className="text-xs text-gray-400 tracking-widest font-medium drop-shadow-2xl drop-shadow-amber-200">
              AFFINIKS
            </span>
          </div>
          {/* Main Heading */}
          <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-widest mt-2 leading-tight drop-shadow-2xl drop-shadow-amber-200">
            {headline}
          </h2>

          {/* Body Copy */}
          <p className="text-sm text-gray-300 mt-3 leading-relaxed max-w-md">
            {subhead}
          </p>

          {/* Metric Line */}
          <p className="text-xs text-gray-400 mt-4 font-medium">{statLine}</p>

          {/* CTA Bubble Card */}
          <div className="mt-16 w-3/4 ">
            <div className="bg-white/5 backdrop-blur-sm ring-1 ring-white/10 rounded-2xl p-6 relative shadow-lg shadow-blue-100">
              {/* Right-edge bite/tab */}
              <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-8 bg-[#0D0E10] rounded-l-full"></div>

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
                  <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-[#0D0E10]">
                    JD
                  </div>
                  <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-[#0D0E10]">
                    SM
                  </div>
                  <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-[#0D0E10]">
                    RK
                  </div>
                  <div className="w-7 h-7 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-[#0D0E10]">
                    +2
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Spacing */}
          <div className="flex-1"></div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data).unwrap();

      if (result.success) {
        dispatch(
          setCredentials({
            user: result.data.user,
            accessToken: result.data.accessToken,
            refreshToken: result.data.refreshToken,
          })
        );

        toast.success("Welcome back!");

        // Handle deep link redirect
        const nextUrl = searchParams.get("next");
        if (nextUrl && nextUrl.startsWith("/")) {
          navigate(decodeURIComponent(nextUrl));
        } else {
          navigate("/dashboard");
        }
      } else {
        setError("root", { message: result.message || "Login failed" });
      }
    } catch (error: any) {
      const errorMessage = error?.data?.message || "Invalid email or password";
      setError("root", { message: errorMessage });
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-lg">
          {/* Login Card */}
          <Card className="backdrop-blur-sm bg-white/70 border-white/20 shadow-2xl">
            <CardContent className="px-8 pt-8 pb-0">
              {/* Logo and Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-full h-25 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl p-4">
                  <img
                    src="/logo.png"
                    alt="Affiniks RMS"
                    className="h-17 w-auto filter"
                  />
                </div>
              </div>
              {/* Header inside card */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Welcome back
                </h1>
                <p className="text-slate-600">
                  Sign in to your Affiniks RMS account
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-slate-700"
                  >
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10 h-12 bg-white/50 border-slate-200 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-12 h-12 bg-white/50 border-slate-200 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200"
                      {...register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 hover:bg-slate-100/50"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {errors.root && (
                  <Alert
                    variant="destructive"
                    className="bg-red-50 border-red-200"
                  >
                    <AlertDescription className="text-red-700">
                      {errors.root.message}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>Sign in to dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-8 space-y-4">
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
              </div>
              {/* Footer */}
              <div className="text-center mt-8">
                <p className="text-xs text-slate-500">
                  Protected by enterprise-grade security
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - RmsRightPanel */}
      <RmsRightPanel logoSrc="/logo.png" />
    </div>
  );
}
