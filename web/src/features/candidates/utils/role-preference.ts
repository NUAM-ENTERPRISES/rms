type RoleCatalogLike = {
  label?: string;
  name?: string;
  roleDepartment?: {
    label?: string;
    name?: string;
  } | null;
};

export function formatRolePreferenceLabel(roleCatalog: RoleCatalogLike): string {
  const roleLabel = roleCatalog.label || roleCatalog.name || "Role";
  const deptLabel =
    roleCatalog.roleDepartment?.label || roleCatalog.roleDepartment?.name;
  return deptLabel ? `${deptLabel} – ${roleLabel}` : roleLabel;
}

export function buildPreferredRoleLabels(
  rolePreferences?: Array<{
    roleCatalogId: string;
    roleCatalog: RoleCatalogLike;
  }>,
): Record<string, string> {
  if (!rolePreferences?.length) return {};
  return Object.fromEntries(
    rolePreferences.map((preference) => [
      preference.roleCatalogId,
      formatRolePreferenceLabel(preference.roleCatalog),
    ]),
  );
}
