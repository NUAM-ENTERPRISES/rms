import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trash2,
  Plus,
  Loader2,
  Lock,
  FolderCog,
  MapPin,
  FileText,
  Search,
  Globe2,
  Flag,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import { DeleteConfirmationDialog } from "@/components/molecules";
import { cn } from "@/lib/utils";
import {
  DOCUMENT_TYPE_CONFIG,
  getDocumentTypeConfig,
  resolveCanonicalDocumentType,
} from "@/constants/document-types";
import {
  useCreateStepRequirementRuleMutation,
  useDeleteStepRequirementRuleMutation,
  useGetStepRequirementRulesQuery,
  useUpdateStepRequirementRuleMutation,
  type StepRequirementRuleScope,
} from "@/services/processingApi";

type RuleFilter = "all" | "mandatory" | "optional";
type RuleScope = StepRequirementRuleScope;

interface ManageStepDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  stepKey: string;
  stepLabel?: string;
}

export default function ManageStepDocumentsModal({
  isOpen,
  onClose,
  processingId,
  stepKey,
  stepLabel,
}: ManageStepDocumentsModalProps) {
  const canManage = useCan("write:processing");
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [isMandatory, setIsMandatory] = useState<boolean>(false);
  const [ruleScope, setRuleScope] = useState<RuleScope>("country");
  const [ruleFilter, setRuleFilter] = useState<RuleFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
    sourceCountryCode: string;
  } | null>(null);

  const { data, isLoading } = useGetStepRequirementRulesQuery(
    { processingId, stepKey },
    { skip: !isOpen || !processingId || !stepKey || !canManage },
  );

  const [createRule, { isLoading: isCreating }] =
    useCreateStepRequirementRuleMutation();
  const [updateRule, { isLoading: isUpdating }] =
    useUpdateStepRequirementRuleMutation();
  const [deleteRule, { isLoading: isDeleting }] =
    useDeleteStepRequirementRuleMutation();

  const rules = data?.rules ?? [];
  const existingCountryDocTypes = useMemo(
    () => new Set(data?.existingCountryDocTypes ?? []),
    [data?.existingCountryDocTypes],
  );
  const existingGlobalDocTypes = useMemo(
    () => new Set(data?.existingGlobalDocTypes ?? []),
    [data?.existingGlobalDocTypes],
  );

  const blockedDocTypesForScope = useMemo(
    () =>
      ruleScope === "global" ? existingGlobalDocTypes : existingCountryDocTypes,
    [ruleScope, existingGlobalDocTypes, existingCountryDocTypes],
  );

  const availableDocTypes = useMemo(() => {
    return Object.keys(DOCUMENT_TYPE_CONFIG)
      .filter((docType) => !blockedDocTypesForScope.has(docType))
      .sort((a, b) => {
        const aLabel = getDocumentTypeConfig(a)?.displayName || a;
        const bLabel = getDocumentTypeConfig(b)?.displayName || b;
        return aLabel.localeCompare(bLabel);
      });
  }, [blockedDocTypesForScope]);

  const stats = useMemo(() => {
    const mandatory = rules.filter((r) => r.mandatory).length;
    const optional = rules.length - mandatory;
    return { total: rules.length, mandatory, optional };
  }, [rules]);

  const filteredRules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rules.filter((rule) => {
      if (ruleFilter === "mandatory" && !rule.mandatory) return false;
      if (ruleFilter === "optional" && rule.mandatory) return false;
      if (!query) return true;
      return (
        rule.label.toLowerCase().includes(query) ||
        rule.docType.toLowerCase().includes(query)
      );
    });
  }, [rules, ruleFilter, searchQuery]);

  const handleAdd = async () => {
    const canonical = resolveCanonicalDocumentType(selectedDocType);
    if (!canonical) {
      toast.error("Please select a valid document type");
      return;
    }

    try {
      await createRule({
        processingId,
        stepKey,
        docType: canonical,
        mandatory: isMandatory,
        scope: ruleScope,
      }).unwrap();
      toast.success("Document requirement added for this step");
      setSelectedDocType("");
      setIsMandatory(false);
      setRuleScope("country");
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to add document requirement";
      toast.error(message);
    }
  };

  const handleToggleMandatory = async (ruleId: string, value: boolean) => {
    try {
      await updateRule({
        processingId,
        ruleId,
        stepKey,
        mandatory: value,
      }).unwrap();
      toast.success(value ? "Marked as required" : "Marked as optional");
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to update requirement";
      toast.error(message);
    }
  };

  const handleRemove = async (ruleId: string) => {
    try {
      await deleteRule({ processingId, ruleId, stepKey }).unwrap();
      toast.success("Document requirement removed from this step");
      setPendingDelete(null);
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to remove requirement";
      toast.error(message);
    }
  };

  const busy = isCreating || isUpdating || isDeleting;
  const displayStep = stepLabel || data?.stepLabel || stepKey;
  const countryCode = data?.countryCode || "—";

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-3xl p-0 gap-0 !flex !flex-col max-h-[min(78vh,720px)] overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b bg-primary-50 shrink-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pr-8">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="h-9 w-9 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0"
                  aria-hidden
                >
                  <FolderCog className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-foreground text-base font-semibold leading-tight">
                    Step document requirements
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-600 mt-0.5">
                    Applies to all candidates in {countryCode} for {displayStep}.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="gap-1 bg-background text-xs">
                  <CircleDot className="h-3 w-3 text-primary-600" />
                  {displayStep}
                </Badge>
                <Badge variant="outline" className="gap-1 bg-background text-xs">
                  <MapPin className="h-3 w-3 text-primary-600" />
                  {countryCode}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {stats.total} rules
                </Badge>
                <Badge className="bg-primary-600 hover:bg-primary-600 text-xs">
                  {stats.mandatory} required
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {stats.optional} optional
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {!canManage ? (
            <div className="m-5 rounded-lg border border-accent-200 bg-accent-50 p-3 text-sm text-accent-800 flex items-start gap-2 shrink-0">
              <Lock className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                You need <strong>write:processing</strong> permission to manage
                step document requirements.
              </p>
            </div>
          ) : (
            <>
              <div className="shrink-0 px-5 py-3 border-b bg-muted-50 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Rule scope</Label>
                  <Tabs
                    value={ruleScope}
                    onValueChange={(value) => {
                      const nextScope = value as RuleScope;
                      setRuleScope(nextScope);
                      if (
                        selectedDocType &&
                        (nextScope === "global"
                          ? existingGlobalDocTypes
                          : existingCountryDocTypes
                        ).has(selectedDocType)
                      ) {
                        setSelectedDocType("");
                      }
                    }}
                  >
                    <TabsList
                      className="h-8 w-full grid grid-cols-2"
                      aria-label="Document requirement scope"
                    >
                      <TabsTrigger value="country" className="text-xs gap-1">
                        <Flag className="h-3 w-3" />
                        This country ({countryCode})
                      </TabsTrigger>
                      <TabsTrigger value="global" className="text-xs gap-1">
                        <Globe2 className="h-3 w-3" />
                        Global (all countries)
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <p className="text-[11px] text-muted-500">
                    {ruleScope === "country"
                      ? `Applies only to candidates in ${countryCode} for this step. Can override a global default for the same document.`
                      : "Applies to every country. Country-specific rules can override this later."}
                  </p>
                  {ruleScope === "global" && (
                    <p className="text-[11px] text-accent-700 bg-accent-50 border border-accent-200 rounded-md px-2 py-1">
                      This affects all countries.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-6 space-y-1">
                    <Label htmlFor="doc-type-select" className="text-xs">
                      Add document type
                    </Label>
                    <Select
                      value={selectedDocType}
                      onValueChange={setSelectedDocType}
                      disabled={busy || availableDocTypes.length === 0}
                    >
                      <SelectTrigger id="doc-type-select" className="h-9 bg-background">
                        <SelectValue
                          placeholder={
                            availableDocTypes.length === 0
                              ? "All types already added"
                              : "Choose document type"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDocTypes.map((docType) => (
                          <SelectItem key={docType} value={docType}>
                            {getDocumentTypeConfig(docType)?.displayName || docType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-3 flex items-center justify-between rounded-md border bg-background px-3 h-9">
                    <Label htmlFor="mandatory-switch" className="text-xs cursor-pointer">
                      Required
                    </Label>
                    <Switch
                      id="mandatory-switch"
                      checked={isMandatory}
                      onCheckedChange={setIsMandatory}
                      disabled={busy}
                      aria-label="Mark new document as required"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Button
                      onClick={handleAdd}
                      disabled={!selectedDocType || busy}
                      className="w-full h-9"
                      size="sm"
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1.5" />
                      )}
                      Add requirement
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-500">
                  Uploaded files are not deleted when you remove a requirement rule.
                </p>
              </div>

              <div className="shrink-0 px-5 py-2.5 border-b bg-background space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-foreground">
                    Current requirements
                  </p>
                  <Tabs
                    value={ruleFilter}
                    onValueChange={(v) => setRuleFilter(v as RuleFilter)}
                  >
                    <TabsList className="h-8" aria-label="Filter document requirements">
                      <TabsTrigger value="all" className="text-xs px-2.5">
                        All ({stats.total})
                      </TabsTrigger>
                      <TabsTrigger value="mandatory" className="text-xs px-2.5">
                        Required ({stats.mandatory})
                      </TabsTrigger>
                      <TabsTrigger value="optional" className="text-xs px-2.5">
                        Optional ({stats.optional})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="h-8 pl-8 text-sm"
                    aria-label="Search document requirements"
                  />
                </div>
              </div>

              <div
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-3"
                role="region"
                aria-label="Document requirements list"
              >
                {isLoading && (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-500 flex flex-col items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                    Loading requirements...
                  </div>
                )}

                {!isLoading && filteredRules.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center bg-muted-50">
                    <FileText className="h-7 w-7 text-muted-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      {rules.length === 0
                        ? "No document requirements yet"
                        : "No requirements match your filter"}
                    </p>
                    <p className="text-xs text-muted-500 mt-1">
                      {rules.length === 0
                        ? "Use the form above to add the first requirement."
                        : "Try a different search or filter."}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {!isLoading &&
                    filteredRules.map((rule) => (
                      <RuleRow
                        key={rule.id}
                        rule={rule}
                        busy={busy}
                        onToggleMandatory={handleToggleMandatory}
                        onRequestDelete={() =>
                          setPendingDelete({
                            id: rule.id,
                            label: rule.label,
                            sourceCountryCode: rule.sourceCountryCode,
                          })
                        }
                      />
                    ))}
                </div>
              </div>
            </>
          )}

          <DialogFooter className="px-5 py-2.5 border-t bg-muted-50 shrink-0">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>

        <DeleteConfirmationDialog
          isOpen={!!pendingDelete}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            if (!pendingDelete) return;
            void handleRemove(pendingDelete.id);
          }}
          title={pendingDelete?.label || "document requirement"}
          itemType="document requirement"
          isLoading={isDeleting}
          description={
            pendingDelete
              ? `Remove "${pendingDelete.label}" from the ${displayStep} step?${
                  pendingDelete.sourceCountryCode === "ALL"
                    ? " This is a global default rule and will affect all countries that rely on it."
                    : ` This only affects country ${countryCode}.`
                } Uploaded candidate files will remain in the system.`
              : undefined
          }
        />
      </Dialog>
    </TooltipProvider>
  );
}

