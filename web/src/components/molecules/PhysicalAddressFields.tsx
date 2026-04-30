import { useEffect, useRef } from "react";
import {
  Control,
  Controller,
  FieldErrors,
  FieldValues,
  Path,
  UseFormSetValue,
  useWatch,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CountrySelect } from "./CountrySelect";
import { StateSelect } from "./StateSelect";
import { MapPin } from "lucide-react";

export type PhysicalAddressFormFields = {
  addressCountryCode?: string;
  addressStateId?: string;
  address?: string;
};

export interface PhysicalAddressFieldsProps<
  T extends FieldValues & PhysicalAddressFormFields,
> {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  errors: FieldErrors<T>;
  disabled?: boolean;
  /** When editing, helps CountrySelect show the label before list pagination loads. */
  initialCountryData?: { code: string; name: string };
  /** Custom title for the section */
  title?: string;
  /** Custom description for the section */
  description?: React.ReactNode;
}

/**
 * Optional address: catalog country (`countries.code`),
 * state (`states.id`), and free-text street line. Separate from phone dial country.
 */
export function PhysicalAddressFields<
  T extends FieldValues & PhysicalAddressFormFields,
>({
  control,
  setValue,
  errors,
  disabled = false,
  initialCountryData,
  title = "Address (optional)",
  description = "",
}: PhysicalAddressFieldsProps<T>) {
  const countryCode = useWatch({
    control,
    name: "addressCountryCode" as Path<T>,
  }) as string | undefined;

  const prevCountry = useRef<string | undefined>(countryCode);

  useEffect(() => {
    if (prevCountry.current !== countryCode) {
      setValue("addressStateId" as Path<T>, "" as never, {
        shouldValidate: true,
        shouldDirty: true,
      });
      prevCountry.current = countryCode;
    }
  }, [countryCode, setValue]);

  const normalizedCountry = countryCode?.trim() ?? "";

  const countryError = errors.addressCountryCode?.message as
    | string
    | undefined;
  const stateError = errors.addressStateId?.message as string | undefined;
  const addressError = errors.address?.message as string | undefined;

  return (
    <div className="col-span-full space-y-4 pt-2">
      <div className="flex items-center gap-2 text-slate-800 font-semibold">
        <MapPin className="h-4 w-4 text-blue-600 shrink-0" aria-hidden />
        <span>{title}</span>
      </div>
      {description && (
        <p className="text-sm text-slate-500 -mt-2">
          {description}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Controller
          name={"addressCountryCode" as Path<T>}
          control={control}
          render={({ field }) => (
            <CountrySelect
              label="Country"
              value={field.value ?? ""}
              onValueChange={field.onChange}
              placeholder="Select country…"
              disabled={disabled}
              allowEmpty
              error={countryError}
              initialCountryData={
                initialCountryData?.code === field.value
                  ? initialCountryData
                  : undefined
              }
            />
          )}
        />
        <Controller
          name={"addressStateId" as Path<T>}
          control={control}
          render={({ field }) => (
            <StateSelect
              label="State / province"
              value={field.value ?? ""}
              onValueChange={field.onChange}
              countryCode={normalizedCountry}
              placeholder="Select state…"
              disabled={disabled}
              allowEmpty
              error={stateError}
            />
          )}
        />
        <div className="md:col-span-2 space-y-2">
          <Label
            htmlFor="physical-address-line"
            className="text-slate-700 font-medium"
          >
            Street address
          </Label>
          <Controller
            name={"address" as Path<T>}
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id="physical-address-line"
                rows={3}
                placeholder="Building, street, area…"
                disabled={disabled}
                className="bg-white border-slate-200 min-h-[88px] resize-y"
              />
            )}
          />
          {addressError ? (
            <p className="text-sm text-red-600">{addressError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
