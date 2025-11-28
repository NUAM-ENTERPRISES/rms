import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  GraduationCap, 
  Briefcase, 
  Star, 
  Award, 
  MapPin,
  Trophy,
  Target
} from "lucide-react";

interface EligibilityRequirementsProps {
  eligibilityData: {
    isEligible: boolean;
    score: number;
    reasons: string[];
    missingRequirements: string[];
    detailedScores: {
      education: number;
      experience: number;
      skills: number;
      certifications: number;
      location: number;
    };
  };
}

export function EligibilityRequirements({ eligibilityData }: EligibilityRequirementsProps) {
  const { isEligible, score, reasons, missingRequirements, detailedScores } = eligibilityData;

  const categories = [
    { name: "Education",      score: detailedScores.education,      icon: GraduationCap, color: "indigo" },
    { name: "Experience",     score: detailedScores.experience,     icon: Briefcase,     color: "emerald" },
    { name: "Skills",         score: detailedScores.skills,         icon: Star,          color: "violet" },
    { name: "Certifications", score: detailedScores.certifications, icon: Award,         color: "amber" },
    { name: "Location",       score: detailedScores.location,       icon: MapPin,        color: "rose" },
  ];

  const getGradient = (color: string) => {
    const map: Record<string, string> = {
      indigo: "from-indigo-500 to-indigo-600",
      emerald: "from-emerald-500 to-emerald-600",
      violet: "from-violet-500 to-violet-600",
      amber: "from-amber-500 to-orange-600",
      rose: "from-rose-500 to-pink-600",
    };
    return map[color] || "from-gray-500 to-gray-600";
  };

  return (
    <Card className="border-0 shadow-lg bg-white rounded-2xl overflow-hidden">
      {/* Compact Header */}
      <CardHeader className="pb-5 pt-6 bg-slate-50/70 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isEligible ? "bg-emerald-100" : "bg-rose-100"}`}>
              {isEligible ? (
                <Trophy className="h-6 w-6 text-emerald-600" />
              ) : (
                <Target className="h-6 w-6 text-rose-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">
                Eligibility Assessment
              </CardTitle>
              <p className="text-sm text-slate-600 mt-0.5">
                {isEligible ? "Meets requirements" : "Does not meet all criteria"}
              </p>
            </div>
          </div>

          {/* Score + Badge */}
          <div className="text-right">
            <div className="text-4xl font-bold text-slate-900">
              {Math.round(score)}<span className="text-2xl text-slate-600">%</span>
            </div>
            <Badge 
              variant="outline" 
              className={`mt-2 text-sm font-semibold px-4 py-1.5 ${
                isEligible 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                  : "bg-rose-50 text-rose-700 border-rose-300"
              }`}
            >
              {isEligible ? "Eligible" : "Not Eligible"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* Category Breakdown - Compact */}
        <div className="space-y-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const gradient = getGradient(cat.color);
            const scoreText = cat.score >= 80 ? "text-emerald-600" : cat.score >= 60 ? "text-amber-600" : "text-rose-600";
            const status = cat.score >= 80 ? "Strong" : cat.score >= 60 ? "Moderate" : "Needs Review";

            return (
              <div key={cat.name} className="flex items-center gap-4">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{cat.name}</span>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-lg ${scoreText}`}>
                        {cat.score}%
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {status}
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={cat.score} 
                    className="h-2"
                    indicatorClassName={`bg-gradient-to-r ${gradient}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Strengths & Gaps - Compact Grid */}
        {(reasons.length > 0 || missingRequirements.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t">
            {/* Strengths */}
            {reasons.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-emerald-700 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Strengths
                </h4>
                <div className="space-y-2">
                  {reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gaps */}
            {missingRequirements.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-rose-700 flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Gaps
                </h4>
                <div className="space-y-2">
                  {missingRequirements.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Final Summary */}
        <div className="pt-4 border-t text-center">
          <p className="text-base font-medium text-slate-900">
            {isEligible ? (
              <>Candidate is <span className="text-emerald-600 font-bold">eligible</span> to proceed</>
            ) : (
              <>Candidate is <span className="text-rose-600 font-bold">not eligible</span> at this time</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}