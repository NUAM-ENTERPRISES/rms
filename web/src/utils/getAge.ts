/**
 * Returns the age in years for a given date of birth.
 *
 * - Accepts Date, timestamp (number) or date string.
 * - Returns null for invalid inputs or future dates.
 */
export function getAge(dob: string | Date | number | null | undefined): number | null {
  if (dob === null || dob === undefined) return null;

  const date = dob instanceof Date ? dob : typeof dob === "number" ? new Date(dob) : new Date(String(dob));
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();

  // Birthday this year
  const birthdayThisYear = new Date(today.getFullYear(), date.getMonth(), date.getDate());

  // If birthday hasn't occurred yet this year, subtract one
  if (today < birthdayThisYear) age -= 1;

  // If computed age is negative (future DOB), treat as invalid
  if (age < 0) return null;

  return age;
}

export default getAge;
