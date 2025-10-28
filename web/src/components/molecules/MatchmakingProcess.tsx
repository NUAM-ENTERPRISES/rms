import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  User,
  Building,
  Target,
  TrendingUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchmakingProcessProps {
  matchmakingData: {
    candidate: {
      id: string;
      name: string;
      experience: number;
      qualifications: any[];
      workExperiences: any[];
      skills: any[];
      certifications: any[];
    };
    project: {
      id: string;
      title: string;
      rolesNeeded: any[];
    };
    matchmakingSteps: Array<{
      role: {
        id: string;
        designation: string;
        minExperience: number;
        maxExperience: number;
      };
      steps: Array<{
        category: string;
        score: number;
        isEligible: boolean;
        details: string;
        requirements?: any[];
        candidateQualifications?: any[];
        candidateExperience?: number;
        requiredExperience?: { min: number; max: number };
        candidateSkills?: any[];
        requiredSkills?: any[];
        candidateCertifications?: any[];
        requiredCertifications?: any[];
      }>;
      score: number;
      isEligible: boolean;
    }>;
    overallScore: number;
    isEligible: boolean;
  };
  className?: string;
}

export function MatchmakingProcess({
  matchmakingData,
  className = "",
}: MatchmakingProcessProps) {
  const { candidate, project, matchmakingSteps, overallScore, isEligible } =
    matchmakingData;

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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Education":
        return "🎓";
      case "Experience":
        return "💼";
      case "Skills":
        return "⭐";
      case "Certifications":
        return "🏆";
      case "Location":
        return "📍";
      default:
        return "📋";
    }
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
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Matchmaking Process</h3>
            <p className="text-sm text-slate-600">
              How {candidate.name} became eligible for this role
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Process Score */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="text-3xl font-bold text-slate-900 mb-2">
            {Math.round(overallScore)}%
          </div>
          <div className="text-sm text-slate-600 mb-3">Overall Match Score</div>
          <Progress value={overallScore} className="h-3" />
          <div className="mt-3">
            <Badge
              variant={isEligible ? "default" : "destructive"}
              className={cn(
                "px-4 py-2 text-sm font-medium",
                isEligible
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-red-100 text-red-800 hover:bg-red-100"
              )}
            >
              {isEligible ? "Successfully Matched" : "Match Failed"}
            </Badge>
          </div>
        </div>

        {/* Candidate vs Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-slate-900">
                Candidate Profile
              </h4>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Name:</strong> {candidate.name}
              </div>
              <div>
                <strong>Experience:</strong> {candidate.experience} years
              </div>
              <div>
                <strong>Qualifications:</strong>{" "}
                {candidate.qualifications?.length || 0}
              </div>
              <div>
                <strong>Skills:</strong> {candidate.skills?.length || 0}
              </div>
              <div>
                <strong>Certifications:</strong>{" "}
                {candidate.certifications?.length || 0}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Building className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-slate-900">
                Project Requirements
              </h4>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Project:</strong> {project.title}
              </div>
              <div>
                <strong>Roles Needed:</strong>{" "}
                {project.rolesNeeded?.length || 0}
              </div>
              <div>
                <strong>Available Positions:</strong> Multiple
              </div>
            </div>
          </div>
        </div>

        {/* Matchmaking Steps */}
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900">Matching Analysis</h4>
          {matchmakingSteps.map((step, stepIndex) => (
            <div
              key={stepIndex}
              className="border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      step.isEligible ? "bg-green-100" : "bg-red-100"
                    )}
                  >
                    {step.isEligible ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900">
                      {step.role.designation}
                    </h5>
                    <p className="text-sm text-slate-600">
                      Experience: {step.role.minExperience}-
                      {step.role.maxExperience} years
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      "text-lg font-bold",
                      getScoreColor(step.score)
                    )}
                  >
                    {Math.round(step.score)}%
                  </div>
                  <div className="text-xs text-slate-500">Match Score</div>
                </div>
              </div>

              <div className="space-y-3">
                {step.steps.map((detail, detailIndex) => (
                  <div
                    key={detailIndex}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="text-2xl">
                      {getCategoryIcon(detail.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900">
                          {detail.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              getScoreColor(detail.score)
                            )}
                          >
                            {Math.round(detail.score)}%
                          </span>
                          {detail.isEligible ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {detail.details}
                      </p>
                      <Progress value={detail.score} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Process Timeline */}
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900">Process Timeline</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-slate-900">
                  Initial Screening
                </div>
                <div className="text-sm text-slate-600">
                  Candidate profile analyzed against project requirements
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-slate-900">
                  Scoring Algorithm
                </div>
                <div className="text-sm text-slate-600">
                  Multi-factor scoring applied across all criteria
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Target className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-medium text-slate-900">Final Match</div>
                <div className="text-sm text-slate-600">
                  {isEligible
                    ? "Candidate successfully matched to role"
                    : "Candidate did not meet minimum requirements"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
