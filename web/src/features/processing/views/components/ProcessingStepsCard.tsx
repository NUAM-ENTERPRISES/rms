import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  FileText,
  Stethoscope,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Plane,
  MessageSquare,
  Stamp,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlayCircle,
  Ban,
  ChevronRight,
  FileCheck,
  Database,
  Award,
  BookCheck,
  Building2,
  FileSignature,
  Heart,
  Fingerprint,
  ScrollText,
  Ticket,
} from "lucide-react";

// Define the 12 Processing Steps (Updated)
export const PROCESSING_STEPS = [
  {
    key: "offer_letter",
    label: "Offer Letter",
    description: "Issue offer letter to candidate",
    icon: FileText,
  },
  {
    key: "hrd",
    label: "HRD",
    description: "Human Resource Development attestation",
    icon: FileCheck,
  },
  {
    key: "data_flow",
    label: "Data Flow",
    description: "Data flow verification process",
    icon: Database,
  },
  {
    key: "eligibility",
    label: "Eligibility",
    description: "Check candidate eligibility",
    icon: Award,
  },
  {
    key: "prometric",
    label: "Prometric",
    description: "Prometric exam scheduling",
    icon: BookCheck,
  },
  {
    key: "council_registration",
    label: "Council Registration",
    description: "Country-wise council registration",
    icon: Building2,
  },
  {
    key: "document_attestation",
    label: "Document Attestation",
    description: "Attest required documents",
    icon: FileSignature,
  },
  {
    key: "medical",
    label: "Medical",
    description: "Medical examination & reports",
    icon: Heart,
    hasSubSteps: true,
    subSteps: [
      { key: "mofa_number", label: "MOFA Number", description: "Obtain MOFA number" },
      { key: "medical_fitness", label: "Medical Fitness Report", description: "Get fitness certificate" },
    ],
  },
  {
    key: "biometrics",
    label: "Biometrics",
    description: "Biometric data collection",
    icon: Fingerprint,
  },
  {
    key: "visa",
    label: "Visa",
    description: "Visa application & processing",
    icon: Stamp,
  },
  {
    key: "emigration",
    label: "Emigration",
    description: "Emigration clearance",
    icon: ScrollText,
  },
  {
    key: "ticket",
    label: "Ticket",
    description: "Flight booking & departure",
    icon: Ticket,
  },
];

export type ProcessingStepStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "not_applicable";

interface ProcessingStep {
  key: string;
  status: ProcessingStepStatus;
  notes?: string;
  updatedAt?: string;
  subSteps?: {
    key: string;
    status: ProcessingStepStatus;
    notes?: string;
  }[];
}

interface ProcessingStepsCardProps {
  steps?: ProcessingStep[];
  maxHeight?: string;
}

