import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ban, Save } from "lucide-react";
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
import { useQualificationsLookup } from "@/shared/hooks/useQualificationsLookup";
import { CatalogMappingCard } from "./CatalogMappingCard";
import { ImportIssueList } from "./ImportIssueList";
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
  onCatalogChange: (
    field: "professionTypeId" | "qualificationId" | "roleCatalogId",
    id: string,
  ) => void;
  onProposeQualification: (value: string) => void;
  isSaving?: boolean;
}

/**
 * Edits one parsed row before it becomes a candidate.
 *
 * Identity fields are free text under Zod validation; catalog fields are
 * dropdowns of real ids, so a correction can never invent a catalog value.
 */
export function ImportRowEditor({
  row,
  recruiters,
  onSave,
  onSkip,
  onCatalogChange,
  onProposeQualification,
  isSaving,
}: ImportRowEditorProps) {
  const { qualifications } = useQualificationsLookup();

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

  // Selecting a different row must reload the form rather than keep stale edits.
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
    <form onSubmit={submit} className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {row.normalized.firstName} {row.normalized.lastName ?? ""}
          </h2>
          <p className="text-xs text-muted-foreground">
            {row.sheetName} &middot; row {row.rowNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSkip}
            disabled={isSaving}
          >
            <Ban className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Skip row
          </Button>
          <Button type="submit" size="sm" disabled={isSaving || !isDirty}>
            <Save className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      {row.issues?.length ? <ImportIssueList issues={row.issues} /> : null}

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Candidate details</legend>

        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName ? (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {errors.firstName.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" {...register("lastName")} />
        </div>

        <div>
          <Label htmlFor="countryCode">Country code</Label>
          <Input id="countryCode" placeholder="+91" {...register("countryCode")} />
          {errors.countryCode ? (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {errors.countryCode.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="mobileNumber">Mobile number</Label>
          <Input id="mobileNumber" {...register("mobileNumber")} />
          {errors.mobileNumber ? (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {errors.mobileNumber.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email ? (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="passportNumber">Passport number</Label>
          <Input id="passportNumber" {...register("passportNumber")} />
        </div>

        <div>
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

        <div>
          <Label htmlFor="recruiterId">Owning recruiter</Label>
          <Select
            value={recruiterId}
            onValueChange={(value) =>
              setValue("recruiterId", value, { shouldDirty: true })
            }
          >
            <SelectTrigger id="recruiterId">
              <SelectValue placeholder="Choose recruiter" />
            </SelectTrigger>
            <SelectContent>
              {recruiters.map((recruiter) => (
                <SelectItem key={recruiter.id} value={recruiter.id}>
                  {recruiter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.recruiterId ? (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {errors.recruiterId.message}
            </p>
          ) : null}
        </div>
      </fieldset>

      {row.mapping ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Catalog mapping
          </h3>
          <CatalogMappingCard
            title="Profession"
            mapping={row.mapping.professionType}
            onChange={(id) => onCatalogChange("professionTypeId", id)}
            disabled={isSaving}
          />
          <CatalogMappingCard
            title="Qualification"
            mapping={row.mapping.qualification}
            extraOptions={qualifications.map((qualification) => ({
              id: qualification.id,
              label: qualification.shortName || qualification.name,
            }))}
            onChange={(id) => onCatalogChange("qualificationId", id)}
            onProposeNewValue={onProposeQualification}
            disabled={isSaving}
          />
          <CatalogMappingCard
            title="Department / role"
            mapping={row.mapping.role}
            onChange={(id) => onCatalogChange("roleCatalogId", id)}
            disabled={isSaving}
          />
        </section>
      ) : null}
    </form>
  );
}
