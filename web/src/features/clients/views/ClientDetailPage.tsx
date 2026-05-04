import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  Users,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  Briefcase,
  Shield,
  Handshake,
  Activity,
  BarChart3,
  History,
  Settings,
  Eye,
  Plus,
  Calendar,
  ExternalLink,
  FolderOpen,
  Globe,
  UserCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { useDebounce } from "@/hooks/useDebounce";
import { useGetClientQuery } from "@/features/clients";
import { LinkSubClientDialog } from "@/features/clients/components/LinkSubClientDialog";
import { ProjectCountryCell } from "@/components/molecules/domain/ProjectCountryCell";
import { useGetClientProjectsSummaryQuery } from "@/features/projects";
import { cn } from "@/lib/utils";

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
    DIRECT_CLIENT: {
      color: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-emerald-100/50",
      icon: Briefcase,
      label: "Direct client",
    },
    SUB_AGENT: {
      color: "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-200 shadow-purple-100/50",
      icon: Building2,
      label: "Sub Agent",
    },
    FREELANCE: {
      color: "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200 shadow-amber-100/50",
      icon: Handshake,
      label: "Freelance",
    },
  };

  const config =
    typeConfig[type as keyof typeof typeConfig] || typeConfig.DIRECT_CLIENT;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border gap-1.5 px-3 py-1.5 font-medium shadow-sm`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    active: {
      color: "bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200",
      dot: "bg-green-500",
    },
    inactive: {
      color: "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border-slate-200",
      dot: "bg-slate-400",
    },
    pending: {
      color: "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    },
    completed: {
      color: "bg-gradient-to-r from-sky-50 to-sky-100 text-sky-800 border-sky-200",
      dot: "bg-sky-500",
    },
    cancelled: {
      color: "bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200",
      dot: "bg-red-500",
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] ?? {
      color: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
    };

  const label =
    status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

  return (
    <Badge className={`${config.color} border gap-1.5 px-3 py-1.5 font-medium`}>
      <span className={`h-2 w-2 rounded-full ${config.dot} shrink-0`} />
      {label}
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

const CLIENT_PROJECTS_PAGE_SIZE = 10;

const formatProjectTypeLabel = (projectType: string) =>
  projectType
    ? projectType.charAt(0).toUpperCase() + projectType.slice(1).replace(/_/g, " ")
    : "—";

const formatPriorityLabel = (priority: string) =>
  priority
    ? priority.charAt(0).toUpperCase() + priority.slice(1)
    : "—";

function StatCountCircle({
  value,
  accentClass,
}: {
  value: number;
  accentClass: string;
}) {
  return (
    <div
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold tabular-nums shadow-sm",
        accentClass,
      )}
      aria-hidden
    >
      {value}
    </div>
  );
}

export default function ClientDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const canReadClients = useCan("read:clients");
  const canWriteClients = useCan("write:clients");
  const canManageClients = useCan("manage:clients");
  const [addSubClientOpen, setAddSubClientOpen] = useState(false);
  const [projectsPage, setProjectsPage] = useState(1);
  const [projectsSearch, setProjectsSearch] = useState("");
  const debouncedProjectsSearch = useDebounce(projectsSearch, 400);

  // Fetch client data from API
  const { data: clientData, isLoading, error } = useGetClientQuery(id);

  useEffect(() => {
    setProjectsPage(1);
  }, [id, debouncedProjectsSearch]);

  const { data: projectsListReply, isFetching: isProjectsListFetching } =
    useGetClientProjectsSummaryQuery(
      {
        clientId: id,
        page: projectsPage,
        limit: CLIENT_PROJECTS_PAGE_SIZE,
        search: debouncedProjectsSearch.trim() || undefined,
      },
      { skip: !id },
    );

  const client = clientData?.data;

  const clientProjectsTab = projectsListReply?.data?.projects ?? [];
  const projectsPagination = projectsListReply?.data?.pagination;

  const supportsLinkedSubClients =
    client?.type === "SUB_AGENT" || client?.type === "FREELANCE";

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

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8">
      {/* Hero Header Card */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <CardContent className="relative p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Avatar */}
            <Avatar className="h-20 w-20 border-4 border-white/20 shadow-2xl">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                  {client.name}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ClientTypeBadge type={client.type} />
                <StatusBadge status="active" />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Created {formatDate(client.createdAt)}
                </span>
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {client.email}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {canWriteClients && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleEdit}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {canManageClients && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDelete}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-400/20"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-8"
      >
        <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-100/80 p-1.5 text-slate-600 shadow-inner w-full lg:w-auto">
          <TabsTrigger
            value="overview"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md"
          >
            <Building2 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="projects"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md"
          >
            <FolderOpen className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md"
          >
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger
            value="metrics"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md"
          >
            <BarChart3 className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md"
          >
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <StatCountCircle
                    value={client.projectCount ?? 0}
                    accentClass="border-blue-200 bg-blue-50 text-blue-700"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Projects</p>
                    <p className="text-sm text-muted-foreground">Total linked</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <StatCountCircle
                    value={client.activeProjectCount ?? 0}
                    accentClass="border-emerald-200 bg-emerald-50 text-emerald-700"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Active</p>
                    <p className="text-sm text-muted-foreground">Open projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <StatCountCircle
                    value={
                      client.subClientCount ??
                      client.subClientLinks?.length ??
                      0
                    }
                    accentClass="border-purple-200 bg-purple-50 text-purple-700"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      Sub-clients
                    </p>
                    <p className="text-sm text-muted-foreground">Linked orgs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <StatCountCircle
                    value={
                      client.parentClientCount ??
                      client.parentClientLinks?.length ??
                      0
                    }
                    accentClass="border-amber-200 bg-amber-50 text-amber-700"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      Parents
                    </p>
                    <p className="text-sm text-muted-foreground">Parent links</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Client Information */}
            <Card className="xl:col-span-2 border border-slate-200/60 shadow-sm bg-white">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                    <UserCircle className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Point of Contact
                      </label>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {client.pointOfContact || "Not specified"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                    <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Email
                      </label>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {client.email || "Not specified"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                    <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Phone
                      </label>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {client.phone || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-800">
                      Location
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/50 to-slate-50 border border-blue-100/50">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Country
                      </label>
                      <div className="mt-2">
                        <ProjectCountryCell
                          countryCode={client.addressCountryCode}
                          countryName={client.addressCountry?.name ?? null}
                          fallbackText="Not specified"
                        />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50/50 to-slate-50 border border-purple-100/50">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        State / Region
                      </label>
                      <p className="text-sm font-medium text-slate-900 mt-2">
                        {client.addressState?.name ||
                          client.addressStateId ||
                          "Not specified"}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/50 to-slate-50 border border-amber-100/50">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Street Address
                      </label>
                      <p className="text-sm font-medium text-slate-900 mt-2 flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                        {client.address?.trim() || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Card */}
            <Card className="border border-slate-200/60 shadow-sm bg-white">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                    <UserCircle className="h-4 w-4" />
                  </div>
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {client.pointOfContact && (
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <UserCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-900">{client.pointOfContact}</p>
                        <p className="text-xs text-muted-foreground">Primary Contact</p>
                      </div>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{client.email}</p>
                        <p className="text-xs text-muted-foreground">Email</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900">{client.phone}</p>
                        <p className="text-xs text-muted-foreground">Phone</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  {!client.pointOfContact && !client.email && !client.phone && (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No contact details available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {supportsLinkedSubClients ? (
            <>
              <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-violet-50/50 to-white">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-slate-900">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                          <Users className="h-4 w-4" />
                        </div>
                        Linked End Clients
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Organizations linked to this Sub Agent or Freelance
                        record
                      </CardDescription>
                    </div>
                    {canManageClients ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setAddSubClientOpen(true)}
                        className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" aria-hidden />
                        Add sub-client
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {client.subClientLinks && client.subClientLinks.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                      {client.subClientLinks.map((link) => (
                        <li
                          key={link.id}
                          className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-slate-200">
                              <AvatarFallback className="bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 text-sm font-medium">
                                {link.child?.name?.slice(0, 2).toUpperCase() ?? "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900">
                                {link.child?.name ?? "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">End client</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              link.child?.id &&
                              navigate(`/clients/${link.child.id}`)
                            }
                            disabled={!link.child?.id}
                            className="gap-2"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-12 px-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-400 mx-auto mb-4">
                        <Users className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-medium text-slate-900 mb-1">No linked clients yet</p>
                      <p className="text-sm text-muted-foreground">
                        Use "Add sub-client" to create and link an end client.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <LinkSubClientDialog
                open={addSubClientOpen}
                onOpenChange={setAddSubClientOpen}
                parentClientId={client.id}
                parentName={client.name}
              />
            </>
          ) : null}

          {client.parentClientLinks && client.parentClientLinks.length > 0 ? (
            <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-white">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  Intermediary Relationship
                </CardTitle>
                <CardDescription className="mt-1">
                  This organization is linked as an end client via a sub-agent or
                  freelance contact
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-slate-100">
                  {client.parentClientLinks.map((link) => (
                    <li
                      key={link.id}
                      className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-200">
                          <AvatarFallback className="bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-700 text-sm font-medium">
                            {link.parent?.name?.slice(0, 2).toUpperCase() ?? "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-900">
                            {link.parent?.name ?? "Unknown"}
                          </p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {link.linkType.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          link.parent?.id &&
                          navigate(`/clients/${link.parent.id}`)
                        }
                        disabled={!link.parent?.id}
                        className="gap-2"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View parent
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* Contract Information — not needed for now; uncomment to restore on overview.
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
          */}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white space-y-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  Projects
                </CardTitle>
                <CardDescription className="text-slate-600 mt-1">
                  All projects associated with this client
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:max-w-sm">
                <Label htmlFor="client-projects-search" className="sr-only">
                  Search projects by title or description
                </Label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    aria-hidden
                  />
                  <Input
                    id="client-projects-search"
                    type="search"
                    placeholder="Search projects…"
                    value={projectsSearch}
                    onChange={(e) => setProjectsSearch(e.target.value)}
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {clientProjectsTab.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                          <TableHead className="font-semibold min-w-[180px]">
                            Title
                          </TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold whitespace-nowrap">
                            Deadline
                          </TableHead>
                          <TableHead className="font-semibold min-w-[140px]">
                            Country
                          </TableHead>
                          <TableHead className="font-semibold">Priority</TableHead>
                          <TableHead className="font-semibold whitespace-nowrap">
                            Created
                          </TableHead>
                          <TableHead className="font-semibold whitespace-nowrap">
                            Type
                          </TableHead>
                          <TableHead className="font-semibold text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientProjectsTab.map((project) => (
                          <TableRow
                            key={project.id}
                            className="hover:bg-slate-50/50 cursor-pointer"
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600">
                                  <Briefcase className="h-5 w-5" />
                                </div>
                                <p className="font-medium text-slate-900 line-clamp-2">
                                  {project.title}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={project.status} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                {formatDate(project.deadline ?? undefined)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <ProjectCountryCell
                                countryCode={project.countryCode}
                                countryName={project.country?.name ?? null}
                                fallbackText="—"
                              />
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium text-slate-800">
                                {formatPriorityLabel(project.priority)}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-slate-600">
                              {formatDate(project.createdAt)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-slate-700">
                              {formatProjectTypeLabel(project.projectType)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/projects/${project.id}`);
                                }}
                                className="gap-2 hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {projectsPagination && projectsPagination.totalPages > 1 ? (
                    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {projectsPagination.page} of{" "}
                        {projectsPagination.totalPages}
                        <span className="mx-1">·</span>
                        {projectsPagination.total} project
                        {projectsPagination.total !== 1 ? "s" : ""}
                        {isProjectsListFetching ? " (updating…)" : ""}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            projectsPage <= 1 || isProjectsListFetching
                          }
                          onClick={() =>
                            setProjectsPage((p) => Math.max(1, p - 1))
                          }
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            projectsPage >= projectsPagination.totalPages ||
                            isProjectsListFetching
                          }
                          onClick={() =>
                            setProjectsPage((p) =>
                              Math.min(projectsPagination.totalPages, p + 1),
                            )
                          }
                          aria-label="Next page"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-center py-16 px-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto mb-4">
                    <FolderOpen className="h-10 w-10" />
                  </div>
                  <p className="text-lg font-medium text-slate-900 mb-2">
                    {debouncedProjectsSearch.trim()
                      ? "No matching projects"
                      : "No projects yet"}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {debouncedProjectsSearch.trim()
                      ? "Try a different search term."
                      : "This client has no projects linked yet."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <History className="h-4 w-4" />
                </div>
                Activity History
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Recent activities and changes for this client
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-blue-100 to-transparent" />

                <div className="space-y-6">
                  {mockHistory.map((item, index) => (
                    <div key={item.id} className="relative flex gap-4 pl-10">
                      {/* Timeline dot */}
                      <div className="absolute left-0 flex h-8 w-8 items-center justify-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white shadow-sm">
                          <Activity className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <h4 className="font-semibold text-slate-900">{item.action}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(item.date)}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                              {item.user.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {item.user}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {mockHistory.length === 1 && (
                  <div className="text-center py-8 mt-6 border-t border-dashed border-slate-200">
                    <p className="text-sm text-muted-foreground">
                      More activity will appear here as you work with this client.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-5">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Revenue
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 group-hover:scale-110 transition-transform">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {formatCurrency(mockMetrics.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-slate-300" />
                  No data available
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-5">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Success Rate
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {mockMetrics.successRate}%
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-slate-300" />
                  No data available
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-5">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Avg Time to Fill
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform">
                  <Clock className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {mockMetrics.averageTimeToFill} <span className="text-lg font-medium text-slate-500">days</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-slate-300" />
                  No data available
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-400 to-violet-500" />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-5">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Active Projects
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
                  <Activity className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {client.activeProjectCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  {client.projectCount ?? 0} total projects
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Metrics Overview Card */}
          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <BarChart3 className="h-4 w-4" />
                </div>
                Performance Overview
              </CardTitle>
              <CardDescription className="mt-1">
                Summary of client performance and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-12">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto mb-4">
                  <BarChart3 className="h-10 w-10" />
                </div>
                <p className="text-lg font-medium text-slate-900 mb-2">Analytics Coming Soon</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Detailed performance charts and analytics will be available once there's more project history with this client.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-slate-200/60 shadow-sm bg-white">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  Billing & Payment
                </CardTitle>
                <CardDescription className="mt-1">
                  Manage billing address and payment terms
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100">
                <div className="flex items-center justify-between py-4 first:pt-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">Billing Address</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {client.billingAddress || "No billing address set"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">Commission Rate</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {client.commissionRate}%
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
                <div className="flex items-center justify-between py-4 last:pb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">Payment Terms</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {client.paymentTerms || "No payment terms set"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 shadow-sm bg-white">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Shield className="h-4 w-4" />
                  </div>
                  Account Settings
                </CardTitle>
                <CardDescription className="mt-1">
                  Manage account status and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 border border-green-100">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Account Active</p>
                        <p className="text-xs text-green-700">This client account is currently active</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Danger Zone</p>
                    <div className="p-4 rounded-xl border border-red-200 bg-red-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-red-900">Deactivate Client</p>
                          <p className="text-xs text-red-700 mt-0.5">
                            This will hide the client from active lists
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-100">
                          Deactivate
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
