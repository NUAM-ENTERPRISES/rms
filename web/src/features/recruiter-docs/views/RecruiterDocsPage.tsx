import React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ExternalLink,
  FolderOpen,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockProjects = [
  {
    id: "PRJ001",
    name: "Senior Frontend Developer - TechCorp",
    client: "TechCorp Solutions",
    status: "Active",
    docsSubmitted: 3,
    docsRequired: 5,
    lastUpdated: "2023-12-20",
    priority: "High",
  },
  {
    id: "PRJ002",
    name: "Backend Engineer - FinStream",
    client: "FinStream Inc",
    status: "Active",
    docsSubmitted: 5,
    docsRequired: 5,
    lastUpdated: "2023-12-22",
    priority: "Medium",
  },
  {
    id: "PRJ003",
    name: "Product Designer - CreativeFlow",
    client: "CreativeFlow Studio",
    status: "On Hold",
    docsSubmitted: 1,
    docsRequired: 4,
    lastUpdated: "2023-12-15",
    priority: "Low",
  },
  {
    id: "PRJ004",
    name: "DevOps Specialist - CloudScale",
    client: "CloudScale Systems",
    status: "Active",
    docsSubmitted: 2,
    docsRequired: 6,
    lastUpdated: "2023-12-21",
    priority: "High",
  },
];

const RecruiterDocsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruiter Documents</h1>
          <p className="text-muted-foreground">
            Manage and submit project-related documents for your assigned projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Submission
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Docs</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Across 4 projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Docs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">92% verification rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Required</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Rejected documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Project Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Documents Status</CardTitle>
          <CardDescription>
            Track document submission progress for each of your projects.
          </CardDescription>
          <div className="flex items-center py-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProjects.map((project) => (
                <TableRow 
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/recruiter-docs/${project.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="hover:underline text-primary">{project.name}</span>
                      <span className="text-xs text-muted-foreground">{project.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>{project.client}</TableCell>
                  <TableCell>
                    <Badge variant={project.status === "Active" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{project.docsSubmitted}/{project.docsRequired} docs</span>
                        <span>{Math.round((project.docsSubmitted / project.docsRequired) * 100)}%</span>
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full" 
                          style={{ width: `${(project.docsSubmitted / project.docsRequired) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{project.lastUpdated}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="View Details"
                        onClick={() => navigate(`/recruiter-docs/${project.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity or Notifications */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>Your latest document uploads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Offer_Letter_Candidate_{i}.pdf
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded to Project PRJ00{i} • 2 hours ago
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    Verified
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Required Documents</CardTitle>
            <CardDescription>Pending items that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="bg-yellow-100 p-2 rounded-full">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Client Agreement - Project PRJ004
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Missing mandatory signature • Due in 2 days
                    </p>
                  </div>
                  <Button size="sm" variant="outline">Upload</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecruiterDocsPage;
