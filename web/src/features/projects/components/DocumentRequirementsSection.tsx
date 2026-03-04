import { useState } from "react";
import { toast } from "sonner";
import {
  Control,
  UseFormSetValue,
  UseFormWatch,
  FieldErrors,
} from "react-hook-form";
import { Plus, X, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetSystemConfigQuery } from "@/features/system";
import { ProjectFormData } from "../schemas/project-schemas";

interface DocumentRequirementsSectionProps {
  className?: string;
  control: Control<ProjectFormData>;
  watch: UseFormWatch<ProjectFormData>;
  setValue: UseFormSetValue<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
}
import { cn } from "@/lib/utils";
export default function DocumentRequirementsSection({
  className,
  control,
  watch,
  setValue,
  errors,
}: DocumentRequirementsSectionProps) {
  const [newDocType, setNewDocType] = useState("");
  const [showAddNew, setShowAddNew] = useState(false);

  // Get system configuration for document types
  const { data: systemConfig } = useGetSystemConfigQuery("documentTypes");
  const documentTypes = systemConfig?.data?.constants?.documentTypes || {};

  const documentRequirements = watch("documentRequirements") || [];

  // Add new document requirement
  const addDocumentRequirement = () => {
    if (newDocType) {
      const currentRequirements = watch("documentRequirements") || [];

      // Prevent adding duplicate docTypes in the same form
      if (currentRequirements.some((r: any) => r.docType === newDocType)) {
        toast.error("This document is already added to the project");
        return;
      }

      setValue("documentRequirements", [
        ...currentRequirements,
        {
          docType: newDocType,
          mandatory: true,
          description: "",
        },
      ]);
      setNewDocType("");
      setShowAddNew(false);
    }
  };

  // Remove document requirement
  const removeDocumentRequirement = (index: number) => {
    const currentRequirements = watch("documentRequirements") || [];
    if (currentRequirements.length > 1) {
      setValue(
        "documentRequirements",
        currentRequirements.filter((_, i) => i !== index)
      );
    }
  };

  // Update document requirement
  const updateDocumentRequirement = (
    index: number,
    field: string,
    value: any
  ) => {
    const currentRequirements = watch("documentRequirements") || [];
    const updatedRequirements = [...currentRequirements];
    updatedRequirements[index] = {
      ...updatedRequirements[index],
      [field]: value,
    };
    setValue("documentRequirements", updatedRequirements);
  };

  // Get document type display name
  const getDocumentTypeDisplayName = (docType: string) => {
    return documentTypes[docType]?.displayName || docType;
  };

  // Get document type category
  const getDocumentTypeCategory = (docType: string) => {
    return documentTypes[docType]?.category || "other";
  };

  // Group document types by category
  const groupedDocumentTypes = Object.entries(documentTypes).reduce(
    (acc, [key, meta]) => {
      const category = meta.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({ key, ...meta });
      return acc;
    },
    {} as Record<
      string,
      Array<{ key: string } & (typeof documentTypes)[string]>
    >
  );

  const categoryLabels = {
    identity: "Identity Documents",
    professional: "Professional Documents",
    educational: "Educational Documents",
    employment: "Employment Documents",
    verification: "Verification Documents",
    medical: "Medical Documents",
    other: "Other Documents",
  };

  return (
   <Card className={cn(
  "border-0 shadow-md bg-white/80 dark:bg-black backdrop-blur-sm dark:backdrop-blur-none overflow-hidden",
  className
)}>
  <CardHeader className="border-b border-slate-200 dark:border-slate-800">
    <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
      <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
      Document Requirements
    </CardTitle>
    <p className="text-sm text-slate-600 dark:text-slate-400">
      Select the documents required for this project. At least one document is mandatory.
    </p>
  </CardHeader>

  <CardContent className="space-y-4 bg-white dark:bg-black">
    {/* Document Requirements List */}
    <div className="space-y-3">
      {documentRequirements.map((requirement, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {getDocumentTypeCategory(requirement.docType)}
              </Badge>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {getDocumentTypeDisplayName(requirement.docType)}
              </span>
              {requirement.mandatory && (
                <Badge 
                  variant="destructive" 
                  className="text-xs bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50"
                >
                  Required
                </Badge>
              )}
            </div>
            <Input
              placeholder="Description (optional)"
              value={requirement.description || ""}
              onChange={(e) =>
                updateDocumentRequirement(index, "description", e.target.value)
              }
              className="text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-orange-500/20 dark:focus:ring-orange-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`mandatory-${index}`}
                checked={requirement.mandatory}
                onCheckedChange={(checked) =>
                  updateDocumentRequirement(index, "mandatory", checked)
                }
                className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-orange-600 dark:data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600 dark:data-[state=checked]:border-orange-600 focus:ring-orange-500 dark:focus:ring-orange-500"
              />
              <Label 
                htmlFor={`mandatory-${index}`} 
                className="text-xs text-slate-700 dark:text-slate-300"
              >
                Required
              </Label>
            </div>
            {documentRequirements.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeDocumentRequirement(index)}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>

    {/* Add New Document Requirement */}
    {!showAddNew ? (
      <Button
        variant="outline"
        onClick={() => setShowAddNew(true)}
        className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <Plus className="h-4 w-4 mr-2 text-orange-600 dark:text-orange-400" />
        Add Document Requirement
      </Button>
    ) : (
      <div className="space-y-3 p-3 border rounded-lg bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Select Document Type
          </Label>
          <Select value={newDocType} onValueChange={setNewDocType}>
            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-orange-500/20 dark:focus:ring-orange-500/20">
              <SelectValue placeholder="Choose document type" />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              {Object.entries(groupedDocumentTypes).map(
                ([category, types]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </div>
                    {types.map((type) => (
                      <SelectItem 
                        key={type.key} 
                        value={type.key}
                        className="text-slate-900 dark:text-slate-100 focus:bg-orange-50 dark:focus:bg-orange-950/40"
                      >
                        <div className="flex items-center gap-2">
                          <span>{type.displayName}</span>
                          {type.commonlyRequired && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-800/50"
                            >
                              Common
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={addDocumentRequirement}
            disabled={!newDocType}
            className="flex-1 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white"
          >
            Add Requirement
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowAddNew(false);
              setNewDocType("");
            }}
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>
        </div>
      </div>
    )}

    {/* Error Display */}
    {errors.documentRequirements && (
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-2 rounded-md">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        {errors.documentRequirements.message}
      </div>
    )}
  </CardContent>
</Card>
  );
}
