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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Briefcase } from "lucide-react";
import { MultiCountrySelect, MultiSelect } from "@/components/molecules";
import { FACILITY_TYPES, SECTOR_TYPES, VISA_TYPES } from "@/constants/candidate-constants";

type CreateCandidateFormData = {
  expectedSalary?: number;
  sectorType?: string;
  visaType?: string;
  preferredCountries?: string[];
  facilityPreferences?: string[];
  [key: string]: any;
};

interface JobPreferenceStepProps {
  control: Control<CreateCandidateFormData>;
  errors: FieldErrors<CreateCandidateFormData>;
  isLoading: boolean;
}

export const JobPreferenceStep: React.FC<JobPreferenceStepProps> = ({
  control,
  errors,
  isLoading,
}) => {
  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <Briefcase className="h-5 w-5 text-blue-600" />
          Job Preferences
        </CardTitle>
        <CardDescription>Candidate's expectations and work constraints</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="expectedSalary" className="text-slate-700 font-medium">
              Expected Salary
            </Label>
            <Controller
              name="expectedSalary"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="expectedSalary"
                  type="number"
                  step="1"
                  min={0}
                  placeholder="40000"
                  disabled={isLoading}
                  className="h-11 bg-white border-slate-200"
                />
              )}
            />
            {errors.expectedSalary && (
              <p className="text-sm text-red-600">{errors.expectedSalary.message as string}</p>
            )}
          </div>

          {/* Sector Type */}
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Sector Type</Label>
            <Controller
              name="sectorType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-11 bg-white border-slate-200">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SECTOR_TYPES).map(([key, value]) => (
                      <SelectItem key={value} value={value}>
                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Visa Type */}
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Visa Type</Label>
            <Controller
              name="visaType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-11 bg-white border-slate-200">
                    <SelectValue placeholder="Select visa type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VISA_TYPES).map(([key, value]) => (
                      <SelectItem key={value} value={value}>
                        {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="md:col-span-2">
             <Separator className="my-2" />
          </div>

          {/* Preferred Countries */}
          <div className="space-y-2">
            <Controller
              name="preferredCountries"
              control={control}
              render={({ field }) => (
                <MultiCountrySelect
                  label="Preferred Countries"
                  placeholder="Select countries..."
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                  pageSize={20}
                  error={errors.preferredCountries?.message as string}
                />
              )}
            />
          </div>

          {/* Facility Preferences */}
          <div className="space-y-2">
            <Controller
              name="facilityPreferences"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  label="Facility Preferences"
                  placeholder="Select facility types..."
                  options={FACILITY_TYPES.map(type => ({
                    value: type,
                    label: type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                  error={errors.facilityPreferences?.message as string}
                />
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobPreferenceStep;
