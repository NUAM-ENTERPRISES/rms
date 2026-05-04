import {
  Controller,
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
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
import { MultiCountrySelect } from "@/components/molecules";
import { FlagIcon } from "@/shared";
import { Languages, Globe2, Plus, Trash2 } from "lucide-react";
import {
  LANGUAGE_PROFICIENCIES,
  RECRUITER_SECTOR_SCOPES,
  type LanguageProficiencyValue,
  type RecruiterSectorScopeValue,
} from "@/features/admin/schemas/user-schemas";

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
}

export function RecruiterCapabilitiesFormCard<T extends RecruiterCapabilityFields>({
  control,
  watch,
  setValue,
  errors,
  disabled = false,
  languageOptions,
  description,
}: RecruiterCapabilitiesFormCardProps<T>) {
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

  const syncCountriesFromMultiSelect = (codes: string[]) => {
    const normalized = codes.filter((c) => c.length >= 2);
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
        sectorScopes: [...(byCode.get(code)?.sectorScopes ?? [])] as RecruiterSectorScopeValue[],
      })
    );
    replaceCountryCoverages(next as never);
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

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Languages className="h-5 w-5 text-blue-600" />
          Languages &amp; country coverage
        </CardTitle>
        <CardDescription className="text-slate-600">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Languages className="h-4 w-4 text-slate-500" />
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
            <p className="text-sm text-slate-500">
              No languages added yet. Use &quot;Add language&quot; to specify spoken languages
              and proficiency.
            </p>
          ) : (
            <div className="space-y-3">
              {languageFields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-col sm:flex-row gap-3 sm:items-end rounded-lg border border-slate-200 bg-slate-50/80 p-3"
                >
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-slate-600">Language</Label>
                    <Controller
                      name={`recruiterLanguages.${index}.languageCode` as never}
                      control={control}
                      render={({ field: f }) => (
                        <Select
                          value={f.value || undefined}
                          onValueChange={f.onChange}
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-11 border-slate-200 bg-white">
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
                  <div className="w-full sm:w-44 space-y-1.5">
                    <Label className="text-xs text-slate-600">Proficiency</Label>
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
                          <SelectTrigger className="h-11 border-slate-200 bg-white">
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 text-red-600 hover:text-red-800 hover:bg-red-50 shrink-0"
                    disabled={disabled}
                    onClick={() => removeLanguage(index)}
                    aria-label="Remove language"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-slate-500" />
            Country coverage
          </Label>
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
          <p className="text-sm text-slate-500">
            Pick all countries this user covers, then set sector scope for each country below.
          </p>
          {countryFields.length === 0 ? (
            <p className="text-sm text-slate-500">
              No countries selected yet. Use the field above to add countries.
            </p>
          ) : (
            <div className="space-y-4">
              {countryFields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between">
                    <div className="flex items-center gap-2 min-h-11">
                      <FlagIcon
                        countryCode={
                          (watch(
                            `recruiterCountryCoverages.${index}.countryCode` as never
                          ) as string) || ""
                        }
                        size="sm"
                        className="shrink-0"
                      />
                      <span className="text-sm font-medium text-slate-800">
                        {(watch(
                          `recruiterCountryCoverages.${index}.countryCode` as never
                        ) as string) || "—"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 text-red-600 hover:text-red-800 hover:bg-red-50 shrink-0"
                      disabled={disabled}
                      onClick={() => removeCountry(index)}
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
                    <legend className="text-xs font-medium text-slate-600 mb-2">
                      Sector scope (at least one)
                    </legend>
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                      {RECRUITER_SECTOR_SCOPES.map((scope) => {
                        const scopes =
                          (watch(
                            `recruiterCountryCoverages.${index}.sectorScopes` as never
                          ) as RecruiterSectorScopeValue[] | undefined) ?? [];
                        const checked = scopes.includes(scope);
                        return (
                          <label
                            key={scope}
                            className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                          >
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
    </Card>
  );
}
