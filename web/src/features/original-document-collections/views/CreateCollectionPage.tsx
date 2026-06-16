import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Loader2,
  UserSearch,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  getCollectionSourceErrorMessage,
  getFirstInvalidSection,
  type CreateCollectionFormSection,
  validateChecklistItemsForVisit,
} from "../utils/createCollectionFormValidation";
import { cn } from "@/lib/utils";

function normalizeChecklistItems(
  items: ReturnType<typeof buildDefaultChecklistItems>,
): NonNullable<CreateCollectionFormValues["items"]> {
  return items.map(({ docType, isReceived, remarks }) => ({
    docType,
    isReceived,
    remarks: remarks ?? undefined,
  }));
}

export default function CreateCollectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCandidateId = searchParams.get("candidateId") ?? "";
  const preselectedCollectionId = searchParams.get("collectionId") ?? "";
  const canWrite = useCan("write:original_document_intake");
  const [createCollection, { isLoading: isCreating }] =
    useCreateOriginalDocumentCollectionMutation();
  const [addEvent, { isLoading: isAddingEvent }] =
    useAddOriginalDocumentCollectionEventMutation();

  const defaultItems = useMemo(() => normalizeChecklistItems(buildDefaultChecklistItems()), []);

  const form = useForm<CreateCollectionFormValues>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      candidateId: preselectedCandidateId,
      collectionType: COLLECTION_TYPE.DIRECT,
      collectedByUserId: "",
      collectedAt: new Date().toISOString(),
      directOffice: "kochi",
      items: defaultItems,
    },
  });

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
  const candidateSectionRef = useRef<HTMLDivElement>(null);
  const collectionSourceSectionRef = useRef<HTMLDivElement>(null);
  const checklistSectionRef = useRef<HTMLDivElement>(null);

  const sectionRefs: Record<
    CreateCollectionFormSection,
    RefObject<HTMLDivElement | null>
  > = {
    candidate: candidateSectionRef,
    collectionSource: collectionSourceSectionRef,
    checklist: checklistSectionRef,
  };

  const scrollToSection = (section: CreateCollectionFormSection) => {
    sectionRefs[section].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleInvalidSubmit = (
    errors: FieldErrors<CreateCollectionFormValues>,
  ) => {
    const section = getFirstInvalidSection(errors);
    if (section) {
      scrollToSection(section);
    }
    toast.error("Please complete the highlighted sections before saving.");
  };
  useEffect(() => {
    if (prevCandidateRef.current !== selectedCandidateId) {
      form.setValue("items", normalizeChecklistItems(buildDefaultChecklistItems()));
      prevCandidateRef.current = selectedCandidateId;
    }
  }, [selectedCandidateId, form]);

  if (!canWrite) {
    return (
      <div className="text-sm text-muted-foreground">
        You do not have permission to create collections.
      </div>
    );
  }

  const onSubmit = async (values: CreateCollectionFormValues) => {
    if (isCollectionCompleted) {
      toast.error("This candidate's original document collection is already completed.");
      return;
    }

    const checklistError = validateChecklistItemsForVisit(
      values.items,
      previouslyReceivedDocTypes,
    );
    if (checklistError) {
      form.setError("items", { type: "manual", message: checklistError });
      scrollToSection("checklist");
      toast.error(checklistError);
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

  const {
    errors,
    isSubmitted,
  } = form.formState;
  const showValidation = isSubmitted;
  const candidateSectionError = showValidation && Boolean(errors.candidateId);
  const collectionSourceSectionError =
    showValidation && Boolean(getCollectionSourceErrorMessage(errors));
  const checklistSectionError =
    showValidation && Boolean(errors.items?.message);

  return (
    <div className="w-full space-y-4">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 px-0">
          <Link to="/original-documents" aria-label="Back to register">
            <ArrowLeft className="h-4 w-4" />
            Back to register
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {hasExistingCollection
              ? "Log intake event"
              : "Start document collection"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasExistingCollection
              ? "Record documents received in this visit."
              : "Select a candidate, note how documents were collected, and mark what was received."}
          </p>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit, handleInvalidSubmit)}
        className="space-y-4"
        noValidate
      >
        <div className="grid gap-4 lg:grid-cols-2">
            <div
              ref={candidateSectionRef}
              id="create-collection-candidate"
              className="scroll-mt-6"
            >
            <Card
              className={cn(
                candidateSectionError &&
                  "border-destructive ring-1 ring-destructive/20",
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserSearch className="h-4 w-4" />
                  Candidate
                </CardTitle>
                <CardDescription>
                  Search and select the candidate for this intake.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidateSectionError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.candidateId?.message}
                  </p>
                ) : null}
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
                  <div className="space-y-4">
                    <CandidateCollectionHistoryBadges
                      candidateId={selectedCandidateId}
                    />

                    {isCollectionCompleted ? (
                      <div className="rounded-lg border border-border bg-muted/40 p-4">
                        <div className="flex gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                          <div className="min-w-0 space-y-2">
                            <p className="text-sm font-medium text-foreground">
                              Original documents already collected
                            </p>
                            <p className="text-sm text-muted-foreground">
                              This candidate&apos;s collection is complete
                              {completedByName ? (
                                <>
                                  {" "}
                                  by{" "}
                                  <span className="font-medium text-foreground">
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
                              >
                                <Link
                                  to={`/original-documents/${existingCollectionId}`}
                                >
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
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Search for a candidate to continue.
                  </p>
                )}
              </CardContent>
            </Card>
            </div>

            <div
              ref={collectionSourceSectionRef}
              id="create-collection-source"
              className="scroll-mt-6"
            >
            <Card
              className={cn(
                collectionSourceSectionError &&
                  "border-destructive ring-1 ring-destructive/20",
              )}
            >
              <CardHeader>
                <CardTitle className="text-base">Collection source</CardTitle>
                <CardDescription>
                  How were the documents collected?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {collectionSourceSectionError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {getCollectionSourceErrorMessage(errors)}
                  </p>
                ) : null}
                <CollectionSourceForm
                  register={form.register}
                  control={form.control}
                  watch={form.watch}
                  errors={errors}
                  showErrors={showValidation}
                  disabled={isCollectionCompleted}
                />
              </CardContent>
            </Card>
            </div>
        </div>

        <div
          ref={checklistSectionRef}
          id="create-collection-checklist"
          className="scroll-mt-6"
        >
        <Card
          className={cn(
            "gap-0",
            checklistSectionError &&
              "border-destructive ring-1 ring-destructive/20",
          )}
        >
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              Document checklist
            </CardTitle>
            <CardDescription>
              Mark documents received this visit, then upload each event&apos;s
              merged scan on the collection detail page.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <Controller
              control={form.control}
              name="items"
              render={({ field }) => (
                <OriginalDocumentChecklist
                  items={field.value ?? defaultItems}
                  onChange={(items) => {
                    field.onChange(items);
                    if (errors.items) {
                      form.clearErrors("items");
                    }
                  }}
                  previouslyReceivedDocTypes={previouslyReceivedDocTypes}
                  disabled={isCollectionCompleted}
                  error={
                    showValidation
                      ? (errors.items?.message as string | undefined)
                      : undefined
                  }
                />
              )}
            />
          </CardContent>
        </Card>
        </div>

        {isCollectionCompleted ? (
          <p className="text-sm text-muted-foreground">
            {completedByName
              ? `Original documents were collected by ${completedByName}. No further intake events can be logged.`
              : "Original documents are already collected. No further intake events can be logged."}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link to="/original-documents">Cancel</Link>
          </Button>
          {isCollectionCompleted && existingCollectionId ? (
            <Button type="button" asChild>
              <Link to={`/original-documents/${existingCollectionId}`}>
                View collection
              </Link>
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading || isCollectionCompleted}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save & continue
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
