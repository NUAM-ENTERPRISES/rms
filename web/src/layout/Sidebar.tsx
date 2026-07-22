import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useNav } from "@/hooks/useNav";
import { NavItem } from "@/config/nav";
import { cn } from "@/lib/utils";
import { isNavGroupActive, isNavItemActive } from "@/utils/nav-active";
import { AffiniksLogoMark } from "@/components/molecules/AffiniksLogoMark";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// Color mapping for non-selected icons
const getIconColor = (itemId: string) => {
  // Extract parent ID from child items (e.g., "screenings-dashboard" -> "screenings")
  const parentId =
    itemId.includes("-") && itemId !== "screenings"
      ? itemId.split("-").slice(0, -1).join("-")
      : itemId;

  const colorMap: Record<
    string,
    { bg: string; text: string; border: string; hover: string }
  > = {
    dashboard: {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-500/30 dark:border-blue-500/40",
      hover:
        "group-hover:bg-blue-500/15 dark:group-hover:bg-blue-500/25 group-hover:text-blue-700 dark:group-hover:text-blue-300",
    },
    projects: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/30 dark:border-emerald-500/40",
      hover:
        "group-hover:bg-emerald-500/15 dark:group-hover:bg-emerald-500/25 group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
    },
    candidates: {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-500/30 dark:border-indigo-500/40",
      hover:
        "group-hover:bg-indigo-500/15 dark:group-hover:bg-indigo-500/25 group-hover:text-indigo-700 dark:group-hover:text-indigo-300",
    },
    "follow-up": {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-500/30 dark:border-indigo-500/40",
      hover:
        "group-hover:bg-indigo-500/15 dark:group-hover:bg-indigo-500/25 group-hover:text-indigo-700 dark:group-hover:text-indigo-300",
    },
    clients: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/30 dark:border-amber-500/40",
      hover:
        "group-hover:bg-amber-500/15 dark:group-hover:bg-amber-500/25 group-hover:text-amber-700 dark:group-hover:text-amber-300",
    },
    teams: {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-500/30 dark:border-cyan-500/40",
      hover:
        "group-hover:bg-cyan-500/15 dark:group-hover:bg-cyan-500/25 group-hover:text-cyan-700 dark:group-hover:text-cyan-300",
    },
    interviews: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-500/30 dark:border-rose-500/40",
      hover:
        "group-hover:bg-rose-500/15 dark:group-hover:bg-rose-500/25 group-hover:text-rose-700 dark:group-hover:text-rose-300",
    },
    screenings: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500/30 dark:border-purple-500/40",
      hover:
        "group-hover:bg-purple-500/15 dark:group-hover:bg-purple-500/25 group-hover:text-purple-700 dark:group-hover:text-purple-300",
    },
    documents: {
      bg: "bg-orange-500/10 dark:bg-orange-500/20",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-500/30 dark:border-orange-500/40",
      hover:
        "group-hover:bg-orange-500/15 dark:group-hover:bg-orange-500/25 group-hover:text-orange-700 dark:group-hover:text-orange-300",
    },
    processing: {
      bg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/20",
      text: "text-fuchsia-600 dark:text-fuchsia-400",
      border: "border-fuchsia-500/30 dark:border-fuchsia-500/40",
      hover:
        "group-hover:bg-fuchsia-500/15 dark:group-hover:bg-fuchsia-500/25 group-hover:text-fuchsia-700 dark:group-hover:text-fuchsia-300",
    },
    admin: {
      bg: "bg-red-500/10 dark:bg-red-500/20",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-500/30 dark:border-red-500/40",
      hover:
        "group-hover:bg-red-500/15 dark:group-hover:bg-red-500/25 group-hover:text-red-700 dark:group-hover:text-red-300",
    },
    "admin-users": {
      bg: "bg-red-500/10 dark:bg-red-500/20",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-500/30 dark:border-red-500/40",
      hover:
        "group-hover:bg-red-500/15 dark:group-hover:bg-red-500/25 group-hover:text-red-700 dark:group-hover:text-red-300",
    },
    "admin-roles": {
      bg: "bg-red-500/10 dark:bg-red-500/20",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-500/30 dark:border-red-500/40",
      hover:
        "group-hover:bg-red-500/15 dark:group-hover:bg-red-500/25 group-hover:text-red-700 dark:group-hover:text-red-300",
    },
    "admin-teams": {
      bg: "bg-red-500/10 dark:bg-red-500/20",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-500/30 dark:border-red-500/40",
      hover:
        "group-hover:bg-red-500/15 dark:group-hover:bg-red-500/25 group-hover:text-red-700 dark:group-hover:text-red-300",
    },
    profile: {
      bg: "bg-teal-500/10 dark:bg-teal-500/20",
      text: "text-teal-600 dark:text-teal-400",
      border: "border-teal-500/30 dark:border-teal-500/40",
      hover:
        "group-hover:bg-teal-500/15 dark:group-hover:bg-teal-500/25 group-hover:text-teal-700 dark:group-hover:text-teal-300",
    },
  };

  // Try to find color for the item ID, then parent ID, then default
  return (
    colorMap[itemId] ||
    colorMap[parentId] || {
      bg: "bg-slate-500/10 dark:bg-slate-500/20",
      text: "text-slate-600 dark:text-slate-400",
      border: "border-slate-500/30 dark:border-slate-500/40",
      hover:
        "group-hover:bg-slate-500/15 dark:group-hover:bg-slate-500/25 group-hover:text-slate-700 dark:group-hover:text-slate-300",
    }
  );
};

