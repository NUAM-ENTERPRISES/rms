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
  UserPlus,
  Building2,
  X,
} from "lucide-react";

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
interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    assignments: Array<{ candidateId: string; roleNeededId: string; notes?: string }>
  ) => void;
  candidates: any[];
  roles: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
  eligibilityMap?: Record<string, any>;
  onRemoveCandidate?: (candidateId: string) => void;
}

// ─── Component ──────────────────────────────────────────
export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  candidates,
  roles,
  isSubmitting = false,
  eligibilityMap = {},
  onRemoveCandidate,
}) => {
  const [candidateAssignments, setCandidateAssignments] = useState<
    Array<{
      candidateId: string;
      candidateName: string;
      roleNeededId: string;
      notes: string;
      matchScore?: number;
    }>
  >([]);

  // Track which candidate cards are expanded (default: all expanded)
  // Not used but kept to avoid breaking other logic if any
  // const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && candidates.length > 0) {
      const initialAssignments = candidates.map((c) => {
        // Try to find the highest match score role from candidate's match results
        let bestRoleNeededId = "";
        
        // Priority 1: Highest scoring roleMatch from candidate's match result (object or array)
        let topRoleNameFromData = "";
        let topScoreFromData = -1;

        // Check if c.matchScore is an object (as seen in the API response provided)
        if (c.matchScore && typeof c.matchScore === "object") {
          const ms = c.matchScore as any;
          topRoleNameFromData = ms.roleName || ms.roleDepartmentLabel || "";
          topScoreFromData = ms.score ?? -1;
        }

        // Check c.roleMatches array
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

        // Priority 2: Fallback to nominatedRole if it matches a project role
        if (!bestRoleNeededId && c.nominatedRole?.designation) {
          const projectRole = roles.find(r => 
            r.name === c.nominatedRole.designation ||
            (r as any).label === c.nominatedRole.designation
          );
          if (projectRole) bestRoleNeededId = projectRole.id;
        }

        // Priority 3: Final fallback to the FIRST role in the project list
        if (!bestRoleNeededId) {
          bestRoleNeededId = roles?.[0]?.id || "";
        }

        const candidateId = c.candidateId || c.id;

        return {
          candidateId,
          candidateName: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          roleNeededId: bestRoleNeededId,
          notes: "",
          matchScore: resolveNumericScore(c.matchScore),
        };
      });
      setCandidateAssignments(initialAssignments);
    }
  }, [isOpen, candidates, roles]);

  // Automatically close modal if all candidates are removed
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

  const handleNotesChange = (candidateId: string, notes: string) => {
    setCandidateAssignments((prev) =>
      prev.map((a) => (a.candidateId === candidateId ? { ...a, notes } : a))
    );
  };

  const handleConfirm = () => {
    onConfirm(
      candidateAssignments.map(({ candidateId, roleNeededId, notes }) => ({
        candidateId,
        roleNeededId,
        notes,
      }))
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[95vw] xl:max-w-[1400px] h-[92vh] flex flex-col p-0 gap-0">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
              <UserPlus className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                Bulk Assign to Project
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Review each candidate, select a role, and confirm the assignment.
              </DialogDescription>
            </div>
          </div>
          {/* Summary strip */}
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold px-2.5 py-0.5">
              {candidates.length} Candidate{candidates.length !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold px-2.5 py-0.5">
              {roles.length} Role{roles.length !== 1 ? "s" : ""} Available
            </Badge>
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
                      title="Remove from bulk assignment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* ── Candidate Header (Fixed) ── */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/20 flex-shrink-0">
                    {/* Number badge */}
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>

                    <Avatar className="h-9 w-9 border-2 border-white flex-shrink-0 ring-2 ring-slate-100">
                      <AvatarImage src={candidate?.profileImage} alt={assignment.candidateName} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[11px] font-bold">
                        {getInitials(candidate?.firstName, candidate?.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {assignment.candidateName || "Unnamed"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {(candidate?.currentRole || candidate?.currentEmployer) && (
                          <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {candidate?.currentRole || candidate?.currentEmployer}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Match Score pill */}
                    {matchScore !== undefined && (
                      <div className="flex flex-col items-end flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={`${getMatchScoreColor(matchScore)} border text-[10px] px-1.5 py-0 rounded-md flex items-center gap-1 font-bold`}
                        >
                          <Trophy className="h-2.5 w-2.5" />
                          {matchScore}%
                        </Badge>
                        {candidate?.matchScore?.roleName && (
                          <span className="text-[9px] text-slate-400 font-medium mt-0.5 max-w-[80px] truncate text-right leading-none">
                            {candidate.matchScore.roleName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Details (Scrollable) ── */}
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="px-4 pb-4 pt-3 space-y-4">
                      {/* ── Match Score Summary ── */}
                      {matchScore !== undefined && (
                        <div className="space-y-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Match Quality</span>
                            {candidate?.matchScore?.roleName && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                {candidate.matchScore.roleName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              className={`${getMatchScoreColor(matchScore)} w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm`}
                            >
                              {matchScore}%
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`${getMatchScoreColor(matchScore)} h-1.5 rounded-full`}
                                  style={{ width: `${matchScore}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Candidate Profile: Education & Experience ── */}
                      {candidate && (
                        <div className="grid grid-cols-1 gap-3 pt-1">
                          {/* Education */}
                          <div className="bg-white rounded-lg border border-slate-100 p-2.5 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <GraduationCap className="h-3.5 w-3.5 text-blue-500" />
                              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Education</span>
                            </div>
                            <div className="space-y-1.5">
                              {candidate.qualifications && candidate.qualifications.length > 0 ? (
                                candidate.qualifications.slice(0, 3).map((qual: any, qIdx: number) => (
                                  <p key={qIdx} className="text-[11px] text-slate-700 leading-tight border-l-2 border-slate-100 pl-2">
                                    {qual.qualification?.name || qual.qualification?.shortName || qual.name || "N/A"}
                                    {(qual.qualification?.field || qual.field) ? ` — ${qual.qualification?.field || qual.field}` : ""}
                                    {qual.graduationYear ? ` (${qual.graduationYear})` : ""}
                                  </p>
                                ))
                              ) : candidate.candidateQualifications && candidate.candidateQualifications.length > 0 ? (
                                candidate.candidateQualifications.slice(0, 3).map((qual: any, qIdx: number) => (
                                  <p key={qIdx} className="text-[11px] text-slate-700 leading-tight border-l-2 border-slate-100 pl-2">
                                    {qual.name || "N/A"}
                                    {qual.field ? ` — ${qual.field}` : ""}
                                  </p>
                                ))
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">No education details</p>
                              )}
                            </div>
                          </div>

                          {/* Experience */}
                          <div className="bg-white rounded-lg border border-slate-100 p-2.5 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Building2 className="h-3.5 w-3.5 text-purple-500" />
                              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Experience</span>
                            </div>
                            <div className="space-y-1.5">
                              {candidate.workExperiences && candidate.workExperiences.length > 0 ? (
                                candidate.workExperiences.slice(0, 3).map((exp: any, eIdx: number) => (
                                  <p key={eIdx} className="text-[11px] text-slate-700 leading-tight border-l-2 border-slate-100 pl-2">
                                    {formatWorkExperienceEntry(exp)}
                                  </p>
                                ))
                              ) : candidate.totalExperience ? (
                                <p className="text-[11px] text-slate-700 border-l-2 border-slate-100 pl-2">{candidate.totalExperience} years total</p>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic border-l-2 border-slate-100 pl-2">No experience details</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Role Match Scores ── */}
                      {candidate?.roleMatches && candidate.roleMatches.length > 0 && (
                        <div className="pt-1">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            Role Match Scores
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.roleMatches.map((rm: any, rIdx: number) => (
                              <div
                                key={rIdx}
                                className="flex items-center gap-1.5 rounded-full px-2 py-0.5 border border-slate-100 bg-white"
                              >
                                <span className="text-[10px] text-slate-700 max-w-[120px] truncate">
                                  {rm.designation || "Role"}
                                </span>
                                <span
                                  className={`${getMinimalScoreBadgeClass(rm.score)} text-[10px] font-semibold px-1 py-0 rounded-full`}
                                >
                                  {rm.score ?? "-"}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── Role Selector & Notes ── */}
                      <div className="grid grid-cols-1 gap-3 pt-1">
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-emerald-500" />
                            Assign Role
                          </label>
                          <Select
                            value={assignment.roleNeededId}
                            onValueChange={(val) =>
                              handleRoleChange(assignment.candidateId, val)
                            }
                          >
                            <SelectTrigger className="bg-white border-slate-200 h-9 text-sm">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => {
                                // Check if candidate has a match for this role
                                const roleMatch = candidate?.roleMatches?.find(
                                  (rm: any) => rm.designation === role.name
                                );
                                // Check eligibility for this role from the eligibility data
                                const candidateEligibility = eligibilityMap[assignment.candidateId];
                                const roleEligibility = candidateEligibility?.roleEligibility?.find(
                                  (re: any) => re.designation === role.name || re.roleId === role.id
                                );
                                return (
                                  <SelectItem key={role.id} value={role.id}>
                                    <span className="flex items-center gap-2">
                                      {roleEligibility && (
                                        <>
                                          {roleEligibility.isEligible ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                                          ) : (
                                            <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                                          )}
                                        </>
                                      )}
                                      {role.name}
                                      {roleMatch && (
                                        <span className={`${getMinimalScoreBadgeClass(roleMatch.score)} text-[10px] font-semibold px-1.5 rounded-full ml-1`}>
                                          {roleMatch.score}%
                                        </span>
                                      )}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>

                          {/* Selected role match info with eligibility */}
                          {(() => {
                            const selectedRole = roles.find((r) => r.id === assignment.roleNeededId);
                            const roleMatch = candidate?.roleMatches?.find(
                              (rm: any) => rm.designation === selectedRole?.name
                            );
                            const candidateEligibility = eligibilityMap[assignment.candidateId];
                            const roleEligibility = candidateEligibility?.roleEligibility?.find(
                              (re: any) => re.designation === selectedRole?.name || re.roleId === selectedRole?.id
                            );

                            if (!roleMatch && !roleEligibility) return null;

                            const isEligible = roleEligibility?.isEligible ?? true;
                            const hasReasons = roleEligibility?.reasons && roleEligibility.reasons.length > 0;

                            return (
                              <div className="space-y-2">
                                {/* Role match score badge */}
                                {roleMatch && (
                                  <div
                                    className={`p-2 rounded-md border text-[10px] ${
                                      (roleMatch.score ?? 0) >= 70
                                        ? "bg-blue-50 border-blue-200"
                                        : "bg-amber-50 border-amber-200"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 font-semibold">
                                      <Trophy className="h-3 w-3" />
                                      <span className={`${(roleMatch.score ?? 0) >= 70 ? "text-blue-700" : "text-amber-700"}`}>
                                        {roleMatch.score}% Match Score
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Eligibility status badge */}
                                {roleEligibility && (
                                  <div
                                    className={`p-2.5 rounded-md border text-[10px] ${
                                      isEligible
                                        ? "bg-green-50 border-green-200"
                                        : "bg-red-50 border-red-200"
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      {isEligible ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                                      )}
                                      <div className="flex-1">
                                        <p className={`font-semibold ${isEligible ? "text-green-700" : "text-red-700"}`}>
                                          {isEligible
                                            ? `Eligible for ${selectedRole?.name}`
                                            : `${selectedRole?.name} — Eligibility Issues`}
                                        </p>
                                        {!isEligible && hasReasons && (
                                          <ul className="mt-1 space-y-0.5 text-[10px] text-red-600">
                                            {roleEligibility.reasons.map((reason: string, rIdx: number) => (
                                              <li key={rIdx} className="list-disc list-inside">
                                                {reason}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                            Notes (Optional)
                          </label>
                          <Textarea
                            placeholder="Add assignment notes..."
                            className="resize-none h-12 min-h-[48px] py-2 text-xs bg-white border-slate-200"
                            value={assignment.notes}
                            onChange={(e) =>
                              handleNotesChange(assignment.candidateId, e.target.value)
                            }
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
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6 text-sm font-semibold shadow-sm"
            disabled={isSubmitting || candidateAssignments.some((a) => !a.roleNeededId)}
          >
            {isSubmitting ? (
              <>
                <Star className="h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Assign {candidates.length} Candidate{candidates.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
