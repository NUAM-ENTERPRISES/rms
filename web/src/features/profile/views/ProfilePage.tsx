import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Key,
  Edit,
  Save,
  X,
  Camera,
  Bell,
} from "lucide-react";
import { format } from "date-fns";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useUploadProfileImageMutation,
  useGetSessionsQuery,
} from "@/features/profile/api";

const profileSchema = {
  name: "",
  email: "",
  mobileNumber: "",
  countryCode: "",
  dateOfBirth: "",
};

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // API calls
  const { data: profileData, isLoading, error } = useGetProfileQuery();
  const { data: sessionsData, isLoading: isLoadingSessions } = useGetSessionsQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();
  const [deleteAccount, { isLoading: isDeleting }] = useDeleteAccountMutation();
  const [uploadProfileImage, { isLoading: isUploading }] =
    useUploadProfileImageMutation();

  const userData = profileData?.data;

  const form = useForm({
    defaultValues: profileSchema,
    mode: "onChange",
  });

  const handleEdit = () => {
    if (!userData) return;
    setIsEditing(true);
    form.reset({
      name: userData.name,
      email: userData.email,
      mobileNumber: userData.mobileNumber,
      countryCode: userData.countryCode,
      dateOfBirth: userData.dateOfBirth,
    });
  };

  const handleSave = async (data: any) => {
    try {
      await updateProfile(data).unwrap();
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for API
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = reader.result as string;
      try {
        await uploadProfileImage({ profileImage: base64String }).unwrap();
        toast.success("Profile image updated successfully");
      } catch (error: any) {
        toast.error(error?.data?.message || "Failed to upload image");
      }
    };
  };

  const handlePasswordChange = async (data: any) => {
    try {
      await changePassword(data).unwrap();
      toast.success("Password updated successfully");
      setShowPasswordDialog(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to change password");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount().unwrap();
      toast.success("Account deletion requested");
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete account");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not provided";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <Shield className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Failed to load profile
              </h2>
              <p className="text-slate-600 mb-4">
                There was an error loading your profile information.
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-slate-400 mb-4">
                <User className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                No profile data
              </h2>
              <p className="text-slate-600">
                Unable to load your profile information.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
            <p className="text-slate-600">
              Manage your personal information and preferences
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <Button
                onClick={handleEdit}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={form.handleSubmit(handleSave)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Overview */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <Avatar className="h-24 w-24 mx-auto">
                      <AvatarImage src={userData.profileImage || ""} />
                      <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {userData.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <Label
                      htmlFor="profile-image-upload"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors shadow-sm border border-slate-200"
                    >
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Label>
                    <Input
                      id="profile-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {userData.name}
                    </h2>
                    <p className="text-slate-600">{userData.email}</p>
                    <div className="flex items-center justify-center space-x-2 mt-2">
                      {userData.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="secondary"
                          className="text-xs"
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-6">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-blue-600" />
                      <span>Personal Information</span>
                    </CardTitle>
                    <CardDescription>
                      Your personal details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        {isEditing ? (
                          <Input
                            id="name"
                            {...form.register("name")}
                            placeholder="Enter your full name"
                          />
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <span className="font-medium">{userData.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        {isEditing ? (
                          <Input
                            id="email"
                            type="email"
                            {...form.register("email")}
                            placeholder="Enter your email"
                          />
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-lg flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span>{userData.email}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile Number</Label>
                        {isEditing ? (
                          <div className="flex space-x-2">
                            <Input
                              id="countryCode"
                              {...form.register("countryCode")}
                              placeholder="+1"
                              className="w-20"
                            />
                            <Input
                              id="mobileNumber"
                              {...form.register("mobileNumber")}
                              placeholder="1234567890"
                            />
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-lg flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span>
                              {userData.countryCode} {userData.mobileNumber}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        {isEditing ? (
                          <Input
                            id="dob"
                            type="date"
                            {...form.register("dateOfBirth")}
                          />
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-lg flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>{formatDate(userData.dateOfBirth)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Professional Information Tab */}
              {/* <TabsContent value="professional" className="space-y-6">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Briefcase className="h-5 w-5 text-green-600" />
                      <span>Professional Information</span>
                    </CardTitle>
                    <CardDescription>
                      Your role, permissions, and professional details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-slate-700">
                          Roles
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {userData.roles.map((role) => (
                            <Badge
                              key={role}
                              variant="secondary"
                              className="text-sm"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-700">
                          Permissions
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {userData.permissions.map((permission) => (
                            <Badge
                              key={permission}
                              variant="outline"
                              className="text-xs"
                            >
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">
                            Member Since
                          </Label>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm">
                              {formatDate(userData.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">
                            Last Login
                          </Label>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm">
                              {formatDateTime(userData.lastLogin)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent> */}

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-red-600" />
                      <span>Security Settings</span>
                    </CardTitle>
                    <CardDescription>
                      Manage your account security and privacy
                    </CardDescription>
                  </CardHeader>
                  {/* <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Key className="h-5 w-5 text-slate-600" />
                          <div>
                            <p className="font-medium">Password</p>
                            <p className="text-sm text-slate-600">
                              Last changed 30 days ago
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setShowPasswordDialog(true)}
                        >
                          Change
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Bell className="h-5 w-5 text-slate-600" />
                          <div>
                            <p className="font-medium">
                              Two-Factor Authentication
                            </p>
                            <p className="text-sm text-slate-600">
                              Add an extra layer of security
                            </p>
                          </div>
                        </div>
                        <Button variant="outline">Enable</Button>
                      </div>
                    </div>
                  </CardContent> */}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Login Sessions Table */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span>Login Sessions</span>
            </CardTitle>
            <CardDescription>
              Your recent login sessions and security information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-700">
                        Device
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">
                        IP Address
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">
                        Login Time
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsData?.data?.length ? (
                      sessionsData.data.map((session) => {
                        const isMobile = session.deviceType === "mobile";
                        const isTablet = session.deviceType === "tablet";
                        const deviceIcon = isMobile ? "📱" : isTablet ? "📱" : "💻";
                        const deviceLabel = isMobile
                          ? "Mobile Device"
                          : isTablet
                          ? "Tablet"
                          : "Desktop";
                        const deviceName =
                          session.browser && session.os
                            ? `${session.browser} on ${session.os}`
                            : session.userAgent?.slice(0, 40) || "Unknown Device";

                        return (
                          <tr
                            key={session.id}
                            className="border-b border-slate-100"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    session.isCurrent
                                      ? "bg-blue-100"
                                      : "bg-gray-100"
                                  }`}
                                >
                                  <span
                                    className={`text-sm ${
                                      session.isCurrent
                                        ? "text-blue-600"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {deviceIcon}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium text-slate-900">
                                    {deviceName}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    {session.isCurrent
                                      ? "Current Session"
                                      : deviceLabel}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {session.ipAddress === "::1" || session.ipAddress === "127.0.0.1"
                                ? "localhost"
                                : session.ipAddress || "—"}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {formatDateTime(session.loginAt)}
                            </td>
                            <td className="py-3 px-4">
                              {session.isActive ? (
                                <Badge
                                  variant="default"
                                  className="bg-green-100 text-green-800"
                                >
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 text-center text-slate-500"
                        >
                          No login sessions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">
                    Security Notice
                  </h4>
                  <p className="text-sm text-slate-600">
                    If you notice any suspicious activity, please change your
                    password immediately.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new one.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  currentPassword: formData.get("currentPassword") as string,
                  newPassword: formData.get("newPassword") as string,
                  confirmPassword: formData.get("confirmPassword") as string,
                };
                handlePasswordChange(data);
              }}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Account Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Account</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove all data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This will permanently delete your
                  account and all associated data.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
