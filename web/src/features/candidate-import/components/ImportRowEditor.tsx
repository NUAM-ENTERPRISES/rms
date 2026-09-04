import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Ban,
  Briefcase,
  CircleCheck,
  RotateCcw,
  Save,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ImportIssueList } from "./ImportIssueList";
import { RecruiterCombobox } from "./RecruiterCombobox";
import type {
  ImportRow,
  RecruiterOption,
  UpdateImportRowPayload,
} from "../data/dto";

const rowSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().optional(),
  countryCode: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{0,3}$/, "Use a format like +91."),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^\d{6,15}$/, "6 to 15 digits, no spaces or symbols."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("")),
  passportNumber: z.string().trim().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  recruiterId: z.string().min(1, "Choose the owning recruiter."),
});

type RowFormValues = z.infer<typeof rowSchema>;

interface ImportRowEditorProps {
  row: ImportRow;
  recruiters: RecruiterOption[];
  onSave: (changes: UpdateImportRowPayload) => void;
  onSkip: () => void;
  onUnskip: () => void;
  onApplyRecruiterToAll: (recruiterId: string) => void;
  isSaving?: boolean;
  isApplyingRecruiter?: boolean;
}

/**
 * Edits one parsed row before it becomes a candidate.
 *
 * Profession comes from the sheet CATEGORY and is shown read-only. Ownership
 * uses a searchable recruiter combobox, with an option to apply that recruiter
 * to every row in the batch.
 */
export function ImportRowEditor({
  row,
  recruiters,
  onSave,
  onSkip,
  onUnskip,
  onApplyRecruiterToAll,
  isSaving,
  isApplyingRecruiter,
}: ImportRowEditorProps) {
  const isSkipped = row.status === "skipped";
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<RowFormValues>({
    resolver: zodResolver(rowSchema),
    defaultValues: {
      firstName: row.normalized.firstName ?? "",
      lastName: row.normalized.lastName ?? "",
      countryCode: row.normalized.countryCode ?? "",
      mobileNumber: row.normalized.mobileNumber ?? "",
      email: row.normalized.email ?? "",
      passportNumber: row.normalized.passportNumber ?? "",
      gender: row.normalized.gender,
      recruiterId: row.recruiterId ?? "",
    },
  });

  useEffect(() => {
    reset({
      firstName: row.normalized.firstName ?? "",
      lastName: row.normalized.lastName ?? "",
      countryCode: row.normalized.countryCode ?? "",
      mobileNumber: row.normalized.mobileNumber ?? "",
      email: row.normalized.email ?? "",
      passportNumber: row.normalized.passportNumber ?? "",
      gender: row.normalized.gender,
      recruiterId: row.recruiterId ?? "",
    });
  }, [row.id, reset, row.normalized, row.recruiterId]);

  const gender = watch("gender");
  const recruiterId = watch("recruiterId");
  const profession = row.mapping?.professionType;
  const professionMatched =
    profession?.decision === "exact" ||
    profession?.decision === "alias" ||
    profession?.decision === "ai_match";

  const submit = handleSubmit((values) => {
    onSave({
      firstName: values.firstName,
      lastName: values.lastName || undefined,
      countryCode: values.countryCode,
      mobileNumber: values.mobileNumber,
      email: values.email || undefined,
      passportNumber: values.passportNumber || undefined,
      gender: values.gender,
      recruiterId: values.recruiterId,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-foreground">
              {row.normalized.firstName} {row.normalized.lastName ?? ""}
            </h2>
            {isSkipped ? (
              <Badge
                variant="secondary"
                className="border-0 bg-muted text-muted-foreground"
              >
                Skipped
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.sheetName} · row {row.rowNumber}
            {row.normalized.mobileNumber
              ? ` · ${row.normalized.countryCode} ${row.normalized.mobileNumber}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {isSkipped ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onUnskip}
              disabled={isSaving}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Unskip
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSkip}
              disabled={isSaving}
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Skip row
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isSaving || !isDirty}>
            <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      {isSkipped ? (
        <p
          className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
          role="status"
        >
          This row is skipped and will not be imported. Click Unskip to include
          it again.
        </p>
      ) : null}

      {row.issues?.length ? <ImportIssueList issues={row.issues} /> : null}

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contact
        </h3>
        <fieldset className="grid gap-3 sm:grid-cols-2" disabled={isSaving}>
          <legend className="sr-only">Contact details</legend>

          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.firstName.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register("lastName")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="countryCode">Country code</Label>
            <Input
              id="countryCode"
              placeholder="+91"
              {...register("countryCode")}
            />
            {errors.countryCode ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.countryCode.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mobileNumber">Mobile number</Label>
            <Input id="mobileNumber" {...register("mobileNumber")} />
            {errors.mobileNumber ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.mobileNumber.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="passportNumber">Passport number</Label>
            <Input id="passportNumber" {...register("passportNumber")} />
          </div>

          <div className="space-y-1.5 sm:col-span-2 sm:max-w-xs">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={gender ?? ""}
              onValueChange={(value) =>
                setValue("gender", value as "MALE" | "FEMALE", {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </fieldset>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ownership
        </h3>
        <div className="space-y-2">
          <RecruiterCombobox
            id="recruiterId"
            recruiters={recruiters}
            value={recruiterId}
            required
            disabled={isSaving || isApplyingRecruiter}
            error={errors.recruiterId?.message}
            onValueChange={(next) =>
              setValue("recruiterId", next, { shouldDirty: true })
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!recruiterId || isSaving || isApplyingRecruiter}
              onClick={() => onApplyRecruiterToAll(recruiterId)}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {isApplyingRecruiter
                ? "Applying..."
                : "Apply recruiter to all"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Sets this recruiter as owner for every candidate in the import.
            </p>
          </div>
        </div>
      </section>

      {profession ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Profession from sheet
          </h3>
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              professionMatched
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-amber-500/40 bg-amber-500/5",
            )}
            data-testid="profession-readonly"
          >
            <div
              className={cn(
                "rounded-lg p-2",
                professionMatched ? "bg-emerald-500/10" : "bg-amber-500/10",
              )}
            >
              <Briefcase
                className={cn(
                  "h-4 w-4",
                  professionMatched
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400",
                )}
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {profession.matchedLabel || profession.raw || "—"}
                </p>
                <Badge
                  variant="secondary"
                  className={cn(
                    "border-0 gap-1 text-[11px]",
                    professionMatched
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                  )}
                >
                  {professionMatched ? (
                    <CircleCheck className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                  )}
                  {professionMatched ? "Matched" : "Needs attention"}
                </Badge>
              </div>
              {profession.raw && profession.matchedLabel ? (
                <p className="text-xs text-muted-foreground">
                  Sheet category: {profession.raw}
                </p>
              ) : null}
              {profession.reason ? (
                <p className="text-xs text-muted-foreground">
                  {profession.reason}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </form>
  );
}
