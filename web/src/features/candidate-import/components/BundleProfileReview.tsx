import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGetRoleDepartmentsQuery } from "@/features/projects/api";
import { useGetQualificationsQuery } from "@/shared/hooks/useQualificationsLookup";
import { Briefcase, GraduationCap, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import type {
  BundleProfileSuggestions,
  BundleQualificationSuggestion,
  BundleSegment,
  BundleWorkExperienceSuggestion,
} from "../data/document-bundle.dto";

interface BundleProfileReviewProps {
  suggestions: BundleProfileSuggestions;
  experienceSegments: BundleSegment[];
  disabled?: boolean;
  onChange: (next: BundleProfileSuggestions) => void;
  /** Which blocks to show. Defaults to both. */
  sections?: Array<"qualifications" | "work">;
  heading?: string;
  description?: string;
}

const LEVELS = [
  "CERTIFICATE",
  "DIPLOMA",
  "BACHELOR",
  "MASTER",
  "DOCTORATE",
] as const;

const NEW_QUAL_VALUE = "__new_qualification__";
const NEW_DEPT_VALUE = "__new_department__";
const NEW_ROLE_VALUE = "__new_role__";

function emptyQual(): BundleQualificationSuggestion {
  return {
    id: crypto.randomUUID(),
    rawLabel: "",
    qualificationId: null,
    proposedNew: {
      name: "",
      level: "BACHELOR",
      field: "Nursing",
    },
    university: null,
    graduationYear: null,
    notes: null,
    included: true,
  };
}

function emptyJob(): BundleWorkExperienceSuggestion {
  return {
    id: crypto.randomUUID(),
    departmentRaw: "",
    jobTitleRaw: "",
    roleDepartmentId: null,
    roleCatalogId: null,
    proposedDepartment: { name: "" },
    proposedRole: { label: "" },
    companyName: null,
    startDate: "",
    endDate: null,
    isCurrent: false,
    linkedSegmentIds: [],
    notes: null,
    included: true,
  };
}

/**
 * Editable qualifications and work experiences extracted from the resume.
 *
 * Included rows are saved with the bundle on Apply; excluded rows are ignored.
 */
export function BundleProfileReview({
  suggestions,
  experienceSegments,
  disabled,
  onChange,
  sections = ["qualifications", "work"],
  heading = "From resume",
  description = "Qualifications and work history detected from the resume. Included rows are saved to this candidate when you save the bundle. Missing catalog values are created automatically on save.",
}: BundleProfileReviewProps) {
  const { data: qualData } = useGetQualificationsQuery({
    limit: 500,
  });
  const qualifications = qualData?.data?.qualifications ?? [];

  const { data: deptResponse } = useGetRoleDepartmentsQuery({
    includeRoles: true,
    limit: 200,
  });
  const departments = deptResponse?.data?.departments ?? [];

  const rolesByDept = useMemo(() => {
    const map = new Map<
      string,
      Array<{ id: string; label: string; name: string }>
    >();
    for (const dept of departments) {
      map.set(
        dept.id,
        (dept.roles ?? []).map((role) => ({
          id: role.id,
          label: role.label ?? role.name,
          name: role.name,
        })),
      );
    }
    return map;
  }, [departments]);

  const updateQual = (
    id: string,
    patch: Partial<BundleQualificationSuggestion>,
  ) => {
    onChange({
      ...suggestions,
      qualifications: suggestions.qualifications.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    });
  };

  const updateJob = (
    id: string,
    patch: Partial<BundleWorkExperienceSuggestion>,
  ) => {
    onChange({
      ...suggestions,
      workExperiences: suggestions.workExperiences.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    });
  };

  const showQualifications = sections.includes("qualifications");
  const showWork = sections.includes("work");

  return (
    <section className="space-y-4" aria-label={heading}>
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {showQualifications ? (
            <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
          ) : (
            <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" />
          )}
          {heading}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>

      {showQualifications ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Qualifications
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              onChange({
                ...suggestions,
                qualifications: [...suggestions.qualifications, emptyQual()],
              })
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {suggestions.qualifications.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
            No qualifications found on the resume.
          </p>
        ) : (
          suggestions.qualifications.map((row) => (
            <div
              key={row.id}
              className="space-y-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={row.included}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      updateQual(row.id, { included: Boolean(checked) })
                    }
                  />
                  Include qualification
                </label>
                <div className="flex items-center gap-2">
                  {row.proposedNew && !row.qualificationId ? (
                    <Badge
                      variant="secondary"
                      className="border-0 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    >
                      New catalog value
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    aria-label="Remove qualification"
                    onClick={() =>
                      onChange({
                        ...suggestions,
                        qualifications: suggestions.qualifications.filter(
                          (entry) => entry.id !== row.id,
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <fieldset
                disabled={disabled || !row.included}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Qualification (required)</Label>
                  <Select
                    value={
                      row.qualificationId ??
                      (row.proposedNew ? NEW_QUAL_VALUE : "")
                    }
                    onValueChange={(value) => {
                      if (value === NEW_QUAL_VALUE) {
                        updateQual(row.id, {
                          qualificationId: null,
                          qualificationLabel: null,
                          proposedNew: {
                            name: row.rawLabel || row.proposedNew?.name || "",
                            level: row.proposedNew?.level || "BACHELOR",
                            field: row.proposedNew?.field || "Nursing",
                            shortName: row.proposedNew?.shortName,
                          },
                        });
                        return;
                      }
                      const match = qualifications.find(
                        (entry: { id: string }) => entry.id === value,
                      );
                      updateQual(row.id, {
                        qualificationId: value,
                        qualificationLabel:
                          match?.shortName ?? match?.name ?? null,
                        proposedNew: null,
                        rawLabel: match?.name ?? row.rawLabel,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose qualification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NEW_QUAL_VALUE}>
                        Create new qualification…
                      </SelectItem>
                      {qualifications.map(
                        (entry: {
                          id: string;
                          name: string;
                          shortName?: string;
                        }) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.shortName
                              ? `${entry.shortName} — ${entry.name}`
                              : entry.name}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {row.proposedNew && !row.qualificationId ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">New name</Label>
                      <Input
                        value={row.proposedNew.name}
                        onChange={(event) =>
                          updateQual(row.id, {
                            rawLabel: event.target.value,
                            proposedNew: {
                              ...row.proposedNew!,
                              name: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Level</Label>
                      <Select
                        value={row.proposedNew.level}
                        onValueChange={(value) =>
                          updateQual(row.id, {
                            proposedNew: {
                              ...row.proposedNew!,
                              level: value,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Field</Label>
                      <Input
                        value={row.proposedNew.field}
                        onChange={(event) =>
                          updateQual(row.id, {
                            proposedNew: {
                              ...row.proposedNew!,
                              field: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </>
                ) : null}

                <div className="space-y-1.5">
                  <Label className="text-xs">University (optional)</Label>
                  <Input
                    value={row.university ?? ""}
                    onChange={(event) =>
                      updateQual(row.id, {
                        university: event.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Graduation year (optional)</Label>
                  <Input
                    type="number"
                    min={1950}
                    max={2035}
                    value={row.graduationYear ?? ""}
                    onChange={(event) =>
                      updateQual(row.id, {
                        graduationYear: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={row.notes ?? ""}
                    onChange={(event) =>
                      updateQual(row.id, {
                        notes: event.target.value || null,
                      })
                    }
                  />
                </div>
              </fieldset>
            </div>
          ))
        )}
      </div>
      ) : null}

      {showWork ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
            Work experience
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              onChange({
                ...suggestions,
                workExperiences: [...suggestions.workExperiences, emptyJob()],
              })
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {suggestions.workExperiences.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
            No work experience found on the resume.
          </p>
        ) : (
          suggestions.workExperiences.map((row) => {
            const roles = row.roleDepartmentId
              ? rolesByDept.get(row.roleDepartmentId) ?? []
              : [];
            return (
              <div
                key={row.id}
                className="space-y-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={row.included}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        updateJob(row.id, { included: Boolean(checked) })
                      }
                    />
                    Include work experience
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    aria-label="Remove work experience"
                    onClick={() =>
                      onChange({
                        ...suggestions,
                        workExperiences: suggestions.workExperiences.filter(
                          (entry) => entry.id !== row.id,
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <fieldset
                  disabled={disabled || !row.included}
                  className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Department (required)</Label>
                    <Select
                      value={
                        row.roleDepartmentId ??
                        (row.proposedDepartment ? NEW_DEPT_VALUE : "")
                      }
                      onValueChange={(value) => {
                        if (value === NEW_DEPT_VALUE) {
                          updateJob(row.id, {
                            roleDepartmentId: null,
                            roleDepartmentLabel: null,
                            roleCatalogId: null,
                            roleCatalogLabel: null,
                            proposedDepartment: {
                              name:
                                row.departmentRaw ||
                                row.proposedDepartment?.name ||
                                "",
                            },
                            proposedRole: row.proposedRole ?? {
                              label: row.jobTitleRaw,
                            },
                          });
                          return;
                        }
                        const dept = departments.find(
                          (entry) => entry.id === value,
                        );
                        updateJob(row.id, {
                          roleDepartmentId: value,
                          roleDepartmentLabel: dept?.label ?? null,
                          departmentRaw: dept?.label ?? row.departmentRaw,
                          proposedDepartment: null,
                          roleCatalogId: null,
                          roleCatalogLabel: null,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NEW_DEPT_VALUE}>
                          Create new department…
                        </SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {row.proposedDepartment && !row.roleDepartmentId ? (
                      <Input
                        className="mt-2"
                        placeholder="New department name"
                        value={row.proposedDepartment.name}
                        onChange={(event) =>
                          updateJob(row.id, {
                            departmentRaw: event.target.value,
                            proposedDepartment: { name: event.target.value },
                          })
                        }
                      />
                    ) : null}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Job title (required)</Label>
                    <Select
                      value={
                        row.roleCatalogId ??
                        (row.proposedRole ? NEW_ROLE_VALUE : "")
                      }
                      onValueChange={(value) => {
                        if (value === NEW_ROLE_VALUE) {
                          updateJob(row.id, {
                            roleCatalogId: null,
                            roleCatalogLabel: null,
                            proposedRole: {
                              label:
                                row.jobTitleRaw ||
                                row.proposedRole?.label ||
                                "",
                              roleDepartmentId:
                                row.roleDepartmentId ?? undefined,
                            },
                          });
                          return;
                        }
                        const role = roles.find((entry) => entry.id === value);
                        updateJob(row.id, {
                          roleCatalogId: value,
                          roleCatalogLabel: role?.label ?? null,
                          jobTitleRaw: role?.label ?? row.jobTitleRaw,
                          proposedRole: null,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose job title" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NEW_ROLE_VALUE}>
                          Create new job title…
                        </SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {row.proposedRole && !row.roleCatalogId ? (
                      <Input
                        className="mt-2"
                        placeholder="New job title"
                        value={row.proposedRole.label}
                        onChange={(event) =>
                          updateJob(row.id, {
                            jobTitleRaw: event.target.value,
                            proposedRole: {
                              label: event.target.value,
                              roleDepartmentId:
                                row.roleDepartmentId ?? undefined,
                            },
                          })
                        }
                      />
                    ) : null}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Organization (optional)</Label>
                    <Input
                      value={row.companyName ?? ""}
                      onChange={(event) =>
                        updateJob(row.id, {
                          companyName: event.target.value || null,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Start date (required)</Label>
                    <Input
                      type="date"
                      value={row.startDate}
                      onChange={(event) =>
                        updateJob(row.id, { startDate: event.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">End date</Label>
                    <Input
                      type="date"
                      disabled={row.isCurrent}
                      value={row.endDate ?? ""}
                      onChange={(event) =>
                        updateJob(row.id, {
                          endDate: event.target.value || null,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-end sm:col-span-2">
                    <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
                      <Checkbox
                        checked={row.isCurrent}
                        onCheckedChange={(checked) =>
                          updateJob(row.id, {
                            isCurrent: Boolean(checked),
                            endDate: checked ? null : row.endDate,
                          })
                        }
                      />
                      This is my current position
                    </label>
                  </div>

                  {experienceSegments.length > 0 ? (
                    <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                      <Label className="text-xs">
                        Attach experience certificate pages
                      </Label>
                      <div className="flex flex-wrap gap-3">
                        {experienceSegments.map((segment) => {
                          const checked = row.linkedSegmentIds.includes(
                            segment.id,
                          );
                          const label =
                            segment.endPage === segment.startPage
                              ? `Page ${segment.startPage}`
                              : `Pages ${segment.startPage}–${segment.endPage}`;
                          return (
                            <label
                              key={segment.id}
                              className="flex items-center gap-2 text-xs text-foreground"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(next) => {
                                  const linked = next
                                    ? [...row.linkedSegmentIds, segment.id]
                                    : row.linkedSegmentIds.filter(
                                        (id) => id !== segment.id,
                                      );
                                  updateJob(row.id, {
                                    linkedSegmentIds: linked,
                                  });
                                }}
                              />
                              {label}
                              {segment.docName ? ` · ${segment.docName}` : ""}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </fieldset>
              </div>
            );
          })
        )}
      </div>
      ) : null}
    </section>
  );
}

/** Client-side gate before calling apply / profile PATCH. */
export function validateProfileSuggestions(
  suggestions: BundleProfileSuggestions,
): string | null {
  for (const row of suggestions.qualifications) {
    if (!row.included) continue;
    if (!row.qualificationId && !row.proposedNew?.name?.trim()) {
      return "Each included qualification needs a catalog match or a new name.";
    }
    if (row.proposedNew && !row.qualificationId) {
      if (!row.proposedNew.level || !row.proposedNew.field?.trim()) {
        return `New qualification "${row.proposedNew.name}" needs level and field.`;
      }
    }
  }

  for (const row of suggestions.workExperiences) {
    if (!row.included) continue;
    if (
      !row.roleDepartmentId &&
      !row.proposedDepartment?.name?.trim() &&
      !row.roleCatalogId
    ) {
      return `Work experience "${row.jobTitleRaw || "untitled"}" needs a department.`;
    }
    if (!row.roleCatalogId && !row.proposedRole?.label?.trim()) {
      return "Each included work experience needs a job title.";
    }
    if (!row.startDate) {
      return "Each included work experience needs a start date.";
    }
    if (!row.isCurrent && !row.endDate) {
      return `Work experience "${row.jobTitleRaw}" needs an end date, or mark it as current.`;
    }
  }

  return null;
}
