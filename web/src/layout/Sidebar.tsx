import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNav } from "@/hooks/useNav";
import { NavItem } from "@/config/nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItemProps {
  item: NavItem;
  isCollapsed: boolean;
  depth?: number;
}

function NavItemComponent({ item, isCollapsed, depth = 0 }: NavItemProps) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasChildren = item.children && item.children.length > 0;
  const isActive = location.pathname === item.path;
  const isChildActive =
    hasChildren &&
    item.children?.some((child) => location.pathname === child.path);

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const content = (
    <div
      className={cn(
        "flex items-center transition-all duration-200",
        isCollapsed ? "justify-center w-full" : "justify-between w-full"
      )}
    >
      <div
        className={cn(
          "flex items-center transition-all duration-200",
          isCollapsed ? "justify-center" : "space-x-3"
        )}
      >
        {item.icon && (
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
              // Enhanced visibility for collapsed state
              isCollapsed && (isActive || isChildActive)
                ? "bg-gradient-to-br from-primary/30 to-primary/50 shadow-lg ring-2 ring-primary/20"
                : "bg-gradient-to-br from-slate-100 to-slate-200",
              !isCollapsed &&
                "group-hover:from-primary/10 group-hover:to-primary/20",
              !isCollapsed &&
                (isActive || isChildActive) &&
                "from-primary/20 to-primary/30"
            )}
          >
            <item.icon
              className={cn(
                "h-4 w-4 transition-all duration-200",
                "text-slate-600 group-hover:text-primary",
                (isActive || isChildActive) && "text-primary",
                // Enhanced visibility for collapsed state
                isCollapsed &&
                  (isActive || isChildActive) &&
                  "text-primary drop-shadow-sm"
              )}
            />
          </div>
        )}
        {!isCollapsed && (
          <span
            className={cn(
              "text-sm font-medium transition-colors duration-200",
              "text-slate-700 group-hover:text-slate-900",
              (isActive || isChildActive) && "text-primary font-semibold"
            )}
          >
            {item.label}
          </span>
        )}
      </div>
      {!isCollapsed && item.badge && (
        <Badge
          variant={item.badge.variant || "secondary"}
          className={cn(
            "ml-auto text-xs font-medium px-2 py-1 transition-all duration-200",
            "shadow-sm hover:shadow-md",
            item.badge.variant === "default" &&
              "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
            item.badge.variant === "secondary" &&
              "bg-gradient-to-r from-slate-600 to-slate-700 text-white",
            item.badge.variant === "destructive" &&
              "bg-gradient-to-r from-red-500 to-red-600 text-white",
            item.badge.variant === "outline" &&
              "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border border-slate-300",
            "hover:scale-105 hover:-translate-y-0.5"
          )}
        >
          {item.badge.text}
        </Badge>
      )}
      {!isCollapsed && hasChildren && (
        <ChevronRightIcon
          className={cn(
            "h-4 w-4 transition-all duration-300 text-slate-400",
            "group-hover:text-slate-600",
            isExpanded && "rotate-90 text-primary"
          )}
        />
      )}
    </div>
  );

  const navItem = (
    <div
      className={cn(
        "group relative flex items-center text-sm rounded-xl transition-all duration-300 cursor-pointer",
        // Adjust padding based on collapsed state
        isCollapsed ? "px-2 py-3 justify-center" : "px-4 py-3",
        "hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 hover:shadow-sm",
        // Simplified active state for collapsed mode
        (isActive || isChildActive) &&
          !isCollapsed &&
          "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent text-primary shadow-md scale-[1.02] -translate-y-0.5",
        (isActive || isChildActive) &&
          isCollapsed &&
          "bg-gradient-to-r from-primary/20 to-primary/30 text-primary shadow-md",
        depth > 0 && "ml-6",
        "border border-transparent hover:border-slate-200",
        // Only show border in expanded state
        (isActive || isChildActive) && !isCollapsed && "border-primary/20",
        // Remove hover glow in collapsed state for cleaner look
        !isCollapsed && "hover:scale-[1.02] hover:-translate-y-0.5"
      )}
      onClick={handleClick}
    >
      {/* Active indicator - simplified for collapsed state */}
      {(isActive || isChildActive) && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 bg-gradient-to-b from-primary to-primary/60 rounded-r-full transition-all duration-300",
            isCollapsed ? "left-1 w-1 h-6" : "left-0 w-1 h-8"
          )}
        />
      )}

      {/* Hover glow effect - only in expanded state */}
      {!isCollapsed && (
        <div
          className={cn(
            "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
            "bg-gradient-to-r from-primary/5 to-transparent",
            "group-hover:opacity-100"
          )}
        />
      )}

      {content}
    </div>
  );

  if (hasChildren) {
    return (
      <div>
        {isCollapsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{navItem}</TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-slate-900 text-white border-0 shadow-xl"
              >
                <p className="font-medium">{item.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          navItem
        )}

        {isExpanded && !isCollapsed && (
          <div className="mt-2 space-y-1 ml-2 pl-4 border-l border-slate-200">
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

  if (item.path) {
    return (
      <Link to={item.path}>
        {isCollapsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{navItem}</TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-slate-900 text-white border-0 shadow-xl"
              >
                <p className="font-medium">{item.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          navItem
        )}
      </Link>
    );
  }

  return navItem;
}

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const navItems = useNav();

  return (
    <aside
      className={cn(
        "flex flex-col bg-white/80 backdrop-blur-xl border-r border-slate-200/60 transition-all duration-500 ease-out shadow-2xl rounded-2xl",
        "supports-[backdrop-filter]:bg-white/60",
        isCollapsed ? "w-20" : "w-72"
      )}
      style={{
        borderTopRightRadius: "1rem",
        borderBottomRightRadius: "1rem",
      }}
    >
      {/* Premium Sidebar Header */}
      <div className="relative flex h-16 items-center justify-between border-b border-slate-200/60 px-4 bg-gradient-to-r from-slate-50/50 to-white/50">
        {/* Background pattern - moved to not interfere with buttons */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.03)_1px,transparent_0)] bg-[size:20px_20px] pointer-events-none" />

        {!isCollapsed ? (
          <div className="flex items-center space-x-3 relative z-20">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Affiniks
              </h2>
              <p className="text-xs text-slate-500 font-medium">RMS</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full relative z-20">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-12 w-12 rounded-xl hover:bg-slate-100 hover:shadow-md transition-all duration-200 bg-white/90 border border-slate-200/60 shadow-md hover:scale-105"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-6 w-6 text-slate-700" />
            </Button>
          </div>
        )}

        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-10 w-10 rounded-xl hover:bg-slate-100 hover:shadow-md transition-all duration-200 relative z-20"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Button>
        )}
      </div>

      {/* Navigation Items with Premium Styling */}
      <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Premium Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-white/50">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-slate-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium">Affiniks RMS</p>
            <p className="text-xs text-slate-400">v2.0.0</p>
          </div>
        </div>
      )}
    </aside>
  );
}
