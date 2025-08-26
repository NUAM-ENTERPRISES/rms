import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
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
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-2">
        {item.icon && <item.icon className="h-4 w-4" />}
        {!isCollapsed && (
          <span className="text-sm font-medium">{item.label}</span>
        )}
      </div>
      {!isCollapsed && item.badge && (
        <Badge variant={item.badge.variant || "secondary"} className="ml-auto">
          {item.badge.text}
        </Badge>
      )}
      {!isCollapsed && hasChildren && (
        <ChevronRightIcon
          className={cn(
            "h-4 w-4 transition-transform",
            isExpanded && "rotate-90"
          )}
        />
      )}
    </div>
  );

  const navItem = (
    <div
      className={cn(
        "flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 cursor-pointer",
        "hover:bg-gradient-to-br hover:from-slate-900/20 hover:to-slate-800/20 hover:text-primary hover:shadow-sm",
        (isActive || isChildActive) &&
          "bg-gradient-to-br from-slate-900 to-slate-800 text-white border-l-2 border-primary shadow-sm",
        depth > 0 && "ml-4"
      )}
      onClick={handleClick}
    >
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
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          navItem
        )}

        {isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
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
              <TooltipContent side="right">
                <p>{item.label}</p>
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
        "flex flex-col border-r border-r-gray-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 shadow-sm rounded-r-xl",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-14 items-center justify-between border-b px-3">
        {!isCollapsed ? (
          <h2 className="text-lg font-semibold text-primary">Affiniks</h2>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>
    </aside>
  );
}
