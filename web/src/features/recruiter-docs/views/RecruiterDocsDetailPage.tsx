import React from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  ArrowLeft,
  Download,
  Eye,
  MoreVertical,
  History,
  User,
  Building2,
  Calendar,
  RefreshCw,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RecruiterDocsDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Mock project data
  const project = {
    id: projectId || "PRJ001",
    name: "Senior Frontend Developer - TechCorp",
    client: "TechCorp Solutions",
    status: "Active",
    manager: "John Doe",
    deadline: "2024-01-15",
    description: "Recruitment for senior frontend position with React expertise.",
  };

  const projectDocs = [
    {
      id: "DOC001",
      name: "Client Service Agreement",
      type: "Legal",
      status: "Verified",
      updatedAt: "2023-12-10",
      version: "v2.0",
    },
    {
      id: "DOC002",
      name: "Job Description - Signed",
      type: "Requirement",
      status: "Pending",
      updatedAt: "2023-12-15",
      version: "v1.0",
    },
    {
      id: "DOC003",
      name: "Budget Approval",
      type: "Financial",
      status: "Rejected",
      updatedAt: "2023-12-18",
      version: "v1.1",
      reason: "Missing signature from finance head",
    },
  ];

  const candidateDocs = [
    {
      id: "CDOC001",
      candidate: "Alice Johnson",
      name: "Offer Letter - Signed",
      status: "Verified",
      updatedAt: "2023-12-20",
    },
    {
      id: "CDOC002",
      candidate: "Bob Smith",
      name: "Background Check Consent",
      status: "Pending",
      updatedAt: "2023-12-22",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20">Verified</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200 hover:bg-yellow-500/20">Pending</Badge>;
      case "Rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button 
          variant="ghost" 
          className="w-fit -ml-2 text-muted-foreground"
          onClick={() => navigate("/recruiter-docs")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant="outline" className="ml-2">{project.id}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {project.client}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Manager: {project.manager}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Deadline: {project.deadline}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="project-docs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="project-docs">Project Documents</TabsTrigger>
          <TabsTrigger value="candidate-docs">Candidate Documents</TabsTrigger>
          <TabsTrigger value="settings">Requirements</TabsTrigger>
        </TabsList>

        <TabsContent value="project-docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Level Documents</CardTitle>
              <CardDescription>
                Mandatory documents required for the project lifecycle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span>{doc.name}</span>
                            {doc.reason && (
                              <span className="text-xs text-destructive flex items-center gap-1 mt-1">
                                <AlertCircle className="h-3 w-3" />
                                {doc.reason}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{doc.type}</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {doc.version}
                        </Badge>
                      </TableCell>
                      <TableCell>{doc.updatedAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Re-upload">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidate-docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Specific Documents</CardTitle>
              <CardDescription>
                Documents related to candidates assigned to this project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidateDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.candidate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {doc.name}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>{doc.updatedAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Re-upload">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Sidebar/Bottom Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Project Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {project.description}
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg border border-dashed">
              <p className="text-xs font-medium mb-2">Internal Recruiter Note:</p>
              <p className="text-xs text-muted-foreground italic">
                "Please ensure all client-side signatures are collected before the end of the week to avoid delays in candidate onboarding."
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completion Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Progress</span>
                <span className="font-bold">65%</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-[65%]" />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>3 Verified</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span>2 Pending</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span>1 Rejected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecruiterDocsDetailPage;
