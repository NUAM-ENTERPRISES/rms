import { useMemo, useState } from "react";
import {
  ClipboardList,
  Loader2,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDocumentTypeConfig } from "@/constants/document-types";
import {
  useAddOriginalDocumentChecklistItemMutation,
  useRemoveOriginalDocumentChecklistItemMutation,
  useUpdateOriginalDocumentChecklistItemMutation,
} from "../api";
import { ORIGINAL_DOCUMENT_TYPES } from "../constants";
import type { ChecklistConfigItem } from "../types";
import { cn } from "@/lib/utils";
import { getDocumentChecklistStyles } from "../utils/documentChecklistColors";

type ChecklistConfigBaseProps = {
  collectionId: string;
  checklistItems: ChecklistConfigItem[];
  receivedDocTypes: string[];
  disabled?: boolean;
};

type ChecklistConfigModalProps = ChecklistConfigBaseProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function documentLabel(docType: string) {
  return getDocumentTypeConfig(docType)?.displayName ?? docType;
}

function ChecklistConfigForm({
  collectionId,
  checklistItems,
  receivedDocTypes,
  disabled = false,
}: ChecklistConfigBaseProps) {
  const [selectedDocType, setSelectedDocType] = useState("");
  const [newItemMandatory, setNewItemMandatory] = useState(true);
  const [addItem, { isLoading: isAdding }] =
    useAddOriginalDocumentChecklistItemMutation();
  const [updateItem, { isLoading: isUpdating }] =
    useUpdateOriginalDocumentChecklistItemMutation();
  const [removeItem, { isLoading: isRemoving }] =
    useRemoveOriginalDocumentChecklistItemMutation();

  const configuredTypes = useMemo(
    () => new Set(checklistItems.map((item) => item.docType)),
    [checklistItems],
  );
  const receivedTypes = useMemo(
    () => new Set(receivedDocTypes),
    [receivedDocTypes],
  );
  const availableTypes = ORIGINAL_DOCUMENT_TYPES.filter(
    (docType) => !configuredTypes.has(docType),
  );
  const isMutating = isAdding || isUpdating || isRemoving;

  const handleAdd = async () => {
    if (!selectedDocType) return;
    try {
      await addItem({
        collectionId,
        docType: selectedDocType,
        mandatory: newItemMandatory,
      }).unwrap();
      setSelectedDocType("");
      setNewItemMandatory(true);
      toast.success("Document added to checklist");
    } catch {
      toast.error("Failed to add document");
    }
  };

  const handleMandatoryChange = async (
    item: ChecklistConfigItem,
    mandatory: boolean,
  ) => {
    try {
      await updateItem({
        collectionId,
        docType: item.docType,
        mandatory,
      }).unwrap();
      toast.success(
        `${documentLabel(item.docType)} marked ${mandatory ? "mandatory" : "optional"}`,
      );
    } catch {
      toast.error("Failed to update document requirement");
    }
  };

  const handleRemove = async (item: ChecklistConfigItem) => {
    try {
      await removeItem({
        collectionId,
        docType: item.docType,
      }).unwrap();
      toast.success("Document removed from checklist");
    } catch {
      toast.error("Failed to remove document");
    }
  };

  return (
    <div className="space-y-3">
      {!disabled ? (
        <section className="rounded-lg border border-sky-200/80 bg-gradient-to-r from-sky-50/90 to-indigo-50/50 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-sky-900">Add document</h3>
            <p className="text-xs text-sky-700/80">
              Select a type and mark it required if needed.
            </p>
          </div>
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_10rem_auto] lg:items-end">
            <div className="space-y-1">
              <Label htmlFor="add-checklist-document" className="text-xs text-sky-900">
                Document type
              </Label>
              <Select
                value={selectedDocType}
                onValueChange={setSelectedDocType}
                disabled={isMutating || availableTypes.length === 0}
              >
                <SelectTrigger
                  id="add-checklist-document"
                  className="h-9 border-sky-200/80 bg-white/90"
                >
                  <SelectValue
                    placeholder={
                      availableTypes.length
                        ? "Select an original document"
                        : "All document types added"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((docType) => (
                    <SelectItem key={docType} value={docType}>
                      {documentLabel(docType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex h-9 items-center justify-between gap-2 rounded-md border border-violet-200/80 bg-white/80 px-3">
              <Label
                htmlFor="new-checklist-item-mandatory"
                className="text-xs font-medium text-violet-900"
              >
                Required
              </Label>
              <Switch
                id="new-checklist-item-mandatory"
                checked={newItemMandatory}
                onCheckedChange={setNewItemMandatory}
                disabled={isMutating}
              />
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!selectedDocType || isMutating}
              className="h-9 gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 lg:min-w-[7rem]"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              Add document
            </Button>
          </div>
        </section>
      ) : (
        <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
          This collection is completed. Checklist changes are read-only.
        </p>
      )}

      <section>
        {checklistItems.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-indigo-200/70 shadow-sm">
            <div className="hidden border-b border-indigo-200/60 bg-indigo-50/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 sm:grid sm:grid-cols-[minmax(0,1fr)_6.5rem_2.5rem] sm:gap-3">
              <span>Document</span>
              <span className="text-center">Required</span>
              <span className="sr-only">Remove</span>
            </div>
            <div className="divide-y divide-indigo-100/80 bg-white/70">
              {checklistItems.map((item) => {
                const received = receivedTypes.has(item.docType);
                const removeDisabled = disabled || received || isMutating;
                const docStyles = getDocumentChecklistStyles(item.docType);
                const removeButton = (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${documentLabel(item.docType)}`}
                    disabled={removeDisabled}
                    onClick={() => handleRemove(item)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                );

                return (
                  <div
                    key={item.docType}
                    className={cn(
                      "grid gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_2.5rem] sm:items-center sm:gap-3",
                      docStyles.row,
                      received && "ring-1 ring-inset ring-emerald-300/50",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "max-w-full truncate px-2 py-0.5 text-[11px] font-semibold",
                            docStyles.chip,
                          )}
                        >
                          {documentLabel(item.docType)}
                        </Badge>
                        <div className="flex shrink-0 flex-wrap gap-1">
                          <Badge
                            className={cn(
                              "border px-1.5 py-0 text-[10px]",
                              item.mandatory
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-amber-200 bg-amber-50 text-amber-800",
                            )}
                          >
                            {item.mandatory ? "Mandatory" : "Optional"}
                          </Badge>
                          {received ? (
                            <Badge className="border border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700">
                              Received
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-start gap-2 sm:justify-center">
                      <Switch
                        id={`mandatory-${item.docType}`}
                        checked={item.mandatory}
                        onCheckedChange={(checked) =>
                          handleMandatoryChange(item, checked)
                        }
                        disabled={disabled || isMutating}
                        aria-label={`Mark ${documentLabel(item.docType)} mandatory`}
                      />
                      <Label
                        htmlFor={`mandatory-${item.docType}`}
                        className="text-sm text-muted-foreground sm:sr-only"
                      >
                        Required
                      </Label>
                    </div>

                    <div className="flex justify-start sm:justify-end">
                      {received ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>{removeButton}</TooltipTrigger>
                            <TooltipContent>
                              Received documents cannot be removed.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        removeButton
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-violet-200/80 bg-gradient-to-b from-violet-50/80 to-sky-50/50 px-4 py-6 text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-violet-100">
              <ClipboardList
                className="h-5 w-5 text-violet-600"
                aria-hidden
              />
            </div>
            <p className="text-sm font-medium text-violet-900">
              No documents configured yet
            </p>
            <p className="mt-0.5 text-xs text-violet-700/80">
              Add original documents above to define what this candidate must submit.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export function ChecklistConfigModal({
  open,
  onOpenChange,
  collectionId,
  checklistItems,
  receivedDocTypes,
  disabled = false,
}: ChecklistConfigModalProps) {
  const mandatoryCount = checklistItems.filter((item) => item.mandatory).length;
  const optionalCount = checklistItems.length - mandatoryCount;
  const receivedCount = checklistItems.filter((item) =>
    receivedDocTypes.includes(item.docType),
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(72vh,560px)] w-[min(96vw,56rem)] max-w-none flex-col gap-0 overflow-hidden border-indigo-200/60 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/30 p-0 sm:max-w-none">
        <DialogHeader className="shrink-0 border-b border-indigo-200/60 bg-gradient-to-r from-indigo-100/90 via-violet-100/70 to-sky-100/80 px-5 py-3 text-left">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 shadow-sm">
              <Settings2 className="h-4 w-4 text-white" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <DialogTitle className="text-base font-semibold text-indigo-950">
                  Configure candidate checklist
                </DialogTitle>
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="border border-slate-200 bg-white/90 px-2 py-0 text-[10px] text-slate-700">
                    {checklistItems.length} total
                  </Badge>
                  <Badge className="border border-rose-200 bg-rose-50 px-2 py-0 text-[10px] text-rose-700">
                    {mandatoryCount} required
                  </Badge>
                  <Badge className="border border-amber-200 bg-amber-50 px-2 py-0 text-[10px] text-amber-800">
                    {optionalCount} optional
                  </Badge>
                  <Badge className="border border-emerald-200 bg-emerald-50 px-2 py-0 text-[10px] text-emerald-700">
                    {receivedCount} received
                  </Badge>
                </div>
              </div>
              <DialogDescription className="mt-0.5 text-xs text-indigo-800/80">
                Add original documents and choose which ones are required before
                completion.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <ChecklistConfigForm
            collectionId={collectionId}
            checklistItems={checklistItems}
            receivedDocTypes={receivedDocTypes}
            disabled={disabled}
          />
        </div>

        <DialogFooter className="shrink-0 border-t border-indigo-200/60 bg-indigo-50/50 px-5 py-2.5 sm:justify-between">
          <p className="text-[11px] text-indigo-800/70">
            Changes save immediately.
          </p>
          <DialogClose asChild>
            <Button
              type="button"
              size="sm"
              className="min-w-[5.5rem] bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChecklistConfigSection({
  collectionId,
  checklistItems,
  receivedDocTypes,
  disabled = false,
}: ChecklistConfigBaseProps) {
  const [open, setOpen] = useState(false);

  const mandatoryCount = checklistItems.filter((item) => item.mandatory).length;
  const optionalCount = checklistItems.length - mandatoryCount;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 border-indigo-200 bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100/80"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Settings2 className="h-4 w-4 text-indigo-600" aria-hidden />
        Configure checklist
        {checklistItems.length > 0 ? (
          <Badge className="ml-1 border border-rose-200 bg-rose-50 px-1.5 py-0 text-[10px] text-rose-700">
            {mandatoryCount} required
            {optionalCount > 0 ? ` · ${optionalCount} optional` : ""}
          </Badge>
        ) : null}
      </Button>

      <ChecklistConfigModal
        open={open}
        onOpenChange={setOpen}
        collectionId={collectionId}
        checklistItems={checklistItems}
        receivedDocTypes={receivedDocTypes}
        disabled={disabled}
      />
    </>
  );
}
