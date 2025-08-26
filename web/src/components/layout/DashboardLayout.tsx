import React from "react";
import { SidebarNavigation } from "@/components/navigation/SidebarNavigation";
import UserMenu from "@/components/molecules/UserMenu";
import { usePermissions } from "@/hooks/usePermissions";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
}) => {
  const { roles, isManager, isAdmin } = usePermissions();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/dashboard" className="mr-6 flex items-center space-x-2">
              <img src="/logo.png" alt="Affiniks" className="h-8 w-auto" />
              <span className="hidden font-bold sm:inline-block">
                Affiniks RMS
              </span>
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="flex items-center space-x-2">
              {/* Role indicator */}
              <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Role:</span>
                <span className="font-medium text-foreground">
                  {roles.join(", ")}
                </span>
              </div>

              {/* Admin badge */}
              {isAdmin && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  Admin
                </span>
              )}

              {/* Manager badge */}
              {isManager && !isAdmin && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  Manager
                </span>
              )}
            </div>

            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        {/* Sidebar */}
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <div className="py-6 pr-2 lg:py-8">
            <SidebarNavigation />
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex w-full flex-col overflow-hidden">
          <div className="flex-1 space-y-4 p-4 pt-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

// Import Link at the top
import { Link } from "react-router-dom";
