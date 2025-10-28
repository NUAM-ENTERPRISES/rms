import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { X, Save, Mail, User, Phone, Calendar } from "lucide-react";
import {
  CountryCodeSelect,
  RoleSelect,
  ProfileImageUpload,
} from "@/components/molecules";
import { useGetUserQuery, useUpdateUserMutation } from "@/features/admin/api";
import {
  useUploadUserProfileImageMutation,
  useDeleteFileMutation,
} from "@/services/uploadApi";
import { useCan } from "@/hooks/useCan";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import {
  updateUserSchema,
  type UpdateUserFormData,
} from "@/features/admin/schemas/user-schemas";

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canManageUsers = useCan("manage:users");

  const { data: userData, isLoading: isLoadingUser } = useGetUserQuery(id!);
  const { data: systemConfig, isLoading: isLoadingSystemConfig } =
    useSystemConfig();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [uploadProfileImage, { isLoading: uploadingImage }] =
    useUploadUserProfileImageMutation();
  const [deleteFile] = useDeleteFileMutation();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [hasImageChanged, setHasImageChanged] = useState(false);
  const [imageRemoved, setImageRemoved] = useState(false);

  const user = userData?.data;

  // Wrapper functions to track image changes
  const handleImageSelected = (file: File | null) => {
    setSelectedImage(file);
    setHasImageChanged(true);
    setImageRemoved(false); // Reset removal flag when new image is selected
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
    setHasImageChanged(true);
    setImageRemoved(true); // Mark that user wants to remove the image
  };

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    mode: "onChange",
    reValidateMode: "onChange",
  });

  // Load user data into form
  useEffect(() => {
    if (user && systemConfig) {
      console.log("EditUserPage - User data:", user);
      console.log("EditUserPage - DateOfBirth:", user.dateOfBirth);
      console.log("EditUserPage - UserRoles:", user.userRoles);
      console.log("EditUserPage - UserRoles[0]:", user.userRoles?.[0]);
      console.log(
        "EditUserPage - UserRoles[0].role:",
        user.userRoles?.[0]?.role
      );
      console.log(
        "EditUserPage - UserRoles[0].role.id:",
        user.userRoles?.[0]?.role?.id
      );
      console.log("EditUserPage - SystemConfig:", systemConfig);

      const formData = {
        name: user.name || "",
        email: user.email || "",
        countryCode: user.countryCode || "",
        mobileNumber: user.mobileNumber || "",
        dateOfBirth: (() => {
          if (!user.dateOfBirth) {
            console.log("EditUserPage - No dateOfBirth, setting empty string");
            return "";
          }
          const dateValue =
            typeof user.dateOfBirth === "string"
              ? user.dateOfBirth.split("T")[0]
              : new Date(user.dateOfBirth).toISOString().split("T")[0];
          console.log("EditUserPage - Processed dateOfBirth:", dateValue);
          return dateValue;
        })(),
        roleId: (() => {
          const roleId = user.userRoles?.[0]?.role?.id;
          console.log("EditUserPage - Extracted roleId:", roleId);
          return roleId || "no-role";
        })(),
      };

      console.log("EditUserPage - Form data being set:", formData);

      // Use reset to set all form values at once
      form.reset(formData);

      // Also set the roleId specifically with shouldValidate and shouldDirty
      if (formData.roleId && formData.roleId !== "no-role") {
        console.log(
          "EditUserPage - Setting roleId explicitly:",
          formData.roleId
        );
        form.setValue("roleId", formData.roleId, {
          shouldValidate: true,
          shouldDirty: true,
        });

        // Try setting it again after a small delay
        setTimeout(() => {
          console.log(
            "EditUserPage - Setting roleId again after delay:",
            formData.roleId
          );
          form.setValue("roleId", formData.roleId, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }, 50);
      }

      // Add a small delay to ensure components have time to render
      setTimeout(() => {
        console.log("EditUserPage - Form values after reset:", {
          name: form.getValues("name"),
          email: form.getValues("email"),
          countryCode: form.getValues("countryCode"),
          mobileNumber: form.getValues("mobileNumber"),
          dateOfBirth: form.getValues("dateOfBirth"),
          roleId: form.getValues("roleId"),
        });

        // Check if the roleId is actually set in the form
        const currentRoleId = form.getValues("roleId");
        console.log("EditUserPage - Current roleId from form:", currentRoleId);

        // Check if the role exists in the system config
        const availableRoles = systemConfig?.data?.roles || [];
        const roleExists = availableRoles.find(
          (role) => role.id === currentRoleId
        );
        console.log(
          "EditUserPage - Available roles:",
          availableRoles.map((r) => ({ id: r.id, name: r.name }))
        );
        console.log("EditUserPage - Role exists:", roleExists);

        // Force form to update and trigger validation
        form.trigger();
      }, 100);
    }
  }, [user, systemConfig, form]);

  const onSubmit = async (data: UpdateUserFormData) => {
    try {
      // Prepare form data - convert empty strings to undefined
      const formData = {
        name: data.name && data.name.trim() !== "" ? data.name : undefined,
        email: data.email && data.email.trim() !== "" ? data.email : undefined,
        countryCode:
          data.countryCode && data.countryCode.trim() !== ""
            ? data.countryCode
            : undefined,
        mobileNumber:
          data.mobileNumber && data.mobileNumber.trim() !== ""
            ? data.mobileNumber
            : undefined,
        dateOfBirth:
          data.dateOfBirth && data.dateOfBirth.trim() !== ""
            ? data.dateOfBirth
            : undefined,
        roleIds:
          data.roleId && data.roleId.trim() !== "" && data.roleId !== "no-role"
            ? [data.roleId]
            : undefined,
      };

      console.log("Edit User - Form Data:", formData);
      console.log("Edit User - Role ID:", data.roleId);
      console.log("Edit User - Role IDs:", formData.roleIds);

      const result = await updateUser({
        id: id!,
        body: formData,
      }).unwrap();

      if (result.success) {
        // Handle profile image changes
        if (selectedImage) {
          // Upload new image
          try {
            await uploadProfileImage({
              userId: id!,
              file: selectedImage,
            }).unwrap();
            toast.success("User and profile image updated successfully");
          } catch (uploadError: any) {
            console.error("Profile image upload failed:", uploadError);
            toast.warning("User updated but profile image upload failed");
          }
        } else if (imageRemoved && user?.profileImage) {
          // Delete existing image
          try {
            await deleteFile(user.profileImage).unwrap();
            toast.success(
              "User updated and profile image removed successfully"
            );
          } catch (deleteError: any) {
            console.error("Profile image deletion failed:", deleteError);
            toast.warning("User updated but profile image removal failed");
          }
        } else {
          toast.success("User updated successfully");
        }

        // Reset image change state after successful update
        setHasImageChanged(false);
        setSelectedImage(null);
        setImageRemoved(false);

        navigate(`/admin/users/${id}`);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update user");
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
                You don't have permission to edit users.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (isLoadingUser || isLoadingSystemConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Loading User Data...
              </CardTitle>
              <CardDescription className="text-slate-600">
                Please wait while we load the user information.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                User Not Found
              </CardTitle>
              <CardDescription className="text-slate-600">
                The user you're trying to edit doesn't exist.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <Button onClick={() => navigate("/admin/users")}>
                Go to Users List
              </Button>
            </CardContent>
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
              Edit User
            </h1>
            <p className="text-slate-600 mt-1">Update user information</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/users/${id}`)}
            className="h-11 px-6 border-slate-200 hover:border-slate-300"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
          key={user?.id}
        >
          {/* User Information with Profile Image */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                User Information
              </CardTitle>
              <CardDescription>
                Update basic information about the user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
                {/* Profile Image - Left Side */}
                <div className="flex flex-col items-center">
                  <ProfileImageUpload
                    currentImageUrl={user?.profileImage}
                    onImageSelected={handleImageSelected}
                    onImageRemove={handleImageRemove}
                    uploading={uploadingImage}
                    disabled={isUpdating || uploadingImage}
                    size="md"
                  />
                </div>

                {/* Form Fields - Right Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-slate-700 flex items-center gap-2"
                    >
                      <User className="h-4 w-4 text-slate-500" />
                      Full Name
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
                      Email Address
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

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="mobileNumber"
                      className="text-sm font-medium text-slate-700 flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4 text-slate-500" />
                      Phone Number
                    </Label>
                    <div className="flex gap-2">
                      <div className="w-32 flex-shrink-0">
                        <Controller
                          name="countryCode"
                          control={form.control}
                          render={({ field }) => (
                            <CountryCodeSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              name={field.name}
                              placeholder="Code"
                              error={form.formState.errors.countryCode?.message}
                            />
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Controller
                          name="mobileNumber"
                          control={form.control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="mobileNumber"
                              type="tel"
                              placeholder="9876543210"
                              className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                            />
                          )}
                        />
                      </div>
                    </div>
                    {form.formState.errors.mobileNumber && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.mobileNumber.message}
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
                      Date of Birth *
                    </Label>
                    <Controller
                      name="dateOfBirth"
                      control={form.control}
                      render={({ field }) => {
                        console.log(
                          "EditUserPage - DateOfBirth field value:",
                          field.value
                        );
                        return (
                          <Input
                            {...field}
                            id="dateOfBirth"
                            type="date"
                            className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                          />
                        );
                      }}
                    />
                    {form.formState.errors.dateOfBirth && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.dateOfBirth.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Assignment */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800">
                Role Assignment
              </CardTitle>
              <CardDescription className="text-slate-600">
                Assign a role to define user permissions and access levels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Controller
                  name="roleId"
                  control={form.control}
                  render={({ field }) => {
                    console.log(
                      "EditUserPage - RoleSelect field value:",
                      field.value
                    );
                    console.log(
                      "EditUserPage - RoleSelect field onChange:",
                      field.onChange
                    );
                    console.log(
                      "EditUserPage - RoleSelect field name:",
                      field.name
                    );

                    // Check if the value is actually set
                    const formRoleId = form.getValues("roleId");
                    console.log(
                      "EditUserPage - Form roleId at render time:",
                      formRoleId
                    );

                    return (
                      <RoleSelect
                        key={`role-select-${
                          systemConfig?.data?.roles?.length || 0
                        }-${field.value || "empty"}`}
                        value={field.value || formRoleId}
                        onValueChange={field.onChange}
                        name="roleId"
                        label="User Role *"
                        placeholder="Select a role for this user..."
                        required={false}
                        disabled={isUpdating}
                        error={form.formState.errors.roleId?.message}
                      />
                    );
                  }}
                />
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
                  onClick={() => navigate(`/admin/users/${id}`)}
                  className="h-11 px-8 border-slate-200 hover:border-slate-300"
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isUpdating ||
                    uploadingImage ||
                    (!form.formState.isDirty && !hasImageChanged)
                  }
                  className="h-11 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isUpdating || uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {uploadingImage ? "Uploading..." : "Updating..."}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
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
