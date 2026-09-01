import React from "react";
import { useNavigate } from "react-router-dom";
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
import { X, Save, Mail, User, Lock, Phone, Calendar, Eye, EyeOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CountryCodeSelect,
  RoleSelect,
  ProfileImageUpload,
  PhysicalAddressFields,
  ProfessionTypeMultiSelect,
} from "@/components/molecules";
import { RecruiterCapabilitiesFormCard } from "@/features/admin/components/RecruiterCapabilitiesFormCard";
import {
  useCreateUserMutation,
  useGetRolesQuery,
  useListUserLanguagesQuery,
  useUpdateRecruiterCapabilitiesMutation,
} from "@/features/admin/api";
import { useUploadUserProfileImageMutation } from "@/services/uploadApi";
import { useCan, useHasRole } from "@/hooks/useCan";
import { EMPLOYEE_CODE_EDIT_ROLES } from "@/config/role-capabilities";
import {
  anyProfessionHelperText,
  buildCreateUserSchema,
  type CreateUserFormData,
} from "@/features/admin/schemas/user-schemas";
import { roleNameHasRecruiterCapabilities } from "@/features/admin/constants/recruiter-capability-roles";
import { useDebounce } from "@/hooks/useDebounce";

export default function CreateUserPage() {
  const navigate = useNavigate();
  const canManageUsers = useCan("manage:users");
  const canEditEmployeeCode = useHasRole([...EMPLOYEE_CODE_EDIT_ROLES]);
  const [roleSearch, setRoleSearch] = React.useState("");
  const [roleTypeFilter, setRoleTypeFilter] = React.useState<
    "SYSTEM" | "CUSTOM" | "ALL"
  >("SYSTEM");
  const debouncedRoleSearch = useDebounce(roleSearch, 300);
  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery({
    page: 1,
    limit: 100,
    type: roleTypeFilter,
    search: debouncedRoleSearch.trim() || undefined,
  });
  const roleOptions = rolesData?.data?.roles ?? [];
  const [selectedRoleCache, setSelectedRoleCache] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const [createUser, { isLoading }] = useCreateUserMutation();
  const [updateRecruiterCapabilities, { isLoading: savingRecruiterCaps }] =
    useUpdateRecruiterCapabilitiesMutation();
  const [uploadProfileImage, { isLoading: uploadingImage }] =
    useUploadUserProfileImageMutation();
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const isRecruiterCapabilitiesRoleRef = React.useRef(false);

  const form = useForm<CreateUserFormData>({
    resolver: async (values, context, options) =>
      zodResolver(
        buildCreateUserSchema(isRecruiterCapabilitiesRoleRef.current),
      )(values, context, options),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      employeeCode: "",
      email: "",
      password: "",
      confirmPassword: "",
      countryCode: "+91",
      mobileNumber: "",
      dateOfBirth: "",
      roleId: "",
      addressCountryCode: "",
      addressStateId: "",
      address: "",
      recruiterLanguages: [],
      recruiterCountryCoverages: [],
      recruiterSectorScope: undefined,
      handlesAllProfessions: false,
      professionTypeIds: [],
    },
  });

  const roleId = useWatch({ control: form.control, name: "roleId" });
  React.useEffect(() => {
    const found = roleOptions.find((r) => r.id === roleId);
    if (found) {
      setSelectedRoleCache((prev) =>
        prev?.id === found.id && prev.name === found.name
          ? prev
          : { id: found.id, name: found.name },
      );
      return;
    }
    if (!roleId) {
      setSelectedRoleCache((prev) => (prev === null ? prev : null));
    }
  }, [roleOptions, roleId]);
  const selectedRole = React.useMemo(() => {
    const fromPage = roleOptions.find((r) => r.id === roleId);
    if (fromPage) return fromPage;
    if (selectedRoleCache?.id === roleId) return selectedRoleCache;
    return undefined;
  }, [roleOptions, roleId, selectedRoleCache]);
  const isRecruiterCapabilitiesRole = roleNameHasRecruiterCapabilities(
    selectedRole?.name
  );
  isRecruiterCapabilitiesRoleRef.current = isRecruiterCapabilitiesRole;

  const recruiterSectorScope = useWatch({
    control: form.control,
    name: "recruiterSectorScope",
  });
  const handlesAllProfessions = useWatch({
    control: form.control,
    name: "handlesAllProfessions",
  });
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

  const createUserDisabledReason = React.useMemo(() => {
    if (isLoading) return "Creating user...";
    if (uploadingImage) return "Uploading profile image...";
    if (savingRecruiterCaps) return "Saving recruiter capabilities...";

    const reasons: string[] = [];
    if (!form.formState.isValid) {
      reasons.push("Complete all required fields.");
    }
    if (isRecruiterCapabilitiesRole && !recruiterSectorScope) {
      reasons.push("Recruiter sector scope is required.");
    }
    if (
      isRecruiterCapabilitiesRole &&
      recruiterSectorScope &&
      !handlesAllProfessions &&
      !form.getValues("professionTypeIds")?.length
    ) {
      reasons.push("Select at least one profession type.");
    }

    return reasons.length > 0 ? reasons.join(" ") : "";
  }, [
    form,
    isLoading,
    uploadingImage,
    savingRecruiterCaps,
    isRecruiterCapabilitiesRole,
    recruiterSectorScope,
    handlesAllProfessions,
  ]);

  React.useEffect(() => {
    form.setValue("professionTypeIds", [], { shouldDirty: true, shouldValidate: true });
  }, [recruiterSectorScope, form]);

  React.useEffect(() => {
    if (!isRecruiterCapabilitiesRole) {
      form.setValue("professionTypeIds", [], { shouldDirty: true });
      form.setValue("recruiterSectorScope", undefined, { shouldDirty: true });
      form.setValue("handlesAllProfessions", false, { shouldDirty: true });
    }
  }, [isRecruiterCapabilitiesRole, form]);

  const { data: languagesResponse } = useListUserLanguagesQuery(undefined, {
    skip: !isRecruiterCapabilitiesRole,
  });
  const languageOptions = languagesResponse?.data ?? [];

  React.useEffect(() => {
    if (!isRecruiterCapabilitiesRole) {
      form.setValue("recruiterLanguages", []);
      form.setValue("recruiterCountryCoverages", []);
    }
  }, [isRecruiterCapabilitiesRole, form]);

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      // Prepare form data - convert empty strings to undefined
      const formData = {
        name: data.name,
        employeeCode:
          canEditEmployeeCode && data.employeeCode?.trim()
            ? data.employeeCode.trim()
            : undefined,
        email: data.email,
        password: data.password,
        countryCode: data.countryCode,
        mobileNumber: data.mobileNumber,
        dateOfBirth:
          data.dateOfBirth && data.dateOfBirth.trim() !== ""
            ? data.dateOfBirth
            : undefined,
        roleIds:
          data.roleId && data.roleId.trim() !== ""
            ? [data.roleId]
            : undefined,
        addressCountryCode: data.addressCountryCode?.trim() || undefined,
        addressStateId: data.addressStateId?.trim() || undefined,
        address: data.address?.trim() || undefined,
        professionTypeIds: isRecruiterCapabilitiesRole && !data.handlesAllProfessions
          ? data.professionTypeIds
          : [],
        recruiterSectorScope: isRecruiterCapabilitiesRole
          ? data.recruiterSectorScope
          : undefined,
        handlesAllProfessions: isRecruiterCapabilitiesRole
          ? Boolean(data.handlesAllProfessions)
          : false,
      };

      console.log("Create User - Form Data:", formData);
      console.log("Create User - Role ID:", data.roleId);
      console.log("Create User - Role IDs:", formData.roleIds);

      const result = await createUser(formData).unwrap();

      if (result.success) {
        const role = roleOptions.find((r) => r.id === data.roleId);
        if (roleNameHasRecruiterCapabilities(role?.name)) {
          try {
            await updateRecruiterCapabilities({
              id: result.data.id,
              body: {
                languages: data.recruiterLanguages.map((l) => ({
                  languageCode: l.languageCode,
                  proficiency: l.proficiency,
                })),
                countryCoverages: data.recruiterCountryCoverages.map((c) => ({
                  countryCode: c.countryCode,
                  sectorScopes: [...c.sectorScopes],
                })),
              },
            }).unwrap();
          } catch (capError: unknown) {
            console.error(capError);
            toast.warning(
              "User was created, but recruiter languages / country coverage could not be saved. You can edit them from the user profile."
            );
          }
        }

        // If profile image selected, upload it
        if (selectedImage) {
          try {
            const uploadResult = await uploadProfileImage({
              userId: result.data.id,
              file: selectedImage,
            }).unwrap();
            console.log("Profile image uploaded:", uploadResult);
            toast.success("User and profile image created successfully");
          } catch (uploadError: any) {
            console.error("Profile image upload failed:", uploadError);
            toast.warning("User created but profile image upload failed");
          }
        } else {
          toast.success("User created successfully");
        }

        navigate(`/admin/users/${result.data.id}`);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create user");
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
                You don't have permission to create users.
              </CardDescription>
            </CardHeader>
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
              Create User
            </h1>
            <p className="text-muted-foreground mt-1">Add a new user to the system</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/users")}
            className="h-11 px-6 border-border hover:border-border"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* User Information with Profile Image */}
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                User Information
              </CardTitle>
              <CardDescription>
                Basic information about the user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
                {/* Profile Image - Left Side */}
                <div className="flex flex-col items-center">
                  <ProfileImageUpload
                    onImageSelected={setSelectedImage}
                    onImageRemove={() => setSelectedImage(null)}
                    uploading={uploadingImage}
                    disabled={isLoading || uploadingImage}
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

                  {canEditEmployeeCode ? (
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
                            placeholder="Employee code"
                            className="h-11 border-border focus:border-blue-500 focus:ring-blue-500/20"
                          />
                        )}
                      />
                      {form.formState.errors.employeeCode && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.employeeCode.message}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* Email */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4 text-muted-foreground" />
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

                  {/* Password */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      Password *
                    </Label>
                    <Controller
                      name="password"
                      control={form.control}
                      render={({ field }) => (
                        <div className="relative">
                          <Input
                            {...field}
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Minimum 8 characters with special chars"
                            className="h-11 border-border focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-muted-foreground focus:outline-none"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      )}
                    />
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Must contain uppercase, lowercase, number, and special
                      character
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      Confirm Password *
                    </Label>
                    <Controller
                      name="confirmPassword"
                      control={form.control}
                      render={({ field }) => (
                        <div className="relative">
                          <Input
                            {...field}
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="h-11 border-border focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-muted-foreground focus:outline-none"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      )}
                    />
                    {form.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.confirmPassword.message}
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
                      disabled={isLoading}
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
                  render={({ field }) => (
                    <RoleSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      name="roleId"
                      label="User Role *"
                      placeholder="Select a role for this user..."
                      required={false}
                      disabled={isLoading || rolesLoading}
                      roles={roleOptions}
                      isLoadingRoles={rolesLoading}
                      includeNoRoleOption={false}
                      searchable
                      searchValue={roleSearch}
                      onSearchChange={setRoleSearch}
                      roleTypeFilter={roleTypeFilter}
                      onRoleTypeFilterChange={setRoleTypeFilter}
                      onResetFilters={() => {
                        setRoleSearch("");
                        setRoleTypeFilter("SYSTEM");
                      }}
                      error={form.formState.errors.roleId?.message}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Search and filter inside the dropdown. Results are fetched from roles API.
                </p>
              </div>

              {isRecruiterCapabilitiesRole && (
                <div className="space-y-2">
                  <Controller
                    name="recruiterSectorScope"
                    control={form.control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Recruiter sector scope <span className="text-red-500">*</span>
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
                            disabled={isLoading}
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
                          disabled={isLoading}
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
              disabled={isLoading || savingRecruiterCaps}
              languageOptions={languageOptions}
              selectedSectorScope={recruiterSectorScope}
              defaultSectorScopes={Array.from(defaultCountrySectorScopes)}
              description="Languages and country coverage are saved after the user is created. Add entries as needed."
            />
          )}

          {/* Action Buttons */}
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/users")}
                  className="h-11 px-8 border-border hover:border-border"
                  disabled={isLoading || savingRecruiterCaps}
                >
                  Cancel
                </Button>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          type="submit"
                          disabled={
                            isLoading ||
                            uploadingImage ||
                            savingRecruiterCaps ||
                            !form.formState.isValid
                          }
                          className="h-11 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          {isLoading || uploadingImage || savingRecruiterCaps ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              {uploadingImage
                                ? "Uploading..."
                                : savingRecruiterCaps
                                  ? "Saving capabilities..."
                                  : "Creating..."}
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Create User
                            </>
                          )}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {createUserDisabledReason ? (
                      <TooltipContent side="top" className="max-w-xs text-sm">
                        <p>{createUserDisabledReason}</p>
                      </TooltipContent>
                    ) : null}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
