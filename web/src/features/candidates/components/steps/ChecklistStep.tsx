import React from "react";
import {
  Control,
  Controller,
  FieldErrors,
} from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckSquare, FileCheck, ClipboardList } from "lucide-react";
import { LICENSING_EXAMS } from "@/constants/candidate-constants";

type CreateCandidateFormData = {
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;
  [key: string]: any;
};

interface ChecklistStepProps {
  control: Control<CreateCandidateFormData>;
  errors: FieldErrors<CreateCandidateFormData>;
  isLoading: boolean;
}

export const ChecklistStep: React.FC<ChecklistStepProps> = ({
  control,
  errors,
  isLoading,
}) => {
  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <CheckSquare className="h-5 w-5 text-green-600" />
          Final Checklist
        </CardTitle>
        <CardDescription>Licensing and verification status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Licensing Exam */}
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-slate-500" />
              Licensing Exam
            </Label>
            <Controller
              name="licensingExam"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-11 bg-white border-slate-200">
                    <SelectValue placeholder="Select licensing exam" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {Object.entries(LICENSING_EXAMS).map(([key, value]) => (
                      <SelectItem key={value} value={value}>
                        {key.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-6 flex flex-col justify-center">
            {/* Data Flow Checkbox */}
            <div className="flex items-center space-x-3 p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <Controller
                name="dataFlow"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="dataFlow"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                    className="h-5 w-5"
                  />
                )}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="dataFlow"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700"
                >
                  Data Flow Completed
                </Label>
                <p className="text-xs text-slate-500">
                  Candidate has completed data flow verification.
                </p>
              </div>
            </div>

            {/* Eligibility Checkbox */}
            <div className="flex items-center space-x-3 p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <Controller
                name="eligibility"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="eligibility"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                    className="h-5 w-5"
                  />
                )}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="eligibility"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700"
                >
                  Eligible
                </Label>
                <p className="text-xs text-slate-500">
                  Candidate meets the eligibility criteria.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChecklistStep;
