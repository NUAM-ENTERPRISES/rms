// import { useState, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   Plus,
//   Search,
//   Building2,
//   Users,
//   TrendingUp,
//   Calendar,
//   MapPin,
//   Phone,
//   Mail,
//   Briefcase,
//   MoreHorizontal,
//   Download,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { toast } from "sonner";
// import {
//   useGetClientsQuery,
//   useDeleteClientMutation,
// } from "@/features/clients";
// import { useCan } from "@/hooks/useCan";
// import { cn } from "@/lib/utils";

// export default function ClientsPage() {
//   const navigate = useNavigate();
//   const canWriteClients = useCan("write:clients");
//   const canReadClients = useCan("read:clients");

//   // State for filters and pagination
//   const [filters, setFilters] = useState({
//     type: "all",
//     search: "",
//     page: 1,
//     limit: 12,
//   });

//   // Handle pagination
//   const handlePageChange = (page: number) => {
//     setFilters((prev) => ({ ...prev, page }));
//   };

//   // Prepare API query params
//   const queryParams = useMemo(() => {
//     const params: any = { ...filters };
//     if (params.type === "all") {
//       delete params.type;
//     }
//     return params;
//   }, [filters]);

//   // API queries
//   const {
//     data: clientsData,
//     isLoading,
//     error,
//     refetch,
//   } = useGetClientsQuery(queryParams);
//   const [deleteClient] = useDeleteClientMutation();

//   // Computed values
//   const clients = clientsData?.data?.clients || [];
//   const pagination = clientsData?.data?.pagination;

//   // Client type options
//   const clientTypeOptions = [
//     {
//       value: "INDIVIDUAL",
//       label: "Individual Referrer",
//       icon: Users,
//       color: "bg-blue-100 text-blue-800",
//     },
//     {
//       value: "SUB_AGENCY",
//       label: "Sub Agency",
//       icon: Building2,
//       color: "bg-purple-100 text-purple-800",
//     },
//     {
//       value: "HEALTHCARE_ORGANIZATION",
//       label: "Healthcare Org",
//       icon: Building2,
//       color: "bg-green-100 text-green-800",
//     },
//     {
//       value: "EXTERNAL_SOURCE",
//       label: "External Source",
//       icon: Briefcase,
//       color: "bg-orange-100 text-orange-800",
//     },
//   ];

//   // Get client type display info
//   const getClientTypeInfo = (type: string) => {
//     return (
//       clientTypeOptions.find((option) => option.value === type) ||
//       clientTypeOptions[0]
//     );
//   };

//   // Format date - following FE guidelines: DD MMM YYYY
//   const formatDate = (dateString?: string) => {
//     if (!dateString) return "N/A";
//     const date = new Date(dateString);
//     return date.toLocaleDateString("en-GB", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     });
//   };

//   // Handle search
//   const handleSearch = (value: string) => {
//     setFilters((prev) => ({ ...prev, search: value, page: 1 }));
//   };

//   if (!canReadClients) {
//     return (
//       <div className="min-h-screen   p-6">
//         <div className="max-w-4xl mx-auto">
//           <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
//             <CardHeader className="text-center">
//               <CardTitle className="text-2xl font-bold text-slate-800">
//                 Access Denied
//               </CardTitle>
//               <CardDescription className="text-slate-600">
//                 You don't have permission to view clients.
//               </CardDescription>
//             </CardHeader>
//           </Card>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen  ">
//       <div className="w-full mx-auto space-y-6">
//         {/* Search & Filters Section */}
//         <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
//           <CardContent>
//             <div className="space-y-6">
//               {/* Premium Search Bar with Enhanced Styling */}
//               <div className="relative group">
//                 <div
//                   className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300 ${
//                     filters.search ? "text-blue-600" : "text-gray-400"
//                   }`}
//                 >
//                   <Search
//                     className={`h-5 w-5 transition-transform duration-300 ${
//                       filters.search ? "scale-110" : "scale-100"
//                     }`}
//                   />
//                 </div>
//                 <Input
//                   placeholder="Search clients by name, contact, or description..."
//                   value={filters.search}
//                   onChange={(e) => handleSearch(e.target.value)}
//                   className="pl-14 h-14 text-base border-0 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 focus:shadow-lg transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md"
//                 />
//                 <div
//                   className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${
//                     filters.search ? "ring-2 ring-blue-500/20" : ""
//                   }`}
//                 />
//               </div>

