import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGetCourierShipmentQuery } from "../api";

/** Redirects legacy leg URLs to the candidate courier details page. */
export default function ShipmentDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetCourierShipmentQuery(id, {
    skip: !id,
  });

  useEffect(() => {
    const candidateId = data?.data?.candidateId;
    if (!candidateId) return;
    const params = new URLSearchParams();
    if (id) params.set("leg", id);
    navigate(
      `/courier-management/candidates/${candidateId}?${params.toString()}`,
      { replace: true },
    );
  }, [data?.data?.candidateId, id, navigate]);

  if (isError || (!isLoading && !data?.data)) {
    return (
      <div className="w-full space-y-5">
        <Button variant="ghost" size="sm" asChild className="gap-2 px-0">
          <Link to="/courier-management" aria-label="Back to courier register">
            <ArrowLeft className="h-4 w-4" />
            Back to register
          </Link>
        </Button>

        <Card className="w-full border-destructive/30 shadow-sm">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base text-destructive">
              Courier leg not found
            </CardTitle>
            <CardDescription className="text-sm">
              This leg may have been removed or the link is invalid.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Button asChild variant="outline" className="rounded-lg">
              <Link to="/courier-management">Return to courier register</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-[50vh] items-center justify-center py-16">
      <Card className="w-full max-w-lg overflow-hidden border-teal-100 shadow-md">
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-6 py-5">
          <div className="flex items-center gap-3 text-teal-50">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Opening courier leg</p>
              <p className="text-xs text-teal-100/90">
                Redirecting to candidate pipeline
              </p>
            </div>
          </div>
        </div>
        <CardContent className="flex flex-col items-center gap-4 px-6 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading leg details..." : "Taking you to the full courier history..."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
