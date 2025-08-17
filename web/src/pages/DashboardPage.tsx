import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  UserPlus,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth);

  const stats = [
    {
      title: "Active Projects",
      value: 0,
      icon: Briefcase,
      color: "text-primary-500",
      bgColor: "bg-primary-50",
    },
    {
      title: "Total Candidates",
      value: 0,
      icon: Users,
      color: "text-accent-500",
      bgColor: "bg-accent-50",
    },
    {
      title: "New Applications",
      value: 0,
      icon: UserPlus,
      color: "text-success-500",
      bgColor: "bg-success-50",
    },
    {
      title: "Shortlisted",
      value: 0,
      icon: TrendingUp,
      color: "text-warning-500",
      bgColor: "bg-warning-50",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-muted-200 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Affiniks RMS
                </h1>
                <p className="text-sm text-muted-600">
                  Recruitment Management System
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-600">
                Welcome, {user?.name || "User"}
              </span>
              <Button variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-600 mt-2">
              Overview of your recruitment activities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-600">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bgColor}`}
                    >
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Welcome to Affiniks RMS</CardTitle>
              <CardDescription>
                Your recruitment management system is ready
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-600">
                This is Phase 1 of the Affiniks Recruitment Management System.
                The backend API is being set up and will be available soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
