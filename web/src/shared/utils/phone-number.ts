import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";

const DEFAULT_MAX_LENGTH = 15;
const DEFAULT_MIN_LENGTH = 6;

/** Strip non-digit characters. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Normalize dial code to `+` + digits (e.g. `91` → `+91`). */
export function normalizeDialCode(code: string): string {
  const digits = digitsOnly(code);
  return digits ? `+${digits}` : "";
}

function countriesForDialCode(dialCode: string): CountryCode[] {
  const digits = digitsOnly(dialCode);
  if (!digits) return [];
  return getCountries().filter(
    (country) => String(getCountryCallingCode(country)) === digits,
  );
}

function getMobileLengthBounds(dialCode: string): { min: number; max: number } {
  const countries = countriesForDialCode(dialCode);
  if (!countries.length) {
    return { min: DEFAULT_MIN_LENGTH, max: DEFAULT_MAX_LENGTH };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const country of countries) {
    const example = getExampleNumber(country, examples);
    if (!example) continue;
    const len = example.nationalNumber.length;
    min = Math.min(min, len);
    max = Math.max(max, len);
  }

  if (!Number.isFinite(min) || max === 0) {
    return { min: DEFAULT_MIN_LENGTH, max: DEFAULT_MAX_LENGTH };
  }

  return { min, max };
}

/**
 * Max national number length for the given dial code (for input `maxLength`).
 * Uses mobile example lengths so e.g. `+91` caps at 10.
 */
export function getNationalNumberMaxLength(dialCode: string): number {
  if (!digitsOnly(dialCode)) return DEFAULT_MAX_LENGTH;
  return getMobileLengthBounds(dialCode).max;
}

/**
 * Validate a national mobile number for a dial code.
 * Returns an error message, or `null` when valid.
 */
export function validateMobileForDialCode(
  dialCode: string,
  mobile: string,
): string | null {
  const dial = normalizeDialCode(dialCode);
  const national = digitsOnly(mobile);

  if (!dial) {
    return "Country code is required";
  }
  if (!national) {
    return "Mobile number is required";
  }
  if (/\D/.test(mobile.trim())) {
    return "Mobile number must contain digits only";
  }

  const { min, max } = getMobileLengthBounds(dial);
  if (national.length < min || national.length > max) {
    if (min === max) {
      return `Mobile number must be ${max} digits for ${dial}`;
    }
    return `Mobile number must be between ${min} and ${max} digits for ${dial}`;
  }

  const e164 = `${dial}${national}`;
  if (!isValidPhoneNumber(e164)) {
    return `Invalid mobile number for ${dial}`;
  }

  return null;
}
