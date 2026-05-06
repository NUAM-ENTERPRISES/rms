import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertCircle, UserPlus, Loader2, Search, ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";
import { usersApi } from "@/features/admin/api";

interface TransferCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  currentRecruiter?: { id: string; name?: string; email?: string } | null;
  onConfirm: (data: { targetRecruiterId: string; reason: string }) => void;
  isLoading?: boolean;
}

export function TransferCandidateDialog({
  open,
  onOpenChange,
  candidateName,
  currentRecruiter,
  onConfirm,
  isLoading = false,
}: TransferCandidateDialogProps) {
  const [targetRecruiterId, setTargetRecruiterId] = useState("");
  const [selectedRecruiterName, setSelectedRecruiterName] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({
    targetRecruiterId: false,
    reason: false,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 8;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: usersResponse, isLoading: isLoadingUsers } = usersApi.useGetUsersQuery(
    { roles: ["Recruiter"], search: debouncedSearch || undefined, page, limit: LIMIT },
    { skip: !open }
  );

  const recruiters = (usersResponse?.data?.users ?? []).filter(
    (u) => u.id !== currentRecruiter?.id
  );
  const totalPages = usersResponse?.data?.totalPages ?? 1;

  useEffect(() => {
    if (!open) {
      setTargetRecruiterId("");
      setSelectedRecruiterName("");
      setReason("");
      setErrors({ targetRecruiterId: false, reason: false });
      setSearch("");
      setDebouncedSearch("");
      setPage(1);
      setDropdownOpen(false);
    }
  }, [open]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const validateForm = () => {
    const newErrors = {
      targetRecruiterId: !targetRecruiterId,
      reason: !reason.trim(),
    };
    setErrors(newErrors);
    return !newErrors.targetRecruiterId && !newErrors.reason;
  };

  const isFormValid = targetRecruiterId && reason.trim();

  const handleSubmit = () => {
    if (validateForm()) {
      onConfirm({ targetRecruiterId, reason: reason.trim() });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Transfer Candidate</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Transfer <span className="font-semibold text-slate-700">{candidateName}</span> to another recruiter
              </DialogDescription>
            </div>
          </div>
          {/* Candidate being transferred */}
          <div className="mb-2">
            <div className="text-xs font-medium text-slate-600 mb-1.5">Candidate</div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-50 border border-indigo-100">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {candidateName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-indigo-900 truncate">{candidateName}</span>
            </div>
          </div>
          {/* Current recruiter display */}
          <div className="mb-2">
            <div className="text-xs font-medium text-slate-600 mb-2">Current Recruiter</div>
            <div className="flex items-center gap-3 p-2 rounded-md bg-slate-50/50">
              {currentRecruiter ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                    {currentRecruiter.name?.charAt(0)?.toUpperCase() || "R"}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-900">{currentRecruiter.name}</div>
                    <div className="text-xs text-slate-500">{currentRecruiter.email}</div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-400 italic">Unassigned</div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Target Recruiter Dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Target Recruiter <span className="text-red-500">*</span>
            </Label>

            <div className="relative" ref={dropdownRef}>
              {/* Trigger */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setDropdownOpen((v) => !v)}
                className={`w-full flex items-center justify-between gap-2 h-10 px-3 rounded-md border bg-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.targetRecruiterId ? "border-red-500" : "border-gray-200 hover:border-gray-300"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className={selectedRecruiterName ? "text-slate-900" : "text-slate-400"}>
                  {selectedRecruiterName || "Select a recruiter..."}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                  {/* Search inside dropdown */}
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        autoFocus
                        placeholder="Search recruiters..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-8 text-sm border-gray-200"
                      />
                    </div>
                  </div>

                  {/* Options list */}
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    ) : recruiters.length === 0 ? (
                      <div className="py-6 text-center text-sm text-slate-500">No recruiters found</div>
                    ) : (
                      recruiters.map((recruiter) => {
                        const isSelected = targetRecruiterId === recruiter.id;
                        return (
                          <button
                            key={recruiter.id}
                            type="button"
                            onClick={() => {
                              setTargetRecruiterId(recruiter.id);
                              setSelectedRecruiterName(recruiter.name || recruiter.email || "");
                              setErrors((prev) => ({ ...prev, targetRecruiterId: false }));
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                              isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {recruiter.name?.charAt(0).toUpperCase() || "R"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm text-slate-900 truncate">{recruiter.name}</div>
                              <div className="text-xs text-slate-500 truncate">{recruiter.email}</div>
                              {(recruiter.userLanguages?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {recruiter.userLanguages!.slice(0, 3).map((ul) => (
                                    <span key={ul.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-100">
                                      {ul.language?.name ?? ul.languageCode}
                                      <span className="ml-1 text-violet-400">{ul.proficiency}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {(recruiter.userCountryCoverages?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {recruiter.userCountryCoverages!.slice(0, 4).map((uc) => (
                                    <span key={uc.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                      {uc.country?.name ?? uc.countryCode}
                                      {uc.sectorScopes?.map((s) => (
                                        <span key={s} className={`px-1 py-0.5 rounded text-[9px] font-semibold ${s === 'HEALTHCARE' ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-orange-700'}`}>
                                          {s === 'HEALTHCARE' ? 'HC' : 'NHC'}
                                        </span>
                                      ))}
                                    </span>
                                  ))}
                                  {recruiter.userCountryCoverages!.length > 4 && (
                                    <span className="text-[10px] text-slate-400">+{recruiter.userCountryCoverages!.length - 4} more</span>
                                  )}
                                </div>
                              )}
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Pagination inside dropdown */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
                      <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          disabled={page === 1}
                          onClick={(e) => { e.stopPropagation(); setPage((p) => p - 1); }}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          disabled={page === totalPages}
                          onClick={(e) => { e.stopPropagation(); setPage((p) => p + 1); }}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {errors.targetRecruiterId && (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Target recruiter is required</span>
              </div>
            )}
          </div>

          {/* Reason Field */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-slate-700">
              Reason for Transfer <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for this transfer..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErrors((prev) => ({ ...prev, reason: false }));
              }}
              className={`min-h-[80px] resize-none ${
                errors.reason ? "border-red-500 focus:ring-red-500" : ""
              }`}
              disabled={isLoading}
            />
            {errors.reason && (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Reason is required</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Transferring...</>
            ) : (
              <><UserPlus className="h-4 w-4 mr-2" />Transfer Candidate</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
