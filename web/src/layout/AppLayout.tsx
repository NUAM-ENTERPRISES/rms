import { useState, ReactNode } from "react";
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

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col relative bg-gradient-to-br from-background via-muted/30 to-background">
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
