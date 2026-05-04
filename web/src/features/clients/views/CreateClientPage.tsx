import { useEffect, useRef, useState } from "react";
import type { FieldPath, Resolver } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Briefcase,
  Check,
  Save,
  Handshake,
  UserSquare2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCreateClientMutation } from "@/features/clients";
import { useCan } from "@/hooks/useCan";
import {
  clientFormSchema,
  type ClientFormData,
} from "@/features/clients/schemas/client-schemas";
import { PhysicalAddressFields } from "@/components/molecules/PhysicalAddressFields";
import type { CreateClientRequest } from "@/features/clients/api";
import {
  CLIENT_TYPE_LABELS,
  CLIENT_TYPES,
  type ClientTypeValue,
} from "@/features/clients/constants/client-types";
import { cn } from "@/lib/utils";

const clientDetailsStepFields: FieldPath<ClientFormData>[] = [
  "name",
  "type",
  "email",
  "phone",
  "address",
  "addressCountryCode",
  "addressStateId",
];

const STEPS = [
  { id: "client-details", label: "Client details" },
  { id: "sub-client",     label: "Sub-client" },
] as const;

const emptySubClient: NonNullable<ClientFormData["subClient"]> = {
  name: "",
  type: "DIRECT_CLIENT",
  email: "",
  phone: "",
  address: "",
  addressCountryCode: "",
  addressStateId: "",
};

