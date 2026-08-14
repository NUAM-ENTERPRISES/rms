export type ProfessionSectorValue = "HEALTHCARE" | "NON_HEALTH_CARE";

export function anyProfessionHelperText(sector: ProfessionSectorValue): string {
  if (sector === "HEALTHCARE") {
    return "This candidate focuses on all current and future healthcare professions.";
  }
  return "This candidate focuses on all current and future non-healthcare professions.";
}

export function anyProfessionFocusLabel(
  sector?: ProfessionSectorValue | null,
): string {
  if (sector === "HEALTHCARE") return "Any · Healthcare";
  if (sector === "NON_HEALTH_CARE") return "Any · Non-healthcare";
  return "Any profession";
}