//               {/* Filters and Actions Row */}
//               <div className="flex flex-col lg:flex-row gap-4">
//                 {/* Client Type Filter */}
//                 <div className="flex items-center gap-3">
//                   <div className="flex items-center gap-2">
//                     <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
//                     <span className="text-sm font-semibold text-gray-700 tracking-wide">
//                       Type
//                     </span>
//                   </div>
//                   <Select
//                     value={filters.type}
//                     onValueChange={(value) =>
//                       setFilters((prev) => ({ ...prev, type: value }))
//                     }
//                   >
//                     <SelectTrigger className="h-11 px-4 border-0 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[140px]">
//                       <SelectValue placeholder="All Client Types" />
//                     </SelectTrigger>
//                     <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
//                       <SelectItem
//                         value="all"
//                         className="rounded-lg hover:bg-blue-50"
//                       >
//                         <div className="flex items-center gap-2">
//                           <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
//                           All Types
//                         </div>
//                       </SelectItem>
//                       {clientTypeOptions.map((option) => (
//                         <SelectItem
//                           key={option.value}
//                           value={option.value}
//                           className="rounded-lg hover:bg-blue-50"
//                         >
//                           <div className="flex items-center gap-2">
//                             <div
//                               className={`w-2 h-2 bg-${option.color}-500 rounded-full`}
//                             ></div>
//                             {option.label}
//                           </div>
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 {/* Add New Client Button */}
//                 {canWriteClients && (
//                   <Button
//                     onClick={() => navigate("/clients/create")}
//                     className="h-10 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 gap-2 text-sm"
//                   >
//                     <Plus className="h-3 w-3" />
//                     Add New Client
//                   </Button>
//                 )}

//                 {/* Export Button */}
//                 <Button
//                   variant="outline"
//                   className="h-10 px-3 text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md gap-2 text-sm"
//                 >
//                   <Download className="h-3 w-3" />
//                   Export
//                 </Button>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Clients Grid */}
//         {isLoading ? (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {[...Array(6)].map((_, i) => (
//               <Card
//                 key={i}
//                 className="border-0 shadow-lg bg-white/80 backdrop-blur-sm animate-pulse"
//               >
//                 <CardHeader className="pb-3">
//                   <div className="h-4 bg-slate-200 rounded w-3/4"></div>
//                   <div className="h-3 bg-slate-200 rounded w-1/2"></div>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
//                   <div className="h-3 bg-slate-200 rounded w-2/3"></div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         ) : error ? (
//           <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
//             <CardContent className="pt-6 text-center">
//               <p className="text-slate-600">
//                 Failed to load clients. Please try again.
//               </p>
//               <Button onClick={() => refetch()} className="mt-4">
//                 Retry
//               </Button>
//             </CardContent>
//           </Card>
//         ) : (
//           <>
//             {/* Clients Grid */}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//               {clients.map((client) => {
//                 const typeInfo = getClientTypeInfo(client.type);
//                 const IconComponent = typeInfo.icon;

//                 return (
//                   <Card
//                     key={client.id}
//                     className="group border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 cursor-pointer"
//                     onClick={() => navigate(`/clients/${client.id}`)}
//                   >
//                     <CardHeader className="pb-3">
//                       <div className="flex items-start justify-between">
//                         <div className="flex items-center gap-3">
//                           <div className={cn("p-2 rounded-lg", typeInfo.color)}>
//                             <IconComponent className="h-5 w-5" />
//                           </div>
//                           <div className="flex-1 min-w-0">
//                             <CardTitle className="text-lg font-semibold text-slate-800 truncate">
//                               {client.name}
//                             </CardTitle>
//                             <Badge
//                               variant="outline"
//                               className="mt-1 border-slate-200 text-slate-600"
//                             >
//                               {typeInfo.label}
//                             </Badge>
//                           </div>
//                         </div>

//                         {canWriteClients && (
//                           <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               className="h-8 w-8 p-0"
//                             >
//                               <MoreHorizontal className="h-4 w-4" />
//                             </Button>
//                           </div>
//                         )}
//                       </div>
//                     </CardHeader>

//                     <CardContent className="space-y-3">
//                       {/* Contact Info */}
//                       {client.pointOfContact && (
//                         <div className="flex items-center gap-2 text-sm text-slate-600">
//                           <Users className="h-4 w-4 text-slate-400" />
//                           <span className="truncate">
//                             {client.pointOfContact}
//                           </span>
//                         </div>
//                       )}

