import React from "react";

const getMatchScoreColor = (score: number) => {
  if (score >= 90) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 70) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
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

const getPrimaryRoleMatch = (candidate: any) => {
  if (!candidate) return { designation: undefined, department: undefined, score: undefined };

  if (candidate.matchScore && typeof candidate.matchScore === "object" && candidate.matchScore.score !== undefined) {
    const ms = candidate.matchScore as any;
    return {
      designation: ms.roleName ?? ms.roleDepartmentLabel ?? ms.roleId,
      department: ms.roleDepartmentLabel ?? ms.roleDepartmentName ?? undefined,
      score: resolveNumericScore(ms),
    };
  }

  if (Array.isArray(candidate.roleMatches) && candidate.roleMatches.length > 0) {
    const sorted = [...candidate.roleMatches].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return { designation: sorted[0].designation, department: undefined, score: sorted[0].score };
  }

  if (candidate.nominatedRole) {
    return { designation: candidate.nominatedRole.designation, department: undefined, score: candidate.nominatedRole.score };
  }

  // numeric matchScore fallback
  if (typeof candidate.matchScore === "number") {
    return { designation: undefined, department: undefined, score: candidate.matchScore };
  }

  return { designation: undefined, department: undefined, score: undefined };
};

export default function MatchScoreSummary({ candidate }: { candidate?: any }) {
  const primary = getPrimaryRoleMatch(candidate);
  const numeric = primary.score ?? resolveNumericScore(candidate?.matchScore) ?? 0;

  if (!primary.designation && !numeric) {
    return null;
  }

  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
      <div className="flex items-center gap-3">
        <div className={`${getMatchScoreColor(numeric)} w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold`}>
          {numeric}%
        </div>

        <div className="flex-1 min-w-0">
          {primary.designation ? (
            <div>
              <div className="text-xs text-slate-500">Top match</div>
              <div className="text-sm font-semibold truncate">{primary.designation}</div>
              {primary.department && <div className="text-xs text-slate-400">{primary.department}</div>}
            </div>
          ) : (
            <div className="text-sm font-semibold">Match Score</div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
          <div className={`${getMatchScoreColor(numeric)} h-1 rounded-full`} style={{ width: `${numeric}%` }} />
        </div>
        <div className="text-xs text-slate-500 mt-1">{numeric}% match</div>
      </div>
    </div>
  );
}
