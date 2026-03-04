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

  const selectedIds = useMemo(
    () => new Set(value.map((qual) => qual.qualificationId)),
    [value]
  );

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
      <div className="space-y-5">
        {/* Selected Qualifications */}
        {value.length > 0 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Selected Qualifications
            </Label>
            <div className="space-y-4">
              {value.map((qualification) => (
                <div
                  key={qualification.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/70"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {qualification.qualificationName ||
                          getQualificationName(qualification.qualificationId)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQualification(qualification.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md p-1.5"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* University */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">
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
                        className="h-9 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500"
                      />
                    </div>

                    {/* Graduation Year */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">
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
                        className="h-9 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500"
                      />
                    </div>

                    {/* GPA */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">GPA</Label>
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
                        className="h-9 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500"
                      />
                    </div>

                    {/* Is Completed */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Status</Label>
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
                        <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-4 space-y-1.5">
                    <Label className="text-xs text-slate-600 dark:text-slate-400">Notes</Label>
                    <Input
                      value={qualification.notes || ""}
                      onChange={(e) =>
                        updateQualification(qualification.id, {
                          notes: e.target.value,
                        })
                      }
                      placeholder="Additional notes..."
                      className="h-9 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Qualification */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Add Qualification
          </Label>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Select Qualification
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-80 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[70vh]"
              align="start"
            >
              <DropdownMenuLabel className="text-slate-700 dark:text-slate-300">
                Search Qualifications
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder="Search qualifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500"
                  />
                </div>
              </div>
              <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
              <ScrollArea className="h-64">
                {isLoadingQualifications ? (
                  <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    Loading qualifications...
                  </div>
                ) : availableQualifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    {searchQuery
                      ? "No qualifications found matching your search"
                      : "No qualifications available"}
                  </div>
                ) : (
                  availableQualifications.map((qualification) => (
                    <DropdownMenuItem
                      key={qualification.id}
                      onSelect={() => addQualification(qualification)}
                      className="flex items-start gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-100">
                          {qualification.name}
                        </div>
                        {qualification.shortName && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {qualification.shortName}
                          </div>
                        )}
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {qualification.level} • {qualification.field}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </ScrollArea>
              <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
              <div className="px-3 py-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div>
                  Page {qualificationsData?.data?.pagination?.page || page} of{" "}
                  {qualificationsData?.data?.pagination?.totalPages || 1}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={(qualificationsData?.data?.pagination?.page || page) <= 1}
                    className="h-7 px-2.5 text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPage((p) =>
                        qualificationsData?.data?.pagination?.totalPages
                          ? Math.min(qualificationsData?.data?.pagination?.totalPages, p + 1)
                          : p + 1
                      )
                    }
                    disabled={
                      (qualificationsData?.data?.pagination?.page || page) >=
                      (qualificationsData?.data?.pagination?.totalPages || 1)
                    }
                    className="h-7 px-2.5 text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
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