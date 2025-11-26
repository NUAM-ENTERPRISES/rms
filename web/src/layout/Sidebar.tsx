import { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, Sparkles } from "lucide-react";
import { useNav } from "@/hooks/useNav";
import { NavItem } from "@/config/nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function NavItemComponent({ item, isCollapsed, depth = 0 }: { item: NavItem; isCollapsed: boolean; depth?: number }) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasChildren = item.children && item.children.length > 0;
  const isActive = location.pathname === item.path;
  const isChildActive = hasChildren && item.children?.some(child => child.path && location.pathname.startsWith(child.path));
  const isCurrentlyActive = isActive || isChildActive;

  const handleClick = () => {
    if (hasChildren) setIsExpanded(prev => !prev);
  };

  const content = (
    <div className={cn(
      "flex items-center group relative rounded-2xl transition-all duration-300 cursor-pointer",
      isCollapsed ? "justify-center py-3.5" : "justify-between py-3.5 px-5",
      isCurrentlyActive
        ? "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 shadow-lg shadow-purple-600/30"
        : "hover:bg-white/10"
    )}>
      <div className="flex items-center gap-3.5">
        {/* Clean Circular Icon */}
        {item.icon && (
          <div className={cn(
            "flex items-center justify-center rounded-full transition-all duration-300 shadow-md",
            isCurrentlyActive
              ? "w-11 h-11 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 text-white ring-4 ring-violet-500/30"
              : "w-10 h-10 bg-white/12 text-violet-300 group-hover:bg-white/20 group-hover:text-violet-100"
          )}>
            <item.icon className="w-5 h-5" />
          </div>
        )}

        {!isCollapsed && (
          <span className={cn(
            "text-sm font-semibold transition-all duration-300",
            isCurrentlyActive
              ? "text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 font-bold"
              : "text-gray-300 group-hover:text-white"
          )}>
            {item.label}
          </span>
        )}
      </div>

      {!isCollapsed && hasChildren && (
        <ChevronLeft
          className={cn(
            "w-4 h-4 transition-transform duration-300",
            isExpanded ? "rotate-[-90deg] text-violet-200" : "text-violet-400 group-hover:text-violet-200"
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
    <div className={cn(depth > 0 && "ml-8")}>
      {navItem}

      {isExpanded && !isCollapsed && hasChildren && (
        <div className="mt-2 space-y-1 ml-6 pl-6 border-l-2 border-violet-500/30">
          {item.children?.map(child => (
            <NavItemComponent key={child.id} item={child} isCollapsed={isCollapsed} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const navItems = useNav();
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        "relative flex flex-col h-screen bg-[#0a0e1a] border-r border-violet-500/20 transition-all duration-500 ease-out shadow-2xl backdrop-blur-xl rounded-r-2xl overflow-hidden mt-[-20px]",
        effectiveCollapsed ? "w-20" : "w-80"
      )}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(139,92,246,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(217,70,239,0.12),transparent_70%)] pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between h-24 px-6 bg-gradient-to-r from-white/6 via-violet-500/12 to-purple-500/12 border-b border-violet-500/20 backdrop-blur-2xl z-10">
        {!effectiveCollapsed ? (
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 rounded-2xl shadow-2xl ring-4 ring-violet-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Affiniks</h1>
              <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300 uppercase tracking-widest">
                RMS Platform
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center w-full">
            <div className="p-3 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 rounded-2xl shadow-xl ring-4 ring-violet-500/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
        )}

        {!effectiveCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="h-11 w-11 rounded-xl bg-white/12 hover:bg-white/20 backdrop-blur-md border border-violet-500/40 hover:border-violet-400 transition-all duration-300 hover:scale-110 shadow-lg flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-violet-300" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-500/30">
        {navItems.map(item => (
          <NavItemComponent key={item.id} item={item} isCollapsed={effectiveCollapsed} />
        ))}
      </nav>

      {/* Footer */}
      {!effectiveCollapsed && (
        <div className="p-6 border-t border-violet-500/20 bg-gradient-to-r from-white/6 via-violet-500/12 to-purple-500/12 backdrop-blur-2xl">
          <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-violet-500/30 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300">
                  Affiniks RMS
                </p>
                <p className="text-xs text-violet-300">Version 2.0.0</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}