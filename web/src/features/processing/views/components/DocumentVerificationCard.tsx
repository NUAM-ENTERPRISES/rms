import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PDFViewer } from "@/components/molecules";
import {
  FileCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  ExternalLink,
  Download,
  Eye,
} from "lucide-react";

interface DocumentVerification {
  id: string;
  status: string;
  notes?: string | null;
  rejectionReason?: string | null;
  resubmissionRequested?: boolean;
  document: {
    id: string;
    docType: string;
    fileName: string;
    fileUrl: string;
    status: string;
    mimeType?: string;
    fileSize?: number;
  };
}

interface PaginationProps {
  page: number;
  pages?: number;
  total: number;
  pageSize?: number;
  onPrev: () => void;
  onNext: () => void;
}

interface DocumentVerificationCardProps {
  verifications: DocumentVerification[];
  maxHeight?: string;
  pagination?: PaginationProps;
}

export function DocumentVerificationCard({
  verifications,
  maxHeight = "320px",
  pagination,
}: DocumentVerificationCardProps) {
  const getDocTypeName = (docType: string) => {
    const names: Record<string, string> = {
      resume: "Resume",
      pan_card: "PAN Card",
      aadhar_card: "Aadhaar",
      passport: "Passport",
      offer_letter: "Offer Letter",
      education_certificate: "Education Cert",
      experience_letter: "Experience",
      medical_certificate: "Medical Cert",
      police_clearance: "Police Clearance",
      visa: "Visa",
    };
    return names[docType] || docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getStatusConfig = (status: string) => {
    const config: Record<
      string,
      { icon: typeof CheckCircle2; color: string; bg: string; label: string }
    > = {
      verified: {
        icon: CheckCircle2,
        color: "text-emerald-600",
        bg: "bg-emerald-100",
        label: "Verified",
      },
      pending: {
        icon: Clock,
        color: "text-amber-600",
        bg: "bg-amber-100",
        label: "Pending",
      },
      rejected: {
        icon: XCircle,
        color: "text-rose-600",
        bg: "bg-rose-100",
        label: "Rejected",
      },
      resubmission_requested: {
        icon: AlertTriangle,
        color: "text-orange-600",
        bg: "bg-orange-100",
        label: "Resubmit",
      },
    };
    return (
      config[status] || {
        icon: Clock,
        color: "text-slate-500",
        bg: "bg-slate-100",
        label: status,
      }
    );
  };

  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const totalCount = verifications.length;

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState<string | undefined>(undefined);

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerUrl(null);
    setViewerName(undefined);
  };

  return (
    <Card className="border-0 shadow-xl overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-100 py-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              Documents
            </CardTitle>
            {pagination && (
              <div className="text-[11px] text-slate-500 mt-0.5">{pagination.total} documents</div>
            )}
          </div>

          {pagination ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold text-xs">
              {pagination.total}
            </Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold text-xs">
              {verifiedCount}/{totalCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {verifications && verifications.length > 0 ? (
          <div 
            className="overflow-auto scrollbar-thin scrollbar-thumb-slate-200" 
            style={{ maxHeight }}
          >
            <div className="divide-y divide-slate-100">
              {verifications.map((verification) => {
                const statusConfig = getStatusConfig(verification.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={verification.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${statusConfig.bg}`}>
                      <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">
                        {getDocTypeName(verification.document.docType)}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {verification.document.fileName}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-violet-100 hover:text-violet-700 rounded-lg"
                        onClick={() => {
                          const fileUrl = verification.document.fileUrl;
                          const fileName = verification.document.fileName;
                          const isPdf = (verification.document.mimeType || "").toLowerCase().includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
                          if (isPdf) {
                            // Open in app PDF viewer
                            setViewerUrl(fileUrl);
                            setViewerName(fileName);
                            setViewerOpen(true);
                          } else {
                            // Fallback: open in new tab for non-PDFs
                            window.open(fileUrl, "_blank");
                          }
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-700 rounded-lg"
                        asChild
                      >
                        <a href={verification.document.fileUrl} download>
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <FileCheck className="h-8 w-8 text-slate-200 mb-2" />
            <p className="text-xs font-bold text-slate-400">No documents</p>
          </div>
        )}

        {/* PDF Viewer Modal */}
        {viewerUrl && (
          <PDFViewer
            fileUrl={viewerUrl}
            fileName={viewerName}
            isOpen={viewerOpen}
            onClose={closeViewer}
            showDownload
          />
        )}

        {/* Pagination Controls (optional) */}
        {pagination && (
          <div className="border-t px-4 py-2 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Showing {Math.min((pagination.page - 1) * (pagination.pageSize || 10) + 1, pagination.total)} - {Math.min(pagination.page * (pagination.pageSize || 10), pagination.total)} of {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" disabled={pagination.page <= 1} onClick={pagination.onPrev}>
                Prev
              </Button>
              <Button size="sm" variant="ghost" disabled={pagination.page >= (pagination.pages || Math.ceil((pagination.total || 0) / (pagination.pageSize || 10)))} onClick={pagination.onNext}>
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
