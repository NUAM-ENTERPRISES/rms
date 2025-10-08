import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  Users,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  TrendingUp,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
  Shield,
  Activity,
  BarChart3,
  History,
  Settings,
  Eye,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { useGetClientQuery } from "@/features/clients";

// Helper function to format date - following FE guidelines: DD MMM YYYY
const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Helper function to format currency
const formatCurrency = (amount?: number) => {
  if (!amount) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Client type badge component
const ClientTypeBadge = ({ type }: { type: string }) => {
  const typeConfig = {
    INDIVIDUAL: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Users,
      label: "Individual Referrer",
    },
    SUB_AGENCY: {
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: Building2,
      label: "Sub Agency",
    },
    HEALTHCARE_ORGANIZATION: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: Shield,
      label: "Healthcare Organization",
    },
    EXTERNAL_SOURCE: {
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: ExternalLink,
      label: "External Source",
    },
  };

  const config =
    typeConfig[type as keyof typeof typeConfig] || typeConfig.INDIVIDUAL;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border gap-1 px-2 py-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    active: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
    },
    inactive: {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: XCircle,
    },
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border gap-1 px-2 py-1`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

// Mock metrics and history data (to be replaced with real API calls)
const mockMetrics = {
  totalProjects: 0,
  activeProjects: 0,
  completedProjects: 0,
  totalRevenue: 0,
  averageProjectValue: 0,
  successRate: 0,
  averageTimeToFill: 0,
};

const mockHistory = [
  {
    id: "1",
    action: "Client Created",
    description: "Client was added to the system",
    date: new Date().toISOString(),
    user: "System",
  },
];

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const canReadClients = useCan("read:clients");
  const canWriteClients = useCan("write:clients");
  const canManageClients = useCan("manage:clients");

  // Fetch client data from API
  const { data: clientData, isLoading, error } = useGetClientQuery(id!);

  const client = clientData?.data;

  const handleEdit = () => {
    navigate(`/clients/${id}/edit`);
  };

  const handleDelete = () => {
    toast.error("Delete functionality coming soon");
  };

  if (!canReadClients) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to view clients.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/clients")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Clients
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                Loading Client...
              </h1>
              <p className="text-slate-600">
                Please wait while we fetch client data
              </p>
            </div>
          </div>
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Client Not Found
              </CardTitle>
              <CardDescription className="text-slate-600">
                The client you're looking for doesn't exist or has been removed.
              </CardDescription>
              <Button onClick={() => navigate("/clients")} className="mt-4">
                Back to Clients
              </Button>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            {client.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <ClientTypeBadge type={client.type} />
            <StatusBadge status="active" />
            <span className="text-sm text-slate-500">
              Created {formatDate(client.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canWriteClients && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canManageClients && (
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Client Information */}
            <Card className="xl:col-span-2 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Point of Contact
                    </label>
                    <p className="text-sm">{client.pointOfContact || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Email
                    </label>
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {client.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Phone
                    </label>
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {client.phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Facility Type
                    </label>
                    <p className="text-sm">{client.facilityType || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Facility Size
                    </label>
                    <p className="text-sm">{client.facilitySize || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Locations
                    </label>
                    <p className="text-sm">
                      {client.locations?.join(", ") || "N/A"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Address
                  </label>
                  <p className="text-sm flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    {client.address || "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Projects
                  </span>
                  <span className="font-semibold">
                    {client.projects?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Active Projects
                  </span>
                  <span className="font-semibold text-green-600">
                    {client.projects?.filter((p) => p.status === "active")
                      .length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Success Rate
                  </span>
                  <span className="font-semibold">
                    {mockMetrics.successRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Revenue
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(mockMetrics.totalRevenue)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contract Information */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <FileText className="h-5 w-5 text-blue-600" />
                Contract Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Relationship Type
                  </label>
                  <p className="text-sm">{client.relationshipType || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Commission Rate
                  </label>
                  <p className="text-sm">{client.commissionRate}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Payment Terms
                  </label>
                  <p className="text-sm">{client.paymentTerms || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Tax ID
                  </label>
                  <p className="text-sm">{client.taxId || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Contract Start
                  </label>
                  <p className="text-sm">
                    {formatDate(client.contractStartDate)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Contract End
                  </label>
                  <p className="text-sm">
                    {formatDate(client.contractEndDate)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created
                  </label>
                  <p className="text-sm">{formatDate(client.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </label>
                  <p className="text-sm">{formatDate(client.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Projects
              </CardTitle>
              <CardDescription className="text-slate-600">
                All projects associated with this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Candidates</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.projects && client.projects.length > 0 ? (
                    client.projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          {project.title}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={project.status} />
                        </TableCell>
                        <TableCell>{formatDate(project.deadline)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            Project details
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full w-1/3" />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              In Progress
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-slate-500">
                          No projects found for this client
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <History className="h-5 w-5 text-blue-600" />
                Activity History
              </CardTitle>
              <CardDescription className="text-slate-600">
                Recent activities and changes for this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{item.action}</h4>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(item.date)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        By {item.user}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-900">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(mockMetrics.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  No data available
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-900">
                  Success Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockMetrics.successRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  No data available
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-900">
                  Avg Time to Fill
                </CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockMetrics.averageTimeToFill} days
                </div>
                <p className="text-xs text-muted-foreground">
                  No data available
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-900">
                  Active Projects
                </CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {client.projects?.filter((p) => p.status === "active")
                    .length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {client.projects?.filter((p) => p.status === "completed")
                    .length || 0}{" "}
                  completed
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Settings className="h-5 w-5 text-blue-600" />
                Client Settings
              </CardTitle>
              <CardDescription className="text-slate-600">
                Manage client preferences and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Billing Address</h4>
                  <p className="text-sm text-muted-foreground">
                    {client.billingAddress || "No billing address set"}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Commission Rate</h4>
                  <p className="text-sm text-muted-foreground">
                    {client.commissionRate}%
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Payment Terms</h4>
                  <p className="text-sm text-muted-foreground">
                    {client.paymentTerms || "No payment terms set"}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
