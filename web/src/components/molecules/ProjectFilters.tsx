import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Calendar,
  Users,
  Building2,
  Target,
  Sparkles,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { QueryProjectsRequest } from "@/services/projectsApi";

interface ProjectFiltersProps {
  filters: QueryProjectsRequest;
  onFiltersChange: (filters: QueryProjectsRequest) => void;
  onExport?: () => void;
  className?: string;
}

export default function ProjectFilters({
  filters,
  onFiltersChange,
  onExport,
  className,
}: ProjectFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleFilterChange = (key: keyof QueryProjectsRequest, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1, // Reset to first page when filters change
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      page: 1,
      limit: filters.limit,
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.clientId ||
    filters.teamId ||
    filters.sortBy;

  const activeFilterCount = [
    filters.search,
    filters.status,
    filters.clientId,
    filters.teamId,
    filters.sortBy,
  ].filter(Boolean).length;

  const statusOptions = [
    { value: "active", label: "Active", color: "emerald", icon: Target },
    { value: "completed", label: "Completed", color: "blue", icon: Sparkles },
    { value: "cancelled", label: "Cancelled", color: "red", icon: X },
    { value: "pending", label: "Pending", color: "amber", icon: Calendar },
  ];

  const sortOptions = [
    { value: "title", label: "Title", icon: Building2 },
    { value: "deadline", label: "Deadline", icon: Calendar },
    { value: "createdAt", label: "Created Date", icon: Calendar },
    { value: "status", label: "Status", icon: Target },
    { value: "priority", label: "Priority", icon: Sparkles },
  ];

  const getStatusColor = (status: string) => {
    const option = statusOptions.find((opt) => opt.value === status);
    return option?.color || "gray";
  };

  const getStatusIcon = (status: string) => {
    const option = statusOptions.find((opt) => opt.value === status);
    return option?.icon || Target;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Premium Search Bar with Enhanced Styling */}
      <div className="relative group">
        <div
          className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300 ${
            searchFocused ? "text-blue-600" : "text-gray-400"
          }`}
        >
          <Search
            className={`h-5 w-5 transition-transform duration-300 ${
              searchFocused ? "scale-110" : "scale-100"
            }`}
          />
        </div>
        <Input
          placeholder="Search projects by title, description, or client..."
          value={filters.search || ""}
          onChange={(e) => handleFilterChange("search", e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="pl-14 h-14 text-base border-0 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 focus:shadow-lg transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md"
        />
        <div
          className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${
            searchFocused ? "ring-2 ring-blue-500/20" : ""
          }`}
        />
      </div>

      {/* Premium Filter Row with Enhanced Visual Design */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Filter with Premium Styling */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-700 tracking-wide">
              Status
            </span>
          </div>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              handleFilterChange("status", value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="h-11 px-4 border-0 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 focus:from-white focus:to-white focus:ring-2 focus:ring-emerald-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[140px]">
              <SelectValue placeholder="All Status" />
              <ChevronDown className="h-4 w-4 text-emerald-600 ml-2 transition-transform duration-200" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
              <SelectItem
                value="all"
                className="rounded-lg hover:bg-emerald-50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  All Status
                </div>
              </SelectItem>
              {statusOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="rounded-lg hover:bg-emerald-50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 bg-${option.color}-500 rounded-full`}
                    ></div>
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort By Filter with Premium Styling */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-700 tracking-wide">
              Sort
            </span>
          </div>
          <Select
            value={filters.sortBy || "default"}
            onValueChange={(value) =>
              handleFilterChange(
                "sortBy",
                value === "default" ? undefined : value
              )
            }
          >
            <SelectTrigger className="h-11 px-4 border-0 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[140px]">
              <SelectValue placeholder="Default" />
              <ChevronDown className="h-4 w-4 text-blue-600 ml-2 transition-transform duration-200" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
              <SelectItem
                value="default"
                className="rounded-lg hover:bg-blue-50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  Default
                </div>
              </SelectItem>
              {sortOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="rounded-lg hover:bg-blue-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters Button with Premium Design */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="h-11 px-6 text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md group"
            >
              <div className="relative">
                <Filter className="h-5 w-5 mr-3 text-purple-600 transition-transform duration-300 group-hover:rotate-12" />
                {activeFilterCount > 0 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white font-semibold animate-pulse">
                    {activeFilterCount}
                  </div>
                )}
              </div>
              Advanced
              <ChevronDown className="h-4 w-4 ml-2 text-purple-600 transition-transform duration-200 group-hover:translate-y-0.5" />
            </Button>
          </SheetTrigger>

          {/* Premium Sheet Design */}
          <SheetContent className="w-[500px] sm:w-[600px] p-0 border-0 shadow-2xl">
            <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
              {/* Premium Header */}
              <div className="px-8 py-8 border-b border-gray-100 bg-gradient-to-r from-purple-50 via-blue-50 to-emerald-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Filter className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                      Advanced Filters
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Refine your project search with precision
                    </p>
                  </div>
                </div>
              </div>

              {/* Premium Content */}
              <div className="flex-1 px-8 py-8 space-y-8 overflow-y-auto">
                {/* Client Filter */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="tracking-wide">Client</span>
                  </label>
                  <Select
                    value={filters.clientId || "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "clientId",
                        value === "all" ? undefined : value
                      )
                    }
                  >
                    <SelectTrigger className="h-12 border-gray-200 bg-white hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md">
                      <SelectValue placeholder="Select a client" />
                      <ChevronDown className="h-4 w-4 text-purple-600 ml-2" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-200 shadow-2xl bg-white/95 backdrop-blur-sm">
                      <SelectItem
                        value="all"
                        className="rounded-lg hover:bg-purple-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          All Clients
                        </div>
                      </SelectItem>
                      {/* TODO: Add client options from API */}
                      <SelectItem
                        value="client1"
                        className="rounded-lg hover:bg-purple-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          Client 1
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="client2"
                        className="rounded-lg hover:bg-purple-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          Client 2
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Team Filter */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="tracking-wide">Team</span>
                  </label>
                  <Select
                    value={filters.teamId || "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "teamId",
                        value === "all" ? undefined : value
                      )
                    }
                  >
                    <SelectTrigger className="h-12 border-gray-200 bg-white hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md">
                      <SelectValue placeholder="Select a team" />
                      <ChevronDown className="h-4 w-4 text-emerald-600 ml-2" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-200 shadow-2xl bg-white/95 backdrop-blur-sm">
                      <SelectItem
                        value="all"
                        className="rounded-lg hover:bg-emerald-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          All Teams
                        </div>
                      </SelectItem>
                      {/* TODO: Add team options from API */}
                      <SelectItem
                        value="team1"
                        className="rounded-lg hover:bg-emerald-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          Team 1
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="team2"
                        className="rounded-lg hover:bg-emerald-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          Team 2
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="tracking-wide">Sort Order</span>
                  </label>
                  <Select
                    value={filters.sortOrder || "desc"}
                    onValueChange={(value) =>
                      handleFilterChange("sortOrder", value as "asc" | "desc")
                    }
                  >
                    <SelectTrigger className="h-12 border-gray-200 bg-white hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md">
                      <SelectValue placeholder="Choose sort order" />
                      <ChevronDown className="h-4 w-4 text-blue-600 ml-2" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-200 shadow-2xl bg-white/95 backdrop-blur-sm">
                      <SelectItem
                        value="desc"
                        className="rounded-lg hover:bg-blue-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Newest First
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="asc"
                        className="rounded-lg hover:bg-blue-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Oldest First
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Premium Footer */}
              <div className="px-8 py-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full h-12 border-gray-300 hover:border-gray-400 hover:bg-white transition-all duration-300 rounded-xl shadow-sm hover:shadow-md group"
                  >
                    <X className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Export Button - Now positioned after Advanced dropdown */}
        {onExport && (
          <Button
            variant="outline"
            onClick={onExport}
            className="h-11 px-4 text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      {/* Compact Active Filters Display */}
      {hasActiveFilters && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-blue-900">
                Active Filters
              </span>
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 border-blue-200 px-2 py-0.5 rounded-full text-xs"
              >
                {activeFilterCount}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-7 px-2 rounded-lg transition-all duration-200 text-xs"
            >
              Clear All
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <Badge
                variant="secondary"
                className="gap-1 px-2 py-1 bg-white/80 text-blue-800 border-blue-200 hover:bg-white transition-all duration-200 rounded-lg text-xs"
              >
                <Search className="h-3 w-3" />
                {filters.search}
                <button
                  onClick={() => handleFilterChange("search", undefined)}
                  className="ml-1 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}

            {filters.status && (
              <Badge
                variant="secondary"
                className="gap-1 px-2 py-1 bg-white/80 text-emerald-800 border-emerald-200 hover:bg-white transition-all duration-200 rounded-lg text-xs"
              >
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                {filters.status}
                <button
                  onClick={() => handleFilterChange("status", undefined)}
                  className="ml-1 hover:bg-emerald-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}

            {filters.clientId && (
              <Badge
                variant="secondary"
                className="gap-1 px-2 py-1 bg-white/80 text-purple-800 border-purple-200 hover:bg-white transition-all duration-200 rounded-lg text-xs"
              >
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                Client: {filters.clientId}
                <button
                  onClick={() => handleFilterChange("clientId", undefined)}
                  className="ml-1 hover:bg-purple-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}

            {filters.teamId && (
              <Badge
                variant="secondary"
                className="gap-1 px-2 py-1 bg-white/80 text-orange-800 border-orange-200 hover:bg-white transition-all duration-200 rounded-lg text-xs"
              >
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Team: {filters.teamId}
                <button
                  onClick={() => handleFilterChange("teamId", undefined)}
                  className="ml-1 hover:bg-indigo-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}

            {filters.sortBy && (
              <Badge
                variant="secondary"
                className="gap-1 px-2 py-1 bg-white/80 text-indigo-800 border-indigo-200 hover:bg-white transition-all duration-200 rounded-lg text-xs"
              >
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                Sort: {filters.sortBy}
                <button
                  onClick={() => handleFilterChange("sortBy", undefined)}
                  className="ml-1 hover:bg-orange-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
