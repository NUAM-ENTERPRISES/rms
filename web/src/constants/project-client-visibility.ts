/** Mirrors backend project-client-visibility.util — UI layout only; API enforces redaction. */

const ELEVATED_ROLES = ["Manager", "CEO", "Director", "System Admin"] as const;

export function shouldHideProjectClient(userRoles: string[] = []): boolean {
  if (userRoles.some((role) => ELEVATED_ROLES.includes(role as (typeof ELEVATED_ROLES)[number]))) {
    return false;
  }
  return userRoles.includes("Recruiter") || userRoles.includes("CRE");
}