export function ProcessingStepsCard({
  steps = [],
  maxHeight = "500px",
}: ProcessingStepsCardProps) {
  const [openStepKey, setOpenStepKey] = useState<string | null>(null);

  const mergedSteps = PROCESSING_STEPS.map((stepDef) => {
    const actualStep = steps.find((s) => s.key === stepDef.key);
    return {
      ...stepDef,
      status: (actualStep?.status || "not_started") as ProcessingStepStatus,
      notes: actualStep?.notes,
      updatedAt: actualStep?.updatedAt,
      subStepStatuses: stepDef.hasSubSteps
        ? stepDef.subSteps?.map((sub) => {
            const actualSub = actualStep?.subSteps?.find((s) => s.key === sub.key);
            return {
              ...sub,
              status: (actualSub?.status || "not_started") as ProcessingStepStatus,
            };
          })
        : undefined,
    };
  });

  const completedCount = mergedSteps.filter((s) => s.status === "completed").length;
  const inProgressCount = mergedSteps.filter((s) => s.status === "in_progress").length;
  const totalSteps = mergedSteps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  const getStatusConfig = (status: ProcessingStepStatus) => {
    const config: Record<
      ProcessingStepStatus,
      { color: string; bg: string; icon: typeof CheckCircle2; label: string }
    > = {
      completed: {
        color: "text-emerald-600",
        bg: "bg-emerald-100",
        icon: CheckCircle2,
        label: "Done",
      },
      in_progress: {
        color: "text-blue-600",
        bg: "bg-blue-100",
        icon: PlayCircle,
        label: "Active",
      },
      on_hold: {
        color: "text-amber-600",
        bg: "bg-amber-100",
        icon: AlertCircle,
        label: "Hold",
      },
      not_applicable: {
        color: "text-slate-400",
        bg: "bg-slate-100",
        icon: Ban,
        label: "N/A",
      },
      not_started: {
        color: "text-slate-400",
        bg: "bg-slate-50",
        icon: Clock,
        label: "Pending",
      },
    };
    return config[status];
  };

  return (
    <Card className="border-0 shadow-xl overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Processing Steps
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-white/70">{completedCount}</span>
              <div className="h-2 w-2 rounded-full bg-blue-400 ml-2" />
              <span className="text-white/70">{inProgressCount}</span>
              <div className="h-2 w-2 rounded-full bg-slate-400 ml-2" />
              <span className="text-white/70">{totalSteps - completedCount - inProgressCount}</span>
            </div>
            <div className="h-10 w-10 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10">
              <span className="text-sm font-black">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div 
          className="overflow-auto scrollbar-thin scrollbar-thumb-slate-200"
          style={{ maxHeight }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Left Column */}
            <div className="divide-y divide-slate-100">
              {mergedSteps.slice(0, 6).map((step, index) => (
                <StepItem key={step.key} step={step} index={index} getStatusConfig={getStatusConfig} onOpen={() => setOpenStepKey(step.key)} />
              ))}
            </div>
            {/* Right Column */}
            <div className="divide-y divide-slate-100">
              {mergedSteps.slice(6, 12).map((step, index) => (
                <StepItem key={step.key} step={step} index={index + 6} getStatusConfig={getStatusConfig} onOpen={() => setOpenStepKey(step.key)} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Step Details Dialog */}
      <Dialog open={!!openStepKey} onOpenChange={(isOpen) => { if (!isOpen) setOpenStepKey(null); }}>
        <DialogContent className="sm:max-w-lg">
          {openStepKey && (() => {
            const selected = mergedSteps.find((s) => s.key === openStepKey);
            if (!selected) return null;
            const SelectedIcon = selected.icon as any;
            const statusCfg = getStatusConfig(selected.status);
            return (
              <div>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <SelectedIcon className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="flex-1">
                      <DialogTitle className="text-lg font-bold text-slate-900">{selected.label}</DialogTitle>
                      <DialogDescription className="text-sm text-slate-500">{selected.description}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="mt-4 text-sm text-slate-700">
                  <p className="font-semibold">Status: <span className={`ml-2 px-2 py-0.5 rounded ${statusCfg.bg} ${statusCfg.color} text-[10px] uppercase`}>{statusCfg.label}</span></p>

                  {selected.notes && (
                    <div className="mt-3">
                      <p className="font-semibold text-sm">Notes</p>
                      <p className="text-sm text-slate-600 mt-1">{selected.notes}</p>
                    </div>
                  )}

                  {selected.updatedAt && (
                    <p className="mt-3 text-xs text-slate-400">Updated: {selected.updatedAt}</p>
                  )}

                  {selected.subStepStatuses && (
                    <div className="mt-4">
                      <h4 className="font-bold text-sm mb-2">Sub-steps</h4>
                      <div className="space-y-2">
                        {selected.subStepStatuses.map((ss) => (
                          <div key={ss.key} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                            <div className="text-sm font-medium">{ss.label}</div>
                            <div className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">{getStatusConfig(ss.status).label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setOpenStepKey(null)}>Close</Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StepItem({
  step,
  index,
  getStatusConfig,
  onOpen,
}: {
  step: {
    key: string;
    label: string;
    description: string;
    icon: typeof CheckCircle2;
    status: ProcessingStepStatus;
    notes?: string;
    updatedAt?: string;
    hasSubSteps?: boolean;
    subStepStatuses?: {
      key: string;
      label: string;
      description: string;
      status: ProcessingStepStatus;
    }[];
  };
  index: number;
  onOpen?: () => void;
  getStatusConfig: (status: ProcessingStepStatus) => {
    color: string;
    bg: string;
    icon: typeof CheckCircle2;
    label: string;
  };
}) {
  const StatusIcon = step.icon;
  const statusConfig = getStatusConfig(step.status);

  // Check if this is the Medical step with sub-steps
  if (step.hasSubSteps && step.subStepStatuses) {
    return (
      <div className={`${step.status === "completed" ? "bg-emerald-50/50" : ""}`}>
        {/* Main Step Header */}
        <div className="flex items-center gap-3 p-3 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-pink-50">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              step.status === "completed"
                ? "bg-emerald-100 text-emerald-600"
                : step.status === "in_progress"
                ? "bg-blue-100 text-blue-600"
                : "bg-rose-100 text-rose-500"
            }`}
          >
            {step.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-sm text-rose-700">{step.label}</h4>
            <p className="text-xs text-rose-400">{step.description}</p>
          </div>

          {/* Eye button to view step details */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen && onOpen();
            }}
            aria-label={`View ${step.label} details`}
            className="p-1 rounded hover:bg-rose-100/80 ml-2"
          >
            <Eye className="h-4 w-4 text-rose-600" />
          </button>

          <Badge className="text-[9px] uppercase font-black tracking-wider shrink-0 border-0 px-2 py-0.5 bg-rose-100 text-rose-600">
            {statusConfig.label}
          </Badge>
        </div>

        {/* Sub-steps */}
        <div className="pl-6 bg-gradient-to-r from-rose-50/50 to-transparent">
          {step.subStepStatuses.map((subStep, subIndex) => {
            const subConfig = getStatusConfig(subStep.status);
            return (
              <div
                key={subStep.key}
                className="flex items-center gap-3 py-2 px-3 border-b border-rose-100/50 last:border-b-0 hover:bg-rose-50/50 transition-colors"
              >
                <div className="h-5 w-5 rounded-md bg-white border border-rose-200 flex items-center justify-center text-[10px] font-bold text-rose-400">
                  {String.fromCharCode(97 + subIndex)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs text-slate-700">{subStep.label}</p>
                </div>
                <Badge
                  className={`text-[8px] uppercase font-bold tracking-wider shrink-0 border-0 px-1.5 py-0 ${subConfig.bg} ${subConfig.color}`}
                >
                  {subConfig.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Regular step without sub-steps
  return (
    <div
      className={`flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors cursor-pointer group ${
        step.status === "completed" ? "bg-emerald-50/50" : ""
      }`}
    >
      {/* Step Number */}
      <div
        className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
          step.status === "completed"
            ? "bg-emerald-100 text-emerald-600"
            : step.status === "in_progress"
            ? "bg-blue-100 text-blue-600"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {step.status === "completed" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          index + 1
        )}
      </div>

      {/* Step Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-bold text-sm truncate ${
          step.status === "completed"
            ? "text-emerald-700"
            : step.status === "in_progress"
            ? "text-blue-700"
            : "text-slate-700"
        }`}>
          {step.label}
        </h4>
        <p className="text-xs text-slate-400 truncate">{step.description}</p>
      </div>

      {/* Status */}
      {/* View details button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpen && onOpen();
        }}
        aria-label={`View ${step.label} details`}
        className="p-1 rounded hover:bg-slate-100 ml-2"
      >
        <Eye className="h-4 w-4 text-slate-600" />
      </button>

      <Badge
        className={`text-[9px] uppercase font-black tracking-wider shrink-0 border-0 px-2 py-0.5 ${statusConfig.bg} ${statusConfig.color}`}
      >
        {statusConfig.label}
      </Badge>
    </div>
  );
}
