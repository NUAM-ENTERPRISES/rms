import React, { useState } from "react";
import { DocumentUploadSection } from "../DocumentUploadSection";
import { useGetDocumentsQuery } from "../../api";
import { getCandidateProfileCompletion } from "../../profileCompletion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CandidateDocumentsProps {
  candidateId: string;
}

export const CandidateDocuments: React.FC<CandidateDocumentsProps> = ({
  candidateId,
}) => {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isFetching, refetch } = useGetDocumentsQuery({
    candidateId,
    page,
    limit,
  });

  const documents = data?.data?.documents || [];
  const meta = data?.data?.pagination;
  const completion = getCandidateProfileCompletion(documents);
  const missingLabels = completion.missing.map((item) => item.label);

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <FileText className="h-5 w-5 text-blue-600" />
              Candidate Specific Documents
            </CardTitle>
            <CardDescription className="text-slate-600">
              All documents uploaded by this candidate.
            </CardDescription>
          </div>
          {(isLoading || isFetching) && (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          )}
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] items-start">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Mandatory Documents</p>
              <p className="text-sm text-slate-500">
                {completion.completedCount}/{completion.requiredCount} required documents uploaded.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Completion
              </p>
              <p className="text-2xl font-bold text-slate-900">{completion.percent}%</p>
              <p className="text-xs text-slate-500">
                {completion.missing.length} missing
              </p>
            </div>
          </div>

          {completion.missing.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="font-semibold">Missing required documents</p>
              <p className="text-sm text-amber-800 mt-2">
                Upload the missing files below to complete the candidate profile.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {missingLabels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <p className="font-semibold">All mandatory documents are uploaded.</p>
              <p className="text-sm text-emerald-800 mt-2">
                The candidate has submitted the required documentation for profile completion.
              </p>
            </div>
          )}

          <DocumentUploadSection 
            candidateId={candidateId} 
            data={documents}
            isLoading={isLoading}
            onRefresh={refetch}
          />

          {meta && meta.total > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-sm text-slate-500 font-medium">
                Showing <span className="text-slate-900">{(page - 1) * limit + 1}</span> to{" "}
                <span className="text-slate-900">
                  {Math.min(page * limit, meta.total)}
                </span>{" "}
                of <span className="text-slate-900">{meta.total}</span> results
              </p>
              {meta.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(
                      (p) => (
                        <Button
                          key={p}
                          variant={p === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(p)}
                          disabled={isFetching}
                          className={`h-8 w-8 p-0 ${
                            p === page ? "bg-blue-600 hover:bg-blue-700" : ""
                          }`}
                        >
                          {p}
                        </Button>
                      )
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={page === meta.totalPages || isFetching}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
