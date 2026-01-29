import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Calendar,
  MapPin,
  User,
  Target,
  FileText,
  Users,
  Home,
  Utensils,
  Bus,
  X,
  UserPlus,
  Flag,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
}

const shortDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const countryFlag = (code?: string) => {
  if (!code) return "—";
  try {
    return code
      .toUpperCase()
      .split("")
      .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
      .join("");
  } catch {
    return code;
  }
};

const statusBadgeClass = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "paused":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "closed":
      return "bg-red-50 text-red-700 border border-red-100";
    default:
      return "bg-slate-50 text-slate-700 border border-slate-100";
  }
};

const priorityClass = (priority?: string) => {
  switch ((priority || "").toLowerCase()) {
    case "high":
      return "bg-red-50 text-red-700";
    case "medium":
      return "bg-amber-50 text-amber-700";
    case "low":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-50 text-slate-700";
  }
};

const visaLabel = (v?: string) => {
  if (!v) return "—";
  if (v === "direct_visa") return "Direct Visa";
  if (v === "company_visa") return "Company Visa";
  return v;
};

const ProjectDetailsModal: React.FC<Props> = ({ open, onOpenChange, project }) => {
  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl lg:max-w-6xl max-h-[72vh] p-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-sky-50 to-indigo-50">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-slate-900 truncate flex items-center gap-3">
                <span role="img" aria-label={project.countryCode ? `Flag of ${project.countryCode}` : 'Country flag'} className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-white/80 ring-1 ring-slate-100 text-xl font-semibold">{countryFlag(project.countryCode)}</span>
                <span className="truncate">{project.title}</span>
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityClass(project.priority)}`}>{(project.priority || "").toUpperCase()}</span>
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-600">
                <span className="font-medium">{project.client?.name || "No client"}</span>
                <span className="mx-2">•</span>
                <span className="text-slate-500">Created by {project.creator?.name}</span>
              </DialogDescription>
            </div>

            <div className="flex-shrink-0 text-right">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-medium ${statusBadgeClass(project.status)}`}>
                <svg className="h-3 w-3 text-current" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4" /></svg>
                <span className="uppercase">{project.status || "active"}</span>
              </span>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(72vh-88px)] px-6 py-6 bg-white pb-8">
          <div className="space-y-6">
            {/* Overview */}
            <section>
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-sky-600" /> Project Overview
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="p-3 rounded-lg border bg-cyan-50 border-cyan-100 text-cyan-800">
                  <div className="text-xs text-cyan-600">Client</div>
                  <div className="font-medium">{project.client?.name || '—'}</div>
                  {project.client?.email && <div className="text-xs text-cyan-600 mt-1">{project.client.email}</div>}
                </div>

                <div className="p-3 rounded-lg border bg-indigo-50 border-indigo-100 text-indigo-800">
                  <div className="text-xs text-indigo-600">Created</div>
                  <div className="font-medium">{shortDate(project.createdAt)}</div>
                  <div className="text-xs text-indigo-600 mt-1">By {project.creator?.name}</div>
                </div>

                <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-100 text-emerald-800">
                  <div className="text-xs text-emerald-600">Country</div>
                  <div className="font-medium inline-flex items-center gap-3">
                    <span role="img" aria-label={project.countryCode ? `Flag of ${project.countryCode}` : 'Country flag'} className="text-2xl leading-none">{countryFlag(project.countryCode)}</span>
                    <span className="text-emerald-700">{project.countryCode || '—'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-amber-50 border-amber-100 text-amber-800">
                  <div className="text-xs text-amber-600">Deadline</div>
                  <div className="font-medium">{shortDate(project.deadline)}</div>
                </div>
              </div>
            </section>

            {/* Quick Settings */}
            <section>
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600" /> Quick Settings
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-2 rounded-lg border text-xs text-center bg-cyan-50 border-cyan-100 text-cyan-700">Resume<br/><span className="font-semibold">{project.resumeEditable ? 'Editable' : 'Fixed'}</span></div>
                <div className="p-2 rounded-lg border text-xs text-center bg-indigo-50 border-indigo-100 text-indigo-700">Grooming<br/><span className="font-semibold">{project.groomingRequired || '—'}</span></div>
                <div className="p-2 rounded-lg border text-xs text-center bg-amber-50 border-amber-100 text-amber-700">Screening<br/><span className="font-semibold">{project.requiredScreening ? 'Required' : 'No'}</span></div>
                <div className="p-2 rounded-lg border text-xs text-center bg-pink-50 border-pink-100 text-pink-700">Contact<br/><span className="font-semibold">{project.hideContactInfo ? 'Hidden' : 'Visible'}</span></div>
                <div className="p-2 rounded-lg border text-xs text-center bg-violet-50 border-violet-100 text-violet-700">Visa<br/><span className="font-semibold">{visaLabel(project.visaType)}</span></div>
              </div>
            </section>

            {/* Roles */}
            <section>
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" /> Roles ({project.rolesNeeded?.length || 0})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.rolesNeeded?.map((role: any) => (
                  <div key={role.id} className="p-4 border rounded-lg shadow-sm bg-gradient-to-br from-white to-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{role.designation}</div>
                        <div className="text-xs text-slate-500">{role.roleCatalog?.shortName || role.roleCatalog?.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">{role.quantity} pos</div>
                        <div className="text-xs text-slate-500 mt-1">{role.employmentType || 'Permanent'}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div><strong>Exp:</strong> {role.minExperience ?? 0}–{role.maxExperience ?? 'Any'} yrs</div>
                      <div><strong>Age:</strong> {role.ageRequirement ?? `${role.minAge ?? '—'} to ${role.maxAge ?? '—'}`}</div>
                      <div><strong>Gender:</strong> {role.genderRequirement ?? 'All'}</div>
                      <div><strong>Priority:</strong> <span className={`inline-block px-2 py-0.5 rounded text-xs ${priorityClass(role.priority)}`}>{role.priority?.toUpperCase() || 'MED'}</span></div>
                    </div>

                    {role.educationRequirementsList && role.educationRequirementsList.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-slate-600 mb-1">Education</div>
                        <div className="flex flex-wrap gap-2">
                          {role.educationRequirementsList.map((edu: any) => (
                            <span key={edu.id} className="inline-flex items-center gap-2 px-2 py-1 bg-white rounded border text-xs text-slate-700">{edu.qualification?.shortName || edu.qualification?.name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
                      {role.accommodation && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700"><Home className="h-3 w-3"/> Accom</span>}
                      {role.food && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700"><Utensils className="h-3 w-3"/> Food</span>}
                      {role.transport && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-700"><Bus className="h-3 w-3"/> Transport</span>}
                    </div>

                    {role.notes && <p className="mt-3 text-xs text-slate-600 italic">Note: {role.notes}</p>}
                  </div>
                ))}
              </div>
            </section>

            {/* Documents */}
            {project.documentRequirements?.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" /> Documents
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {project.documentRequirements.map((doc: any) => (
                    <div key={doc.id} className="p-3 rounded-lg border bg-white/60 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900 text-sm capitalize">{doc.docType.replace(/_/g, " ")}</div>
                        <div className="text-xs text-slate-500">{doc.description || '—'}</div>
                      </div>
                      <Badge variant={doc.mandatory ? 'default' : 'secondary'} className="text-xs">{doc.mandatory ? 'Mandatory' : 'Optional'}</Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Description */}
            {project.description ? (
              <section>
                <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-cyan-600" /> Description
                </h3>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">{project.description}</p>
              </section>
            ) : null}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-gradient-to-t from-slate-50">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-slate-600">Created at {shortDate(project.createdAt)}</div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectDetailsModal;