import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";
import { toast } from "sonner";
import { MOCK_INTERVIEW_CATEGORY, CreateTemplateRequest } from "../../types";
import { useBulkUpsertTemplatesMutation } from "../data";

interface TemplateItem extends Omit<CreateTemplateRequest, "roleId"> {
  tempId: string; // For React key
}

interface BulkTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Array<{ id: string; name: string }>;
}

export function BulkTemplateDialog({
  open,
  onOpenChange,
  roles,
}: BulkTemplateDialogProps) {
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [bulkUpsert, { isLoading }] = useBulkUpsertTemplatesMutation();

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setSelectedRoleId("");
      setTemplates([createEmptyTemplate()]);
    }
  }, [open]);

  const createEmptyTemplate = (): TemplateItem => ({
    tempId: `temp-${Date.now()}-${Math.random()}`,
    category: "",
    criterion: "",
    order: templates.length,
    isActive: true,
  });

  const handleAddTemplate = () => {
    setTemplates((prev) => [
      ...prev,
      { ...createEmptyTemplate(), order: prev.length },
    ]);
  };

  const handleRemoveTemplate = (tempId: string) => {
    if (templates.length === 1) {
      toast.error("At least one template is required");
      return;
    }
    setTemplates((prev) => prev.filter((t) => t.tempId !== tempId));
  };

  const handleTemplateChange = (
    tempId: string,
    field: keyof Omit<TemplateItem, "tempId">,
    value: string | number | boolean
  ) => {
    setTemplates((prev) =>
      prev.map((t) => (t.tempId === tempId ? { ...t, [field]: value } : t))
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedRoleId) {
      toast.error("Please select a role");
      return;
    }

    const invalid = templates.find((t) => !t.category || !t.criterion.trim());
    if (invalid) {
      toast.error("Please fill in all required fields for all templates");
      return;
    }

    try {
      // Convert to API format
      const templatesData: CreateTemplateRequest[] = templates.map(
        ({ tempId, ...rest }) => ({
          ...rest,
          roleId: selectedRoleId,
        })
      );

      await bulkUpsert({
        roleId: selectedRoleId,
        templates: templatesData,
      }).unwrap();

      toast.success(`Successfully processed ${templates.length} template(s)`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to save templates");
    }
  };

  const categoryOptions = [
    {
      value: MOCK_INTERVIEW_CATEGORY.TECHNICAL_SKILLS,
      label: "Technical Skills",
    },
    {
      value: MOCK_INTERVIEW_CATEGORY.COMMUNICATION,
      label: "Communication",
    },
    {
      value: MOCK_INTERVIEW_CATEGORY.PROFESSIONALISM,
      label: "Professionalism",
    },
    {
      value: MOCK_INTERVIEW_CATEGORY.ROLE_SPECIFIC,
      label: "Role Specific",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Template Management</DialogTitle>
          <DialogDescription>
            Create or update multiple templates for a role at once. Existing
            templates with the same criterion will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Select Role *</Label>
            <Select
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a role..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Templates ({templates.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTemplate}
                disabled={isLoading}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Template
              </Button>
            </div>

            {templates.map((template, index) => (
              <Card key={template.tempId} className="relative">
                <CardContent className="pt-4 pb-3 space-y-3">
                  {/* Template Order Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>

                  {/* Delete Button */}
                  {templates.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveTemplate(template.tempId)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {/* Category */}
                    <div className="space-y-1">
                      <Label className="text-xs">Category *</Label>
                      <Select
                        value={template.category}
                        onValueChange={(value) =>
                          handleTemplateChange(
                            template.tempId,
                            "category",
                            value
                          )
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Order */}
                    <div className="space-y-1">
                      <Label className="text-xs">Order</Label>
                      <Input
                        type="number"
                        min="0"
                        value={template.order}
                        onChange={(e) =>
                          handleTemplateChange(
                            template.tempId,
                            "order",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="h-9"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Criterion */}
                  <div className="space-y-1">
                    <Label className="text-xs">Criterion *</Label>
                    <Input
                      placeholder="e.g., Demonstrates strong problem-solving skills"
                      value={template.criterion}
                      onChange={(e) =>
                        handleTemplateChange(
                          template.tempId,
                          "criterion",
                          e.target.value
                        )
                      }
                      className="h-9"
                      disabled={isLoading}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <LoadingSpinner className="mr-2 h-4 w-4" />}
            Save All Templates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
