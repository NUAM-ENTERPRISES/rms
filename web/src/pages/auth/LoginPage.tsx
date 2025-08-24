import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useLoginMutation } from '@/services/authApi';
import { useAppDispatch } from '@/app/hooks';
import { setCredentials } from '@/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

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
        dispatch(setCredentials({
          user: result.data.user,
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
        }));

        toast.success('Welcome back!');
        
        // Handle deep link redirect
        const nextUrl = searchParams.get('next');
        if (nextUrl && nextUrl.startsWith('/')) {
          navigate(decodeURIComponent(nextUrl));
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('root', { message: result.message || 'Login failed' });
      }
    } catch (error: any) {
      const errorMessage = error?.data?.message || 'Invalid email or password';
      setError('root', { message: errorMessage });
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-6">
            <div className="flex justify-center">
              <img 
                src="/logo.png" 
                alt="Affiniks RMS" 
                className="h-12 w-auto"
              />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              {errors.root && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.root.message}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="space-y-4">
              <div className="text-center">
                <Button variant="link" className="text-sm">
                  Forgot password?
                </Button>
              </div>
              
              <div className="text-center">
                <Button variant="outline" className="w-full">
                  Request access
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/10 to-accent/10 items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              Affiniks RMS
            </h2>
            <p className="text-lg text-muted-foreground">
              Streamline your hiring process with our comprehensive recruitment management platform.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              <div className="font-medium">✓ Role-based access</div>
              <div className="font-medium">✓ Team management</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">✓ Candidate tracking</div>
              <div className="font-medium">✓ Analytics & insights</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
