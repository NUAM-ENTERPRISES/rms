import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Building2, Users, Briefcase, Settings, ShieldCheck, ClipboardCheck } from "lucide-react";

type Project = any;

import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectCountryCell } from "@/components/molecules/domain";

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function ProjectDetailsModal({
  isOpen,
  onClose,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
}) {
  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-5xl lg:max-w-6xl max-h-[70vh] p-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl bg-white">
        {/* Header - Compact */}
        <div className="px-5 py-3 border-b bg-slate-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-indigo-700 leading-tight truncate">
                {project.title}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-slate-600 flex items-center gap-3 flex-wrap">
                {project.countryCode ? (
                  <ProjectCountryCell
                    countryCode={project.countryCode}
                    countryName={project.country?.name}
                    size="md"
                    fallbackText="No country"
                    className="inline-flex items-center text-sm"
                  />
                ) : (
                  <span className="text-slate-500 text-sm">No country specified</span>
                )}
                <span className="hidden sm:inline text-slate-400 text-sm">•</span>
                <Badge variant="outline" className="text-xs px-3 py-0.5 bg-white">
                  {project.status?.toUpperCase() || "ACTIVE"}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[calc(70vh-90px)] px-5 py-4 sm:px-6 sm:py-5 bg-white">
          <div className="space-y-5">

            {/* Overview */}
            <section>
              <h3 className="text-base font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                Overview
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                <div><span className="text-xs text-slate-500">Client:</span> {project.client?.name || "—"}</div>
                <div><span className="text-xs text-slate-500">Created by:</span> {project.creator?.name || "—"}</div>
                <div><span className="text-xs text-slate-500">Deadline:</span> {formatDate(project.deadline)}</div>
                <div><span className="text-xs text-slate-500">Created:</span> {formatDate(project.createdAt)}</div>
                <div><span className="text-xs text-slate-500">Priority:</span> {project.priority?.toUpperCase() || "MEDIUM"}</div>
                <div><span className="text-xs text-slate-500">Status:</span> {project.status}</div>
              </div>
            </section>

            {/* Settings */}
            <section>
              <h3 className="text-base font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-600" />
                Settings
              </h3>
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium">
                  Resume Editable: {project.resumeEditable ? "Yes" : "No"}
                </div>
                <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium">
                  Hide Contact: {project.hideContactInfo ? "Yes" : "No"}
                </div>
                <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium">
                  Screening: {project.requiredScreening ? "Required" : "No"}
                </div>
                <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium">
                  Grooming: {project.groomingRequired || "—"}
                </div>
                <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium">
                  Type: {project.projectType || "Private"}
                </div>
                {project.licensingExam && (
                  <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium border border-orange-200 text-orange-700">
                    License: {project.licensingExam.toUpperCase()}
                  </div>
                )}
                {project.dataFlow && (
                  <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium border border-blue-200 text-blue-700">
                    Data Flow Required
                  </div>
                )}
                {project.eligibility && (
                  <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-700">
                    Eligibility Required
                  </div>
                )}
              </div>
            </section>

            {/* Roles - Grid layout */}
            {project.rolesNeeded?.length > 0 && (
              <section>
                <h3 className="text-base font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Roles ({project.rolesNeeded.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {project.rolesNeeded.map((role: any) => (
                    <div key={role.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex flex-col">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <div className="flex flex-col min-w-0">
                          <h4 className="text-base font-semibold text-purple-700 truncate">{role.designation}</h4>
                          {role.roleCatalog?.roleDepartment && (
                            <span className="text-[10px] text-slate-500 font-medium truncate">
                              {role.roleCatalog.roleDepartment.label}
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs px-3 py-0.5 w-fit flex-shrink-0">
                          {role.quantity} pos
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><strong>Exp:</strong> {role.minExperience}–{role.maxExperience || "Any"}</div>
                        <div><strong>Age:</strong> {role.ageRequirement || "—"}</div>
                        <div><strong>Gender:</strong> {role.genderRequirement || "All"}</div>
                        <div><strong>Employment:</strong> {role.employmentType || "Any"}</div>
                        <div><strong>Visa:</strong> {role.visaType || "Any"}</div>
                        <div><strong>Salary:</strong> {role.salaryRange || "As per policy"}</div>
                      </div>

                      {/* Education List */}
                      {role.educationRequirementsList?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {role.educationRequirementsList.map((edu: any, idx: number) => (
                            <span key={idx} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                              {edu.qualification?.shortName || edu.qualification?.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Benefits & Requirements */}
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {role.accommodation && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Accommodation</Badge>
                          )}
                          {role.food && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Food Provided</Badge>
                          )}
                          {role.transport && (
                            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">Transportation</Badge>
                          )}
                        </div>

                        {(role.backgroundCheckRequired || role.drugScreeningRequired) && (
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-slate-500">
                            {role.backgroundCheckRequired && (
                              <span className="flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Background Check
                              </span>
                            )}
                            {role.drugScreeningRequired && (
                              <span className="flex items-center gap-1">
                                <ClipboardCheck className="h-3 w-3" /> Drug Screening
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {role.notes && (
                        <p className="mt-2 text-xs text-slate-600 italic">
                          Note: {role.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Documents - Grid layout */}
            {project.documentRequirements?.length > 0 && (
              <section>
                <h3 className="text-base font-semibold text-amber-700 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  Documents
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {project.documentRequirements.map((doc: any) => (
                    <div key={doc.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col">
                      <div className="flex-1">
                        <p className="font-medium text-amber-700 truncate capitalize">{doc.docType.replace(/_/g, ' ')}</p>
                        {doc.description && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{doc.description}</p>}
                      </div>
                      <Badge variant={doc.mandatory ? "default" : "secondary"} className="text-xs px-3 py-0.5 mt-2 w-fit">
                        {doc.mandatory ? "Mandatory" : "Optional"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-slate-50 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="min-w-[90px]"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
