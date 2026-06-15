import { useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCan } from "@/hooks/useCan";
import { SelectedCandidateSummary } from "@/features/original-document-collections/components/SelectedCandidateSummary";
import { useGetCandidateCourierPipelineQuery } from "../api";
import { CandidateCourierPipeline } from "../components/CandidateCourierPipeline";

export default function CandidateCourierPipelinePage() {
  const { candidateId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const highlightLegId = searchParams.get("leg");
  const navigate = useNavigate();
  const canWrite = useCan("write:documents");

  const { data, isLoading } = useGetCandidateCourierPipelineQuery(
    candidateId,
    { skip: !candidateId },
  );

  const pipeline = data?.data;
  const progress =
    pipeline && pipeline.totalLegs > 0
      ? Math.round((pipeline.receivedLegs / pipeline.totalLegs) * 100)
      : 0;

  useEffect(() => {
    if (!highlightLegId || isLoading) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`courier-leg-${highlightLegId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [highlightLegId, isLoading, pipeline?.legs.length]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 pb-24">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/courier-management" aria-label="Back to courier register">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Candidate Courier Details</h1>
          <p className="text-sm text-muted-foreground">
            Profile and courier movement history
          </p>
        </div>
      </div>

      <SelectedCandidateSummary
        candidateId={candidateId}
        subtitle="Courier candidate profile"
        showMailingAddress
      />

      <div className="flex flex-wrap items-center gap-2">
        {pipeline?.currentLocationHint && (
          <Badge className="gap-1 border-teal-200 bg-teal-50 text-teal-800">
            <MapPin className="h-3 w-3" />
            Currently at: {pipeline.currentLocationHint}
          </Badge>
        )}
        <Badge variant="outline">
          {pipeline?.receivedLegs ?? 0}/{pipeline?.totalLegs ?? 0} legs received
          ({progress}%)
        </Badge>
        <Badge variant="secondary">
          {pipeline?.totalLegs ?? 0} total leg
          {(pipeline?.totalLegs ?? 0) !== 1 ? "s" : ""}
        </Badge>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Courier history</h2>
            <p className="text-sm text-muted-foreground">
              Latest movement shown first
            </p>
          </div>
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                navigate(`/courier-management/new?candidateId=${candidateId}`)
              }
            >
              <Plus className="h-4 w-4" />
              New leg
            </Button>
          )}
        </div>

        <CandidateCourierPipeline
          legs={pipeline?.legs ?? []}
          variant="full"
          order="newest-first"
          showLegActions
          highlightLegId={highlightLegId}
          onAddLeg={
            canWrite
              ? () =>
                  navigate(
                    `/courier-management/new?candidateId=${candidateId}`,
                  )
              : undefined
          }
        />
      </section>

      {canWrite && (
        <Button
          className="fixed bottom-6 right-6 h-12 gap-2 rounded-full px-5 shadow-lg"
          onClick={() =>
            navigate(`/courier-management/new?candidateId=${candidateId}`)
          }
        >
          <Plus className="h-5 w-5" />
          Add next leg
        </Button>
      )}
    </div>
  );
}
