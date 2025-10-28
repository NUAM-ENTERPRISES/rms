import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  GraduationCap,
  Briefcase,
  Award,
  MapPin,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  className?: string;
}

export function EligibilityRequirements({
  eligibilityData,
  className = "",
}: EligibilityRequirementsProps) {
  const { isEligible, score, reasons, missingRequirements, detailedScores } =
    eligibilityData;

  const requirements = [
    {
      category: "Education",
      score: detailedScores.education,
      icon: GraduationCap,
      color: "blue",
      weight: 35,
    },
    {
      category: "Experience",
      score: detailedScores.experience,
      icon: Briefcase,
      color: "green",
      weight: 30,
    },
    {
      category: "Skills",
      score: detailedScores.skills,
      icon: Star,
      color: "purple",
      weight: 20,
    },
    {
      category: "Certifications",
      score: detailedScores.certifications,
      icon: Award,
      color: "orange",
      weight: 10,
    },
    {
      category: "Location",
      score: detailedScores.location,
      icon: MapPin,
      color: "red",
      weight: 5,
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <Card
      className={cn(
        "border-0 shadow-lg bg-white/80 backdrop-blur-sm",
        className
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isEligible ? "bg-green-100" : "bg-red-100"
            )}
          >
            {isEligible ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">Eligibility Requirements</h3>
            <p className="text-sm text-slate-600">
              {isEligible
                ? "Candidate meets all requirements"
                : "Some requirements not met"}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-3xl font-bold text-slate-900 mb-2">
            {Math.round(score)}%
          </div>
          <div className="text-sm text-slate-600 mb-3">Overall Match Score</div>
          <Progress value={score} className="h-2" />
        </div>

        {/* Detailed Requirements */}
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900">
            Requirement Breakdown
          </h4>
          {requirements.map((req) => {
            const Icon = req.icon;
            return (
              <div
                key={req.category}
                className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    getScoreBgColor(req.score)
                  )}
                >
                  <Icon className={cn("h-5 w-5", getScoreColor(req.score))} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900">
                      {req.category}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        getScoreColor(req.score)
                      )}
                    >
                      {Math.round(req.score)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={req.score} className="flex-1 h-2" />
                    <span className="text-xs text-slate-500">
                      ({req.weight}% weight)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reasons */}
        {reasons.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900">Match Reasons</h4>
            <div className="space-y-2">
              {reasons.map((reason, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-green-50 rounded-lg"
                >
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-green-800">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Requirements */}
        {missingRequirements.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900">
              Missing Requirements
            </h4>
            <div className="space-y-2">
              {missingRequirements.map((requirement, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-red-50 rounded-lg"
                >
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-800">{requirement}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge
            variant={isEligible ? "default" : "destructive"}
            className={cn(
              "px-4 py-2 text-sm font-medium",
              isEligible
                ? "bg-green-100 text-green-800 hover:bg-green-100"
                : "bg-red-100 text-red-800 hover:bg-red-100"
            )}
          >
            {isEligible ? "Eligible for Role" : "Not Eligible"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
