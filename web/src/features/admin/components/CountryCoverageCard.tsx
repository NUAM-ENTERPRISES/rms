import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FlagWithName } from "@/shared";
import type { CountryCoverageSummaryItem } from "../api/countryCoverageApi";

interface CountryCoverageCardProps {
  country: CountryCoverageSummaryItem;
}

export function CountryCoverageCard({ country }: CountryCoverageCardProps) {
  return (
    <Link
      to={`/admin/country-coverage/${country.code}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
      aria-label={`View users covering ${country.name}`}
    >
      <Card className="h-full overflow-hidden border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <FlagWithName
              countryCode={country.code}
              countryName={country.name}
              showCode
              size="lg"
              className="min-w-0"
            />
          </div>

          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight text-indigo-700">
              {country.userCount}
            </span>
            <span className="mb-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {country.userCount === 1 ? "user" : "users"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              Healthcare: {country.healthcareCount}
            </Badge>
            <Badge
              variant="outline"
              className="bg-sky-50 text-sky-700 border-sky-200"
            >
              Non-healthcare: {country.nonHealthcareCount}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
