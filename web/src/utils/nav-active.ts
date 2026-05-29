import type { NavItem } from "@/config/nav";

/** Static second segments under /screenings — not screening detail IDs */
const SCREENINGS_STATIC_SEGMENTS = new Set([
  "list",
  "assigned",
  "upcoming",
  "templates",
  "training",
]);

/**
 * Path-specific active rules for sidebar items whose routes overlap
 * (e.g. /candidates vs /candidates/:id/documents/:projectId).
 */
const PATH_ACTIVE_MATCHERS: Record<string, (pathname: string) => boolean> = {
  "/candidates": (pathname) => {
    if (pathname === "/candidates") return true;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length !== 2 || segments[0] !== "candidates") return false;
    const segment = segments[1];
    return segment !== "overview" && segment !== "create";
  },
  "/candidates/overview": (pathname) =>
    pathname === "/candidates/overview" ||
    pathname.startsWith("/candidates/overview/"),
  "/documents/verification": (pathname) =>
    pathname === "/documents/verification" ||
    pathname.startsWith("/documents/verification/") ||
    /^\/candidates\/[^/]+\/documents\/[^/]+/.test(pathname),
  "/processing-admin": (pathname) =>
    pathname === "/processing-admin" ||
    pathname.startsWith("/processing-admin/") ||
    /^\/processingCandidateDetails\/[^/]+/.test(pathname),
  "/ready-for-processing": (pathname) =>
    pathname === "/ready-for-processing" ||
    pathname.startsWith("/ready-for-processing/"),
  "/screenings": (pathname) => {
    if (pathname === "/screenings") return true;
    const match = pathname.match(/^\/screenings\/([^/]+)(?:\/(.*))?$/);
    if (!match) return false;
    if (SCREENINGS_STATIC_SEGMENTS.has(match[1])) return false;
    return true;
  },
  "/screenings/templates": (pathname) =>
    pathname === "/screenings/templates" ||
    pathname.startsWith("/screenings/templates/"),
};

function matchesPatterns(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => new RegExp(pattern).test(pathname));
}

/**
 * Returns whether a nav item (or child link) should appear active for the current route.
 */
export function isNavItemActive(
  pathname: string,
  item: Pick<NavItem, "path" | "activePathPatterns">,
): boolean {
  if (item.activePathPatterns?.length && matchesPatterns(pathname, item.activePathPatterns)) {
    return true;
  }

  if (!item.path) return false;

  const customMatcher = PATH_ACTIVE_MATCHERS[item.path];
  if (customMatcher) return customMatcher(pathname);

  if (pathname === item.path) return true;
  return pathname.startsWith(`${item.path}/`);
}

/**
 * Returns whether a parent nav group should expand / highlight because a child
 * (or parent pattern) matches the current route.
 */
export function isNavGroupActive(pathname: string, item: NavItem): boolean {
  if (item.activePathPatterns?.length && matchesPatterns(pathname, item.activePathPatterns)) {
    return true;
  }

  return Boolean(
    item.children?.some((child) => isNavItemActive(pathname, child)),
  );
}
