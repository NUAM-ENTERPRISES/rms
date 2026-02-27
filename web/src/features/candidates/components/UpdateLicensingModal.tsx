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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileCheck, Activity, ClipboardCheck, Save } from "lucide-react";
import { useUpdateCandidateMutation } from "@/features/candidates/api";
import { toast } from "sonner";
import { LICENSING_EXAMS } from "@/constants/candidate-constants";

const licensingSchema = z.object({
  licensingExam: z.string().optional(),
  dataFlow: z.boolean().optional(),
  eligibility: z.boolean().optional(),
});

type LicensingFormData = z.infer<typeof licensingSchema>;

interface UpdateLicensingModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  initialData: {
    licensingExam?: string | null;
    dataFlow?: boolean | null;
    eligibility?: boolean | null;
  };
}

export const UpdateLicensingModal: React.FC<UpdateLicensingModalProps> = ({
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
  } = useForm<LicensingFormData>({
    resolver: zodResolver(licensingSchema),
    defaultValues: {
      licensingExam: initialData.licensingExam || "",
      dataFlow: initialData.dataFlow ?? false,
      eligibility: initialData.eligibility ?? false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        licensingExam: initialData.licensingExam || "",
        dataFlow: initialData.dataFlow ?? false,
        eligibility: initialData.eligibility ?? false,
      });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: LicensingFormData) => {
    try {
      await updateCandidate({
        id: candidateId,
        licensingExam: data.licensingExam,
        dataFlow: data.dataFlow,
        eligibility: data.eligibility,
      }).unwrap();
      toast.success("Licensing information updated successfully");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update licensing information");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ClipboardCheck className="h-5 w-5 text-violet-600" />
            Licensing & Verification
          </DialogTitle>
          <DialogDescription>
            Update the candidate's licensing exam status and verification details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-4">
            {/* Licensing Exam */}
            <div className="space-y-2">
              <Label htmlFor="licensingExam" className="text-slate-700 font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-500" />
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
                      <SelectItem value="none">None / Not Required</SelectItem>
                      {Object.entries(LICENSING_EXAMS).map(([key, value]) => (
                        <SelectItem key={value} value={value}>
                          {key.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Data Flow */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-blue-500" />
                    Data Flow Completed
                  </Label>
                  <p className="text-xs text-slate-500">
                    Has the data flow verification been finished?
                  </p>
                </div>
                <Controller
                  name="dataFlow"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />
              </div>

              {/* Eligibility */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                    Eligibility
                  </Label>
                  <p className="text-xs text-slate-500">
                    Is the candidate eligible for verification?
                  </p>
                </div>
                <Controller
                  name="eligibility"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
