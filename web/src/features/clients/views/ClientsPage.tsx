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
import { useState, useMemo } from "react";
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
  MoreVertical,
  Download,
  ChevronLeft,
  ChevronRight,
  Circle,
  Edit,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { toast } from "sonner";
import {
  useGetClientsQuery,
  useDeleteClientMutation,
} from "@/features/clients";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";

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

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
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

  const clientTypeOptions = [
    { value: "INDIVIDUAL", label: "Individual Referrer", icon: Users, color: "bg-sky-500" },
    { value: "SUB_AGENCY", label: "Sub Agency", icon: Building2, color: "bg-violet-500" },
    { value: "HEALTHCARE_ORGANIZATION", label: "Healthcare Org", icon: Building2, color: "bg-emerald-500" },
    { value: "EXTERNAL_SOURCE", label: "External Source", icon: Briefcase, color: "bg-amber-500" },
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
            <p className="text-gray-600 mt-3">You don't have permission to view clients.</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-600 to-violet-600 opacity-25 scale-125" />
              <div className="p-3 bg-blue-100 rounded-xl">
                           <Users className="h-8 w-8 text-blue-600" />
                         </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Clients & Partners
              </h1>
              <p className="text-lg text-gray-600 mt-1.5">
                {pagination?.total || 0} total • Referrers, agencies & healthcare organizations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="lg" onClick={() => refetch()}>
              <RefreshCw className="h-5 w-5 mr-2" />
              Refresh
            </Button>
            {/* {canWriteClients && (
              <Button
                onClick={() => navigate("/clients/create")}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Client
              </Button>
            )} */}
          </div>
        </div>
        {/* Search & Filters */}
        <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search clients by name, email, phone..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-11 h-12 rounded-xl border-gray-200 focus:border-gray-300 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Type:</span>
                <Select value={filters.type} onValueChange={(v) => setFilters(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger className="w-56 h-11 rounded-xl border-gray-200">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All types</SelectItem>
                    {clientTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-3 h-3 rounded-full", opt.color)} />
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                {canWriteClients && (
                  <Button
                    onClick={() => navigate("/clients/create")}
                    className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all"
                  >
                    <Plus className="h-4.5 w-4.5 mr-2" />
                    Add Client
                  </Button>
                )}
                <Button variant="outline" className="h-11 px-5 rounded-xl border-gray-300">
                  <Download className="h-4.5 w-4.5 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="rounded-2xl border border-gray-200/80 bg-white shadow-sm animate-pulse">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-gray-200 rounded-lg" />
                    <div className="space-y-2.5 flex-1">
                      <div className="h-5 bg-gray-300 rounded-lg w-36" />
                      <div className="h-4 bg-gray-200 rounded w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-4/5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="max-w-lg mx-auto border-0 shadow-lg bg-white rounded-2xl text-center py-16">
            <CardContent className="space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full mx-auto flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Failed to load clients</h3>
                <p className="text-gray-600 mt-2">Please check your connection and try again.</p>
              </div>
              <Button onClick={() => refetch()} className="rounded-xl">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Clients Grid — MUCH BETTER UI */}
        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {clients.map((client) => {
                const typeInfo = getClientTypeInfo(client.type);
                const IconComponent = typeInfo.icon;

                return (
                  <Card
                    key={client.id}
                    className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg 
                               transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className={cn(
                            "p-2.5 rounded-xl text-white shadow-md ring-1 ring-white/20",
                            typeInfo.color
                          )}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug">
                              {client.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs font-medium px-2.5 py-0.5">
                                {typeInfo.label}
                              </Badge>
                              {client.projects?.length ? (
                                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  {client.projects.length} active
                                </span>
                              ) : null}

                            </div>
                          </div>
                        </div>

                        {canWriteClients && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4 text-gray-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}/edit`) }}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3.5 text-sm text-gray-600">
                      {client.pointOfContact && (
                        <div className="flex items-center gap-3">
                          <Users className="h-4.5 w-4.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate font-medium">{client.pointOfContact}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4.5 w-4.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4.5 w-4.5 text-gray-400 flex-shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}

                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(client.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                          <Circle className="h-2 w-2 fill-current" />
                          <span>Active</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Empty State */}
            {clients.length === 0 && (
              <div className="text-center py-24">
                <div className="max-w-md mx-auto space-y-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mx-auto flex items-center justify-center">
                    <Users className="h-12 w-12 text-blue-600" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {filters.search || filters.type !== "all" ? "No clients found" : "No clients yet"}
                    </h3>
                    <p className="text-gray-600">
                      {filters.search || filters.type !== "all"
                        ? "Try adjusting your search or filters."
                        : "Get started by adding your first client."}
                    </p>
                  </div>
                  {(!filters.search && filters.type === "all" && canWriteClients) && (
                    <Button
                      onClick={() => navigate("/clients/create")}
                      size="lg"
                      className="h-12 px-8 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Your First Client
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Pagination */}
            {clients.length > 0 && pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between py-6">
                <p className="text-sm text-gray-600">
                  Showing {clients.length} of {pagination.total} clients
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                    className="rounded-xl"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 font-medium">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                    className="rounded-xl"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}