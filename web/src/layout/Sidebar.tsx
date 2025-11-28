// Sidebar.tsx → NOW HAS EXACT SAME HEADER BG AS MAIN HEADER

import { useState, useRef, useEffect } from "react";
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
    <div
      className={cn(
        "flex items-center group relative rounded-2xl transition-all duration-500 ease-out cursor-pointer",
        isCollapsed ? "justify-center py-3.5" : "justify-between py-3.5 px-5",
        "hover:scale-105 hover:shadow-2xl hover:shadow-violet-500/20 active:scale-95"
      )}
    >
      <div className="flex items-center gap-3.5">
        {item.icon && (
          <div
            className={cn(
              "flex items-center justify-center rounded-full transition-all duration-300 shadow-md",
              isCurrentlyActive
                ? "w-11 h-11 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 text-white ring-4 ring-violet-500/30 shadow-xl"
                : "w-10 h-10 bg-white/12 text-violet-300",
              "group-hover:scale-110 group-hover:bg-white/25 group-hover:text-white group-hover:shadow-xl group-hover:shadow-violet-400/40"
            )}
          >
            <item.icon className="w-5 h-5 group-hover:animate-pulse" />
          </div>
        )}

        {!isCollapsed && (
          <span
            className={cn(
              "text-sm font-semibold transition-all duration-300",
              isCurrentlyActive ? "text-white font-bold drop-shadow-md" : "text-gray-300 group-hover:text-white group-hover:font-medium group-hover:drop-shadow-lg"
            )}
          >
            {item.label}
          </span>
        )}
      </div>

      {!isCollapsed && hasChildren && (
        <ChevronLeft
          className={cn(
            "w-4 h-4 transition-all duration-300",
            isExpanded ? "rotate-[-90deg] text-violet-200" : "text-violet-400 group-hover:text-violet-200 group-hover:scale-125 group-hover:rotate-12"
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
        "relative flex flex-col h-screen bg-[#0a0e1a] border-r border-violet-500/20 transition-all duration-500 ease-out shadow-2xl backdrop-blur-xl rounded-r-2xl overflow-hidden mt-[-20px]",
        effectiveCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Same background effects as main header */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")`,
        }}
      />
      {/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(139,92,246,0.12),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(217,70,239,0.12),transparent_60%)] pointer-events-none" /> */}

      {/* HEADER — NOW 100% IDENTICAL TO MAIN HEADER */}
      <div
        className={cn(
          "relative flex items-center justify-between border-b border-violet-500/20 z-10 transition-all duration-500",
          "bg-[#0a0e1a]",
          "bg-gradient-to-", // ← EXACT SAME AS MAIN HEADER
          isScrolled ? "h-16 px-3" : "h-20 px-4"
        )}
      >
        {/* Top gradient line — matches main header perfectly */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient" />

        {!effectiveCollapsed ? (
          <div className={cn("flex items-center gap-3 transition-all duration-500 relative z-10", isScrolled && "gap-2.5")}>
            <div
              className={cn(
                "bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 rounded-xl ring-4 ring-violet-500/30 shadow-lg transition-all duration-500",
                isScrolled ? "p-2" : "p-2.5"
              )}
            >
              <Sparkles className={cn("text-white", isScrolled ? "w-5 h-5" : "w-6 h-6")} />
            </div>

                  <div>
                   <h5
                    className={cn(  "text-white transition-all duration-500",
                     isScrolled ? "text-base" : "text-lg"
                    )}
                  >
                    Affiniks
                  </h5>

             
             <p className="text-[9px] font-bold text-white uppercase tracking-wider">
                RMS Platform
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto relative z-10">
            <div
              className={cn(
                "bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 rounded-xl ring-4 ring-violet-500/30 shadow-lg",
                isScrolled ? "p-2" : "p-2.5"
              )}
            >
              <Sparkles className={cn("text-white", isScrolled ? "w-5 h-5" : "w-6 h-6")} />
            </div>
          </div>
        )}

        {!effectiveCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-violet-500/30 hover:border-violet-400 transition-all hover:scale-110 flex items-center justify-center shadow-md relative z-10"
          >
            <ChevronLeft className="w-4 h-4 text-violet-300" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        ref={scrollRef}
        className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0"
      >
        {navItems.map(item => (
          <NavItemComponent key={item.id} item={item} isCollapsed={effectiveCollapsed} />
        ))}
      </nav>

      {/* Footer */}
      {!effectiveCollapsed && (
        <div className="p-5 border-t border-violet-500/20 bg-gradient-to-r from-white/6 via-violet-500/12 to-purple-500/12">
          <div className="p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-violet-500/30 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
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