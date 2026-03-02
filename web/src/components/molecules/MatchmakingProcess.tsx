import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  User,
  Building,
  Target,
  TrendingUp,
  Clock,
  Trophy,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

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
  const { theme } = useTheme();
  const { candidate, project, matchmakingSteps, overallScore, isEligible } = matchmakingData;

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
      case "Education": return "GraduationCap";
      case "Experience": return "Briefcase";
      case "Skills": return "Star";
      case "Certifications": return "Award";
      case "Location": return "MapPin";
      default: return "FileText";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={cn("relative", className)}
    >
      <Card 
        className={cn(
          "relative overflow-hidden border-0 shadow-2xl rounded-3xl backdrop-blur-2xl",
          theme === "dark"
            ? "bg-slate-950/95"
            : "bg-white/90"
        )}
      >
        {/* Floating Glow Orbs - adjusted for dark mode */}
        <div className={cn(
          "absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none",
          theme === "dark"
            ? "bg-gradient-to-br from-violet-600/10 to-transparent"
            : "bg-gradient-to-br from-violet-400/20 to-transparent"
        )} />
        <div className={cn(
          "absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none",
          theme === "dark"
            ? "bg-gradient-to-tl from-emerald-600/10 to-transparent"
            : "bg-gradient-to-tl from-emerald-400/20 to-transparent"
        )} />

        <CardHeader className="relative pb-8">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex items-center gap-5"
            >
              <div className={cn(
                "w-13 h-13 rounded-3xl p-1 shadow-2xl",
                theme === "dark"
                  ? "bg-gradient-to-br from-violet-700 to-purple-800"
                  : "bg-gradient-to-br from-violet-600 to-purple-700"
              )}>
                <div className={cn(
                  "w-full h-full rounded-3xl backdrop-blur flex items-center justify-center",
                  theme === "dark" ? "bg-slate-900/70" : "bg-white/90"
                )}>
                  <Handshake className={cn(
                    "w-5 h-5",
                    theme === "dark" ? "text-violet-300" : "text-purple-600"
                  )} />
                </div>
              </div>
              <div>
                <h3 className={cn(
                  "text-2xl font-bold",
                  theme === "dark" ? "text-slate-100" : "text-slate-800"
                )}>
                  Matchmaking Process
                </h3>
                <p className={cn(
                  "text-lg font-medium mt-1",
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                )}>
                  How <span className={cn(theme === "dark" ? "text-violet-400" : "text-violet-600")}>{candidate.name}</span> became eligible
                </p>
              </div>
            </motion.div>

            {/* Epic Score Ring */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="relative"
            >
              <div className="w-20 h-20 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
                  <circle 
                    cx="72" 
                    cy="72" 
                    r="64" 
                    stroke={theme === "dark" ? "#334155" : "#e2e8f0"} 
                    strokeWidth="12" 
                    fill="none" 
                  />
                  <motion.circle
                    cx="72"
                    cy="72"
                    r="64"
                    stroke="url(#ringGradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray="402"
                    initial={{ strokeDashoffset: 402 }}
                    animate={{ strokeDashoffset: 402 - (overallScore / 100) * 402 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={theme === "dark" ? "#34d399" : "#10b981"} />
                      <stop offset="100%" stopColor={theme === "dark" ? "#22d3ee" : "#06b6d4"} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn(
                    "text-1xl font-black",
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  )}>
                    {Math.round(overallScore)}%
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    theme === "dark" ? "text-slate-400" : "text-slate-900"
                  )}>
                    Match
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 px-8 pb-10">
          {/* Overall Score */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "text-center p-4 rounded-2xl border shadow-lg",
              theme === "dark"
                ? "bg-slate-900/60 border-slate-700/50"
                : "bg-gradient-to-br from-violet-50 via-blue-50 to-emerald-50 border-white/60"
            )}
          >
            <div className="flex items-center justify-center gap-4">
              <div className={cn(
                "text-3xl font-black tabular-nums",
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              )}>
                {Math.round(overallScore)}%
              </div>

              <Badge
                className={cn(
                  "px-4 py-1.5 text-sm font-bold rounded-full shadow-md",
                  isEligible
                    ? theme === "dark"
                      ? "bg-gradient-to-r from-emerald-700 to-teal-800 text-white"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                    : theme === "dark"
                    ? "bg-gradient-to-r from-rose-700 to-red-800 text-white"
                    : "bg-gradient-to-r from-rose-500 to-red-600 text-white"
                )}
              >
                {isEligible ? "Matched" : "Not Matched"}
              </Badge>
            </div>

            <p className={cn(
              "text-xs mt-2 mb-1.5",
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            )}>
              Overall Match Score
            </p>
            <Progress
              value={overallScore}
              className={cn(
                "h-1.5 rounded-full",
                theme === "dark" ? "bg-slate-800" : ""
              )}
              indicatorClassName={cn(
                "rounded-full",
                theme === "dark"
                  ? "bg-gradient-to-r from-violet-500 to-emerald-500"
                  : "bg-gradient-to-r from-violet-600 to-emerald-600"
              )}
            />
          </motion.div>

          {/* Candidate vs Project */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className={cn(
                "p-6 backdrop-blur border rounded-2xl shadow-xl",
                theme === "dark"
                  ? "bg-slate-900/60 border-slate-700/60"
                  : "bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-white/50"
              )}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className={cn(
                  "p-3 rounded-2xl shadow-lg",
                  theme === "dark"
                    ? "bg-gradient-to-br from-blue-700 to-indigo-800"
                    : "bg-gradient-to-br from-blue-500 to-indigo-600"
                )}>
                  <User className="h-7 w-7 text-white" />
                </div>
                <h4 className={cn(
                  "text-xl font-bold",
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                )}>
                  Candidate Profile
                </h4>
              </div>
              <div className="space-y-4 text-base font-small">
                <div className="flex justify-between">
                  <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Name</span>
                  <span className={theme === "dark" ? "text-slate-200" : ""}>{candidate.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Experience</span>
                  <span className={cn(theme === "dark" ? "text-emerald-400" : "text-emerald-600")}>
                    {candidate.experience} years
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Qualifications</span>
                  <Badge className={cn(
                    theme === "dark"
                      ? "bg-indigo-900/60 text-indigo-300"
                      : "bg-indigo-100 text-indigo-700"
                  )}>
                    {candidate.qualifications?.length || 0}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Skills</span>
                  <Badge className={cn(
                    theme === "dark"
                      ? "bg-purple-900/60 text-purple-300"
                      : "bg-purple-100 text-purple-700"
                  )}>
                    {candidate.skills?.length || 0}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Certifications</span>
                  <Badge className={cn(
                    theme === "dark"
                      ? "bg-amber-900/60 text-amber-300"
                      : "bg-amber-100 text-amber-700"
                  )}>
                    {candidate.certifications?.length || 0}
                  </Badge>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className={cn(
                "p-6 backdrop-blur border rounded-2xl shadow-xl",
                theme === "dark"
                  ? "bg-slate-900/60 border-slate-700/60"
                  : "bg-gradient-to-br from-purple-50/80 to-fuchsia-50/80 border-white/50"
              )}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className={cn(
                  "p-3 rounded-2xl shadow-lg",
                  theme === "dark"
                    ? "bg-gradient-to-br from-purple-700 to-fuchsia-800"
                    : "bg-gradient-to-br from-purple-500 to-fuchsia-600"
                )}>
                  <Building className="h-7 w-7 text-white" />
                </div>
                <h4 className={cn(
                  "text-xl font-bold",
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                )}>
                  Project Requirements
                </h4>
              </div>
              <div className="space-y-4 text-base font-small">
                <div className="flex justify-between">
                  <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Project</span>
                  <span className={cn(
                    "truncate max-w-[180px]",
                    theme === "dark" ? "text-slate-200" : ""
                  )}>
                    {project.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Roles Needed</span>
                  <Badge className={cn(
                    theme === "dark"
                      ? "bg-violet-900/60 text-violet-300"
                      : "bg-violet-100 text-violet-700"
                  )}>
                    {project.rolesNeeded?.length || 0}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Status</span>
                  <Badge className={cn(
                    theme === "dark"
                      ? "bg-emerald-900/60 text-emerald-300"
                      : "bg-emerald-100 text-emerald-700"
                  )}>
                    Active
                  </Badge>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Matching Analysis */}
          <div className="space-y-6">
            <motion.h4
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className={cn(
                "text-2xl font-bold text-center bg-gradient-to-r bg-clip-text text-transparent",
                theme === "dark"
                  ? "from-violet-400 to-emerald-400 text-transparent"
                  : "from-violet-600 to-emerald-600 text-transparent"
              )}
            >
              Matching Analysis
            </motion.h4>

            {matchmakingSteps.map((step, stepIndex) => (
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + stepIndex * 0.2 }}
                className={cn(
                  "rounded-3xl backdrop-blur border shadow-2xl overflow-hidden",
                  theme === "dark"
                    ? "bg-slate-900/70 border-slate-700/60"
                    : "bg-white/70 border-white/50"
                )}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-14 h-14 rounded-3xl flex items-center justify-center shadow-xl ring-8",
                        step.isEligible
                          ? theme === "dark"
                            ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-emerald-900/40"
                            : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-white/50"
                          : theme === "dark"
                          ? "bg-gradient-to-br from-rose-600 to-red-700 text-white ring-rose-900/40"
                          : "bg-gradient-to-br from-rose-500 to-red-600 text-white ring-white/50"
                      )}>
                        {step.isEligible ? <Trophy className="w-8 h-8" /> : <Target className="w-8 h-8" />}
                      </div>
                      <div>
                        <h5 className={cn(
                          "text-2 font-black",
                          theme === "dark" ? "text-slate-100" : "text-slate-900"
                        )}>
                          {step.role.designation}
                        </h5>
                        <p className={cn(
                          "text-sm",
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        )}>
                          Experience: {step.role.minExperience}–{step.role.maxExperience} years
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-3xl font-black",
                        theme === "dark" ? getScoreColor(step.score).replace("text-", "text-").replace("-600", "-400") : getScoreColor(step.score)
                      )}>
                        {Math.round(step.score)}%
                      </div>
                      <div className={cn(
                        "text-[14px]",
                        theme === "dark" ? "text-slate-500" : "text-slate-500"
                      )}>
                        Match Score
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {step.steps.map((detail, detailIndex) => (
                      <motion.div
                        key={detailIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + detailIndex * 0.08 }}
                        className={cn(
                          "group relative p-5 rounded-2xl border shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden",
                          theme === "dark"
                            ? "bg-slate-900/60 border-slate-700/60"
                            : "bg-white/70 backdrop-blur-md border-white/50"
                        )}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className={cn(
                            "text-lg font-bold",
                            theme === "dark" ? "text-slate-200" : "text-slate-800"
                          )}>
                            {detail.category}
                          </span>
                          <span className={cn(
                            "text-2xl font-black",
                            theme === "dark" 
                              ? getScoreColor(detail.score).replace("text-", "text-").replace("-600", "-400")
                              : getScoreColor(detail.score)
                          )}>
                            {Math.round(detail.score)}%
                          </span>
                        </div>

                        <p className={cn(
                          "text-sm mb-5 leading-relaxed",
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        )}>
                          {detail.details}
                        </p>

                        <div className="relative flex items-center gap-3">
                          <div className={cn(
                            "flex-1 h-3 rounded-full overflow-hidden",
                            theme === "dark" ? "bg-slate-800" : "bg-slate-200/70"
                          )}>
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                detail.score >= 80
                                  ? theme === "dark"
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                                    : "bg-gradient-to-r from-emerald-500 to-teal-600"
                                  : detail.score >= 60
                                  ? theme === "dark"
                                    ? "bg-gradient-to-r from-amber-500 to-orange-600"
                                    : "bg-gradient-to-r from-amber-500 to-orange-600"
                                  : theme === "dark"
                                  ? "bg-gradient-to-r from-rose-500 to-red-600"
                                  : "bg-gradient-to-r from-rose-500 to-red-600"
                              )}
                              style={{ width: `${detail.score}%` }}
                            />
                          </div>

                          <div className="flex-shrink-0">
                            {detail.isEligible ? (
                              <CheckCircle className={cn(
                                "w-8 h-8 drop-shadow-md",
                                theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                              )} />
                            ) : (
                              <XCircle className={cn(
                                "w-8 h-8 drop-shadow-md",
                                theme === "dark" ? "text-rose-400" : "text-rose-600"
                              )} />
                            )}
                          </div>
                        </div>

                        {/* Hover shine effect - adjusted opacity for dark mode */}
                        <div className="pointer-events-none absolute inset-0 rounded-2xl">
                          <div className={cn(
                            "absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000",
                            theme === "dark" && "via-white/10"
                          )} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Process Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="space-y-6"
          >
            <h4 className={cn(
              "text-2xl font-bold text-center bg-gradient-to-r bg-clip-text text-transparent",
              theme === "dark"
                ? "from-purple-400 to-blue-400"
                : "from-purple-600 to-blue-600"
            )}>
              Process Timeline
            </h4>
            <div className="space-y-4">
              {[
                { icon: Clock, color: "blue", title: "Initial Screening", desc: "Candidate profile analyzed against project requirements" },
                { icon: TrendingUp, color: "emerald", title: "Scoring Algorithm", desc: "Multi-factor scoring applied across all criteria" },
                { icon: Target, color: "purple", title: "Final Match", desc: isEligible ? "Candidate successfully matched to role" : "Candidate did not meet minimum requirements" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.6 + i * 0.2 }}
                  className={cn(
                    "flex items-center gap-5 p-6 rounded-2xl shadow-xl border backdrop-blur",
                    theme === "dark"
                      ? `bg-slate-900/60 border-slate-700/60`
                      : `bg-${item.color}-50/80 border-white/50`
                  )}
                >
                  <div className={cn(
                    "p-4 rounded-2xl shadow-lg",
                    theme === "dark"
                      ? `bg-gradient-to-br from-${item.color}-700 to-${item.color}-800`
                      : `bg-gradient-to-br from-${item.color}-500 to-${item.color}-600`
                  )}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className={cn(
                      "text-lg font-bold",
                      theme === "dark" ? "text-slate-100" : "text-slate-900"
                    )}>
                      {item.title}
                    </div>
                    <div className={cn(
                      "text-sm mt-1",
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    )}>
                      {item.desc}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}