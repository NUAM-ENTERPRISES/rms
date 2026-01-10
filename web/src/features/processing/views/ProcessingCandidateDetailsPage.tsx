import { useNavigate, useParams } from "react-router-dom";
import { useGetCandidateProcessingDetailsQuery } from "@/features/processing/data/processing.endpoints";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  ProcessingCandidateHeader,
  CandidateInfoCard,
  ProjectInfoCard,
  AssignmentCard,
  ProcessingStepsCard,
  ProcessingHistoryModal,
  DocumentVerificationCard,
} from "./components";

export default function ProcessingCandidateDetailsPage() {
  const { candidateId: processingId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();

  const { data: apiResponse, isLoading, error } = useGetCandidateProcessingDetailsQuery(processingId || "", {
    skip: !processingId,
  });
  const data = apiResponse?.data;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-violet-400/20 animate-ping" />
            <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-600">Loading processing details...</p>
          <p className="text-sm text-slate-400">Please wait while we fetch the information</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 p-6">
        <Card className="w-full max-w-md text-center p-8 shadow-2xl border-0">
          <div className="h-20 w-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Oops!</h2>
          <p className="text-slate-500 mt-2">Could not retrieve processing details.</p>
          <p className="text-xs text-slate-400 mt-1">The record may not exist or you may not have permission to view it.</p>
          <Button 
            className="mt-6 w-full h-12 rounded-xl font-bold" 
            onClick={() => navigate("/processing-dashboard")}
          >
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const handleManageSteps = () => {
    // No-op kept for compatibility; feature removed but some callers or cached bundles
    // may still call this. Safe to keep as a no-op.
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header */}
        <ProcessingCandidateHeader
          candidate={data.candidate}
          project={data.project}
          role={data.role}
          processingStatus={data.processingStatus}
          processingId={data.id}
          recruiter={data.candidateProjectMap?.recruiter}
        />

        {/* Main Content Grid - More Compact */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
          {/* Left Column - Steps & Info (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Processing Steps - Main Focus */}
            <ProcessingStepsCard
              steps={[]}
              maxHeight="400px"
            />

            {/* Two column grid for Candidate & Project Info */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <CandidateInfoCard candidate={data.candidate} />
              <ProjectInfoCard
                project={data.project}
                role={data.role}
                mainStatus={data.candidateProjectMap?.mainStatus}
                subStatus={data.candidateProjectMap?.subStatus}
              />
            </div>
          </div>

          {/* Right Column - Assignment, Documents, Actions (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Assignment Info */}
            <AssignmentCard
              assignedTo={data.assignedTo}
              recruiter={data.candidateProjectMap?.recruiter}
              processingStatus={data.processingStatus}
            />

            {/* Document Verifications */}
            <DocumentVerificationCard
              verifications={data.candidateProjectMap?.documentVerifications || []}
              maxHeight="280px"
            />

            {/* History Modal Button + Quick Notes */}
            <div className="flex gap-3">
              <ProcessingHistoryModal history={data.history || []} />
              
              {data.notes && (
                <Card className="flex-1 border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-l-amber-400 p-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">
                    Notes
                  </h4>
                  <p className="text-xs text-amber-900 font-medium leading-relaxed line-clamp-3">
                    {data.notes}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