function NavItemComponent({
  item,
  isCollapsed,
  depth = 0,
}: {
  item: NavItem;
  isCollapsed: boolean;
  depth?: number;
}) {
  const location = useLocation();

  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.path
    ? isNavItemActive(location.pathname, item)
    : false;
  const isChildActive = hasChildren && isNavGroupActive(location.pathname, item);
  const isCurrentlyActive = isActive || isChildActive;

  // Initialize expansion based on whether any child is active so that
  // navigating directly to a child keeps the parent open. Also sync
  // expansion when the active child changes (collapses when navigating away).
  const [isExpanded, setIsExpanded] = useState<boolean>(isChildActive || false);

  useEffect(() => {
    if (hasChildren) {
      setIsExpanded(!!isChildActive);
    }
  }, [isChildActive, hasChildren]);

  const iconColors = getIconColor(item.id);

  const handleClick = () => {
    if (hasChildren) setIsExpanded((prev) => !prev);
  };

  const content = (
    <div
      className={cn(
        "flex items-center group relative rounded-lg transition-all duration-300 ease-out cursor-pointer",
        isCollapsed ? "justify-center py-2" : "justify-between py-2 px-3",
        isCurrentlyActive
          ? "bg-gradient-to-r from-violet-500/20 via-purple-500/15 to-fuchsia-500/20 backdrop-blur-sm"
          : "hover:bg-sidebar-accent/50"
      )}
    >
      <div className="flex items-center gap-2.5">
        {item.icon && depth === 0 && (
          <div
            className={cn(
              "flex items-center justify-center rounded-lg transition-all duration-300 shadow-sm",
              isCurrentlyActive
                ? "w-8 h-8 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 text-white ring-2 ring-violet-500/30 shadow-lg"
                : cn(
                    "w-8 h-8 backdrop-blur-sm border",
                    iconColors.bg,
                    iconColors.text,
                    iconColors.border,
                    iconColors.hover,
                    "group-hover:scale-105"
                  )
            )}
          >
            <item.icon className="w-4 h-4" />
          </div>
        )}

        {!isCollapsed && (
          <span
            className={cn(
              "text-sm font-medium transition-all duration-300",
              isCurrentlyActive
                ? "text-sidebar-foreground font-semibold"
                : "text-sidebar-foreground/80 group-hover:text-sidebar-foreground"
            )}
          >
            {item.label}
          </span>
        )}
      </div>

      {!isCollapsed && hasChildren && (
        <ChevronLeft
          className={cn(
            "w-3.5 h-3.5 transition-all duration-300",
            isExpanded
              ? "rotate-[-90deg] text-slate-600 dark:text-slate-400"
              : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
          )}
        />
      )}
    </div>
  );

  const navItem = hasChildren ? (
    <div onClick={handleClick}>{content}</div>
  ) : item.path ? (
    <Link to={item.path}>{content}</Link>
  ) : (
    content
  );

  return (
    <div className={cn(depth > 0 && "ml-4")}>
      {navItem}
      {isExpanded && !isCollapsed && hasChildren && (
        <div className="mt-1.5 space-y-1 ml-4 pl-3 border-l-2 border-violet-500/30">
          {item.children?.map((child) => (
            <NavItemComponent
              key={child.id}
              item={child}
              isCollapsed={isCollapsed}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const navItems = useNav();
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        setIsScrolled(scrollRef.current.scrollTop > 16);
      }
    };
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
      return () => el.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const handleMouseEnter = () => {
    if (isCollapsed) {
      hoverTimeoutRef.current = setTimeout(() => setIsHoverOpen(true), 200);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHoverOpen(false);
  };

  const effectiveCollapsed = isCollapsed && !isHoverOpen;

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative flex flex-col transition-all duration-500 ease-out overflow-hidden",
        "my-4 mx-2",
        "h-[calc(100%-2rem)]",
        "backdrop-blur-xl",
        "border-r border-sidebar-border",
        "rounded-r-3xl bg-sidebar/80 backdrop-blur-xl shadow-lg",
        effectiveCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Frosted glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-sidebar/20 via-transparent to-sidebar/20 pointer-events-none" />

      {/* Header with frosted glass */}
      <div
        className={cn(
          "relative flex items-center justify-between z-10 transition-all duration-500",
          isScrolled ? "h-14 px-3" : "h-16 px-4"
        )}
      >
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

        {!effectiveCollapsed ? (
          <div
            className={cn(
              "flex items-center gap-3 transition-all duration-500 relative z-10",
              isScrolled && "gap-2.5"
            )}
          >
            <AffiniksLogoMark
              size={isScrolled ? "sm" : "md"}
              alt=""
              className="transition-all duration-500"
            />
            <div className="bg-transparent">
              <h5
                className={cn(
                  "text-sidebar-foreground font-semibold transition-all duration-500",
                  isScrolled ? "text-sm" : "text-base"
                )}
              >
                Affiniks
              </h5>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
                RMS Platforms
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto relative z-10">
            <AffiniksLogoMark
              size={isScrolled ? "sm" : "md"}
              className="transition-all duration-500"
            />
          </div>
        )}

        {!effectiveCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="h-7 w-7 rounded-lg bg-sidebar-accent/60 backdrop-blur-md border border-sidebar-border hover:bg-sidebar-accent transition-all hover:scale-110 flex items-center justify-center shadow-sm relative z-10"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-sidebar-foreground" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        ref={scrollRef}
        className="flex-1 px-2 py-3 space-y-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 relative z-0"
      >
        {navItems.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            isCollapsed={effectiveCollapsed}
          />
        ))}
      </nav>

      {/* Footer with frosted glass */}
      {!effectiveCollapsed && (
        <div className="p-3 relative z-10 border-t border-sidebar-border bg-sidebar/50">
          <div className="p-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/30 shadow-lg">
            <div className="flex items-center gap-2.5">
              <AffiniksLogoMark size="xs" alt="" />
              <div>
                <p className="text-xs font-semibold text-sidebar-foreground">
                  Affiniks RMS
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Version 2.0.0
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