/* ─── Inline stepper ──────────────────────────────────────────────────────── */
function StepIndicator({
  steps,
  currentStep,
  onBack,
}: {
  steps: typeof STEPS;
  currentStep: 0 | 1;
  onBack: () => void;
}) {
  return (
    <nav
      aria-label="Create client progress"
      className="flex items-center gap-0"
    >
      {steps.map((step, index) => {
        const done    = index < currentStep;
        const active  = index === currentStep;
        const isLast  = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => done && onBack()}
              disabled={!done}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium transition-colors",
                done  && "cursor-pointer text-blue-600 hover:bg-blue-50",
                active && "cursor-default text-blue-700",
                !done && !active && "cursor-default text-slate-400",
              )}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                  done   && "border-blue-500 bg-blue-500 text-white",
                  active && "border-blue-600 bg-white text-blue-600",
                  !done && !active && "border-slate-300 bg-white text-slate-400",
                )}
              >
                {done ? <Check className="size-3" /> : index + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>

            {!isLast && (
              <div
                aria-hidden
                className={cn(
                  "mx-1 h-px w-8 rounded-full transition-colors duration-300",
                  currentStep > index ? "bg-blue-400" : "bg-slate-200",
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* ─── Field wrapper (label + input + error in a tight unit) ──────────────── */
function Field({
  label,
  required,
  error,
  children,
  htmlFor,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function CreateClientPage() {
  const navigate = useNavigate();
  const canCreateClients = useCan("manage:clients");
  const [createClient, { isLoading }] = useCreateClientMutation();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema) as Resolver<ClientFormData>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      type: "DIRECT_CLIENT",
      name: "",
      email: "",
      phone: "",
      address: "",
      addressCountryCode: "",
      addressStateId: "",
      subClient: undefined,
      specialties: [],
      locations: [],
    },
  });

  const { control, formState: { errors, isValid }, handleSubmit, trigger, setValue, getValues } = form;

  const clientType = useWatch({ control, name: "type" });

  const needsSubClientStep =
    clientType === "SUB_AGENT" || clientType === "FREELANCE";

  const [wizardStep, setWizardStep] = useState<0 | 1>(0);
  const subClientBackupRef = useRef<Partial<typeof emptySubClient> | undefined>(undefined);

  useEffect(() => {
    if (clientType === "DIRECT_CLIENT") {
      setValue("subClient", undefined, { shouldValidate: true });
      subClientBackupRef.current = undefined;
      setWizardStep(0);
    }
  }, [clientType, setValue]);

  const ensureSubClientShape = () => {
    const existing = getValues("subClient");
    const stash = subClientBackupRef.current;
    setValue(
      "subClient",
      existing
        ? { ...emptySubClient, ...existing }
        : stash
          ? { ...emptySubClient, ...stash }
          : { ...emptySubClient },
      { shouldValidate: true },
    );
    subClientBackupRef.current = undefined;
  };

  const handleNext = async () => {
    const valid = await trigger(clientDetailsStepFields);
    if (!valid) {
      toast.error("Please fix the errors before continuing.");
      return;
    }
    ensureSubClientShape();
    setWizardStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    const currentSub = getValues("subClient");
    subClientBackupRef.current = currentSub !== undefined ? { ...currentSub } : undefined;
    setValue("subClient", undefined, { shouldValidate: true });
    setWizardStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
      const payload: CreateClientRequest = {
        name: data.name.trim(),
        type: data.type,
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        address: data.address?.trim() || undefined,
        addressCountryCode: data.addressCountryCode?.trim() || undefined,
        addressStateId: data.addressStateId?.trim() || undefined,
      };

      if (data.type === "SUB_AGENT" || data.type === "FREELANCE") {
        const sc = data.subClient;
        if (sc?.name?.trim()) {
          payload.subClient = {
            name: sc.name.trim(),
            type: sc.type,
            email: sc.email?.trim() || undefined,
            phone: sc.phone?.trim() || undefined,
            address: sc.address?.trim() || undefined,
            addressCountryCode: sc.addressCountryCode?.trim() || undefined,
            addressStateId: sc.addressStateId?.trim() || undefined,
          };
        }
      }

      const result = await createClient(payload).unwrap();
      if (result.success) {
        toast.success("Client created successfully");
        navigate(`/clients/${result.data.id}`);
      }
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "data" in error &&
        typeof (error as { data?: { message?: string } }).data?.message === "string"
          ? (error as { data: { message: string } }).data.message
          : "Failed to create client";
      toast.error(msg);
    }
  };

  const createWithoutLinkedSub = () => {
    void trigger(clientDetailsStepFields).then((ok) => {
      if (!ok) {
        toast.error("Please fix the errors before continuing.");
        return;
      }
      handleSubmit((data) => void onSubmit({ ...data, subClient: undefined }))();
    });
  };

  const finishWithoutLinkedSub = () => {
    handleSubmit((data) => void onSubmit({ ...data, subClient: undefined }))();
  };

  /* access denied */
  if (!canCreateClients) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-sm rounded-2xl border border-red-100 bg-red-50 p-8 text-center shadow">
          <p className="text-lg font-semibold text-red-700">Access Denied</p>
          <p className="mt-1 text-sm text-red-500">You don&apos;t have permission to create clients.</p>
        </div>
      </div>
    );
  }

  const clientTypeIcons: Record<ClientTypeValue, LucideIcon> = {
    DIRECT_CLIENT: Briefcase,
    SUB_AGENT: Building2,
    FREELANCE: Handshake,
  };
  const ClientTypeIcon = clientTypeIcons[clientType as ClientTypeValue] ?? UserSquare2;

  return (
    <div className="w-full space-y-4">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow">
            <Users className="size-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-slate-900 leading-tight">
              Create Client
            </h1>
            <p className="text-xs text-slate-500 leading-tight">
              {needsSubClientStep
                ? wizardStep === 0
                  ? "Step 1 of 2 — Client details"
                  : "Step 2 of 2 — Sub-client info"
                : "Fill in the client details"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {needsSubClientStep && (
            <StepIndicator
              steps={STEPS}
              currentStep={wizardStep}
              onBack={handleBack}
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/clients")}
            className="h-8 rounded-lg border-slate-200 px-3 text-slate-600"
          >
            <X className="mr-1.5 size-3.5" />
            Cancel
          </Button>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────── */}
      <form
        onSubmit={(e) => {
          if (needsSubClientStep && wizardStep === 0) {
            e.preventDefault();
            return;
          }
          void handleSubmit(onSubmit)(e);
        }}
        className="space-y-4"
        noValidate
      >
        {/* Step 1 — Client details */}
        {(!needsSubClientStep || wizardStep === 0) && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* card header strip */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <ClientTypeIcon className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Client details</p>
                <p className="text-xs text-slate-500">Name and type are required</p>
              </div>
            </div>

            {/* fields grid */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 p-5 sm:grid-cols-2">
              {/* Name */}
              <Field
                label="Client name"
                required
                htmlFor="client-name"
                error={errors.name?.message}
              >
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="client-name"
                      autoComplete="organization"
                      placeholder="e.g. Acme Healthcare"
                      className={cn(
                        "h-9 rounded-lg border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15",
                        errors.name && "border-red-400 focus:border-red-500",
                      )}
                    />
                  )}
                />
              </Field>

              {/* Type */}
              <Field
                label="Client type"
                required
                htmlFor="client-type"
                error={errors.type?.message}
              >
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        id="client-type"
                        className="h-9 rounded-lg border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-0 shadow-lg">
                        {CLIENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="py-2 text-sm">
                            {CLIENT_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              {/* Email */}
              <Field label="Email" htmlFor="email" error={errors.email?.message}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="contact@company.com"
                      className="h-9 rounded-lg border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                    />
                  )}
                />
              </Field>

              {/* Phone */}
              <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="phone"
                      autoComplete="tel"
                      placeholder="+1 (555) 123-4567"
                      className="h-9 rounded-lg border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                    />
                  )}
                />
              </Field>

              {/* Address */}
              <div className="sm:col-span-2">
                <PhysicalAddressFields
                  control={control}
                  setValue={form.setValue}
                  errors={errors}
                  title="Address (optional)"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Sub-client */}
        {needsSubClientStep && wizardStep === 1 && (
            <div className="rounded-2xl border border-violet-100 bg-white shadow-sm">
            {/* card header strip */}
            <div className="flex items-center gap-3 border-b border-violet-100 bg-violet-50/60 px-5 py-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                <Building2 className="size-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Sub-client (end client)</p>
                <p className="text-xs text-slate-500">
                  Choose how the linked organisation is classified. Default is direct
                  (end) client.
                </p>
              </div>
            </div>

            {/* fields grid */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 p-5 sm:grid-cols-2">
              <Field
                label="Sub-client name"
                htmlFor="sc-name"
                error={errors.subClient?.name?.message}
              >
                <Controller
                  name="subClient.name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id="sc-name"
                      placeholder="e.g. Starwood Healthcare"
                      className={cn(
                        "h-9 rounded-lg border-slate-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15",
                        errors.subClient?.name && "border-red-400",
                      )}
                    />
                  )}
                />
              </Field>

              <Field label="Sub-client type" htmlFor="sc-type">
                <Controller
                  name="subClient.type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "DIRECT_CLIENT"}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="sc-type"
                        className="h-9 rounded-lg border-slate-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-0 shadow-lg">
                        {CLIENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="py-2 text-sm">
                            {CLIENT_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              {/* Sub-client email */}
              <Field
                label="Sub-client email"
                htmlFor="sc-email"
                error={errors.subClient?.email?.message}
              >
                <Controller
                  name="subClient.email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id="sc-email"
                      type="email"
                      placeholder="contact@endclient.com"
                      className="h-9 rounded-lg border-slate-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                    />
                  )}
                />
              </Field>

              {/* Sub-client phone */}
              <Field label="Sub-client phone" htmlFor="sc-phone">
                <Controller
                  name="subClient.phone"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id="sc-phone"
                      autoComplete="tel"
                      placeholder="+1 (555) 987-6543"
                      className="h-9 rounded-lg border-slate-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                    />
                  )}
                />
              </Field>

              {/* Sub-client address */}
              <div className="sm:col-span-2">
                <PhysicalAddressFields<ClientFormData>
                  control={control}
                  setValue={form.setValue}
                  errors={errors}
                  fieldPrefix="subClient"
                  title="Sub-client address (optional)"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Action bar ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          {/* left: step hint */}
          <p className="min-w-0 flex-1 text-xs text-slate-400 leading-snug">
            {needsSubClientStep
              ? wizardStep === 0
                ? "Add a linked organisation on the next step, or create this record only."
                : "Adding details below creates a linked client. Leave blank to create the agency or freelancer record only."
              : "Optional contact and address for this client"}
          </p>

          {/* right: action buttons */}
          <div className="flex shrink-0 items-center gap-2">
            {needsSubClientStep && wizardStep === 1 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={finishWithoutLinkedSub}
                  disabled={isLoading || !isValid}
                  className="h-8 whitespace-nowrap rounded-lg border-slate-200 px-3 text-sm"
                >
                  Skip linked org
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="h-8 whitespace-nowrap rounded-lg border-slate-200 px-3 text-sm"
                >
                  <ArrowLeft className="mr-1.5 size-3.5" aria-hidden />
                  Back
                </Button>
              </>
            )}

            {needsSubClientStep && wizardStep === 0 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={createWithoutLinkedSub}
                  disabled={isLoading}
                  className="h-8 rounded-lg border-slate-200 px-3 text-sm"
                >
                  Create without sub-client
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  className="h-8 rounded-lg bg-blue-600 px-4 text-sm text-white hover:bg-blue-700"
                >
                  Next
                  <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !isValid}
                className="h-8 rounded-lg bg-blue-600 px-4 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="mr-1.5 inline-block size-3.5 animate-spin rounded-full border-2 border-white border-b-transparent" />
                ) : (
                  <Save className="mr-1.5 size-3.5" aria-hidden />
                )}
                {isLoading ? "Creating…" : "Create Client"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
