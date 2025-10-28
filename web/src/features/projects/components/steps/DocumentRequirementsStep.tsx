import React from "react";
import { Control, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { FieldErrors } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";
import DocumentRequirementsSection from "../DocumentRequirementsSection";
import { ProjectFormData } from "../../schemas/project-schemas";

interface DocumentRequirementsStepProps {
  control: Control<ProjectFormData>;
  watch: UseFormWatch<ProjectFormData>;
  setValue: UseFormSetValue<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
}

export const DocumentRequirementsStep: React.FC<
  DocumentRequirementsStepProps
> = ({ control, watch, setValue, errors }) => {
  return (
    <div className="space-y-6">
      <DocumentRequirementsSection
        control={control}
        watch={watch}
        setValue={setValue}
        errors={errors}
      />
    </div>
  );
};

export default DocumentRequirementsStep;
