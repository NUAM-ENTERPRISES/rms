import React, { useState } from "react";
import { DocumentUploadSection } from "../DocumentUploadSection";
import { CandidatesIntroductionVideos } from "../CandidatesIntroductionVideos";
import { useGetDocumentsQuery } from "../../api";
import { getCandidateProfileCompletion } from "../../profileCompletion";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks";

interface CandidateDocumentsProps {
  candidateId: string;
  initialUploadDocType?: string | null;
  onInitialUploadDocTypeHandled?: () => void;
}

const RING = 2 * Math.PI * 40;

export const CandidateDocuments: React.FC<CandidateDocumentsProps> = ({
  candidateId,
  initialUploadDocType,
  onInitialUploadDocTypeHandled,
}) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [docType, setDocType] = useState("all");
  const limit = 10;
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: fullData,
    isLoading: fullLoading,
    isFetching: fullFetching,
    refetch: refetchFull,
  } = useGetDocumentsQuery({
    candidateId,
    page: 1,
    limit: 10,
  });

  const {
    data,
    isLoading,
    isFetching,
    refetch: refetchPaged,
  } = useGetDocumentsQuery({
    candidateId,
    page,
    limit,
    search: debouncedSearch.trim() || undefined,
    docType: docType !== "all" ? docType : undefined,
  });

  const allForCompletion = fullData?.data?.documents ?? [];
  const pagedDocuments = data?.data?.documents ?? [];
  const meta = data?.data?.pagination;

  const completion = getCandidateProfileCompletion(allForCompletion);
  const hasMissingDocs = completion.typeMissingCount > 0;
  const syncActive = isLoading || isFetching || fullLoading || fullFetching;

  const refetchAll = () => {
    void refetchPaged();
    void refetchFull();
  };

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, docType]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-3xl border-0 bg-white/90 shadow-xl backdrop-blur-md lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                  <div className="rounded-2xl bg-blue-50 p-2.5">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  Document Repository
                </CardTitle>
                <CardDescription className="ml-1 font-medium text-slate-500">
                  Manage and verify all candidate documentation
                </CardDescription>
              </div>
              {syncActive && (
                <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Syncing
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6 rounded-3xl border border-slate-100 bg-slate-50/50 p-6 sm:flex-row sm:items-center">
              <div className="relative flex-shrink-0">
                <svg className="h-24 w-24 -rotate-90 transform">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-200"
                    stroke="currentColor"
                  />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="40"
                    strokeWidth="8"
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={RING}
                    initial={{ strokeDashoffset: RING }}
                    animate={{
                      strokeDashoffset:
                        RING - (completion.percent / 100) * RING,
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                      hasMissingDocs ? "text-rose-500" : "text-emerald-500"
                    )}
                    stroke="currentColor"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={cn(
                      "text-xl font-black",
                      hasMissingDocs ? "text-rose-600" : "text-slate-900"
                    )}
                  >
                    {completion.percent}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                    Done
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-slate-900">
                    Completion Document Status
                  </h4>
                  <p className="text-sm font-medium text-slate-500">
                    {completion.completedCount} of {completion.requiredCount}{" "}
                    mandatory document types are present (at least one file per
                    type). This is separate from per-file verification status
                    in the table below.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-1.5 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700">
                      {completion.typeSatisfiedCount} type
                      {completion.typeSatisfiedCount === 1 ? "" : "s"}{" "}
                      present
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-1.5 shadow-sm">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <span className="text-xs font-bold text-slate-700">
                      {completion.typeMissingCount} missing
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-0 bg-white/90 shadow-xl backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Info className="h-5 w-5 text-amber-500" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence mode="wait">
              {completion.missing.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <p className="text-sm font-medium leading-relaxed text-slate-500">
                    The following documents are required to complete the
                    verification process:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {completion.missing.map((doc) => (
                      <Badge
                        key={doc.key}
                        className="rounded-xl border-amber-100 bg-amber-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700"
                      >
                        {doc.label}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center space-y-3 py-6 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-900">All Set!</p>
                    <p className="text-xs font-medium text-slate-500">
                      No pending mandatory document types.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      <DocumentUploadSection
        candidateId={candidateId}
        data={pagedDocuments}
        pagination={meta}
        currentPage={page}
        onPageChange={setPage}
        isFetching={isFetching}
        search={search}
        onSearchChange={setSearch}
        selectedDocType={docType}
        onDocTypeChange={setDocType}
        completionSourceDocuments={allForCompletion}
        isLoading={isLoading}
        onRefresh={refetchAll}
        initialUploadDocType={initialUploadDocType}
        onInitialUploadDocTypeHandled={onInitialUploadDocTypeHandled}
      />

      <CandidatesIntroductionVideos candidateId={candidateId} />
    </div>
  );
};
