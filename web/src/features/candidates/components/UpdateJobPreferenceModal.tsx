import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Briefcase, Save, X } from "lucide-react";
import { MultiCountrySelect, MultiSelect } from "@/components/molecules";
import { FACILITY_TYPES, SECTOR_TYPES, VISA_TYPES } from "@/constants/candidate-constants";
import { useUpdateCandidateMutation } from "@/features/candidates/api";
import { toast } from "sonner";

const jobPreferenceSchema = z.object({
  expectedSalary: z.number().min(0).optional(),
  sectorType: z.string().optional(),
  visaType: z.string().optional(),
  preferredCountries: z.array(z.string()).optional(),
  facilityPreferences: z.array(z.string()).optional(),
});

type JobPreferenceFormData = z.infer<typeof jobPreferenceSchema>;

interface UpdateJobPreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  initialData: {
    expectedMinSalary?: number | null;
    sectorType?: string | null;
    visaType?: string | null;
    preferredCountries?: string[] | null;
    facilityPreferences?: string[] | null;
  };
}

export const UpdateJobPreferenceModal: React.FC<UpdateJobPreferenceModalProps> = ({
  isOpen,
  onClose,
  candidateId,
  initialData,
}) => {
  const [updateCandidate, { isLoading }] = useUpdateCandidateMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JobPreferenceFormData>({
    resolver: zodResolver(jobPreferenceSchema),
    defaultValues: {
      expectedSalary: initialData.expectedMinSalary ?? undefined,
      sectorType: initialData.sectorType || SECTOR_TYPES.NO_PREFERENCE,
      visaType: initialData.visaType || VISA_TYPES.NOT_APPLICABLE,
      preferredCountries: initialData.preferredCountries || [],
      facilityPreferences: initialData.facilityPreferences || [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        expectedSalary: initialData.expectedMinSalary ?? undefined,
        sectorType: initialData.sectorType || SECTOR_TYPES.NO_PREFERENCE,
        visaType: initialData.visaType || VISA_TYPES.NOT_APPLICABLE,
        preferredCountries: initialData.preferredCountries || [],
        facilityPreferences: initialData.facilityPreferences || [],
      });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: JobPreferenceFormData) => {
    try {
      await updateCandidate({
        id: candidateId,
        expectedMinSalary: data.expectedSalary,
        sectorType: data.sectorType,
        visaType: data.visaType,
        preferredCountries: data.preferredCountries,
        facilityPreferences: data.facilityPreferences,
      }).unwrap();
      toast.success("Job preferences updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update job preferences");
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Update Job Preferences
          </DialogTitle>
          <DialogDescription>
            Modify candidate's salary expectations and work preferences
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expected Salary */}
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
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="40000"
                    disabled={isLoading}
                    className="h-11 bg-white border-slate-200"
                  />
                )}
              />
              {errors.expectedSalary && (
                <p className="text-sm text-red-600">{errors.expectedSalary.message}</p>
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
            <div className="md:col-span-2 space-y-2">
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
                    error={errors.preferredCountries?.message}
                  />
                )}
              />
            </div>

            {/* Facility Preferences */}
            <div className="md:col-span-2 space-y-2">
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
                    error={errors.facilityPreferences?.message}
                  />
                )}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
