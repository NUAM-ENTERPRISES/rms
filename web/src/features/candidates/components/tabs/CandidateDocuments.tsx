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
import { SURFACE_AMBER_SOFT } from "@/lib/page-shell-styles";
import { useDebounce } from "@/hooks";

interface CandidateDocumentsProps {
  candidateId: string;
  candidatePassportNumber?: string | null;
  candidateEligibilityNumber?: string | null;
  initialUploadDocType?: string | null;
  onInitialUploadDocTypeHandled?: () => void;
}

const RING = 2 * Math.PI * 40;

export const CandidateDocuments: React.FC<CandidateDocumentsProps> = ({
  candidateId,
  candidatePassportNumber,
  candidateEligibilityNumber,
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
        <Card className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm dark:bg-card dark:shadow-none lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
                  <div className="rounded-2xl bg-blue-50 p-2.5 dark:!bg-muted/40">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  Document Repository
                </CardTitle>
                <CardDescription className="ml-1 font-medium text-muted-foreground">
                  Manage and verify all candidate documentation
                </CardDescription>
              </div>
              {syncActive && (
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 dark:!bg-muted/30">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Syncing
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6 rounded-3xl border border-border bg-muted/50 p-6 sm:flex-row sm:items-center dark:!bg-muted/20">
              <div className="relative flex-shrink-0">
                <svg className="h-24 w-24 -rotate-90 transform">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted-foreground/40 dark:text-muted-foreground/30"
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
                      hasMissingDocs ? "text-rose-600" : "text-foreground"
                    )}
                  >
                    {completion.percent}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                    Done
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-foreground">
                    Completion Document Status
                  </h4>
                  <p className="text-sm font-medium text-muted-foreground">
                    {completion.completedCount} of {completion.requiredCount}{" "}
                    mandatory document types are present (at least one file per
                    type). This is separate from per-file verification status
                    in the table below.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-bold text-foreground">
                      {completion.typeSatisfiedCount} type
                      {completion.typeSatisfiedCount === 1 ? "" : "s"}{" "}
                      present
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 shadow-sm">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <span className="text-xs font-bold text-foreground">
                      {completion.typeMissingCount} missing
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm dark:bg-card dark:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
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
                  <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                    The following documents are required to complete the
                    verification process:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {completion.missing.map((doc) => (
                      <Badge
                        key={doc.key}
                        className={`rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${SURFACE_AMBER_SOFT}`}
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
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:!bg-muted/40">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-foreground">All Set!</p>
                    <p className="text-xs font-medium text-muted-foreground">
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
        candidatePassportNumber={candidatePassportNumber}
        candidateEligibilityNumber={candidateEligibilityNumber}
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
