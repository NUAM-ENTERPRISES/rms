import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronDown, 
  Search, 
  Check, 
  Loader2, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { useGetProjectSubStatusQuery } from "@/features/projects/api";

interface WorkflowStatusDropdownProps {
  mainStatusName: string;
  selectedSubStatus?: string;
  onSubStatusSelect: (subStatus: string) => void;
  label?: string;
}

export const WorkflowStatusDropdown: React.FC<WorkflowStatusDropdownProps> = ({
  mainStatusName,
  selectedSubStatus,
  onSubStatusSelect,
  label = "Select Stage",
}) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Handle debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Only run query if mainStatusName is defined
  const { data, isLoading } = useGetProjectSubStatusQuery(
    { 
      mainStatusName: mainStatusName || '', 
      search: debouncedSearch, 
      page, 
      limit 
    },
    { skip: !mainStatusName }
  );

  const subStatuses = data?.data?.subStatuses || [];
  const pagination = data?.data?.pagination;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-4 min-w-[180px] justify-between text-sm font-medium border-gray-200 bg-white hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm rounded-lg"
        >
          <span className="flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading...
              </>
            ) : (
              !selectedSubStatus ? "All Stages" : (subStatuses.find(s => s.name === selectedSubStatus)?.label || selectedSubStatus)
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl border-blue-100 rounded-xl">
        <DropdownMenuLabel className="flex flex-col gap-2 px-1 py-1.5 outline-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search statuses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs border-slate-100 bg-slate-50 focus:ring-1 focus:ring-blue-500/20 rounded-md"
            />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-50" />
        
        <div className="max-h-[220px] overflow-y-auto py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            </div>
          ) : subStatuses.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">No statuses found</div>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => onSubStatusSelect("all_sub")}
                className={`text-xs p-2 cursor-pointer rounded-md ${!selectedSubStatus ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span>All Sub-statuses</span>
                  {!selectedSubStatus && <Check className="h-3.5 w-3.5 text-blue-600" />}
                </div>
              </DropdownMenuItem>
              {subStatuses.map((status: any) => (
                <DropdownMenuItem
                  key={status.id}
                  onClick={() => onSubStatusSelect(status.name)}
                  className={`text-xs p-2 cursor-pointer rounded-md mt-0.5 ${selectedSubStatus === status.name ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{status.label}</span>
                    {selectedSubStatus === status.name && <Check className="h-3.5 w-3.5 text-blue-600" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </div>

        {pagination && pagination.pages > 1 && (
          <>
            <DropdownMenuSeparator className="bg-slate-50" />
            <div className="flex items-center justify-between px-1 py-1.5">
              <span className="text-[10px] text-slate-400 font-medium">
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:bg-slate-50"
                  disabled={pagination.page <= 1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPage(p => Math.max(1, p - 1));
                  }}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:bg-slate-50"
                  disabled={pagination.page >= pagination.pages}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPage(p => Math.min(pagination.pages, p + 1));
                  }}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
