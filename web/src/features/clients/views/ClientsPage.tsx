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
  Edit,
  Trash2,
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
import { useTheme } from "@/context/ThemeContext"; // ← added this import

export default function ClientsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme(); // ← added this line
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
    {
      value: "INDIVIDUAL",
      label: "Individual Referrer",
      icon: Users,
      color: "bg-sky-500",
    },
    {
      value: "SUB_AGENCY",
      label: "Sub Agency",
      icon: Building2,
      color: "bg-violet-500",
    },
    {
      value: "HEALTHCARE_ORGANIZATION",
      label: "Healthcare Org",
      icon: Building2,
      color: "bg-emerald-500",
    },
    {
      value: "EXTERNAL_SOURCE",
      label: "External Source",
      icon: Briefcase,
      color: "bg-amber-500",
    },
  ];

  const getClientTypeInfo = (type: string) => {
    return (
      clientTypeOptions.find((o) => o.value === type) || clientTypeOptions[0]
    );
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
      <div className={cn(
        "min-h-screen flex items-center justify-center p-4",
        theme === "dark" ? "bg-black" : "bg-gray-50"
      )}>
        <Card className={cn(
          "max-w-md w-full border-0 shadow-xl rounded-2xl text-center py-12",
          theme === "dark" ? "bg-slate-900 text-white" : "bg-white"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "text-2xl font-bold",
              theme === "dark" ? "text-slate-100" : "text-gray-900"
            )}>
              Access Denied
            </CardTitle>
            <p className={cn(
              "mt-3",
              theme === "dark" ? "text-slate-400" : "text-gray-600"
            )}>
              You don't have permission to view clients.
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen",
      theme === "dark" ? "bg-black" : ""
    )}>
      <div className="w-full mx-auto space-y-6 mt-2">
        {/* Search & Filters Section */}
        <Card className={cn(
          "border-0 shadow-lg backdrop-blur-sm",
          theme === "dark" ? "bg-slate-900/80" : "bg-white/80"
        )}>
          <CardContent>
            <div className="space-y-6">
              {/* Premium Search Bar with Enhanced Styling */}
              <div className="relative group">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300",
                    filters.search
                      ? theme === "dark" ? "text-blue-400" : "text-blue-600"
                      : theme === "dark" ? "text-slate-500" : "text-gray-400"
                  )}
                >
                  <Search
                    className={cn(
                      "h-5 w-5 transition-transform duration-300",
                      filters.search ? "scale-110" : "scale-100"
                    )}
                  />
                </div>
                <Input
                  placeholder="Search clients by name, contact, or description..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={cn(
                    "pl-14 h-14 text-base border-0 transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md",
                    theme === "dark"
                      ? "bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-blue-500/40"
                      : "bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30"
                  )}
                />
                <div
                  className={cn(
                    "absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none",
                    filters.search
                      ? theme === "dark" ? "ring-2 ring-blue-500/30" : "ring-2 ring-blue-500/20"
                      : ""
                  )}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Client Type Filter */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full animate-pulse",
                      theme === "dark" ? "bg-blue-400" : "bg-blue-500"
                    )}></div>
                    <span className={cn(
                      "text-sm font-semibold tracking-wide",
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    )}>
                      Type
                    </span>
                  </div>
                  <Select
                    value={filters.type}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, type: value, page: 1 }))
                    }
                  >
                    <SelectTrigger className={cn(
                      "h-11 px-4 border-0 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[140px]",
                      theme === "dark"
                        ? "bg-slate-800 text-slate-100 hover:bg-slate-700 focus:ring-blue-500/40"
                        : "bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30"
                    )}>
                      <SelectValue placeholder="All Client Types" />
                    </SelectTrigger>
                    <SelectContent className={cn(
                      "rounded-xl border-0 shadow-2xl backdrop-blur-sm",
                      theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white/95"
                    )}>
                      <SelectItem
                        value="all"
                        className={cn(
                          "rounded-lg",
                          theme === "dark" ? "hover:bg-slate-800" : "hover:bg-blue-50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            theme === "dark" ? "bg-slate-500" : "bg-gray-400"
                          )}></div>
                          All Types
                        </div>
                      </SelectItem>
                      {clientTypeOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className={cn(
                            "rounded-lg",
                            theme === "dark" ? "hover:bg-slate-800" : "hover:bg-blue-50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn("w-2 h-2 rounded-full", option.color)}
                            ></div>
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Add New Client Button */}
                {canWriteClients && (
                  <Button
                    onClick={() => navigate("/clients/create")}
                    className={cn(
                      "h-10 px-3 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 gap-2 text-sm",
                      theme === "dark"
                        ? "bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    )}
                  >
                    <Plus className="h-3 w-3" />
                    Add New Client
                  </Button>
                )}

                {/* Export Button */}
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 px-3 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md gap-2 text-sm",
                    theme === "dark"
                      ? "border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-slate-200"
                  )}
                >
                  <Download className="h-3 w-3" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card
                key={i}
                className={cn(
                  "border-0 shadow-lg animate-pulse",
                  theme === "dark" ? "bg-slate-900/80" : "bg-white/80 backdrop-blur-sm"
                )}
              >
                <CardHeader className="pb-3">
                  <div className={cn(
                    "h-4 rounded w-3/4",
                    theme === "dark" ? "bg-slate-700" : "bg-slate-200"
                  )}></div>
                  <div className={cn(
                    "h-3 rounded w-1/2 mt-2",
                    theme === "dark" ? "bg-slate-700" : "bg-slate-200"
                  )}></div>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "h-3 rounded w-full mb-2",
                    theme === "dark" ? "bg-slate-700" : "bg-slate-200"
                  )}></div>
                  <div className={cn(
                    "h-3 rounded w-2/3",
                    theme === "dark" ? "bg-slate-700" : "bg-slate-200"
                  )}></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className={cn(
            "border-0 shadow-lg backdrop-blur-sm",
            theme === "dark" ? "bg-slate-900/80" : "bg-white/80"
          )}>
            <CardContent className="pt-6 text-center">
              <p className={cn(
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              )}>
                Failed to load clients. Please try again.
              </p>
              <Button 
                onClick={() => refetch()} 
                className="mt-4"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Clients Grid */}
            <Card className={cn(
              "border-0 shadow-lg backdrop-blur-sm",
              theme === "dark" ? "bg-slate-900/80" : "bg-white/80"
            )}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className={cn(
                      "text-lg font-semibold",
                      theme === "dark" ? "text-slate-100" : "text-slate-800"
                    )}>
                      All Clients
                    </CardTitle>
                    <CardDescription className={cn(
                      theme === "dark" ? "text-slate-400" : ""
                    )}>
                      {clients.length} client{clients.length !== 1 ? "s" : ""}{" "}
                      found
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clients.map((client) => {
                    const typeInfo = getClientTypeInfo(client.type);
                    const IconComponent = typeInfo.icon;

                    return (
                      <Card
                        key={client.id}
                        className={cn(
                          "group border-0 shadow-lg transition-all duration-200 transform hover:-translate-y-1 cursor-pointer backdrop-blur-sm",
                          theme === "dark"
                            ? "bg-slate-900/80 hover:bg-slate-800/90 hover:shadow-2xl"
                            : "bg-white/80 hover:shadow-xl"
                        )}
                        onClick={() => navigate(`/clients/${client.id}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn("p-2 rounded-lg", typeInfo.color)}
                              >
                                <IconComponent className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className={cn(
                                  "text-lg font-semibold truncate",
                                  theme === "dark" ? "text-slate-100" : "text-slate-800"
                                )}>
                                  {client.name}
                                </CardTitle>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "mt-1 text-xs",
                                    theme === "dark"
                                      ? "border-slate-600 text-slate-400 bg-slate-800/40"
                                      : "border-slate-200 text-slate-600"
                                  )}
                                >
                                  {typeInfo.label}
                                </Badge>
                              </div>
                            </div>

                            {canWriteClients && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-8 w-8 p-0",
                                        theme === "dark" ? "hover:bg-slate-800" : ""
                                      )}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className={cn(
                                        "h-4 w-4",
                                        theme === "dark" ? "text-slate-400" : ""
                                      )} />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className={cn(
                                      "rounded-xl",
                                      theme === "dark" ? "bg-slate-900 border-slate-700" : ""
                                    )}
                                  >
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/clients/${client.id}/edit`);
                                      }}
                                      className={cn(
                                        theme === "dark" ? "text-slate-200 hover:bg-slate-800" : ""
                                      )}
                                    >
                                      <Edit className="h-4 w-4 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className={cn(
                                        "text-red-600",
                                        theme === "dark" ? "hover:bg-red-950/50" : ""
                                      )}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          {/* Contact Info */}
                          {client.pointOfContact && (
                            <div className={cn(
                              "flex items-center gap-2 text-sm",
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            )}>
                              <Users className={cn(
                                "h-4 w-4",
                                theme === "dark" ? "text-slate-500" : "text-slate-400"
                              )} />
                              <span className="truncate">
                                {client.pointOfContact}
                              </span>
                            </div>
                          )}

                          {client.email && (
                            <div className={cn(
                              "flex items-center gap-2 text-sm",
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            )}>
                              <Mail className={cn(
                                "h-4 w-4",
                                theme === "dark" ? "text-slate-500" : "text-slate-400"
                              )} />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}

                          {client.phone && (
                            <div className={cn(
                              "flex items-center gap-2 text-sm",
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            )}>
                              <Phone className={cn(
                                "h-4 w-4",
                                theme === "dark" ? "text-slate-500" : "text-slate-400"
                              )} />
                              <span className="truncate">{client.phone}</span>
                            </div>
                          )}

                          {/* Projects count */}
                          {client.projects && client.projects.length > 0 && (
                            <div className={cn(
                              "flex items-center gap-2 text-sm",
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            )}>
                              <Briefcase className={cn(
                                "h-4 w-4",
                                theme === "dark" ? "text-slate-500" : "text-slate-400"
                              )} />
                              <span>
                                {client.projects.length} active project
                                {client.projects.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}

                          {/* Created date */}
                          <div className={cn(
                            "flex items-center gap-2 text-sm",
                            theme === "dark" ? "text-slate-500" : "text-slate-500"
                          )}>
                            <Calendar className={cn(
                              "h-4 w-4",
                              theme === "dark" ? "text-slate-500" : "text-slate-400"
                            )} />
                            <span>Added {formatDate(client.createdAt)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Empty State */}
            {clients.length === 0 && (
              <Card className={cn(
                "border-0 shadow-lg backdrop-blur-sm",
                theme === "dark" ? "bg-slate-900/80" : "bg-white/80"
              )}>
                <CardContent className="pt-12 pb-12 text-center">
                  <Building2 className={cn(
                    "h-16 w-16 mx-auto mb-4",
                    theme === "dark" ? "text-slate-600" : "text-slate-300"
                  )} />
                  <h3 className={cn(
                    "text-lg font-semibold mb-2",
                    theme === "dark" ? "text-slate-200" : "text-slate-600"
                  )}>
                    No clients found
                  </h3>
                  <p className={cn(
                    "mb-6",
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  )}>
                    {filters.search || filters.type !== "all"
                      ? "Try adjusting your search criteria or filters."
                      : "Get started by adding your first client."}
                  </p>
                  {!filters.search &&
                    filters.type === "all" &&
                    canWriteClients && (
                      <Button
                        onClick={() => navigate("/clients/create")}
                        className={cn(
                          "text-white",
                          theme === "dark"
                            ? "bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900"
                            : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        )}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Client
                      </Button>
                    )}
                </CardContent>
              </Card>
            )}

            {/* Pagination and Count - Moved to Bottom */}
            {clients.length > 0 && (
              <div className={cn(
                "flex items-center justify-between pt-6 border-t",
                theme === "dark" ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-600"
              )}>
                <p>
                  Showing {clients.length} of {pagination?.total || 0} clients
                </p>
                {pagination && pagination.pages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className={cn(
                        theme === "dark" ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200"
                      )}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className={cn(
                        theme === "dark" ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200"
                      )}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}