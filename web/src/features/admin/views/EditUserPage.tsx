import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller, useWatch } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Save, Mail, User, Phone, Calendar } from "lucide-react";
import {
  CountryCodeSelect,
  RoleSelect,
  ProfileImageUpload,
  PhysicalAddressFields,
  ProfessionTypeMultiSelect,
} from "@/components/molecules";
import { RecruiterCapabilitiesFormCard } from "@/features/admin/components/RecruiterCapabilitiesFormCard";
import { DocumentsControlPermissionsFormCard } from "@/features/admin/components/DocumentsControlPermissionsFormCard";
import {
  useGetUserQuery,
  useUpdateUserMutation,
  useListUserLanguagesQuery,
  useUpdateRecruiterCapabilitiesMutation,
  useUpdateDocumentsControlPermissionsMutation,
} from "@/features/admin/api";
import {
  useUploadUserProfileImageMutation,
  useDeleteFileMutation,
} from "@/services/uploadApi";
import { useCan } from "@/hooks/useCan";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import {
  anyProfessionHelperText,
  buildUpdateUserSchema,
  type UpdateUserFormData,
  type LanguageProficiencyValue,
  type RecruiterSectorScopeValue,
  type RecruiterProfessionScopeValue,
} from "@/features/admin/schemas/user-schemas";
import { roleNameHasRecruiterCapabilities } from "@/features/admin/constants/recruiter-capability-roles";
import { useGetCountryByCodeQuery } from "@/shared/hooks/useCountriesLookup";
import { useGetProfessionTypesQuery } from "@/features/candidates/api";

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canManageUsers = useCan("manage:users");

  const { data: userData, isLoading: isLoadingUser } = useGetUserQuery(id!);
  const { data: systemConfig, isLoading: isLoadingSystemConfig } =
    useSystemConfig();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [updateRecruiterCapabilities, { isLoading: savingRecruiterCaps }] =
    useUpdateRecruiterCapabilitiesMutation();
  const [updateDocumentsControlPermissions, { isLoading: savingDocControlCaps }] =
    useUpdateDocumentsControlPermissionsMutation();
  const [uploadProfileImage, { isLoading: uploadingImage }] =
    useUploadUserProfileImageMutation();
  const [deleteFile] = useDeleteFileMutation();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [hasImageChanged, setHasImageChanged] = useState(false);
  const [imageRemoved, setImageRemoved] = useState(false);
  const isRecruiterCapabilitiesRoleRef = useRef(false);
  const prevSectorScopeRef = useRef<string | undefined>(undefined);
  const sectorInitializedRef = useRef(false);

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
    resolver: async (values, context, options) =>
      zodResolver(
        buildUpdateUserSchema(isRecruiterCapabilitiesRoleRef.current),
      )(values, context, options) as ReturnType<
        ReturnType<typeof zodResolver>
      >,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      recruiterLanguages: [],
      recruiterCountryCoverages: [],
      recruiterSectorScope: undefined,
      handlesAllProfessions: false,
      professionTypeIds: [],
      originalDocumentIntakeEnabled: false,
      courierManagementEnabled: false,
    },
  });

  const addressCountryCodeTrimmed = (form.watch("addressCountryCode") ?? "").trim();
  const roleIdWatched = useWatch({ control: form.control, name: "roleId" });
  const selectedRoleForCaps = useMemo(
    () => systemConfig?.data?.roles?.find((r) => r.id === roleIdWatched),
    [systemConfig, roleIdWatched]
  );
  const isRecruiterCapabilitiesRole = roleNameHasRecruiterCapabilities(
    selectedRoleForCaps?.name
  );
  isRecruiterCapabilitiesRoleRef.current = isRecruiterCapabilitiesRole;
  const isDocumentsControlExecutiveRole =
    selectedRoleForCaps?.name === "Documents Control Executive";

  useEffect(() => {
    void form.clearErrors();
    void form.trigger();
  }, [isRecruiterCapabilitiesRole, form]);

  useEffect(() => {
    if (!isDocumentsControlExecutiveRole) return;
    form.setValue("originalDocumentIntakeEnabled", true, { shouldDirty: true });
    form.setValue("courierManagementEnabled", true, { shouldDirty: true });
  }, [isDocumentsControlExecutiveRole, form]);

  const { data: languagesResponse } = useListUserLanguagesQuery(undefined, {
    skip: !isRecruiterCapabilitiesRole,
  });
  const languageOptions = languagesResponse?.data ?? [];
  const { data: allProfessionTypesResponse } = useGetProfessionTypesQuery();
  const allProfessionTypes = allProfessionTypesResponse?.professionTypes ?? [];

  const recruiterSectorScope = useWatch({
    control: form.control,
    name: "recruiterSectorScope",
  });
  const handlesAllProfessions = useWatch({
    control: form.control,
    name: "handlesAllProfessions",
  });
  const selectedProfessionTypeIds = useWatch({
    control: form.control,
    name: "professionTypeIds",
  }) as string[] | undefined;
  const professionTypeSector =
    recruiterSectorScope && recruiterSectorScope !== "BOTH"
      ? recruiterSectorScope
      : undefined;
  const defaultCountrySectorScopes =
    recruiterSectorScope === "HEALTHCARE"
      ? ["HEALTHCARE" as const]
      : recruiterSectorScope === "NON_HEALTH_CARE"
        ? ["NON_HEALTH_CARE" as const]
        : (["HEALTHCARE", "NON_HEALTH_CARE"] as const);

  useEffect(() => {
    if (!isRecruiterCapabilitiesRole) return;
    if (recruiterSectorScope) return;

    const professionIds = selectedProfessionTypeIds ?? [];
    if (professionIds.length === 0 || allProfessionTypes.length === 0) return;

    const selectedTypes = allProfessionTypes.filter((type) =>
      professionIds.includes(type.id)
    );
    if (selectedTypes.length === 0) return;

    const sectors = new Set(selectedTypes.map((type) => type.sector ?? ""));
    const derivedSector =
      sectors.size === 1 && sectors.has("HEALTHCARE")
        ? "HEALTHCARE"
        : sectors.size === 1 && sectors.has("NON_HEALTH_CARE")
          ? "NON_HEALTH_CARE"
          : "BOTH";

    form.setValue("recruiterSectorScope", derivedSector, {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [
    allProfessionTypes,
    isRecruiterCapabilitiesRole,
    selectedProfessionTypeIds,
    recruiterSectorScope,
    form,
  ]);

  // When the user changes sector scope, drop professions outside that sector.
  useEffect(() => {
    if (!isRecruiterCapabilitiesRole) {
      prevSectorScopeRef.current = recruiterSectorScope;
      return;
    }
    if (!sectorInitializedRef.current) {
      if (recruiterSectorScope) {
        sectorInitializedRef.current = true;
        prevSectorScopeRef.current = recruiterSectorScope;
      }
      return;
    }
    if (prevSectorScopeRef.current === recruiterSectorScope) return;
    prevSectorScopeRef.current = recruiterSectorScope;

    const currentIds = form.getValues("professionTypeIds") ?? [];
    if (currentIds.length === 0 || allProfessionTypes.length === 0) return;

    if (!recruiterSectorScope || recruiterSectorScope === "BOTH") return;

    const nextIds = currentIds.filter((id) => {
      const type = allProfessionTypes.find((t) => t.id === id);
      return type?.sector === recruiterSectorScope;
    });
    if (nextIds.length !== currentIds.length) {
      form.setValue("professionTypeIds", nextIds, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [
    recruiterSectorScope,
    isRecruiterCapabilitiesRole,
    allProfessionTypes,
    form,
  ]);
  const prevRecruiterCapRef = useRef(isRecruiterCapabilitiesRole);
  useEffect(() => {
    if (prevRecruiterCapRef.current && !isRecruiterCapabilitiesRole) {
      form.setValue("recruiterLanguages", []);
      form.setValue("recruiterCountryCoverages", []);
      form.setValue("handlesAllProfessions", false);
      form.setValue("recruiterSectorScope", undefined);
      form.setValue("professionTypeIds", []);
    }
    prevRecruiterCapRef.current = isRecruiterCapabilitiesRole;
  }, [isRecruiterCapabilitiesRole, form]);
  const { data: addressCountryMeta } = useGetCountryByCodeQuery(
    addressCountryCodeTrimmed,
    { skip: !addressCountryCodeTrimmed },
  );

  // Load user data into form
  useEffect(() => {
    if (user && systemConfig) {
      const formData = {
        name: user.name || "",
        employeeCode: user.employeeCode || "",
        email: user.email || "",
        countryCode: user.countryCode || "",
        mobileNumber: user.mobileNumber || "",
        dateOfBirth: (() => {
          if (!user.dateOfBirth) {
            return "";
          }
          return typeof user.dateOfBirth === "string"
            ? user.dateOfBirth.split("T")[0]
            : new Date(user.dateOfBirth).toISOString().split("T")[0];
        })(),
        roleId: user.userRoles?.[0]?.role?.id || "no-role",
        addressCountryCode: user.addressCountryCode ?? "",
        addressStateId: user.addressStateId ?? "",
        address: user.address ?? "",
        recruiterLanguages: (user.userLanguages ?? []).map((ul) => ({
          languageCode: ul.languageCode,
          proficiency: ul.proficiency as LanguageProficiencyValue,
        })),
        recruiterCountryCoverages: (user.userCountryCoverages ?? []).map((uc) => ({
          countryCode: uc.countryCode,
          sectorScopes: [...(uc.sectorScopes as RecruiterSectorScopeValue[])],
        })),
        recruiterSectorScope:
          (user.recruiterSectorScope as RecruiterProfessionScopeValue | null | undefined) ??
          undefined,
        handlesAllProfessions: Boolean(user.handlesAllProfessions),
        professionTypeIds: user.handlesAllProfessions
          ? []
          : (user.userProfessionScopes ?? []).map(
              (scope) => scope.professionTypeId,
            ),
        originalDocumentIntakeEnabled:
          user.documentsControlAccess?.originalDocumentIntakeEnabled ?? false,
        courierManagementEnabled:
          user.documentsControlAccess?.courierManagementEnabled ?? false,
      };

      console.log("EditUserPage - Form data being set:", formData);

      // Use reset to set all form values at once
      form.reset(formData);
      sectorInitializedRef.current = false;
      prevSectorScopeRef.current = undefined;

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
        employeeCode:
          data.employeeCode && data.employeeCode.trim() !== ""
            ? data.employeeCode
            : null,
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
        addressCountryCode: data.addressCountryCode?.trim()
          ? data.addressCountryCode.trim()
          : null,
        addressStateId: data.addressStateId?.trim()
          ? data.addressStateId.trim()
          : null,
        address: data.address?.trim() ? data.address.trim() : null,
        professionTypeIds:
          isRecruiterCapabilitiesRole && !data.handlesAllProfessions
            ? data.professionTypeIds
            : [],
        recruiterSectorScope: isRecruiterCapabilitiesRole
          ? data.recruiterSectorScope
          : undefined,
        handlesAllProfessions: isRecruiterCapabilitiesRole
          ? Boolean(data.handlesAllProfessions)
          : false,
      };

      console.log("Edit User - Form Data:", formData);
      console.log("Edit User - Role ID:", data.roleId);
      console.log("Edit User - Role IDs:", formData.roleIds);

      const result = await updateUser({
        id: id!,
        body: formData,
      }).unwrap();

      if (result.success) {
        const role = systemConfig?.data?.roles?.find((r) => r.id === data.roleId);
        try {
          await updateRecruiterCapabilities({
            id: id!,
            body: {
              languages: roleNameHasRecruiterCapabilities(role?.name)
                ? data.recruiterLanguages.map((l) => ({
                    languageCode: l.languageCode,
                    proficiency: l.proficiency,
                  }))
                : [],
              countryCoverages: roleNameHasRecruiterCapabilities(role?.name)
                ? data.recruiterCountryCoverages.map((c) => ({
                    countryCode: c.countryCode,
                    sectorScopes: [...c.sectorScopes],
                  }))
                : [],
            },
          }).unwrap();
        } catch (capErr: unknown) {
          console.error(capErr);
          toast.warning(
            "Profile was updated, but languages / country coverage could not be saved."
          );
        }

        try {
          await updateDocumentsControlPermissions({
            id: id!,
            body: {
              originalDocumentIntakeEnabled: data.originalDocumentIntakeEnabled,
              courierManagementEnabled: data.courierManagementEnabled,
            },
          }).unwrap();
        } catch (capErr: unknown) {
          console.error(capErr);
          toast.warning(
            "Profile was updated, but documents control permissions could not be saved."
          );
        }

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
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground">
                Access Denied
              </CardTitle>
              <CardDescription className="text-muted-foreground">
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
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground">
                Loading User Data...
              </CardTitle>
              <CardDescription className="text-muted-foreground">
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
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground">
                User Not Found
              </CardTitle>
              <CardDescription className="text-muted-foreground">
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Edit User
            </h1>
            <p className="text-muted-foreground mt-1">Update user information</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/users/${id}`)}
            className="h-11 px-6 border-border hover:border-border"
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
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
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
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
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
                          className="h-11 border-border focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      )}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Employee Code */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="employeeCode"
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      Employee Code
                    </Label>
                    <Controller
                      name="employeeCode"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="employeeCode"
                          placeholder="e.g., AFFEMP012026"
                          className="h-11 border-border focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      )}
                    />
                    {form.formState.errors.employeeCode && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.employeeCode.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Format: AFFEMP + 2 digits + year (e.g., AFFEMP012026). Leave
                      empty to remove.
                    </p>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4 text-muted-foreground" />
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
                          className="h-11 border-border focus:border-blue-500 focus:ring-blue-500/20"
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
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
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
                              className="h-11 border-border focus:border-blue-500 focus:ring-blue-500/20"
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
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4 text-muted-foreground" />
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
                          className="h-11 border-border focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      )}
                    />
                    {form.formState.errors.dateOfBirth && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.dateOfBirth.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <PhysicalAddressFields
                      control={form.control}
                      setValue={form.setValue}
                      errors={form.formState.errors}
                      disabled={isUpdating}
                        initialCountryData={
                          addressCountryMeta
                            ? {
                                code: addressCountryMeta.code,
                                name: addressCountryMeta.name,
                              }
                            : undefined
                        }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Assignment */}
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">
                Role Assignment
              </CardTitle>
              <CardDescription className="text-muted-foreground">
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
                        roles={systemConfig?.data?.roles ?? []}
                        isLoadingRoles={isLoadingSystemConfig}
                        error={form.formState.errors.roleId?.message}
                      />
                    );
                  }}
                />
              </div>

              {isRecruiterCapabilitiesRole && (
                <div className="space-y-2">
                  <Controller
                    name="recruiterSectorScope"
                    control={form.control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Recruiter sector scope
                        </Label>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(value) => field.onChange(value)}
                        >
                          <SelectTrigger className="h-11 border-border bg-card">
                            <SelectValue placeholder="Select sector scope" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HEALTHCARE">Healthcare</SelectItem>
                            <SelectItem value="NON_HEALTH_CARE">Non-healthcare</SelectItem>
                            <SelectItem value="BOTH">Both</SelectItem>
                          </SelectContent>
                        </Select>
                        {form.formState.errors.recruiterSectorScope?.message ? (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.recruiterSectorScope.message}
                          </p>
                        ) : null}
                      </div>
                    )}
                  />
                </div>
              )}

              {isRecruiterCapabilitiesRole && recruiterSectorScope ? (
                <div className="space-y-3">
                  <Controller
                    name="handlesAllProfessions"
                    control={form.control}
                    render={({ field }) => (
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="handles-all-professions"
                            checked={Boolean(field.value)}
                            onCheckedChange={(checked) => {
                              const next = checked === true;
                              field.onChange(next);
                              if (next) {
                                form.setValue("professionTypeIds", [], {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }
                            }}
                            disabled={isUpdating}
                          />
                          <div className="space-y-0.5">
                            <Label
                              htmlFor="handles-all-professions"
                              className="text-sm font-medium text-foreground"
                            >
                              Any profession
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {anyProfessionHelperText(recruiterSectorScope)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  />
                  {!handlesAllProfessions ? (
                    <Controller
                      name="professionTypeIds"
                      control={form.control}
                      render={({ field }) => (
                        <ProfessionTypeMultiSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          sector={professionTypeSector}
                          required
                          disabled={isUpdating}
                          error={form.formState.errors.professionTypeIds?.message}
                        />
                      )}
                    />
                  ) : null}
                </div>
              ) : isRecruiterCapabilitiesRole ? (
                <p className="text-sm text-muted-foreground">
                  Select recruiter sector scope first to load the profession coverage list.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {isRecruiterCapabilitiesRole && (
            <RecruiterCapabilitiesFormCard
              control={form.control}
              watch={form.watch}
              setValue={form.setValue}
              errors={form.formState.errors}
              disabled={isUpdating || savingRecruiterCaps}
              languageOptions={languageOptions}
              selectedSectorScope={recruiterSectorScope}
              defaultSectorScopes={Array.from(defaultCountrySectorScopes)}
              description="Set languages and country coverage for this user. Changes are saved when you click Save changes."
            />
          )}

          <DocumentsControlPermissionsFormCard
            control={form.control}
            disabled={isUpdating || savingDocControlCaps}
          />

          {/* Action Buttons */}
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/admin/users/${id}`)}
                  className="h-11 px-8 border-border hover:border-border"
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isUpdating ||
                    uploadingImage ||
                    savingRecruiterCaps ||
                    savingDocControlCaps ||
                    (!form.formState.isDirty && !hasImageChanged)
                  }
                  className="h-11 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isUpdating || uploadingImage || savingRecruiterCaps ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {uploadingImage
                        ? "Uploading..."
                        : savingRecruiterCaps
                          ? "Saving coverage..."
                          : "Updating..."}
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
