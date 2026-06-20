export const PROCESSING_STATUS_CHANGE_DIRECT_ROLES = [
  "Manager",
  "Processing Manager",
] as const;

export function canDirectApplyProcessingStatusChange(
  roles: string[] | undefined,
): boolean {
  return (roles ?? []).some((role) =>
    (PROCESSING_STATUS_CHANGE_DIRECT_ROLES as readonly string[]).includes(role),
  );
}
