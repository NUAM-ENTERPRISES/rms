import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { User, Save, X, Mail, Phone, Calendar } from "lucide-react";
import { CountryCodeSelect, ProfileImageUpload } from "@/components/molecules";
import { useUpdateCandidateMutation } from "@/features/candidates/api";
import { useUploadCandidateProfileImageMutation } from "@/services/uploadApi";
import { toast } from "sonner";

const personalInfoSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  countryCode: z.string().min(1, "Country code is required"),
  mobileNumber: z
    .string()
    .min(10, "Mobile number must be at least 10 characters")
    .max(15, "Mobile number must not exceed 15 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  source: z.enum(["manual", "meta", "referral"]),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  referralCompanyName: z.string().optional(),
  referralEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  referralCountryCode: z.string().optional(),
  referralPhone: z.string().optional(),
  referralDescription: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.source === "referral" && (!data.referralCompanyName || data.referralCompanyName.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Referral company name is required when source is referral",
      path: ["referralCompanyName"],
    });
  }
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

interface UpdatePersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  initialData: {
    firstName: string;
    lastName: string;
    profileImage?: string | null;
    countryCode?: string;
    mobileNumber?: string;
    email?: string;
    source: string;
    gender?: string;
    dateOfBirth: string;
    referralCompanyName?: string | null;
    referralEmail?: string | null;
    referralCountryCode?: string | null;
    referralPhone?: string | null;
    referralDescription?: string | null;
  };
}

