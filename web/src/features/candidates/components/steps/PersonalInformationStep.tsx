import React from "react";
import {
  Control,
  Controller,
  FieldErrors,
  useWatch,
} from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCodeSelect } from "@/components/molecules";
import { ProfileImageUpload } from "@/components/molecules/ProfileImageUpload";
import { User, Phone, Mail, Calendar } from "lucide-react";

type CreateCandidateFormData = {
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  email?: string;
  source: "manual" | "meta" | "referral";
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  referralCompanyName?: string;
  referralEmail?: string;
  referralCountryCode?: string;
  referralPhone?: string;
  referralDescription?: string;
  [key: string]: any;
};

interface PersonalInformationStepProps {
  control: Control<CreateCandidateFormData>;
  errors: FieldErrors<CreateCandidateFormData>;
  selectedImage: File | null;
  setSelectedImage: (image: File | null) => void;
  uploadingImage: boolean;
  isLoading: boolean;
}

export const PersonalInformationStep: React.FC<PersonalInformationStepProps> = ({
  control,
  errors,
  setSelectedImage,
  uploadingImage,
  isLoading,
}) => {
  const source = useWatch({
    control,
    name: "source",
  });

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <User className="h-5 w-5 text-blue-600" />
          Personal Information
        </CardTitle>
        <CardDescription>Basic candidate information and contact details</CardDescription>
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
            {/* First Name */}
            <div className="space-y-2">
              <Label
                htmlFor="firstName"
                className="text-slate-700 font-medium"
              >
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
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">
                  {errors.firstName.message as string}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label
                htmlFor="lastName"
                className="text-slate-700 font-medium"
              >
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
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">
                  {errors.lastName.message as string}
                </p>
              )}
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-500" />
                Contact Number *
              </Label>
              <div className="flex gap-2">
                <div className="w-32 flex-shrink-0">
                  <Controller
                    name="countryCode"
                    control={control}
                    render={({ field }) => (
                      <CountryCodeSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        name={field.name}
                        placeholder="Code"
                        error={errors.countryCode?.message as string}
                      />
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Controller
                    name="mobileNumber"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="mobileNumber"
                        type="tel"
                        placeholder="9876543210"
                        className="h-11 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                </div>
              </div>
              {errors.mobileNumber && (
                <p className="text-sm text-red-600">
                  {errors.mobileNumber.message as string}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-slate-700 font-medium"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="john.doe@example.com"
                      className="h-11 pl-10 bg-white border-slate-200"
                    />
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">
                  {errors.email.message as string}
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label
                htmlFor="dateOfBirth"
                className="text-slate-700 font-medium"
              >
                Date of Birth *
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Controller
                  name="dateOfBirth"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="dateOfBirth"
                      type="date"
                      className="h-11 pl-10 bg-white border-slate-200"
                    />
                  )}
                />
              </div>
              {errors.dateOfBirth && (
                <p className="text-sm text-red-600">
                  {errors.dateOfBirth.message as string}
                </p>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Gender *
              </Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
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
                <p className="text-sm text-red-600">
                  {errors.gender.message as string}
                </p>
              )}
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Source
              </Label>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
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
                <p className="text-sm text-red-600">
                  {errors.source.message as string}
                </p>
              )}
            </div>

            {/* Referral Information */}
            {source === "referral" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="referralCompanyName" className="text-slate-700 font-medium">
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
                        className="h-11 bg-white border-slate-200"
                      />
                    )}
                  />
                  {errors.referralCompanyName && (
                    <p className="text-sm text-red-600">
                      {errors.referralCompanyName.message as string}
                    </p>
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
                        className="h-11 bg-white border-slate-200"
                      />
                    )}
                  />
                  {errors.referralEmail && (
                    <p className="text-sm text-red-600">
                      {errors.referralEmail.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referralPhone" className="text-slate-700 font-medium">
                    Referral Phone
                  </Label>
                  <div className="flex gap-2">
                    <div className="w-32 flex-shrink-0">
                      <Controller
                        name="referralCountryCode"
                        control={control}
                        render={({ field }) => (
                          <CountryCodeSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            name={field.name}
                            placeholder="Code"
                            error={errors.referralCountryCode?.message as string}
                          />
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Controller
                        name="referralPhone"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="referralPhone"
                            placeholder="9876543210"
                            className="h-11 bg-white border-slate-200"
                          />
                        )}
                      />
                    </div>
                  </div>
                  {errors.referralPhone && (
                    <p className="text-sm text-red-600">
                      {errors.referralPhone.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
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
                        placeholder="Candidate recommended by our partner agency."
                        className="bg-white border-slate-200 min-h-[100px]"
                      />
                    )}
                  />
                  {errors.referralDescription && (
                    <p className="text-sm text-red-600">
                      {errors.referralDescription.message as string}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalInformationStep;