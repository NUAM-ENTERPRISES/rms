import React from "react";
import { useAppSelector } from "@/app/hooks";
import UserMenu from "@/components/molecules/UserMenu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Briefcase,
  UserCheck,
  Settings,
  BarChart3,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function DashboardContent() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  if (!user) return null;

  const hasPermission = (permission: string) => {
    return (
      user.permissions.includes(permission) || user.permissions.includes("*")
    );
  };

  const hasRole = (role: string) => {
    return user.roles.includes(role);
  };

  const dashboardItems = [
    {
      title: "Candidates",
      description: "Manage candidate profiles and applications",
      icon: UserCheck,
      href: "/candidates",
      permission: "read:candidates",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Projects",
      description: "View and manage recruitment projects",
      icon: Briefcase,
      href: "/projects",
      permission: "read:projects",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Users",
      description: "Manage team members and permissions",
      icon: Users,
      href: "/users",
      permission: "read:users",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      roles: ["CEO", "Director", "Manager"],
    },
    {
      title: "Analytics",
      description: "View recruitment metrics and insights",
      icon: BarChart3,
      href: "/analytics",
      permission: "read:analytics",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Documents",
      description: "Manage candidate documents and verifications",
      icon: FileText,
      href: "/documents",
      permission: "read:documents",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Settings",
      description: "Configure system settings and preferences",
      icon: Settings,
      href: "/settings",
      permission: "manage:users",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
  ];

  const visibleItems = dashboardItems.filter((item) => {
    if (item.roles && !item.roles.some((role) => hasRole(role))) {
      return false;
    }
    return hasPermission(item.permission);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <div className="flex space-x-2">
                {user.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user.name}!
          </h2>
          <p className="text-muted-foreground">
            Here's what you can do with your current permissions.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(item.href)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${item.bgColor}`}>
                      <Icon className={`h-6 w-6 ${item.color}`} />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {item.description}
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Open {item.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        {hasPermission("read:analytics") && (
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-foreground mb-6">
              Quick Stats
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <UserCheck className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">24</p>
                      <p className="text-sm text-muted-foreground">
                        Active Candidates
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <Briefcase className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">8</p>
                      <p className="text-sm text-muted-foreground">
                        Open Projects
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <Users className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">12</p>
                      <p className="text-sm text-muted-foreground">
                        Team Members
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-8 w-8 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">85%</p>
                      <p className="text-sm text-muted-foreground">
                        Success Rate
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  React.useEffect(() => {
    // Mark dashboard as ready for performance measurement
    performance.mark("route:dashboard:ready");
  }, []);

  return <DashboardContent />;
}