export const UpdatePersonalInfoModal: React.FC<UpdatePersonalInfoModalProps> = ({
  isOpen,
  onClose,
  candidateId,
  initialData,
}) => {
  const [updateCandidate, { isLoading }] = useUpdateCandidateMutation();
  const [uploadProfileImage, { isLoading: uploadingImage }] = useUploadCandidateProfileImageMutation();

  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: initialData.firstName || "",
      lastName: initialData.lastName || "",
      countryCode: initialData.countryCode || "+91",
      mobileNumber: initialData.mobileNumber || "",
      email: initialData.email || "",
      source: (initialData.source as "manual" | "meta" | "referral") || "manual",
      gender: (initialData.gender as "MALE" | "FEMALE" | "OTHER") || "MALE",
      dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split("T")[0] : "",
      referralCompanyName: initialData.referralCompanyName || "",
      referralEmail: initialData.referralEmail || "",
      referralCountryCode: initialData.referralCountryCode || "+91",
      referralPhone: initialData.referralPhone || "",
      referralDescription: initialData.referralDescription || "",
    },
  });

  const source = watch("source");

  useEffect(() => {
    if (isOpen) {
      setSelectedImage(null);
      reset({
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        countryCode: initialData.countryCode || "+91",
        mobileNumber: initialData.mobileNumber || "",
        email: initialData.email || "",
        source: (initialData.source as "manual" | "meta" | "referral") || "manual",
        gender: (initialData.gender as "MALE" | "FEMALE" | "OTHER") || "MALE",
        dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split("T")[0] : "",
        referralCompanyName: initialData.referralCompanyName || "",
        referralEmail: initialData.referralEmail || "",
        referralCountryCode: initialData.referralCountryCode || "+91",
        referralPhone: initialData.referralPhone || "",
        referralDescription: initialData.referralDescription || "",
      });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: PersonalInfoFormData) => {
    try {
      const payload: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        countryCode: data.countryCode,
        mobileNumber: data.mobileNumber,
        source: data.source,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
      };

      // Add optional email if it has a value
      if (data.email && data.email.trim()) {
        payload.email = data.email;
      } else {
        payload.email = null;
      }

      // Handle referral fields
      if (data.source === "referral") {
        payload.referralCompanyName = data.referralCompanyName || null;
        payload.referralDescription = data.referralDescription || null;
        payload.referralCountryCode = data.referralCountryCode || null;
        payload.referralPhone = data.referralPhone || null;
        
        if (data.referralEmail && data.referralEmail.trim()) {
          payload.referralEmail = data.referralEmail;
        } else {
          payload.referralEmail = null;
        }
      } else {
        // Clear referral fields if not a referral anymore
        payload.referralCompanyName = null;
        payload.referralEmail = null;
        payload.referralDescription = null;
        payload.referralPhone = null;
        payload.referralCountryCode = null;
      }

      await updateCandidate({
        id: candidateId,
        ...payload,
      }).unwrap();

      if (selectedImage) {
        try {
          await uploadProfileImage({
            candidateId,
            file: selectedImage,
          }).unwrap();
        } catch (uploadError: any) {
          console.error("Profile image upload failed:", uploadError);
          toast.warning("Candidate updated but profile image upload failed");
        }
      }

      toast.success("Personal information updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update personal information");
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="h-5 w-5 text-blue-600" />
            Update Personal Information
          </DialogTitle>
          <DialogDescription>
            Modify basic candidate details and contact information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-8">
            {/* Profile Image - Left Side */}
            <div className="flex flex-col items-center">
              <ProfileImageUpload
                currentImageUrl={initialData.profileImage || undefined}
                onImageSelected={setSelectedImage}
                onImageRemove={() => setSelectedImage(null)}
                uploading={uploadingImage}
                disabled={isLoading || uploadingImage}
                size="md"
              />
              <p className="text-xs text-slate-500 mt-2 text-center px-4">
                Click to update profile picture
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div className="space-y-2">
              <Label htmlFor="firstName" className="text-slate-700 font-medium">
                First Name *
              </Label>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="firstName"
                    placeholder="John"
                    disabled={isLoading}
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-slate-700 font-medium">
                Last Name *
              </Label>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="lastName"
                    placeholder="Doe"
                    disabled={isLoading}
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                Email Address
              </Label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    disabled={isLoading}
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                Contact Number *
              </Label>
              <div className="flex gap-2">
                <div className="w-28 flex-shrink-0">
                  <Controller
                    name="countryCode"
                    control={control}
                    render={({ field }) => (
                      <CountryCodeSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Code"
                        disabled={isLoading}
                      />
                    )}
                  />
                </div>
                <div className="flex-1">
                  <Controller
                    name="mobileNumber"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="mobileNumber"
                        type="tel"
                        placeholder="9876543210"
                        disabled={isLoading}
                        className="h-11 bg-white border-slate-200"
                      />
                    )}
                  />
                </div>
              </div>
              {errors.mobileNumber && (
                <p className="text-sm text-red-600">{errors.mobileNumber.message}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="text-slate-700 font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                Date of Birth *
              </Label>
              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="dateOfBirth"
                    type="date"
                    disabled={isLoading}
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
              {errors.dateOfBirth && (
                <p className="text-sm text-red-600">{errors.dateOfBirth.message}</p>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Gender *</Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-200">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && (
                <p className="text-sm text-red-600">{errors.gender.message}</p>
              )}
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Source</Label>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-200">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="meta">Meta</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.source && (
                <p className="text-sm text-red-600">{errors.source.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Separator className="my-2" />
            </div>

            {/* Referral Fields */}
            {source === "referral" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="referralCompanyName" className="text-slate-700 font-medium line-clamp-1">
                    Referral Company Name *
                  </Label>
                  <Controller
                    name="referralCompanyName"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="referralCompanyName"
                        placeholder="Global Staffing Solutions"
                        disabled={isLoading}
                        className="h-11 bg-white border-slate-200"
                      />
                    )}
                  />
                  {errors.referralCompanyName && (
                    <p className="text-sm text-red-600">{errors.referralCompanyName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referralEmail" className="text-slate-700 font-medium">
                    Referral Email
                  </Label>
                  <Controller
                    name="referralEmail"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="referralEmail"
                        type="email"
                        placeholder="referrals@globalstaffing.com"
                        disabled={isLoading}
                        className="h-11 bg-white border-slate-200"
                      />
                    )}
                  />
                  {errors.referralEmail && (
                    <p className="text-sm text-red-600">{errors.referralEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Referral Phone</Label>
                  <div className="flex gap-2">
                    <div className="w-32 flex-shrink-0">
                      <Controller
                        name="referralCountryCode"
                        control={control}
                        render={({ field }) => (
                          <CountryCodeSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Code"
                            disabled={isLoading}
                          />
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <Controller
                        name="referralPhone"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="referralPhone"
                            placeholder="9876543210"
                            disabled={isLoading}
                            className="h-11 bg-white border-slate-200"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="referralDescription" className="text-slate-700 font-medium">
                    Referral Description
                  </Label>
                  <Controller
                    name="referralDescription"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="referralDescription"
                        placeholder="Additional details about the referral..."
                        disabled={isLoading}
                        className="bg-white border-slate-200 min-h-[100px]"
                      />
                    )}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
