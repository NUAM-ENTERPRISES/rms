import {
  Controller,
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MultiCountrySelect } from "@/components/molecules";
import { FlagWithName } from "@/shared";
import { Languages, Globe2, Plus, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LANGUAGE_PROFICIENCIES,
  RECRUITER_SECTOR_SCOPES,
  type RecruiterProfessionScopeValue,
  type LanguageProficiencyValue,
  type RecruiterSectorScopeValue,
} from "@/features/admin/schemas/user-schemas";
import { useCountriesLookup } from "@/shared/hooks/useCountriesLookup";

const GCC_COUNTRIES = ["SA", "OM", "QA", "AE", "KW", "BH"] as const;

export type RecruiterCapabilityFields = {
  recruiterLanguages: Array<{
    languageCode: string;
    proficiency: LanguageProficiencyValue;
  }>;
  recruiterCountryCoverages: Array<{
    countryCode: string;
    sectorScopes: RecruiterSectorScopeValue[];
  }>;
};

export interface RecruiterCapabilitiesFormCardProps<T extends RecruiterCapabilityFields> {
  control: Control<T>;
  watch: UseFormWatch<T>;
  setValue: UseFormSetValue<T>;
  errors: FieldErrors<T>;
  disabled?: boolean;
  languageOptions: { code: string; name: string }[];
  description: string;
  defaultSectorScopes?: RecruiterSectorScopeValue[];
  selectedSectorScope?: RecruiterProfessionScopeValue;
}

