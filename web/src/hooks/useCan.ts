import { useAppSelector } from "@/app/hooks";

export function useCan(required: string | string[]): boolean {
  const perms = new Set(useAppSelector((s) => s.auth.user?.permissions ?? []));

  // Check for wildcard permission
  if (perms.has("*")) return true;

  const needed = Array.isArray(required) ? required : [required];
  return needed.every((p) => perms.has(p));
}

export function useCanAny(required: string | string[]): boolean {
  const perms = new Set(useAppSelector((s) => s.auth.user?.permissions ?? []));

  // Check for wildcard permission
  if (perms.has("*")) return true;

  const needed = Array.isArray(required) ? required : [required];
  return needed.some((p) => perms.has(p));
}

export function useHasRole(required: string | string[]): boolean {
  const roles = useAppSelector((s) => s.auth.user?.roles ?? []);

  const needed = Array.isArray(required) ? required : [required];
  return needed.some((role) => roles.includes(role));
}

export function useHasAllRoles(required: string | string[]): boolean {
  const roles = useAppSelector((s) => s.auth.user?.roles ?? []);

  const needed = Array.isArray(required) ? required : [required];
  return needed.every((role) => roles.includes(role));
}
