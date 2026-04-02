import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { projectNames, projectRolesData } from "../data/mockData";
import ProjectSelector from "./ProjectSelector";
import RoleHiringChart from "./RoleHiringChart";

export default function ProjectRoleHiringStatus() {
  const [selectedProject, setSelectedProject] = useState(projectNames[0]);
  const roles = projectRolesData[selectedProject] ?? [];

  const summary = useMemo(() => {
    const totalRequired = roles.reduce((s, r) => s + r.required, 0);
    const totalFilled = roles.reduce((s, r) => s + r.filled, 0);
    const completion =
      totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 0;
    return { totalRequired, totalFilled, completion };
  }, [roles]);

  return (
    <Card className="border-0 shadow-sm rounded-xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-slate-700">
          Project Role Hiring Status
        </CardTitle>
        <ProjectSelector
          value={selectedProject}
          onChange={setSelectedProject}
        />
      </CardHeader>

      <CardContent className="pt-2 space-y-4">
        {/* Summary strip */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Total Required:</span>
            <Badge variant="outline" className="font-semibold">
              {summary.totalRequired}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Total Filled:</span>
            <Badge
              variant="outline"
              className="font-semibold text-emerald-600 border-emerald-300"
            >
              {summary.totalFilled}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Completion:</span>
            <Badge
              variant="secondary"
              className={
                summary.completion >= 75
                  ? "bg-emerald-100 text-emerald-700"
                  : summary.completion >= 50
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }
            >
              {summary.completion}%
            </Badge>
          </div>
        </div>

        {/* Chart */}
        <RoleHiringChart roles={roles} />
      </CardContent>
    </Card>
  );
}
