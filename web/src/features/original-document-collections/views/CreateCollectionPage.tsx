import { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Loader2,
  UserSearch,
  FileStack,
  ClipboardList,
  Check,
  Circle,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectCandidate } from "@/components/molecules";
import { useCan } from "@/hooks/useCan";
import {
  useAddOriginalDocumentCollectionEventMutation,
  useCreateOriginalDocumentCollectionMutation,
  useGetCandidateOriginalDocumentCollectionsQuery,
} from "../api";
import {
  CandidateCollectionHistoryBadges,
  CandidateCollectionHistoryPanel,
} from "../components/CandidateCollectionHistoryPanel";
import { CollectionSourceForm } from "../components/CollectionSourceForm";
import { SelectedCandidateSummary } from "../components/SelectedCandidateSummary";
import {
  buildDefaultChecklistItems,
  OriginalDocumentChecklist,
} from "../components/OriginalDocumentChecklist";
import { COLLECTION_TYPE } from "../constants";
import {
  createCollectionSchema,
  type CreateCollectionFormValues,
} from "../schemas/collection-form.schema";
import type { CollectionItem } from "../types";
import { cn } from "@/lib/utils";

export default function CreateCollectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCandidateId = searchParams.get("candidateId") ?? "";
  const preselectedCollectionId = searchParams.get("collectionId") ?? "";
  const canWrite = useCan("write:documents");
  const [createCollection, { isLoading: isCreating }] =
    useCreateOriginalDocumentCollectionMutation();
  const [addEvent, { isLoading: isAddingEvent }] =
    useAddOriginalDocumentCollectionEventMutation();

  const defaultItems = useMemo(() => buildDefaultChecklistItems(), []);

  const form = useForm<CreateCollectionFormValues & { items: CollectionItem[] }>(
    {
      resolver: zodResolver(createCollectionSchema),
      defaultValues: {
        candidateId: preselectedCandidateId,
        collectionType: COLLECTION_TYPE.DIRECT,
        collectedByUserId: "",
        collectedAt: new Date().toISOString(),
        directOffice: "kochi",
        items: defaultItems,
      },
    },
  );

  const selectedCandidateId = form.watch("candidateId");
  const { data: historyData } = useGetCandidateOriginalDocumentCollectionsQuery(
    selectedCandidateId,
    { skip: !selectedCandidateId },
  );
  const existingCollectionId =
    (historyData?.data?.collection?.id ?? preselectedCollectionId) || "";
  const existingCollection = historyData?.data?.collection ?? null;
  const hasExistingCollection = Boolean(existingCollectionId);
  const isCollectionCompleted = existingCollection?.status === "completed";
  const completedByName = existingCollection?.completedBy?.name?.trim();
  const completedAt = existingCollection?.completedAt;
  const cumulativeReceived = historyData?.data?.cumulativeReceived ?? [];
  const previouslyReceivedDocTypes = useMemo(
    () => cumulativeReceived.map((item) => item.docType),
    [cumulativeReceived],
  );
  const isLoading = isCreating || isAddingEvent;

  const prevCandidateRef = useRef(selectedCandidateId);
  useEffect(() => {
    if (prevCandidateRef.current !== selectedCandidateId) {
      form.setValue("items", buildDefaultChecklistItems());
      prevCandidateRef.current = selectedCandidateId;
    }
  }, [selectedCandidateId, form]);

  if (!canWrite) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        You do not have permission to create collections.
      </div>
    );
  }

  const onSubmit = async (
    values: CreateCollectionFormValues & { items: CollectionItem[] },
  ) => {
    if (isCollectionCompleted) {
      toast.error("This candidate's original document collection is already completed.");
      return;
    }

    const items = values.items?.map((item) => ({
      docType: item.docType,
      isReceived: item.isReceived,
      remarks: item.remarks || undefined,
    }));
    const eventBody = {
      collectionType: values.collectionType,
      collectedByUserId: values.collectedByUserId,
      collectedAt: values.collectedAt,
      directOffice: values.directOffice,
      directOfficeOther: values.directOfficeOther,
      interviewVenue: values.interviewVenue,
      agentId: values.agentId,
      agentNameManual: values.agentNameManual,
      courierPartner: values.courierPartner,
      trackingNumber: values.trackingNumber,
      remarks: values.remarks,
      items,
    };

    try {
      if (hasExistingCollection && existingCollectionId) {
        await addEvent({
          collectionId: existingCollectionId,
          body: eventBody,
        }).unwrap();
        toast.success("Intake event logged");
        navigate(`/original-documents/${existingCollectionId}`);
        return;
      }

      const result = await createCollection({
        candidateId: values.candidateId,
        ...eventBody,
      }).unwrap();
      toast.success("Collection started with first intake event");
      navigate(`/original-documents/${result.data.id}`);
    } catch {
      toast.error("Failed to save intake event");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      {/* Premium Header Section */}
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="hover:bg-slate-100 rounded-xl transition-all"
              >
                <Link to="/original-documents" aria-label="Back to register">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 opacity-75 blur"></div>
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 shadow-lg">
                    <FileStack className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {hasExistingCollection
                      ? "Log Intake Event"
                      : "Start Document Collection"}
                  </h1>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">
                    {hasExistingCollection
                      ? "Add documents received in this visit to the candidate's collection"
                      : "Create the candidate's collection and log the first intake event"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  1
                </div>
                <span className="text-sm font-semibold text-indigo-900">Collection Details</span>
              </div>
              <div className="h-px w-8 bg-slate-200"></div>
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 opacity-50">
                <Circle className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Review</span>
              </div>
              <div className="h-px w-8 bg-slate-200"></div>
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 opacity-50">
                <Circle className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Submit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Two-column top section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            {/* Left: Candidate Selection */}
            <Card className="group relative overflow-hidden border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="relative border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md ring-4 ring-blue-50">
                      <UserSearch className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Select Candidate
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Search and choose the candidate
                      </p>
                    </div>
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    1
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4 p-6">
                <Controller
                  control={form.control}
                  name="candidateId"
                  render={({ field, fieldState }) => (
                    <SelectCandidate
                      label="Search candidate"
                      required
                      value={field.value}
                      onValueChange={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                {selectedCandidateId ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <CandidateCollectionHistoryBadges
                      candidateId={selectedCandidateId}
                    />
                    {isCollectionCompleted ? (
                      <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-emerald-900">
                              Original documents already collected
                            </p>
                            <p className="mt-1 text-xs text-emerald-800">
                              This candidate&apos;s original document collection is
                              complete
                              {completedByName ? (
                                <>
                                  {" "}
                                  by{" "}
                                  <span className="font-semibold">
                                    {completedByName}
                                  </span>
                                </>
                              ) : null}
                              {completedAt ? (
                                <>
                                  {" "}
                                  on{" "}
                                  {format(new Date(completedAt), "dd MMM yyyy")}
                                </>
                              ) : null}
                              .
                            </p>
                            {existingCollectionId ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                asChild
                                className="mt-3 border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50"
                              >
                                <Link to={`/original-documents/${existingCollectionId}`}>
                                  View completed collection
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <SelectedCandidateSummary candidateId={selectedCandidateId} />
                    {hasExistingCollection && !isCollectionCompleted ? (
                      <CandidateCollectionHistoryPanel
                        candidateId={selectedCandidateId}
                        variant="compact"
                        showAddEventLink={false}
                      />
                    ) : null}
                  </motion.div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 text-center">
                    <Sparkles className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">
                      No candidate selected yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Use the search box above to find a candidate
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Collection Source */}
            <Card className="group relative overflow-hidden border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="relative border-b border-slate-100 bg-gradient-to-r from-amber-50/50 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md ring-4 ring-amber-50">
                      <FileStack className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Collection Source
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        How were the documents collected?
                      </p>
                    </div>
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                    2
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative p-6">
                <CollectionSourceForm
                  register={form.register}
                  control={form.control}
                  watch={form.watch}
                  disabled={isCollectionCompleted}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Full-width: Checklist */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="group relative overflow-hidden border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="relative border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-md ring-4 ring-emerald-50">
                      <ClipboardList className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Document Checklist
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mark which original documents were received
                      </p>
                    </div>
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    3
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative p-6">
                <OriginalDocumentChecklist
                  items={form.watch("items") ?? defaultItems}
                  onChange={(items) => form.setValue("items", items)}
                  previouslyReceivedDocTypes={previouslyReceivedDocTypes}
                  disabled={isCollectionCompleted}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="sticky bottom-0 z-10 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl p-6 shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    isCollectionCompleted ? "bg-emerald-50" : "bg-blue-50",
                  )}
                >
                  {isCollectionCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {isCollectionCompleted
                      ? "Collection already completed"
                      : "Ready to save?"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isCollectionCompleted
                      ? completedByName
                        ? `Original documents were collected by ${completedByName}. No further intake events can be logged.`
                        : "Original documents are already collected. No further intake events can be logged."
                      : "You can continue editing after saving as draft"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  asChild
                  className="rounded-xl border-slate-300 hover:bg-slate-50"
                >
                  <Link to="/original-documents">Cancel</Link>
                </Button>
                {isCollectionCompleted && existingCollectionId ? (
                  <Button
                    type="button"
                    size="lg"
                    asChild
                    className="gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg px-8"
                  >
                    <Link to={`/original-documents/${existingCollectionId}`}>
                      View Collection
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading || isCollectionCompleted}
                    className="gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-700 hover:via-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all px-8"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save & Continue
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