interface RuleRowProps {
  rule: {
    id: string;
    docType: string;
    label: string;
    mandatory: boolean;
    sourceCountryCode: string;
    isEditable: boolean;
    overridesGlobal?: boolean;
  };
  busy: boolean;
  onToggleMandatory: (ruleId: string, value: boolean) => void;
  onRequestDelete: () => void;
}

function RuleRow({
  rule,
  busy,
  onToggleMandatory,
  onRequestDelete,
}: RuleRowProps) {
  const isGlobal = rule.sourceCountryCode === "ALL";

  return (
    <div
      className={cn(
        "rounded-lg border bg-background flex flex-col sm:flex-row sm:items-center gap-2 p-2.5",
        rule.mandatory ? "border-l-[3px] border-l-primary-500" : "border-l-[3px] border-l-muted-300",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-sm text-foreground truncate">
            {rule.label}
          </span>
          <Badge
            variant={rule.mandatory ? "default" : "secondary"}
            className={cn(
              "text-[10px] h-5",
              rule.mandatory && "bg-primary-600 hover:bg-primary-600",
            )}
          >
            {rule.mandatory ? "Required" : "Optional"}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="gap-1 text-[10px] h-5 font-normal cursor-help"
              >
                {isGlobal ? (
                  <Globe2 className="h-3 w-3" />
                ) : (
                  <Flag className="h-3 w-3" />
                )}
                {isGlobal ? "Global" : rule.sourceCountryCode}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {isGlobal
                ? "Applies to all countries unless overridden by a country rule."
                : `Applies only to candidates in ${rule.sourceCountryCode}.`}
            </TooltipContent>
          </Tooltip>
          {rule.overridesGlobal && (
            <Badge variant="secondary" className="text-[10px] h-5">
              Overrides global
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-500 mt-0.5 font-mono truncate">
          {rule.docType}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 sm:pl-2 sm:border-l">
        <div className="flex items-center gap-1.5">
          <Label
            htmlFor={`mandatory-${rule.id}`}
            className="text-[11px] text-muted-600 whitespace-nowrap"
          >
            Required
          </Label>
          <Switch
            id={`mandatory-${rule.id}`}
            checked={rule.mandatory}
            disabled={!rule.isEditable || busy}
            onCheckedChange={(value) => onToggleMandatory(rule.id, value)}
            aria-label={`Toggle ${rule.label} as required`}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-danger-600 border-danger-200 hover:bg-danger-50 hover:text-danger-700 shrink-0"
          disabled={!rule.isEditable || busy}
          onClick={onRequestDelete}
          aria-label={`Remove ${rule.label} requirement`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
