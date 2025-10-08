import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  X,
  Save,
  Mail,
  User,
  Lock,
  Phone,
  Calendar,
} from "lucide-react";
import { useCreateUserMutation } from "@/features/admin/api";
import { useCan } from "@/hooks/useCan";
import {
  createUserSchema,
  type CreateUserFormData,
} from "@/features/admin/schemas/user-schemas";

export default function CreateUserPage() {
  const navigate = useNavigate();
  const canManageUsers = useCan("manage:users");

  const [createUser, { isLoading }] = useCreateUserMutation();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      dateOfBirth: "",
    },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      // Prepare form data - convert empty strings to undefined
      const formData = {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone && data.phone.trim() !== "" ? data.phone : undefined,
        dateOfBirth:
          data.dateOfBirth && data.dateOfBirth.trim() !== ""
            ? data.dateOfBirth
            : undefined,
      };

      const result = await createUser(formData).unwrap();

      if (result.success) {
        toast.success("User created successfully");
        navigate(`/admin/users/${result.data.id}`);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create user");
    }
  };

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to create users.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              Create User
            </h1>
            <p className="text-slate-600 mt-1">Add a new user to the system</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/users")}
            className="h-11 px-6 border-slate-200 hover:border-slate-300"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic User Information */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                User Information
              </CardTitle>
              <CardDescription>
                Basic information about the user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-slate-700 flex items-center gap-2"
                  >
                    <User className="h-4 w-4 text-slate-500" />
                    Full Name *
                  </Label>
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="name"
                        placeholder="e.g., John Doe"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-slate-700 flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4 text-slate-500" />
                    Email Address *
                  </Label>
                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        placeholder="e.g., john.doe@affiniks.com"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700 flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4 text-slate-500" />
                    Password *
                  </Label>
                  <Controller
                    name="password"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="password"
                        type="password"
                        placeholder="Minimum 8 characters with special chars"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Must contain uppercase, lowercase, number, and special
                    character
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-sm font-medium text-slate-700 flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4 text-slate-500" />
                    Phone Number
                  </Label>
                  <Controller
                    name="phone"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="phone"
                        type="tel"
                        placeholder="e.g., +1234567890"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label
                    htmlFor="dateOfBirth"
                    className="text-sm font-medium text-slate-700 flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4 text-slate-500" />
                    Date of Birth
                  </Label>
                  <Controller
                    name="dateOfBirth"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="dateOfBirth"
                        type="date"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.dateOfBirth && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.dateOfBirth.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/users")}
                  className="h-11 px-8 border-slate-200 hover:border-slate-300"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !form.formState.isValid}
                  className="h-11 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