//                       {client.email && (
//                         <div className="flex items-center gap-2 text-sm text-slate-600">
//                           <Mail className="h-4 w-4 text-slate-400" />
//                           <span className="truncate">{client.email}</span>
//                         </div>
//                       )}

//                       {client.phone && (
//                         <div className="flex items-center gap-2 text-sm text-slate-600">
//                           <Phone className="h-4 w-4 text-slate-400" />
//                           <span className="truncate">{client.phone}</span>
//                         </div>
//                       )}

//                       {client.address && (
//                         <div className="flex items-center gap-2 text-sm text-slate-600">
//                           <MapPin className="h-4 w-4 text-slate-400" />
//                           <span className="truncate">{client.address}</span>
//                         </div>
//                       )}

//                       {/* Type-specific info */}
//                       {client.type === "INDIVIDUAL" && client.profession && (
//                         <div className="flex items-center gap-2 text-sm text-slate-600">
//                           <Briefcase className="h-4 w-4 text-slate-400" />
//                           <span className="truncate">{client.profession}</span>
//                         </div>
//                       )}

//                       {client.type === "HEALTHCARE_ORGANIZATION" &&
//                         client.facilityType && (
//                           <div className="flex items-center gap-2 text-sm text-slate-600">
//                             <Building2 className="h-4 w-4 text-slate-400" />
//                             <span className="truncate">
//                               {client.facilityType}
//                             </span>
//                           </div>
//                         )}

//                       {/* Projects count */}
//                       {client.projects && client.projects.length > 0 && (
//                         <div className="flex items-center gap-2 text-sm text-slate-600">
//                           <TrendingUp className="h-4 w-4 text-slate-400" />
//                           <span>
//                             {client.projects.length} active project
//                             {client.projects.length !== 1 ? "s" : ""}
//                           </span>
//                         </div>
//                       )}

//                       {/* Created date */}
//                       <div className="flex items-center gap-2 text-sm text-slate-500">
//                         <Calendar className="h-4 w-4 text-slate-400" />
//                         <span>Added {formatDate(client.createdAt)}</span>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 );
//               })}
//             </div>

//             {/* Empty State */}
//             {clients.length === 0 && (
//               <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
//                 <CardContent className="pt-12 pb-12 text-center">
//                   <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
//                   <h3 className="text-lg font-semibold text-slate-600 mb-2">
//                     No clients found
//                   </h3>
//                   <p className="text-slate-500 mb-6">
//                     {filters.search || filters.type !== "all"
//                       ? "Try adjusting your search criteria or filters."
//                       : "Get started by adding your first client."}
//                   </p>
//                   {!filters.search &&
//                     filters.type === "all" &&
//                     canWriteClients && (
//                       <Button
//                         onClick={() => navigate("/clients/create")}
//                         className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
//                       >
//                         <Plus className="mr-2 h-4 w-4" />
//                         Add Your First Client
//                       </Button>
//                     )}
//                 </CardContent>
//               </Card>
//             )}

//             {/* Pagination and Count - Moved to Bottom */}
//             {clients.length > 0 && (
//               <div className="flex items-center justify-between pt-6 border-t border-slate-200">
//                 <p className="text-slate-600">
//                   Showing {clients.length} of {pagination?.total || 0} clients
//                 </p>
//                 {pagination && pagination.pages > 1 && (
//                   <div className="flex items-center gap-2">
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => handlePageChange(pagination.page - 1)}
//                       disabled={pagination.page <= 1}
//                       className="border-slate-200"
//                     >
//                       Previous
//                     </Button>
//                     <span className="text-sm text-slate-600">
//                       Page {pagination.page} of {pagination.pages}
//                     </span>
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => handlePageChange(pagination.page + 1)}
//                       disabled={pagination.page >= pagination.pages}
//                       className="border-slate-200"
//                     >
//                       Next
//                     </Button>
//                   </div>
//                 )}
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }
import React, { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Building2,
  Users,
  Calendar,
  Phone,
  Mail,
  Briefcase,
  Handshake,
  MoreVertical,
  Download,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetClientsQuery } from "@/features/clients";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";

// Badge color map for client types
const TYPE_BADGE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  DIRECT_CLIENT: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  SUB_AGENT: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  FREELANCE: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
};

