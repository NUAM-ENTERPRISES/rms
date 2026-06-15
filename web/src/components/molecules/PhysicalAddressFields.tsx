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
import { Input } from "@/components/ui/input";
import { CountrySelect } from "./CountrySelect";
import { StateSelect } from "./StateSelect";
import { MapPin } from "lucide-react";

/** Optional physical address fields aligned with `Client` / nested `subClient`. */
export type PhysicalAddressFormFields = {
  addressCountryCode?: string;
  addressStateId?: string;
  address?: string;
  addressPincode?: string;
};

export interface PhysicalAddressFieldsProps<T extends FieldValues> {
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
  /** When false, pincode is omitted (use a dedicated field elsewhere in the form). */
  includePincode?: boolean;
  /**
   * Nested form path prefix (e.g. `subClient` for `subClient.addressCountryCode`).
   */
  fieldPrefix?: "subClient";
}

/**
 * Optional address: catalog country (`countries.code`),
 * state (`states.id`), and free-text street line. Separate from phone dial country.
 */
export function PhysicalAddressFields<T extends FieldValues>({
  control,
  setValue,
  errors,
  disabled = false,
  initialCountryData,
  title = "Address (optional)",
  description = "",
  includePincode = true,
  fieldPrefix,
}: PhysicalAddressFieldsProps<T>) {
  const countryCodePath = (
    fieldPrefix ? `${fieldPrefix}.addressCountryCode` : "addressCountryCode"
  ) as Path<T>;
  const stateIdPath = (
    fieldPrefix ? `${fieldPrefix}.addressStateId` : "addressStateId"
  ) as Path<T>;
  const addressLinePath = (
    fieldPrefix ? `${fieldPrefix}.address` : "address"
  ) as Path<T>;
  const pincodePath = (
    fieldPrefix ? `${fieldPrefix}.addressPincode` : "addressPincode"
  ) as Path<T>;

  const countryCode = useWatch({
    control,
    name: countryCodePath,
  }) as string | undefined;

  const prevCountry = useRef<string | undefined>(countryCode);

  useEffect(() => {
    if (prevCountry.current !== countryCode) {
      setValue(stateIdPath, "" as never, {
        shouldValidate: true,
        shouldDirty: true,
      });
      prevCountry.current = countryCode;
    }
  }, [countryCode, setValue, stateIdPath]);

  const normalizedCountry = countryCode?.trim() ?? "";

  const nestedErrors = fieldPrefix
    ? (errors[fieldPrefix as keyof FieldErrors<T>] as FieldErrors<
        PhysicalAddressFormFields
      > | undefined)
    : undefined;

  const countryError = (
    fieldPrefix ? nestedErrors?.addressCountryCode : errors.addressCountryCode
  )?.message as string | undefined;
  const stateError = (
    fieldPrefix ? nestedErrors?.addressStateId : errors.addressStateId
  )?.message as string | undefined;
  const addressError = (fieldPrefix ? nestedErrors?.address : errors.address)?.message as
    | string
    | undefined;
  const pincodeError = (
    fieldPrefix ? nestedErrors?.addressPincode : errors.addressPincode
  )?.message as string | undefined;

  const addressLineId = fieldPrefix
    ? "physical-address-line-subclient"
    : "physical-address-line";

  return (
    <div className="col-span-full space-y-4 pt-2">
      <div className="flex items-center gap-2 text-slate-800 font-semibold">
        <MapPin className="h-4 w-4 text-blue-600 shrink-0" aria-hidden />
        <span>{title}</span>
      </div>
      {description ? (
        <p className="text-sm text-slate-500 -mt-2">
          {description}
        </p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Controller
          name={countryCodePath}
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
          name={stateIdPath}
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
            htmlFor={addressLineId}
            className="text-slate-700 font-medium"
          >
            Street address
          </Label>
          <Controller
            name={addressLinePath}
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                value={field.value ?? ""}
                id={addressLineId}
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
        {includePincode ? (
          <div className="space-y-2">
            <Label
              htmlFor={
                fieldPrefix
                  ? "physical-address-pincode-subclient"
                  : "physical-address-pincode"
              }
              className="text-slate-700 font-medium"
            >
              Pincode
            </Label>
            <Controller
              name={pincodePath}
              control={control}
              render={({ field }) => (
                <Input
                  id={
                    fieldPrefix
                      ? "physical-address-pincode-subclient"
                      : "physical-address-pincode"
                  }
                  name={field.name}
                  ref={field.ref}
                  value={field.value ?? ""}
                  onBlur={field.onBlur}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder="e.g. 682016"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  disabled={disabled}
                  className="h-11 bg-white border-slate-200"
                />
              )}
            />
            {pincodeError ? (
              <p className="text-sm text-red-600">{pincodeError}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
