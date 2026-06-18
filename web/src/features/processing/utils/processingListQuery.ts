import { format, parseISO, isValid } from "date-fns";
import type { ProcessingCandidatesQuery } from "../data/processing.endpoints";

export type ProcessingAdvancedFilters = {
  countryCodes: string[];
  sector: string;
  recruiterId: string;
  assignedToId: string;
  fileNumber: string;
  datePreset: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export const DEFAULT_PROCESSING_ADVANCED_FILTERS: ProcessingAdvancedFilters = {
  countryCodes: [],
  sector: "all",
  recruiterId: "all",
  assignedToId: "all",
  fileNumber: "",
  datePreset: "all",
  dateFrom: undefined,
  dateTo: undefined,
};

export function countProcessingAdvancedFilters(
  filters: ProcessingAdvancedFilters,
): number {
  return [
    filters.countryCodes.length > 0,
    filters.sector !== "all",
    filters.recruiterId !== "all",
    filters.assignedToId !== "all",
    Boolean(filters.fileNumber.trim()),
    filters.datePreset !== "all" || filters.dateFrom || filters.dateTo,
  ].filter(Boolean).length;
}

export function advancedFiltersToQueryParams(
  filters: ProcessingAdvancedFilters,
): Pick<
  ProcessingCandidatesQuery,
  | "countryCodes"
  | "sector"
  | "recruiterId"
  | "assignedToId"
  | "fileNumber"
  | "dateFrom"
  | "dateTo"
> {
  const params: Pick<
    ProcessingCandidatesQuery,
    | "countryCodes"
    | "sector"
    | "recruiterId"
    | "assignedToId"
    | "fileNumber"
    | "dateFrom"
    | "dateTo"
  > = {};

  if (filters.countryCodes.length > 0) {
    params.countryCodes = filters.countryCodes.join(",");
  }
  if (filters.sector !== "all") {
    params.sector = filters.sector;
  }
  if (filters.recruiterId !== "all") {
    params.recruiterId = filters.recruiterId;
  }
  if (filters.assignedToId !== "all") {
    params.assignedToId = filters.assignedToId;
  }
  if (filters.fileNumber.trim()) {
    params.fileNumber = filters.fileNumber.trim();
  }
  if (filters.dateFrom) {
    params.dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
  }
  if (filters.dateTo) {
    params.dateTo = format(filters.dateTo, "yyyy-MM-dd");
  }

  return params;
}

export function parseProcessingAdvancedFiltersFromSearchParams(
  params: URLSearchParams,
): ProcessingAdvancedFilters {
  const countryCodes = params.get("countryCodes");
  const dateFromRaw = params.get("dateFrom");
  const dateToRaw = params.get("dateTo");

  const dateFrom = dateFromRaw ? parseISO(dateFromRaw) : undefined;
  const dateTo = dateToRaw ? parseISO(dateToRaw) : undefined;

  return {
    countryCodes: countryCodes
      ? countryCodes.split(",").map((c) => c.trim()).filter(Boolean)
      : [],
    sector: params.get("sector") || "all",
    recruiterId: params.get("recruiterId") || "all",
    assignedToId: params.get("assignedToId") || "all",
    fileNumber: params.get("fileNumber") || "",
    datePreset:
      dateFromRaw || dateToRaw ? "custom" : params.get("datePreset") || "all",
    dateFrom: dateFrom && isValid(dateFrom) ? dateFrom : undefined,
    dateTo: dateTo && isValid(dateTo) ? dateTo : undefined,
  };
}

export function writeProcessingAdvancedFiltersToSearchParams(
  params: URLSearchParams,
  filters: ProcessingAdvancedFilters,
): void {
  const keys = [
    "countryCodes",
    "sector",
    "recruiterId",
    "assignedToId",
    "fileNumber",
    "datePreset",
    "dateFrom",
    "dateTo",
  ] as const;
  keys.forEach((key) => params.delete(key));

  if (filters.countryCodes.length > 0) {
    params.set("countryCodes", filters.countryCodes.join(","));
  }
  if (filters.sector !== "all") {
    params.set("sector", filters.sector);
  }
  if (filters.recruiterId !== "all") {
    params.set("recruiterId", filters.recruiterId);
  }
  if (filters.assignedToId !== "all") {
    params.set("assignedToId", filters.assignedToId);
  }
  if (filters.fileNumber.trim()) {
    params.set("fileNumber", filters.fileNumber.trim());
  }
  if (filters.datePreset !== "all") {
    params.set("datePreset", filters.datePreset);
  }
  if (filters.dateFrom) {
    params.set("dateFrom", format(filters.dateFrom, "yyyy-MM-dd"));
  }
  if (filters.dateTo) {
    params.set("dateTo", format(filters.dateTo, "yyyy-MM-dd"));
  }
}