export function RecruiterCapabilitiesFormCard<T extends RecruiterCapabilityFields>({
  control,
  watch,
  setValue,
  errors,
  disabled = false,
  languageOptions,
  description,
  defaultSectorScopes,
  selectedSectorScope,
}: RecruiterCapabilitiesFormCardProps<T>) {
  const { countries } = useCountriesLookup({ limit: 500 });
  const [pendingCountryRemovalIndex, setPendingCountryRemovalIndex] = useState<
    number | null
  >(null);
  const {
    fields: languageFields,
    append: appendLanguage,
    remove: removeLanguage,
  } = useFieldArray({ control, name: "recruiterLanguages" as never });
  const {
    fields: countryFields,
    replace: replaceCountryCoverages,
    remove: removeCountry,
  } = useFieldArray({ control, name: "recruiterCountryCoverages" as never });

  const coverageRows =
    (watch("recruiterCountryCoverages" as never) as
      | RecruiterCapabilityFields["recruiterCountryCoverages"]
      | undefined) ?? [];
  const selectedCountryCodes = coverageRows
    .map((r) => r.countryCode)
    .filter((c): c is string => c.length >= 2);
  const countryNameByCode = new Map(
    countries.map((country) => [country.code.toUpperCase(), country.name])
  );
  const pendingCountryCode =
    pendingCountryRemovalIndex !== null
      ? (
          (watch(
            `recruiterCountryCoverages.${pendingCountryRemovalIndex}.countryCode` as never
          ) as string) || ""
        ).toUpperCase()
      : "";
  const pendingCountryLabel =
    (pendingCountryCode && countryNameByCode.get(pendingCountryCode)) ||
    pendingCountryCode ||
    "this country";

  const resolvedSectorScopes =
    selectedSectorScope === "HEALTHCARE"
      ? ["HEALTHCARE" as const]
      : selectedSectorScope === "NON_HEALTH_CARE"
        ? ["NON_HEALTH_CARE" as const]
        : selectedSectorScope === "BOTH"
          ? (RECRUITER_SECTOR_SCOPES as RecruiterSectorScopeValue[])
          : defaultSectorScopes && defaultSectorScopes.length > 0
            ? defaultSectorScopes
            : (RECRUITER_SECTOR_SCOPES as RecruiterSectorScopeValue[]);

  const sectorScopeLabel =
    selectedSectorScope === "HEALTHCARE"
      ? "Healthcare"
      : selectedSectorScope === "NON_HEALTH_CARE"
        ? "Non-healthcare"
        : "Both";

  const syncCountriesFromMultiSelect = (codes: string[]) => {
    const normalized = Array.from(new Set(codes.filter((c) => c.length >= 2)));
    const current =
      (watch("recruiterCountryCoverages" as never) as
        | RecruiterCapabilityFields["recruiterCountryCoverages"]
        | undefined) ?? [];
    const byCode = new Map(
      current.filter((r) => r.countryCode.length >= 2).map((r) => [r.countryCode, r])
    );
    const next: RecruiterCapabilityFields["recruiterCountryCoverages"] = normalized.map(
      (code) => ({
        countryCode: code,
        sectorScopes: [...(byCode.get(code)?.sectorScopes ?? resolvedSectorScopes)] as RecruiterSectorScopeValue[],
      })
    );
    replaceCountryCoverages(next as never);
  };

  const addGccCountries = () => {
    syncCountriesFromMultiSelect([
      ...selectedCountryCodes,
      ...GCC_COUNTRIES,
    ]);
  };

  const toggleSector = (
    coverageIndex: number,
    scope: RecruiterSectorScopeValue,
    checked: boolean
  ) => {
    const current =
      (watch(`recruiterCountryCoverages.${coverageIndex}.sectorScopes` as never) as
        | RecruiterSectorScopeValue[]
        | undefined) ?? [];
    const next = checked
      ? [...current, scope]
      : current.filter((s) => s !== scope);
    setValue(
      `recruiterCountryCoverages.${coverageIndex}.sectorScopes` as never,
      next as never,
      { shouldValidate: true, shouldDirty: true }
    );
  };

  const langErrors = errors.recruiterLanguages;
  const covErrors = errors.recruiterCountryCoverages;

  useEffect(() => {
    if (!selectedSectorScope) return;
    if (coverageRows.length === 0) return;

    const next = coverageRows.map((row) => ({
      ...row,
      sectorScopes: [...resolvedSectorScopes],
    }));

    const changed = next.some((row, index) => {
      const current = coverageRows[index];
      const currentScopes = current?.sectorScopes ?? [];
      return (
        current.countryCode !== row.countryCode ||
        currentScopes.length !== row.sectorScopes.length ||
        currentScopes.some((scope, scopeIndex) => scope !== row.sectorScopes[scopeIndex])
      );
    });

    if (changed) {
      replaceCountryCoverages(next as never);
    }
  }, [coverageRows, replaceCountryCoverages, resolvedSectorScopes, selectedSectorScope]);

  const disabledHint = `Locked to ${sectorScopeLabel} because recruiter sector scope is set to ${sectorScopeLabel}.`;

  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Languages className="h-5 w-5 text-blue-600" />
          Languages &amp; country coverage
        </CardTitle>
        <CardDescription className="text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              Languages
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={disabled}
              onClick={() =>
                appendLanguage({
                  languageCode: "",
                  proficiency: "SECONDARY",
                } as never)
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              Add language
            </Button>
          </div>
          {langErrors &&
            typeof langErrors === "object" &&
            "message" in langErrors && (
              <p className="text-sm text-red-600">{String(langErrors.message)}</p>
            )}
          {languageFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No languages added yet. Use &quot;Add language&quot; to specify spoken languages
              and proficiency.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-5">
              {languageFields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-border bg-muted/80 p-2.5 space-y-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium text-foreground leading-none">
                      Language {index + 1}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50 shrink-0"
                      disabled={disabled}
                      onClick={() => removeLanguage(index)}
                      aria-label="Remove language"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Language</Label>
                    <Controller
                      name={`recruiterLanguages.${index}.languageCode` as never}
                      control={control}
                      render={({ field: f }) => (
                        <Select
                          value={f.value || undefined}
                          onValueChange={f.onChange}
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-9 border-border bg-card">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {languageOptions.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.name} ({lang.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {Array.isArray(langErrors) && langErrors[index]?.languageCode && (
                      <p className="text-xs text-red-600">
                        {langErrors[index]?.languageCode?.message as string}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Proficiency</Label>
                    <Controller
                      name={`recruiterLanguages.${index}.proficiency` as never}
                      control={control}
                      render={({ field: f }) => (
                        <Select
                          value={f.value}
                          onValueChange={(v) =>
                            f.onChange(v as LanguageProficiencyValue)
                          }
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-9 border-border bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGE_PROFICIENCIES.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p.charAt(0) + p.slice(1).toLowerCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {Array.isArray(langErrors) && langErrors[index]?.proficiency && (
                      <p className="text-xs text-red-600">
                        {langErrors[index]?.proficiency?.message as string}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-muted-foreground" />
              Country coverage
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={disabled}
              onClick={addGccCountries}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add GCC Countries
            </Button>
          </div>
          <MultiCountrySelect
            value={selectedCountryCodes}
            onValueChange={syncCountriesFromMultiSelect}
            label="Countries"
            placeholder="Search and select one or more countries..."
            disabled={disabled}
            error={
              covErrors &&
              typeof covErrors === "object" &&
              "message" in covErrors &&
              !Array.isArray(covErrors)
                ? String(covErrors.message)
                : undefined
            }
          />
          <p className="text-sm text-muted-foreground">
            Pick all countries this user covers, then set sector scope for each country below.
          </p>
          {countryFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No countries selected yet. Use the field above to add countries.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-5">
              {countryFields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-border bg-muted/80 p-3 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-h-9">
                      <FlagWithName
                        countryCode={
                          (watch(
                            `recruiterCountryCoverages.${index}.countryCode` as never
                          ) as string) || ""
                        }
                        size="sm"
                        className="shrink-0"
                        countryName={
                          countryNameByCode.get(
                            ((watch(
                              `recruiterCountryCoverages.${index}.countryCode` as never
                            ) as string) || "").toUpperCase()
                          ) || undefined
                        }
                        showCode
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-600 hover:text-red-800 hover:bg-red-50 shrink-0"
                      disabled={disabled}
                      onClick={() => setPendingCountryRemovalIndex(index)}
                      aria-label="Remove country from coverage"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {Array.isArray(covErrors) && covErrors[index]?.countryCode?.message && (
                    <p className="text-xs text-red-600">
                      {String(covErrors[index]?.countryCode?.message)}
                    </p>
                  )}
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-medium text-muted-foreground mb-1">
                      Sector scope (at least one)
                    </legend>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
                      {RECRUITER_SECTOR_SCOPES.map((scope) => {
                        const scopes =
                          (watch(
                            `recruiterCountryCoverages.${index}.sectorScopes` as never
                          ) as RecruiterSectorScopeValue[] | undefined) ?? [];
                        const locked = !!selectedSectorScope;
                        const checked = scopes.includes(scope);
                        const sectorTooltip = disabledHint;
                        return (
                          <label
                            key={scope}
                            className={`flex items-center gap-2 text-sm text-foreground ${
                              locked ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                            }`}
                          >
                            {locked ? (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex">
                                      <Checkbox
                                        checked={checked}
                                        disabled
                                        aria-label={
                                          scope === "HEALTHCARE"
                                            ? "Healthcare sector"
                                            : "Non healthcare sector"
                                        }
                                      />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{sectorTooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <Checkbox
                                checked={checked}
                                disabled={disabled}
                                onCheckedChange={(v) =>
                                  toggleSector(index, scope, v === true)
                                }
                                aria-label={
                                  scope === "HEALTHCARE"
                                    ? "Healthcare sector"
                                    : "Non healthcare sector"
                                }
                              />
                            )}
                            {scope === "HEALTHCARE" ? "Healthcare" : "Non-healthcare"}
                          </label>
                        );
                      })}
                    </div>
                    {Array.isArray(covErrors) && covErrors[index]?.sectorScopes && (
                      <p className="text-xs text-red-600">
                        {covErrors[index]?.sectorScopes?.message as string}
                      </p>
                    )}
                  </fieldset>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={pendingCountryRemovalIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCountryRemovalIndex(null);
        }}
        onConfirm={() => {
          if (pendingCountryRemovalIndex === null) return;
          removeCountry(pendingCountryRemovalIndex);
          setPendingCountryRemovalIndex(null);
        }}
        title="Remove country coverage?"
        description={`Are you sure you want to remove ${pendingCountryLabel} from this user's country coverage? You can still undo this by discarding form changes before saving.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
      />
    </Card>
  );
}
