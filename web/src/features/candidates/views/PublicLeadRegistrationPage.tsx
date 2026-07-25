import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
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
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui";
import { CountryCodeSelect } from "@/components/molecules";
import { BrandLogo } from "@/components/molecules/BrandLogo";
import {
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Info,
  Stethoscope,
  HeartPulse,
  Globe2,
  BriefcaseMedical,
} from "lucide-react";
import {
  useVerifyLeadQuery,
  useSubmitLeadMutation,
  type LeadAssignedRecruiter,
} from "@/services/metaApi";

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

type ResultState = "success" | "already_registered" | null;

const FOCUS_AREAS = [
  { label: "Nurses", icon: HeartPulse },
  { label: "Doctors", icon: Stethoscope },
  { label: "Healthcare Abroad", icon: Globe2 },
  { label: "Non-Healthcare Abroad", icon: BriefcaseMedical },
] as const;

const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-cyan-50/40 to-teal-50">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-200/40 via-transparent to-teal-100/30"
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl"
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl"
    />
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      {children}
      <p className="mt-8 text-center text-xs text-slate-500">
        Affiniks International © {new Date().getFullYear()} · Secure candidate
        registration
      </p>
    </div>
  </div>
);

const BrandPanel: React.FC = () => (
  <section className="flex flex-col justify-center space-y-8 lg:pr-4">
    <BrandLogo variant="auth" />

    <div className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
        Affiniks International
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
        Leading Healthcare Recruiters
      </h1>
      <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
        We established our position as the leading supplier of healthcare
        professionals globally — placing nurses, doctors, and skilled talent
        across healthcare and non-healthcare roles abroad.
      </p>
    </div>

    <ul className="grid grid-cols-2 gap-3">
      {FOCUS_AREAS.map(({ label, icon: Icon }) => (
        <li
          key={label}
          className="flex items-center gap-2.5 rounded-xl border border-sky-100/80 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </li>
      ))}
    </ul>
  </section>
);

const RecruiterCard: React.FC<{
  recruiter: LeadAssignedRecruiter;
  heading?: string;
}> = ({ recruiter, heading = "Your Assigned Recruiter" }) => (
  <div className="mb-6 space-y-4 rounded-2xl border border-sky-100 bg-sky-50/80 p-5 text-left">
    <div className="flex items-center gap-3 border-b border-sky-100 pb-3">
      <div className="rounded-xl bg-teal-600 p-2">
        <User className="h-5 w-5 text-white" />
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800">
          {heading}
        </h3>
        <p className="text-lg font-bold text-slate-800">{recruiter.name}</p>
      </div>
    </div>

    <div className="space-y-2.5">
      <div className="flex items-center gap-3 text-slate-700">
        <div className="rounded-md border border-sky-100 bg-white p-1.5 shadow-sm">
          <Mail className="h-4 w-4 text-sky-600" />
        </div>
        <span className="text-sm font-medium">{recruiter.email}</span>
      </div>

      {recruiter.phone && (
        <div className="flex items-center gap-3 text-slate-700">
          <div className="rounded-md border border-teal-100 bg-white p-1.5 shadow-sm">
            <Phone className="h-4 w-4 text-teal-600" />
          </div>
          <span className="text-sm font-medium">{recruiter.phone}</span>
        </div>
      )}
    </div>

    <p className="pt-1 text-xs italic text-teal-800/70">
      Our recruiter will contact you shortly to discuss next steps.
    </p>
  </div>
);

const StatusCard: React.FC<{
  tone: "error" | "success" | "info";
  title: string;
  description: string;
  body?: string;
  recruiter?: LeadAssignedRecruiter | null;
  recruiterHeading?: string;
}> = ({ tone, title, description, body, recruiter, recruiterHeading }) => {
  const toneStyles = {
    error: {
      border: "border-t-rose-400",
      iconWrap: "bg-rose-50",
      icon: <AlertCircle className="h-9 w-9 text-rose-500" />,
    },
    success: {
      border: "border-t-teal-500",
      iconWrap: "bg-teal-50",
      icon: <CheckCircle2 className="h-9 w-9 text-teal-600" />,
    },
    info: {
      border: "border-t-amber-400",
      iconWrap: "bg-amber-50",
      icon: <Info className="h-9 w-9 text-amber-600" />,
    },
  }[tone];

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-md animate-in fade-in duration-500">
        <div className="mb-6 flex justify-center">
          <BrandLogo variant="auth" />
        </div>
        <Card
          className={`overflow-hidden border-0 border-t-4 bg-white/90 shadow-xl shadow-sky-100/80 backdrop-blur-sm ${toneStyles.border}`}
        >
          <CardHeader className="text-center">
            <div
              className={`mx-auto mb-4 w-fit rounded-full p-3 ${toneStyles.iconWrap}`}
            >
              {toneStyles.icon}
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">
              {title}
            </CardTitle>
            <CardDescription className="mt-2 text-slate-600">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {body && (
              <p className="mb-6 border-t border-sky-100 pt-4 text-sm font-medium text-slate-600">
                {body}
              </p>
            )}
            {recruiter && (
              <RecruiterCard
                recruiter={recruiter}
                heading={recruiterHeading}
              />
            )}
            <Button
              className="h-12 w-full rounded-xl bg-teal-700 font-semibold text-white shadow-md hover:bg-teal-800"
              onClick={() => window.close()}
            >
              Close Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
};

