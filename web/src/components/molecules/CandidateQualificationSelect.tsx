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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Search, GraduationCap, ChevronsUpDown } from "lucide-react";
import {
  useGetQualificationsQuery,
  type Qualification,
} from "@/shared/hooks/useQualificationsLookup";
import CountrySelect from "./CountrySelect";
import { QualificationFormDialog } from "@/features/admin/components/QualificationFormDialog";

export interface CandidateQualification {
  id: string;
  qualificationId: string;
  qualificationName?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
  isCompleted: boolean;
  notes?: string;
  countryCode?: string;
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
  const [qualificationFormOpen, setQualificationFormOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const { data: qualificationsData, isLoading: isLoadingQualifications } =
    useGetQualificationsQuery({
      q: searchQuery.trim() || undefined,
      isActive: true,
      page,
      limit: 15,
    });

  const qualifications = qualificationsData?.data?.qualifications || [];
  const pagination = qualificationsData?.data?.pagination;
  const currentPage = pagination?.page || page;
  const totalPages = pagination?.totalPages || 1;

  const selectedIds = useMemo(
    () => new Set(value.map((qual) => qual.qualificationId)),
    [value]
  );

  const availableQualifications = useMemo(
    () => qualifications.filter((qual) => !selectedIds.has(qual.id)),
    [qualifications, selectedIds]
  );

  const addQualification = (qualification: Qualification) => {
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
      countryCode: "",
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

  const handleOpenChange = (next: boolean) => {
    setIsDropdownOpen(next);
    if (!next) {
      setSearchQuery("");
    }
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {value.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Selected Qualifications
            </Label>
            <div className="space-y-3">
              {value.map((qualification) => (
                <div
                  key={qualification.id}
                  className="border border-border rounded-lg p-4 bg-muted"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-foreground">
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
                      aria-label={`Remove ${qualification.qualificationName || "qualification"}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
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

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
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

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">GPA</Label>
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

                    <div className="space-y-1 md:col-span-2">
                      <CountrySelect
                        label="Country (optional)"
                        value={qualification.countryCode || ""}
                        onValueChange={(code) =>
                          updateQualification(qualification.id, {
                            countryCode: code,
                          })
                        }
                        allowEmpty
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select
                        value={
                          qualification.isCompleted
                            ? "completed"
                            : "in-progress"
                        }
                        onValueChange={(status) =>
                          updateQualification(qualification.id, {
                            isCompleted: status === "completed",
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

                  <div className="mt-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
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

        <div className="space-y-2">
          <Label className="text-sm font-medium">Add Qualification</Label>
          <Popover open={isDropdownOpen} onOpenChange={handleOpenChange} modal={false}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-label="Select qualification"
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
                className="w-full justify-between font-normal text-muted-foreground"
              >
                <span className="flex items-center">
                  <Plus className="h-4 w-4 mr-2" aria-hidden />
                  Select Qualification
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] max-w-[min(100%,24rem)] p-0 overflow-hidden"
              align="start"
              sideOffset={4}
              collisionPadding={16}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-border p-2">
                  <p className="text-xs font-medium text-foreground">
                    Qualifications
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1.5"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setQualificationFormOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add qualification
                  </Button>
                </div>
                <div className="border-b border-border p-2">
                  <div className="relative">
                    <Search
                      className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      aria-hidden
                    />
                    <Input
                      placeholder="Search qualifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoComplete="off"
                      aria-label="Search qualifications"
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <ScrollArea className="h-64">
                  <div className="p-1" role="listbox" aria-label="Qualifications">
                    {isLoadingQualifications ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading qualifications...
                      </div>
                    ) : availableQualifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {searchQuery
                          ? "No qualifications found matching your search"
                          : "No qualifications available"}
                      </div>
                    ) : (
                      availableQualifications.map((qualification) => (
                        <button
                          key={qualification.id}
                          type="button"
                          role="option"
                          className="flex w-full items-start gap-2 rounded-md p-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => addQualification(qualification)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">
                              {qualification.name}
                            </div>
                            {qualification.shortName ? (
                              <div className="text-xs text-muted-foreground">
                                {qualification.shortName}
                              </div>
                            ) : null}
                            <div className="text-xs text-muted-foreground">
                              {qualification.level} • {qualification.field}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      Prev
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <QualificationFormDialog
        open={qualificationFormOpen}
        onOpenChange={setQualificationFormOpen}
        onSuccess={(created) => {
          addQualification({
            id: created.id,
            name: created.name,
            shortName: created.shortName ?? undefined,
            level: created.level,
            field: created.field,
            program: created.program ?? undefined,
            description: created.description ?? undefined,
            isActive: created.isActive ?? true,
            createdAt: created.createdAt ?? "",
            updatedAt: created.updatedAt ?? "",
          });
        }}
      />
    </div>
  );
}
