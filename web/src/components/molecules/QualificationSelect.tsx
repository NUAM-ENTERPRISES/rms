import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronDown, X } from "lucide-react";
import { useGetQualificationsQuery } from "@/shared/hooks/useQualificationsLookup";
import { cn } from "@/lib/utils";

interface QualificationSelectProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function QualificationSelect({
  value,
  onValueChange,
  placeholder = "Select qualification",
  className,
}: QualificationSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const { data: qualificationsData, isLoading: isLoadingQualifications } =
    useGetQualificationsQuery(
      {
        q: searchQuery,
        isActive: true,
        page,
        limit: 15,
      },
      { skip: !isDropdownOpen }
    );

  const qualifications = qualificationsData?.data?.qualifications || [];
  const pagination = qualificationsData?.data?.pagination;

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isDropdownOpen}
            className="w-full justify-between h-8 text-xs font-normal"
          >
            <span className="truncate">{value || placeholder}</span>
            {value ? (
              <X
                className="ml-2 h-3 w-3 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange(undefined);
                }}
              />
            ) : (
              <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuLabel className="text-xs">Search Qualifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
          </div>
          <DropdownMenuSeparator />
          <ScrollArea className="h-48">
            {isLoadingQualifications ? (
              <div className="p-4 text-center text-xs text-slate-500">
                Loading...
              </div>
            ) : qualifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No outcomes found
              </div>
            ) : (
              qualifications.map((q: any) => (
                <DropdownMenuItem
                  key={q.id}
                  onSelect={() => {
                    onValueChange(q.name);
                    setIsDropdownOpen(false);
                  }}
                  className="text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{q.name}</span>
                    {q.level && (
                      <span className="text-[10px] text-slate-500">
                        {q.level} • {q.field}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </ScrollArea>
          {pagination && pagination.totalPages > 1 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    disabled={pagination.page <= 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPage((p) => p - 1);
                    }}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPage((p) => p + 1);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
