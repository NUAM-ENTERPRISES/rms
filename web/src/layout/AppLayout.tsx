import { useState, ReactNode } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Breadcrumbs from "./Breadcrumbs";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div
      className={`h-screen overflow-hidden flex flex-col relative ${theme === "dark" ? "bg-[#181a20] text-[#f3f3f3]" : "bg-[#f7fafc] text-[#222]"}`}
      style={theme === "dark"
        ? {
            background: "linear-gradient(135deg, rgba(24,26,32,0.95) 0%, rgba(34,36,42,0.9) 50%, rgba(40,44,52,0.85) 100%)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }
        : {
            background: "linear-gradient(135deg, rgba(224, 242, 254, 0.7) 0%, rgba(240, 249, 255, 0.6) 50%, rgba(239, 246, 255, 0.5) 100%)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }
      }
    >
      {/* Header */}
      <Header onMobileMenuToggle={handleMobileMenuToggle} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block h-full">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleSidebarToggle}
          />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Page Content */}
          <div className="flex-1 p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
