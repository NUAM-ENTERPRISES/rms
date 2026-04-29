import React, { useState } from "react";
import { DocumentUploadSection } from "../DocumentUploadSection";
import { useGetDocumentsQuery } from "../../api";
import { getCandidateProfileCompletion } from "../../profileCompletion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, FileText, Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
    <div className="space-y-8">
      {/* Header & Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-xl bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-2xl">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  Document Repository
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium ml-1">
                  Manage and verify all candidate documentation
                </CardDescription>
              </div>
              {(isLoading || isFetching) && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Syncing</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
              <div className="relative flex-shrink-0">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-200"
                  />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={251.2}
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 251.2 - (completion.percent / 100) * 251.2 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    strokeLinecap="round"
                    className={cn(
                      "transition-all duration-500",
                      completion.percent >= 100 ? "text-emerald-500" : 
                      completion.percent >= 60 ? "text-amber-400" : "text-rose-500"
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-900">{completion.percent}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Done</span>
                </div>
              </div>
              
              <div className="space-y-3 flex-1">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-slate-900">Profile Completion Status</h4>
                  <p className="text-sm text-slate-500 font-medium">
                    {completion.completedCount} of {completion.requiredCount} mandatory documents have been successfully verified.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700">{completion.completedCount} Verified</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <span className="text-xs font-bold text-slate-700">{completion.missing.length} Missing</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
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
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    The following documents are required to complete the verification process:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {completion.missing.map((doc) => (
                      <Badge
                        key={doc.label}
                        className="px-3 py-1.5 bg-amber-50 text-amber-700 border-amber-100 rounded-xl text-[11px] font-bold uppercase tracking-wider"
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
                  className="flex flex-col items-center justify-center py-6 text-center space-y-3"
                >
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-900">All Set!</p>
                    <p className="text-xs text-slate-500 font-medium">No pending mandatory documents.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Section */}
      <div className="space-y-6">
        <DocumentUploadSection 
          candidateId={candidateId} 
          data={documents}
          isLoading={isLoading}
          onRefresh={refetch}
        />

        {/* Pagination */}
        {meta && meta.total > 0 && meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-6 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
              Page <span className="text-slate-900">{page}</span> of {meta.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i-1] !== p - 1 && <span className="text-slate-300 mx-1">...</span>}
                      <Button
                        variant={p === page ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setPage(p)}
                        disabled={isFetching}
                        className={cn(
                          "h-10 w-10 rounded-xl transition-all font-bold",
                          p === page ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "hover:bg-white hover:shadow-md"
                        )}
                      >
                        {p}
                      </Button>
                    </React.Fragment>
                  ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages || isFetching}
                className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
