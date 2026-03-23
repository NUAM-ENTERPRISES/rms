import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatCurrency = (amount?: number, currency: string = "INR") => {
  if (amount == null) return "N/A";
  // Use locale appropriate for rupee when currency is INR
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SAR: "﷼",
  PKR: "₨",
  NPR: "₨",
  BDT: "৳",
  LKR: "₨",
};

const EXCHANGE_RATES_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 90.0,
  GBP: 105.0,
  AED: 22.7,
  SAR: 22.2,
  PKR: 0.30,
  NPR: 0.55,
  BDT: 0.82,
  LKR: 0.24,
};

export const getCurrencySymbol = (currency: string = "INR") => {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency.toUpperCase();
};

export const convertToINR = (amount?: number | null, currency: string = "INR") => {
  if (amount == null) return undefined;
  const rate = EXCHANGE_RATES_TO_INR[currency.toUpperCase()] ?? 1;
  return amount * rate;
};

export const formatSalaryRange = (
  minSalary?: number | null,
  maxSalary?: number | null,
  currency: string = "INR",
) => {
  if (minSalary == null && maxSalary == null) return "As per policy";
  if (minSalary != null && maxSalary != null) {
    return `${formatCurrency(minSalary, currency)} - ${formatCurrency(maxSalary, currency)}`;
  }
  if (minSalary != null) return `${formatCurrency(minSalary, currency)} - N/A`;
  return `N/A - ${formatCurrency(maxSalary, currency)}`;
};

export const formatSalaryRangeWithINRBracket = (
  minSalary?: number | null,
  maxSalary?: number | null,
  currency: string = "INR",
) => {
  const base = formatSalaryRange(minSalary, maxSalary, currency);
  if (currency.toUpperCase() === "INR") return base;

  const minInr = convertToINR(minSalary, currency);
  const maxInr = convertToINR(maxSalary, currency);
  if (minInr == null && maxInr == null) return base;

  const inrText = minInr != null && maxInr != null
    ? `${formatCurrency(minInr, "INR")} - ${formatCurrency(maxInr, "INR")}`
    : minInr != null
    ? `${formatCurrency(minInr, "INR")} - N/A`
    : `N/A - ${formatCurrency(maxInr, "INR")}`;

  return `${base} (${inrText})`;
};
