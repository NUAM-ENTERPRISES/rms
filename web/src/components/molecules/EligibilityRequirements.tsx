import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  GraduationCap,
  Briefcase,
  Award,
  MapPin,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  const { isEligible, score, reasons, missingRequirements, detailedScores } = eligibilityData;

  const requirements = [
    { category: "Education",       score: detailedScores.education,       icon: GraduationCap, gradient: "from-indigo-500 to-blue-600",   weight: 35 },
    { category: "Experience",      score: detailedScores.experience,      icon: Briefcase,     gradient: "from-emerald-500 to-teal-600",  weight: 30 },
    { category: "Skills",          score: detailedScores.skills,          icon: Star,          gradient: "from-violet-500 to-purple-600", weight: 20 },
    { category: "Certifications",  score: detailedScores.certifications,  icon: Award,         gradient: "from-amber-500 to-orange-600",  weight: 10 },
    { category: "Location",        score: detailedScores.location,        icon: MapPin,        gradient: "from-rose-500 to-pink-600",     weight: 5  },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card className={cn(
        "relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white/95 via-white/90 to-slate-50/80 backdrop-blur-2xl rounded-3xl",
        "before:absolute before:inset-0 before:bg-gradient-to-t before:from-transparent before:via-white/40 before:to-transparent before:pointer-events-none",
        className
      )}>
        {/* Floating Orbs */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-gradient-to-br from-violet-400/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-gradient-to-tr from-emerald-400/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <CardHeader className="relative pb-6">
          <div className="flex items-start justify-between gap-6">
            {/* Left: Title + Status */}
            <div className="flex items-center gap-5">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className={cn(
                  "w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl ring-8 ring-white/50",
                  isEligible
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    : "bg-gradient-to-br from-rose-500 to-red-600 text-white"
                )}
              >
                {isEligible ? <Trophy className="w-11 h-11" /> : <Zap className="w-11 h-11" />}
              </motion.div>

              <div>
                <h3 className="text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Eligibility Result
                </h3>
                <p className="text-lg font-medium text-slate-600 mt-1">
                  {isEligible ? "Candidate is a perfect match" : "Review recommended"}
                </p>
              </div>
            </div>

            {/* Epic Score Circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="10" fill="none"
                    className="text-slate-200" />
                  <circle cx="50" cy="50" r="44" stroke="url(#gradient)" strokeWidth="10" fill="none"
                    strokeDasharray={`${score * 2.76} 276`}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-slate-900">
                    {Math.round(score)}
                    <span className="text-3xl">%</span>
                  </span>
                  <span className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">
                    Match Score
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 px-8 pb-8">
          {/* Requirement Bars – Ultra Premium */}
          <div className="space-y-5">
            {requirements.map((req, i) => {
              const Icon = req.icon;
              return (
                <motion.div
                  key={req.category}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative"
                >
                  <div className="flex items-center gap-5 p-5 rounded-2xl bg-white/70 backdrop-blur border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br p-0.5 shadow-lg", req.gradient)}>
                      <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-slate-800">{req.category}</span>
                        <span className="text-2xl font-black text-slate-900">
                          {Math.round(req.score)}%
                        </span>
                      </div>
                      <Progress
                        value={req.score}
                        className="h-4 rounded-full bg-slate-200"
                        indicatorClassName={cn("rounded-full", req.gradient)}
                      />
                      <div className="flex justify-between mt-2 text-sm">
                        <span className="font-medium text-slate-600">{req.weight}% of total score</span>
                        <span className={cn(
                          "font-bold",
                          req.score >= 80 ? "text-emerald-600" : req.score >= 60 ? "text-amber-600" : "text-rose-600"
                        )}>
                          {req.score >= 80 ? "Excellent" : req.score >= 60 ? "Good" : "Needs Work"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Shine */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000" />
                </motion.div>
              );
            })}
          </div>

          {/* Strengths & Gaps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reasons.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <h4 className="text-xl font-bold text-emerald-700 mb-4 flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7" />
                  Key Strengths
                </h4>
                <div className="space-y-3">
                  {reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 bg-emerald-50/80 backdrop-blur rounded-2xl border border-emerald-200/50">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-base font-medium text-emerald-900 leading-relaxed">{r}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {missingRequirements.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <h4 className="text-xl font-bold text-rose-700 mb-4 flex items-center gap-3">
                  <AlertCircle className="w-7 h-7" />
                  Areas to Improve
                </h4>
                <div className="space-y-3">
                  {missingRequirements.map((r, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 bg-rose-50/80 backdrop-blur rounded-2xl border border-rose-200/50">
                      <XCircle className="w-6 h-6 text-rose-600 mt-0.5 flex-shrink-0" />
                      <span className="text-base font-medium text-rose-900 leading-relaxed">{r}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Final Verdict */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
            className="text-center pt-6"
          >
            <Badge className={cn(
              "px-10 py-5 text-2xl font-black rounded-full shadow-2xl",
              isEligible
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
                : "bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700"
            )}>
              {isEligible ? "Fully Eligible – Highly Recommended" : "Not Eligible – Further Review Needed"}
            </Badge>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}