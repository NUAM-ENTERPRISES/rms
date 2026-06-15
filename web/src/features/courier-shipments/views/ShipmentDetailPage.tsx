import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <p className="p-6 text-muted-foreground">Courier leg not found.</p>
    );
  }

  return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