const PublicLeadRegistrationPage: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [resultState, setResultState] = useState<ResultState>(null);
  const [recruiter, setRecruiter] = useState<LeadAssignedRecruiter | null>(null);

  const {
    isLoading: isVerifying,
    error: verifyError,
  } = useVerifyLeadQuery(shortCode || "", {
    skip: !shortCode,
  });

  const [submitLead, { isLoading: isSubmitting }] = useSubmitLeadMutation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange",
  });

  const onSubmit = async (formData: RegistrationFormData) => {
    try {
      const response = await submitLead({
        shortCode: shortCode!,
        data: formData,
      }).unwrap();
      if (response.assignedRecruiter) {
        setRecruiter(response.assignedRecruiter);
      }
      setResultState("success");
    } catch (err: any) {
      const errorData = err?.data;
      if (errorData?.code === "ALREADY_REGISTERED") {
        if (errorData.assignedRecruiter) {
          setRecruiter(errorData.assignedRecruiter);
        }
        setResultState("already_registered");
        return;
      }
      toast.error(errorData?.message || "Failed to submit registration");
    }
  };

  if (isVerifying) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <BrandLogo variant="auth" />
          <LoadingSpinner size="lg" />
          <p className="text-sm text-slate-600">Verifying your registration link…</p>
        </div>
      </PageShell>
    );
  }

  if (verifyError) {
    const errorData = (verifyError as any)?.data;
    return (
      <StatusCard
        tone="error"
        title="Link Invalid or Expired"
        description={
          errorData?.message || "This registration link is no longer valid."
        }
        body="Please message us again on WhatsApp, Instagram, or Messenger to get a new registration link."
      />
    );
  }

  if (resultState === "already_registered") {
    return (
      <StatusCard
        tone="info"
        title="Already in Affiniks"
        description="Your data is already registered with Affiniks."
        body="We already have your details. Please contact your recruiter if you need help."
        recruiter={recruiter}
        recruiterHeading="Your Handling Recruiter"
      />
    );
  }

  if (resultState === "success") {
    return (
      <StatusCard
        tone="success"
        title="Registration Complete!"
        description="Your details have been successfully submitted to Affiniks."
        body="Thank you! A recruiter will reach out to discuss opportunities abroad."
        recruiter={recruiter}
      />
    );
  }

  return (
    <PageShell>
      <div className="grid items-stretch gap-10 lg:grid-cols-2 lg:gap-14">
        <BrandPanel />

        <Card className="border-0 bg-white/85 shadow-xl shadow-sky-100/70 backdrop-blur-sm">
          <CardHeader className="space-y-2 border-b border-sky-100/80 bg-gradient-to-r from-sky-50/80 to-teal-50/50 px-6 py-6">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800 sm:text-2xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
                <User className="h-5 w-5" />
              </span>
              Candidate Registration
            </CardTitle>
            <CardDescription className="text-slate-600">
              Enter your details accurately so we can match you with the right
              healthcare or overseas opportunity.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8 pt-7">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="font-medium text-slate-700">
                    First Name *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="firstName"
                      placeholder="John"
                      className="border-sky-100 bg-white pl-10 focus-visible:ring-teal-500/40"
                      {...register("firstName")}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-xs font-medium text-rose-500">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="font-medium text-slate-700">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    className="border-sky-100 bg-white focus-visible:ring-teal-500/40"
                    {...register("lastName")}
                  />
                  {errors.lastName && (
                    <p className="text-xs font-medium text-rose-500">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium text-slate-700">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    className="border-sky-100 bg-white pl-10 focus-visible:ring-teal-500/40"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs font-medium text-rose-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="countryCode"
                    className="font-medium text-slate-700"
                  >
                    Country Code *
                  </Label>
                  <Controller
                    name="countryCode"
                    control={control}
                    render={({ field }) => (
                      <CountryCodeSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        name={field.name}
                        placeholder="Code"
                        error={errors.countryCode?.message}
                      />
                    )}
                  />
                  {errors.countryCode && (
                    <p className="text-xs text-rose-500">
                      {errors.countryCode.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label
                    htmlFor="mobileNumber"
                    className="font-medium text-slate-700"
                  >
                    Mobile Number *
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="mobileNumber"
                      placeholder="9876543210"
                      className="border-sky-100 bg-white pl-10 focus-visible:ring-teal-500/40"
                      {...register("mobileNumber")}
                    />
                  </div>
                  {errors.mobileNumber && (
                    <p className="text-xs font-medium text-rose-500">
                      {errors.mobileNumber.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gender" className="font-medium text-slate-700">
                    Gender *
                  </Label>
                  <Select
                    onValueChange={(val) => setValue("gender", val as any)}
                  >
                    <SelectTrigger className="border-sky-100 bg-white focus:ring-teal-500/40">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-xs font-medium text-rose-500">
                      {errors.gender.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dateOfBirth"
                    className="font-medium text-slate-700"
                  >
                    Date of Birth
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="dateOfBirth"
                      type="date"
                      className="border-sky-100 bg-white pl-10 focus-visible:ring-teal-500/40"
                      {...register("dateOfBirth")}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-sky-100 pt-6">
                <Button
                  type="submit"
                  className="h-12 w-full text-base font-semibold bg-teal-700 text-white shadow-md transition-all hover:bg-teal-800 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" className="min-h-0" />
                      Submitting...
                    </div>
                  ) : (
                    "Submit Registration"
                  )}
                </Button>
                <p className="mt-3 text-center text-xs text-slate-500">
                  Your information is secure and used only for recruitment
                  matching.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
};

export default PublicLeadRegistrationPage;
