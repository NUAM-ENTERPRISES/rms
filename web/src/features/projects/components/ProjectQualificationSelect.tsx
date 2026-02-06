import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Plus, X, Search, Star, GraduationCap } from "lucide-react";
import {
  useRoleRecommendations,
  useQualificationsLookup,
  useQualificationValidation,
} from "@/shared";

export interface EducationRequirement {
  qualificationId: string;
  mandatory: boolean;
}

export interface ProjectQualificationSelectProps {
  roleId?: string;
  countryCode?: string;
  value: EducationRequirement[];
  onChange: (requirements: EducationRequirement[]) => void;
  className?: string;
}

export default function ProjectQualificationSelect({
  roleId,
  countryCode,
  value,
  onChange,
  className,
}: ProjectQualificationSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch recommended qualifications for the role
  const { recommendations, isLoading: isLoadingRecommendations } =
    useRoleRecommendations(roleId || "", countryCode);

  // Fetch all qualifications for browsing
  const { qualifications, isLoading: isLoadingQualifications } =
    useQualificationsLookup({
      q: searchQuery,
      isActive: true,
      limit: 10,
    });

  const { getQualificationName } = useQualificationValidation();

  // Get currently selected qualification IDs
  const selectedIds = useMemo(
    () => new Set(value.map((req) => req.qualificationId)),
    [value]
  );

  // Combine recommendations and all qualifications for dropdown
  const dropdownOptions = useMemo(() => {
    const options: Array<{
      id: string;
      name: string;
      shortName?: string;
      level: string;
      field: string;
      isRecommended: boolean;
      isPreferred?: boolean;
    }> = [];

    // Add recommended qualifications first
    recommendations.forEach((rec) => {
      if (!selectedIds.has(rec.qualification.id)) {
        options.push({
          id: rec.qualification.id,
          name: rec.qualification.name,
          shortName: rec.qualification.shortName,
          level: rec.qualification.level,
          field: rec.qualification.field,
          isRecommended: true,
          isPreferred: rec.isPreferred,
        });
      }
    });

    // Add other qualifications
    qualifications.forEach((qual) => {
      if (
        !selectedIds.has(qual.id) &&
        !recommendations.some((r) => r.qualification.id === qual.id)
      ) {
        options.push({
          id: qual.id,
          name: qual.name,
          shortName: qual.shortName,
          level: qual.level,
          field: qual.field,
          isRecommended: false,
        });
      }
    });

    return options;
  }, [recommendations, qualifications, selectedIds]);

  // Add a qualification to the selection
  const addQualification = (
    qualificationId: string,
    mandatory: boolean = true
  ) => {
    if (selectedIds.has(qualificationId)) return;

    const newRequirements = [...value, { qualificationId, mandatory }];
    onChange(newRequirements);
  };

  // Remove a qualification from the selection
  const removeQualification = (qualificationId: string) => {
    const newRequirements = value.filter(
      (req) => req.qualificationId !== qualificationId
    );
    onChange(newRequirements);
  };

  // Toggle mandatory status
  const toggleMandatory = (qualificationId: string) => {
    const newRequirements = value.map((req) =>
      req.qualificationId === qualificationId
        ? { ...req, mandatory: !req.mandatory }
        : req
    );
    onChange(newRequirements);
  };

  return (
    <div className={className}>
      <div className="space-y-3">
        {/* Selected Qualifications */}
        {value.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {value.map((requirement) => {
                const qualName = getQualificationName(
                  requirement.qualificationId,
                  qualifications
                );
                return (
                  <Badge
                    key={requirement.qualificationId}
                    variant="secondary"
                    className="text-xs flex items-center gap-1"
                  >
                    <span className="font-medium">{qualName}</span>
                    <Select
                      value={requirement.mandatory ? "required" : "preferred"}
                      onValueChange={(value) => {
                        if (value === "required" && !requirement.mandatory) {
                          toggleMandatory(requirement.qualificationId);
                        } else if (
                          value === "preferred" &&
                          requirement.mandatory
                        ) {
                          toggleMandatory(requirement.qualificationId);
                        }
                      }}
                    >
                      <SelectTrigger className="h-4 w-16 text-xs border-0 bg-transparent p-0 focus:ring-0 hover:bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="required" className="text-xs">
                          Required
                        </SelectItem>
                        <SelectItem value="preferred" className="text-xs">
                          Preferred
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() =>
                        removeQualification(requirement.qualificationId)
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Qualification Dropdown */}
        <div className="space-y-2">
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between h-10 border-border focus:border-ring focus:ring-ring/20"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add qualification
                </span>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="start">
              {/* Search Input */}
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search qualifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-8 text-sm"
                  />
                </div>
              </div>

              <ScrollArea className="h-64">
                {isLoadingQualifications || isLoadingRecommendations ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    Loading qualifications...
                  </div>
                ) : dropdownOptions.length > 0 ? (
                  <>
                    {/* Recommended Section */}
                    {dropdownOptions.some((opt) => opt.isRecommended) && (
                      <>
                        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                          <Star className="h-3 w-3 text-yellow-500" />
                          Recommended for this role
                        </DropdownMenuLabel>
                        {dropdownOptions
                          .filter((opt) => opt.isRecommended)
                          .map((option) => (
                            <DropdownMenuItem
                              key={option.id}
                              onClick={() => {
                                addQualification(
                                  option.id,
                                  option.isPreferred || true
                                );
                                setIsDropdownOpen(false);
                              }}
                              className="flex items-center justify-between p-2 cursor-pointer"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {option.shortName || option.name}
                                  </span>
                                  {option.isPreferred && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Preferred
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {option.field} • {option.level}
                                </div>
                              </div>
                              <Plus className="h-3 w-3 text-muted-foreground" />
                            </DropdownMenuItem>
                          ))}
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {/* All Qualifications Section */}
                    {dropdownOptions.some((opt) => !opt.isRecommended) && (
                      <>
                        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                          <GraduationCap className="h-3 w-3" />
                          All qualifications
                        </DropdownMenuLabel>
                        {dropdownOptions
                          .filter((opt) => !opt.isRecommended)
                          .slice(0, 20) // Limit to prevent overwhelming UI
                          .map((option) => (
                            <DropdownMenuItem
                              key={option.id}
                              onClick={() => {
                                addQualification(option.id, true);
                                setIsDropdownOpen(false);
                              }}
                              className="flex items-center justify-between p-2 cursor-pointer"
                            >
                              <div className="flex-1">
                                <div className="text-sm font-medium">
                                  {option.shortName || option.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {option.field} • {option.level}
                                </div>
                              </div>
                              <Plus className="h-3 w-3 text-muted-foreground" />
                            </DropdownMenuItem>
                          ))}
                      </>
                    )}
                  </>
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    {searchQuery
                      ? "No qualifications found matching your search."
                      : "No qualifications available."}
                  </div>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
