import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FlagIcon } from "@/shared";
import type { GccCoverageSummary } from "../api/countryCoverageApi";

interface GccCoverageCardProps {
  gcc: GccCoverageSummary;
}

export function GccCoverageCard({ gcc }: GccCoverageCardProps) {
  return (
    <Link
      to="/admin/country-coverage/GCC"
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
      aria-label="View users covering GCC"
    >
      <Card className="h-full overflow-hidden border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50/40 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-lg font-semibold text-foreground">GCC</p>
              <div className="flex flex-wrap gap-1.5">
                {gcc.countryCodes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-white px-2 py-0.5 text-xs font-medium text-teal-800"
                  >
                    <FlagIcon countryCode={code} size="sm" />
                    {code}
                  </span>
                ))}
              </div>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 bg-teal-50 text-teal-700 border-teal-200"
            >
              GCC
            </Badge>
          </div>

          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight text-indigo-700">
              {gcc.userCount}
            </span>
            <span className="mb-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {gcc.userCount === 1 ? "user" : "users"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              Healthcare: {gcc.healthcareCount}
            </Badge>
            <Badge
              variant="outline"
              className="bg-sky-50 text-sky-700 border-sky-200"
            >
              Non-healthcare: {gcc.nonHealthcareCount}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
