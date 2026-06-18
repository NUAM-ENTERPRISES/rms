import React, { useRef, useState } from "react";
import {
  Control,
  Controller,
  FieldErrors,
  FieldValues,
  Path,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/molecules";
import {
  ClipboardList,
  Upload,
  FileText,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DOCUMENT_TYPE,
  getAllowedFormatsString,
  isValidFileExtension,
  isValidFileSize,
} from "@/constants/document-types";

export type ExistingEligibilityLetter = {
  id: string;
  fileName: string;
  fileUrl: string;
};

type EligibilityDetailsSectionProps<T extends FieldValues> = {
  control: Control<T, any, T>;
  errors: FieldErrors<T>;
  isLoading?: boolean;
  eligibilityLetterFile: File | null;
  onEligibilityLetterFileChange: (file: File | null) => void;
  existingEligibilityLetter?: ExistingEligibilityLetter | null;
  onViewExistingLetter?: (fileUrl: string, fileName: string) => void;
  letterFileError?: string | null;
};

function parseDateField(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDateField(date?: Date): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

export function validateEligibilityLetterFile(file: File): string | null {
  if (!isValidFileExtension(DOCUMENT_TYPE.ELIGIBILITY_LETTER, file.name)) {
    return `Allowed formats: ${getAllowedFormatsString(DOCUMENT_TYPE.ELIGIBILITY_LETTER)}`;
  }
  const sizeMB = file.size / (1024 * 1024);
  if (!isValidFileSize(DOCUMENT_TYPE.ELIGIBILITY_LETTER, sizeMB)) {
    return "Eligibility letter must be 5MB or smaller";
  }
  return null;
}

export function EligibilityDetailsSection<T extends FieldValues>({
  control,
  errors,
  isLoading = false,
  eligibilityLetterFile,
  onEligibilityLetterFileChange,
  existingEligibilityLetter,
  onViewExistingLetter,
  letterFileError,
}: EligibilityDetailsSectionProps<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localFileError, setLocalFileError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationError = validateEligibilityLetterFile(file);
    if (validationError) {
      setLocalFileError(validationError);
      onEligibilityLetterFileChange(null);
      toast.error(validationError);
      event.target.value = "";
      return;
    }
    setLocalFileError(null);
    onEligibilityLetterFileChange(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-emerald-100 bg-emerald-50/40">
      <div className="space-y-2">
        <Label
          htmlFor="eligibilityNumber"
          className="text-slate-700 font-medium flex items-center gap-2"
        >
          <ClipboardList className="h-4 w-4 text-emerald-600" />
          Eligibility Number
        </Label>
        <Controller
          name={"eligibilityNumber" as Path<T>}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="eligibilityNumber"
              placeholder="Enter eligibility number"
              disabled={isLoading}
              className="h-11 bg-white border-slate-200"
            />
          )}
        />
        {errors.eligibilityNumber?.message ? (
          <p className="text-sm text-red-600">
            {errors.eligibilityNumber.message as string}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Issued Date</Label>
          <Controller
            name={"eligibilityIssuedAt" as Path<T>}
            control={control}
            render={({ field }) => (
              <DatePicker
                value={parseDateField(field.value)}
                showTime={false}
                onChange={(date) => field.onChange(formatDateField(date))}
                placeholder="Select issued date"
                disabled={isLoading}
                className="bg-white"
              />
            )}
          />
          {errors.eligibilityIssuedAt?.message ? (
            <p className="text-sm text-red-600">
              {errors.eligibilityIssuedAt.message as string}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Expiry Date</Label>
          <Controller
            name={"eligibilityExpiryAt" as Path<T>}
            control={control}
            render={({ field }) => (
              <DatePicker
                value={parseDateField(field.value)}
                showTime={false}
                onChange={(date) => field.onChange(formatDateField(date))}
                placeholder="Select expiry date"
                disabled={isLoading}
                className="bg-white"
              />
            )}
          />
          {errors.eligibilityExpiryAt?.message ? (
            <p className="text-sm text-red-600">
              {errors.eligibilityExpiryAt.message as string}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700 font-medium">Eligibility Letter</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        {existingEligibilityLetter && !eligibilityLetterFile ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <FileText className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
            <span className="truncate flex-1 text-sm font-medium text-slate-800">
              {existingEligibilityLetter.fileName}
            </span>
            {onViewExistingLetter ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0"
                onClick={() =>
                  onViewExistingLetter(
                    existingEligibilityLetter.fileUrl,
                    existingEligibilityLetter.fileName,
                  )
                }
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              Replace
            </Button>
          </div>
        ) : eligibilityLetterFile ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <FileText className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
            <span className="truncate flex-1 text-sm font-medium text-slate-800">
              {eligibilityLetterFile.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onEligibilityLetterFileChange(null)}
              disabled={isLoading}
              aria-label="Remove selected eligibility letter"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-white px-4 py-5 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Upload className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-medium text-foreground">
              Choose eligibility letter
            </span>
            <span className="text-xs text-muted-foreground">
              PDF, JPG, or PNG (max 5MB)
            </span>
          </button>
        )}

        {(letterFileError || localFileError) ? (
          <p className="text-sm text-red-600">{letterFileError || localFileError}</p>
        ) : null}
      </div>
    </div>
  );
}

export default EligibilityDetailsSection;
