import { useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  MapPin,
  Package,
  Plus,
  Route,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import { SelectedCandidateSummary } from "@/features/original-document-collections/components/SelectedCandidateSummary";
import { useGetCandidateCourierPipelineQuery } from "../api";
import { CandidateCourierPipeline } from "../components/CandidateCourierPipeline";

export default function CandidateCourierPipelinePage() {
  const { candidateId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const highlightLegId = searchParams.get("leg");
  const navigate = useNavigate();
  const canWrite = useCan("write:courier_management");

  const { data, isLoading } = useGetCandidateCourierPipelineQuery(
    candidateId,
    { skip: !candidateId },
  );

  const pipeline = data?.data;
  const totalLegs = pipeline?.totalLegs ?? 0;
  const receivedLegs = pipeline?.receivedLegs ?? 0;
  const progress =
    totalLegs > 0 ? Math.round((receivedLegs / totalLegs) * 100) : 0;
  const inTransitLegs = Math.max(totalLegs - receivedLegs, 0);

  useEffect(() => {
    if (!highlightLegId || isLoading) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`courier-leg-${highlightLegId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [highlightLegId, isLoading, pipeline?.legs.length]);

  const handleAddLeg = () => {
    navigate(`/courier-management/new?candidateId=${candidateId}`);
  };

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm">Loading courier pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pb-24">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 px-0">
          <Link to="/courier-management" aria-label="Back to courier register">
            <ArrowLeft className="h-4 w-4" />
            Back to register
          </Link>
        </Button>

        <div className="overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-background to-background p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
                  <Truck className="h-5 w-5 text-teal-600" />
                </span>
                Candidate Courier Details
              </h1>
              <p className="text-sm text-muted-foreground">
                Profile and document movement history for this candidate
              </p>
            </div>
            {canWrite && (
              <Button
                className="gap-2 rounded-xl bg-teal-600 hover:bg-teal-700"
                onClick={handleAddLeg}
              >
                <Plus className="h-4 w-4" />
                New leg
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-teal-100 bg-gradient-to-br from-teal-50/60 to-background shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100">
              <Route className="h-5 w-5 text-teal-600" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total legs
              </p>
              <p className="text-2xl font-bold text-teal-700">{totalLegs}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-background shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Received
              </p>
              <p className="text-2xl font-bold text-emerald-700">
                {receivedLegs}
                <span className="ml-1 text-sm font-medium text-muted-foreground">
                  / {totalLegs}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/60 to-background shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <Package className="h-5 w-5 text-amber-600" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                In transit
              </p>
              <p className="text-2xl font-bold text-amber-700">{inTransitLegs}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3">
          <SelectedCandidateSummary
            candidateId={candidateId}
            subtitle="Courier candidate profile"
            showMailingAddress
          />

          <Card className="overflow-hidden border-teal-100 shadow-md">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <History className="h-4 w-4 text-white" />
                  </span>
                  <div>
                    <CardTitle className="text-sm font-semibold text-white">
                      Courier history
                    </CardTitle>
                    <CardDescription className="text-xs text-teal-100">
                      Latest movement shown first
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-white/20 bg-white/10 text-[11px] text-white hover:bg-white/10">
                    {totalLegs} leg{totalLegs !== 1 ? "s" : ""}
                  </Badge>
                  {inTransitLegs > 0 && (
                    <Badge className="border-amber-200/30 bg-amber-400/20 text-[11px] text-amber-50 hover:bg-amber-400/20">
                      {inTransitLegs} in transit
                    </Badge>
                  )}
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1.5 rounded-lg bg-white text-teal-700 hover:bg-teal-50"
                      onClick={handleAddLeg}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add leg
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {highlightLegId && (
              <div className="flex items-center gap-2 border-b border-teal-100 bg-teal-50/70 px-4 py-2 text-xs text-teal-800">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                Highlighting the leg you opened — scroll to view details below
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/10 px-4 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Timeline
              </span>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {receivedLegs} received
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  inTransitLegs > 0
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                <Clock className="mr-1 h-3 w-3" />
                {inTransitLegs} pending
              </Badge>
              {pipeline?.currentLocationHint && (
                <Badge
                  variant="outline"
                  className="ml-auto max-w-[220px] truncate border-teal-200 bg-teal-50 text-[10px] text-teal-700"
                >
                  <MapPin className="mr-1 h-3 w-3 shrink-0" />
                  {pipeline.currentLocationHint}
                </Badge>
              )}
            </div>

            <CardContent className="bg-gradient-to-b from-muted/10 to-background p-4 sm:p-5">
              <CandidateCourierPipeline
                legs={pipeline?.legs ?? []}
                variant="full"
                order="newest-first"
                showLegActions
                highlightLegId={highlightLegId}
                onAddLeg={canWrite ? handleAddLeg : undefined}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          <Card className="overflow-hidden border-teal-100 shadow-md">
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-50">
                Pipeline progress
              </p>
              <p className="mt-1 text-2xl font-bold text-white">{progress}%</p>
            </div>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Legs received</span>
                  <span className="font-medium">
                    {receivedLegs} / {totalLegs}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {pipeline?.currentLocationHint ? (
                <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Current location
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {pipeline.currentLocationHint}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-4 text-center">
                  <MapPin className="mx-auto mb-1.5 h-4 w-4 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    No active location hint
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  {receivedLegs} received
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    inTransitLegs > 0
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-border bg-muted/30 text-muted-foreground",
                  )}
                >
                  {inTransitLegs} in transit
                </Badge>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {canWrite && (
        <Button
          className="fixed bottom-6 right-6 z-20 h-12 gap-2 rounded-full bg-teal-600 px-5 shadow-lg hover:bg-teal-700"
          onClick={handleAddLeg}
        >
          <Plus className="h-5 w-5" />
          Add next leg
        </Button>
      )}
    </div>
  );
}
