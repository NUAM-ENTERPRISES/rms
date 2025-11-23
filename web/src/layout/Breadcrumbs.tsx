import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useFlattenedNav } from "@/hooks/useNav";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  path: string;
  isCurrent: boolean;
}

export default function Breadcrumbs() {
  const location = useLocation();
  const flattenedNav = useFlattenedNav();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always add home
    breadcrumbs.push({
      label: "Dashboard",
      path: "/dashboard",
      isCurrent: location.pathname === "/dashboard",
    });

    if (pathSegments.length === 0) {
      return breadcrumbs;
    }

    let currentPath = "";
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;

      // Find matching nav item
      const navItem = flattenedNav.find((item) => item.path === currentPath);

      if (navItem) {
        breadcrumbs.push({
          label: navItem.label,
          path: currentPath,
          isCurrent: i === pathSegments.length - 1,
        });
      } else {
        // Fallback for dynamic routes or unknown paths.
        // If the segment looks like an ID (long alphanumeric string), show
        // a context-aware placeholder instead of the raw id to avoid
        // revealing internal IDs in the breadcrumb UI.
        const looksLikeId = /^(?:[A-Za-z0-9_-]{6,}|\d{3,})$/.test(segment);

        let label = "";

        if (looksLikeId) {
          // Use the previous segment as context. If the previous segment is
          // plural (e.g. "candidates"), show the singular form "Candidate".
          const prev = pathSegments[i - 1] || "details";
          label = prev.replace(/-+/g, " ").replace(/s$/i, "");
          label = label.charAt(0).toUpperCase() + label.slice(1);
        } else {
          // Normal text segment (not an id-looking string) — prettify it.
          label = segment
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }

        breadcrumbs.push({
          label,
          path: currentPath,
          isCurrent: i === pathSegments.length - 1,
        });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="px-4 pt-6">
      <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.path} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1" aria-hidden="true" />
            )}

            {breadcrumb.isCurrent ? (
              <span className="font-medium text-foreground" aria-current="page">
                {breadcrumb.label}
              </span>
            ) : (
              <Link
                to={breadcrumb.path}
                className="hover:text-foreground transition-colors"
              >
                {index === 0 ? (
                  <Home className="h-4 w-4" aria-label="Home" />
                ) : (
                  breadcrumb.label
                )}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
