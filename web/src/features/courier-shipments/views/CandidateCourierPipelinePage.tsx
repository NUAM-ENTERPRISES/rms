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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import { useGetCandidateByIdQuery } from "@/features/candidates/api";
import { SelectedCandidateSummary } from "@/features/original-document-collections/components/SelectedCandidateSummary";
import { useGetCandidateCourierPipelineQuery } from "../api";
import { CandidateCourierPipeline } from "../components/CandidateCourierPipeline";
import { CourierPipelineProgressCard } from "../components/CourierPipelineProgressCard";

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

  const { data: candidate } = useGetCandidateByIdQuery(candidateId, {
    skip: !candidateId,
  });

  const pipeline = data?.data;
  const candidateName =
    candidate?.name?.trim() ||
    [candidate?.firstName, candidate?.lastName].filter(Boolean).join(" ") ||
    "Candidate";
  const candidateInitials =
    `${candidate?.firstName?.charAt(0) ?? ""}${candidate?.lastName?.charAt(0) ?? ""}`.toUpperCase() ||
    "?";
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

        <div className="relative overflow-hidden rounded-xl border border-teal-200/60 shadow-sm">
          <span
            className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-teal-400/20 blur-2xl"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-emerald-400/15 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative bg-gradient-to-br from-slate-950 via-teal-950 to-emerald-950 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar className="relative h-10 w-10 border border-white/20 shadow-sm">
                    <AvatarImage
                      src={candidate?.profileImage || undefined}
                      alt={candidateName}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-[10px] font-semibold text-white">
                      {candidateInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-md border border-white/20 bg-teal-600 text-white">
                    <Truck className="h-2.5 w-2.5" aria-hidden="true" />
                  </span>
                </div>

                <div className="min-w-0 space-y-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-200/80">
                      Courier pipeline
                    </p>
                    <h1 className="truncate text-base font-semibold text-white sm:text-lg">
                      {candidateName}
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {candidate?.candidateCode ? (
                      <Badge className="border-white/15 bg-white/10 px-1.5 py-0 text-[10px] text-white hover:bg-white/10">
                        {candidate.candidateCode}
                      </Badge>
                    ) : null}
                    <Badge className="border-teal-300/25 bg-teal-500/15 px-1.5 py-0 text-[10px] text-teal-50 hover:bg-teal-500/15">
                      <Route className="mr-1 h-2.5 w-2.5" />
                      {totalLegs} leg{totalLegs !== 1 ? "s" : ""}
                    </Badge>
                    <Badge className="border-emerald-300/25 bg-emerald-500/15 px-1.5 py-0 text-[10px] text-emerald-50 hover:bg-emerald-500/15">
                      <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                      {receivedLegs} received
                    </Badge>
                    <Badge
                      className={cn(
                        "px-1.5 py-0 text-[10px] hover:bg-amber-500/15",
                        inTransitLegs > 0
                          ? "border-amber-300/30 bg-amber-500/15 text-amber-50"
                          : "border-white/15 bg-white/10 text-white/70",
                      )}
                    >
                      <Clock className="mr-1 h-2.5 w-2.5" />
                      {inTransitLegs} in transit
                    </Badge>
                    {pipeline?.currentLocationHint ? (
                      <Badge className="max-w-[180px] truncate border-white/15 bg-white/10 px-1.5 py-0 text-[10px] text-white hover:bg-white/10">
                        <MapPin className="mr-1 h-2.5 w-2.5 shrink-0" />
                        {pipeline.currentLocationHint}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:shrink-0">
                <div className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm sm:min-w-[160px] sm:flex-none">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-teal-100/70">
                        Progress
                      </p>
                      <p className="text-sm font-bold text-white">{progress}%</p>
                    </div>
                    <p className="truncate text-[10px] text-teal-100/70">
                      {receivedLegs}/{totalLegs}
                    </p>
                  </div>
                  <Progress
                    value={progress}
                    className="mt-1.5 h-1 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-teal-300 [&>div]:to-emerald-400"
                  />
                </div>

                {/* {canWrite ? (
                  <Button
                    size="sm"
                    className="shrink-0 gap-1.5 rounded-lg bg-white px-3 text-teal-800 hover:bg-teal-50"
                    onClick={handleAddLeg}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New leg
                  </Button>
                ) : null} */}
              </div>
            </div>
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

            <CardContent className="bg-gradient-to-b from-muted/10 to-background p-4 sm:p-6">
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
          <CourierPipelineProgressCard
            legs={pipeline?.legs ?? []}
            receivedLegs={receivedLegs}
            totalLegs={totalLegs}
            currentLocationHint={pipeline?.currentLocationHint}
            highlightLegId={highlightLegId}
          />
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
