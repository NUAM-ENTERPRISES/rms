import React, { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { usersApi, UserWithRoles } from "@/features/admin/api";
import { useDebounce } from "@/hooks/useDebounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  role?: string | string[];
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export function UserSelect({
  value,
  onChange,
  placeholder = "Select user...",
  role,
  className,
  disabled,
  allowClear = true,
}: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Query users based on role, search and pagination
  const { data, isLoading, isFetching } = usersApi.useGetUsersQuery({
    search: debouncedSearch,
    roles: role,
    page,
    limit,
  });

  const allUsers = data?.data?.users || [];
  const hasMore = data?.data?.totalPages ? page < data?.data?.totalPages : false;

  // Find selected user for display
  const selectedUser = useMemo(() => {
    return allUsers.find((u) => u.id === value);
  }, [allUsers, value]);

  const handleSelect = (currentId: string) => {
    if (onChange) {
      onChange(currentId === value ? "" : currentId);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal transition-all duration-200",
            "border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300",
            open && "ring-2 ring-blue-500/20 border-blue-400",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {selectedUser ? (
              <>
                <div className="relative">
                  <Avatar className="h-6 w-6 border border-blue-100 shadow-sm">
                    <AvatarImage src={selectedUser.profileImage} />
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      {selectedUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-emerald-500 border border-white rounded-full shadow-sm" />
                </div>
                <span className="truncate font-medium text-slate-700">{selectedUser.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground flex items-center gap-2">
                <Search className="h-3.5 w-3.5 opacity-50" />
                {placeholder}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {allowClear && value && (
              <X
                className="h-3.5 w-3.5 shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              open ? "text-blue-500" : "text-slate-400"
            )} />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 shadow-2xl border-0 rounded-2xl bg-white/95 backdrop-blur-sm overflow-hidden ring-1 ring-black/5" 
        style={{ width: 'var(--radix-popover-trigger-width)', minWidth: '240px' }}
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col max-h-[350px] w-full bg-white">
          <div className="p-3 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10 flex items-center gap-3">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <Search className="h-4 w-4 text-blue-500 shrink-0" />
            </div>
            <input
              className="flex h-9 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-slate-400 font-medium"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              autoFocus
            />
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 custom-scrollbar space-y-1">
            {isLoading && page === 1 ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="p-3 bg-blue-50 rounded-full animate-bounce">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
                <span className="text-xs font-medium text-slate-400">Fetching users...</span>
              </div>
            ) : allUsers.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                  <Search className="h-6 w-6 text-slate-200" />
                </div>
                <p className="text-sm font-medium text-slate-500">No users match your search</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {allUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelect(user.id)}
                    className={cn(
                      "group relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2.5 text-sm outline-none transition-all duration-200",
                      "hover:bg-blue-50 hover:shadow-sm",
                      value === user.id ? "bg-blue-50/50 ring-1 ring-blue-100" : "bg-transparent"
                    )}
                  >
                    <div className="relative mr-3">
                      <Avatar className="h-9 w-9 border-2 border-white ring-1 ring-slate-100 shadow-sm transition-transform group-hover:scale-105">
                        <AvatarImage src={user.profileImage} />
                        <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-slate-400 to-slate-500 text-white">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {value === user.id && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                          <Check className="h-2.5 w-2.5 text-white stroke-[3px]" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className={cn(
                        "font-semibold truncate transition-colors",
                        value === user.id ? "text-blue-700" : "text-slate-700 group-hover:text-blue-600"
                      )}>
                        {user.name}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate group-hover:text-blue-400">
                        {user.email}
                      </span>
                    </div>

                    <div className={cn(
                      "ml-2 transition-all duration-300 transform",
                      value === user.id ? "scale-100 opacity-100" : "scale-50 opacity-0 group-hover:opacity-30 group-hover:scale-100"
                    )}>
                      <Check className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                ))}
                
                {hasMore && (
                  <div className="p-1 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs w-full h-10 rounded-xl font-bold bg-slate-50 text-slate-500 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPage((p) => p + 1);
                      }}
                      disabled={isFetching}
                    >
                      {isFetching ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        "Discover more users"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