const ACCENT_COLOR: Record<string, string> = {
  DIRECT_CLIENT: "border-l-emerald-500",
  SUB_AGENT: "border-l-violet-500",
  FREELANCE: "border-l-amber-500",
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const canWriteClients = useCan("write:clients");
  const canReadClients = useCan("read:clients");

  const [filters, setFilters] = useState({
    type: "all",
    search: "",
    page: 1,
    limit: 12,
  });
  const listRef = useRef<HTMLDivElement>(null);

  const handleTileClick = (typeFilter: string) => {
    setFilters((prev) => ({
      ...prev,
      type: typeFilter,
      page: 1,
    }));
    window.requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const queryParams = useMemo(() => {
    const params: any = { ...filters };
    if (params.type === "all") delete params.type;
    return params;
  }, [filters]);

  const {
    data: clientsData,
    isLoading,
    error,
    refetch,
  } = useGetClientsQuery(queryParams);

  const clients = clientsData?.data?.clients || [];
  const pagination = clientsData?.data?.pagination;
  const totals = clientsData?.data?.totals;

  const statCards = [
    {
      label: "Total Clients",
      value: totals?.totalClients ?? 0,
      subtitle: "All registered clients",
      icon: Users,
      accent: "blue",
      typeFilter: "all" as string,
    },
    {
      label: "Direct Clients",
      value: totals?.directClients ?? 0,
      subtitle: "Direct engagement",
      icon: Briefcase,
      accent: "emerald",
      typeFilter: "DIRECT_CLIENT",
    },
    {
      label: "Sub Agency",
      value: totals?.subAgencyClients ?? 0,
      subtitle: "Agency partnerships",
      icon: Building2,
      accent: "violet",
      typeFilter: "SUB_AGENT",
    },
    {
      label: "Freelance",
      value: totals?.freelanceClients ?? 0,
      subtitle: "Freelance referrals",
      icon: Handshake,
      accent: "amber",
      typeFilter: "FREELANCE",
    },
  ] as const;

  const accentStyles: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
    blue:    { card: "from-blue-50 via-white to-blue-50/30 border-blue-100",     icon: "text-blue-600",   iconBg: "bg-blue-100",   value: "text-blue-700",   ring: "ring-blue-400/50",   dot: "bg-blue-500" },
    emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", value: "text-emerald-700", ring: "ring-emerald-400/50", dot: "bg-emerald-500" },
    violet:  { card: "from-violet-50 via-white to-violet-50/30 border-violet-100",  icon: "text-violet-600",  iconBg: "bg-violet-100",  value: "text-violet-700",  ring: "ring-violet-400/50",  dot: "bg-violet-500" },
    amber:   { card: "from-amber-50 via-white to-amber-50/30 border-amber-100",   icon: "text-amber-600",  iconBg: "bg-amber-100",  value: "text-amber-700",  ring: "ring-amber-400/50",  dot: "bg-amber-500" },
  };

  const clientTypeOptions = [
    { value: "DIRECT_CLIENT", label: "Direct Client", icon: Briefcase },
    { value: "SUB_AGENT", label: "Sub Agent", icon: Building2 },
    { value: "FREELANCE", label: "Freelance", icon: Handshake },
  ];

  const getClientTypeInfo = (type: string) => {
    return clientTypeOptions.find((o) => o.value === type) || clientTypeOptions[0];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  if (!canReadClients) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-xl bg-white rounded-2xl text-center py-12">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">Access Denied</CardTitle>
            <CardDescription className="mt-2">
              You don't have permission to view clients.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto space-y-5 mt-2">

        {/* ── Stat Tiles ───────────────────────────────────────────── */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const s = accentStyles[stat.accent];
            const isActive = filters.type === stat.typeFilter;
            return (
              <button
                key={stat.label}
                type="button"
                onClick={() => handleTileClick(stat.typeFilter)}
                className={cn(
                  "group relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200 focus:outline-none",
                  s.card,
                  isActive
                    ? `ring-2 shadow-md ${s.ring}`
                    : "hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                {isActive && (
                  <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                    <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.subtitle}</p>
                  </div>
                  <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                    <Icon className={cn("h-5 w-5", s.icon)} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                  <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Toolbar + list ───────────────────────────────────────── */}
        <div ref={listRef} className="space-y-5 scroll-mt-4">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
              <div className="relative min-w-0 flex-1 w-full group">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="Search clients by name, contact…"
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="h-11 w-full pl-10 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-blue-500/10 rounded-xl transition-all"
                />
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:shrink-0">
                <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                  <Filter className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <Select
                    value={filters.type}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, type: value, page: 1 }))
                    }
                  >
                    <SelectTrigger className="h-11 w-full min-w-[10rem] sm:w-44 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/40">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl border-0">
                      <SelectItem value="all">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                          All Types
                        </span>
                      </SelectItem>
                      {clientTypeOptions.map((opt) => {
                        const badge = TYPE_BADGE[opt.value];
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full inline-block", badge?.dot)} />
                              {opt.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canWriteClients && (
                    <Button
                      onClick={() => navigate("/clients/create")}
                      className="h-11 shrink-0 px-4 gap-2 rounded-xl bg-blue-600 font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Client</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-11 shrink-0 gap-2 rounded-xl border-slate-200 px-4 shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────── */}
        {isLoading ? (
          /* Loading skeleton */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-5/6" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error state */
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardContent className="py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-gray-600 mb-4">Failed to load clients. Please try again.</p>
              <Button onClick={() => refetch()} variant="outline" className="rounded-xl">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : clients.length === 0 ? (
          /* Empty state */
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardContent className="py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
                <Building2 className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No clients found</h3>
              <p className="text-gray-500 mb-6 max-w-xs mx-auto">
                {filters.search || filters.type !== "all"
                  ? "Try adjusting your search or filters."
                  : "Get started by adding your first client."}
              </p>
              {!filters.search && filters.type === "all" && canWriteClients && (
                <Button
                  onClick={() => navigate("/clients/create")}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Results header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-800">
                  {(filters.page - 1) * filters.limit + 1}–
                  {Math.min(filters.page * filters.limit, pagination?.total ?? clients.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-800">
                  {pagination?.total ?? clients.length}
                </span>{" "}
                clients
              </p>
            </div>

            {/* Client cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {clients.map((client) => {
                const typeInfo = getClientTypeInfo(client.type);
                const IconComponent = typeInfo.icon;
                const badge = TYPE_BADGE[client.type];
                const accent = ACCENT_COLOR[client.type] ?? "border-l-gray-300";

                return (
                  <div
                    key={client.id}
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className={cn(
                      "group relative bg-white rounded-2xl border border-gray-100 border-l-4 shadow-sm",
                      "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
                      accent
                    )}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between p-5 pb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                            badge?.bg ?? "bg-gray-100"
                          )}
                        >
                          <IconComponent className={cn("h-5 w-5", badge?.text ?? "text-gray-600")} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate leading-tight">
                            {client.name}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 mt-1 text-xs font-medium px-2 py-0.5 rounded-full border",
                              badge?.bg,
                              badge?.text,
                              badge?.border
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", badge?.dot)} />
                            {typeInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Actions menu */}
                      {canWriteClients && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 ml-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-gray-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4 text-gray-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl shadow-xl w-36">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/clients/${client.id}/edit`);
                                }}
                                className="gap-2 rounded-lg"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="mx-5 border-t border-gray-50" />

                    {/* Card body */}
                    <div className="p-5 pt-3 space-y-2">
                      {client.pointOfContact && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{client.pointOfContact}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                      )}
                      {client.projects && client.projects.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Briefcase className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>
                            {client.projects.length} project
                            {client.projects.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>Added {formatDate(client.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination ───────────────────────────────────────── */}
            {pagination && pagination.pages > 1 && (
              <div className="flex flex-col items-center gap-4 pt-4">
                <p className="text-sm text-gray-500">
                  Page{" "}
                  <span className="font-semibold text-gray-800">{pagination.page}</span>
                  {" "}of{" "}
                  <span className="font-semibold text-gray-800">{pagination.pages}</span>
                </p>

                <div className="flex items-center gap-1.5">
                  {/* Prev */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="h-9 w-9 rounded-xl border-gray-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Page numbers */}
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === pagination.pages ||
                        Math.abs(p - pagination.page) <= 1
                    )
                    .map((pageNum, idx, arr) => {
                      const showEllipsis = idx > 0 && pageNum - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={pageNum}>
                          {showEllipsis && (
                            <span className="px-1 text-gray-400 text-sm select-none">…</span>
                          )}
                          <Button
                            variant={pageNum === pagination.page ? "default" : "outline"}
                            size="icon"
                            onClick={() => handlePageChange(pageNum)}
                            className={cn(
                              "h-9 w-9 rounded-xl text-sm font-medium transition-all",
                              pageNum === pagination.page
                                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm"
                                : "border-gray-200 hover:border-blue-300 hover:text-blue-600"
                            )}
                          >
                            {pageNum}
                          </Button>
                        </React.Fragment>
                      );
                    })}

                  {/* Next */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="h-9 w-9 rounded-xl border-gray-200 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
