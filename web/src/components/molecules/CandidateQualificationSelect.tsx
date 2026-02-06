import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, Search, GraduationCap } from "lucide-react";
import { useGetQualificationsQuery } from "@/shared/hooks/useQualificationsLookup";

export interface CandidateQualification {
  id: string;
  qualificationId: string;
  qualificationName?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
  isCompleted: boolean;
  notes?: string;
}

export interface CandidateQualificationSelectProps {
  value: CandidateQualification[];
  onChange: (qualifications: CandidateQualification[]) => void;
  className?: string;
}

export default function CandidateQualificationSelect({
  value,
  onChange,
  className,
}: CandidateQualificationSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Fetch qualifications for browsing with pagination (limit 15).
  // Only fetch when the dropdown is open to avoid unnecessary network calls
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

  // Get currently selected qualification IDs
  const selectedIds = useMemo(
    () => new Set(value.map((qual) => qual.qualificationId)),
    [value]
  );

  // Filter out already selected qualifications
  const availableQualifications = useMemo(
    () => qualifications.filter((qual) => !selectedIds.has(qual.id)),
    [qualifications, selectedIds]
  );

  const addQualification = (qualification: any) => {
    const newQualification: CandidateQualification = {
      id: Date.now().toString(),
      qualificationId: qualification.id,
      qualificationName:
        qualification.name || `Qualification ${qualification.id}`,
      university: "",
      graduationYear: undefined,
      gpa: undefined,
      isCompleted: true,
      notes: "",
    };
    onChange([...value, newQualification]);
    setIsDropdownOpen(false);
    setSearchQuery("");
  };

  const removeQualification = (id: string) => {
    onChange(value.filter((qual) => qual.id !== id));
  };

  const updateQualification = (
    id: string,
    updates: Partial<CandidateQualification>
  ) => {
    onChange(
      value.map((qual) => (qual.id === id ? { ...qual, ...updates } : qual))
    );
  };

  const getQualificationName = (qualificationId: string) => {
    const qualification = qualifications.find((q) => q.id === qualificationId);
    return qualification?.name || `Qualification ${qualificationId}`;
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Selected Qualifications */}
        {value.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Selected Qualifications
            </Label>
            <div className="space-y-3">
              {value.map((qualification) => (
                <div
                  key={qualification.id}
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-slate-800">
                        {qualification.qualificationName ||
                          getQualificationName(qualification.qualificationId)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQualification(qualification.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* University */}
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">
                        University
                      </Label>
                      <Input
                        value={qualification.university || ""}
                        onChange={(e) =>
                          updateQualification(qualification.id, {
                            university: e.target.value,
                          })
                        }
                        placeholder="University name"
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* Graduation Year */}
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">
                        Graduation Year
                      </Label>
                      <Input
                        type="number"
                        value={qualification.graduationYear || ""}
                        onChange={(e) =>
                          updateQualification(qualification.id, {
                            graduationYear: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="2020"
                        min="1950"
                        max="2030"
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* GPA */}
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">GPA</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={qualification.gpa || ""}
                        onChange={(e) =>
                          updateQualification(qualification.id, {
                            gpa: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="3.8"
                        min="0"
                        max="4"
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* Is Completed */}
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Status</Label>
                      <Select
                        value={
                          qualification.isCompleted
                            ? "completed"
                            : "in-progress"
                        }
                        onValueChange={(value) =>
                          updateQualification(qualification.id, {
                            isCompleted: value === "completed",
                          })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="in-progress">
                            In Progress
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-3 space-y-1">
                    <Label className="text-xs text-slate-600">Notes</Label>
                    <Input
                      value={qualification.notes || ""}
                      onChange={(e) =>
                        updateQualification(qualification.id, {
                          notes: e.target.value,
                        })
                      }
                      placeholder="Additional notes..."
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Qualification */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Add Qualification</Label>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-slate-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Select Qualification
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="start">
              <DropdownMenuLabel>Search Qualifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search qualifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
              </div>
              <DropdownMenuSeparator />
              <ScrollArea className="h-64">
                {isLoadingQualifications ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    Loading qualifications...
                  </div>
                ) : availableQualifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    {searchQuery
                      ? "No qualifications found matching your search"
                      : "No qualifications available"}
                  </div>
                ) : (
                  availableQualifications.map((qualification) => (
                    <DropdownMenuItem
                      key={qualification.id}
                      onSelect={() => addQualification(qualification)}
                      className="flex items-start gap-2 p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800">
                          {qualification.name}
                        </div>
                        {qualification.shortName && (
                          <div className="text-xs text-slate-500">
                            {qualification.shortName}
                          </div>
                        )}
                        <div className="text-xs text-slate-600">
                          {qualification.level} • {qualification.field}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </ScrollArea>
              <DropdownMenuSeparator />
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <div className="text-xs text-slate-500">
                  Page {qualificationsData?.data?.pagination?.page || page} of {qualificationsData?.data?.pagination?.totalPages || 1}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(qualificationsData?.data?.pagination?.page || page) <= 1}>
                    Prev
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPage((p) => (qualificationsData?.data?.pagination?.totalPages ? Math.min(qualificationsData?.data?.pagination?.totalPages, p + 1) : p + 1))} disabled={(qualificationsData?.data?.pagination?.page || page) >= (qualificationsData?.data?.pagination?.totalPages || 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
