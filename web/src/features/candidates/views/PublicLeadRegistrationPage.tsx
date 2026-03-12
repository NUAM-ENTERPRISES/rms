import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui";
import { User, Mail, Phone, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { useVerifyLeadQuery, useSubmitLeadMutation } from "@/services/metaApi";

const registrationSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  countryCode: z.string().min(1, "Required"),
  mobileNumber: z.string().min(10, "Invalid phone number"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const PublicLeadRegistrationPage: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [success, setSuccess] = useState(false);

  // Queries & Mutations
  const { 
    data: leadData, 
    isLoading: isVerifying, 
    error: verifyError 
  } = useVerifyLeadQuery(shortCode || "", { 
    skip: !shortCode 
  });

  const [submitLead, { isLoading: isSubmitting }] = useSubmitLeadMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange",
  });

  const onSubmit = async (formData: RegistrationFormData) => {
    try {
      await submitLead({ shortCode: shortCode!, data: formData }).unwrap();
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to submit registration");
    }
  };

  if (isVerifying) {
    return <LoadingSpinner size="lg" />;
  }

  if (verifyError) {
    const errorData = (verifyError as any)?.data;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-red-500">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-slate-900">Link Invalid or Expired</CardTitle>
            <CardDescription className="text-slate-600 mt-2">
              {errorData?.message || "This registration link is no longer valid."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-500 mb-6">
              Please message us again on WhatsApp to get a new registration link.
            </p>
            <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.close()}
            >
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-green-500 animate-in fade-in duration-500">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Registration Complete!</CardTitle>
            <CardDescription className="text-slate-600 mt-2">
              Your details have been successfully submitted to Affiniks.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="border-t pt-4 text-slate-500">
              Our recruitment team will review your profile and contact you shortly.
            </p>
            <div className="mt-8">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                onClick={() => window.close()}
              >
                Close Window
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">AFFINIKS</h1>
          <p className="mt-2 text-lg text-slate-600 italic">Connecting Talent with Opportunity</p>
        </div>

        <Card className="shadow-2xl border-0 bg-white">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <User className="h-6 w-6 text-blue-600" />
              Candidate Registration
            </CardTitle>
            <CardDescription>
              Please enter your details accurately to help us match you with the best opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-6 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-slate-700 font-medium">First Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input id="firstName" placeholder="John" className="pl-10" {...register("firstName")} />
                  </div>
                  {errors.firstName && <p className="text-xs text-red-500 font-medium">{errors.firstName.message}</p>}
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-slate-700 font-medium">Last Name *</Label>
                  <Input id="lastName" placeholder="Doe" {...register("lastName")} />
                  {errors.lastName && <p className="text-xs text-red-500 font-medium">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input id="email" type="email" placeholder="john.doe@example.com" className="pl-10" {...register("email")} />
                </div>
                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="countryCode" className="text-slate-700 font-medium">Code *</Label>
                  <Input id="countryCode" placeholder="+91" {...register("countryCode")} />
                  {errors.countryCode && <p className="text-xs text-red-500">{errors.countryCode.message}</p>}
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="mobileNumber" className="text-slate-700 font-medium">Mobile Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input id="mobileNumber" placeholder="9876543210" className="pl-10" {...register("mobileNumber")} />
                  </div>
                  {errors.mobileNumber && <p className="text-xs text-red-500 font-medium">{errors.mobileNumber.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-slate-700 font-medium">Gender *</Label>
                  <Select onValueChange={(val) => setValue("gender", val as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-xs text-red-500 font-medium">{errors.gender.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-slate-700 font-medium">Date of Birth</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input id="dateOfBirth" type="date" className="pl-10" {...register("dateOfBirth")} />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t">
                <Button 
                    type="submit" 
                    className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50"
                    disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                       <LoadingSpinner size="sm" className="min-h-0" />
                      Submitting...
                    </div>
                  ) : "Submit Registration"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <div className="text-center text-slate-400 text-xs py-4">
          Powered by Affiniks RMS © {new Date().getFullYear()} - Secure Registration
        </div>
      </div>
    </div>
  );
};

export default PublicLeadRegistrationPage;
