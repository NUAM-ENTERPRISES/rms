import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Star,
  Trophy,
  Send,
  Building2,
  X,
  UserCheck,
  Edit2,
} from "lucide-react";
import { ConfirmationDialog } from "../ui";

// ─── Helpers ────────────────────────────────────────────
const getMatchScoreColor = (score: number) => {
  if (score >= 90) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 70) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
};

const getMinimalScoreBadgeClass = (score?: number) => {
  if (typeof score !== "number") return "bg-slate-50 text-slate-700";
  if (score >= 90) return "bg-green-50 text-green-700";
  if (score >= 80) return "bg-blue-50 text-blue-700";
  if (score >= 70) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
};

const resolveNumericScore = (s: any): number | undefined => {
  if (s === undefined || s === null) return undefined;
  if (typeof s === "number") return s;
  if (typeof s === "object") {
    if (typeof s.score === "number") return s.score;
    if (typeof s?.value === "number") return s.value;
  }
  return undefined;
};

const getInitials = (firstName?: string, lastName?: string) =>
  `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

const formatWorkExperienceEntry = (exp: any) => {
  const title = exp.designation || exp.position || exp.role || exp.jobTitle || "";
  const company = exp.companyName || exp.company || "";
  let yearsLabel = "";
  if (typeof exp.yearsOfExperience === "number") {
    yearsLabel = ` (${exp.yearsOfExperience} yrs)`;
  } else if (exp.startDate) {
    try {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      const diffMs = Math.max(0, end.getTime() - start.getTime());
      const years = Math.round((diffMs / (1000 * 60 * 60 * 24 * 365)) * 10) / 10;
      if (!Number.isNaN(years) && years > 0) yearsLabel = ` (${years} yrs)`;
    } catch {
      /* ignore */
    }
  }
  const parts: string[] = [];
  if (title) parts.push(title);
  if (company) parts.push(`at ${company}`);
  return `${parts.join(" ")}${yearsLabel}`.trim();
};

// ─── Types ──────────────────────────────────────────────
interface BulkScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    assignments: Array<{ candidateId: string; roleNeededId: string; coordinatorId?: string; notes?: string }>,
    coordinatorId: string
  ) => void;
  candidates: any[];
  roles: Array<{ id: string; name: string }>;
  coordinators?: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
  eligibilityMap?: Record<string, any>;
  onRemoveCandidate?: (candidateId: string) => void;
}

// ─── Component ──────────────────────────────────────────
export const BulkScreeningModal: React.FC<BulkScreeningModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  candidates,
  roles,
  coordinators = [],
  isSubmitting = false,
  eligibilityMap = {},
  onRemoveCandidate,
}) => {
  const [candidateAssignments, setCandidateAssignments] = useState<
    Array<{
      candidateId: string;
      candidateName: string;
      roleNeededId: string;
      coordinatorId: string;
      notes: string;
      matchScore?: number;
      isNominated?: boolean;
      isEditingRole?: boolean;
    }>
  >([]);

  const [globalCoordinatorId, setGlobalCoordinatorId] = useState<string>("");
  const [roleEditConfirm, setRoleEditConfirm] = useState<{ 
    candidateId: string; 
    candidateName: string; 
    currentRoleName: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && candidates.length > 0) {
      // Use a Map to ensure unique candidates by ID
      const uniqueCandidatesMap = new Map();
      candidates.forEach(c => {
        const id = c.candidateId || c.id;
        if (id && !uniqueCandidatesMap.has(id)) {
          uniqueCandidatesMap.set(id, c);
        }
      });

      const uniqueCandidates = Array.from(uniqueCandidatesMap.values());

      const initialAssignments = uniqueCandidates.map((c) => {
        let bestRoleNeededId = "";
        
        // Priority 1: Top score from data
        let topRoleNameFromData = "";
        let topScoreFromData = -1;

        if (c.matchScore && typeof c.matchScore === "object") {
          const ms = c.matchScore as any;
          topRoleNameFromData = ms.roleName || ms.roleDepartmentLabel || "";
          topScoreFromData = ms.score ?? -1;
        }

        if (c.roleMatches && Array.isArray(c.roleMatches)) {
          for (const rm of c.roleMatches) {
            const score = rm.score ?? rm.matchScore ?? -1;
            if (score > topScoreFromData) {
              topScoreFromData = score;
              topRoleNameFromData = rm.designation || "";
            }
          }
        }

        if (topRoleNameFromData) {
          const projectRole = roles.find(r => 
            r.id === (c.matchScore as any)?.roleId ||
            r.name.toLowerCase() === topRoleNameFromData.toLowerCase() ||
            (r as any).label?.toLowerCase() === topRoleNameFromData.toLowerCase() ||
            (r as any).designation?.toLowerCase() === topRoleNameFromData.toLowerCase()
          );
          if (projectRole) bestRoleNeededId = projectRole.id;
        }

        // Priority 2: Fallback to nominatedRole
        if (!bestRoleNeededId && c.nominatedRole?.designation) {
          const projectRole = roles.find(r => 
            r.name === c.nominatedRole.designation ||
            (r as any).label === c.nominatedRole.designation
          );
          if (projectRole) bestRoleNeededId = projectRole.id;
        }

        // Priority 3: Final fallback to first role
        if (!bestRoleNeededId) {
          bestRoleNeededId = roles?.[0]?.id || "";
        }

        const candidateId = c.candidateId || c.id;
        const hasNominatedRole = !!c.nominatedRole?.id || !!c.nominatedRole?.designation;

        return {
          candidateId,
          candidateName: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          roleNeededId: bestRoleNeededId,
          coordinatorId: "", // Default to round robin/inherit
          notes: "",
          matchScore: resolveNumericScore(c.matchScore),
          isNominated: hasNominatedRole,
          isEditingRole: !hasNominatedRole,
        };
      });
      setCandidateAssignments(initialAssignments);
    }
  }, [isOpen, candidates, roles]);

  useEffect(() => {
    if (isOpen && candidates.length === 0) {
      onClose();
    }
  }, [isOpen, candidates.length, onClose]);

  const handleRoleChange = (candidateId: string, roleId: string) => {
    setCandidateAssignments((prev) =>
      prev.map((a) => (a.candidateId === candidateId ? { ...a, roleNeededId: roleId } : a))
    );
  };

  const handleCoordinatorChange = (candidateId: string, coordinatorId: string) => {
    setCandidateAssignments((prev) =>
      prev.map((a) => (a.candidateId === candidateId ? { ...a, coordinatorId } : a))
    );
  };

  const handleNotesChange = (candidateId: string, notes: string) => {
    setCandidateAssignments((prev) =>
      prev.map((a) => (a.candidateId === candidateId ? { ...a, notes } : a))
    );
  };

  const handleStartEditRole = (candidateId: string) => {
    const assignment = candidateAssignments.find(a => a.candidateId === candidateId);
    if (assignment) {
      const currentRole = roles.find(r => r.id === assignment.roleNeededId)?.name || "Unknown Role";
      setRoleEditConfirm({ 
        candidateId, 
        candidateName: assignment.candidateName,
        currentRoleName: currentRole 
      });
    }
  };

  const confirmEditRole = () => {
    if (roleEditConfirm) {
      setCandidateAssignments((prev) =>
        prev.map((a) => (a.candidateId === roleEditConfirm.candidateId ? { ...a, isEditingRole: true } : a))
      );
      setRoleEditConfirm(null);
    }
  };

  const handleConfirm = () => {
    onConfirm(
      candidateAssignments.map(({ candidateId, roleNeededId, coordinatorId, notes }) => ({
        candidateId,
        roleNeededId,
        coordinatorId: coordinatorId || undefined,
        notes,
      })),
      globalCoordinatorId
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[95vw] xl:max-w-[1400px] h-[92vh] flex flex-col p-0 gap-0">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-purple-50/60 to-white">
          <div className="flex items-center justify-between w-full pr-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center shadow-sm">
                <Send className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">
                  Bulk Send for Screening
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Send multiple candidates for direct screening. Document verification will be skipped.
                </DialogDescription>
              </div>
            </div>

            {/* Global Coordinator Selector */}
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm ml-auto">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Assign Coordinator</span>
                <span className="text-[9px] text-slate-400">Optional (Auto-assigns via Round Robin if empty)</span>
              </div>
              <Select value={globalCoordinatorId || "round-robin"} onValueChange={(val) => setGlobalCoordinatorId(val === "round-robin" ? "" : val)}>
                <SelectTrigger className="w-[200px] h-9 text-xs">
                  <UserCheck className="h-3.5 w-3.5 mr-2 text-purple-500" />
                  <SelectValue placeholder="Select Coordinator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round-robin">Round Robin (Default)</SelectItem>
                  {coordinators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold px-2.5 py-0.5">
              {candidateAssignments.length} Candidate{candidateAssignments.length !== 1 ? "s" : ""} Selected
            </Badge>
            <div className="text-[11px] text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded border border-red-100">
              Note: Direct screening candidates skip document verification.
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable Content ── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {candidateAssignments.map((assignment, idx) => {
              const candidate = candidates.find(
                (c) => (c.candidateId || c.id) === assignment.candidateId
              );
              const matchScore = assignment.matchScore;

              return (
                <div
                  key={assignment.candidateId}
                  className="rounded-xl border border-slate-200/80 bg-white overflow-hidden flex flex-col h-[520px] relative group"
                >
                  {/* ── Remove Button ── */}
                  {onRemoveCandidate && (
                    <button
                      onClick={() => onRemoveCandidate(assignment.candidateId)}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 shadow-sm transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* ── Candidate Header (Fixed) ── */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/20 flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>

                    <Avatar className="h-9 w-9 border-2 border-white flex-shrink-0 ring-2 ring-slate-100">
                      <AvatarImage src={candidate?.profileImage} alt={assignment.candidateName} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[11px] font-bold">
                        {getInitials(candidate?.firstName, candidate?.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {assignment.candidateName || "Unnamed"}
                      </p>
                    </div>

                    {matchScore !== undefined && (
                      <Badge variant="outline" className={`${getMatchScoreColor(matchScore)} border text-[10px] px-1.5 py-0 rounded-md flex items-center gap-1 font-bold`}>
                        <Trophy className="h-2.5 w-2.5" />
                        {matchScore}%
                      </Badge>
                    )}
                  </div>

                  {/* ── Details (Scrollable) ── */}
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="px-4 pb-4 pt-3 space-y-4">
                      {/* ── Education & Experience (Minimal for selection modal) ── */}
                      {candidate && (
                        <div className="grid grid-cols-1 gap-2">
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <div className="flex items-center gap-1 mb-1">
                              <GraduationCap className="h-3 w-3 text-blue-500" />
                              <span className="text-[9px] font-bold text-slate-500 uppercase">Top Education</span>
                            </div>
                            <p className="text-[11px] text-slate-700 truncate">
                              {(candidate.qualifications?.[0]?.qualification?.name || candidate.candidateQualifications?.[0]?.name || "No degree listed")}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <div className="flex items-center gap-1 mb-1">
                              <Building2 className="h-3 w-3 text-purple-500" />
                              <span className="text-[9px] font-bold text-slate-500 uppercase">Recent Experience</span>
                            </div>
                            <p className="text-[11px] text-slate-700 truncate">
                              {candidate.workExperiences?.[0] ? formatWorkExperienceEntry(candidate.workExperiences[0]) : "No exp listed"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ── Role Match Scores ── */}
                      {candidate?.roleMatches && candidate.roleMatches.length > 0 && (
                        <div className="pt-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Role Matches</p>
                          <div className="flex flex-wrap gap-1">
                            {candidate.roleMatches.map((rm: any, rIdx: number) => (
                              <div key={rIdx} className="flex items-center gap-1 rounded px-1.5 py-0.5 border border-slate-100 bg-slate-50/30">
                                <span className="text-[9px] text-slate-600 max-w-[80px] truncate">{rm.designation}</span>
                                <span className={`${getMinimalScoreBadgeClass(rm.score)} text-[9px] font-bold px-1 rounded`}>{rm.score}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── Role Selector & Notes ── */}
                      <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                              Target Role
                            </label>
                            {assignment.isNominated && !assignment.isEditingRole && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[10px] text-blue-600 hover:text-blue-700 font-bold"
                                onClick={() => handleStartEditRole(assignment.candidateId)}
                              >
                                <Edit2 className="h-2.5 w-2.5 mr-1" />
                                Edit Role
                              </Button>
                            )}
                          </div>
                          <Select
                            value={assignment.roleNeededId}
                            onValueChange={(val) => handleRoleChange(assignment.candidateId, val)}
                            disabled={!assignment.isEditingRole}
                          >
                            <SelectTrigger className="bg-white border-slate-200 h-9 text-xs">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => {
                                const roleMatch = candidate?.roleMatches?.find((rm: any) => rm.designation === role.name);
                                const candidateEligibility = eligibilityMap[assignment.candidateId];
                                const roleEligibility = candidateEligibility?.roleEligibility?.find((re: any) => re.designation === role.name || re.roleId === role.id);
                                return (
                                  <SelectItem key={role.id} value={role.id}>
                                    <span className="flex items-center gap-2">
                                      {roleEligibility && (
                                        roleEligibility.isEligible ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                                      )}
                                      {role.name}
                                      {roleMatch && <span className={`${getMinimalScoreBadgeClass(roleMatch.score)} text-[9px] font-bold px-1 rounded ml-1`}>{roleMatch.score}%</span>}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>

                          {/* Eligibility info */}
                          {(() => {
                            const selectedRole = roles.find((r) => r.id === assignment.roleNeededId);
                            const candidateEligibility = eligibilityMap[assignment.candidateId];
                            const roleEligibility = candidateEligibility?.roleEligibility?.find((re: any) => re.designation === selectedRole?.name || re.roleId === selectedRole?.id);
                            if (!roleEligibility) return null;
                            const isEligible = roleEligibility.isEligible;
                            return (
                              <div className={`p-2 rounded border text-[10px] ${isEligible ? "bg-green-50/50 border-green-100 text-green-700" : "bg-red-50/50 border-red-100 text-red-600"}`}>
                                <p className="font-bold flex items-center gap-1.5">
                                  {isEligible ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                  {isEligible ? "Eligible" : "Ineligible"}
                                </p>
                                {!isEligible && roleEligibility.reasons?.length > 0 && (
                                  <p className="mt-0.5 opacity-80">{roleEligibility.reasons[0]}</p>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-purple-500" />
                            Coordinator
                          </label>
                          <Select
                            value={assignment.coordinatorId || "inherit"}
                            onValueChange={(val) => handleCoordinatorChange(assignment.candidateId, val === "inherit" ? "" : val)}
                          >
                            <SelectTrigger className="bg-white border-slate-200 h-9 text-xs">
                              <SelectValue placeholder="Inherit (Round Robin)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">
                                {globalCoordinatorId 
                                  ? `Inherit (${coordinators.find(c => c.id === globalCoordinatorId)?.name || 'Round Robin'})`
                                  : 'Round Robin'}
                              </SelectItem>
                              {coordinators.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Notes</label>
                          <Textarea
                            placeholder="Screening notes..."
                            className="resize-none h-16 text-[11px] bg-slate-50/30"
                            value={assignment.notes}
                            onChange={(e) => handleNotesChange(assignment.candidateId, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
           </div>
          </div>
        </ScrollArea>

        {/* ── Footer ── */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 px-8 font-bold shadow-sm"
            disabled={isSubmitting || candidateAssignments.some((a) => !a.roleNeededId)}
          >
            {isSubmitting ? <><Star className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send {candidateAssignments.length} Candidates for Screening</>}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Role Edit Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!roleEditConfirm}
        onClose={() => setRoleEditConfirm(null)}
        onConfirm={confirmEditRole}
        title="Edit assigned role"
        description={`This candidate (${roleEditConfirm?.candidateName}) already has an assigned role (${roleEditConfirm?.currentRoleName}). Do you want to edit it?`}
        confirmText="Edit role"
        cancelText="Cancel"
      />
    </Dialog>
  );
};
