import React from "react";
import { useHasRole } from "@/hooks/useCan";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Can } from "@/components/auth/Can";
import {
  Users,
  Briefcase,
  UserCheck,
  Building2,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Calendar,
  Cog,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";

// Admin Dashboard Component
const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Complete system overview and management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Can anyOf={["manage:users"]}>
            <Button asChild>
              <Link to="/users/new">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Link>
            </Button>
          </Can>
          <Can anyOf={["manage:all"]}>
            <Button variant="outline" asChild>
              <Link to="/system">
                <Cog className="mr-2 h-4 w-4" />
                System Settings
              </Link>
            </Button>
          </Can>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Projects
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Candidates
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,567</div>
            <p className="text-xs text-muted-foreground">
              +23% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Clients
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/roles">
                <Cog className="mr-2 h-4 w-4" />
                Manage Roles
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Current system status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="mr-1 h-3 w-3" />
                Healthy
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">API Services</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="mr-1 h-3 w-3" />
                Online
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Background Jobs</span>
              <Badge
                variant="default"
                className="bg-yellow-100 text-yellow-800"
              >
                <Clock className="mr-1 h-3 w-3" />
                Running
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <div className="font-medium">New user registered</div>
              <div className="text-muted-foreground">2 minutes ago</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Project status updated</div>
              <div className="text-muted-foreground">15 minutes ago</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Candidate interview scheduled</div>
              <div className="text-muted-foreground">1 hour ago</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Manager Dashboard Component
const ManagerDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manager Dashboard
          </h1>
          <p className="text-muted-foreground">
            Team and project management overview
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              3 active, 9 completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">All active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Interviews
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">+2% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/projects">
                <Briefcase className="mr-2 h-4 w-4" />
                Manage Projects
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/candidates">
                <UserCheck className="mr-2 h-4 w-4" />
                Review Candidates
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/interviews">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Interviews
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest team activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <div className="font-medium">New candidate applied</div>
              <div className="text-muted-foreground">30 minutes ago</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Interview completed</div>
              <div className="text-muted-foreground">2 hours ago</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Project deadline updated</div>
              <div className="text-muted-foreground">1 day ago</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Recruiter Dashboard Component
const RecruiterDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Recruiter Dashboard
          </h1>
          <p className="text-muted-foreground">
            Candidate and interview management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link to="/candidates/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Candidate
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Candidates</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">
              12 active, 33 placed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Interviews
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              2 completed, 1 pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">73%</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common recruitment tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/candidates">
                <UserCheck className="mr-2 h-4 w-4" />
                View Candidates
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/interviews">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Interview
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/documents">
                <FileText className="mr-2 h-4 w-4" />
                Review Documents
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>Your upcoming activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <div className="font-medium">Interview with John Doe</div>
              <div className="text-muted-foreground">
                2:00 PM - Technical Round
              </div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Candidate screening</div>
              <div className="text-muted-foreground">
                4:00 PM - 5 candidates
              </div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Team meeting</div>
              <div className="text-muted-foreground">
                5:30 PM - Daily standup
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Main Dashboard Page Component
const DashboardPage: React.FC = () => {
  const isAdmin = useHasRole(["CEO", "Director"]);
  const isManager = useHasRole(["CEO", "Director", "Manager"]);
  const isRecruiter = useHasRole(["Recruiter"]);

  return (
    <>
      {/* Role-based dashboard rendering */}
      <Can roles={["CEO", "Director"]}>
        <AdminDashboard />
      </Can>
      <Can roles={["Manager"]}>
        <ManagerDashboard />
      </Can>
      <Can roles={["Recruiter"]}>
        <RecruiterDashboard />
      </Can>

      {/* Fallback for users without specific roles */}
      {!isAdmin && !isManager && !isRecruiter && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to Affiniks RMS</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <CardDescription>
                You don't have any specific role assigned yet. Please contact
                your administrator.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}
    </>
  );
};

export default DashboardPage;
